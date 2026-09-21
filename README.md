# Madarasati

Educational platform with a vanilla JavaScript V4 frontend and an Express API backed by PostgreSQL. Includes institution and teacher directories and an Admin dashboard.

## Local development

1. Install Node.js/npm and PostgreSQL.
2. Run `npm ci` in the project folder.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` for your local PostgreSQL database. Keep `.env` private.
4. For a new local database, review the SQL migrations and run `npm run db:migrate` when you are ready to apply them. This changes the selected database. Use `npm run db:migrate:status` to inspect migration status.
5. Run `npm run dev`.

- Frontend: http://localhost:3000
- Admin: http://localhost:3000/#/admin
- API health: http://localhost:4003/api/health

The API and frontend can also run separately with `npm run start:api` and `npm start`. Admin access requires an existing Admin account in your database. This repository does not include the local operational database, uploaded user documents, or optional development account seed scripts.

## Configuration

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | API, migrations | Primary PostgreSQL connection string. |
| `NETLIFY_DB_URL` | API, migrations | Fallback used only when `DATABASE_URL` is unset. |
| `PG_PORT` | API | API listen port. Defaults to `4003`. |
| `PORT` | frontend | Static server port. Defaults to `3000`. |
| `API_TARGET` | frontend | Where the static server proxies `/api` and `/uploads`. Defaults to `http://localhost:4003`. |
| `NODE_ENV` | API | When set to `production`, session cookies are marked `Secure`. |

See `.env.example`. Never commit a real `.env`.

`server/v4-static.js` proxies `/api` and `/uploads` to `API_TARGET`, so the frontend and
API can be reached through a single origin. That keeps the session cookie first-party and
removes the need for CORS when the app is served on a port other than 3000.

## API overview

The API is mounted per module. All application routes live under `/api`.

| Prefix | Owning module | Examples |
| --- | --- | --- |
| `/api` | identity | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/session`, `POST /api/auth/logout`, `GET /api/users`, `PUT /api/profiles/:userId`, `/api/rbac/*` |
| `/api/locations` | locations | `GET /api/locations/countries`, `GET /api/locations/governorates`, `GET /api/locations/districts`, `GET /api/locations/neighborhoods`, `POST /api/locations/requests` |
| `/api/organizations` | organizations | institution directory, verification, fees, campuses |
| `/api/academic` | academic | stages, grades, subjects, lessons |
| `/api/teachers` | teachers | teacher directory |
| `/api/admissions` | admissions | admission applications |
| `/api/bookings` | bookings | offers and bookings |
| `/api/communication` | communication | conversations, messages, notifications |
| `/api/marketplace` | marketplace | listings |
| `/api/ownership` | ownership | ownership requests |
| `/api/documents` | documents | organization documents |
| `/api/admin` | admin | `GET /api/admin/dashboard`, `GET /api/admin/audit-logs`, `GET /api/admin/pending-registrations`, `/api/admin/settings` |
| `/api` | marketing | hero slides, advertisements |

`GET /api/users` is admin-only and served by the identity module. The former
SQLite-era compatibility routes (`POST /api/login`, `POST /api/users`) have been removed;
clients should use `POST /api/auth/login` and `POST /api/auth/register`.

`GET /api/health` returns the runtime and database name, and is useful for smoke checks.

## Themes

`design-prototype-v4/theme-presets.json` holds the official theme list. The project ships a
single approved preset, `education-green`, which matches the base tokens in `styles.css`
and `theme-system.css`. The theme picker in the UI is generated from this file, so adding
a preset there is all that is needed to offer another option. `theme-manager.js` also
supports a user-defined preset stored under the `custom` id.

## Database, migrations and the audit trail

Migrations live in `db/migrations` and are applied in filename order by `db/migrate.js`.
Add new work as a new numbered file rather than editing an already-applied migration.

The audit trail is the `audit_logs` table. Its affected-row columns are named
`object_type` / `object_id`. Application code passes `entityType` / `entityId` and
`server/modules/common/audit.js` performs the mapping, so that file is the single place
that should write to the table. `writeAudit(entry, executor)` accepts an optional
transaction client; pass it whenever the audit row must commit atomically with the
change it describes (for example `registerUser`).

## Repository contents

This snapshot includes the V4 frontend, its application assets, the backend modules, PostgreSQL migrations and migration runner, scripts/dev.js, package manifests, and the environment example.

Development documentation, QA screenshots, visual-reference screenshots, optional test seeds, legacy SQLite setup, schema snapshots, backup copies, local tool configuration, and the separate theme installation pack stay in the original local workspace. They are not required to run this snapshot. Dependencies, credentials, runtime database files and user uploads are also excluded. Install dependencies and configure the local environment after cloning.

The Admin pages have passed basic rendering and API smoke checks. Full workflow, permissions and visual acceptance testing remains necessary; this snapshot is not a claim of production readiness.
