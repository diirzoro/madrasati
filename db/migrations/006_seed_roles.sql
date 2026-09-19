-- 006_seed_roles.sql
BEGIN;

INSERT INTO roles (name, description) VALUES
  ('admin','Site administrator') ON CONFLICT (name) DO NOTHING,
  ('owner','Institution owner') ON CONFLICT (name) DO NOTHING,
  ('teacher','Teacher / instructor') ON CONFLICT (name) DO NOTHING,
  ('client','Client / parent / student') ON CONFLICT (name) DO NOTHING;

COMMIT;
