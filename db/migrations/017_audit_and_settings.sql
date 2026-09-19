-- 017_audit_and_settings.sql
-- Enhanced audit_logs and system_settings
BEGIN;

-- Enhance audit_logs (add organization context and detailed change tracking)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS correlation_id TEXT;

-- Rename legacy column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='actor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='actor_user_id'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN actor_id TO actor_user_id;
  END IF;
END $$;

-- System settings is already created in 004, just ensure it has the right structure
-- (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ)

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- Lessons enhancement: add organization_id
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS organization_id UUID;

COMMIT;
