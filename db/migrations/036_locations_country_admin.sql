-- 036_locations_country_admin.sql
-- Enables the platform admin to add and edit a country from #/locations.
--
-- A country needs a bilingual name, but locations_countries only ever carried a
-- single `name` (UNIQUE) next to `code` and `calling_code`. The English name is
-- what the EN shell must render, so the column is added here rather than being
-- smuggled into `name`. Additive and re-runnable, as every migration must be.
--
-- No existing row is rewritten and no column is renamed or dropped: the seeded
-- countries keep their Arabic `name` and gain a NULL `name_en`, which the API
-- reads as "no English name declared yet". `code` stays the ISO alpha-2 that
-- countryCode already refers to, and duplicate names are left to the existing
-- UNIQUE constraint on `name`.

BEGIN;

ALTER TABLE locations_countries ADD COLUMN IF NOT EXISTS name_en TEXT;

-- Supports the "does this country already exist?" lookup the admin form makes
-- before it inserts, and the code lookup used by the governorate cascade.
CREATE INDEX IF NOT EXISTS locations_countries_code_idx ON locations_countries (code);

COMMIT;
