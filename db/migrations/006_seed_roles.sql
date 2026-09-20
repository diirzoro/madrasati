-- 006_seed_roles.sql
BEGIN;

INSERT INTO roles (name, description) VALUES
  ('admin','Site administrator'),
  ('owner','Institution owner'),
  ('teacher','Teacher / instructor'),
  ('client','Client / parent / student')
ON CONFLICT (name) DO NOTHING;

COMMIT;
