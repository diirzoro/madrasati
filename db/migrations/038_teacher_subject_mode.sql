-- 038_teacher_subject_mode.sql
-- A teacher's subjects are where the price lives, and the *place* a lesson happens
-- belongs to the same decision: an online lesson and a lesson at the student's
-- home are different offers, not two flags on the profile. Until now the mode was
-- only a teacher-level attribute (offers_online / travels_to_student_home /
-- accepts_student_home), so a teacher who teaches one subject online and another
-- in person could not say so.
--
-- `location_mode` is the per-subject answer, using exactly the same vocabulary as
-- teacher_availability.location_mode so the two can never disagree about what
-- "online" means. It is nullable: NULL is "not declared for this subject yet",
-- which is what every existing row means, so nothing changes meaning.
--
-- The teacher-level booleans stay (the public directory filters on them) and are
-- derived from these rows on save, so there is one source of truth and no
-- contradiction between the two layers. Additive and re-runnable.

BEGIN;

ALTER TABLE teacher_pricing ADD COLUMN IF NOT EXISTS location_mode TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_pricing_location_mode_check'
  ) THEN
    ALTER TABLE teacher_pricing
      ADD CONSTRAINT teacher_pricing_location_mode_check
      CHECK (location_mode IS NULL OR location_mode = ANY (ARRAY['online'::text, 'student_home'::text, 'teacher_location'::text]));
  END IF;
END $$;

COMMIT;
