-- 037_teacher_subject_promo.sql
-- A teacher's price already lives on the subject (teacher_pricing, one row per
-- subject). The teacher profile needs to advertise a promotional discount on a
-- subject without losing the list price, so the discount is an attribute of the
-- same priced row rather than a second price that could contradict the first.
--
-- Both columns are nullable: NULL means "no promotion", which is what every
-- existing row means and keeps their behaviour exactly as it was. Additive and
-- re-runnable, so re-applying is a no-op.

BEGIN;

ALTER TABLE teacher_pricing ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);
ALTER TABLE teacher_pricing ADD COLUMN IF NOT EXISTS promo_label TEXT;

-- A discount outside 0-100 is not a discount, and a negative one would raise the
-- price; the catalog-level offers table already enforces the same range, so this
-- follows it. Guarded so the migration can run twice.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_pricing_discount_check'
  ) THEN
    ALTER TABLE teacher_pricing
      ADD CONSTRAINT teacher_pricing_discount_check
      CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100));
  END IF;
END $$;

COMMIT;
