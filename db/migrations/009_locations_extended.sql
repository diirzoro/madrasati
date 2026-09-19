-- 009_locations_extended.sql
-- Extended location hierarchy: countries, neighborhoods
BEGIN;

-- Countries
CREATE TABLE IF NOT EXISTS locations_countries (
  id SERIAL PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT locations_countries_code_key UNIQUE (code),
  CONSTRAINT locations_countries_name_key UNIQUE (name)
);

-- Add country_id to governorates if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_governorates' AND column_name='country_id'
  ) THEN
    ALTER TABLE locations_governorates ADD COLUMN country_id INTEGER;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_governorates' AND column_name='code'
  ) THEN
    ALTER TABLE locations_governorates ADD COLUMN code TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_governorates' AND column_name='latitude'
  ) THEN
    ALTER TABLE locations_governorates ADD COLUMN latitude NUMERIC(9,6);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_governorates' AND column_name='longitude'
  ) THEN
    ALTER TABLE locations_governorates ADD COLUMN longitude NUMERIC(9,6);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_governorates' AND column_name='sort_order'
  ) THEN
    ALTER TABLE locations_governorates ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_governorates' AND column_name='is_active'
  ) THEN
    ALTER TABLE locations_governorates ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
  END IF;
END $$;

-- Add code/lat/lng to districts if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_districts' AND column_name='code'
  ) THEN
    ALTER TABLE locations_districts ADD COLUMN code TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_districts' AND column_name='latitude'
  ) THEN
    ALTER TABLE locations_districts ADD COLUMN latitude NUMERIC(9,6);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_districts' AND column_name='longitude'
  ) THEN
    ALTER TABLE locations_districts ADD COLUMN longitude NUMERIC(9,6);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_districts' AND column_name='sort_order'
  ) THEN
    ALTER TABLE locations_districts ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='locations_districts' AND column_name='is_active'
  ) THEN
    ALTER TABLE locations_districts ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
  END IF;
END $$;

-- Add unique constraint on governorates name if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'locations_governorates_name_key'
  ) THEN
    ALTER TABLE locations_governorates ADD CONSTRAINT locations_governorates_name_key UNIQUE (name);
  END IF;
END $$;

-- Neighborhoods
CREATE TABLE IF NOT EXISTS locations_neighborhoods (
  id SERIAL PRIMARY KEY,
  district_id INTEGER NOT NULL REFERENCES locations_districts(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true NOT NULL,
  CONSTRAINT locations_neighborhoods_code_key UNIQUE (code),
  CONSTRAINT uq_neighborhoods_code UNIQUE (code)
);

COMMIT;
