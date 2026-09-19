-- 012_teachers.sql
-- Teacher profiles, pricing, availability, qualifications, service areas
BEGIN;

-- Teacher profiles
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT,
  bio TEXT,
  gender TEXT,
  years_of_experience INTEGER DEFAULT 0,
  lesson_duration_minutes INTEGER DEFAULT 60,
  offers_online BOOLEAN DEFAULT false NOT NULL,
  travels_to_student_home BOOLEAN DEFAULT false NOT NULL,
  accepts_student_home BOOLEAN DEFAULT false NOT NULL,
  verified BOOLEAN DEFAULT false NOT NULL,
  verification_status TEXT DEFAULT 'pending' NOT NULL,
  profile_status TEXT DEFAULT 'active' NOT NULL,
  rating NUMERIC(3,2) DEFAULT 0,
  reviews INTEGER DEFAULT 0 NOT NULL,
  data_source TEXT DEFAULT 'postgres' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT teacher_profiles_status_check CHECK (profile_status IN ('active','inactive','suspended')),
  CONSTRAINT teacher_profiles_verification_check CHECK (verification_status IN ('pending','verified','rejected')),
  CONSTRAINT teacher_profiles_user_id_key UNIQUE (user_id)
);

-- Teacher pricing
CREATE TABLE IF NOT EXISTS teacher_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  pricing_type TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) DEFAULT 'YER' NOT NULL,
  duration_minutes INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_pricing_amount_check CHECK (amount >= 0),
  CONSTRAINT teacher_pricing_type_check CHECK (pricing_type IN ('individual','group'))
);

-- Teacher availability
CREATE TABLE IF NOT EXISTS teacher_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_mode TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_availability_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT teacher_availability_mode_check CHECK (location_mode IN ('online','student_home','teacher_location'))
);

-- Teacher qualifications
CREATE TABLE IF NOT EXISTS teacher_qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  institution_name TEXT,
  degree TEXT,
  year_obtained INTEGER,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teacher service areas
CREATE TABLE IF NOT EXISTS teacher_service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  governorate_id INTEGER,
  district_id INTEGER,
  neighborhood_id INTEGER,
  radius_km NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teacher subjects
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_subjects_teacher_id_subject_id_key UNIQUE (teacher_id, subject_id)
);

-- Teacher stages
CREATE TABLE IF NOT EXISTS teacher_stages (
  id UUID PRIMARY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES academic_stages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_stages_teacher_id_stage_id_key UNIQUE (teacher_id, stage_id)
);

-- Teacher languages
CREATE TABLE IF NOT EXISTS teacher_languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_languages_teacher_id_language_id_key UNIQUE (teacher_id, language_id)
);

COMMIT;
