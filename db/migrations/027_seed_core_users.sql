-- 027_seed_core_users.sql
-- OWNING MODULE: identity
--
-- Seeds the two accounts every environment needs so the application is usable
-- straight after `npm run db:migrate`:
--
--   admin@madrasati.test  / Admin@12345  -> platform administrator
--   user@madrasati.test   / User@12345   -> ordinary client account
--
-- Development bootstrap credentials. The migration never overwrites an account
-- that already exists (ON CONFLICT DO NOTHING) -- resetting a live administrator
-- password is not a migration's job. Rotate these before exposing any
-- environment publicly.
--
-- password_hash values are bcrypt (cost 10), the same cost factor the register
-- flow in modules/identity/service.js uses, so login verification matches.
--
-- Idempotent: safe to re-run.

INSERT INTO users (name, email, phone, role_id, password_hash, status)
SELECT v.name, v.email, v.phone, r.id, v.password_hash, 'active'
FROM (VALUES
  ('مدير النظام', 'admin@madrasati.test', '+967711000001', 'admin', '$2b$10$cLeG57w02NI5hjKcNfu/dujkaZe.83c5ob9WpqC9S2tXy8p.9shFO'),
  ('مستخدم تجريبي', 'user@madrasati.test', '+967711000002', 'client', '$2b$10$l/..N1AaawTouo8aKGe1IO1wLeG24uVGG2uyiznRdlEqkLeffmb96')
) AS v(name, email, phone, role_name, password_hash)
JOIN roles r ON r.name = v.role_name
ON CONFLICT (email) DO NOTHING;
