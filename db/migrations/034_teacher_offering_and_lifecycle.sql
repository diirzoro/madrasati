-- 034_teacher_offering_and_lifecycle.sql
-- Teachers are independent professionals, not institutions. This migration
-- gives the teacher module everything the "add teacher" form needs:
--   * a real user account (role teacher) plus a bilingual display name,
--   * a declared country/governorate/district/neighborhood + address,
--   * per-subject pricing (amount, currency, hourly|monthly, teaching language),
--   * uploadable qualification/experience/identity documents,
--   * a two-step deletion flow (request -> platform-admin decision) instead of
--     an instant delete, with the reason stored for audit.
-- Additive and re-runnable. Nothing here prices or alters an institution, and
-- the global academic catalog keeps its price-free contract.

BEGIN;

-- ---------- countries: the form offers exactly Yemen and Saudi Arabia ----------
-- locations_countries was created but never seeded, so every Yemeni governorate
-- carried a NULL country_id and the country -> governorate cascade had no root.
INSERT INTO locations_countries (code, name, calling_code, is_default, is_active, sort_order)
VALUES
  ('YE', 'اليمن', '967', true, true, 1),
  ('SA', 'السعودية', '966', false, true, 2)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      calling_code = COALESCE(locations_countries.calling_code, EXCLUDED.calling_code),
      is_active = true;

-- Backfill the existing 22 Yemeni governorates (migration 018 inserted them with
-- a sub-select that matched nothing, so country_id stayed NULL).
UPDATE locations_governorates
   SET country_id = (SELECT id FROM locations_countries WHERE code = 'YE')
 WHERE country_id IS NULL;

-- Saudi regions, so choosing السعودية does not land on an empty governorate
-- list. The 13 administrative regions, with their official codes.
INSERT INTO locations_governorates (name, code, country_id, sort_order, is_active)
VALUES
  ('منطقة الرياض',         'SA-01', (SELECT id FROM locations_countries WHERE code = 'SA'), 1,  true),
  ('منطقة مكة المكرمة',    'SA-02', (SELECT id FROM locations_countries WHERE code = 'SA'), 2,  true),
  ('منطقة المدينة المنورة','SA-03', (SELECT id FROM locations_countries WHERE code = 'SA'), 3,  true),
  ('منطقة القصيم',         'SA-05', (SELECT id FROM locations_countries WHERE code = 'SA'), 4,  true),
  ('المنطقة الشرقية',      'SA-04', (SELECT id FROM locations_countries WHERE code = 'SA'), 5,  true),
  ('منطقة عسير',           'SA-14', (SELECT id FROM locations_countries WHERE code = 'SA'), 6,  true),
  ('منطقة تبوك',           'SA-07', (SELECT id FROM locations_countries WHERE code = 'SA'), 7,  true),
  ('منطقة حائل',           'SA-06', (SELECT id FROM locations_countries WHERE code = 'SA'), 8,  true),
  ('منطقة الحدود الشمالية','SA-08', (SELECT id FROM locations_countries WHERE code = 'SA'), 9,  true),
  ('منطقة جازان',          'SA-09', (SELECT id FROM locations_countries WHERE code = 'SA'), 10, true),
  ('منطقة نجران',          'SA-10', (SELECT id FROM locations_countries WHERE code = 'SA'), 11, true),
  ('منطقة الباحة',         'SA-11', (SELECT id FROM locations_countries WHERE code = 'SA'), 12, true),
  ('منطقة الجوف',          'SA-12', (SELECT id FROM locations_countries WHERE code = 'SA'), 13, true)
ON CONFLICT (name) DO NOTHING;

-- ---------- teacher_profiles: identity, location, skills, lifecycle ----------
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS country_id INTEGER
  REFERENCES locations_countries(id) ON DELETE SET NULL;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS skills TEXT[];

-- The profile location is the teacher's declared residence / teaching venue. It
-- is the one place a teacher says "I am here"; teacher_service_areas remains the
-- separate coverage-radius concept and is untouched.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='teacher_profiles' AND column_name='address_line'
  ) THEN
    ALTER TABLE teacher_profiles ADD COLUMN address_line TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='teacher_profiles' AND column_name='governorate_id'
  ) THEN
    ALTER TABLE teacher_profiles ADD COLUMN governorate_id INTEGER REFERENCES locations_governorates(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='teacher_profiles' AND column_name='district_id'
  ) THEN
    ALTER TABLE teacher_profiles ADD COLUMN district_id INTEGER REFERENCES locations_districts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='teacher_profiles' AND column_name='neighborhood_id'
  ) THEN
    ALTER TABLE teacher_profiles ADD COLUMN neighborhood_id INTEGER REFERENCES locations_neighborhoods(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 'deletion_requested' is a real holding state: the teacher stays in the
-- database and keeps their data until a platform admin decides.
ALTER TABLE teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_status_check;
ALTER TABLE teacher_profiles ADD CONSTRAINT teacher_profiles_status_check
  CHECK (profile_status IN ('active','inactive','suspended','deletion_requested'));

-- ---------- teacher_pricing: one price per subject ----------
ALTER TABLE teacher_pricing ADD COLUMN IF NOT EXISTS subject_id INTEGER
  REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE teacher_pricing ADD COLUMN IF NOT EXISTS billing_period TEXT;
ALTER TABLE teacher_pricing ADD COLUMN IF NOT EXISTS language_code TEXT;

DO $$
BEGIN
  -- 'individual' / 'group' answers a different question than the new per-subject
  -- rows, which are neither. Relaxing the check is what lets both live together
  -- instead of inventing a second pricing table.
  ALTER TABLE teacher_pricing DROP CONSTRAINT IF EXISTS teacher_pricing_type_check;
  ALTER TABLE teacher_pricing ADD CONSTRAINT teacher_pricing_type_check
    CHECK (pricing_type IS NULL OR pricing_type IN ('individual','group'));
  ALTER TABLE teacher_pricing DROP CONSTRAINT IF EXISTS teacher_pricing_period_check;
  ALTER TABLE teacher_pricing ADD CONSTRAINT teacher_pricing_period_check
    CHECK (billing_period IS NULL OR billing_period IN ('hourly','monthly'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DB-level duplicate guard: a teacher quotes a subject once.
CREATE UNIQUE INDEX IF NOT EXISTS teacher_pricing_teacher_subject_key
  ON teacher_pricing (teacher_id, subject_id)
  WHERE subject_id IS NOT NULL AND is_active;

CREATE INDEX IF NOT EXISTS teacher_pricing_teacher_idx ON teacher_pricing (teacher_id);

-- ---------- subject catalog: case/space insensitive uniqueness ----------
-- The form may propose a subject the catalog lacks. Trimmed + case-insensitive
-- uniqueness is enforced by the database, not only by the API check, so two
-- concurrent submissions cannot create "الرياضيات" and " الرياضيات ".
CREATE UNIQUE INDEX IF NOT EXISTS subjects_global_name_ci_key
  ON subjects (lower(btrim(name)))
  WHERE organization_id IS NULL;

-- ---------- teacher documents ----------
-- Same private-storage contract as organization_documents (never served from a
-- static directory, always downloaded as an attachment). Organizations and
-- teachers are different owning entities, so they get their own table instead of
-- a nullable column on the institution one.
CREATE TABLE IF NOT EXISTS teacher_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_documents_type_check
    CHECK (doc_type IN ('degree','experience','identity','certificate','other')),
  CONSTRAINT teacher_documents_status_check
    CHECK (status IN ('pending','verified','rejected'))
);

CREATE INDEX IF NOT EXISTS teacher_documents_teacher_idx
  ON teacher_documents (teacher_id, created_at DESC);

-- ---------- teacher deletion requests ----------
CREATE TABLE IF NOT EXISTS teacher_deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  decided_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_deletion_requests_status_check
    CHECK (status IN ('pending','approved','rejected')),
  CONSTRAINT teacher_deletion_requests_reason_check
    CHECK (length(btrim(reason)) >= 10),
  CONSTRAINT teacher_deletion_requests_action_check
    CHECK (decided_action IS NULL OR decided_action IN ('deleted','rejected'))
);

-- One open request per teacher: pressing delete twice must not queue two.
CREATE UNIQUE INDEX IF NOT EXISTS teacher_deletion_requests_open_key
  ON teacher_deletion_requests (teacher_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS teacher_deletion_requests_status_idx
  ON teacher_deletion_requests (status, created_at DESC);

COMMIT;
