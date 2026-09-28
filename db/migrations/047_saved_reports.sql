-- Reports & Analytics Center — saved report definitions.
--
-- A saved report stores the *configuration* (report type + period + filters),
-- never a copy of the business data. Re-running a saved report re-queries
-- PostgreSQL, so a saved view can never show stale figures that contradict the
-- live modules. Ownership is per admin user; the Reports Center is admin-only.
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  definition JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_reports_owner_created_idx
  ON saved_reports (owner_user_id, created_at DESC);
