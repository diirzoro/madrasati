// reports-center.js — MADARASATI Reporting & Analytics Center.
//
// One module owns the whole Reports experience: catalog, executive overview,
// per-domain reports, global reporting period, filters, drill-down, charts,
// tables, saved reports, the Export Center and the Import Center.
//
// It renders the same normalized report model that the exports consume, so the
// screen is the source of truth for the file. The server owns aggregation and
// access control; this file only presents what the API returns and never
// fabricates a figure.
(function () {
  "use strict";

  function T(ar, en) { return lang === "ar" ? ar : en; }
  function errText(e) { return (e && e.data && e.data.error) || (e && e.message) || T("تعذر تحميل البيانات.", "Unable to load data."); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function fmtNum(v) { return num(v).toLocaleString("en-US"); }
  function fmtVal(kpi) {
    if (kpi.format === "percent") return (Math.round(num(kpi.value) * 10) / 10) + "%";
    return fmtNum(kpi.value);
  }
  function fmtDate(v) {
    if (!v) return "—";
    try { return new Date(v).toLocaleDateString(lang === "ar" ? "ar-YE" : "en-GB", { year: "numeric", month: "short", day: "numeric" }); }
    catch (e) { return String(v); }
  }
  function fmtDateTime(v) {
    if (!v) return "—";
    try { return new Date(v).toLocaleString(lang === "ar" ? "ar-YE" : "en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return String(v); }
  }
  function ar(o) { return lang === "ar" ? o.ar : o.en; }
  function labelVal(l) { return l ? ar(l) : ""; }

  function hashQuery() {
    var q = {};
    try {
      var s = (location.hash.split("?")[1] || "");
      s.split("&").forEach(function (pair) {
        if (!pair) return;
        var i = pair.indexOf("=");
        var k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
        var v = i < 0 ? "" : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
        q[k] = v;
      });
    } catch (e) { /* ignore */ }
    return q;
  }

  function rpBadge(v, extra) {
    var ok = ["active", "verified", "approved", "accepted", "completed", "confirmed"];
    var bad = ["suspended", "rejected", "deleted", "cancelled", "inactive", "expired"];
    var tone = ok.indexOf(v) > -1 ? "ok" : bad.indexOf(v) > -1 ? "bad" : "wait";
    return '<span class="rp-badge ' + tone + '">' + esc(statusLabel(v)) + (extra ? ' ' + esc(extra) : '') + '</span>';
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  var rp = {
    initialized: false,
    view: "catalog",
    type: "overview",
    entityId: null,
    period: { preset: "last_30", from: "", to: "" },
    filters: {},
    newOnly: true,
    catalog: null,
    headline: null,
    headlineLoading: false,
    options: null,
    optionsLoading: false,
    loading: false,
    error: null,
    data: null,
    dataKey: null,
    pendingExport: false,
    saved: null,
    savedLoading: false,
    saveModal: null,
    catalogSearch: "",
    offset: 0,
    tableSort: {},
    tableSearch: {},
    hiddenCols: {},
    importState: { target: "institutions", rows: null, fileName: "", result: null, loading: false, error: null },
  };

  var CATEGORY_ORDER = ["executive", "institutions", "teachers", "users", "admissions", "offers", "advertisements", "academic", "locations", "activity"];

  var PERIODS = [
    ["today", "اليوم", "Today"], ["yesterday", "أمس", "Yesterday"],
    ["this_week", "هذا الأسبوع", "This week"], ["last_week", "الأسبوع الماضي", "Last week"],
    ["last_7", "آخر 7 أيام", "Last 7 days"], ["last_30", "آخر 30 يوماً", "Last 30 days"],
    ["this_month", "هذا الشهر", "This month"], ["last_month", "الشهر الماضي", "Last month"],
    ["this_quarter", "هذا الربع", "This quarter"], ["last_quarter", "الربع الماضي", "Last quarter"],
    ["this_year", "هذه السنة", "This year"], ["last_year", "السنة الماضية", "Last year"],
    ["custom", "نطاق مخصص", "Custom range"],
  ];

  var ACTION_LABELS = {
    login: ["دخول", "Login"], create: ["إنشاء", "Create"], update: ["تحديث", "Update"], delete: ["حذف", "Delete"],
    upload: ["رفع", "Upload"], submit: ["تقديم", "Submit"], resubmit: ["إعادة تقديم", "Resubmit"],
    review_approve: ["اعتماد", "Approve"], review_reject: ["رفض", "Reject"], pause: ["إيقاف", "Pause"],
    resume: ["استئناف", "Resume"], cancel: ["إلغاء", "Cancel"], archive: ["أرشفة", "Archive"],
    staff_added: ["إضافة كادر", "Staff added"], staff_archived: ["أرشفة كادر", "Staff archived"],
    staff_restored: ["استعادة كادر", "Staff restored"], staff_changed: ["تعديل كادر", "Staff changed"],
    membership_created: ["إنشاء عضوية", "Membership created"], membership_removed: ["إزالة عضوية", "Membership removed"],
    membership_changed: ["تعديل عضوية", "Membership changed"],
    permission_override_changed: ["تعديل صلاحية", "Permission changed"], permission_override_removed: ["إزالة صلاحية", "Permission removed"],
  };
  function actionLabel(v) { var p = ACTION_LABELS[v]; return p ? T(p[0], p[1]) : v; }

  var ENTITY_LABELS = {
    organization: ["مؤسسة", "Institution"], offer: ["عرض", "Offer"], advertisement: ["إعلان", "Advertisement"],
    user: ["مستخدم", "User"], teacher: ["معلم", "Teacher"], client_profile: ["ملف عميل", "Client profile"],
    client_feedback: ["ملاحظة عميل", "Client feedback"], organization_membership: ["عضوية كادر", "Membership"],
    system_setting: ["إعداد", "Setting"], image: ["صورة", "Image"], organization_media: ["وسائط مؤسسة", "Institution media"],
    organization_stage_offer: ["عرض مرحلة", "Stage offering"], country: ["دولة", "Country"],
  };
  function entityLabel(v) { var p = ENTITY_LABELS[v]; return p ? T(p[0], p[1]) : (v || "—"); }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  function ensure() {
    if (!rp.optionsLoading && !rp.options) {
      rp.optionsLoading = true;
      apiGet("/api/reports/filter-options").then(function (d) { rp.options = d; rp.optionsLoading = false; render(); })
        .catch(function () { rp.optionsLoading = false; render(); });
    }
    if (!rp.catalog) {
      apiGet("/api/reports/catalog").then(function (d) { rp.catalog = d.items || []; render(); })
        .catch(function (e) { rp.catalog = []; rp.error = errText(e); render(); });
    }
    if (!rp.headline && !rp.headlineLoading) {
      rp.headlineLoading = true;
      apiGet("/api/reports/headline").then(function (d) { rp.headline = d; rp.headlineLoading = false; render(); })
        .catch(function () { rp.headlineLoading = false; render(); });
    }
    loadSaved();
  }

  function loadSaved() {
    if (rp.saved || rp.savedLoading) return;
    rp.savedLoading = true;
    apiGet("/api/reports/saved").then(function (d) { rp.saved = d.items || []; rp.savedLoading = false; render(); })
      .catch(function () { rp.saved = []; rp.savedLoading = false; render(); });
  }

  function queryString() {
    var p = ["type=" + encodeURIComponent(rp.type)];
    if (rp.period.preset !== "custom") p.push("preset=" + rp.period.preset);
    if (rp.period.from) p.push("from=" + encodeURIComponent(rp.period.from));
    if (rp.period.to) p.push("to=" + encodeURIComponent(rp.period.to));
    if (rp.entityId) p.push("id=" + encodeURIComponent(rp.entityId));
    if (rp.offset) p.push("offset=" + rp.offset);
    Object.keys(rp.filters || {}).forEach(function (k) {
      var v = rp.filters[k];
      if (v != null && v !== "") p.push(k + "=" + encodeURIComponent(v));
    });
    return p.join("&");
  }

  function loadReport(force, limitOverride) {
    var qs = queryString();
    if (limitOverride) qs += "&limit=" + limitOverride;
    var key = qs;
    if (!force && rp.dataKey === key && rp.data) return;
    rp.loading = true; rp.error = null; rp.dataKey = key;
    apiGet("/api/reports/report?" + qs).then(function (d) {
      rp.data = d; rp.loading = false; render();
    }).catch(function (e) {
      rp.loading = false; rp.error = errText(e); render();
    });
  }

  function fetchModel(limitOverride) {
    var qs = queryString();
    if (limitOverride) qs += "&limit=" + limitOverride;
    return apiGet("/api/reports/report?" + qs);
  }

  // ---------------------------------------------------------------------------
  // Small UI primitives
  // ---------------------------------------------------------------------------

  function spinner() { return '<div class="rp-loading"><div class="loader"></div></div>'; }

  function brandHeader(title, subtitle) {
    return '<header class="rp-hero"><div class="rp-hero-brand"><span class="rp-mark">م</span>' +
      '<div><div class="rp-hero-eyebrow">MADARASATI</div><h1>' + esc(title) + '</h1>' +
      '<p>' + esc(subtitle) + '</p></div></div></header>';
  }

  // A static, image-led banner carrying live headline figures and two small
  // visuals. It is deliberately read-only: the numbers come from one light
  // /api/reports/headline call, so the landing page never waits on a heavy
  // aggregation and never shows a figure no report would confirm.
  function hstat(iconName, value, labelAr, labelEn, sub, tone) {
    return '<div class="rp-hstat tone-' + (tone || "primary") + '">' +
      '<span class="rp-hstat-ico">' + icon(iconName, 18) + '</span>' +
      '<b>' + fmtNum(value) + '</b>' +
      '<span class="rp-hstat-label">' + T(labelAr, labelEn) + '</span>' +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
  }

  function rpMiniDonut(categories) {
    var cats = (categories || []).filter(function (c) { return num(c.count) > 0; });
    var total = cats.reduce(function (n, c) { return n + num(c.count); }, 0) || 1;
    var r = 34, cx = 44, cy = 44, C = 2 * Math.PI * r, acc = 0;
    var palette = ["#7FD1AE", "#E8A87C", "#8FC3E0", "#F2C879", "#C7A8E0", "#E39A8F"];
    var arcs = cats.map(function (c, i) {
      var f = num(c.count) / total;
      var dash = (f * C).toFixed(2), gap = (C - f * C).toFixed(2), off = (-acc * C).toFixed(2);
      acc += f;
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + palette[i % palette.length] +
        '" stroke-width="13" stroke-dasharray="' + dash + ' ' + gap + '" stroke-dashoffset="' + off +
        '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + esc(labelVal(c.label)) + ': ' + c.count + '</title></circle>';
    }).join("");
    var legend = cats.slice(0, 4).map(function (c, i) {
      return '<span class="rp-hviz-leg"><i style="background:' + palette[i % palette.length] + '"></i>' + esc(labelVal(c.label)) + ' ' + c.count + '</span>';
    }).join("");
    return '<div class="rp-hviz-donut"><svg viewBox="0 0 88 88" role="img">' + arcs +
      '<text x="44" y="42" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">' + total + '</text>' +
      '<text x="44" y="57" text-anchor="middle" font-size="8" fill="rgba(255,255,255,.82)">' + T("مؤسسة", "inst.") + '</text>' +
      '</svg><div class="rp-hviz-legend">' + legend + '</div></div>';
  }

  function rpSparkline(points) {
    var vals = (points || []).map(function (p) { return num(p.value); });
    if (!vals.length) vals = [0, 0];
    var max = Math.max.apply(null, vals.concat([1]));
    var w = 220, h = 56, pad = 4;
    var step = (w - pad * 2) / Math.max(1, vals.length - 1);
    var pts = vals.map(function (v, i) { return [pad + i * step, h - pad - (v / max) * (h - pad * 2)]; });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var area = line + " L" + pts[pts.length - 1][0].toFixed(1) + " " + (h - pad) + " L" + pad + " " + (h - pad) + " Z";
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img">' +
      '<path d="' + area + '" fill="rgba(255,255,255,.2)"/>' +
      '<path d="' + line + '" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  }

  function heroHeader(title, subtitle) {
    var h = rp.headline;
    var stats = h ? (
      hstat("school", h.institutions, "المؤسسات التعليمية", "Institutions", T(h.verified + " موثّقة", h.verified + " verified"), "primary") +
      hstat("teacher", h.teachers, "المعلمون", "Teachers", T(h.teachersActive + " فعّال", h.teachersActive + " active"), "info") +
      hstat("users", h.users, "المستخدمون", "Users", T(h.usersActive + " فعّال", h.usersActive + " active"), "positive") +
      hstat("sparkle", h.adsActive, "إعلانات نشطة", "Active ads", T(h.adsPending + " قيد المراجعة", h.adsPending + " pending"), "warn")
    ) : "";
    var visuals = h ? (
      '<div class="rp-hviz"><div class="rp-hviz-title">' + T("المؤسسات حسب النوع", "Institutions by type") + '</div>' + rpMiniDonut(h.institutionsByType) + '</div>' +
      '<div class="rp-hviz"><div class="rp-hviz-title">' + T("النشاط — آخر 14 يوماً", "Activity — last 14 days") + '</div>' +
        rpSparkline(h.activityDaily) +
        '<div class="rp-hviz-foot">' + T("إجمالي الأحداث", "Total events") + ': <b>' + fmtNum(h.activity) + '</b></div></div>'
    ) : "";
    return '<header class="rp-hero rp-hero-rich"><div class="rp-hero-photo"></div><div class="rp-hero-inner">' +
      '<div class="rp-hero-head"><div class="rp-hero-brand"><span class="rp-mark">م</span><div>' +
        '<div class="rp-hero-eyebrow">MADARASATI</div><h1>' + esc(title) + '</h1><p>' + esc(subtitle) + '</p></div></div>' +
        (h ? '<div class="rp-hero-refresh"><span class="rp-live-dot"></span>' + T("آخر تحديث", "Last refresh") + ' · ' + esc(fmtDateTime(h.generatedAt)) + '</div>' : "") +
      '</div>' +
      (h ? '<div class="rp-hero-lower"><div class="rp-hstats">' + stats + '</div><div class="rp-hvisuals">' + visuals + '</div></div>' : "") +
    '</div></header>';
  }

  function reportCard(item) {
    return '<article class="rp-card" tabindex="0" role="button" onclick="rpOpen(\'' + item.id + '\')" ' +
      'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();rpOpen(\'' + item.id + '\')}">' +
      '<div class="rp-card-top"><span class="rp-card-ico">' + icon(item.icon || "chart", 22) + '</span>' +
      (item.entity ? '<span class="rp-card-tag">' + T("تقرير كيان", "Entity") + '</span>' : '') + '</div>' +
      '<h3>' + esc(ar(item.title)) + '</h3>' +
      '<p>' + esc(ar(item.subtitle)) + '</p>' +
      '<span class="rp-card-go">' + T("عرض التقرير", "Open report") + ' ' + icon("back", 14) + '</span></article>';
  }

  function catalogView() {
    var search = (rp.catalogSearch || "").trim().toLowerCase();
    var items = (rp.catalog || []).filter(function (it) {
      if (!search) return true;
      return (ar(it.title) + " " + ar(it.subtitle) + " " + it.id).toLowerCase().indexOf(search) > -1;
    });
    var savedChips = (rp.saved || []).slice(0, 4).map(function (s) {
      var d = s.definition || {};
      return '<button class="rp-chip" onclick="rpOpenSaved(\'' + esc(s.id) + '\')">' + icon("book", 13) + ' ' + esc(s.name) + '</button>';
    }).join("");

    var sections = CATEGORY_ORDER.map(function (cat) {
      var group = items.filter(function (it) { return it.category === cat; });
      if (!group.length) return "";
      var catLabel = firstCategoryLabel(cat);
      return '<section class="rp-cat"><h2 class="rp-cat-title"><span>' + esc(catLabel) + '</span></h2>' +
        '<div class="rp-cards">' + group.map(reportCard).join("") + '</div></section>';
    }).join("");

    return shell(
      heroHeader(T("التقارير والتحليلات", "Reports & Analytics"),
        T("نظرة شاملة على أداء ونشاط منصة مدرستي", "A complete view of the Madrasati platform's performance and activity")) +
      '<div class="rp-actions">' +
        '<button class="rp-btn primary" onclick="rpSetView(\'report\');rpOpen(\'overview\')">' + icon("chart", 16) + ' ' + T("التقرير التنفيذي", "Executive report") + '</button>' +
        '<button class="rp-btn" onclick="rpSetView(\'export\')">' + icon("download", 16) + ' ' + T("مركز التصدير", "Export Center") + '</button>' +
        '<button class="rp-btn" onclick="rpSetView(\'import\')">' + icon("sheet", 16) + ' ' + T("مركز الاستيراد", "Import Center") + '</button>' +
      '</div>' +
      (savedChips ? '<div class="rp-saved-row"><span class="rp-saved-label">' + icon("heart", 14) + ' ' + T("تقاريري المحفوظة", "My saved reports") + '</span>' + savedChips + '</div>' : "") +
      '<div class="rp-search"><span>' + icon("search", 16) + '</span>' +
        '<input id="rp-catalog-q" placeholder="' + T("ابحث عن تقرير… مثال: العروض، المؤسسات، الإعلانات", "Search reports… e.g. offers, institutions, ads") + '" value="' + esc(rp.catalogSearch) + '" oninput="rpCatalogSearch(this.value)">' +
      '</div>' +
      (sections || '<div class="rp-empty">' + T("لا توجد تقارير مطابقة للبحث.", "No reports match the search.") + '</div>')
    );
  }

  function firstCategoryLabel(cat) {
    var host = (rp.catalog || []).filter(function (i) { return i.category === cat; })[0];
    if (host && rp.options && rp.options.categories && rp.options.categories[cat]) return ar(rp.options.categories[cat]);
    return cat;
  }

  // ---------------------------------------------------------------------------
  // Report view
  // ---------------------------------------------------------------------------

  function reportNav() {
    var active = rp.type;
    return '<div class="rp-nav">' + (rp.catalog || []).filter(function (it) { return !it.entity; }).map(function (it) {
      return '<button class="' + (it.id === active ? "active" : "") + '" onclick="rpOpen(\'' + it.id + '\')">' +
        icon(it.icon || "chart", 14) + '<span>' + esc(ar(it.title)) + '</span></button>';
    }).join("") + '</div>';
  }

  function periodBar() {
    var opts = PERIODS.map(function (p) {
      return '<option value="' + p[0] + '"' + (rp.period.preset === p[0] ? " selected" : "") + '>' + esc(T(p[1], p[2])) + '</option>';
    }).join("");
    var custom = rp.period.preset === "custom";
    return '<div class="rp-period">' +
      '<span class="rp-period-ico">' + icon("calendar", 16) + '</span>' +
      '<select onchange="rpSetPreset(this.value)">' + opts + '</select>' +
      '<input type="date" class="rp-date" value="' + esc(rp.period.from) + '" onchange="rpSetCustom(\'from\',this.value)"' + (custom ? "" : ' style="display:none"') + '>' +
      '<span class="rp-date-sep"' + (custom ? "" : ' style="display:none"') + '>→</span>' +
      '<input type="date" class="rp-date" value="' + esc(rp.period.to) + '" onchange="rpSetCustom(\'to\',this.value)"' + (custom ? "" : ' style="display:none"') + '>' +
      '<button class="rp-icon-btn" title="' + T("تحديث", "Refresh") + '" onclick="rpRefresh()">' + icon("back", 15) + '</button>' +
      '</div>';
  }

  function filterBar(item) {
    var keys = (item && item.filters) || [];
    if (!keys.length) return "";
    var o = rp.options || {};
    var controls = keys.map(function (k) {
      var cur = rp.filters[k] || "";
      if (k === "q") {
        return '<div class="rp-field"><label>' + T("بحث", "Search") + '</label><input value="' + esc(cur) + '" placeholder="' + T("اسم…", "Name…") + '" oninput="rpSetFilter(\'q\',this.value,true)"></div>';
      }
      if (k === "verified") {
        return selField(k, cur, [["", T("الكل", "All")], ["verified", T("موثّق", "Verified")], ["pending", T("قيد المراجعة", "Pending")]]);
      }
      if (k === "orgType") return selField(k, cur, [["", T("كل الأنواع", "All types")]].concat((o.orgTypes || []).map(function (x) { return [x.value, ar(x.label)]; })));
      if (k === "governorateId") return selField(k, cur, [["", T("كل المحافظات", "All governorates")]].concat((o.governorates || []).map(function (x) { return [String(x.id), x.name]; })));
      if (k === "countryCode") return selField(k, cur, [["", T("كل الدول", "All countries")]].concat((o.countries || []).map(function (x) { return [x.code, x.name]; })));
      if (k === "role") return selField(k, cur, [["", T("كل الأدوار", "All roles")]].concat((o.roles || []).map(function (x) { return [x.value, ar(x.label)]; })));
      if (k === "status") return selField(k, cur, [["", T("كل الحالات", "All statuses")]].concat((o.statuses || []).map(function (x) { return [x.value, ar(x.label)]; })));
      if (k === "adType") return selField(k, cur, [["", T("كل الأنواع", "All types")]].concat((o.adTypes || []).map(function (x) { return [x.value, ar(x.label)]; })));
      if (k === "action") return selField(k, cur, [["", T("كل الإجراءات", "All actions")]].concat((o.actions || []).map(function (x) { return [x.value, ar(x.label)]; })));
      if (k === "entityType") return selField(k, cur, [["", T("كل الكيانات", "All entities")]].concat((o.entities || []).map(function (x) { return [x, entityLabel(x)]; })));
      if (k === "actorUserId") return selField(k, cur, [["", T("كل المنفذين", "All actors")]].concat((o.actors || []).map(function (x) { return [String(x.id), x.name]; })));
      return "";
    }).join("");
    var any = keys.some(function (k) { return rp.filters[k]; });
    return '<div class="rp-filters">' + controls +
      (any ? '<button class="rp-clear" onclick="rpClearFilters()">' + icon("x", 13) + ' ' + T("مسح التصفية", "Clear filters") + '</button>' : "") + '</div>';
  }

  function selField(k, cur, pairs) {
    return '<div class="rp-field"><label>' + filterLabel(k) + '</label><select onchange="rpSetFilter(\'' + k + '\',this.value)">' +
      pairs.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(cur) === String(p[0]) ? " selected" : "") + '>' + esc(p[1]) + '</option>'; }).join("") +
      '</select></div>';
  }

  function filterLabel(k) {
    var m = {
      orgType: ["نوع المؤسسة", "Institution type"], verified: ["التحقق", "Verification"], governorateId: ["المحافظة", "Governorate"],
      countryCode: ["الدولة", "Country"], q: ["بحث", "Search"], status: ["الحالة", "Status"], role: ["الدور", "Role"],
      adType: ["نوع الإعلان", "Ad type"], action: ["الإجراء", "Action"], entityType: ["الكيان", "Entity"], actorUserId: ["المنفذ", "Actor"],
    };
    return m[k] ? T(m[k][0], m[k][1]) : k;
  }

  function coverHeader(model) {
    var e = model.scope && model.scope.entity;
    var scopeBits = (model.scope && model.scope.filters || []).map(function (f) {
      return '<span class="rp-scope-chip"><b>' + esc(labelVal(f.label)) + '</b> ' + esc(f.value) + '</span>';
    }).join("");
    return '<section class="rp-cover">' +
      (e ? '<div class="rp-cover-entity">' + (e.logo ? '<img src="' + esc(e.logo) + '" alt="" onerror="this.style.display=\'none\'">' :
        '<span class="rp-cover-mark">' + esc((e.name || "م").charAt(0)) + '</span>') +
        '<div><h2>' + esc(e.name) + '</h2><small>' + esc(labelVal(e.type)) + (e.location ? ' · ' + esc(e.location) : '') + '</small></div></div>' : "") +
      '<div class="rp-cover-main">' +
        '<div class="rp-cover-eyebrow">MADARASATI · ' + T("تقرير", "Report") + '</div>' +
        '<h1>' + esc(labelVal(model.title)) + '</h1>' +
        '<p>' + esc(labelVal(model.subtitle)) + '</p>' +
        '<div class="rp-scope">' +
          '<span class="rp-scope-chip"><b>' + T("الفترة", "Period") + '</b> ' + esc(labelVal(model.period.label)) + ' · ' + esc(model.period.fromLabel) + ' → ' + esc(model.period.toLabel) + '</span>' +
          scopeBits +
          '<span class="rp-scope-chip muted"><b>' + T("أُنشئ", "Generated") + '</b> ' + esc(fmtDateTime(model.generatedAt)) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="rp-cover-actions">' +
        '<button class="rp-btn" onclick="rpPrint()">' + icon("printer", 15) + ' ' + T("طباعة", "Print") + '</button>' +
        '<div class="rp-menu-wrap"><button class="rp-btn primary" onclick="rpToggleExportMenu(event)">' + icon("download", 15) + ' ' + T("تصدير", "Export") + ' ' + icon("back", 12) + '</button>' +
          '<div class="rp-menu" id="rp-export-menu">' +
            '<button onclick="rpExport(\'pdf\')">' + icon("pdf", 15) + ' PDF</button>' +
            '<button onclick="rpExport(\'xlsx\')">' + icon("sheet", 15) + ' Excel (.xlsx)</button>' +
            '<button onclick="rpExport(\'docx\')">' + icon("doc", 15) + ' Word (.docx)</button>' +
            '<button onclick="rpExport(\'csv\')">' + icon("file", 15) + ' CSV</button>' +
          '</div></div>' +
        '<button class="rp-btn" onclick="rpSaveOpen()">' + icon("heart", 15) + ' ' + T("حفظ", "Save") + '</button>' +
      '</div>' +
    '</section>';
  }

  function kpiGrid(model) {
    var toneIcon = { primary: "school", positive: "check", info: "chart", warn: "info", neutral: "list", negative: "x" };
    return '<section class="rp-kpis">' + (model.kpis || []).map(function (k) {
      var trend = "";
      if (k.trend) {
        if (k.trend.percent != null) {
          trend = '<span class="rp-trend ' + k.trend.direction + '">' + (k.trend.direction === "up" ? "▲" : k.trend.direction === "down" ? "▼" : "•") +
            ' ' + k.trend.percent + '%</span>';
        } else {
          trend = '<span class="rp-trend new">' + T("جديد", "New") + '</span>';
        }
      }
      var clickable = k.href ? ' rp-kpi-click" tabindex="0" role="button" onclick="rpKpiGo(\'' + esc(k.href) + '\')"' : '"';
      return '<div class="rp-kpi tone-' + k.tone + (k.href ? " is-click" : "") + clickable + '>' +
        '<div class="rp-kpi-head"><span class="rp-kpi-ico">' + icon(toneIcon[k.tone] || "chart", 17) + '</span>' + trend + '</div>' +
        '<b>' + esc(fmtVal(k)) + '</b>' +
        '<span>' + esc(labelVal(k.label)) + '</span>' +
        (k.sub ? '<small>' + esc(labelVal(k.sub)) + '</small>' : "") +
        '</div>';
    }).join("") + '</section>';
  }

  function chartCard(chart) {
    var empty = !chart.categories || !chart.categories.length || chart.categories.every(function (x) {
      var vals = (chart.series || []).map(function (s) { return num(x[s.key]); });
      vals.push(num(x.value));
      return vals.every(function (v) { return !v; });
    });
    var svg = empty ? "" : window.ReportCharts.render(chart, { rtl: lang === "ar", text: "currentColor", grid: "currentColor", lang: lang, totalLabel: T("الإجمالي", "Total"), width: 420 });
    var fk = chartFilterKey(chart.key);
    var chips = "";
    if (!empty && fk && chart.categories) {
      chips = '<div class="rp-chart-chips">' + chart.categories.slice(0, 12).map(function (c) {
        return '<button class="rp-chip' + (String(rp.filters[fk]) === String(c.key) ? " active" : "") +
          '" onclick="rpChartFilter(\'' + fk + '\',\'' + esc(c.key) + '\')">' + esc(labelVal(c.label)) + ' <b>' + fmtNum(c.value) + '</b></button>';
      }).join("") + '</div>';
    }
    return '<article class="rp-chart-card"><h3>' + esc(labelVal(chart.title)) + '</h3>' +
      (empty ? '<div class="rp-empty small">' + esc(labelVal(chart.empty)) + '</div>' : '<div class="rp-chart-svg">' + svg + '</div>') +
      chips + '</article>';
  }

  function chartFilterKey(chartKey) {
    var m = {
      orgsByType: "orgType", byType: rp.type === "advertisements" ? "adType" : "orgType", byGov: "governorateId",
      byCountry: "countryCode", byVerification: "verified", byStatus: rp.type === "offers" || rp.type === "advertisements" ? "status" : null,
    };
    return m[chartKey] || null;
  }

  function tableCard(t) {
    if (!t.columns || !t.columns.length) return "";
    var type = rp.type;
    var hidden = (rp.hiddenCols[type] || {});
    var cols = t.columns.filter(function (c) { return !hidden[c.key]; });
    var sort = rp.tableSort[type];
    var search = (rp.tableSearch[type] || "").toLowerCase();
    var rows = (t.rows || []).slice();
    if (search) {
      rows = rows.filter(function (r) {
        return t.columns.some(function (c) { var v = r[c.key]; return String((v && typeof v === "object" ? v.v : v) || "").toLowerCase().indexOf(search) > -1; });
      });
    }
    if (sort) {
      rows.sort(function (a, b) {
        var av = cellRaw(a[sort.key], sort.type), bv = cellRaw(b[sort.key], sort.type);
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    var head = cols.map(function (c) {
      var arrow = sort && sort.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : "";
      return '<th class="' + (c.align === "end" ? "end" : "") + '"><button class="rp-th" onclick="rpSort(\'' + c.key + '\',\'' + (c.type || "text") + '\')">' + esc(labelVal(c.label)) + arrow + '</button></th>';
    }).join("");
    var body = rows.map(function (r) {
      return '<tr>' + cols.map(function (c) {
        return '<td class="' + (c.align === "end" ? "end" : "") + '">' + cellHtml(r[c.key], c) + '</td>';
      }).join("") + '</tr>';
    }).join("");
    if (!rows.length) body = '<tr><td colspan="' + cols.length + '" class="rp-td-empty">' + T("لا توجد بيانات.", "No data.") + '</td></tr>';

    var pag = t.pagination;
    var pager = "";
    if (pag && pag.total > (pag.limit || 25)) {
      var pageNo = Math.floor((pag.offset || 0) / (pag.limit || 25)) + 1;
      var pages = Math.ceil(pag.total / (pag.limit || 25));
      pager = '<div class="rp-pager"><button' + (pageNo <= 1 ? " disabled" : "") + ' onclick="rpPage(' + ((pageNo - 2) * (pag.limit || 25)) + ')">‹</button>' +
        '<span>' + pageNo + ' / ' + pages + '</span>' +
        '<button' + (pageNo >= pages ? " disabled" : "") + ' onclick="rpPage(' + (pageNo * (pag.limit || 25)) + ')">›</button></div>';
    }

    var colMenu = t.columns.map(function (c) {
      return '<label><input type="checkbox"' + (hidden[c.key] ? "" : " checked") + ' onchange="rpToggleCol(\'' + c.key + '\')">' + esc(labelVal(c.label)) + '</label>';
    }).join("");

    return '<section class="rp-table-card"><header class="rp-table-head">' +
      '<h3>' + esc(labelVal(t.title)) + '</h3>' +
      '<div class="rp-table-tools">' +
        '<div class="rp-table-search"><span>' + icon("search", 14) + '</span><input placeholder="' + T("تصفية داخل الجدول…", "Filter this table…") + '" value="' + esc(rp.tableSearch[type] || "") + '" oninput="rpTableSearch(this.value)"></div>' +
        '<div class="rp-menu-wrap"><button class="rp-icon-btn" title="' + T("الأعمدة", "Columns") + '" onclick="rpToggleColMenu(event)">' + icon("grid", 15) + '</button>' +
          '<div class="rp-menu wide" id="rp-col-menu">' + colMenu + '</div></div>' +
        '<button class="rp-icon-btn" title="' + T("تصدير هذا الجدول", "Export this table") + '" onclick="rpExportTable(\'' + t.key + '\')">' + icon("download", 15) + '</button>' +
      '</div></header>' +
      '<div class="rp-table-wrap"><table class="rp-tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      pager + '</section>';
  }

  function cellRaw(cell, type) {
    var v = cell && typeof cell === "object" ? cell.v : cell;
    if (type === "number" || type === "currency" || type === "percent") return num(v);
    return String(v == null ? "" : v);
  }

  function cellHtml(cell, col) {
    var v = cell && typeof cell === "object" ? cell.v : cell;
    if (col.type === "badge") return rpBadge(v);
    if (col.type === "entity") {
      var img = cell && cell.img ? '<span class="rp-cell-logo"><img src="' + esc(cell.img) + '" alt="" onerror="this.parentNode.style.display=\'none\'"></span>' : "";
      var sub = cell && cell.sub ? '<small>' + esc(cell.sub) + '</small>' : "";
      var inner = img + '<span class="rp-cell-entity"><b>' + esc(v) + '</b>' + sub + '</span>';
      if (cell && cell.href) return '<a class="rp-entity-link" href="' + esc(cell.href) + '">' + inner + '</a>';
      return '<span class="rp-cell-entity-wrap">' + inner + '</span>';
    }
    if (col.type === "date") return '<span class="ltr-num" dir="ltr">' + esc(fmtDate(v)) + '</span>';
    if (col.type === "number" || col.type === "currency") return '<span class="ltr-num" dir="ltr">' + esc(fmtNum(v)) + '</span>';
    if (col.type === "percent") return '<span class="ltr-num" dir="ltr">' + esc((Math.round(num(v) * 10) / 10) + "%") + '</span>';
    return esc(v == null ? "—" : v);
  }

  function notesBlock(model) {
    if (!model.notes || !model.notes.length) return "";
    return model.notes.map(function (n) {
      return '<div class="rp-note ' + (n.tone === "warn" ? "warn" : "") + '">' + icon("info", 15) + '<span>' + esc(labelVal(n.text)) + '</span></div>';
    }).join("");
  }

  function reportView() {
    var item = (rp.catalog || []).filter(function (i) { return i.id === rp.type; })[0];
    if (item && item.entity && !rp.entityId) return entityPicker(item);
    loadReport(false);
    var header = reportNav() +
      '<div class="rp-toolbar">' + periodBar() + filterBar(item) + '</div>';
    if (rp.loading || !rp.data) {
      return shell('<div class="rp-report">' + reportTopBar() + header + (rp.error ? '<div class="rp-empty">' + esc(rp.error) + '</div>' : spinner()) + '</div>');
    }
    var m = rp.data;
    var body = coverHeader(m) + notesBlock(m) + kpiGrid(m) +
      (m.charts && m.charts.length ? '<div class="rp-charts">' + m.charts.map(chartCard).join("") + '</div>' : "") +
      (m.tables || []).map(tableCard).join("");
    return shell('<div class="rp-report">' + reportTopBar() + header + body + '</div>' + saveModal());
  }

  function reportTopBar() {
    return '<div class="rp-topbar">' +
      '<button class="rp-back" onclick="rpSetView(\'catalog\')">' + icon("back", 15) + ' ' + T("كل التقارير", "All reports") + '</button>' +
      '<div class="rp-topbar-title">' + icon("chart", 16) + ' ' + T("مركز التقارير والتحليلات", "Reporting & Analytics Center") + '</div>' +
      '</div>';
  }

  function entityPicker(item) {
    var opts = "";
    if (rp.type === "institution") {
      opts = (rp.options && rp.options.institutions || []).map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>'; }).join("");
    } else {
      opts = (rp.options && rp.options.teachers || []).map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>'; }).join("");
    }
    return shell('<div class="rp-report">' + reportTopBar() + reportNav() +
      '<section class="rp-cover"><div class="rp-cover-main"><div class="rp-cover-eyebrow">MADARASATI · ' + T("تقرير كيان", "Entity report") + '</div>' +
      '<h1>' + esc(ar(item.title)) + '</h1><p>' + esc(ar(item.subtitle)) + '</p></div></section>' +
      '<div class="rp-picker"><label>' + T("اختر السجل", "Choose a record") + '</label>' +
      '<select id="rp-entity-select">' + (opts || '<option value="">' + T("لا توجد سجلات", "No records") + '</option>') + '</select>' +
      '<button class="rp-btn primary" onclick="rpOpenEntity()">' + icon("chart", 15) + ' ' + T("توليد التقرير", "Generate report") + '</button></div></div>');
  }

  // ---------------------------------------------------------------------------
  // Saved reports / Export / Import views
  // ---------------------------------------------------------------------------

  function savedView() {
    var rows = (rp.saved || []).map(function (s) {
      var d = s.definition || {};
      var type = d.type || "overview";
      var tItem = (rp.catalog || []).filter(function (i) { return i.id === type; })[0];
      return '<article class="rp-saved-card"><div><span class="rp-card-ico">' + icon((tItem && tItem.icon) || "chart", 20) + '</span>' +
        '<b>' + esc(s.name) + '</b>' + (s.description ? '<p>' + esc(s.description) + '</p>' : "") +
        '<small>' + esc(tItem ? ar(tItem.title) : type) + ' · ' + esc(fmtDate(s.createdAt)) + '</small></div>' +
        '<div class="rp-saved-actions"><button class="rp-btn" onclick="rpOpenSaved(\'' + esc(s.id) + '\')">' + icon("eye", 14) + ' ' + T("عرض", "Open") + '</button>' +
        '<button class="rp-icon-btn danger" onclick="rpDeleteSaved(\'' + esc(s.id) + '\')" title="' + T("حذف", "Delete") + '">' + icon("trash", 15) + '</button></div></article>';
    }).join("");
    return shell(brandHeader(T("التقارير المحفوظة", "Saved reports"), T("تكوينات محفوظة تُعيد تشغيل التقرير على البيانات الحيّة", "Saved configurations that re-run against live data")) +
      '<div class="rp-topbar">' + backToCatalog() + '</div>' +
      (rows ? '<div class="rp-saved-list">' + rows + '</div>' : '<div class="rp-empty">' + T("لا توجد تقارير محفوظة بعد. افتح أي تقرير واضغط «حفظ».", "No saved reports yet. Open any report and press Save.") + '</div>'));
  }

  function backToCatalog() {
    return '<button class="rp-back" onclick="rpSetView(\'catalog\')">' + icon("back", 15) + ' ' + T("كل التقارير", "All reports") + '</button>';
  }

  function exportView() {
    var items = (rp.catalog || []).filter(function (i) { return !i.entity; });
    return shell(brandHeader(T("مركز التصدير", "Export Center"), T("اختر التقرير والفترة والتصفية ثم صدّر بصيغتك", "Choose a report, period and filters, then export in your format")) +
      '<div class="rp-topbar">' + backToCatalog() + '</div>' +
      '<section class="rp-export-center">' +
        '<div class="rp-export-form">' +
          '<div class="rp-field"><label>' + T("التقرير", "Report") + '</label><select id="rp-exp-type" onchange="rpExpPick(this.value)">' +
            items.map(function (it) { return '<option value="' + it.id + '"' + (rp.type === it.id ? " selected" : "") + '>' + esc(ar(it.title)) + '</option>'; }).join("") +
          '</select></div>' +
          '<div class="rp-export-period">' + periodBar() + '</div>' +
          '<div class="rp-export-actions">' +
            '<button class="rp-btn" onclick="rpExpPreview()">' + icon("eye", 15) + ' ' + T("معاينة", "Preview") + '</button>' +
            '<button class="rp-btn primary" onclick="rpExportCurrent(\'xlsx\')">' + icon("sheet", 15) + ' Excel</button>' +
            '<button class="rp-btn primary" onclick="rpExportCurrent(\'docx\')">' + icon("doc", 15) + ' Word</button>' +
            '<button class="rp-btn primary" onclick="rpExportCurrent(\'pdf\')">' + icon("pdf", 15) + ' PDF</button>' +
            '<button class="rp-btn" onclick="rpExportCurrent(\'csv\')">' + icon("file", 15) + ' CSV</button>' +
          '</div>' +
        '</div>' +
        '<div class="rp-export-preview" id="rp-exp-preview"><div class="rp-empty">' + T("اختر تقريراً ثم اضغط «معاينة» لعرض مقتطف قبل التصدير.", "Choose a report and press Preview to see a snapshot before exporting.") + '</div></div>' +
      '</section>');
  }

  function importView() {
    var st = rp.importState;
    var result = "";
    if (st.result) {
      var errs = (st.result.errors || []);
      result = '<div class="rp-import-result">' +
        '<h3>' + T("نتيجة الاستيراد", "Import result") + '</h3>' +
        '<div class="rp-import-stats">' +
          '<span class="ok">' + T("صالح", "Valid") + ': <b>' + st.result.valid + '</b></span>' +
          '<span class="bad">' + T("غير صالح", "Invalid") + ': <b>' + st.result.invalid + '</b></span>' +
          '<span class="neutral">' + T("الإجمالي", "Total") + ': <b>' + st.result.total + '</b></span>' +
        '</div>' +
        (st.result.imported != null ? '<div class="rp-note">' + icon("check", 15) + '<span>' + T("تم استيراد " + st.result.imported + " مؤسسة بنجاح.", st.result.imported + " institutions imported successfully.") + '</span></div>' : "") +
        (errs.length ? '<div class="rp-table-wrap"><table class="rp-tbl"><thead><tr><th>' + T("الصف", "Row") + '</th><th>' + T("الحقل", "Field") + '</th><th>' + T("المشكلة", "Problem") + '</th></tr></thead><tbody>' +
          errs.map(function (e) { return '<tr><td>' + esc(e.row) + '</td><td>' + esc(e.field) + '</td><td>' + esc(e.message) + '</td></tr>'; }).join("") + '</tbody></table></div>' : "") +
        '</div>';
    }
    return shell(brandHeader(T("مركز الاستيراد", "Import Center"), T("استيراد منظّم مع تحقق كامل قبل الحفظ", "Structured import with full validation before anything is saved")) +
      '<div class="rp-topbar">' + backToCatalog() + '</div>' +
      '<section class="rp-import">' +
        '<div class="rp-note warn">' + icon("shield", 15) + '<span>' + T("لا يتم إدخال أي صف قبل اجتيازه التحقق. الاستيراد الحالي مستند إلى الملف النموذجي للمؤسسات، ويُسجَّل في سجل التدقيق.", "No row is written before it passes validation. The current importer covers institutions from the template file, and every run is written to the audit log.") + '</span></div>' +
        '<div class="rp-import-grid">' +
          '<div class="rp-import-card"><h3>' + icon("download", 16) + ' ' + T("١. نزّل النموذج", "1. Download the template") + '</h3>' +
            '<p>' + T("ملف CSV بالأعمدة الصحيحة. املأه ثم ارفعه.", "A CSV with the correct columns. Fill it, then upload it.") + '</p>' +
            '<button class="rp-btn" onclick="rpImportTemplate()">' + icon("file", 15) + ' ' + T("تنزيل النموذج", "Download template") + '</button></div>' +
          '<div class="rp-import-card"><h3>' + icon("download", 16) + ' ' + T("٢. ارفع الملف", "2. Upload the file") + '</h3>' +
            '<p>' + esc(st.fileName || T("لم يتم اختيار ملف.", "No file chosen.")) + '</p>' +
            '<input type="file" id="rp-import-file" accept=".csv,text/csv" style="display:none" onchange="rpImportFile(this)">' +
            '<button class="rp-btn" onclick="document.getElementById(\'rp-import-file\').click()">' + icon("sheet", 15) + ' ' + T("اختيار ملف CSV", "Choose CSV file") + '</button></div>' +
          '<div class="rp-import-card"><h3>' + icon("check", 16) + ' ' + T("٣. تحقق ثم استورد", "3. Validate then import") + '</h3>' +
            '<p>' + T("تحقق أولاً لعرض الأخطاء دون حفظ أي بيانات.", "Validate first to see errors without saving anything.") + '</p>' +
            '<div class="rp-import-btns">' +
              '<button class="rp-btn" onclick="rpImportRun(true)"' + (st.rows ? "" : " disabled") + '>' + icon("shield", 15) + ' ' + T("تحقق", "Validate") + '</button>' +
              '<button class="rp-btn primary" onclick="rpImportRun(false)"' + (st.rows && st.result && st.result.invalid === 0 ? "" : " disabled") + '>' + icon("download", 15) + ' ' + T("تأكيد الاستيراد", "Confirm import") + '</button>' +
            '</div></div>' +
        '</div>' +
        result +
      '</section>');
  }

  // ---------------------------------------------------------------------------
  // Shell
  // ---------------------------------------------------------------------------

  function shell(inner) {
    return adminShell('<div class="rp">' + inner + '</div>');
  }

  function saveModal() {
    if (!rp.saveModal) return "";
    return '<div class="rp-overlay" onclick="if(event.target===this)rpSaveClose()"><div class="rp-modal">' +
      '<h3>' + T("حفظ التقرير", "Save report") + '</h3>' +
      '<p>' + T("يُحفظ التكوين فقط (النوع والفترة والتصفية)، وتُعاد البيانات عند فتحه.", "Only the configuration is saved (type, period, filters); data is re-queried when opened.") + '</p>' +
      '<label>' + T("الاسم", "Name") + '</label><input id="rp-save-name" placeholder="' + T("مثال: تقرير شهري", "e.g. Monthly report") + '">' +
      '<label>' + T("وصف (اختياري)", "Description (optional)") + '</label><input id="rp-save-desc">' +
      '<div class="rp-modal-actions"><button class="rp-btn primary" onclick="rpSaveSubmit()">' + T("حفظ", "Save") + '</button>' +
      '<button class="rp-btn" onclick="rpSaveClose()">' + T("إلغاء", "Cancel") + '</button></div></div></div>';
  }

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------

  window.reportsCenterPage = function () {
    ensure();
    var q = hashQuery();
    if (q.view && ["catalog", "report", "saved", "export", "import"].indexOf(q.view) > -1 && rp.view !== q.view) rp.view = q.view;
    if (q.report) {
      if (q.report !== rp.type) { rp.type = q.report; rp.filters = {}; rp.offset = 0; rp.data = null; rp.dataKey = null; rp.entityId = null; }
      rp.view = "report";
      var wanted = q.id || null;
      if (wanted !== rp.entityId) { rp.entityId = wanted; rp.data = null; rp.dataKey = null; }
    }
    if (q.saved) {
      var s = (rp.saved || []).filter(function (x) { return String(x.id) === String(q.saved); })[0];
      if (s) applySaved(s, true);
    }
    if (!rp.catalog) return shell(brandHeader(T("التقارير والتحليلات", "Reports & Analytics"), T("جارٍ التحميل…", "Loading…")) + spinner());
    if (rp.view === "report") return reportView();
    if (rp.view === "saved") return savedView();
    if (rp.view === "export") return exportView();
    if (rp.view === "import") return importView();
    return catalogView() + saveModal();
  };

  function applySaved(s, keepView) {
    var d = s.definition || {};
    rp.type = d.type || "overview";
    rp.period = { preset: (d.period && d.period.preset) || "last_30", from: (d.period && d.period.from) || "", to: (d.period && d.period.to) || "" };
    rp.filters = Object.assign({}, d.filters || {});
    rp.entityId = d.id || null;
    rp.offset = 0; rp.data = null; rp.dataKey = null;
    if (!keepView) rp.view = "report";
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  window.rpSetView = function (v) {
    rp.view = v;
    var route = "reports?view=" + v;
    if (v === "report") route = "reports?report=" + encodeURIComponent(rp.type) + (rp.entityId ? "&id=" + encodeURIComponent(rp.entityId) : "");
    if (location.hash !== "#/" + route) location.hash = "#/" + route; else render();
  };

  window.rpOpen = function (type) {
    var item = (rp.catalog || []).filter(function (i) { return i.id === type; })[0];
    rp.type = type; rp.filters = {}; rp.offset = 0; rp.data = null; rp.dataKey = null;
    rp.entityId = null;
    if (item && item.entity) { rp.entityId = null; }
    location.hash = "#/reports?report=" + encodeURIComponent(type);
  };

  window.rpOpenEntity = function () {
    var el = document.getElementById("rp-entity-select");
    if (!el || !el.value) return;
    rp.entityId = el.value; rp.data = null; rp.dataKey = null;
    location.hash = "#/reports?report=" + encodeURIComponent(rp.type) + "&id=" + encodeURIComponent(el.value);
  };

  window.rpOpenSaved = function (id) {
    var s = (rp.saved || []).filter(function (x) { return String(x.id) === String(id); })[0];
    if (!s) return;
    applySaved(s, false);
    location.hash = "#/reports?report=" + encodeURIComponent(rp.type) + (rp.entityId ? "&id=" + encodeURIComponent(rp.entityId) : "");
  };

  window.rpCatalogSearch = function (v) { rp.catalogSearch = v; render(); };

  window.rpSetPreset = function (p) {
    rp.period.preset = p;
    if (p !== "custom") { rp.period.from = ""; rp.period.to = ""; }
    rp.data = null; rp.dataKey = null; rp.offset = 0; render();
  };
  window.rpSetCustom = function (which, v) { rp.period[which] = v; rp.period.preset = "custom"; rp.data = null; rp.dataKey = null; rp.offset = 0; render(); };
  window.rpSetFilter = function (k, v, lazy) {
    if (v == null || v === "") delete rp.filters[k]; else rp.filters[k] = v;
    if (lazy) return;
    rp.data = null; rp.dataKey = null; rp.offset = 0; render();
  };
  window.rpClearFilters = function () { rp.filters = {}; rp.data = null; rp.dataKey = null; rp.offset = 0; render(); };
  window.rpRefresh = function () { rp.data = null; rp.dataKey = null; render(); };

  window.rpChartFilter = function (k, v) {
    if (String(rp.filters[k]) === String(v)) delete rp.filters[k]; else rp.filters[k] = v;
    rp.data = null; rp.dataKey = null; rp.offset = 0; render();
  };

  window.rpKpiGo = function (href) {
    var known = (rp.catalog || []).some(function (i) { return i.id === href; });
    if (known) { rpOpen(href); return; }
    go(href);
  };

  window.rpPage = function (offset) { rp.offset = Math.max(0, offset); rp.data = null; rp.dataKey = null; render(); };
  window.rpSort = function (key, type) {
    var cur = rp.tableSort[rp.type];
    if (cur && cur.key === key) cur.dir = cur.dir === "asc" ? "desc" : "asc";
    else rp.tableSort[rp.type] = { key: key, type: type, dir: "asc" };
    render();
  };
  window.rpTableSearch = function (v) { rp.tableSearch[rp.type] = v; render(); };
  window.rpToggleCol = function (key) {
    rp.hiddenCols[rp.type] = rp.hiddenCols[rp.type] || {};
    rp.hiddenCols[rp.type][key] = !rp.hiddenCols[rp.type][key];
    render();
  };

  window.rpToggleExportMenu = function (e) {
    e.stopPropagation();
    var m = document.getElementById("rp-export-menu");
    if (m) m.classList.toggle("open");
  };
  window.rpToggleColMenu = function (e) {
    e.stopPropagation();
    var m = document.getElementById("rp-col-menu");
    if (m) m.classList.toggle("open");
  };
  document.addEventListener("click", function (e) {
    ["rp-export-menu", "rp-col-menu"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.classList.contains("open") && !el.contains(e.target) && !(e.target.closest && e.target.closest(".rp-menu-wrap"))) el.classList.remove("open");
    });
  });

  window.rpPrint = function () {
    if (!rp.data) return;
    window.ReportExport.print(rp.data);
  };

  window.rpExport = function (format) {
    if (!rp.data) return;
    var menu = document.getElementById("rp-export-menu");
    if (menu) menu.classList.remove("open");
    if (format === "pdf") { window.ReportExport.print(rp.data); return; }
    // Full data for the file, not just the first page.
    fetchModel(5000).then(function (full) {
      if (format === "xlsx") window.ReportExport.xlsx(full);
      else if (format === "docx") window.ReportExport.docx(full);
      else if (format === "csv") window.ReportExport.csv(full);
    }).catch(function (e) { alert(errText(e)); });
  };

  window.rpExportTable = function (tableKey) {
    if (!rp.data) return;
    var t = (rp.data.tables || []).filter(function (x) { return x.key === tableKey; })[0];
    if (!t) return;
    var model = {
      title: { ar: labelVal(t.title), en: labelVal(t.title) },
      subtitle: { ar: "", en: "" },
      period: rp.data.period,
      generatedAt: rp.data.generatedAt,
      kpis: [],
      charts: [],
      tables: [t],
      notes: [],
    };
    window.ReportExport.csv(model);
  };

  window.rpSaveOpen = function () { rp.saveModal = true; render(); };
  window.rpSaveClose = function () { rp.saveModal = false; render(); };
  window.rpSaveSubmit = function () {
    var nameEl = document.getElementById("rp-save-name");
    var descEl = document.getElementById("rp-save-desc");
    var name = (nameEl && nameEl.value || "").trim();
    if (name.length < 2) { alert(T("اكتب اسماً للتقرير (حرفان على الأقل).", "Enter a report name (at least 2 characters).")); return; }
    var def = { type: rp.type, period: { preset: rp.period.preset, from: rp.period.from, to: rp.period.to }, filters: rp.filters };
    if (rp.entityId) def.id = rp.entityId;
    apiPost("/api/reports/saved", { name: name, description: descEl ? descEl.value : "", definition: def })
      .then(function () { rp.saveModal = false; rp.saved = null; loadSaved(); })
      .catch(function (e) { alert(errText(e)); });
  };
  window.rpDeleteSaved = function (id) {
    if (!confirm(T("حذف هذا التقرير المحفوظ؟", "Delete this saved report?"))) return;
    apiDelete("/api/reports/saved/" + id).then(function () { rp.saved = null; loadSaved(); }).catch(function (e) { alert(errText(e)); });
  };

  // Export Center
  window.rpExpPick = function (type) { rp.type = type; rp.filters = {}; rp.data = null; rp.dataKey = null; render(); };
  window.rpExpPreview = function () {
    loadReportIfNeeded().then(function (m) {
      var el = document.getElementById("rp-exp-preview");
      if (!el) return;
      el.innerHTML = previewHtml(m);
    });
  };
  window.rpExportCurrent = function (format) {
    loadReportIfNeeded().then(function () { window.rpExport(format); }).catch(function (e) { alert(errText(e)); });
  };

  function loadReportIfNeeded() {
    if (rp.data) return Promise.resolve(rp.data);
    return fetchModel(5000).then(function (m) { rp.data = m; return m; });
  }

  function previewHtml(m) {
    var kpis = (m.kpis || []).slice(0, 6).map(function (k) {
      return '<div class="rp-preview-kpi"><span>' + esc(labelVal(k.label)) + '</span><b>' + esc(fmtVal(k)) + '</b></div>';
    }).join("");
    var charts = (m.charts || []).slice(0, 2).map(function (c) {
      var empty = window.ReportCharts ? false : true;
      var svg = empty ? "" : window.ReportCharts.render(c, { rtl: lang === "ar", text: "currentColor", grid: "currentColor", lang: lang, width: 420 });
      return '<div class="rp-preview-chart"><b>' + esc(labelVal(c.title)) + '</b>' + svg + '</div>';
    }).join("");
    return '<div class="rp-preview-sheet"><div class="rp-preview-head"><span class="rp-mark">م</span><div><b>MADARASATI</b><small>' + esc(labelVal(m.title)) + '</small></div></div>' +
      '<p class="rp-preview-meta">' + esc(labelVal(m.period.label)) + ' · ' + esc(m.period.fromLabel) + ' → ' + esc(m.period.toLabel) + '</p>' +
      '<div class="rp-preview-kpis">' + kpis + '</div>' + charts + '</div>';
  }

  // Import Center
  var TEMPLATE_COLUMNS = ["name", "type", "governorate", "district", "phone", "email", "principal_name", "description"];
  window.rpImportTemplate = function () {
    var header = "name,type,governorate,district,phone,email,principal_name,description\r\n";
    var sample = "مدرسة النموذج,private_school,صنعاء,السبعين,733000000,info@example.com,أحمد علي,مؤسسة تعليمية\r\n";
    var blob = new Blob(["\ufeff" + header + sample], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "madarasati-institutions-template.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  };
  window.rpImportFile = function (input) {
    var f = input.files && input.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var rows = parseCsv(String(fr.result || ""));
        rp.importState.rows = rows;
        rp.importState.fileName = f.name;
        rp.importState.result = null;
        rp.importState.error = null;
        render();
      } catch (e) { alert(T("تعذر قراءة الملف.", "Could not read the file.")); }
    };
    fr.readAsText(f, "utf-8");
  };
  window.rpImportRun = function (dryRun) {
    var st = rp.importState;
    if (!st.rows || !st.rows.length) return;
    st.loading = true; st.error = null;
    apiPost("/api/reports/import/institutions", { rows: st.rows, dryRun: !!dryRun })
      .then(function (r) { st.loading = false; st.result = r; render(); })
      .catch(function (e) { st.loading = false; st.error = errText(e); alert(errText(e)); });
  };

  function parseCsv(text) {
    text = text.replace(/^\ufeff/, "");
    var rows = [];
    var i = 0, field = "", row = [], inQuotes = false;
    var pushField = function () { row.push(field); field = ""; };
    var pushRow = function () { pushField(); if (row.some(function (c) { return c !== ""; })) rows.push(row); row = []; };
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQuotes = false; i++; continue; }
        field += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ",") { pushField(); i++; continue; }
      if (ch === "\n") { pushRow(); i++; continue; }
      if (ch === "\r") { i++; continue; }
      field += ch; i++;
    }
    pushRow();
    if (!rows.length) return [];
    var header = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
    return rows.slice(1).map(function (r) {
      var obj = {};
      header.forEach(function (h, idx) { obj[h] = r[idx] != null ? String(r[idx]).trim() : ""; });
      return obj;
    }).filter(function (o) { return o.name; });
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  window.adminReportsPage = window.reportsCenterPage;
  window.ReportsCenter = { state: rp, open: window.rpOpen, refresh: window.rpRefresh };
})();
