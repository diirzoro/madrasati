-- 031_higher_education_catalog_and_offering_backfill.sql
-- OWNING MODULE: academic
--
-- Closes two gaps that the global-catalog / organization-offering split exposed.
--
-- A. HIGHER-EDUCATION STAGES ARE MISSING FROM THE CATALOG.
--    The memo listed only Kindergarten / Primary / Preparatory / Secondary as
--    stage examples, yet AGENTS.md rule 6 requires one tenant core for every
--    institution type. A college, university or institute therefore had nothing
--    to select: its organization_stages rows were all zero while private and
--    government schools had 59. The memo is corrected in the same commit
--    (docs/MADARASATI_ACADEMIC_STRUCTURE_REQUIREMENTS_MEMO.md, section 5).
--    Stages stay price-free: this adds names, never amounts.
--
-- B. GRADE TRACK (المسار) WAS NULL EVERYWHERE.
--    Migration 030 added the column; this fills the secondary ladder so the
--    الأول ثانوي / الثاني ثانوي / الثالث ثانوي rows carry علمي / أدبي / عام.
--
-- C. STAGE OFFERING BACKFILL.
--    A college / institute / university that the seed describes but has no
--    organization_stages row cannot be shown on the details screen. The
--    offering rows are created WITHOUT a fee on purpose: the platform never
--    prices a stage centrally, so the institution sets the amount itself.
--
-- Additive, idempotent, safe to re-run.

BEGIN;

-- A code is the key an organization offering uses to refer to a catalog row,
-- and migration 030's reconciliation already relies on it. It was never
-- declared unique, so two stages could share "SECONDARY" and an offering would
-- silently point at whichever row happened to sort first. The indexes are
-- partial so the catalog can still hold an unnamed row if it ever needs to.
CREATE UNIQUE INDEX IF NOT EXISTS academic_stages_code_key
  ON academic_stages (code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS academic_grades_stage_code_key
  ON academic_grades (stage_id, code) WHERE code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- A. Higher-education stages (names only — no price, no capacity)
-- ---------------------------------------------------------------------------
INSERT INTO academic_stages (code, name, description, sort_order, is_active) VALUES
  ('DIPLOMA',        'دبلوم',        'برنامج دبلوم مهني أو تقني بعد المرحلة الثانوية.', 200, true),
  ('HIGHER_DIPLOMA', 'دبلوم عالي',   'برنامج دبلوم عالي بعد الدبلوم.',                  210, true),
  ('BACHELOR',       'بكالوريوس',    'برنامج جامعي يؤدي إلى درجة البكالوريوس.',         220, true),
  ('MASTER',         'ماجستير',      'برنامج دراسات عليا يؤدي إلى درجة الماجستير.',    230, true),
  ('DOCTORATE',      'دكتوراه',      'برنامج دراسات عليا يؤدي إلى درجة الدكتوراه.',    240, true)
ON CONFLICT DO NOTHING;

-- Grade ladder for the new stages, so a college is not left with a stage that
-- has no year levels. Track stays NULL (عام) which is the honest default here.
INSERT INTO academic_grades (stage_id, code, name, sort_order, is_active, track)
SELECT s.id, v.code, v.name, v.sort_order, true, NULL
FROM academic_stages s
JOIN (VALUES
  ('DIPLOMA',        'DIP1', 'دبلوم - السنة الأولى',   201),
  ('DIPLOMA',        'DIP2', 'دبلوم - السنة الثانية',  202),
  ('HIGHER_DIPLOMA', 'HD1',  'دبلوم عالي - السنة الأولى',  211),
  ('BACHELOR',       'B1',   'بكالوريوس - السنة الأولى',   221),
  ('BACHELOR',       'B2',   'بكالوريوس - السنة الثانية',  222),
  ('BACHELOR',       'B3',   'بكالوريوس - السنة الثالثة',  223),
  ('BACHELOR',       'B4',   'بكالوريوس - السنة الرابعة',  224),
  ('MASTER',         'M1',   'ماجستير - السنة الأولى',     231),
  ('MASTER',         'M2',   'ماجستير - السنة الثانية',    232),
  ('DOCTORATE',      'PH1',  'دكتوراه - مرحلة البحث',      241)
) AS v(stage_code, code, name, sort_order) ON v.stage_code = s.code
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- B. Grade track for the secondary ladder.
--    عام is the default because a government secondary school may run both
--    streams; a school that separates them edits the track per grade.
-- ---------------------------------------------------------------------------
UPDATE academic_grades SET track = 'general'
WHERE track IS NULL AND code IN ('G10', 'G11', 'G12');

-- ---------------------------------------------------------------------------
-- C. Stage offering backfill, one institution at a time, still price-free.
--    School types already have their offer rows from migration 030's JSONB
--    reconciliation; the higher-education types are seeded here from their own
--    declared level so the offering screen has something real to render.
-- ---------------------------------------------------------------------------
INSERT INTO organization_stages (organization_id, stage_id)
SELECT o.id, s.id
FROM organizations o
JOIN academic_stages s ON s.code = CASE o.type
  WHEN 'college'    THEN 'BACHELOR'
  WHEN 'university' THEN 'BACHELOR'
  WHEN 'institute'  THEN 'DIPLOMA'
END
WHERE o.deleted_at IS NULL
  AND o.type IN ('college', 'university', 'institute')
ON CONFLICT (organization_id, stage_id) DO NOTHING;

-- Universities additionally run postgraduate programmes, which is what makes
-- their offering different from a college's rather than a copy of it.
INSERT INTO organization_stages (organization_id, stage_id)
SELECT o.id, s.id
FROM organizations o
JOIN academic_stages s ON s.code IN ('MASTER', 'DOCTORATE')
WHERE o.deleted_at IS NULL AND o.type = 'university'
ON CONFLICT (organization_id, stage_id) DO NOTHING;

-- Delivery mode + language for the rows just created, using the same attribute
-- vocabulary as migration 030. A higher-education institution is not "active"
-- as a delivery mode; ACTIVE is a status and never belongs in this column.
UPDATE organization_stages os
SET delivery_mode = CASE
      WHEN o.teaching_methods @> '["HYBRID"]'::jsonb THEN 'hybrid'
      WHEN o.teaching_methods @> '["ONLINE"]'::jsonb THEN 'online'
      ELSE 'on_site'
    END
FROM organizations o
WHERE o.id = os.organization_id
  AND os.delivery_mode IS NULL
  AND o.deleted_at IS NULL;

UPDATE organization_stages os
SET language_code = COALESCE(o.languages ->> 0, 'AR')
FROM organizations o
WHERE o.id = os.organization_id
  AND os.language_code IS NULL
  AND o.deleted_at IS NULL
  AND jsonb_typeof(o.languages) = 'array'
  AND jsonb_array_length(o.languages) > 0;

COMMIT;
