-- 016_fees.sql
-- Organization fees with NUMERIC(14,2) canonical money model
BEGIN;

-- Organization fees
CREATE TABLE IF NOT EXISTS organization_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) DEFAULT 'YER' NOT NULL,
  frequency TEXT,
  stage_id UUID,
  grade_id UUID,
  active BOOLEAN DEFAULT true NOT NULL,
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  visibility TEXT DEFAULT 'authenticated' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT organization_fees_amount_check CHECK (amount >= 0),
  CONSTRAINT organization_fees_frequency_check CHECK (frequency IN ('once','monthly','term','yearly')),
  CONSTRAINT organization_fees_type_check CHECK (fee_type IN ('tuition','registration','exam','transport','meal','uniform','activity','lab','library','technology','late_fee','other')),
  CONSTRAINT organization_fees_visibility_check CHECK (visibility IN ('public','authenticated','owner_only'))
);

COMMIT;
