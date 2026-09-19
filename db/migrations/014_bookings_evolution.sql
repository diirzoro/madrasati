-- 014_bookings_evolution.sql
-- Enhanced bookings with organization context, status history, and type model
BEGIN;

-- Enhance bookings table (add new columns, keep legacy amount_cents for transition)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'school_visit' NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subject_id INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stage_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS teacher_user_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_seats_check'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_seats_check CHECK (seats > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_v2_check'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_status_v2_check CHECK (
      status IN ('draft','pending','confirmed','completed','rejected','cancelled',
                 'no_show','expired','refunded','booked')
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_type_check'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_type_check CHECK (
      booking_type IN ('school_visit','admission_interview','parent_meeting',
                       'teacher_lesson','institute_course','workshop','other')
    );
  END IF;
END $$;

-- Booking status history
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by_user_id UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

COMMIT;
