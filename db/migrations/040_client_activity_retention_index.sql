-- Supports removing expired client activity without scanning all events.
CREATE INDEX IF NOT EXISTS client_activity_created_idx
  ON client_activity_events(created_at);
