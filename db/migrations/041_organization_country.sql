-- 041_organization_country.sql
-- An institution's location cascade is country -> governorate -> district ->
-- neighborhood, so the organization needs the country it belongs to. Without it a
-- governorate code is ambiguous (Yemen and Saudi Arabia both use "SA-01" style
-- prefixes in some rows) and the institution form has no first step.
--
-- Additive and idempotent: a re-run is a no-op.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS country_code TEXT;

COMMENT ON COLUMN organizations.country_code IS
  'ISO 3166-1 alpha-2 code of the country this institution is in (locations_countries.code)';
