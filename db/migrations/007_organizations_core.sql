-- 007_organizations_core.sql
-- Core organizations table + membership (evolution of institutions)
BEGIN;

-- Drop legacy institutions table if it still exists (renamed to organizations)
-- NOTE: This is safe because the institutions table data was already migrated
-- to organizations before this migration was first applied.
DROP TABLE IF EXISTS user_institutions CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;

-- Organizations (replaces institutions)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT,
  type TEXT,
  description TEXT,
  governorate_id INTEGER REFERENCES locations_governorates(id),
  district_id INTEGER REFERENCES locations_districts(id),
  address TEXT,
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  search_vector tsvector,
  phone TEXT,
  email TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  map_url TEXT,
  image TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  gender TEXT,
  curriculum TEXT,
  bio TEXT,
  stage_availability JSONB DEFAULT '{}'::jsonb,
  subjects JSONB DEFAULT '[]'::jsonb,
  stages JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,
  teaching_methods JSONB DEFAULT '[]'::jsonb,
  grades JSONB DEFAULT '[]'::jsonb,
  fees JSONB DEFAULT '[]'::jsonb,
  fee_details JSONB DEFAULT '[]'::jsonb,
  facilities JSONB DEFAULT '[]'::jsonb,
  activities JSONB DEFAULT '[]'::jsonb,
  offers JSONB DEFAULT '[]'::jsonb,
  discounts JSONB DEFAULT '[]'::jsonb,
  working_hours JSONB DEFAULT '{}'::jsonb,
  governorate_code TEXT,
  district_code TEXT,
  neighborhood TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  verified BOOLEAN DEFAULT false NOT NULL,
  verification_status TEXT DEFAULT 'pending' NOT NULL,
  data_source TEXT DEFAULT 'postgres' NOT NULL,
  seats_available INTEGER,
  registration_open BOOLEAN DEFAULT false NOT NULL,
  registration_status TEXT,
  registration_info TEXT,
  teachers INTEGER DEFAULT 0 NOT NULL,
  students INTEGER DEFAULT 0 NOT NULL,
  reviews INTEGER DEFAULT 0 NOT NULL,
  neighborhood_id INTEGER,
  CONSTRAINT organizations_type_check CHECK (type IN ('private_school','government_school','college','university','institute'))
);

-- Organization memberships (replaces user_institutions)
CREATE TABLE IF NOT EXISTS organization_memberships (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  membership_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_memberships_status_check CHECK (status IN ('active','inactive','suspended','pending'))
);

COMMIT;
