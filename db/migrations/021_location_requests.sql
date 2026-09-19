-- 021_location_requests.sql
-- A5: controlled missing-location intake. Additive only.
-- Direct catalog writes stay admin-only; anyone authenticated may file a
-- request; admin reviews and approves (which inserts the catalog row).
BEGIN;

CREATE TABLE IF NOT EXISTS location_requests (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL
    CONSTRAINT location_requests_kind_check CHECK (kind IN ('governorate', 'district', 'neighborhood')),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  code TEXT,
  country_code TEXT,
  parent_governorate_id INTEGER REFERENCES locations_governorates(id) ON DELETE SET NULL,
  parent_district_id INTEGER REFERENCES locations_districts(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT location_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'location_requests_status_idx') THEN
    CREATE INDEX location_requests_status_idx ON location_requests (status, created_at DESC);
  END IF;
END $$;

COMMIT;
