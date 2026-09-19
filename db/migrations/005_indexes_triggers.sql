-- 005_indexes_triggers.sql
BEGIN;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_institutions_location ON institutions(governorate_id, district_id);
CREATE INDEX IF NOT EXISTS idx_lessons_institution ON lessons(institution_id);
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lesson ON bookings(lesson_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_created ON bookings(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_active_institution ON offers(institution_id, active, starts_at, ends_at);

-- Optional: search_vector column and GIN index for institutions
ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE institutions SET search_vector = to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,''));
CREATE INDEX IF NOT EXISTS idx_institutions_search ON institutions USING GIN (search_vector);

-- Trigger function to keep search_vector up-to-date
CREATE OR REPLACE FUNCTION institutions_search_vector_trigger() RETURNS trigger AS $$
begin
  new.search_vector := to_tsvector('simple', coalesce(new.name,'') || ' ' || coalesce(new.description,''));
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_institutions_search_vector BEFORE INSERT OR UPDATE
  ON institutions FOR EACH ROW EXECUTE FUNCTION institutions_search_vector_trigger();

COMMIT;
