-- 002_create_roles_users_locations.sql
BEGIN;

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role_id INTEGER REFERENCES roles(id) NOT NULL,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE users
  ADD CONSTRAINT users_status_check CHECK (status IN ('active','suspended','pending','deleted'));

-- Locations
CREATE TABLE IF NOT EXISTS locations_governorates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS locations_districts (
  id SERIAL PRIMARY KEY,
  governorate_id INTEGER NOT NULL REFERENCES locations_governorates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (governorate_id, name)
);

COMMIT;
