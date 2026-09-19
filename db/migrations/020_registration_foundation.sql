-- 020_registration_foundation.sql
-- Phase B registration/ownership foundation. Additive only; no data deleted.
-- - users.phone_normalized + partial unique index (live rows only)
-- - user_profiles: country/governorate/district/calling-code columns
-- - ownership_requests: owner/representative approval workflow
-- - organization_documents: private supporting-document metadata
BEGIN;

-- ---------- phone normalization slot ----------
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_normalized TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_phone_normalized_key') THEN
    CREATE UNIQUE INDEX users_phone_normalized_key
      ON users (phone_normalized)
      WHERE phone_normalized IS NOT NULL AND deleted_at IS NULL;
  END IF;
END $$;

-- ---------- profile geography (registration country/governorate/district) ----------
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS governorate_id INTEGER REFERENCES locations_governorates(id) ON DELETE SET NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES locations_districts(id) ON DELETE SET NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_country_code TEXT;

-- ---------- ownership / institution-management requests ----------
CREATE TABLE IF NOT EXISTS ownership_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL DEFAULT 'new_institution'
    CONSTRAINT ownership_requests_type_check CHECK (request_type IN ('new_institution', 'claim_existing')),
  institution_name TEXT,
  institution_type TEXT
    CONSTRAINT ownership_requests_orgtype_check CHECK (institution_type IS NULL OR institution_type IN ('private_school', 'government_school', 'college', 'university', 'institute')),
  country_code TEXT,
  governorate_code TEXT,
  district_code TEXT,
  neighborhood TEXT,
  address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  description TEXT,
  ownership_proof TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT ownership_requests_status_check CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'changes_requested')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decision TEXT,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ownership_requests_user_pending_key') THEN
    CREATE UNIQUE INDEX ownership_requests_user_pending_key
      ON ownership_requests (user_id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(institution_name, ''))
      WHERE status IN ('pending', 'under_review');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ownership_requests_status_idx') THEN
    CREATE INDEX ownership_requests_status_idx ON ownership_requests (status, submitted_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ownership_requests_user_idx') THEN
    CREATE INDEX ownership_requests_user_idx ON ownership_requests (user_id, submitted_at DESC);
  END IF;
END $$;

-- ---------- private organization documents ----------
CREATE TABLE IF NOT EXISTS organization_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL DEFAULT 'other'
    CONSTRAINT organization_documents_type_check CHECK (doc_type IN ('license', 'ownership', 'authorization', 'registration', 'accreditation', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT organization_documents_status_check CHECK (status IN ('pending', 'verified', 'rejected')),
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'organization_documents_org_idx') THEN
    CREATE INDEX organization_documents_org_idx ON organization_documents (organization_id, created_at DESC);
  END IF;
END $$;

COMMIT;
