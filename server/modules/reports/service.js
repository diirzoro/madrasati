// modules/reports/service.js
// OWNING MODULE: reports
// The normalization layer. Every report — overview, institutions, teachers,
// users, admissions, offers, advertisements, ad performance, academic,
// geography, activity — is delivered to the UI, PDF, Word and Excel as ONE
// shape:
//
//   { id, category, title, subtitle, period, generatedAt, scope,
//     kpis[], charts[], tables[], notes[] }
//
// Building the shape once means the screen and every export read the same
// numbers; there is no second calculation for the .xlsx that can drift from the
// preview. Labels are bilingual {ar,en} so RTL and LTR share one payload.

const repo = require('./repository');
const { writeAudit } = require('../common/audit');
const { ValidationError, NotFoundError } = require('../common/errors');

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

const L = (ar, en) => ({ ar, en });

const ORG_TYPES = {
  private_school: L('مدارس خاصة', 'Private schools'),
  government_school: L('مدارس حكومية', 'Government schools'),
  institute: L('معاهد', 'Institutes'),
  college: L('كليات', 'Colleges'),
  university: L('جامعات', 'Universities'),
};

const ORG_TYPE_ORDER = ['private_school', 'government_school', 'institute', 'college', 'university'];

const STATUS = {
  active: L('فعّال', 'Active'),
  inactive: L('غير فعّال', 'Inactive'),
  scheduled: L('مجدول', 'Scheduled'),
  expired: L('منتهي', 'Expired'),
  paused: L('متوقف مؤقتاً', 'Paused'),
  archived: L('مؤرشف', 'Archived'),
  pending: L('قيد المراجعة', 'Pending'),
  approved: L('معتمد', 'Approved'),
  rejected: L('مرفوض', 'Rejected'),
  cancelled: L('ملغي', 'Cancelled'),
  verified: L('موثّق', 'Verified'),
  unverified: L('غير موثّق', 'Unverified'),
  suspended: L('موقوف', 'Suspended'),
  deleted: L('محذوف', 'Deleted'),
  under_review: L('قيد المراجعة', 'Under review'),
  changes_requested: L('تعديلات مطلوبة', 'Changes requested'),
  open: L('مفتوح', 'Open'),
  closed: L('مغلق', 'Closed'),
  completed: L('مكتمل', 'Completed'),
  confirmed: L('مؤكد', 'Confirmed'),
  accepted: L('مقبول', 'Accepted'),
  new: L('جديد', 'New'),
  on_site: L('حضوري', 'On site'),
  online: L('عن بعد', 'Online'),
  hybrid: L('مزيج', 'Hybrid'),
  unspecified: L('غير محدد', 'Unspecified'),
  unassigned: L('غير محدد', 'Unassigned'),
};

const ROLES = {
  admin: L('مدير النظام', 'Administrator'),
  owner: L('مالك مؤسسة', 'Institution owner'),
  teacher: L('معلم', 'Teacher'),
  client: L('عميل', 'Client'),
  unassigned: L('غير محدد', 'Unassigned'),
};

const AD_TYPES = {
  general: L('عام', 'General'),
  promotion: L('ترويجي', 'Promotion'),
  enrollment: L('تسجيل', 'Enrollment'),
  notice: L('إشعار', 'Notice'),
};

const PLACEMENTS = {
  ticker: L('الشريط المتحرك', 'Ticker'),
  public_hero: L('الواجهة الرئيسية', 'Public hero'),
  marketplace: L('السوق', 'Marketplace'),
  sidebar: L('الشريط الجانبي', 'Sidebar'),
};

const GENDERS = { male: L('ذكر', 'Male'), female: L('أنثى', 'Female'), unspecified: L('غير محدد', 'Unspecified') };

const AUDIT_ACTIONS = {
  login: L('دخول', 'Login'),
  create: L('إنشاء', 'Create'),
  update: L('تحديث', 'Update'),
  delete: L('حذف', 'Delete'),
  upload: L('رفع ملف', 'Upload'),
  submit: L('تقديم', 'Submit'),
  resubmit: L('إعادة تقديم', 'Resubmit'),
  review_approve: L('اعتماد مراجعة', 'Review approve'),
  review_reject: L('رفض مراجعة', 'Review reject'),
  pause: L('إيقاف مؤقت', 'Pause'),
  resume: L('استئناف', 'Resume'),
  cancel: L('إلغاء', 'Cancel'),
  archive: L('أرشفة', 'Archive'),
  staff_added: L('إضافة كادر', 'Staff added'),
  staff_archived: L('أرشفة كادر', 'Staff archived'),
  staff_restored: L('استعادة كادر', 'Staff restored'),
  staff_changed: L('تعديل كادر', 'Staff changed'),
  membership_created: L('إنشاء عضوية', 'Membership created'),
  membership_removed: L('إزالة عضوية', 'Membership removed'),
  membership_changed: L('تعديل عضوية', 'Membership changed'),
  permission_override_changed: L('تعديل صلاحية', 'Permission override changed'),
  permission_override_removed: L('إزالة صلاحية', 'Permission override removed'),
};

function labelFrom(map, value) {
  if (value == null || value === '') return L('غير محدد', 'Unspecified');
  return map[value] || L(String(value), String(value));
}

const statusLabel = (v) => labelFrom(STATUS, v);
const roleLabel = (v) => labelFrom(ROLES, v);
const orgTypeLabel = (v) => labelFrom(ORG_TYPES, v);
const adTypeLabel = (v) => labelFrom(AD_TYPES, v);
const placementLabel = (v) => labelFrom(PLACEMENTS, v);
const genderLabel = (v) => labelFrom(GENDERS, v);
const actionLabel = (v) => labelFrom(AUDIT_ACTIONS, v);

// ---------------------------------------------------------------------------
// Period handling
// ---------------------------------------------------------------------------

const PERIOD_PRESETS = {
  today: 'اليوم', yesterday: 'أمس', this_week: 'هذا الأسبوع', last_week: 'الأسبوع الماضي',
  last_7: 'آخر 7 أيام', last_30: 'آخر 30 يوماً', this_month: 'هذا الشهر', last_month: 'الشهر الماضي',
  this_quarter: 'هذا الربع', last_quarter: 'الربع الماضي', this_year: 'هذه السنة', last_year: 'السنة الماضية',
  custom: 'نطاق مخصص',
};

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function resolvePeriod(input = {}) {
  const now = new Date();
  let from; let to; let preset = input.preset || null;
  const explicitFrom = input.from ? new Date(input.from) : null;
  const explicitTo = input.to ? new Date(input.to) : null;

  if (explicitFrom && !isNaN(explicitFrom)) from = startOfDay(explicitFrom);
  if (explicitTo && !isNaN(explicitTo)) to = endOfDay(explicitTo);

  if (!from || !to) {
    const p = preset || 'last_30';
    preset = p;
    switch (p) {
      case 'today': from = startOfDay(now); to = endOfDay(now); break;
      case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); from = startOfDay(y); to = endOfDay(y); break; }
      case 'this_week': { const d = startOfDay(now); const day = (d.getDay() + 1) % 7; d.setDate(d.getDate() - day); from = d; to = endOfDay(now); break; }
      case 'last_week': { const d = startOfDay(now); const day = (d.getDay() + 1) % 7; d.setDate(d.getDate() - day - 7); from = d; const e = new Date(d); e.setDate(e.getDate() + 6); to = endOfDay(e); break; }
      case 'last_7': { const d = startOfDay(now); d.setDate(d.getDate() - 6); from = d; to = endOfDay(now); break; }
      case 'this_month': from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)); to = endOfDay(now); break;
      case 'last_month': from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)); to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)); break;
      case 'this_quarter': { const q = Math.floor(now.getMonth() / 3); from = startOfDay(new Date(now.getFullYear(), q * 3, 1)); to = endOfDay(now); break; }
      case 'last_quarter': { const q = Math.floor(now.getMonth() / 3) - 1; from = startOfDay(new Date(now.getFullYear(), q * 3, 1)); to = endOfDay(new Date(now.getFullYear(), q * 3 + 3, 0)); break; }
      case 'this_year': from = startOfDay(new Date(now.getFullYear(), 0, 1)); to = endOfDay(now); break;
      case 'last_year': from = startOfDay(new Date(now.getFullYear() - 1, 0, 1)); to = endOfDay(new Date(now.getFullYear() - 1, 11, 31)); break;
      case 'custom':
      case 'last_30':
      default: { const d = startOfDay(now); d.setDate(d.getDate() - 29); from = d; to = endOfDay(now); preset = preset || 'last_30'; break; }
    }
  } else {
    preset = 'custom';
  }

  if (from > to) { const t = from; from = to; to = t; }
  const spanMs = to.getTime() - from.getTime();
  const spanDays = Math.max(1, Math.round(spanMs / 86400000));
  const bucket = spanDays <= 45 ? 'day' : 'month';

  // Previous, equal-length window for a truthful comparison.
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - spanMs);

  const label = preset === 'custom'
    ? L('نطاق مخصص', 'Custom range')
    : L(PERIOD_PRESETS[preset] || 'نطاق مخصص', PERIOD_EN[preset] || 'Custom range');

  return {
    preset, from, to, bucket, spanDays,
    prevFrom, prevTo,
    label,
    fromLabel: fmtDate(from), toLabel: fmtDate(to),
  };
}

const PERIOD_EN = {
  today: 'Today', yesterday: 'Yesterday', this_week: 'This week', last_week: 'Last week',
  last_7: 'Last 7 days', last_30: 'Last 30 days', this_month: 'This month', last_month: 'Last month',
  this_quarter: 'This quarter', last_quarter: 'Last quarter', this_year: 'This year', last_year: 'Last year',
  custom: 'Custom range',
};

function fmtDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Merge sparse bucket counts into a continuous series so a chart never
// silently draws a gap as if it were a zero-length period.
function fillSeries(rows, period) {
  const map = {};
  (rows || []).forEach((r) => { map[r.bucket] = Number(r.count || 0); });
  const out = [];
  const cursor = new Date(period.from);
  if (period.bucket === 'month') {
    cursor.setDate(1);
    const end = new Date(period.to);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      out.push({ key, value: map[key] || 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const end = new Date(period.to);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      out.push({ key, value: map[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Model primitives
// ---------------------------------------------------------------------------

function kpi(key, label, value, opts = {}) {
  return {
    key,
    label,
    value: value == null ? 0 : value,
    format: opts.format || 'number',
    tone: opts.tone || 'neutral',
    sub: opts.sub || null,
    trend: opts.trend || null,
    href: opts.href || null,
  };
}

function trendFor(current, previous) {
  if (previous == null || current == null) return null;
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { direction: 'new', percent: null, label: L('جديد هذا الفترة', 'New this period') };
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return { direction: 'flat', percent: 0, label: L('بلا تغيير', 'No change') };
  return {
    direction: rounded > 0 ? 'up' : 'down',
    percent: Math.abs(rounded),
    label: rounded > 0 ? L('عن الفترة السابقة', 'vs previous period') : L('عن الفترة السابقة', 'vs previous period'),
  };
}

function donutChart(key, title, rows, opts = {}) {
  const categories = (rows || []).map((r) => ({
    key: String(r.label == null ? 'unspecified' : r.label),
    label: opts.labelFn ? opts.labelFn(r.label) : L(String(r.label == null ? 'غير محدد' : r.label), String(r.label == null ? 'Unspecified' : r.label)),
    value: Number(r.count || 0),
  }));
  return {
    key, type: 'donut', title,
    unit: '', total: categories.reduce((n, c) => n + c.value, 0),
    categories,
    empty: opts.empty || L('لا توجد بيانات كافية لعرض هذا التوزيع.', 'Not enough data to show this distribution.'),
  };
}

function barChart(key, title, categories, opts = {}) {
  return {
    key, type: opts.type || 'hbar', title,
    unit: opts.unit || '', horizontal: opts.type !== 'bar',
    categories: categories || [],
    series: opts.series || [{ key: 'count', label: L('العدد', 'Count'), tone: opts.tone || 'primary' }],
    empty: opts.empty || L('لا توجد بيانات لهذه الفترة.', 'No data for this period.'),
  };
}

function lineChart(key, title, points, opts = {}) {
  const categories = (points || []).map((p) => ({ key: p.key, label: L(p.key, p.key), value: p.value }));
  return {
    key, type: 'line', title,
    unit: opts.unit || '',
    categories,
    series: [{ key: 'count', label: opts.seriesLabel || L('العدد', 'Count'), tone: opts.tone || 'primary' }],
    empty: opts.empty || L('لا توجد بيانات مسجلة لهذه الفترة.', 'No recorded data for this period.'),
  };
}

function table(key, title, columns, rows, total, pagination) {
  return { key, title, columns, rows: rows || [], total: total == null ? (rows || []).length : total, pagination: pagination || null };
}

const COL = (key, label, type, opts = {}) => ({
  key, label, type: type || 'text', align: opts.align || (type === 'number' || type === 'currency' || type === 'percent' ? 'end' : 'start'), width: opts.width || null,
});

function cell(v, extra) { return Object.assign({ v: v == null ? '' : v }, extra || {}); }
function entityCell(name, extra) { return Object.assign({ v: name == null ? '' : name }, extra || {}); }

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

async function overviewReport(period) {
  const [now, prev] = await Promise.all([
    repo.overviewCounts({ from: period.from, to: period.to }),
    repo.overviewCounts({ from: period.prevFrom, to: period.prevTo }),
  ]);
  const [types, govs, newOrgs, adStatus, recent, pending] = await Promise.all([
    repo.institutionTypeCounts({}),
    repo.institutionsByGovernorate({}, 8),
    repo.institutionTimeSeries({ from: period.from, to: period.to, bucket: period.bucket }, {}),
    repo.adsByStatus(),
    repo.recentInstitutions(8),
    repo.pendingReviewList(8),
  ]);
  const ctr = now.ad_impressions > 0 ? (now.ad_clicks / now.ad_impressions) * 100 : 0;

  const kpis = [
    kpi('orgs', L('المؤسسات التعليمية', 'Institutions'), now.orgs_total, {
      tone: 'primary', sub: L(`${now.orgs_verified} موثّقة · ${now.orgs_pending} قيد المراجعة`, `${now.orgs_verified} verified · ${now.orgs_pending} pending`),
      trend: trendFor(now.orgs_new, prev.orgs_new), href: 'institutions',
    }),
    kpi('teachers', L('المعلمون', 'Teachers'), now.teachers_total, {
      tone: 'info', sub: L(`${now.teachers_active} فعّال`, `${now.teachers_active} active`),
      trend: trendFor(now.teachers_new, prev.teachers_new), href: 'teachers',
    }),
    kpi('users', L('المستخدمون', 'Users'), now.users_total, {
      tone: 'info', sub: L(`${now.users_active} فعّال · ${now.clients_total} عميل`, `${now.users_active} active · ${now.clients_total} clients`),
      trend: trendFor(now.users_new, prev.users_new), href: 'users',
    }),
    kpi('admissions', L('طلبات القبول', 'Admissions'), now.admissions_total, {
      tone: 'warn', sub: L(`${now.admissions_pending} قيد المراجعة`, `${now.admissions_pending} pending`), href: 'admissions',
    }),
    kpi('bookings', L('الحجوزات', 'Bookings'), now.bookings_total, { tone: 'neutral', sub: L('إجمالي الحجوزات', 'Total bookings') }),
    kpi('offers', L('العروض النشطة', 'Active offers'), now.offers_active, {
      tone: 'positive', sub: L(`من أصل ${now.offers_total} عرض`, `of ${now.offers_total} total`),
      trend: trendFor(now.offers_new, prev.offers_new), href: 'offers',
    }),
    kpi('ads', L('الإعلانات', 'Advertisements'), now.ads_total, {
      tone: 'positive', sub: L(`${now.ads_active} نشط · ${now.ads_pending} قيد المراجعة`, `${now.ads_active} active · ${now.ads_pending} pending`),
      trend: trendFor(now.ads_new, prev.ads_new), href: 'advertisements',
    }),
    kpi('pending', L('بانتظار المراجعة', 'Pending review'),
      now.pending_ownership + now.pending_locations + now.pending_documents,
      { tone: 'warn', sub: L('مؤسسات ووثائق وملكية', 'Institutions, documents, ownership'), href: 'verify' }),
    kpi('activity', L('أحداث النشاط', 'Activity events'), now.activity_events, {
      tone: 'neutral', trend: trendFor(now.activity_events, prev.activity_events), href: 'activity',
    }),
    kpi('ctr', L('نسبة نقر الإعلانات', 'Ad click-through rate'), ctr, {
      format: 'percent', tone: 'info', sub: L(`${now.ad_clicks} نقرة من ${now.ad_impressions} ظهور`, `${now.ad_clicks} clicks of ${now.ad_impressions} impressions`),
    }),
  ];

  const typeCats = ORG_TYPE_ORDER
    .map((t) => ({ key: t, label: orgTypeLabel(t), value: (types.find((x) => x.type === t) || {}).count || 0 }))
    .filter((c) => c.value > 0);

  const charts = [
    {
      key: 'orgsByType', type: 'donut', title: L('المؤسسات حسب النوع', 'Institutions by type'),
      total: typeCats.reduce((n, c) => n + c.value, 0), categories: typeCats,
      empty: L('لا توجد مؤسسات مسجلة.', 'No registered institutions.'),
    },
    barChart('orgsByGov', L('المؤسسات حسب المحافظة', 'Institutions by governorate'),
      (govs || []).map((g) => ({ key: String(g.id || 'x'), label: L(g.governorate || 'غير محدد', g.governorate || 'Unspecified'), value: Number(g.count || 0) })),
      { tone: 'primary' }),
    { ...lineChart('newOrgs', L('المؤسسات الجديدة', 'New institutions'), fillSeries(newOrgs, period), { tone: 'positive' }), type: 'area' },
    donutChart('adStatus', L('حالة الإعلانات', 'Advertisements by status'), adStatus, { labelFn: statusLabel }),
  ];

  const tables = [
    table('recentOrgs', L('أحدث المؤسسات', 'Recent institutions'),
      [COL('name', L('المؤسسة', 'Institution'), 'entity'), COL('type', L('النوع', 'Type'), 'text'),
        COL('governorate', L('المحافظة', 'Governorate')), COL('verified', L('التحقق', 'Verification'), 'badge'),
        COL('created_at', L('تاريخ الإضافة', 'Created'), 'date')],
      recent.map((o) => ({
        name: entityCell(o.name, { img: o.image, sub: orgTypeLabel(o.type).ar + ' · ' + (o.governorate || ''), href: `#/detail?id=${o.id}` }),
        type: orgTypeLabel(o.type).ar, governorate: o.governorate || '—',
        verified: { v: o.verified || o.verification_status === 'verified' ? 'verified' : 'pending', type: 'badge' },
        created_at: o.created_at,
      })), recent.length),
    table('pending', L('بانتظار المراجعة', 'Pending review'),
      [COL('name', L('العنصر', 'Item'), 'text'), COL('kind', L('النوع', 'Kind'), 'badge'),
        COL('status', L('الحالة', 'Status'), 'badge'), COL('created_at', L('التاريخ', 'Date'), 'date')],
      pending.map((p) => ({
        name: p.name || '—',
        kind: { v: { organization: 'institution', advertisement: 'advertisement', document: 'document', ownership: 'ownership' }[p.kind] || p.kind, type: 'badge' },
        status: { v: p.status || 'pending', type: 'badge' },
        created_at: p.created_at,
      })), pending.length),
  ];

  const notes = [];
  if (now.admissions_total === 0) notes.push({ tone: 'info', text: L('لا توجد طلبات قبول مسجلة حتى الآن؛ القسم جاهز ويظهر البيانات فور تسجيلها.', 'No admission applications are recorded yet; the section is ready and will populate automatically.') });
  if (now.ad_impressions === 0) notes.push({ tone: 'info', text: L('لم تُسجَّل ظهورات أو نقرات إعلانية بعد، لذا لا يمكن عرض اتجاهات الأداء التاريخية.', 'No advertisement impressions or clicks recorded yet, so no historical performance trend can be shown.') });
  if (now.bookings_total === 0) notes.push({ tone: 'info', text: L('لا توجد حجوزات مسجلة حتى الآن.', 'No bookings recorded yet.') });

  return base('overview', 'executive', L('نظرة عامة تنفيذية', 'Executive overview'),
    L('ملخص أداء ونشاط منصة مدرستي', 'A summary of the Madrasati platform\'s performance and activity'),
    period, kpis, charts, tables, notes);
}

// ---------------------------------------------------------------------------
// Institutions
// ---------------------------------------------------------------------------

async function institutionsReport(period, filters) {
  const common = { ...filters };
  const list = await repo.institutionsList({ from: null, to: null, limit: filters.limit || 25, offset: filters.offset || 0 }, common);
  const [typeCounts, govs, countries, series, periodList] = await Promise.all([
    repo.institutionTypeCounts(common),
    repo.institutionsByGovernorate(common, 12),
    repo.institutionsByCountry(common),
    repo.institutionTimeSeries({ from: period.from, to: period.to, bucket: period.bucket }, common),
    repo.institutionsList({ from: period.from, to: period.to, limit: 5000, offset: 0 }, common),
  ]);

  const total = typeCounts.reduce((n, t) => n + t.count, 0);
  const verified = typeCounts.reduce((n, t) => n + t.verified, 0);
  const pending = total - verified;

  const kpis = [
    kpi('total', L('إجمالي المؤسسات', 'Total institutions'), total, { tone: 'primary', sub: L('مطابقة للتصفية الحالية', 'Matching the current filter') }),
    kpi('verified', L('المؤسسات الموثّقة', 'Verified institutions'), verified, { tone: 'positive', sub: total ? L(`${pct(verified, total)}% من الإجمالي`, `${pct(verified, total)}% of total`) : null }),
    kpi('pending', L('قيد المراجعة', 'Pending verification'), pending, { tone: 'warn' }),
    kpi('new', L('مؤسسات جديدة', 'New institutions'), periodList.total, { tone: 'info', sub: period.label }),
  ];

  const typeCats = ORG_TYPE_ORDER
    .map((t) => ({ key: t, label: orgTypeLabel(t), value: (typeCounts.find((x) => x.type === t) || {}).count || 0 }))
    .filter((c) => c.value > 0);

  const charts = [
    { key: 'byType', type: 'donut', title: L('المؤسسات حسب النوع', 'Institutions by type'), total, categories: typeCats, empty: L('لا توجد مؤسسات مطابقة.', 'No matching institutions.') },
    barChart('byGov', L('المؤسسات حسب المحافظة', 'Institutions by governorate'),
      govs.map((g) => ({ key: String(g.id || g.governorate), label: L(g.governorate || 'غير محدد', g.governorate || 'Unspecified'), value: Number(g.count) }))),
    { ...lineChart('newOverTime', L('المؤسسات الجديدة خلال الفترة', 'New institutions over the period'), fillSeries(series, period), { tone: 'positive' }), type: 'area' },
    donutChart('byCountry', L('المؤسسات حسب الدولة', 'Institutions by country'), countries),
  ];

  const columns = [
    COL('name', L('المؤسسة', 'Institution'), 'entity'),
    COL('type', L('النوع', 'Type')),
    COL('governorate', L('المحافظة', 'Governorate')),
    COL('verified', L('التحقق', 'Verification'), 'badge'),
    COL('stages_count', L('المراحل', 'Stages'), 'number'),
    COL('offers_count', L('العروض', 'Offers'), 'number'),
    COL('ads_count', L('الإعلانات', 'Ads'), 'number'),
    COL('created_at', L('تاريخ الإضافة', 'Created'), 'date'),
  ];
  const rows = list.rows.map((o) => ({
    name: entityCell(o.name, { img: o.image, sub: orgTypeLabel(o.type).ar, href: `#/detail?id=${o.id}` }),
    type: orgTypeLabel(o.type).ar,
    governorate: o.governorate || '—',
    verified: { v: o.verified || o.verification_status === 'verified' ? 'verified' : 'pending', type: 'badge' },
    stages_count: o.stages_count, offers_count: o.offers_count, ads_count: o.ads_count,
    created_at: o.created_at,
  }));

  const tables = [table('institutions', L('قائمة المؤسسات', 'Institutions'),
    columns, rows, list.total, { limit: filters.limit || 25, offset: filters.offset || 0, total: list.total })];

  const scope = scopeSummary(filters, { orgType: orgTypeLabel, governorate: (v) => L(v, v), verified: statusLabel });
  return base('institutions', 'institutions', L('تقرير المؤسسات', 'Institutions report'),
    L('التوزيع والحالة والموقع والتاريخ', 'Distribution, status, location and history'),
    period, kpis, charts, tables, [], scope);
}

// ---------------------------------------------------------------------------
// Institution entity
// ---------------------------------------------------------------------------

async function institutionReport(period, filters) {
  const data = await repo.institutionEntity(filters.id);
  if (!data) throw new NotFoundError('Institution not found');
  const { org, stages, subjects, fees, offers, ads, documents, staff, facilities, services } = data;
  const capacity = stages.reduce((n, s) => n + (Number(s.capacity) || 0), 0);
  const students = stages.reduce((n, s) => n + (Number(s.current_students) || 0), 0);
  const remaining = stages.reduce((n, s) => n + (Number(s.remaining_seats) || 0), 0);
  const impressions = ads.reduce((n, a) => n + (Number(a.impressions) || 0), 0);
  const clicks = ads.reduce((n, a) => n + (Number(a.clicks) || 0), 0);
  const activeOffers = offers.filter((o) => o.effective_status === 'active').length;

  const kpis = [
    kpi('stages', L('المراحل المعروضة', 'Stages offered'), stages.length, { tone: 'primary' }),
    kpi('subjects', L('المواد', 'Subjects'), subjects.length, { tone: 'info' }),
    kpi('offers', L('العروض النشطة', 'Active offers'), activeOffers, { tone: 'positive', sub: L(`من أصل ${offers.length}`, `of ${offers.length}`) }),
    kpi('ads', L('الإعلانات', 'Advertisements'), ads.length, { tone: 'positive', sub: L(`${impressions} ظهور · ${clicks} نقرة`, `${impressions} impressions · ${clicks} clicks`) }),
    kpi('capacity', L('إجمالي السعة', 'Total capacity'), capacity, { tone: 'neutral', sub: L('حيث أُعلنت', 'Where declared') }),
    kpi('students', L('الطلاب الحاليون', 'Current students'), students, { tone: 'info' }),
    kpi('remaining', L('المقاعد المتبقية', 'Remaining seats'), remaining, { tone: 'positive' }),
    kpi('fees', L('بنود الرسوم', 'Fee items'), fees.length, { tone: 'neutral' }),
  ];

  const deliveryCats = ['on_site', 'online', 'hybrid', 'unspecified']
    .map((m) => ({ key: m, label: statusLabel(m), value: stages.filter((s) => (s.delivery_mode || 'unspecified') === m).length }))
    .filter((c) => c.value > 0);
  const capacityCats = stages.filter((s) => Number(s.capacity) > 0)
    .map((s) => ({ key: String(s.id), label: L(s.stage, s.stage_en || s.stage), capacity: Number(s.capacity), students: Number(s.current_students) }));

  const charts = [
    {
      key: 'delivery', type: 'donut', title: L('طريقة الحضور', 'Delivery mode'),
      total: deliveryCats.reduce((n, c) => n + c.value, 0), categories: deliveryCats,
      empty: L('لا توجد مراحل معروضة.', 'No stages offered.'),
    },
    barChart('capacity', L('السعة مقابل الطلاب', 'Capacity vs students'), capacityCats, {
      type: 'bar', tone: 'primary',
      series: [
        { key: 'capacity', label: L('السعة', 'Capacity'), tone: 'primary' },
        { key: 'students', label: L('الطلاب', 'Students'), tone: 'accent' },
      ],
      empty: L('لم تُعلن سعة لأي مرحلة.', 'No stage capacity declared.'),
    }),
  ];

  const tables = [
    table('stages', L('المراحل والسعة', 'Stages and capacity'),
      [COL('stage', L('المرحلة', 'Stage')), COL('delivery_mode', L('الحضور', 'Delivery'), 'badge'),
        COL('capacity', L('السعة', 'Capacity'), 'number'), COL('current_students', L('الطلاب', 'Students'), 'number'),
        COL('remaining_seats', L('المتبقي', 'Remaining'), 'number')],
      stages.map((s) => ({ stage: s.stage, delivery_mode: { v: s.delivery_mode || 'unspecified', type: 'badge' }, capacity: s.capacity, current_students: s.current_students, remaining_seats: s.remaining_seats })),
      stages.length),
    table('subjects', L('المواد والرسوم', 'Subjects and fees'),
      [COL('subject', L('المادة', 'Subject')), COL('language', L('اللغة', 'Language')),
        COL('fee_amount', L('الرسم', 'Fee'), 'currency'), COL('currency', L('العملة', 'Currency')),
        COL('frequency', L('الدورية', 'Frequency')), COL('review_status', L('الحالة', 'Status'), 'badge')],
      subjects.map((s) => ({ subject: s.subject, language: s.language_code || '—', fee_amount: s.fee_amount, currency: s.currency || '', frequency: s.frequency || '—', review_status: { v: s.review_status || 'approved', type: 'badge' } })),
      subjects.length),
    table('fees', L('بنود الرسوم', 'Fee items'),
      [COL('name', L('البند', 'Item')), COL('fee_type', L('النوع', 'Type')), COL('stage', L('المرحلة', 'Stage')),
        COL('amount', L('المبلغ', 'Amount'), 'currency'), COL('currency', L('العملة', 'Currency')),
        COL('frequency', L('الدورية', 'Frequency')), COL('active', L('الحالة', 'Status'), 'badge')],
      fees.map((f) => ({ name: f.name, fee_type: f.fee_type || '—', stage: f.stage || '—', amount: f.amount, currency: f.currency || '', frequency: f.frequency || '—', active: { v: f.active ? 'active' : 'inactive', type: 'badge' } })),
      fees.length),
    table('offers', L('العروض', 'Offers'),
      [COL('title', L('العرض', 'Offer')), COL('discount_percent', L('الخصم %', 'Discount %'), 'number'),
        COL('effective_status', L('الحالة', 'Status'), 'badge'), COL('starts_at', L('البداية', 'Start'), 'date'),
        COL('ends_at', L('النهاية', 'End'), 'date')],
      offers.map((o) => ({ title: o.title, discount_percent: o.discount_percent, effective_status: { v: o.effective_status, type: 'badge' }, starts_at: o.starts_at, ends_at: o.ends_at })),
      offers.length),
    table('ads', L('الإعلانات', 'Advertisements'),
      [COL('name', L('الإعلان', 'Advertisement')), COL('ad_type', L('النوع', 'Type')), COL('status', L('الحالة', 'Status'), 'badge'),
        COL('impressions', L('الظهور', 'Impressions'), 'number'), COL('clicks', L('النقرات', 'Clicks'), 'number')],
      ads.map((a) => ({ name: a.name, ad_type: adTypeLabel(a.ad_type).ar, status: { v: a.effective_status, type: 'badge' }, impressions: a.impressions, clicks: a.clicks })),
      ads.length),
    table('staff', L('الكادر', 'Staff'),
      [COL('name', L('الاسم', 'Name')), COL('membership_role', L('الدور', 'Role')),
        COL('job_title', L('المسمى', 'Job title')), COL('email', L('البريد', 'Email')), COL('joined_at', L('تاريخ الانضمام', 'Joined'), 'date')],
      staff.map((m) => ({ name: m.name, membership_role: m.membership_role || '—', job_title: m.job_title || '—', email: m.email || '—', joined_at: m.joined_at })),
      staff.length),
  ].filter((t) => t.rows.length > 0 || t.key !== 'staff');

  const notes = [];
  if (!stages.some((s) => Number(s.capacity) > 0)) notes.push({ tone: 'info', text: L('لم تُعلن سعة لأي مرحلة في هذه المؤسسة.', 'No capacity declared for any stage of this institution.') });

  const scope = {
    filters: [
      { key: 'institution', label: L('المؤسسة', 'Institution'), value: org.name },
      { key: 'type', label: L('النوع', 'Type'), value: orgTypeLabel(org.type).ar },
    ],
    entity: {
      kind: 'institution', id: org.id, name: org.name, type: orgTypeLabel(org.type),
      logo: org.image || null,
      location: [org.governorate_name, org.district_name].filter(Boolean).join(' · '),
      phone: org.phone, email: org.email, verified: org.verified || org.verification_status === 'verified',
      created_at: org.created_at,
    },
  };

  return base('institution', 'institutions', L('تقرير مؤسسة', 'Institution report'),
    orgTypeLabel(org.type).ar, period, kpis, charts, tables, notes, scope);
}

// ---------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------

async function teachersReport(period, filters) {
  const [counts, byGender, byGov, byStatus, byVerification, list] = await Promise.all([
    repo.teacherCounts({ from: period.from, to: period.to }),
    repo.teachersBy('gender'),
    repo.teachersBy('governorate'),
    repo.teachersBy('status'),
    repo.teachersBy('verification'),
    repo.teachersList({ limit: filters.limit || 25, offset: filters.offset || 0 }),
  ]);

  const kpis = [
    kpi('total', L('إجمالي المعلمين', 'Total teachers'), counts.total, { tone: 'primary' }),
    kpi('active', L('المعلمون الفعّالون', 'Active teachers'), counts.active, { tone: 'positive' }),
    kpi('verified', L('موثّقون', 'Verified'), counts.verified, { tone: 'positive' }),
    kpi('pending', L('قيد المراجعة', 'Pending'), counts.pending, { tone: 'warn' }),
    kpi('new', L('جدد خلال الفترة', 'New in period'), counts.created_in_period, { tone: 'info' }),
  ];

  const charts = [
    donutChart('byGender', L('حسب الجنس', 'By gender'), byGender, { labelFn: genderLabel }),
    donutChart('byVerification', L('حسب التحقق', 'By verification'), byVerification, { labelFn: statusLabel }),
    donutChart('byStatus', L('حسب الحالة', 'By status'), byStatus, { labelFn: statusLabel }),
    barChart('byGov', L('حسب المحافظة', 'By governorate'),
      byGov.map((g) => ({ key: g.label, label: L(g.label, g.label), value: Number(g.count) }))),
  ];

  const rows = list.rows.map((t) => ({
    name: entityCell(t.name || '—', { img: t.avatar_url, sub: t.headline || '', href: `#/teacher?id=${t.id}` }),
    governorate: t.governorate || t.country || '—',
    gender: genderLabel(t.gender).ar,
    subjects_count: t.subjects_count,
    verification_status: { v: t.verification_status || 'pending', type: 'badge' },
    profile_status: { v: t.profile_status || 'active', type: 'badge' },
    created_at: t.created_at,
  }));
  const tables = [table('teachers', L('قائمة المعلمين', 'Teachers'),
    [COL('name', L('المعلم', 'Teacher'), 'entity'), COL('governorate', L('الموقع', 'Location')),
      COL('gender', L('الجنس', 'Gender')), COL('subjects_count', L('المواد', 'Subjects'), 'number'),
      COL('verification_status', L('التحقق', 'Verification'), 'badge'), COL('profile_status', L('الحالة', 'Status'), 'badge'),
      COL('created_at', L('تاريخ التسجيل', 'Registered'), 'date')],
    rows, list.total, { limit: filters.limit || 25, offset: filters.offset || 0, total: list.total })];

  const notes = [];
  if (counts.total <= 1) notes.push({ tone: 'info', text: L('عدد المعلمين المسجلين محدود حالياً؛ لذلك لا تُعرض توزيعات تفصيلية ذات دلالة.', 'The number of registered teachers is currently limited, so meaningful detailed distributions cannot be shown.') });

  return base('teachers', 'teachers', L('تقرير المعلمين', 'Teachers report'),
    L('العدد والحالة والتوزيع', 'Counts, status and distribution'),
    period, kpis, charts, tables, notes);
}

async function teacherReport(period, filters) {
  const data = await repo.teacherEntity(filters.id);
  if (!data) throw new NotFoundError('Teacher not found');
  const { teacher: t, pricing, availability, qualifications, documents } = data;
  const kpis = [
    kpi('subjects', L('المواد', 'Subjects'), pricing.length, { tone: 'primary' }),
    kpi('availability', L('أوقات التوفر', 'Availability slots'), availability.length, { tone: 'info' }),
    kpi('qualifications', L('المؤهلات', 'Qualifications'), qualifications.length, { tone: 'info' }),
    kpi('documents', L('الوثائق', 'Documents'), documents.length, { tone: 'neutral' }),
  ];
  const charts = [];
  const tables = [
    table('subjects', L('المواد والأسعار', 'Subjects and pricing'),
      [COL('subject', L('المادة', 'Subject')), COL('amount', L('السعر', 'Price'), 'currency'),
        COL('currency', L('العملة', 'Currency')), COL('billing_period', L('الدورية', 'Billing')),
        COL('location_mode', L('الحضور', 'Mode'), 'badge')],
      pricing.map((p) => ({ subject: p.subject || '—', amount: p.amount, currency: p.currency || '', billing_period: p.billing_period || '—', location_mode: { v: p.location_mode || 'unspecified', type: 'badge' } })),
      pricing.length),
    table('availability', L('أوقات التوفر', 'Weekly availability'),
      [COL('day_of_week', L('اليوم', 'Day'), 'number'), COL('start_time', L('من', 'From')), COL('end_time', L('إلى', 'To')), COL('location_mode', L('المكان', 'Place'), 'badge')],
      availability.map((a) => ({ day_of_week: a.day_of_week, start_time: a.start_time, end_time: a.end_time, location_mode: { v: a.location_mode || 'unspecified', type: 'badge' } })),
      availability.length),
    table('qualifications', L('المؤهلات', 'Qualifications'),
      [COL('title', L('المؤهل', 'Qualification')), COL('institution_name', L('الجهة', 'Institution')), COL('degree', L('الدرجة', 'Degree')), COL('year_obtained', L('السنة', 'Year'), 'number')],
      qualifications.map((q) => ({ title: q.title || '—', institution_name: q.institution_name || '—', degree: q.degree || '—', year_obtained: q.year_obtained })),
      qualifications.length),
    table('documents', L('الوثائق', 'Documents'),
      [COL('file_name', L('الملف', 'File')), COL('doc_type', L('النوع', 'Type')), COL('status', L('الحالة', 'Status'), 'badge')],
      documents.map((d) => ({ file_name: d.file_name, doc_type: d.doc_type || '—', status: { v: d.status || 'pending', type: 'badge' } })),
      documents.length),
  ];
  const notes = [];
  if (pricing.length === 0) notes.push({ tone: 'info', text: L('لا توجد مواد أو أسعار مسجلة لهذا المعلم بعد.', 'No subjects or pricing recorded for this teacher yet.') });

  const scope = {
    filters: [
      { key: 'teacher', label: L('المعلم', 'Teacher'), value: t.name || '—' },
    ],
    entity: {
      kind: 'teacher', id: t.id, name: t.name || '—', type: L(t.headline || 'معلم مستقل', t.headline || 'Freelance teacher'),
      logo: t.avatar_url || null,
      location: [t.governorate_name, t.district_name].filter(Boolean).join(' · '),
      phone: t.user_phone || t.phone, email: t.email,
      verified: t.verification_status === 'verified', created_at: t.created_at,
    },
  };
  return base('teacher', 'teachers', L('تقرير معلم', 'Teacher report'),
    t.headline || L('معلم مستقل', 'Freelance teacher'), period, kpis, charts, tables, notes, scope);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

async function usersReport(period, filters) {
  const [counts, byRole, byStatus, byGov, series, list] = await Promise.all([
    repo.userCounts({ from: period.from, to: period.to }),
    repo.usersByRole(),
    repo.usersByStatus(),
    repo.usersByGovernorate(),
    repo.userTimeSeries({ from: period.from, to: period.to, bucket: period.bucket }),
    repo.usersList({ limit: filters.limit || 25, offset: filters.offset || 0 }, filters),
  ]);

  const kpis = [
    kpi('total', L('إجمالي الحسابات', 'Total accounts'), counts.total, { tone: 'primary' }),
    kpi('active', L('حسابات فعّالة', 'Active accounts'), counts.active, { tone: 'positive', sub: counts.total ? L(`${pct(counts.active, counts.total)}% من الإجمالي`, `${pct(counts.active, counts.total)}% of total`) : null }),
    kpi('suspended', L('حسابات موقوفة', 'Suspended'), counts.suspended, { tone: 'warn' }),
    kpi('new', L('تسجيلات جديدة', 'New registrations'), counts.created_in_period, { tone: 'info', sub: period.label }),
    kpi('protected', L('حسابات محمية', 'Protected accounts'), counts.protected, { tone: 'neutral' }),
  ];

  const roleCats = byRole.map((r) => ({ key: r.role, label: roleLabel(r.role), value: Number(r.count) }));
  const charts = [
    { key: 'byRole', type: 'donut', title: L('التوزيع حسب الدور', 'Distribution by role'), total: counts.total, categories: roleCats, empty: L('لا توجد حسابات.', 'No accounts.') },
    donutChart('byStatus', L('حسب الحالة', 'By status'), byStatus, { labelFn: statusLabel }),
    { ...lineChart('newUsers', L('التسجيلات خلال الفترة', 'Registrations over the period'), fillSeries(series, period), { tone: 'positive' }), type: 'area' },
    barChart('byGov', L('المستخدمون حسب المحافظة', 'Users by governorate'),
      byGov.map((g) => ({ key: g.label, label: L(g.label, g.label), value: Number(g.count) }))),
  ];

  const rows = list.rows.map((u) => ({
    name: entityCell(u.name || '—', { img: u.avatar_url, sub: u.email || '', href: null }),
    role: { v: u.role, type: 'badge' },
    status: { v: u.status, type: 'badge' },
    organization_name: u.organization_name || '—',
    created_at: u.created_at,
  }));
  const tables = [table('users', L('قائمة المستخدمين', 'Users'),
    [COL('name', L('المستخدم', 'User'), 'entity'), COL('role', L('الدور', 'Role'), 'badge'),
      COL('status', L('الحالة', 'Status'), 'badge'), COL('organization_name', L('الانتماء', 'Affiliation')),
      COL('created_at', L('تاريخ التسجيل', 'Registered'), 'date')],
    rows, list.total, { limit: filters.limit || 25, offset: filters.offset || 0, total: list.total })];

  return base('users', 'users', L('تقرير المستخدمين والعملاء', 'Users and clients report'),
    L('الحسابات والأدوار وحالة الوصول', 'Accounts, roles and access status'),
    period, kpis, charts, tables, []);
}

// ---------------------------------------------------------------------------
// Admissions
// ---------------------------------------------------------------------------

async function admissionsReport(period, filters) {
  const [byStatus, byStage, list] = await Promise.all([
    repo.admissionsByStatus(), repo.admissionsByStage(),
    repo.admissionsReportList({ limit: filters.limit || 25, offset: filters.offset || 0 }, filters),
  ]);
  const total = byStatus.reduce((n, r) => n + r.count, 0);
  const pending = (byStatus.find((r) => r.status === 'pending') || {}).count || 0;
  const kpis = [
    kpi('total', L('إجمالي الطلبات', 'Total applications'), total, { tone: 'primary' }),
    kpi('pending', L('قيد المراجعة', 'Pending'), pending, { tone: 'warn' }),
    kpi('period', L('طلبات الفترة', 'Applications in period'), 0, { tone: 'info', sub: period.label }),
  ];
  const charts = [
    donutChart('byStatus', L('الطلبات حسب الحالة', 'Applications by status'), byStatus, { labelFn: statusLabel }),
    barChart('byStage', L('الطلبات حسب المرحلة', 'Applications by stage'),
      byStage.map((s) => ({ key: s.label, label: L(s.label, s.label), value: Number(s.count) }))),
  ];
  const rows = list.rows.map((a) => ({
    applicant_name: a.applicant_name || '—',
    institution_name: a.institution_name || '—',
    stage: a.stage || '—',
    status: { v: a.status, type: 'badge' },
    submitted_at: a.submitted_at || a.created_at,
  }));
  const tables = [table('applications', L('طلبات القبول', 'Admission applications'),
    [COL('applicant_name', L('مقدم الطلب', 'Applicant')), COL('institution_name', L('المؤسسة', 'Institution')),
      COL('stage', L('المرحلة', 'Stage')), COL('status', L('الحالة', 'Status'), 'badge'),
      COL('submitted_at', L('تاريخ التقديم', 'Submitted'), 'date')],
    rows, list.total, { limit: filters.limit || 25, offset: filters.offset || 0, total: list.total })];
  const notes = total === 0 ? [{ tone: 'info', text: L('لا توجد طلبات قبول مسجلة حتى الآن. القسم مربوط بنموذج البيانات الفعلي ويُعرض تلقائياً عند توفر الطلبات.', 'No admission applications are recorded yet. This section is wired to the real data model and will populate automatically once applications exist.') }] : [];
  return base('admissions', 'admissions', L('تقرير القبول والتسجيل', 'Admissions report'),
    L('الطلبات وحالاتها', 'Applications and their status'), period, kpis, charts, tables, notes);
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

async function offersReport(period, filters) {
  const [counts, byStatus, byType, byGov, series, list] = await Promise.all([
    repo.offerCounts({ from: period.from, to: period.to }),
    repo.offersByStatus(), repo.offersByInstitutionType(), repo.offersByGovernorate(),
    repo.offerTimeSeries({ from: period.from, to: period.to, bucket: period.bucket }),
    repo.offersList({ limit: filters.limit || 25, offset: filters.offset || 0 }, { ...filters }),
  ]);
  const kpis = [
    kpi('total', L('إجمالي العروض', 'Total offers'), counts.total, { tone: 'primary' }),
    kpi('active', L('عروض نشطة', 'Active offers'), counts.active, { tone: 'positive' }),
    kpi('scheduled', L('عروض مجدولة', 'Scheduled offers'), counts.scheduled, { tone: 'info' }),
    kpi('expired', L('عروض منتهية', 'Expired offers'), counts.expired, { tone: 'warn' }),
    kpi('inactive', L('عروض غير فعّالة', 'Inactive offers'), counts.inactive, { tone: 'neutral' }),
    kpi('new', L('عروض الفترة', 'Offers in period'), counts.created_in_period, { tone: 'info', sub: period.label }),
  ];
  const charts = [
    donutChart('byStatus', L('العروض حسب الحالة', 'Offers by status'), byStatus, { labelFn: statusLabel }),
    barChart('byType', L('العروض حسب نوع المؤسسة', 'Offers by institution type'),
      byType.map((r) => ({ key: r.label, label: orgTypeLabel(r.label), value: Number(r.count) }))),
    barChart('byGov', L('العروض حسب المحافظة', 'Offers by governorate'),
      byGov.map((r) => ({ key: r.label, label: L(r.label, r.label), value: Number(r.count) }))),
    { ...lineChart('overTime', L('العروض المنشأة خلال الفترة', 'Offers created over the period'), fillSeries(series, period), { tone: 'positive' }), type: 'area' },
  ];
  const rows = list.rows.map((o) => ({
    title: entityCell(o.title, { sub: o.institution_name || '', href: null }),
    institution_name: o.institution_name || '—',
    discount_percent: o.discount_percent,
    effective_status: { v: o.effective_status, type: 'badge' },
    starts_at: o.starts_at, ends_at: o.ends_at, created_at: o.created_at,
  }));
  const tables = [table('offers', L('قائمة العروض', 'Offers'),
    [COL('title', L('العرض', 'Offer'), 'entity'), COL('institution_name', L('المؤسسة', 'Institution')),
      COL('discount_percent', L('الخصم %', 'Discount %'), 'number'), COL('effective_status', L('الحالة', 'Status'), 'badge'),
      COL('starts_at', L('البداية', 'Start'), 'date'), COL('ends_at', L('النهاية', 'End'), 'date'),
      COL('created_at', L('الإنشاء', 'Created'), 'date')],
    rows, list.total, { limit: filters.limit || 25, offset: filters.offset || 0, total: list.total })];
  return base('offers', 'offers', L('تقرير العروض', 'Offers report'),
    L('العروض وحالاتها وتوزيعها', 'Offers, their status and distribution'), period, kpis, charts, tables, []);
}

// ---------------------------------------------------------------------------
// Advertisements
// ---------------------------------------------------------------------------

async function advertisementsReport(period, filters) {
  const [counts, byStatus, byPlacement, byType, byInstitution, list] = await Promise.all([
    repo.adCounts({ from: period.from, to: period.to }),
    repo.adsByStatus(), repo.adsByPlacement(), repo.adsByType(), repo.adsByInstitution(),
    repo.adsList({ limit: filters.limit || 25, offset: filters.offset || 0 }, { ...filters }),
  ]);
  const ctr = counts.impressions > 0 ? (counts.clicks / counts.impressions) * 100 : 0;
  const kpis = [
    kpi('total', L('إجمالي الإعلانات', 'Total advertisements'), counts.total, { tone: 'primary' }),
    kpi('active', L('نشطة', 'Active'), counts.active, { tone: 'positive' }),
    kpi('pending', L('قيد المراجعة', 'Pending review'), counts.pending, { tone: 'warn' }),
    kpi('scheduled', L('مجدولة', 'Scheduled'), counts.scheduled, { tone: 'info' }),
    kpi('rejected', L('مرفوضة', 'Rejected'), counts.rejected, { tone: 'negative' }),
    kpi('expired', L('منتهية', 'Expired'), counts.expired, { tone: 'neutral' }),
    kpi('impressions', L('مرات الظهور', 'Impressions'), counts.impressions, { tone: 'info' }),
    kpi('clicks', L('النقرات', 'Clicks'), counts.clicks, { tone: 'info' }),
    kpi('ctr', L('نسبة النقر', 'Click-through rate'), ctr, { format: 'percent', tone: 'positive' }),
    kpi('period', L('تقديمات الفترة', 'Submitted in period'), counts.submitted_in_period, { tone: 'info', sub: period.label }),
  ];
  const charts = [
    donutChart('byStatus', L('الإعلانات حسب الحالة', 'Advertisements by status'), byStatus, { labelFn: statusLabel }),
    barChart('byPlacement', L('حسب الموضع', 'By placement'),
      byPlacement.map((p) => ({ key: p.label, label: placementLabel(Array.isArray(p.label) ? p.label[0] : p.label), value: Number(p.count) }))),
    donutChart('byType', L('حسب النوع', 'By type'), byType, { labelFn: adTypeLabel }),
    barChart('byInstitution', L('حسب المؤسسة', 'By institution'),
      byInstitution.map((a) => ({ key: a.label, label: L(a.label, a.label), value: Number(a.count) }))),
  ];
  const rows = list.rows.map((a) => ({
    name: entityCell(a.name, { img: a.institution_image, sub: a.institution_name || '' }),
    ad_type: adTypeLabel(a.ad_type).ar,
    placement: (a.placement || []).map((p) => placementLabel(p).ar).join(' / ') || '—',
    effective_status: { v: a.effective_status, type: 'badge' },
    impressions: a.impressions, clicks: a.clicks,
    ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
    submitted_at: a.submitted_at || a.created_at,
  }));
  const tables = [table('ads', L('قائمة الإعلانات', 'Advertisements'),
    [COL('name', L('الإعلان', 'Advertisement'), 'entity'), COL('ad_type', L('النوع', 'Type')),
      COL('placement', L('الموضع', 'Placement')), COL('effective_status', L('الحالة', 'Status'), 'badge'),
      COL('impressions', L('الظهور', 'Impressions'), 'number'), COL('clicks', L('النقرات', 'Clicks'), 'number'),
      COL('ctr', L('نسبة النقر', 'CTR'), 'percent'), COL('submitted_at', L('التقديم', 'Submitted'), 'date')],
    rows, list.total, { limit: filters.limit || 25, offset: filters.offset || 0, total: list.total })];

  const notes = [];
  if (counts.impressions === 0 && counts.clicks === 0) notes.push({ tone: 'info', text: L('لم تُسجَّل ظهورات أو نقرات إعلانية بعد. تُعرض الأرقام فور تسجيلها من الواجهة العامة.', 'No advertisement impressions or clicks recorded yet. Figures appear as soon as they are recorded from the public UI.') });
  return base('advertisements', 'advertisements', L('تقرير الإعلانات', 'Advertisements report'),
    L('الحالة والمواضع والأداء', 'Status, placements and performance'), period, kpis, charts, tables, notes);
}

async function adPerformanceReport(period, filters) {
  const [counts, list] = await Promise.all([
    repo.adCounts({ from: period.from, to: period.to }),
    repo.adsList({ limit: filters.limit || 25, offset: filters.offset || 0 }, { ...filters }),
  ]);
  const withMetrics = list.rows.slice().sort((a, b) => (b.clicks - a.clicks) || (b.impressions - a.impressions));
  const ctr = counts.impressions > 0 ? (counts.clicks / counts.impressions) * 100 : 0;
  const zero = list.rows.filter((a) => (Number(a.impressions) || 0) === 0).length;
  const kpis = [
    kpi('impressions', L('إجمالي الظهور', 'Total impressions'), counts.impressions, { tone: 'info' }),
    kpi('clicks', L('إجمالي النقرات', 'Total clicks'), counts.clicks, { tone: 'positive' }),
    kpi('ctr', L('نسبة النقر الإجمالية', 'Overall CTR'), ctr, { format: 'percent', tone: 'primary' }),
    kpi('active', L('إعلانات نشطة', 'Active advertisements'), counts.active, { tone: 'positive' }),
    kpi('zero', L('بلا ظهورات', 'Ads with no impressions'), zero, { tone: 'warn' }),
  ];
  const charts = [
    barChart('topClicks', L('أعلى الإعلانات بالنقرات', 'Top advertisements by clicks'),
      withMetrics.filter((a) => (Number(a.clicks) || 0) > 0).slice(0, 10).map((a) => ({ key: a.id, label: L(a.name, a.name), value: Number(a.clicks) || 0 })),
      { tone: 'positive', empty: L('لا توجد نقرات مسجلة بعد.', 'No clicks recorded yet.') }),
    barChart('impressionsClicks', L('الظهور مقابل النقرات', 'Impressions vs clicks'),
      withMetrics.slice(0, 10).map((a) => ({ key: a.id, label: L(a.name, a.name), impressions: Number(a.impressions) || 0, clicks: Number(a.clicks) || 0 })),
      { type: 'bar', empty: L('لا توجد بيانات أداء مسجلة بعد.', 'No performance data recorded yet.'),
        series: [
          { key: 'impressions', label: L('الظهور', 'Impressions'), tone: 'primary' },
          { key: 'clicks', label: L('النقرات', 'Clicks'), tone: 'accent' },
        ] }),
  ];
  const rows = withMetrics.map((a) => ({
    name: entityCell(a.name, { img: a.institution_image, sub: a.institution_name || '' }),
    institution_name: a.institution_name || '—',
    effective_status: { v: a.effective_status, type: 'badge' },
    impressions: a.impressions, clicks: a.clicks,
    ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
  }));
  const tables = [table('performance', L('أداء الإعلانات', 'Advertisement performance'),
    [COL('name', L('الإعلان', 'Advertisement'), 'entity'), COL('institution_name', L('المؤسسة', 'Institution')),
      COL('effective_status', L('الحالة', 'Status'), 'badge'), COL('impressions', L('الظهور', 'Impressions'), 'number'),
      COL('clicks', L('النقرات', 'Clicks'), 'number'), COL('ctr', L('نسبة النقر', 'CTR'), 'percent')],
    rows, list.total, { limit: filters.limit || 25, offset: filters.offset || 0, total: list.total })];
  const notes = [{
    tone: 'warn',
    text: L('تُخزَّن الظهورات والنقرات كإجماليات تراكمية فقط، ولا يوجد جدول زمني يومي؛ لذلك لا تُعرض اتجاهات أداء تاريخية. البنية المقترحة لذلك موثّقة كعمل لاحق.',
      'Impressions and clicks are stored as cumulative totals only; there is no daily time-series table, so no historical performance trend is shown. The architecture for it is documented as future work.'),
  }];
  return base('ad-performance', 'advertisements', L('تقرير أداء الإعلانات', 'Advertisement performance report'),
    L('الظهور والنقرات ونسبة النقر', 'Impressions, clicks and click-through rate'), period, kpis, charts, tables, notes);
}

// ---------------------------------------------------------------------------
// Academic
// ---------------------------------------------------------------------------

async function academicReport(period, filters) {
  const [counts, delivery, byType, capacity, proposals] = await Promise.all([
    repo.academicCounts(), repo.stagesByDeliveryMode(), repo.offeringsByInstitutionType(),
    repo.capacityByStage(), repo.subjectProposals(),
  ]);
  const fill = counts.capacity > 0 ? (counts.students / counts.capacity) * 100 : 0;
  const kpis = [
    kpi('stages', L('المراحل الدراسية', 'Academic stages'), counts.stages, { tone: 'primary' }),
    kpi('grades', L('الصفوف', 'Grades'), counts.grades, { tone: 'info' }),
    kpi('subjects', L('المواد العامة', 'General subjects'), counts.subjects, { tone: 'info' }),
    kpi('org_subjects', L('مواد المؤسسات', 'Institution subjects'), counts.org_subjects, { tone: 'neutral', sub: L(`${counts.org_subjects_pending} قيد المراجعة`, `${counts.org_subjects_pending} pending`) }),
    kpi('offerings', L('عروض المراحل', 'Stage offerings'), counts.offerings, { tone: 'info' }),
    kpi('capacity', L('إجمالي السعة', 'Total capacity'), counts.capacity, { tone: 'positive' }),
    kpi('students', L('الطلاب المسجلون', 'Enrolled students'), counts.students, { tone: 'primary' }),
    kpi('fill', L('نسبة الإشغال', 'Fill rate'), fill, { format: 'percent', tone: 'warn' }),
    kpi('fees', L('بنود الرسوم الفعّالة', 'Active fee items'), counts.active_fees, { tone: 'neutral' }),
  ];
  const charts = [
    donutChart('delivery', L('عروض المراحل حسب طريقة الحضور', 'Stage offerings by delivery mode'), delivery, { labelFn: statusLabel }),
    barChart('offeringsByType', L('عروض المراحل حسب نوع المؤسسة', 'Stage offerings by institution type'),
      byType.map((r) => ({ key: r.label, label: orgTypeLabel(r.label), value: Number(r.count) }))),
    barChart('capacity', L('السعة مقابل الطلاب حسب المرحلة', 'Capacity vs students by stage'), capacity, {
      type: 'bar',
      empty: L('لم تُعلن أي سعة.', 'No capacity declared.'),
      series: [
        { key: 'capacity', label: L('السعة', 'Capacity'), tone: 'primary' },
        { key: 'students', label: L('الطلاب', 'Students'), tone: 'accent' },
      ],
    }),
  ];
  const tables = [table('proposals', L('مقترحات مواد المؤسسات', 'Institution subject proposals'),
    [COL('name', L('المادة', 'Subject')), COL('organization_name', L('المؤسسة', 'Institution')),
      COL('review_status', L('الحالة', 'Status'), 'badge'), COL('created_at', L('التاريخ', 'Date'), 'date')],
    proposals.map((p) => ({ name: p.name, organization_name: p.organization_name || '—', review_status: { v: p.review_status || 'pending', type: 'badge' }, created_at: p.created_at })),
    proposals.length)];
  return base('academic', 'academic', L('تقرير البيانات الأكاديمية', 'Academic report'),
    L('المراحل والمواد والسعة والرسوم', 'Stages, subjects, capacity and fees'), period, kpis, charts, tables, []);
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

async function locationsReport(period, filters) {
  const [counts, byGov] = await Promise.all([
    repo.locationCounts(),
    repo.entitiesByGovernorate(),
  ]);
  const govs = filters.governorateId
    ? byGov.filter((g) => String(g.governorate_id) === String(filters.governorateId))
    : byGov;
  const kpis = [
    kpi('countries', L('الدول', 'Countries'), counts.countries, { tone: 'primary' }),
    kpi('governorates', L('المحافظات', 'Governorates'), counts.governorates, { tone: 'info' }),
    kpi('districts', L('المديريات', 'Districts'), counts.districts, { tone: 'info' }),
    kpi('neighborhoods', L('الأحياء', 'Neighbourhoods'), counts.neighborhoods, { tone: 'neutral' }),
    kpi('orgs_geo', L('مؤسسات محددة الموقع', 'Geolocated institutions'), counts.orgs_geolocated, { tone: 'positive' }),
    kpi('teachers_geo', L('معلمون محددو الموقع', 'Geolocated teachers'), counts.teachers_geolocated, { tone: 'positive' }),
    kpi('users_geo', L('مستخدمون محددو الموقع', 'Geolocated users'), counts.users_geolocated, { tone: 'info' }),
  ];
  const charts = [
    barChart('institutions', L('المؤسسات حسب المحافظة', 'Institutions by governorate'),
      govs.filter((g) => g.institutions > 0).map((g) => ({ key: String(g.governorate_id), label: L(g.governorate, g.governorate), value: Number(g.institutions) }))),
    barChart('teachers', L('المعلمون حسب المحافظة', 'Teachers by governorate'),
      govs.filter((g) => g.teachers > 0).map((g) => ({ key: String(g.governorate_id), label: L(g.governorate, g.governorate), value: Number(g.teachers) })),
      { tone: 'accent', empty: L('لا يوجد معلمون محددو الموقع.', 'No geolocated teachers.') }),
    barChart('users', L('المستخدمون حسب المحافظة', 'Users by governorate'),
      govs.filter((g) => g.users > 0).map((g) => ({ key: String(g.governorate_id), label: L(g.governorate, g.governorate), value: Number(g.users) })),
      { tone: 'info', empty: L('لا يوجد مستخدمون محددو الموقع.', 'No geolocated users.') }),
  ];
  const rows = govs.map((g) => ({
    governorate: g.governorate,
    institutions: g.institutions, teachers: g.teachers, users: g.users, offers: g.offers,
  }));
  const tables = [table('governorates', L('الملخص الجغرافي حسب المحافظة', 'Geographic summary by governorate'),
    [COL('governorate', L('المحافظة', 'Governorate')), COL('institutions', L('المؤسسات', 'Institutions'), 'number'),
      COL('teachers', L('المعلمون', 'Teachers'), 'number'), COL('users', L('المستخدمون', 'Users'), 'number'),
      COL('offers', L('العروض', 'Offers'), 'number')],
    rows, rows.length)];
  return base('locations', 'locations', L('تقرير المواقع والجغرافيا', 'Locations report'),
    L('التوزيع الجغرافي للمنصة', 'The platform\'s geographic distribution'), period, kpis, charts, tables, []);
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

async function activityReport(period, filters) {
  const [counts, byAction, byEntity, series, actors, list, values] = await Promise.all([
    repo.activityCounts({ from: period.from, to: period.to }, filters),
    repo.activityByAction({ from: period.from, to: period.to }, filters),
    repo.activityByEntity({ from: period.from, to: period.to }, filters),
    repo.activityTimeSeries({ from: period.from, to: period.to, bucket: period.bucket }, filters),
    repo.activityActors({ from: period.from, to: period.to }),
    repo.activityList({ limit: filters.limit || 25, offset: filters.offset || 0 }, { ...filters }),
    repo.activityFilterValues(),
  ]);
  const kpis = [
    kpi('total', L('إجمالي الأحداث', 'Total events'), counts.total, { tone: 'primary' }),
    kpi('actors', L('المنفذون', 'Distinct actors'), counts.actors, { tone: 'info' }),
    kpi('actions', L('أنواع الإجراءات', 'Distinct actions'), counts.actions, { tone: 'info' }),
    kpi('entities', L('أنواع الكيانات', 'Distinct entities'), counts.entity_types, { tone: 'neutral' }),
    kpi('sensitive', L('أحداث حساسة', 'Sensitive events'), counts.sensitive, { tone: 'warn' }),
  ];
  const charts = [
    barChart('byAction', L('النشاط حسب الإجراء', 'Activity by action'),
      byAction.map((a) => ({ key: a.label, label: actionLabel(a.label), value: Number(a.count) }))),
    donutChart('byEntity', L('النشاط حسب الكيان', 'Activity by entity'), byEntity),
    { ...lineChart('overTime', L('النشاط خلال الفترة', 'Activity over the period'), fillSeries(series, period), { tone: 'primary' }), type: 'area' },
    barChart('actors', L('أكثر المنفذين نشاطاً', 'Most active actors'),
      actors.map((a) => ({ key: String(a.id || a.name), label: L(a.name, a.name), value: Number(a.count) })),
      { tone: 'accent' }),
  ];
  const rows = list.rows.map((a) => ({
    created_at: a.created_at,
    action: actionLabel(a.action).ar,
    object_type: a.object_type || '—',
    actor_name: a.actor_name || '—',
    organization_name: a.organization_name || '—',
    reason: a.reason || '—',
  }));
  const tables = [table('events', L('سجل الأحداث', 'Activity log'),
    [COL('created_at', L('الوقت', 'Time'), 'date'), COL('action', L('الإجراء', 'Action')),
      COL('object_type', L('الكيان', 'Entity')), COL('actor_name', L('المنفذ', 'Actor')),
      COL('organization_name', L('المؤسسة', 'Organization')), COL('reason', L('السبب', 'Reason'))],
    rows, list.total, { limit: filters.limit || 25, offset: filters.offset || 0, total: list.total })];

  const scope = scopeSummary(filters, { actor: (v) => L(v, v), action: actionLabel, entity: (v) => L(v, v) });
  return {
    ...base('activity', 'activity', L('تقرير النشاط والتدقيق', 'Activity and audit report'),
      L('أحداث النظام من سجل التدقيق', 'System events from the audit log'), period, kpis, charts, tables, [], scope),
    filterValues: values,
  };
}

// ---------------------------------------------------------------------------
// Shared assembly
// ---------------------------------------------------------------------------

function base(id, category, title, subtitle, period, kpis, charts, tables, notes, scope) {
  return {
    id, category, title, subtitle,
    period: {
      preset: period.preset,
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      fromLabel: period.fromLabel,
      toLabel: period.toLabel,
      label: period.label,
      bucket: period.bucket,
      spanDays: period.spanDays,
    },
    generatedAt: new Date().toISOString(),
    scope: scope || { filters: [] },
    kpis: kpis || [],
    charts: charts || [],
    tables: tables || [],
    notes: notes || [],
  };
}

function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function scopeSummary(filters, labelers) {
  const out = [];
  if (!filters) return { filters: out };
  Object.keys(filters).forEach((k) => {
    const v = filters[k];
    if (v == null || v === '' || ['limit', 'offset', 'from', 'to', 'preset', 'bucket'].includes(k)) return;
    const lab = labelers[k];
    out.push({ key: k, label: L(k, k), value: lab ? labelers[k](v).ar || labelers[k](v) : String(v) });
  });
  return { filters: out };
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

const REPORTS = {
  overview: overviewReport,
  institutions: institutionsReport,
  institution: institutionReport,
  teachers: teachersReport,
  teacher: teacherReport,
  users: usersReport,
  admissions: admissionsReport,
  offers: offersReport,
  advertisements: advertisementsReport,
  'ad-performance': adPerformanceReport,
  academic: academicReport,
  locations: locationsReport,
  activity: activityReport,
};

async function buildReport(type, query) {
  const fn = REPORTS[type];
  if (!fn) throw new ValidationError(`Unknown report type: ${type}`);
  const period = resolvePeriod(query);
  const filters = {
    orgType: clean(query.orgType),
    verified: clean(query.verified),
    governorateId: clean(query.governorateId),
    districtId: clean(query.districtId),
    countryCode: clean(query.countryCode),
    q: clean(query.q),
    status: clean(query.status),
    role: clean(query.role),
    adType: clean(query.adType),
    actorUserId: clean(query.actorUserId),
    action: clean(query.action),
    entityType: clean(query.entityType),
    organizationId: clean(query.organizationId),
    id: clean(query.id),
    limit: clampInt(query.limit, 25, 0, 5000),
    offset: clampInt(query.offset, 0, 0, 1000000),
  };
  const report = await fn(period, filters);
  return report;
}

function clean(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function clampInt(v, dflt, min, max) {
  const n = Number(v);
  if (!isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// ---------------------------------------------------------------------------
// Report catalog + filter options
// ---------------------------------------------------------------------------

const CATEGORIES = {
  executive: L('تنفيذي', 'Executive'),
  institutions: L('المؤسسات', 'Institutions'),
  teachers: L('المعلمون', 'Teachers'),
  users: L('المستخدمون والعملاء', 'Users & clients'),
  admissions: L('القبول والتسجيل', 'Admissions'),
  offers: L('العروض', 'Offers'),
  advertisements: L('الإعلانات', 'Advertisements'),
  academic: L('أكاديمي', 'Academic'),
  locations: L('الجغرافيا', 'Geography'),
  activity: L('النشاط والتدقيق', 'Activity & audit'),
};

const CATALOG = [
  { id: 'overview', category: 'executive', icon: 'chart', entity: false, filters: [], title: L('النظرة العامة التنفيذية', 'Executive overview'), subtitle: L('مؤشرات الأداء الرئيسية والنشاط العام', 'Key performance indicators and overall activity') },
  { id: 'institutions', category: 'institutions', icon: 'school', entity: false, filters: ['orgType', 'verified', 'governorateId', 'q'], title: L('تقرير المؤسسات', 'Institutions report'), subtitle: L('التوزيع والحالة والموقع والتاريخ', 'Distribution, status, location and history') },
  { id: 'institution', category: 'institutions', icon: 'building', entity: true, filters: [], title: L('تقرير مؤسسة واحدة', 'Single institution report'), subtitle: L('ملف مؤسسة كامل مع المراحل والرسوم والعروض', 'A full institution profile with stages, fees and offers') },
  { id: 'teachers', category: 'teachers', icon: 'teacher', entity: false, filters: [], title: L('تقرير المعلمين', 'Teachers report'), subtitle: L('العدد والحالة والتوزيع', 'Counts, status and distribution') },
  { id: 'teacher', category: 'teachers', icon: 'user', entity: true, filters: [], title: L('تقرير معلم واحد', 'Single teacher report'), subtitle: L('ملف معلم مع المواد والأسعار والوثائق', 'A teacher profile with subjects, pricing and documents') },
  { id: 'users', category: 'users', icon: 'users', entity: false, filters: ['role', 'status', 'q'], title: L('تقرير المستخدمين والعملاء', 'Users and clients report'), subtitle: L('الحسابات والأدوار وحالة الوصول', 'Accounts, roles and access status') },
  { id: 'admissions', category: 'admissions', icon: 'doc', entity: false, filters: ['status'], title: L('تقرير القبول والتسجيل', 'Admissions report'), subtitle: L('الطلبات وحالاتها', 'Applications and their status') },
  { id: 'offers', category: 'offers', icon: 'tag', entity: false, filters: ['status', 'orgType', 'governorateId'], title: L('تقرير العروض', 'Offers report'), subtitle: L('العروض وحالاتها وتوزيعها', 'Offers, their status and distribution') },
  { id: 'advertisements', category: 'advertisements', icon: 'sparkle', entity: false, filters: ['status', 'adType'], title: L('تقرير الإعلانات', 'Advertisements report'), subtitle: L('الحالة والمواضع والأداء', 'Status, placements and performance') },
  { id: 'ad-performance', category: 'advertisements', icon: 'chart', entity: false, filters: [], title: L('تقرير أداء الإعلانات', 'Advertisement performance report'), subtitle: L('الظهور والنقرات ونسبة النقر', 'Impressions, clicks and click-through rate') },
  { id: 'academic', category: 'academic', icon: 'college', entity: false, filters: [], title: L('تقرير البيانات الأكاديمية', 'Academic report'), subtitle: L('المراحل والمواد والسعة والرسوم', 'Stages, subjects, capacity and fees') },
  { id: 'locations', category: 'locations', icon: 'map', entity: false, filters: ['governorateId'], title: L('تقرير المواقع والجغرافيا', 'Locations report'), subtitle: L('التوزيع الجغرافي للمنصة', 'The platform\'s geographic distribution') },
  { id: 'activity', category: 'activity', icon: 'shield', entity: false, filters: ['actorUserId', 'action', 'entityType'], title: L('تقرير النشاط والتدقيق', 'Activity and audit report'), subtitle: L('أحداث النظام من سجل التدقيق', 'System events from the audit log') },
];

function catalog() {
  return CATALOG.map((c) => ({ ...c, categoryLabel: CATEGORIES[c.category] }))
    .concat([]);
}

// A small, current-state summary for the Reports Center banner. It is not a
// report (no period, no filters) — just the handful of live figures the header
// shows, kept light so the landing page never waits on a heavy aggregation.
async function headline() {
  const [counts, types, daily] = await Promise.all([
    repo.overviewCounts({}),
    repo.institutionTypeCounts({}),
    repo.activityDaily(14),
  ]);
  const dailyMap = {};
  daily.forEach((d) => { dailyMap[d.bucket] = d.count; });
  const series = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    series.push({ date: key, value: dailyMap[key] || 0 });
  }
  return {
    generatedAt: new Date().toISOString(),
    institutions: counts.orgs_total,
    verified: counts.orgs_verified,
    pendingInstitutions: counts.orgs_pending,
    teachers: counts.teachers_total,
    teachersActive: counts.teachers_active,
    users: counts.users_total,
    usersActive: counts.users_active,
    clients: counts.clients_total,
    offersActive: counts.offers_active,
    adsActive: counts.ads_active,
    adsPending: counts.ads_pending,
    pendingReview: counts.pending_ownership + counts.pending_locations + counts.pending_documents,
    activity: counts.activity_events,
    institutionsByType: types.map((t) => ({ type: t.type, label: orgTypeLabel(t.type), count: t.count })),
    activityDaily: series,
  };
}

async function filterOptions() {
  const [governorates, countries, actionValues, institutions, teachers, actors] = await Promise.all([
    repo.governoratesForFilter(),
    repo.countriesList(),
    repo.activityFilterValues(),
    repo.institutionsForFilter(),
    repo.teachersList({ limit: 500, offset: 0 }),
    repo.activityActors({ from: null, to: null }),
  ]);
  return {
    governorates: governorates.map((g) => ({ id: g.id, name: g.name, countryId: g.country_id })),
    countries,
    orgTypes: ORG_TYPE_ORDER.map((t) => ({ value: t, label: orgTypeLabel(t) })),
    statuses: Object.keys(STATUS).map((k) => ({ value: k, label: statusLabel(k) })),
    adTypes: Object.keys(AD_TYPES).map((k) => ({ value: k, label: adTypeLabel(k) })),
    roles: Object.keys(ROLES).map((k) => ({ value: k, label: roleLabel(k) })),
    actions: actionValues.actions.map((a) => ({ value: a, label: actionLabel(a) })),
    entities: actionValues.entities,
    institutions,
    teachers: teachers.rows.map((t) => ({ id: t.id, name: t.name || '—' })),
    actors: actors.map((a) => ({ id: a.id, name: a.name })),
    categories: CATEGORIES,
  };
}

// ---------------------------------------------------------------------------
// Saved reports
// ---------------------------------------------------------------------------

function mapSaved(row) {
  return { id: row.id, name: row.name, description: row.description, definition: row.definition, createdAt: row.created_at, updatedAt: row.updated_at };
}

async function listSavedReports(ownerUserId) {
  return (await repo.listSavedReports(ownerUserId)).map(mapSaved);
}

async function createSavedReport(ownerUserId, body) {
  const name = String(body.name || '').trim();
  if (name.length < 2) throw new ValidationError('A saved report needs a name of at least 2 characters.');
  if (!body.definition || typeof body.definition !== 'object') throw new ValidationError('A saved report needs a definition object.');
  return mapSaved(await repo.createSavedReport(ownerUserId, { name, description: body.description ? String(body.description).slice(0, 280) : null, definition: body.definition }));
}

async function deleteSavedReport(ownerUserId, id) {
  const row = await repo.deleteSavedReport(ownerUserId, id);
  if (!row) throw new NotFoundError('Saved report not found');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Import Center — institutions
// ---------------------------------------------------------------------------

function normalizeKey(v) {
  return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugify(v) {
  return String(v == null ? '' : v).toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function importInstitutions(actorUserId, body) {
  const rowsIn = Array.isArray(body.rows) ? body.rows : [];
  if (!rowsIn.length) throw new ValidationError('No rows to import.');
  if (rowsIn.length > 1000) throw new ValidationError('Too many rows: the limit is 1000 per import.');

  const [govs, dists, existing] = await Promise.all([
    repo.governorateIndex(),
    repo.districtIndex(),
    repo.organizationSlugIndex(),
  ]);

  const govByName = {};
  const govById = {};
  govs.forEach((g) => { govByName[normalizeKey(g.name)] = g; govById[String(g.id)] = g; });
  const distByGovName = {};
  const distById = {};
  dists.forEach((d) => {
    distByGovName[String(d.governorate_id) + '|' + normalizeKey(d.name)] = d;
    distById[String(d.id)] = d;
  });
  const slugSet = {};
  const nameTypeSet = {};
  existing.forEach((o) => {
    if (o.slug) slugSet[o.slug] = true;
    if (o.name) nameTypeSet[normalizeKey(o.name) + '|' + (o.type || '')] = true;
  });

  const errors = [];
  const valid = [];
  const seen = {};

  rowsIn.forEach((raw, idx) => {
    const rowNo = idx + 2;
    const name = String(raw.name || '').trim();
    const type = String(raw.type || '').trim().toLowerCase();
    const rowErrs = [];
    if (name.length < 2) rowErrs.push({ field: 'name', message: 'Name is required (at least 2 characters).' });
    if (!ORG_TYPES[type]) rowErrs.push({ field: 'type', message: 'Type must be one of: ' + Object.keys(ORG_TYPES).join(', ') + '.' });

    let gov = null;
    const govRaw = String(raw.governorate || '').trim();
    if (govRaw) {
      gov = govById[govRaw] || govByName[normalizeKey(govRaw)] || null;
      if (!gov) rowErrs.push({ field: 'governorate', message: 'Unknown governorate: ' + govRaw });
    }

    let dist = null;
    const distRaw = String(raw.district || '').trim();
    if (distRaw) {
      if (gov) dist = distByGovName[String(gov.id) + '|' + normalizeKey(distRaw)] || null;
      else {
        const matches = dists.filter((d) => normalizeKey(d.name) === normalizeKey(distRaw));
        if (matches.length === 1) dist = matches[0];
      }
      if (!dist) rowErrs.push({ field: 'district', message: 'Unknown district: ' + distRaw });
      if (dist && gov && String(dist.governorate_id) !== String(gov.id)) {
        rowErrs.push({ field: 'district', message: 'The district does not belong to the chosen governorate.' });
      }
    }

    const email = String(raw.email || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrs.push({ field: 'email', message: 'Invalid email address.' });

    const key = normalizeKey(name) + '|' + type;
    if (seen[key]) rowErrs.push({ field: 'name', message: 'Duplicate row within this file.' });
    if (nameTypeSet[key]) rowErrs.push({ field: 'name', message: 'An institution with this name and type already exists.' });

    if (rowErrs.length) {
      rowErrs.forEach((e) => errors.push({ row: rowNo, field: e.field, message: e.message }));
      return;
    }
    seen[key] = true;

    let base = slugify(name) || ('import-' + idx + '-' + Date.now().toString(36));
    let slug = base;
    let n = 2;
    while (slugSet[slug]) { slug = base + '-' + n; n++; }
    slugSet[slug] = true;

    valid.push({
      name, type, slug,
      description: String(raw.description || '').trim(),
      phone: String(raw.phone || '').trim(),
      email,
      principal_name: String(raw.principal_name || '').trim(),
      governorate_id: gov ? gov.id : null,
      district_id: dist ? dist.id : null,
      country_code: gov && gov.country_code ? gov.country_code : null,
    });
  });

  const summary = {
    total: rowsIn.length,
    valid: valid.length,
    invalid: errors.length,
    errors: errors.slice(0, 200),
    preview: valid.slice(0, 20).map((v) => ({ name: v.name, type: v.type })),
  };

  if (body.dryRun) return { ...summary, dryRun: true };

  if (errors.length) throw new ValidationError(`Import refused: ${errors.length} row(s) failed validation.`);
  if (!valid.length) throw new ValidationError('No valid rows to import.');

  const inserted = await repo.insertImportedInstitutions(valid);
  await writeAudit({
    actorUserId,
    action: 'import',
    entityType: 'organization',
    entityId: null,
    newValues: { report: 'institutions', count: inserted.length, names: inserted.slice(0, 20).map((r) => r.name) },
  });

  return { ...summary, dryRun: false, imported: inserted.length, preview: [] };
}

module.exports = { buildReport, resolvePeriod, REPORTS, catalog, filterOptions, headline, listSavedReports, createSavedReport, deleteSavedReport, importInstitutions };
