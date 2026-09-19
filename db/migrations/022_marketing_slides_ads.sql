-- 022_marketing_slides_ads.sql
-- Marketing content foundation (additive only).
--   * hero_slides      : Super-Admin managed landing hero slides (canonical source).
--   * advertisements   : ticker / banner ads (canonical source, monitoring counters).
--   * offers           : additive guards for the existing offers table so the new
--                        marketing module can manage it safely on both a fresh
--                        migration chain and the live database.
-- PostgreSQL remains the single operational source of truth.
BEGIN;

-- ---------------------------------------------------------------------------
-- hero_slides — landing hero slider content.
-- The frontend keeps a local platform fallback so the landing is never empty,
-- but whenever eligible rows exist here they drive the slider.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hero_slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slide_type TEXT NOT NULL DEFAULT 'promotion',
  title_ar TEXT,
  title_en TEXT,
  subtitle_ar TEXT,
  subtitle_en TEXT,
  badge_ar TEXT,
  badge_en TEXT,
  image TEXT NOT NULL,
  image_position TEXT NOT NULL DEFAULT 'center',
  overlay_title_ar TEXT,
  overlay_title_en TEXT,
  location_ar TEXT,
  location_en TEXT,
  cta_label_ar TEXT,
  cta_label_en TEXT,
  cta_route TEXT,
  cta_url TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  placement TEXT[] NOT NULL DEFAULT ARRAY['public_hero']::text[],
  status TEXT NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hero_slides_type_check CHECK (slide_type IN ('platform', 'promotion', 'premium_ad')),
  CONSTRAINT hero_slides_status_check CHECK (status IN ('draft', 'approved', 'paused', 'rejected', 'expired'))
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'hero_slides_placement_status_idx') THEN
    CREATE INDEX hero_slides_placement_status_idx
      ON hero_slides (status, active, priority DESC, created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'hero_slides_placement_gin_idx') THEN
    CREATE INDEX hero_slides_placement_gin_idx ON hero_slides USING gin (placement);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- advertisements — ticker / banner campaigns.
--   billing_mode free|paid is recorded only; no payment provider is integrated
--   at this stage (do not over-build billing).
--   impressions / clicks are monitoring counters, incremented only by genuine
--   frontend events (never by a raw page load).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  advertiser TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ad_type TEXT NOT NULL DEFAULT 'general',
  billing_mode TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  placement TEXT[] NOT NULL DEFAULT ARRAY['ticker']::text[],
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  image TEXT,
  target_url TEXT,
  target_route TEXT,
  message_ar TEXT,
  message_en TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT advertisements_type_check CHECK (ad_type IN ('general', 'promotion', 'enrollment', 'notice')),
  CONSTRAINT advertisements_billing_check CHECK (billing_mode IN ('free', 'paid')),
  CONSTRAINT advertisements_status_check CHECK (status IN ('active', 'paused', 'expired', 'archived'))
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'advertisements_status_placement_idx') THEN
    CREATE INDEX advertisements_status_placement_idx
      ON advertisements (status, priority DESC, created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'advertisements_placement_gin_idx') THEN
    CREATE INDEX advertisements_placement_gin_idx ON advertisements USING gin (placement);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- offers — additive guards only (never destructive, works on live + fresh DB).
-- The live database already has organization_id; a fresh migration chain created
-- institution_id, so ensure organization_id exists without dropping anything.
-- ---------------------------------------------------------------------------
ALTER TABLE offers ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE offers ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS description_en TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'offers_org_active_idx') THEN
    CREATE INDEX offers_org_active_idx ON offers (organization_id, active, starts_at, ends_at);
  END IF;
END $$;

COMMIT;
