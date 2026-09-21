-- 030_organization_offering_and_grade_tracks.sql
-- OWNING MODULE: academic + organizations
--
-- Records the two decisions this phase made explicit, and the owning memos were
-- updated in the same commit (docs/MADARASATI_ACADEMIC_STRUCTURE_REQUIREMENTS_MEMO.md,
-- section 2, and AGENTS.md section 3).
--
--   1. GLOBAL CATALOG VS. ORGANIZATION OFFERING.
--      The platform catalog (academic_stages / academic_grades / subjects /
--      curricula / languages / teaching_methods) is an abstract, price-free
--      definition owned by the platform admin. It carries no amount, no
--      capacity and no currency. Every price, currency, payment period,
--      capacity and teaching language belongs to one institution and lives in
--      the organization tables below.
--
--   2. GRADE TRACK (المسار).
--      A grade carries an optional `track` so the platform catalog can label
--      الأول ثانوي / الثاني ثانوي / الثالث ثانوي with علمي / أدبي / عام. The
--      track is a *catalog label*, never a price and never a separate grade
--      row: the ladder stays 1..12 and NULL means "عام".
--
--   3. STAGE + SUBJECT OFFERING (the priced entities).
--      A stage is priced through organization_fees (stage-scoped rows, one
--      definition per scope by the partial unique indexes from 023). A subject
--      is a priced entity in its own right, so its price and teaching language
--      live on the organization_subjects junction. Capacity stays derived:
--      remaining_seats is a generated column and is never written here.
--
-- Additive, idempotent, safe to re-run. PostgreSQL remains the source of truth.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Global catalog: grade track (المسار)
-- ---------------------------------------------------------------------------
ALTER TABLE academic_grades ADD COLUMN IF NOT EXISTS track TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_grades_track_check') THEN
    ALTER TABLE academic_grades ADD CONSTRAINT academic_grades_track_check
      CHECK (track IS NULL OR track IN ('science', 'literary', 'general'));
  END IF;
END $$;

COMMENT ON COLUMN academic_grades.track IS
  'Optional catalog label: science (علمي) / literary (أدبي) / general (عام). NULL means عام. Never a price.';

-- ---------------------------------------------------------------------------
-- 2. Organization offering: teaching language on the stage offer.
--    AGENTS.md rule 8: the learning language sits on the stage AND on the
--    individual subject, so an English subject can live inside an Arabic stage.
-- ---------------------------------------------------------------------------
ALTER TABLE organization_stages ADD COLUMN IF NOT EXISTS language_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_stages_language_code_check') THEN
    ALTER TABLE organization_stages ADD CONSTRAINT organization_stages_language_code_check
      CHECK (language_code IS NULL OR language_code IN ('AR', 'EN', 'FR'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Organization offering: subject price + subject teaching language.
--    A subject is one of the four priced entities (stage, subject, course,
--    service), so the fee belongs here and not in the global catalog.
-- ---------------------------------------------------------------------------
ALTER TABLE organization_subjects ADD COLUMN IF NOT EXISTS language_code TEXT;
ALTER TABLE organization_subjects ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(14,2);
ALTER TABLE organization_subjects ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'YER';
ALTER TABLE organization_subjects ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE organization_subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_subjects_language_code_check') THEN
    ALTER TABLE organization_subjects ADD CONSTRAINT organization_subjects_language_code_check
      CHECK (language_code IS NULL OR language_code IN ('AR', 'EN', 'FR'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_subjects_fee_amount_check') THEN
    ALTER TABLE organization_subjects ADD CONSTRAINT organization_subjects_fee_amount_check
      CHECK (fee_amount IS NULL OR fee_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_subjects_frequency_check') THEN
    ALTER TABLE organization_subjects ADD CONSTRAINT organization_subjects_frequency_check
      CHECK (frequency IS NULL OR frequency IN ('once', 'monthly', 'term', 'yearly'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_subjects_currency_check') THEN
    ALTER TABLE organization_subjects ADD CONSTRAINT organization_subjects_currency_check
      CHECK (currency IN ('YER', 'SAR', 'USD'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Progressive migration of the legacy organizations.stages JSONB cache into
--    the normalized organization_stages offering rows (AGENTS.md rule 2: the
--    normalized tables are the source of truth, the JSONB columns are a cache).
-- ---------------------------------------------------------------------------
INSERT INTO organization_stages (organization_id, stage_id)
SELECT o.id, s.id
FROM organizations o
CROSS JOIN LATERAL jsonb_array_elements_text(o.stages) AS cached(code)
JOIN academic_stages s ON s.code = cached.code
WHERE o.deleted_at IS NULL
  AND jsonb_typeof(o.stages) = 'array'
ON CONFLICT (organization_id, stage_id) DO NOTHING;

-- Delivery mode is an attribute of the offer and only three values are legal:
-- on_site (حضوري), online (عن بُعد), hybrid (مدمج). The seeded catalog method
-- codes are mapped once so the offering starts from real data; anything that is
-- not a delivery signal (ACTIVE/MONTESSORI/TRAD) resolves to on_site.
UPDATE organization_stages os
SET delivery_mode = CASE
      WHEN m.methods @> '["HYBRID"]'::jsonb THEN 'hybrid'
      WHEN m.methods @> '["ONLINE"]'::jsonb THEN 'online'
      ELSE 'on_site'
    END
FROM (
  SELECT o.id AS organization_id, COALESCE(o.teaching_methods, '[]'::jsonb) AS methods
  FROM organizations o
  WHERE o.deleted_at IS NULL
) m
WHERE m.organization_id = os.organization_id
  AND os.delivery_mode IS NULL;

-- Stage teaching language: default to the institution's first declared
-- language, which the institution can then override per stage.
UPDATE organization_stages os
SET language_code = COALESCE(o.languages ->> 0, 'AR')
FROM organizations o
WHERE o.id = os.organization_id
  AND os.language_code IS NULL
  AND jsonb_typeof(o.languages) = 'array'
  AND jsonb_array_length(o.languages) > 0;

-- Subject teaching language: same rule, one level down.
UPDATE organization_subjects os
SET language_code = COALESCE(o.languages ->> 0, 'AR')
FROM organizations o
WHERE o.id = os.organization_id
  AND os.language_code IS NULL
  AND jsonb_typeof(o.languages) = 'array'
  AND jsonb_array_length(o.languages) > 0;

COMMIT;
