-- 042_users_auth_access_control.sql
-- «المستخدمون والصلاحيات» had nothing to control: `roles` held four rows, while
-- `permissions` and `role_permissions` were both empty, so the section could
-- display a role card grid and a user count but could not grant or deny a single
-- thing. This migration gives it a real registry to edit.
--
--   * app_sections — every section and page the platform exposes, split by scope
--     (admin / public / auth), with its Arabic and English labels, its order, its
--     icon, and the two switches that actually control it: `is_visible` (shown in
--     the navigation) and `is_enabled` (the page may load at all). The section
--     screen is CRUD over these rows and the sidebar reads them.
--   * a permission catalog generated from those sections: one module per section
--     and the four actions view/create/update/delete. The `view` action IS "who
--     may see this section or page" — the promise the section already makes in
--     its own description.
--   * default grants per role, matching what each role can already reach in the
--     interface today, so applying this changes no visible behaviour until an
--     admin edits the matrix.
--
-- Additive and re-runnable: IF NOT EXISTS for structure, ON CONFLICT DO NOTHING
-- for every seed, so applying it twice is a no-op.

-- ---------- the sections and pages registry ----------
CREATE TABLE IF NOT EXISTS app_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_key TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL DEFAULT 'admin',
  route TEXT,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon TEXT,
  parent_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  requires_role TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_sections_scope_check CHECK (scope IN ('admin','public','auth')),
  CONSTRAINT app_sections_sort_order_check CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS app_sections_scope_sort_idx ON app_sections (scope, sort_order);
CREATE INDEX IF NOT EXISTS app_sections_visible_idx ON app_sections (is_visible, is_enabled);

COMMENT ON TABLE app_sections IS
  'Section and page registry edited by «المستخدمون والصلاحيات». is_visible drives the navigation entry; is_enabled decides whether the page may load.';
COMMENT ON COLUMN app_sections.is_system IS
  'A system row is part of the frozen navigation and cannot be deleted — only hidden or disabled.';

-- ---------- seed the admin sidebar: the frozen 13, in their frozen order ----------
INSERT INTO app_sections
  (section_key, scope, route, title_ar, title_en, icon, sort_order, requires_role, is_system)
VALUES
  ('admin',        'admin', 'admin',        'الرئيسية',                 'Home',                       'home',     10,  'admin', TRUE),
  ('schools',      'admin', 'schools',      'إدارة المؤسسات الدراسية',  'Institutions Management',    'school',   20,  'admin', TRUE),
  ('teachersAdmin','admin', 'teachersAdmin','المعلمون',                 'Teachers',                   'teacher',  30,  'admin', TRUE),
  ('students',     'admin', 'students',     'العملاء',                  'Clients',                    'users',    40,  'admin', TRUE),
  ('bookings',     'admin', 'bookings',     'الحجوزات',                 'Bookings',                   'calendar', 50,  'admin', TRUE),
  ('verify',       'admin', 'verify',       'التحقق والمراجعة',          'Verification & Review',      'shield',   60,  'admin', TRUE),
  ('academic',     'admin', 'academic',     'البيانات الأكاديمية',      'Academic Data',              'college',  70,  'admin', TRUE),
  ('locations',    'admin', 'locations',    'المناطق',                  'Locations',                  'school',   80,  'admin', TRUE),
  ('offers',       'admin', 'offers',       'العروض',                   'Offers',                     'chart',    90,  'admin', TRUE),
  ('ads',          'admin', 'ads',          'الإعلانات',                'Advertisements',             'chart',   100,  'admin', TRUE),
  ('reports',      'admin', 'reports',      'التقارير والتحليلات',      'Reports & Analytics',        'chart',   110,  'admin', TRUE),
  ('access',       'admin', 'access',       'المستخدمون والصلاحيات',    'Users & Permissions',        'shield',  120,  'admin', TRUE),
  ('settings',     'admin', 'settings',     'الإعدادات',                'Settings',                   'settings',130,  'admin', TRUE)
ON CONFLICT (section_key) DO NOTHING;

-- ---------- seed the public and auth pages ----------
INSERT INTO app_sections
  (section_key, scope, route, title_ar, title_en, icon, sort_order, requires_role, is_system)
VALUES
  ('home',       'public', 'home',       'الرئيسية',              'Home',                'home',    10, NULL, TRUE),
  ('private',    'public', 'private',    'المدارس الأهلية',       'Private Schools',      'school',  20, NULL, TRUE),
  ('government', 'public', 'government', 'المدارس الحكومية',      'Government Schools',   'school',  30, NULL, TRUE),
  ('colleges',   'public', 'colleges',   'الكليات',               'Colleges',             'college', 40, NULL, TRUE),
  ('institutes', 'public', 'institutes', 'المعاهد',               'Institutes',           'college', 50, NULL, TRUE),
  ('teachers',   'public', 'teachers',   'المعلمون',              'Teachers',             'teacher', 60, NULL, TRUE),
  ('register',   'public', 'register',   'إنشاء حساب',            'Create Account',       'users',   70, NULL, TRUE),
  ('login',      'auth',   'login',      'تسجيل الدخول',          'Sign In',              'users',   10, NULL, TRUE)
ON CONFLICT (section_key) DO NOTHING;

-- ---------- the permission catalog: every section × the four CRUD actions ----------
-- One module per section key, so a permission row always names a real section, and
-- `view` is the "may see this section or page" switch the section promises.
INSERT INTO permissions (module, action, description)
SELECT s.section_key,
       a.action,
       s.title_en || ' — ' || a.action
FROM app_sections s
CROSS JOIN (VALUES ('view'), ('create'), ('update'), ('delete')) AS a(action)
ON CONFLICT (module, action) DO NOTHING;

-- ---------- default grants ----------
-- admin sees and does everything: it is the platform administrator.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- An institution owner reaches the same sidebar entries the interface already
-- gives it (admin, schools, teachersAdmin, bookings, academic, locations,
-- reports, settings) and owns the content of its own institution. It is kept out
-- of access, verify, offers and ads, exactly as before this migration.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.name = 'owner'
  AND (
    (p.action = 'view' AND p.module = ANY (ARRAY['admin','schools','teachersAdmin','bookings','academic','locations','reports','settings']))
    OR
    (p.action <> 'view' AND p.module = ANY (ARRAY['schools','teachersAdmin','students','bookings','academic','reports']))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- A teacher reaches the home page and the bookings, and maintains their own
-- teacher record — again the same set the sidebar already shows.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.name = 'teacher'
  AND (
    (p.action = 'view' AND p.module = ANY (ARRAY['admin','bookings','teachersAdmin','students']))
    OR
    (p.action IN ('create','update') AND p.module = ANY (ARRAY['bookings','teachersAdmin']))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- A client has no admin section at all; what they may see are the public pages,
-- which stay open exactly as they are now.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
JOIN app_sections s ON s.section_key = p.module
WHERE r.name = 'client'
  AND p.action = 'view'
  AND s.scope = 'public'
ON CONFLICT (role_id, permission_id) DO NOTHING;
