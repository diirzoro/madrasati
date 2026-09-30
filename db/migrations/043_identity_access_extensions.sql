-- Additive identity controls. The four login roles and existing RBAC tables stay intact.
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('grant', 'deny')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate indexes keep one global override and one override per institution.
CREATE UNIQUE INDEX IF NOT EXISTS user_permission_overrides_global_uq
  ON user_permission_overrides (user_id, permission_id)
  WHERE organization_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_permission_overrides_org_uq
  ON user_permission_overrides (user_id, permission_id, organization_id)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_permission_overrides_user_idx
  ON user_permission_overrides (user_id);

CREATE INDEX IF NOT EXISTS organization_memberships_user_idx
  ON organization_memberships (user_id, organization_id);
