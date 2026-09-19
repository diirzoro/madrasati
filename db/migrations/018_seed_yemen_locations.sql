-- 018_seed_yemen_locations.sql
-- DATA-ONLY seed: Yemen location reference hierarchy
-- (governorate -> district -> neighborhood) for the V4 search cascade.
-- No structural/schema changes. Idempotent via ON CONFLICT DO NOTHING.
-- Approved: SEARCH section task (2026-09-16).
BEGIN;

-- ---------- governorates (22) ----------
INSERT INTO locations_governorates (name, code, country_id, latitude, longitude, sort_order, is_active)
VALUES
  ('أمانة العاصمة', 'AMC', (SELECT id FROM locations_countries WHERE code = 'YE'), 15.3694, 44.1910, 1, true),
  ('صنعاء', 'SNA', (SELECT id FROM locations_countries WHERE code = 'YE'), 15.3694, 44.1910, 2, true),
  ('عدن', 'ADN', (SELECT id FROM locations_countries WHERE code = 'YE'), 12.7855, 45.0187, 3, true),
  ('تعز', 'TAZ', (SELECT id FROM locations_countries WHERE code = 'YE'), 13.5795, 44.0209, 4, true),
  ('الحديدة', 'HUD', (SELECT id FROM locations_countries WHERE code = 'YE'), 14.7979, 42.9545, 5, true),
  ('إب', 'IBB', (SELECT id FROM locations_countries WHERE code = 'YE'), 13.9667, 44.1833, 6, true),
  ('ذمار', 'DHM', (SELECT id FROM locations_countries WHERE code = 'YE'), 14.5500, 44.4000, 7, true),
  ('حضرموت', 'HAD', (SELECT id FROM locations_countries WHERE code = 'YE'), 14.5300, 49.1200, 8, true),
  ('حجة', 'HAJ', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 9, true),
  ('صعدة', 'SAD', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 10, true),
  ('عمران', 'AMN', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 11, true),
  ('المحويت', 'MHW', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 12, true),
  ('ريمة', 'RYM', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 13, true),
  ('البيضاء', 'BAY', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 14, true),
  ('مأرب', 'MRB', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 15, true),
  ('الجوف', 'JWF', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 16, true),
  ('شبوة', 'SHW', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 17, true),
  ('أبين', 'ABN', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 18, true),
  ('لحج', 'LHJ', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 19, true),
  ('الضالع', 'DLA', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 20, true),
  ('المهرة', 'MHR', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 21, true),
  ('سقطرى', 'SQT', (SELECT id FROM locations_countries WHERE code = 'YE'), NULL, NULL, 22, true)
ON CONFLICT (name) DO NOTHING;

-- ---------- districts ----------
-- أمانة العاصمة
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'AMC'), 'السبعين', 'AMC-SAB', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'AMC'), 'معين', 'AMC-MIN', 2, true),
  ((SELECT id FROM locations_governorates WHERE code = 'AMC'), 'شعوب', 'AMC-SHB', 3, true),
  ((SELECT id FROM locations_governorates WHERE code = 'AMC'), 'آزال', 'AMC-AZL', 4, true),
  ((SELECT id FROM locations_governorates WHERE code = 'AMC'), 'الصافية', 'AMC-SAF', 5, true),
  ((SELECT id FROM locations_governorates WHERE code = 'AMC'), 'الوحدة', 'AMC-WHD', 6, true),
  ((SELECT id FROM locations_governorates WHERE code = 'AMC'), 'التحرير', 'AMC-THR', 7, true),
  ((SELECT id FROM locations_governorates WHERE code = 'AMC'), 'صنعاء القديمة', 'AMC-QAD', 8, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- صنعاء (محافظة)
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'SNA'), 'بني حشيش', 'SNA-BHS', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'SNA'), 'همدان', 'SNA-HMD', 2, true),
  ((SELECT id FROM locations_governorates WHERE code = 'SNA'), 'أرحب', 'SNA-ARH', 3, true),
  ((SELECT id FROM locations_governorates WHERE code = 'SNA'), 'سنحان', 'SNA-SNH', 4, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- عدن
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'ADN'), 'صيرة', 'ADN-SIR', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'ADN'), 'المعلا', 'ADN-MAL', 2, true),
  ((SELECT id FROM locations_governorates WHERE code = 'ADN'), 'التواهي', 'ADN-TAW', 3, true),
  ((SELECT id FROM locations_governorates WHERE code = 'ADN'), 'خور مكسر', 'ADN-KHR', 4, true),
  ((SELECT id FROM locations_governorates WHERE code = 'ADN'), 'الشيخ عثمان', 'ADN-SHK', 5, true),
  ((SELECT id FROM locations_governorates WHERE code = 'ADN'), 'المنصورة', 'ADN-MNS', 6, true),
  ((SELECT id FROM locations_governorates WHERE code = 'ADN'), 'دار سعد', 'ADN-DAR', 7, true),
  ((SELECT id FROM locations_governorates WHERE code = 'ADN'), 'البريقة', 'ADN-BUR', 8, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- تعز
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'TAZ'), 'المظفر', 'TAZ-MZF', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'TAZ'), 'القاهرة', 'TAZ-QAH', 2, true),
  ((SELECT id FROM locations_governorates WHERE code = 'TAZ'), 'صالة', 'TAZ-SAL', 3, true),
  ((SELECT id FROM locations_governorates WHERE code = 'TAZ'), 'التعزية', 'TAZ-TAZ', 4, true),
  ((SELECT id FROM locations_governorates WHERE code = 'TAZ'), 'شرعب السلام', 'TAZ-SHR', 5, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- الحديدة
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'HUD'), 'الحوك', 'HUD-HAW', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'HUD'), 'الميناء', 'HUD-MIN', 2, true),
  ((SELECT id FROM locations_governorates WHERE code = 'HUD'), 'الحالي', 'HUD-HAL', 3, true),
  ((SELECT id FROM locations_governorates WHERE code = 'HUD'), 'الزيدية', 'HUD-ZAY', 4, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- إب
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'IBB'), 'المشنة', 'IBB-MSH', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'IBB'), 'الظهار', 'IBB-DHR', 2, true),
  ((SELECT id FROM locations_governorates WHERE code = 'IBB'), 'جبلة', 'IBB-JIB', 3, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- ذمار
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'DHM'), 'مدينة ذمار', 'DHM-MAD', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'DHM'), 'عنس', 'DHM-ANS', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- حضرموت
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'HAD'), 'المكلا', 'HAD-MUK', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'HAD'), 'سيئون', 'HAD-SAY', 2, true),
  ((SELECT id FROM locations_governorates WHERE code = 'HAD'), 'الشحر', 'HAD-SHI', 3, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- حجة
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'HAJ'), 'مدينة حجة', 'HAJ-MAD', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'HAJ'), 'عبس', 'HAJ-ABS', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- صعدة
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'SAD'), 'صعدة المدينة', 'SAD-MAD', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'SAD'), 'سحار', 'SAD-SAH', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- عمران
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'AMN'), 'مدينة عمران', 'AMN-MAD', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'AMN'), 'عيال سريح', 'AMN-SUR', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- المحويت
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'MHW'), 'مدينة المحويت', 'MHW-MAD', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'MHW'), 'الرجم', 'MHW-RAJ', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- ريمة
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'RYM'), 'الجبين', 'RYM-JAB', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'RYM'), 'كسمة', 'RYM-KUS', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- البيضاء
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'BAY'), 'مدينة البيضاء', 'BAY-MAD', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'BAY'), 'رداع', 'BAY-RAD', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- مأرب
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'MRB'), 'مدينة مأرب', 'MRB-MAD', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'MRB'), 'صرواح', 'MRB-SAR', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- الجوف
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'JWF'), 'الحزم', 'JWF-HAZ', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'JWF'), 'برط', 'JWF-BAR', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- شبوة
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'SHW'), 'عتق', 'SHW-ATA', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'SHW'), 'بيحان', 'SHW-BHN', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- أبين
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'ABN'), 'زنجبار', 'ABN-ZAN', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'ABN'), 'خنفر', 'ABN-KHN', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- لحج
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'LHJ'), 'الحوطة', 'LHJ-HUT', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'LHJ'), 'تبن', 'LHJ-TUB', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- الضالع
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'DLA'), 'مدينة الضالع', 'DLA-MAD', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'DLA'), 'قعطبة', 'DLA-QAT', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- المهرة
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'MHR'), 'الغيضة', 'MHR-GHA', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'MHR'), 'سيحوت', 'MHR-SIH', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- سقطرى
INSERT INTO locations_districts (governorate_id, name, code, sort_order, is_active) VALUES
  ((SELECT id FROM locations_governorates WHERE code = 'SQT'), 'حديبو', 'SQT-HDB', 1, true),
  ((SELECT id FROM locations_governorates WHERE code = 'SQT'), 'قلنسية', 'SQT-QLN', 2, true)
ON CONFLICT (governorate_id, name) DO NOTHING;

-- ---------- neighborhoods (QA + cascade coverage) ----------
INSERT INTO locations_neighborhoods (district_id, name, code, sort_order, is_active) VALUES
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'AMC' AND d.name = 'السبعين'), 'حدة', 'AMC-SAB-HAD', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'AMC' AND d.name = 'السبعين'), 'بيت بوس', 'AMC-SAB-BAY', 2, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'AMC' AND d.name = 'السبعين'), 'عطان', 'AMC-SAB-ATA', 3, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'AMC' AND d.name = 'معين'), 'مذبح', 'AMC-MIN-MAD', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'AMC' AND d.name = 'معين'), 'السنينة', 'AMC-MIN-SIN', 2, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'AMC' AND d.name = 'شعوب'), 'سعوان', 'AMC-SHB-SAW', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'AMC' AND d.name = 'شعوب'), 'الحتارش', 'AMC-SHB-HAT', 2, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'ADN' AND d.name = 'صيرة'), 'الطويلة', 'ADN-SIR-TAW', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'ADN' AND d.name = 'صيرة'), 'العيدروس', 'ADN-SIR-AYD', 2, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'ADN' AND d.name = 'المعلا'), 'الدكة', 'ADN-MAL-DAK', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'ADN' AND d.name = 'التواهي'), 'القلوعة', 'ADN-TAW-QAL', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'ADN' AND d.name = 'خور مكسر'), 'العريش', 'ADN-KHR-ARA', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'ADN' AND d.name = 'الشيخ عثمان'), 'الممدارة', 'ADN-SHK-MAM', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'ADN' AND d.name = 'الشيخ عثمان'), 'عمر المختار', 'ADN-SHK-OMR', 2, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'TAZ' AND d.name = 'المظفر'), 'عصيفرة', 'TAZ-MZF-USA', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'TAZ' AND d.name = 'المظفر'), 'كلابة', 'TAZ-MZF-KAL', 2, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'TAZ' AND d.name = 'القاهرة'), 'بير باشا', 'TAZ-QAH-BIR', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'TAZ' AND d.name = 'القاهرة'), 'الضباب', 'TAZ-QAH-DAB', 2, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'TAZ' AND d.name = 'صالة'), 'الحصب', 'TAZ-SAL-HAS', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'HUD' AND d.name = 'الحوك'), 'الكورنيش', 'HUD-HAW-KOR', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'HUD' AND d.name = 'الحوك'), 'غليل', 'HUD-HAW-GHA', 2, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'IBB' AND d.name = 'المشنة'), 'السبل', 'IBB-MSH-SAB', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'IBB' AND d.name = 'المشنة'), 'الميدان', 'IBB-MSH-MAY', 2, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'HAD' AND d.name = 'المكلا'), 'فوة', 'HAD-MUK-FAW', 1, true),
  ((SELECT d.id FROM locations_districts d JOIN locations_governorates g ON g.id = d.governorate_id WHERE g.code = 'HAD' AND d.name = 'المكلا'), 'الشرج', 'HAD-MUK-SHA', 2, true)
ON CONFLICT (district_id, name) DO NOTHING;

COMMIT;
