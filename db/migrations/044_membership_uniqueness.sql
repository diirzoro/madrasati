-- One user has one membership row per institution. Do not silently discard
-- duplicates: an environment with old duplicate rows must reconcile them first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM organization_memberships
             GROUP BY user_id, organization_id HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate organization memberships need manual reconciliation';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS organization_memberships_user_org_uq
  ON organization_memberships (user_id, organization_id);
