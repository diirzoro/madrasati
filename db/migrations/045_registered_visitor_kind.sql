-- A registered client may explicitly declare that they are exploring as a
-- visitor. This does not create an account for an anonymous site visitor.
ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_client_kind_check;
ALTER TABLE client_profiles ADD CONSTRAINT client_profiles_client_kind_check
  CHECK (client_kind IN ('unspecified', 'visitor', 'student', 'parent', 'both', 'other'));
