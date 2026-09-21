-- 026_organization_contact_fields.sql
-- OWNING MODULE: organizations
--
-- Adds the two contact fields the institutions grid and detail screen display:
-- the principal's name and a WhatsApp number. Both are plain contact
-- attributes of the tenant, so they live on the organization row rather than
-- in the free-form jsonb blobs (stages/subjects/fees) that mirror catalog data.
--
-- Also enforces slug uniqueness at the database level: the repository already
-- looks institutions up by slug (findOrganizationBySlug), so uniqueness was an
-- unwritten assumption until now. The index is partial so the many legacy rows
-- that predate slugs (slug IS NULL) stay untouched.
--
-- Idempotent: safe to re-run.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS principal_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_key
  ON organizations (slug)
  WHERE slug IS NOT NULL;
