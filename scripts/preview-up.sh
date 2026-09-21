#!/usr/bin/env bash
# scripts/preview-up.sh
#
# Brings the whole preview stack up from a bare container, in one command:
#
#   1. install PostgreSQL if it is missing, start it, and wait until it accepts
#      connections (the sandbox image ships without a database server, so a
#      container rebuild otherwise leaves every /api call failing);
#   2. create the role and database named in DATABASE_URL, plus node_modules;
#   3. apply pending migrations -- db/migrate.js also (re)seeds the seven
#      protected test accounts, so they exist on every rebuild;
#   4. start the API on PG_PORT and the frontend/proxy on PORT, skipping any
#      server that is already listening, and write logs to .run/.
#
# Usage:
#   scripts/preview-up.sh              # full bootstrap
#   scripts/preview-up.sh --no-server  # database + migrations only
#
# Idempotent: re-running on a healthy environment is a no-op that just re-checks
# the servers and re-asserts the protected accounts.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_DIR="$ROOT_DIR/.run"
LOG_DIR="$RUN_DIR/logs"
mkdir -p "$LOG_DIR"

START_SERVERS=1
[ "${1:-}" = "--no-server" ] && START_SERVERS=0

# .env is the single source of truth for the connection string and ports.
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env"
  set +a
fi

DB_URL="${DATABASE_URL:-postgres://postgres:madarasati@localhost:5432/madarasati}"
API_PORT="${PG_PORT:-4003}"
WEB_PORT="${PORT:-12000}"

log()  { printf '\033[36m[preview-up]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[preview-up]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31m[preview-up]\033[0m %s\n' "$*" >&2; exit 1; }

# ---------- parse DATABASE_URL (postgres://user:pass@host:port/db) ----------
parse_db_url() {
  local rest creds hostpart
  rest="${DB_URL#*://}"
  creds="${rest%%@*}"
  hostpart="${rest#*@}"
  DB_USER="${creds%%:*}"
  if [ "$creds" = "${creds#*:}" ]; then DB_PASS=""; else DB_PASS="${creds#*:}"; fi
  DB_HOSTPORT="${hostpart%%/*}"
  DB_NAME="${hostpart#*/}"
  DB_NAME="${DB_NAME%%\?*}"
  [ -n "$DB_NAME" ] || DB_NAME="postgres"
  if [ "$DB_HOSTPORT" = "${DB_HOSTPORT#*:}" ]; then
    DB_HOST="$DB_HOSTPORT"; DB_PORT=5432
  else
    DB_HOST="${DB_HOSTPORT%%:*}"; DB_PORT="${DB_HOSTPORT##*:}"
  fi
  [ -n "$DB_HOST" ] || DB_HOST="localhost"
  DB_USER="${DB_USER:-postgres}"
}
parse_db_url
log "database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

psql_super() { sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc "$1"; }

# ---------- 1. PostgreSQL ----------
# Server reachable at all (socket, as the postgres OS user). Used before the app
# role has a password, so it must not depend on the app credentials.
pg_server_up() { psql_super "SELECT 1" >/dev/null 2>&1; }

# App credentials actually work over TCP -- the gate that matters before
# migrations run.
pg_app_up() {
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1" >/dev/null 2>&1
}

ensure_postgres() {
  if ! command -v psql >/dev/null 2>&1 || [ ! -d /usr/lib/postgresql ]; then
    log "installing PostgreSQL (first run in a fresh container)"
    sudo apt-get update -qq || die "apt-get update failed"
    sudo apt-get install -y -qq postgresql postgresql-contrib >/dev/null || die "PostgreSQL install failed"
  fi

  local ver
  ver="$(ls /usr/lib/postgresql 2>/dev/null | sort -V | tail -1)"
  [ -n "$ver" ] || die "no PostgreSQL version found under /usr/lib/postgresql"

  if ! pg_server_up; then
    log "starting PostgreSQL $ver"
    sudo pg_ctlcluster "$ver" main start >/dev/null 2>&1 \
      || sudo service postgresql start >/dev/null 2>&1 \
      || true
    for _ in $(seq 1 30); do
      pg_server_up && break
      sleep 1
    done
  fi
  pg_server_up || die "PostgreSQL did not become reachable on ${DB_HOST}:${DB_PORT}"
  log "postgresql ready"
}

# ---------- 2. role + database ----------
ensure_database() {
  # Dev bootstrap role: LOGIN + SUPERUSER because migration 001 creates the
  # uuid-ossp extension, which needs superuser. Local sandbox only -- a real
  # deployment provisions its own role with the minimum it needs.
  if [ "$(psql_super "SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}'")" != "1" ]; then
    log "creating role ${DB_USER}"
    psql_super "CREATE ROLE \"${DB_USER}\" LOGIN SUPERUSER PASSWORD '${DB_PASS}'" || die "could not create role ${DB_USER}"
  else
    psql_super "ALTER ROLE \"${DB_USER}\" WITH LOGIN SUPERUSER PASSWORD '${DB_PASS}'" >/dev/null \
      || warn "could not refresh password for role ${DB_USER}"
  fi

  if [ "$(psql_super "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'")" != "1" ]; then
    log "creating database ${DB_NAME}"
    psql_super "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\"" || die "could not create database ${DB_NAME}"
  fi

  for _ in $(seq 1 15); do
    pg_app_up && break
    sleep 1
  done
  pg_app_up || die "cannot connect as ${DB_USER} to ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
  log "database ready"
}

ensure_deps() {
  if [ ! -d "$ROOT_DIR/node_modules" ]; then
    log "installing node dependencies"
    if [ -f "$ROOT_DIR/package-lock.json" ]; then
      npm ci --silent || npm install --silent || die "npm install failed"
    else
      npm install --silent || die "npm install failed"
    fi
  fi
}

# ---------- 3. migrations + protected accounts ----------
run_migrations() {
  log "applying migrations and seeding protected accounts"
  node db/migrate.js up || die "migrations failed"
}

# ---------- 4. servers ----------
port_listening() {
  # The subshell holds the socket only for the duration of the redirect, which
  # makes a failed connect surface as the subshell's non-zero exit status.
  (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
}

start_server() { # name port command...
  local name="$1" port="$2"; shift 2
  local pidfile="$RUN_DIR/$name.pid"

  if port_listening "$port"; then
    log "$name already listening on $port"
    return 0
  fi

  log "starting $name on $port"
  # shellcheck disable=SC2086
  nohup "$@" >"$LOG_DIR/$name.log" 2>&1 &
  echo $! >"$pidfile"

  local path="/"
  [ "$name" = "api" ] && path="/api/health"
  for _ in $(seq 1 40); do
    if curl -fsS -o /dev/null --max-time 3 "http://127.0.0.1:${port}${path}" 2>/dev/null; then
      log "$name up (pid $(cat "$pidfile"))"
      return 0
    fi
    sleep 1
  done
  warn "$name did not answer on $port -- see $LOG_DIR/$name.log"
  tail -n 15 "$LOG_DIR/$name.log" >&2
  return 1
}

ensure_postgres
ensure_database
ensure_deps
run_migrations

status=0
if [ "$START_SERVERS" = "1" ]; then
  start_server api "$API_PORT" node server/pg-app.js || status=1
  start_server web "$WEB_PORT" node server/v4-static.js || status=1
fi

log "API    : http://localhost:${API_PORT}/api/health"
log "Preview: http://localhost:${WEB_PORT}/"
[ -n "${PREVIEW_URL:-}" ] && log "Public : ${PREVIEW_URL}/"
exit "$status"
