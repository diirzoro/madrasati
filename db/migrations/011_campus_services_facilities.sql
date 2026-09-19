-- 011_campus_services_facilities.sql
-- Organization campuses, services, facilities, capabilities, and junction tables
BEGIN;

-- Campuses
CREATE TABLE IF NOT EXISTS organization_campuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  governorate_id INTEGER REFERENCES locations_governorates(id),
  district_id INTEGER REFERENCES locations_districts(id),
  neighborhood_id INTEGER,
  address TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  map_url TEXT,
  contact_phone TEXT,
  working_hours JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Services
CREATE TABLE IF NOT EXISTS organization_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(14,2),
  currency CHAR(3) DEFAULT 'YER',
  available BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_services_price_check CHECK (price >= 0),
  CONSTRAINT organization_services_type_check CHECK (service_type IN ('transportation','after_school','tutoring','exam_prep','field_trip','uniform','meal','other'))
);

-- Facilities
CREATE TABLE IF NOT EXISTS organization_facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  available BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_facilities_type_check CHECK (facility_type IN ('laboratory','library','sports','security','medical','air_conditioning','internet','accessibility','cafeteria','parking','playground','other'))
);

-- Capabilities
CREATE TABLE IF NOT EXISTS organization_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  capability_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_capabilities_organization_id_capability_key_key UNIQUE (organization_id, capability_key)
);

-- Junction tables for organizations
CREATE TABLE IF NOT EXISTS organization_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES academic_stages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_stages_organization_id_stage_id_key UNIQUE (organization_id, stage_id)
);

CREATE TABLE IF NOT EXISTS organization_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES academic_grades(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_grades_organization_id_grade_id_key UNIQUE (organization_id, grade_id)
);

CREATE TABLE IF NOT EXISTS organization_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_subjects_organization_id_subject_id_key UNIQUE (organization_id, subject_id)
);

CREATE TABLE IF NOT EXISTS organization_languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_languages_organization_id_language_id_key UNIQUE (organization_id, language_id)
);

CREATE TABLE IF NOT EXISTS organization_teaching_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teaching_method_id UUID NOT NULL REFERENCES teaching_methods(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_teaching_methods_organization_id_teaching_meth_key UNIQUE (organization_id, teaching_method_id)
);

CREATE TABLE IF NOT EXISTS organization_curricula (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_curricula_organization_id_curriculum_id_key UNIQUE (organization_id, curriculum_id)
);

COMMIT;
