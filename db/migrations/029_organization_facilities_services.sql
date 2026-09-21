-- 029_organization_facilities_services.sql
-- OWNING MODULE: organizations
--
-- Facilities and shared services for the seeded Yemeni institutions, so the
-- "shared core" section of the institution detail screen has real content
-- instead of five empty panels.
--
-- The catalogue is keyed by institution TYPE rather than by individual
-- organization: what a government school offers is a property of being a
-- government school, and the same list then covers all 40 rows. Each child row
-- resolves its parent by type and derives a deterministic id from the slug, so
-- re-running this migration inserts nothing. This is a deliberate equi-join on
-- type, not a cross join.
--
-- Arabic names are the ones shown in the UI; the English name is kept for the
-- English locale.

-- ---------- facilities ----------
INSERT INTO organization_facilities (id, organization_id, facility_type, name, description, quantity, available, sort_order)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'madrasati:facility:' || o.slug || ':' || v.facility_type),
  o.id, v.facility_type, v.name_ar, v.name_en, v.quantity, true, v.sort_order
FROM (VALUES
  -- every institution
  ('*',               'internet',         'إنترنت',            'Internet access',          1,  10),
  ('*',               'library',          'مكتبة',             'Library',                  1,  20),
  ('*',               'security',         'أمن وحراسة',        'Security',                 2,  30),
  -- schools
  ('private_school',    'playground',      'ساحة ألعاب',        'Playground',               2,  40),
  ('private_school',    'sports',          'صالة رياضية',       'Sports hall',              1,  50),
  ('private_school',    'cafeteria',       'مقصف',              'Cafeteria',                1,  60),
  ('private_school',    'medical',         'عيادة طبية',        'Medical clinic',           1,  70),
  ('private_school',    'parking',         'مواقف سيارات',      'Parking',                  1, 110),
  ('government_school', 'playground',      'ساحة ألعاب',        'Playground',               1,  40),
  ('government_school', 'sports',          'ملعب رياضي',        'Sports field',             1,  50),
  ('government_school', 'cafeteria',       'مقصف',              'Cafeteria',                1,  60),
  -- institutes
  ('institute',         'laboratory',      'معمل تخصصي',        'Specialist laboratory',    2,  40),
  ('institute',         'air_conditioning', 'تكييف',            'Air conditioning',         1,  80),
  -- colleges and universities
  ('college',           'laboratory',      'معمل علمي',         'Science laboratory',       4,  40),
  ('college',           'sports',          'صالة رياضية',       'Sports hall',              1,  50),
  ('college',           'cafeteria',       'مقصف',              'Cafeteria',                2,  60),
  ('college',           'medical',         'عيادة طبية',        'Medical clinic',           1,  70),
  ('college',           'parking',         'مواقف سيارات',      'Parking',                  2, 110),
  ('university',        'laboratory',      'معمل علمي',         'Science laboratory',       8,  40),
  ('university',        'sports',          'صالة رياضية',       'Sports hall',              2,  50),
  ('university',        'cafeteria',       'مقصف',              'Cafeteria',                3,  60),
  ('university',        'medical',         'عيادة طبية',        'Medical clinic',           1,  70),
  ('university',        'parking',         'مواقف سيارات',      'Parking',                  4, 110),
  ('university',        'air_conditioning', 'تكييف',            'Air conditioning',         1,  80)
) AS v(org_type, facility_type, name_ar, name_en, quantity, sort_order)
JOIN organizations o
  ON (v.org_type = '*' OR o.type = v.org_type)
WHERE o.slug IS NOT NULL AND o.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- ---------- shared services ----------
INSERT INTO organization_services (id, organization_id, service_type, name, description, price, currency, available, sort_order)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'madrasati:service:' || o.slug || ':' || v.service_type),
  o.id, v.service_type, v.name_ar, v.name_en, v.price, 'YER', v.available, v.sort_order
FROM (VALUES
  -- private schools: the full paid package
  ('private_school',    'transportation', 'النقل المدرسي',           'School transport',        25000, true,  10),
  ('private_school',    'uniform',        'الزي المدرسي',            'School uniform',          12000, true,  20),
  ('private_school',    'meal',           'وجبات غذائية',            'Meals',                   18000, true,  30),
  ('private_school',    'after_school',   'أنشطة بعد الدوام',        'After-school activities', 15000, true,  40),
  ('private_school',    'tutoring',       'دروس تقوية',              'Tutoring',                20000, true,  50),
  -- government schools: only what is offered free or at cost
  ('government_school', 'uniform',        'الزي المدرسي',            'School uniform',           8000, true,  10),
  ('government_school', 'meal',           'وجبات غذائية',            'Meals',                    6000, true,  20),
  ('government_school', 'after_school',   'أنشطة مدرسية',            'School activities',            0, true,  30),
  -- institutes
  ('institute',         'tutoring',       'دروس تقوية عملية',        'Practical tutoring',      10000, true,  10),
  ('institute',         'exam_prep',      'دورات تحضير للاختبارات',  'Exam preparation',        15000, true,  20),
  ('institute',         'field_trip',     'زيارات ميدانية',          'Field trips',                  0, true,  30),
  -- colleges and universities
  ('college',           'tutoring',       'دروس تقوية',              'Tutoring',                12000, true,  10),
  ('college',           'exam_prep',      'دورات تحضير للاختبارات',  'Exam preparation',        18000, true,  20),
  ('college',           'field_trip',     'زيارات ميدانية',          'Field trips',                  0, true,  30),
  ('college',           'transportation', 'النقل الجامعي',           'Campus transport',        22000, true,  40),
  ('university',        'exam_prep',      'دورات تحضير للاختبارات',  'Exam preparation',        20000, true,  10),
  ('university',        'field_trip',     'زيارات ميدانية',          'Field trips',                  0, true,  20),
  ('university',        'transportation', 'النقل الجامعي',           'Campus transport',        26000, true,  30),
  ('university',        'tutoring',       'دروس تقوية',              'Tutoring',                14000, false, 40)
) AS v(org_type, service_type, name_ar, name_en, price, available, sort_order)
JOIN organizations o ON o.type = v.org_type
WHERE o.slug IS NOT NULL AND o.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;
