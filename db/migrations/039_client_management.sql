-- Client CRM data is separate from authentication and academic enrolment.
CREATE TABLE IF NOT EXISTS client_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  client_kind TEXT NOT NULL DEFAULT 'unspecified'
    CHECK (client_kind IN ('unspecified', 'student', 'parent', 'both', 'other')),
  interests TEXT NOT NULL DEFAULT '',
  preferred_locations TEXT NOT NULL DEFAULT '',
  contact_preference TEXT NOT NULL DEFAULT 'none'
    CHECK (contact_preference IN ('none', 'phone', 'email', 'whatsapp')),
  admin_notes TEXT NOT NULL DEFAULT '',
  analytics_consent BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('suggestion', 'complaint', 'inquiry')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_feedback_user_created_idx
  ON client_feedback(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS client_activity_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'search')),
  section TEXT NOT NULL,
  search_term TEXT,
  location_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_activity_user_created_idx
  ON client_activity_events(user_id, created_at DESC);
