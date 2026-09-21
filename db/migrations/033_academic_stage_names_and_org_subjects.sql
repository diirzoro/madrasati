-- 033_academic_stage_names_and_org_subjects.sql
-- Additive, idempotent. Two changes, both required by the "global catalog vs
-- organization offering" separation:
--
--   1. academic_stages.name_en -- the platform catalog is bilingual, so a stage
--      carries its Arabic and English name side by side.
--
--   2. subjects.organization_id + review_status -- an institution may need a
--      subject that does not exist in the global catalog (a local specialisation,
--      a vocational subject). AGENTS.md rule 1 forbids a second subject system,
--      so the private subject is the SAME subjects table carrying an owner:
--      organization_id IS NULL  -> global platform subject (admin-owned)
--      organization_id = <org>  -> that institution's own subject, added by the
--                                  institution and reviewed by the admin.
--      The global catalog listing filters on organization_id IS NULL, so a
--      private subject can never leak into platform-wide definitions.

-- ---------- 1. bilingual stage names ----------
ALTER TABLE academic_stages ADD COLUMN IF NOT EXISTS name_en text;

-- ---------- 2. institution-scoped subjects ----------
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES organizations(id) ON DELETE CASCADE;

-- 'approved' by default so every pre-existing row keeps its current meaning:
-- only a subject an institution adds for itself starts life awaiting review.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved';

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subjects_review_status_check'
  ) THEN
    ALTER TABLE subjects ADD CONSTRAINT subjects_review_status_check
      CHECK (review_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Listing the global catalog and listing one institution's subjects are both
-- hot paths, so both get an index.
CREATE INDEX IF NOT EXISTS subjects_organization_id_idx ON subjects (organization_id);
CREATE INDEX IF NOT EXISTS subjects_review_status_idx ON subjects (review_status);

-- ---------- 3. backfill ----------
-- Every subject that existed before this migration was a platform-wide
-- definition, so it is global (organization_id NULL) and already approved.
UPDATE subjects SET review_status = 'approved' WHERE organization_id IS NULL AND review_status <> 'approved';

-- Existing stages have no English name; fall back to the code so a bilingual
-- screen never renders an empty cell.
UPDATE academic_stages SET name_en = code WHERE name_en IS NULL AND code IS NOT NULL;
