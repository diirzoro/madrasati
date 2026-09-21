-- 025_global_academic_catalogs.sql
-- OWNING MODULE: academic
--
-- Global (platform-level) academic catalogs. These are shared reference data,
-- not tenant data: every institution selects FROM them, so they carry no
-- organization_id and are readable without authentication through
-- /api/academic/public/*.
--
-- Grade ladder follows the Yemeni ladder modelled by the product:
--   رياض أطفال (تمهيدي أول/ثاني) -> أساسي (1-6) -> إعدادي (7-9) -> ثانوي (10-12)
-- The secondary stage carries the علمي/أدبي branching in its description: the
-- branch is a property of the enrolment, not a separate grade row, so grades
-- stay a single 1..12 ladder.
--
-- Idempotent: safe to re-run on an existing database.

-- ---------- stages ----------
INSERT INTO academic_stages (code, name, description, sort_order, is_active) VALUES
  ('KG',        'رياض أطفال',   'مرحلة ما قبل المدرسة: تمهيدي أول وتمهيدي ثاني.', 1, true),
  ('PRIMARY',   'أساسي - ابتدائي', 'الصفوف من الأول أساسي إلى السادس أساسي.',        2, true),
  ('PREP',      'إعدادي',       'الصفوف من الأول إعدادي إلى الثالث إعدادي.',       3, true),
  ('SECONDARY', 'ثانوي',        'الصفوف من الأول ثانوي إلى الثالث ثانوي (علمي / أدبي).', 4, true)
ON CONFLICT (name) DO NOTHING;

-- ---------- grades (1st primary .. 3rd secondary, plus kindergarten) ----------
INSERT INTO academic_grades (stage_id, code, name, sort_order, is_active)
SELECT s.id, v.code, v.name, v.sort_order, true
FROM (VALUES
  ('KG',        'KG1',  'تمهيدي أول',         1),
  ('KG',        'KG2',  'تمهيدي ثاني',        2),
  ('PRIMARY',   'G1',   'الأول أساسي',       10),
  ('PRIMARY',   'G2',   'الثاني أساسي',      20),
  ('PRIMARY',   'G3',   'الثالث أساسي',      30),
  ('PRIMARY',   'G4',   'الرابع أساسي',      40),
  ('PRIMARY',   'G5',   'الخامس أساسي',      50),
  ('PRIMARY',   'G6',   'السادس أساسي',      60),
  ('PREP',      'G7',   'الأول إعدادي',      70),
  ('PREP',      'G8',   'الثاني إعدادي',     80),
  ('PREP',      'G9',   'الثالث إعدادي',     90),
  ('SECONDARY', 'G10',  'الأول ثانوي',      100),
  ('SECONDARY', 'G11',  'الثاني ثانوي',     110),
  ('SECONDARY', 'G12',  'الثالث ثانوي',     120)
) AS v(stage_code, code, name, sort_order)
JOIN academic_stages s ON s.code = v.stage_code
ON CONFLICT (stage_id, name) DO NOTHING;

-- ---------- subjects (the single foundation of the academic model) ----------
INSERT INTO subjects (name, slug, description) VALUES
  ('القرآن الكريم',      'quran',              'حفظ وتلاوة وتجويد القرآن الكريم.'),
  ('التربية الإسلامية',  'islamic-education',  'العقيدة والفقه والسيرة والسلوك.'),
  ('اللغة العربية',      'arabic',             'قراءة وقواعد وإملاء وتعبير ونصوص.'),
  ('الرياضيات',          'math',               'حساب وهندسة وجبر وتحليل.'),
  ('العلوم',             'science',            'العلوم المتكاملة للمرحلة الأساسية.'),
  ('الفيزياء',           'physics',            'الفيزياء للمرحلتين الإعدادية والثانوية.'),
  ('الكيمياء',           'chemistry',          'الكيمياء للمرحلتين الإعدادية والثانوية.'),
  ('الأحياء',            'biology',            'الأحياء للمرحلتين الإعدادية والثانوية.'),
  ('اللغة الإنجليزية',   'english',            'مهارات اللغة الإنجليزية الأربع.'),
  ('الحاسوب',            'computer',           'أساسيات الحاسوب والمهارات الرقمية.')
ON CONFLICT (slug) DO NOTHING;

-- ---------- curricula (classification, not a parallel system) ----------
INSERT INTO curricula (code, name, description, is_active) VALUES
  ('WAZARI', 'وزاري', 'المنهج الحكومي الرسمي المعتمد من وزارة التربية والتعليم.', true),
  ('AHLI',   'أهلي',  'منهج خاص بالمدارس الأهلية مرخّص من الوزارة.',              true),
  ('DOWALI', 'دولي',  'منهج دولي (IGCSE / IB أو ما يعادلهما).',                   true)
ON CONFLICT (name) DO NOTHING;

-- ---------- teaching languages ----------
INSERT INTO languages (code, name, is_active) VALUES
  ('AR', 'العربية',        true),
  ('EN', 'الإنجليزية',     true),
  ('FR', 'الفرنسية',       true)
ON CONFLICT (name) DO NOTHING;

-- ---------- teaching methods ----------
INSERT INTO teaching_methods (code, name, description, is_active) VALUES
  ('TRAD',       'التلقين المباشر',   'شرح مباشر من المعلم مع تدوين الطلاب.',            true),
  ('ACTIVE',     'التعلم النشط',      'أنشطة ومشاركة صفية ومجموعات عمل.',                true),
  ('MONTESSORI', 'مونتيسوري',         'تعلم ذاتي موجّه بالوسائل الحسية.',                true),
  ('ONLINE',     'التعليم عن بُعد',   'دروس متزامنة عبر الإنترنت.',                     true),
  ('HYBRID',     'التعليم المدمج',    'دمج الحضور المباشر مع الدروس الرقمية.',          true)
ON CONFLICT (name) DO NOTHING;
