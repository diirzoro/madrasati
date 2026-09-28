-- 044_advertisement_approval_workflow.sql
-- «الإعلانات» (advertisements) become a moderated system: an institution or user
-- SUBMITS an advertisement, which enters PENDING REVIEW, and only a Program
-- Administrator / Super Admin may approve it for public display. This is the
-- opposite of offers, which stay institution-owned and self-served (see the
-- business-rule memo).
--
-- This migration therefore:
--   * widens the advertisement `status` to the full approval lifecycle, with the
--     derived states (scheduled / active / expired) left as CALCULATIONS from
--     `status = 'approved'` + starts_at/ends_at, not stored redundantly;
--   * records the approval trail (who submitted, who reviewed, and why a
--     submission was rejected or returned for changes);
--   * changes the default so a newly submitted advertisement can never be
--     publicly eligible until it is reviewed.
--
-- Additive and re-runnable. The old applied migration 022 is NOT edited.

BEGIN;

-- The stored statuses. `scheduled`, `active` and `expired` are derived by the
-- service from `status = 'approved'` plus the start/end window, so they are not
-- stored and can never contradict the schedule.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'advertisements_status_check' AND conrelid = 'advertisements'::regclass
  ) THEN
    ALTER TABLE advertisements DROP CONSTRAINT advertisements_status_check;
  END IF;
END $$;

ALTER TABLE advertisements
  ADD CONSTRAINT advertisements_status_check
  CHECK (status IN ('pending', 'approved', 'paused', 'rejected', 'cancelled', 'archived'));

ALTER TABLE advertisements ALTER COLUMN status SET DEFAULT 'pending';

-- The approval trail. `created_by`/`created_at` already record who first wrote
-- the row; these columns record the submission for review and the review
-- decision, which are separate lifecycle facts and must not be guessed from the
-- creation timestamp.
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'advertisements_status_submitted_idx') THEN
    CREATE INDEX advertisements_status_submitted_idx ON advertisements (status, submitted_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'advertisements_organization_status_idx') THEN
    CREATE INDEX advertisements_organization_status_idx ON advertisements (organization_id, status);
  END IF;
END $$;

COMMIT;
