-- 032_protected_system_accounts.sql
-- OWNING MODULE: identity
--
-- Marks the permanent demo/test accounts as protected system accounts. The flag
-- is the single thing the API guard reads (modules/identity/service.js): a
-- protected row cannot be deleted, and cannot be moved to status 'deleted'
-- through PATCH /api/users/:id either, which is the other way to soft-delete a
-- user. Protection lives in the row rather than in a code-only email allowlist
-- so a renamed or re-seeded account keeps whatever protection it was given.
--
-- db/seed-fixed-users.js sets this flag and runs automatically after
-- `node db/migrate.js up` and from scripts/preview-up.sh, so the seven accounts
-- exist -- and stay protected -- even after a container rebuild.
--
-- Additive + idempotent: safe to re-run.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.is_protected IS
  'System account: cannot be deleted through the API. Set by db/seed-fixed-users.js.';

COMMIT;
