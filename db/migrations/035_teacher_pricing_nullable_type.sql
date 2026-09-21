-- 035_teacher_pricing_nullable_type.sql
-- 034 relaxed the teacher_pricing.pricing_type CHECK so a per-subject quote can
-- live in the same table as the older individual/group rows, but the column kept
-- its original NOT NULL, which made every per-subject insert fail. Drop it here.
--
-- 034 was already applied, and an applied migration is never edited, so this is
-- a new numbered migration rather than a change to the previous one.

BEGIN;

ALTER TABLE teacher_pricing ALTER COLUMN pricing_type DROP NOT NULL;

COMMIT;
