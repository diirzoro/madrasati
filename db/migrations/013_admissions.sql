-- 013_admissions.sql
-- Admission applications, requirements, and status history
BEGIN;

-- Admission applications
CREATE TABLE IF NOT EXISTS admission_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  applicant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT,
  applicant_email TEXT,
  stage_id UUID,
  grade_id UUID,
  program_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID,
  decision_reason TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT admission_applications_status_check CHECK (
    status IN ('draft','submitted','under_review','more_information_required',
               'assessment_interview','waiting_list','offered','accepted',
               'rejected','withdrawn','enrolled')
  )
);

-- Admission requirements
CREATE TABLE IF NOT EXISTS admission_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stage_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admission status history
CREATE TABLE IF NOT EXISTS admission_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by_user_id UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

COMMIT;
