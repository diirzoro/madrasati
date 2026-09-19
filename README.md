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

## Repository contents

This snapshot includes the V4 frontend, its application assets, the backend modules, PostgreSQL migrations and migration runner, scripts/dev.js, package manifests, and the environment example.

Development documentation, QA screenshots, visual-reference screenshots, optional test seeds, legacy SQLite setup, schema snapshots, backup copies, local tool configuration, and the separate theme installation pack stay in the original local workspace. They are not required to run this snapshot. Dependencies, credentials, runtime database files and user uploads are also excluded. Install dependencies and configure the local environment after cloning.

The Admin pages have passed basic rendering and API smoke checks. Full workflow, permissions and visual acceptance testing remains necessary; this snapshot is not a claim of production readiness.
