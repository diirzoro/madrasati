-- 024_architectural_decision_markers.sql
-- Records the approved architectural decisions where developers actually look
-- for them: on the objects themselves. Comments only, no schema or data change,
-- so nothing can break and no row is touched.
--
-- Decisions recorded:
--   * curricula is a classification catalog, not a parallel subject system.
--   * the JSONB academic fields on organizations are a transitional cache.
BEGIN;

COMMENT ON TABLE curricula IS
  'Curriculum classification catalog (e.g. وزاري / أهلي / دولي). This is a '
  'classification attached to a subject and a stage — it is NOT a parallel '
  'subject system. Subjects remain the only academic foundation.';

COMMENT ON TABLE organization_curricula IS
  'Organization-side selection of curriculum classifications. It complements '
  'organization_subjects; it does not replace or duplicate it.';

COMMENT ON TABLE subjects IS
  'The single academic foundation. Every academic offering resolves to a '
  'subject; do not introduce a competing catalog.';

-- The organizations JSONB fields predate the normalized tables and are kept
-- only so existing readers keep working while the frontend migrates.
DO $$
DECLARE
  col TEXT;
  normalized TEXT[] := ARRAY['subjects','stages','grades','languages',
                             'teaching_methods','fees','fee_details',
                             'curriculum','stage_availability'];
BEGIN
  FOREACH col IN ARRAY normalized LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organizations' AND column_name = col
    ) THEN
      EXECUTE format(
        'COMMENT ON COLUMN organizations.%I IS %L',
        col,
        'TRANSITIONAL CACHE. The normalized tables are the source of truth; '
        'this JSONB field exists only for readers that have not migrated yet. '
        'Do not write new logic against it.'
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
