-- 023_academic_capacity_and_fee_uniqueness.sql
-- Resolves the two pre-migration decisions recorded in
-- docs/TAHER_ARCHITECTURE_AND_DASHBOARD_CONTROL_MAP.md (section 19).
--
--   1. Uniqueness of the nullable grade_id on organization_fees. A plain UNIQUE
--      constraint cannot express this: PostgreSQL treats every NULL as distinct,
--      so an organization-scoped or stage-scoped fee could be inserted without
--      limit. One partial unique index per pricing scope closes that hole.
--
--   2. Capacity and delivery mode. Seats are derived, never entered by hand:
--      remaining_seats is a generated column so the value cannot drift from the
--      formula remaining = capacity - current_students.
--
-- Additive only; safe to re-run. PostgreSQL remains the single source of truth.
BEGIN;

-- ---------------------------------------------------------------------------
-- organization_fees — one fee definition per pricing scope.
--
-- A fee is priced against exactly one scope:
--   * grade  -> grade_id IS NOT NULL
--   * stage  -> grade_id IS NULL AND stage_id IS NOT NULL
--   * org    -> both NULL
--
-- Soft-deleted rows are excluded from every index so a fee can be recreated
-- after being retired.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'organization_fees_grade_scope_key') THEN
    CREATE UNIQUE INDEX organization_fees_grade_scope_key
      ON organization_fees (organization_id, fee_type, name, grade_id)
      WHERE grade_id IS NOT NULL AND deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'organization_fees_stage_scope_key') THEN
    CREATE UNIQUE INDEX organization_fees_stage_scope_key
      ON organization_fees (organization_id, fee_type, name, stage_id)
      WHERE grade_id IS NULL AND stage_id IS NOT NULL AND deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'organization_fees_org_scope_key') THEN
    CREATE UNIQUE INDEX organization_fees_org_scope_key
      ON organization_fees (organization_id, fee_type, name)
      WHERE grade_id IS NULL AND stage_id IS NULL AND deleted_at IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- organization_stages / organization_grades — the capacity-bearing offers.
-- ---------------------------------------------------------------------------
ALTER TABLE organization_stages ADD COLUMN IF NOT EXISTS delivery_mode TEXT;
ALTER TABLE organization_stages ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE organization_stages ADD COLUMN IF NOT EXISTS current_students INTEGER NOT NULL DEFAULT 0;

ALTER TABLE organization_grades ADD COLUMN IF NOT EXISTS delivery_mode TEXT;
ALTER TABLE organization_grades ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE organization_grades ADD COLUMN IF NOT EXISTS current_students INTEGER NOT NULL DEFAULT 0;

-- Attending mode is an attribute of the offer, not a catalog of its own.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_stages_delivery_mode_check') THEN
    ALTER TABLE organization_stages ADD CONSTRAINT organization_stages_delivery_mode_check
      CHECK (delivery_mode IS NULL OR delivery_mode IN ('on_site', 'online', 'hybrid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_grades_delivery_mode_check') THEN
    ALTER TABLE organization_grades ADD CONSTRAINT organization_grades_delivery_mode_check
      CHECK (delivery_mode IS NULL OR delivery_mode IN ('on_site', 'online', 'hybrid'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_stages_capacity_check') THEN
    ALTER TABLE organization_stages ADD CONSTRAINT organization_stages_capacity_check
      CHECK (capacity IS NULL OR capacity >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_grades_capacity_check') THEN
    ALTER TABLE organization_grades ADD CONSTRAINT organization_grades_capacity_check
      CHECK (capacity IS NULL OR capacity >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_stages_current_students_check') THEN
    ALTER TABLE organization_stages ADD CONSTRAINT organization_stages_current_students_check
      CHECK (current_students >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_grades_current_students_check') THEN
    ALTER TABLE organization_grades ADD CONSTRAINT organization_grades_current_students_check
      CHECK (current_students >= 0);
  END IF;
END $$;

-- remaining_seats is always capacity - current_students. A generated column is
-- used so no caller can write a value that contradicts the formula; a NULL
-- capacity means "not declared" and yields a NULL remainder.
-- current_students may exceed capacity (over-enrolment is real), so the
-- remainder is deliberately allowed to go negative instead of being clamped.
ALTER TABLE organization_stages ADD COLUMN IF NOT EXISTS remaining_seats INTEGER
  GENERATED ALWAYS AS (capacity - current_students) STORED;
ALTER TABLE organization_grades ADD COLUMN IF NOT EXISTS remaining_seats INTEGER
  GENERATED ALWAYS AS (capacity - current_students) STORED;

COMMIT;
