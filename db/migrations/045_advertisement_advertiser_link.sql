-- 045_advertisement_advertiser_link.sql
-- «المعلن» stops being free text and becomes a real reference: an advertiser is
-- either an institution (already held in organization_id) or a private teacher.
-- This migration adds the teacher link so the advertisement form can offer a
-- dropdown of owners and private teachers instead of a free-text box.
--
-- Additive and re-runnable.

ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'advertisements_teacher_idx') THEN
    CREATE INDEX advertisements_teacher_idx ON advertisements (teacher_id);
  END IF;
END $$;
