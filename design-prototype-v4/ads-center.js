// ads-center.js — MADARASATI Advertisement Management Center.
// مركز إدارة الإعلانات
//
// One module owns the whole Advertisements experience for BOTH audiences:
// the platform administrator (#/ads) and the institution owner (the
// «إعلاناتي» tab). Same components, same filters, same reports — only the
// endpoints and the permitted actions differ, because the SERVER decides that.
//
//   #/ads                       the admin center
//   #/ads/new                   creation wizard (dedicated page)
//   #/ads/edit/:id              edit wizard   (dedicated page)
//   #/ads/view/:id              details + review + real audit trail
//
// DESIGN RULES THIS FILE KEEPS
// 1. No fabricated figure. Every number comes from PostgreSQL. `active`,
//    `scheduled` and `expired` are the server's derived bucket, never a stored
//    flag, and CTR is shown as "—" while impressions are zero.
// 2. There is no daily performance table in the schema, so the report says so
//    instead of drawing a timeline it cannot honestly fill.
// 3. Filters live in the URL. A filtered view is shareable, survives a refresh
//    and works with the browser Back button.
// 4. Search and filtering are SERVER-side (limit/offset + the same predicate
//    the counters use), so a large catalogue is never shipped whole.
// 5. The palette is untouched: every colour is a --theme-* token, and the only
//    additions are the semantic status tokens declared in ads-center.css.
//
// Labels follow the module convention used by reports-center.js and
// admin-marketing.js: a local T(ar,en) pair, so every string exists in both
// languages in the same place.
(function () {
  "use strict";

  // ===========================================================================
  // 1. Helpers
  // ===========================================================================

  function T(ar, en) { return lang === "ar" ? ar : en; }
  // api.js rejects with `new Error(data.error)`, so the message is already the
  // server's own wording; the envelope is only a fallback.
  function errText(e) { return (e && e.message) || (e && e.data && e.data.error) || T("تعذّر تحميل البيانات.", "Unable to load data."); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  // Latin digits in both languages: a business counter stays legible, and every
  // figure sits in a `direction:ltr` cell so the layout never shifts.
  function fmtNum(v) { return num(v).toLocaleString("en-US"); }
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
  function toLocalInput(v) {
    if (!v) return "";
    var d = new Date(v);
    if (isNaN(d.getTime())) return "";
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function clampNum(v, min, max) { return Math.max(min, Math.min(max, num(v))); }
  function pct(impressions, clicks) {
    // A rate for an ad nobody has seen would be invented, so it is null.
    if (!impressions) return null;
    return Number(((num(clicks) / num(impressions)) * 100).toFixed(2));
  }
  function pctText(impressions, clicks) {
    var p = pct(impressions, clicks);
    return p === null ? "—" : p + "%";
  }
  function mediaUrl(p) { if (!p) return ""; return /^https?:/i.test(p) ? p : (typeof API_BASE === "string" ? API_BASE + p : p); }
  function orgLogo(row) {
    if (!row || !row.organizationId) return "";
    try {
      return window.MadrasatiMedia.orgMedia({
        id: row.organizationId, type: row.organizationType, slug: row.organizationSlug
      }).logo || "";
    } catch (e) { return ""; }
  }
  function v(id) { var el = document.getElementById(id); return el ? String(el.value == null ? "" : el.value).trim() : ""; }
  function iso(id) { var s = v(id); return s ? new Date(s).toISOString() : null; }
  // routeSubId() only reaches the third segment, so the owner's
  // #/owner/ads/view/:id needs the id from the fourth one.
  function seg(i) { try { return routePath()[i] || ""; } catch (e) { return ""; } }

  // A few module glyphs the shared icon map does not carry. Everything else is
  // borrowed from the shell's own `icon()` so there is exactly one icon set in
  // the product and no second palette sneaking in with it.
  var MI = {
    refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
    play: '<path d="M7 4l12 8-12 8Z"/>',
    alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.01"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-5 4 4 3-2 4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    inbox: '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14l2 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    sparkle: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="m6.3 6.3 3 3M14.7 14.7l3 3M17.7 6.3l-3 3M9.3 14.7l-3 3"/>',
    tag: '<path d="M3 12V4h8l9 9-8 8-9-9Z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    megaphone: '<path d="M4 10v4h3l7 4V6l-7 4H4Z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    coins: '<ellipse cx="9" cy="7" rx="5" ry="2.6"/><path d="M4 7v4c0 1.4 2.2 2.6 5 2.6"/><path d="M4 11v4c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6v-4"/><path d="M14 10.5c2.6.3 4.5 1.4 4.5 2.5v4c0 1.4-2.2 2.6-5 2.6-1 0-2-.2-2.8-.4"/>',
    stopwatch: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9 3h6M12 5V3"/>',
    undo: '<path d="M4 10h9a5 5 0 0 1 0 10H8"/><path d="M4 10l4-4M4 10l4 4"/>',
    dot: '<circle cx="12" cy="12" r="3.4"/>',
  };
  function mi(name, size) {
    var s = size || 16;
    var body = MI[name];
    if (!body) {
      // The shell already ships the product glyph set; reuse it instead of
      // duplicating 30 paths here.
      try { if (typeof window.icon === "function") return window.icon(name, s); } catch (e) { }
      body = MI.dot;
    }
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  }

  // ===========================================================================
  // 2. Domain vocabulary
  // ===========================================================================

  // tone drives the semantic colour; the label is always present so meaning is
  // never carried by colour alone.
  var STATUS = {
    active: { tone: "ok", ar: "نشط", en: "Active" },
    scheduled: { tone: "info", ar: "مجدول", en: "Scheduled" },
    pending: { tone: "warn", ar: "قيد المراجعة", en: "Pending review" },
    approved: { tone: "ok", ar: "معتمد", en: "Approved" },
    paused: { tone: "mute", ar: "موقوف", en: "Paused" },
    rejected: { tone: "bad", ar: "مرفوض", en: "Rejected" },
    expired: { tone: "mute", ar: "منتهي", en: "Expired" },
    cancelled: { tone: "bad", ar: "ملغي", en: "Cancelled" },
    archived: { tone: "mute", ar: "مؤرشف", en: "Archived" },
  };
  function stMeta(key) { return STATUS[key] || { tone: "mute", ar: key || "—", en: key || "—" }; }
  function stLabel(key) { var s = stMeta(key); return T(s.ar, s.en); }
  function stIcon(key) {
    return { active: "sparkle", scheduled: "calendar", pending: "shield", approved: "check", paused: "eye",
      rejected: "x", expired: "clock", cancelled: "x", archived: "file" }[key] || "tag";
  }
  // The bucket a row belongs to. `effectiveStatus` is the server's derived
  // value, so active/scheduled/expired can never disagree with the window.
  function rowBucket(r) { return (r && (r.effectiveStatus || r.status)) || "archived"; }
  function stTone(key) { return stMeta(key).tone; }

  var TABS = [
    { key: "overview", ar: "نظرة عامة", en: "Overview", ic: "chart" },
    { key: "all", ar: "الكل", en: "All", ic: "grid" },
    { key: "pending", ar: "قيد المراجعة", en: "Pending", ic: "shield", count: "pending", alert: true },
    { key: "active", ar: "نشط", en: "Active", ic: "sparkle", count: "active" },
    { key: "scheduled", ar: "مجدول", en: "Scheduled", ic: "calendar", count: "scheduled" },
    { key: "paused", ar: "موقوف", en: "Paused", ic: "eye", count: "paused" },
    { key: "rejected", ar: "مرفوض", en: "Rejected", ic: "x", count: "rejected" },
    { key: "expired", ar: "منتهي", en: "Expired", ic: "clock", count: "expired" },
    { key: "archived", ar: "مؤرشف", en: "Cancelled/archived", ic: "file", count: "archived", extra: "cancelled" },
    { key: "report", ar: "التقارير", en: "Reports", ic: "sheet" },
  ];
  function tabDef(key) { return TABS.filter(function (x) { return x.key === key; })[0] || TABS[0]; }

  var SORTS = [
    ["newest", "الأحدث أولاً", "Newest first"],
    ["oldest", "الأقدم أولاً", "Oldest first"],
    ["name", "الاسم (أ-ي)", "Name (A-Z)"],
    ["clicks", "الأكثر نقراً", "Most clicks"],
    ["impressions", "الأكثر ظهوراً", "Most impressions"],
    ["end_soon", "ينتهي أولاً", "Ending soonest"],
    ["priority", "الأعلى ترتيباً", "Highest priority"],
  ];
  var AD_TYPES = [
    ["general", "عام", "General"],
    ["promotion", "ترويجي", "Promotion"],
    ["enrollment", "تسجيل", "Enrollment"],
    ["notice", "تنبيه", "Notice"],
  ];
  var BILLING = [
    ["free", "مجاني", "Free"],
    ["paid", "مدفوع", "Paid"],
  ];
  var STORED_STATUS = [
    ["pending", "قيد المراجعة", "Pending review"],
    ["approved", "معتمد", "Approved"],
    ["paused", "موقوف", "Paused"],
    ["rejected", "مرفوض", "Rejected"],
    ["cancelled", "ملغي", "Cancelled"],
    ["archived", "مؤرشف", "Archived"],
  ];
  var PLACEMENTS = [["ticker", "الشريط المتحرك", "Ticker strip"]];
  // Only the destinations the frontend actually routes to.
  var CTA_ROUTES = ["home", "private", "government", "colleges", "institutes", "teachers", "schools"];

  // Audit action -> (tone, ar, en). Every entry is a step the workflow really
  // wrote; an action the module does not know is still shown, unlabelled-but-safe.
  var AUDIT = {
    create: { tone: "info", ar: "إنشاء الإعلان", en: "Advertisement created" },
    update: { tone: "info", ar: "تعديل البيانات", en: "Details edited" },
    delete: { tone: "bad", ar: "حذف الإعلان", en: "Advertisement deleted" },
    submit: { tone: "warn", ar: "إرسال للمراجعة", en: "Submitted for review" },
    resubmit: { tone: "warn", ar: "إعادة إرسال للمراجعة", en: "Resubmitted for review" },
    review_approve: { tone: "ok", ar: "اعتماد من الإدارة", en: "Approved by administration" },
    review_reject: { tone: "bad", ar: "رفض من الإدارة", en: "Rejected by administration" },
    review_request_changes: { tone: "warn", ar: "طلب تعديل من الإدارة", en: "Changes requested" },
    pause: { tone: "mute", ar: "إيقاف", en: "Paused" },
    resume: { tone: "ok", ar: "استئناف", en: "Resumed" },
    cancel: { tone: "bad", ar: "إلغاء", en: "Cancelled" },
    archive: { tone: "mute", ar: "أرشفة", en: "Archived" },
  };
  function auditMeta(action) { return AUDIT[action] || { tone: "mute", ar: action || "—", en: action || "—" }; }

  // ===========================================================================
  // 3. URL-driven state
  // ===========================================================================

  function hashQuery() {
    var q = {};
    try {
      var s = (location.hash.split("?")[1] || "");
      s.split("&").forEach(function (pair) {
        if (!pair) return;
        var i = pair.indexOf("=");
        var k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
        var v2 = i < 0 ? "" : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
        q[k] = v2;
      });
    } catch (e) { /* a malformed hash is simply an empty filter set */ }
    return q;
  }

  function blankState() {
    return {
      tab: "overview", q: "", status: "", effective: "", adType: "", billing: "",
      advertiser: "", placement: "", from: "", to: "", sort: "newest",
      offset: 0, limit: 12, view: "cards", advanced: false,
      // data
      rows: [], total: 0, summary: null, loading: false, loaded: false, error: null, sig: null,
      // detail
      one: null, oneLoading: false, oneError: null, history: null, historyLoading: false,
      // form
      form: null, saving: false,
    };
  }
  var A = blankState(); // admin
  var O = blankState(); // owner
  var CATALOG = { rows: [], loaded: false, loading: false };

  function scopeState(scope) { return scope === "owner" ? O : A; }

  // The hash is the single source of truth for a view, so a shared link, a
  // refresh and the Back button all restore exactly what the user was looking at.
  function syncState(scope) {
    var s = scopeState(scope), q = hashQuery();
    TABS.forEach(function (t) { if (q.tab === t.key) s.tab = t.key; });
    ["q", "status", "effective", "adType", "billing", "advertiser", "placement", "from", "to", "sort"].forEach(function (k) {
      if (q[k] !== undefined) s[k] = q[k] || "";
    });
    if (q.view === "cards" || q.view === "table") s.view = q.view;
    if (q.more === "1") s.advanced = true;
    if (q.page && /^\d+$/.test(q.page)) s.offset = Math.max(0, (parseInt(q.page, 10) - 1) * s.limit);
    else if (q.page === undefined && s.__pageUnset !== true) s.offset = 0;
  }
  function buildQuery(s) {
    var p = [];
    var add = function (k, v2) { if (v2 !== "" && v2 != null) p.push(k + "=" + encodeURIComponent(v2)); };
    add("tab", s.tab === "overview" ? "" : s.tab);
    add("q", s.q);
    add("status", s.status);
    add("effective", s.effective);
    add("adType", s.adType);
    add("billing", s.billing);
    add("advertiser", s.advertiser);
    add("placement", s.placement);
    add("from", s.from);
    add("to", s.to);
    add("sort", s.sort === "newest" ? "" : s.sort);
    if (s.view !== "cards") add("view", s.view);
    if (s.advanced) add("more", "1");
    if (s.offset) add("page", String(Math.floor(s.offset / s.limit) + 1));
    return p.join("&");
  }
  // Every mutation lands in the URL first, then repaints. replaceState (not the
  // hash) keeps the Back button meaningful: one Back leaves the module, it does
  // not walk through every keystroke of a search.
  function commit(scope, patch, opts) {
    var s = scopeState(scope), o = opts || {};
    Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    var base = scope === "owner" ? "owner" : "ads";
    var qs = buildQuery(s);
    var next = "#/" + base + (qs ? "?" + qs : "");
    if (location.hash !== next) {
      try { history.replaceState(null, "", next); } catch (e) { location.hash = next; }
    }
    s.loaded = false;
    render();
    if (o.focus) restoreFocus(o.focus);
  }
  function commitTab(scope, tab) {
    var s = scopeState(scope);
    commit(scope, { tab: tab, offset: 0, effective: tab === "all" || tab === "overview" || tab === "report" ? s.effective : tab });
  }
  function hasFilters(s) {
    return !!(s.q || s.status || s.effective || s.adType || s.billing || s.advertiser || s.placement || s.from || s.to);
  }

  // A re-render replaces the whole DOM, so the caret is remembered and restored
  // — otherwise typing would drop one character per keystroke.
  var FOCUS = null;
  function rememberFocus() {
    var el = document.activeElement;
    if (!el || !el.id) { FOCUS = null; return; }
    var st = null;
    try { st = { start: el.selectionStart, end: el.selectionEnd }; } catch (e) { st = null; }
    FOCUS = { id: el.id, sel: st };
  }
  function restoreFocus(f) {
    var f2 = f || FOCUS;
    FOCUS = null;
    if (!f2) return;
    var el = document.getElementById(f2.id);
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) { } }
    if (f2.sel && el.setSelectionRange) { try { el.setSelectionRange(f2.sel.start, f2.sel.end); } catch (e) { } }
  }
  // Search is debounced so typing does not fire a request per keystroke. The
  // control that owns the caret is remembered, because the repaint replaces the
  // whole DOM and would otherwise drop the character being typed.
  var TYPER = null;
  function onType(key, value) {
    var el = document.activeElement;
    if (el && el.id) {
      var sel = null;
      try { sel = { start: el.selectionStart, end: el.selectionEnd }; } catch (e) { sel = null; }
      FOCUS = { id: el.id, sel: sel };
    }
    if (TYPER) clearTimeout(TYPER);
    var patch = {}; patch[key] = value; patch.offset = 0;
    TYPER = setTimeout(function () { TYPER = null; commit(CURRENT, patch, { focus: true }); }, 320);
  }

  // ===========================================================================
  // 4. Data access
  // ===========================================================================

  var EP = {
    admin: {
      list: "/api/admin/advertisements", summary: "/api/admin/advertisements/summary",
      one: function (id) { return "/api/admin/advertisements/" + encodeURIComponent(id); },
      history: function (id) { return "/api/admin/advertisements/" + encodeURIComponent(id) + "/history"; },
      create: "/api/admin/advertisements", update: function (id) { return "/api/admin/advertisements/" + encodeURIComponent(id); },
      review: function (id) { return "/api/admin/advertisements/" + encodeURIComponent(id) + "/review"; },
      transition: function (id) { return "/api/admin/advertisements/" + encodeURIComponent(id) + "/status"; },
      remove: function (id) { return "/api/admin/advertisements/" + encodeURIComponent(id); },
    },
    owner: {
      list: "/api/advertisements/mine/list", summary: "/api/advertisements/mine/summary",
      one: function (id) { return "/api/advertisements/mine/" + encodeURIComponent(id); },
      history: function (id) { return "/api/advertisements/mine/" + encodeURIComponent(id) + "/history"; },
      create: "/api/advertisements", update: function (id) { return "/api/advertisements/" + encodeURIComponent(id); },
      cancel: function (id) { return "/api/advertisements/" + encodeURIComponent(id) + "/cancel"; },
      resubmit: function (id) { return "/api/advertisements/" + encodeURIComponent(id) + "/resubmit"; },
    },
  };

  // The filter object the server understands. `advertiser` is passed
  // kind-qualified so an organization id never collides with a teacher id.
  function filterParams(scope, s) {
    var p = {};
    if (s.q) p.q = s.q;
    if (s.status) p.status = s.status;
    // The lifecycle tabs set `effective` themselves, so that value is an
    // artefact of WHICH TAB you are on, not a filter the reader chose. The
    // reports tab is excluded: it renders its own distribution-across-states
    // panel, so an inherited `effective` would make it describe an empty set
    // with no visible cause — visiting «مؤرشف» and then opening the reports
    // produced an all-zero report. Every filter the reader actually set (q,
    // type, billing, dates, advertiser) is still honoured, and the overview
    // keeps the value so the list and the summary never disagree.
    if (s.effective && s.tab !== "report") p.effective = s.effective;
    if (s.adType) p.adType = s.adType;
    if (s.billing) p.billing = s.billing;
    if (s.placement) p.placement = s.placement;
    if (s.from) p.from = s.from;
    if (s.to) p.to = s.to;
    if (s.sort) p.sort = s.sort;
    if (s.advertiser) {
      var i = s.advertiser.indexOf(":");
      if (i > 0) { p.advertiserKind = s.advertiser.slice(0, i); p.advertiserId = s.advertiser.slice(i + 1); }
    }
    return p;
  }
  function qs(p) {
    var out = [];
    Object.keys(p).forEach(function (k) { if (p[k] !== "" && p[k] != null) out.push(k + "=" + encodeURIComponent(p[k])); });
    return out.length ? "?" + out.join("&") : "";
  }

  // One request per filter set, guarded so a fast click storm cannot stack.
  // `sig` remembers the query the current data belongs to, so a repaint (the
  // summary arriving, the caret being restored) never refetches in a loop.
  function load(scope, opts) {
    var s = scopeState(scope), o = opts || {};
    var p = filterParams(scope, s);
    p.limit = s.limit; p.offset = s.offset;
    var sig = qs(p);
    if (!o.force && s.loaded && s.sig === sig) return;
    if (s.loading && !o.force) return;
    s.sig = sig;
    s.loading = true; s.error = null;
    if (!o.silent) render();
    apiGet(EP[scope].list + sig).then(function (d) {
      s.rows = (d && d.items) || [];
      s.total = num(d && d.total);
      s.loading = false; s.loaded = true;
      render();
    }).catch(function (e) {
      s.loading = false; s.loaded = true; s.error = errText(e); s.rows = []; s.total = 0; render();
    });
    // The counters describe the searched population, not the whole table, so the
    // tab badges stay honest while a filter is applied.
    var sp = filterParams(scope, s);
    delete sp.sort;
    apiGet(EP[scope].summary + qs(sp)).then(function (d) { s.summary = d || null; render(); })
      .catch(function () { s.summary = null; });
  }

  // The single-advertisement reads answer `{ item: {...} }` while the list
  // answers `{ items: [...] }` and the workflow writes answer the bare row. Read
  // both shapes: assigning the wrapper itself silently yields an "empty"
  // advertisement — no name, no status, and a derived state of "archived"
  // because `status` is undefined, which looks like real data rather than a
  // shape mismatch.
  function unwrapItem(d) { return (d && d.item) ? d.item : d; }

  function loadOne(scope, id, force) {
    var s = scopeState(scope);
    if (!id) return;
    // Three guards, because `render()` runs on every repaint and the detail view
    // asks for its row each time:
    //   - `oneInFlight` stops a second request while one is already open;
    //   - `oneId` stops a repaint re-requesting a row it already holds;
    //   - `oneTried` stops a repaint re-requesting a row that FAILED. Without it a
    //     persistent error is retried forever — the loop ends only when the browser
    //     runs out of sockets, which looks like the page is broken rather than the
    //     request being refused.
    // Only an explicit `force` (the refresh control, or a workflow action that
    // just changed the row) retries a previously failed id.
    if (s.oneInFlight && !force) return;
    if (String(s.oneId) === String(id) && !force && (s.one || s.oneTried)) return;
    if (s.oneInFlight && force && String(s.oneId) === String(id)) return;
    // A row deleted in this session is gone for good. The refresh that follows a
    // delete repaints once before the hash changes, and without this the detail
    // view asks the server for the row it just removed and logs a 404.
    if (String(s.gone) === String(id)) return;
    s.gone = null;
    s.oneId = id; s.oneTried = id; s.oneInFlight = true;
    s.oneLoading = true; s.one = null; s.oneError = null; s.history = null; s.historyLoading = true;
    apiGet(EP[scope].one(id)).then(function (d) {
      s.one = unwrapItem(d); s.oneLoading = false; s.oneInFlight = false; render();
      return apiGet(EP[scope].history(id));
    }).then(function (h) {
      s.history = (h && h.items) || []; s.historyLoading = false; render();
    }).catch(function (e) {
      s.oneLoading = false; s.oneInFlight = false; s.oneError = errText(e); render();
    });
  }
  function loadCatalog(force) {
    if (CATALOG.loading) return;
    if (CATALOG.loaded && !force) return;
    CATALOG.loading = true;
    apiGet("/api/advertisements/advertisers").then(function (d) {
      CATALOG.rows = (d && d.items) || []; CATALOG.loaded = true; CATALOG.loading = false;
    }).catch(function () { CATALOG.loading = false; });
  }
  function invalidate() { A.loaded = false; O.loaded = false; A.sig = null; O.sig = null; A.summary = null; O.summary = null; A.one = null; O.one = null; A.oneError = null; O.oneError = null; A.oneId = null; O.oneId = null; A.oneTried = null; O.oneTried = null; }

  // ===========================================================================
  // 5. Components
  // ===========================================================================

  function badge(key, big) {
    var m = stMeta(key);
    return '<span class="ads-badge' + (big ? " ads-badge--lg" : "") + '" data-tone="' + m.tone + '">' + esc(T(m.ar, m.en)) + "</span>";
  }
  // One media primitive for every surface. A stored path that no longer resolves
  // must not leave a torn image behind, so the element swaps its own source for
  // the same placeholder the "never had an image" case draws. The fallback rides
  // as an encoded data-URI, which keeps the inline handler free of nested quotes.
  var FALLBACK_SVG = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9aa4b2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-5 4 4 3-2 4 4"/></svg>');
  function thumb(row, variant, emptyIc) {
    var cls = "ads-media ads-media--" + (variant || "card");
    if (row && row.image) {
      return '<img class="' + cls + '" src="' + esc(mediaUrl(row.image)) + '" alt="" loading="lazy" ' +
        "onerror=\"this.onerror=null;this.src='" + FALLBACK_SVG + "'\" " +
        'style="background:var(--ads-wash);color:var(--ads-dim)">';
    }
    return '<span class="' + cls + ' ads-media--empty" aria-hidden="true">' + (emptyIc || mi("image", 16)) + "</span>";
  }
  function empty(iconName, title, text, actionHtml, inline) {
    return '<div class="ads-empty' + (inline ? " ads-empty--inline" : "") + '">' +
      '<span class="ads-empty-icon">' + mi(iconName, inline ? 20 : 24) + "</span>" +
      "<b>" + esc(title) + "</b>" + (text ? "<p>" + esc(text) + "</p>" : "") + (actionHtml || "") + "</div>";
  }
  function skeleton(rows) {
    var out = "";
    for (var i = 0; i < (rows || 3); i++) out += '<div class="ads-panel"><div class="ads-skel"><div class="ads-skel-line"></div><div class="ads-skel-line"></div><div class="ads-skel-line"></div><div class="ads-skel-line"></div></div></div>';
    return out;
  }
  function errorBox(msg, retryFn) {
    return '<div class="ads-error"><b>' + esc(T("تعذّر تحميل البيانات", "Could not load data")) + "</b><p>" + esc(msg) + "</p>" +
      (retryFn ? '<button class="btn" onclick="' + retryFn + '">' + mi("refresh", 14) + " " + esc(T("إعادة المحاولة", "Try again")) + "</button>" : "") + "</div>";
  }
  function note(text, tone) {
    return '<div class="ads-note-strip"' + (tone ? ' data-tone="' + tone + '"' : "") + ">" + mi("info", 15) + "<span>" + text + "</span></div>";
  }
  function panelHead(title, iconName, sub, actions) {
    return '<div class="ads-panel-head"><h2>' + mi(iconName, 16) + esc(title) + "</h2>" +
      (sub ? "<p>" + esc(sub) + "</p>" : "") + (actions ? '<div class="sp-actions">' + actions + "</div>" : "") + "</div>";
  }

  // --- section header -------------------------------------------------------
  function head(scope, s, extraActions) {
    var isOwner = scope === "owner";
    var title = isOwner ? T("إعلاناتي", "My Advertisements") : T("مركز إدارة الإعلانات", "Advertisement Management Center");
    var sub = isOwner
      ? T("تابع إعلاناتك في مكان واحد: من إرسالها للمراجعة حتى اعتمادها وظهورها في الشريط المتحرك.",
        "Track every advertisement in one place: from submission through approval to the live ticker.")
      : T("قرار واحد للإعلانات: من يطلب، من يعتمد، من يتوقف، وأرقام حقيقية من قاعدة البيانات — بلا تقدير.",
        "One place to decide advertisements: who is waiting, who is live, who is stopped, with real figures from the database — no estimates.");
    var acts = "";
    if (!isOwner) {
      acts += '<button class="btn" onclick="adsRefresh()">' + mi("refresh", 15) + " " + esc(T("تحديث", "Refresh")) + "</button>";
      acts += '<button class="btn green" onclick="adsOpenNew()">' + mi("plus", 15) + " " + esc(T("إعلان جديد", "New advertisement")) + "</button>";
    } else {
      acts += '<button class="btn green" onclick="adsOpenNew()">' + mi("plus", 15) + " " + esc(T("إعلان جديد", "New advertisement")) + "</button>";
    }
    // The admin section uses the platform-wide image hero with live figures from
    // the loaded summary; the owner view keeps its own lighter header.
    if (!isOwner && typeof sectionHero === "function") {
      var c = (s.summary && s.summary.counts) || {};
      return sectionHero({ route: "ads", title: title,
        subtitle: T("قرار واحد للإعلانات: من يطلب، من يعتمد، من يتوقف، وأرقام حقيقية من قاعدة البيانات.",
          "One place to decide advertisements: who is waiting, who is live, who is stopped, with real figures from the database."),
        actionHtml: (extraActions || "") + acts,
        stats: [
          { icon: "sparkle", value: num(s.summary && s.summary.total), labelAr: "إجمالي الإعلانات", labelEn: "Total advertisements", tone: "primary" },
          { icon: "check", value: num(c.active), labelAr: "نشطة", labelEn: "Active", tone: "pos" },
          { icon: "shield", value: num(c.pending), labelAr: "قيد المراجعة", labelEn: "Pending review", tone: "warn" },
          { icon: "calendar", value: num(c.scheduled), labelAr: "مجدولة", labelEn: "Scheduled", tone: "info" },
          { icon: "x", value: num(c.expired), labelAr: "منتهية", labelEn: "Expired", tone: "neg" }
        ],
        donut: { title: { ar: "الإعلانات حسب الحالة", en: "Ads by status" }, center: { ar: "إعلان", en: "ads" },
          categories: [
            { label: { ar: "نشطة", en: "Active" }, value: num(c.active) },
            { label: { ar: "قيد المراجعة", en: "Pending" }, value: num(c.pending) },
            { label: { ar: "مجدولة", en: "Scheduled" }, value: num(c.scheduled) },
            { label: { ar: "منتهية", en: "Expired" }, value: num(c.expired) }
          ] } });
    }
    return '<div class="ads-head"><div class="ads-head-text">' +
      '<h1>' + esc(title) + '<span class="ads-head-tag">' + esc(T("مركز تحكم", "Control center")) + "</span></h1>" +
      "<p>" + esc(sub) + "</p></div>" +
      '<div class="ads-head-actions">' + (extraActions || "") + acts + "</div></div>";
  }

  // --- tabs -----------------------------------------------------------------
  function tabCount(def, s) {
    if (!def.count || !s.summary) return null;
    var n = num(s.summary.counts && s.summary.counts[def.count]);
    if (def.extra) n += num(s.summary.counts && s.summary.counts[def.extra]);
    return n;
  }
  function tabs(scope, s) {
    return '<div class="ads-tabs"><div class="ads-tabs-scroll">' + TABS.map(function (t) {
      var n = tabCount(t, s);
      var show = t.key === "all" ? num(s.summary && s.summary.total) : n;
      return '<button type="button" class="' + (s.tab === t.key ? "active" : "") + (t.alert && n ? " ads-tab-alert" : "") +
        '" onclick="adsGo(\'' + t.key + '\')">' + mi(t.ic, 14) + esc(T(t.ar, t.en)) +
        (show ? '<span class="ads-tab-count" data-tone="' + (t.alert ? "warn" : "") + '">' + fmtNum(show) + "</span>" : "") +
        "</button>";
    }).join("") + "</div></div>";
  }

  // --- statistics board ----------------------------------------------------
  // A measured counter. There is no daily series in the schema, so no sparkline
  // and no "up / down" arrow is drawn — an invented trend is worse than none.
  function miniFig(ic, label, value) {
    return '<span class="ads-stat-mini">' + mi(ic, 14) + "<b>" + esc(value) + "</b><small>" + esc(label) + "</small></span>";
  }

  // The headline band: the one number that answers "how much do we have", the
  // live share derived from it, and the three counters PostgreSQL actually stores.
  function statHero(scope, s) {
    var sm = s.summary || {}, c = sm.counts || {}, p = sm.performance || {};
    var total = num(sm.total);
    var liveShare = total ? Math.round((num(c.active) / total) * 100) : 0;
    var parts = [
      { key: "active", n: num(c.active) }, { key: "scheduled", n: num(c.scheduled) },
      { key: "pending", n: num(c.pending) }, { key: "paused", n: num(c.paused) },
      { key: "expired", n: num(c.expired) }, { key: "rejected", n: num(c.rejected) },
      { key: "archived", n: num(c.archived) + num(c.cancelled) },
    ].filter(function (g) { return g.n > 0; });
    var bar = parts.length
      ? '<span class="ads-stat-bar" role="img" aria-label="' + esc(T("توزيع الإعلانات على الحالات", "Distribution across states")) + '">' +
        parts.map(function (g) {
          return '<i data-tone="' + stTone(g.key) + '" style="flex:' + g.n + '" title="' +
            esc(stLabel(g.key) + " · " + fmtNum(g.n)) + '" onclick="adsGo(\'' + g.key + '\')"></i>';
        }).join("") + "</span>"
      : "";
    return '<section class="ads-stat-hero">' +
      '<div class="ads-stat-hero-main">' +
      '<span class="ads-stat-hero-ic">' + mi(scope === "owner" ? "megaphone" : "tag", 22) + "</span>" +
      "<div><span class=\"ads-stat-hero-label\">" + esc(T("إجمالي الإعلانات", "Total advertisements")) + "</span>" +
      '<div class="ads-stat-hero-row"><b class="ads-stat-hero-num">' + fmtNum(total) + "</b>" +
      (total ? '<span class="ads-stat-hero-share">' + mi("sparkle", 13) + liveShare + "% " + esc(T("نشط الآن", "live now")) + "</span>" : "") +
      "</div></div></div>" +
      '<div class="ads-stat-hero-figs">' +
      miniFig("eye", T("مرات الظهور", "Impressions"), fmtNum(p.impressions)) +
      miniFig("target", T("النقرات", "Clicks"), fmtNum(p.clicks)) +
      miniFig("chart", T("نسبة النقر", "Click-through"), p.ctr == null ? "—" : p.ctr + "%") +
      "</div>" +
      // The section closes with </section>, NOT a second </div>. A </div> here has
      // no div in scope, so the parser pops the <section> and then the enclosing
      // .ads-page wrapper — which silently drops the whole overview body outside
      // the block that defines the --ads-* tokens. Every card below then loses its
      // background, border and padding while the layout still measures correctly.
      "</section>" + bar;
  }

  // One card per lifecycle state that actually has rows. The share is drawn as a
  // meter instead of printed as a percentage, and the filter scope is stated ONCE
  // under the strip rather than repeated inside all seven cards — five text
  // elements in a 140px box, seven identical footnotes, is noise that reads as
  // clutter rather than information.
  function statCard(o) {
    var share = o.total ? Math.round((o.n / o.total) * 100) : 0;
    var label = T(o.ar, o.en) + " — " + fmtNum(o.n) + " · " + share + "%";
    return '<button type="button" class="ads-stat" data-tone="' + (o.tone || "mute") + '" ' +
      'onclick="adsGo(\'' + o.tab + '\')" title="' + esc(label) + '" aria-label="' + esc(label) + '">' +
      '<span class="ads-stat-top"><span class="ads-stat-ic">' + mi(o.ic, 19) + "</span>" +
      '<span class="ads-stat-label">' + esc(T(o.ar, o.en)) + "</span></span>" +
      '<span class="ads-stat-value">' + fmtNum(o.n) + "</span>" +
      '<span class="ads-stat-meter" aria-hidden="true"><i style="width:' + Math.max(share, o.n > 0 ? 3 : 0) + '%"></i></span>' +
      "</button>";
  }

  // Layer 1 is the hero, layer 2 the lifecycle. The lifecycle renders the states
  // that HAVE rows as equal cards, and folds every empty state into one quiet
  // line. A wall of seven cards where five read «0» was the single biggest
  // reason this screen read as unfinished: the eye had nothing to land on, and
  // the two rows held differently sized cards because one had four and the other
  // three. One auto-fit grid gives every card the same width whatever the count.
  function statBoard(scope, s) {
    var sm = s.summary || {}, c = sm.counts || {};
    var total = num(sm.total);
    var all = [
      { tab: "active", ic: "sparkle", tone: "ok", n: num(c.active), ar: "نشط الآن", en: "Live now" },
      { tab: "pending", ic: "shield", tone: "warn", n: num(c.pending), ar: "قيد المراجعة", en: "Pending review" },
      { tab: "scheduled", ic: "calendar", tone: "info", n: num(c.scheduled), ar: "مجدول", en: "Scheduled" },
      { tab: "paused", ic: "stop", tone: "mute", n: num(c.paused), ar: "موقوف", en: "Paused" },
      { tab: "rejected", ic: "x", tone: "bad", n: num(c.rejected), ar: "مرفوض", en: "Rejected" },
      { tab: "expired", ic: "clock", tone: "mute", n: num(c.expired), ar: "منتهي", en: "Expired" },
      { tab: "archived", ic: "file", tone: "mute", n: num(c.archived) + num(c.cancelled), ar: "ملغي / مؤرشف", en: "Cancelled / archived" },
    ];
    var live = all.filter(function (o) { return o.n > 0; });
    var empty = all.filter(function (o) { return o.n === 0; });
    live.forEach(function (o) { o.total = total; });
    var strip = live.length
      ? '<div class="ads-stats">' + live.map(statCard).join("") + "</div>"
      : "";
    // The empty states keep their filter link, so nothing becomes unreachable —
    // they simply stop competing with the rows that need a decision.
    var emptyLine = empty.length
      ? '<p class="ads-stat-empty">' + esc(T("بلا صفوف:", "No rows in:")) +
        empty.map(function (o) {
          return '<button type="button" data-tone="' + o.tone + '" onclick="adsGo(\'' + o.tab + '\')">' +
            mi(o.ic, 13) + esc(T(o.ar, o.en)) + "</button>";
        }).join("") + "</p>"
      : "";
    return statHero(scope, s) + (strip || emptyLine ? '<div class="ads-stat-strip">' + strip + emptyLine + "</div>" : "");
  }

  // --- metric strip ---------------------------------------------------------
  function metricCard(ic, tone, value, label, sub) {
    return '<div class="ads-metric" data-tone="' + (tone || "mute") + '">' +
      '<span class="ads-metric-ic">' + mi(ic, 16) + "</span>" +
      "<b>" + esc(value) + "</b><span>" + esc(label) + "</span>" +
      (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>";
  }
  function metricStrip(s) {
    var p = (s.summary && s.summary.performance) || { impressions: 0, clicks: 0, ctr: null };
    return '<div class="ads-metrics">' +
      metricCard("eye", "info", fmtNum(p.impressions), T("مرات الظهور", "Impressions"), T("إجمالي المشاهدات المسجلة", "Total recorded views")) +
      metricCard("target", "ok", fmtNum(p.clicks), T("النقرات", "Clicks"), T("إجمالي النقرات المسجلة", "Total recorded clicks")) +
      metricCard("chart", "mute", p.ctr == null ? "—" : p.ctr + "%", T("نسبة النقر CTR", "Click-through rate"),
        p.ctr == null ? T("لا تُحسب قبل وجود ظهور واحد", "Not calculated before the first impression")
          : T("النقرات ÷ الظهور", "Clicks ÷ impressions")) +
      "</div>";
  }

  // --- distribution donut (real counts, every segment is a filter) ---------
  function distribution(s) {
    var c = (s.summary && s.summary.counts) || {};
    var groups = [
      { key: "active", n: num(c.active) },
      { key: "scheduled", n: num(c.scheduled) },
      { key: "pending", n: num(c.pending) },
      { key: "paused", n: num(c.paused) },
      { key: "expired", n: num(c.expired) },
      { key: "archived", n: num(c.archived) + num(c.cancelled) },
      { key: "rejected", n: num(c.rejected) },
    ].filter(function (g) { return g.n > 0; });
    var total = groups.reduce(function (s2, g) { return s2 + g.n; }, 0);
    if (!total) {
      return '<section class="ads-panel">' + panelHead(T("التوزيع حسب الحالة", "Distribution by status"), "chart", T("من الحالات التي تملك بيانات", "From the states that have data")) +
        '<div class="ads-panel-body">' + empty("chart", T("لا توجد بيانات بعد", "No data yet"), T("لم يُسجَّل أي إعلان في هذه النافذة.", "No advertisement has been recorded in this scope."), "", true) + "</div></section>";
    }
    var R = 54, C = 2 * Math.PI * R, off = 0;
    var segs = groups.map(function (g) {
      var len = (g.n / total) * C;
      var s = '<circle cx="66" cy="66" r="' + R + '" fill="none" stroke="var(--ads-' + stTone(g.key) + ')" stroke-width="16" ' +
        'stroke-dasharray="' + len.toFixed(2) + " " + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" ' +
        'transform="rotate(-90 66 66)" style="cursor:pointer" onclick="adsGo(\'' + g.key + '\')">' +
        "<title>" + esc(stLabel(g.key) + " — " + fmtNum(g.n)) + "</title></circle>";
      off += len;
      return s;
    }).join("");
    var legend = groups.map(function (g) {
      var share = Math.round((g.n / total) * 100);
      return '<button type="button" class="ads-legend-row" onclick="adsGo(\'' + g.key + '\')" title="' + esc(T("اعرض", "Show") + " " + stLabel(g.key)) + '">' +
        '<span class="ads-legend-dot" style="background:var(--ads-' + stTone(g.key) + ')"></span>' +
        '<span class="ads-legend-name">' + esc(stLabel(g.key)) + "</span>" +
        '<span class="ads-legend-bar"><i style="width:' + share + "%;background:var(--ads-" + stTone(g.key) + ')"></i></span>' +
        '<span class="ads-legend-val">' + fmtNum(g.n) + "</span></button>";
    }).join("");
    return '<section class="ads-panel">' +
      panelHead(T("التوزيع حسب الحالة", "Distribution by status"), "chart", T("اضغط أي شريحة لعرضها", "Click any segment to filter")) +
      '<div class="ads-panel-body"><div class="ads-dist">' +
      '<svg class="ads-donut" viewBox="0 0 132 132" role="img" aria-label="' + esc(T("توزيع الحالات", "Status distribution")) + '">' +
      '<circle cx="66" cy="66" r="' + R + '" fill="none" stroke="var(--ads-mute-bg)" stroke-width="16"></circle>' + segs +
      '<text class="ads-donut-big" x="66" y="66" text-anchor="middle" dominant-baseline="central">' + fmtNum(total) + "</text>" +
      '<text class="ads-donut-sub" x="66" y="86" text-anchor="middle">' + esc(T("إجمالي", "Total")) + "</text>" +
      "</svg>" +
      '<div class="ads-donut-legend">' + legend + "</div>" +
      "</div></div></section>";
  }

  // --- ranked performance (only measured rows are ranked) -------------------
  function ranked(s, metric) {
    var rows = s.rows.filter(function (r) { return num(r[metric]) > 0; })
      .slice().sort(function (a, b) { return num(b[metric]) - num(a[metric]); }).slice(0, 6);
    var label = metric === "clicks" ? T("الأكثر نقراً", "Most clicked") : T("الأكثر ظهوراً", "Most seen");
    var ic = metric === "clicks" ? "target" : "eye";
    var body = rows.length
      ? '<div class="ads-rank">' + rows.map(function (r) {
        var max = num(rows[0][metric]) || 1;
        return '<button type="button" class="ads-rank-row" onclick="adsOpenOne(\'' + r.id + '\')">' +
          '<span class="ads-rank-name">' + esc(r.name) + "</span>" +
          '<span class="ads-rank-val">' + fmtNum(r[metric]) + "</span>" +
          '<span class="ads-rank-track"><i style="width:' + Math.round((num(r[metric]) / max) * 100) + '%"></i></span>' +
          "</button>";
      }).join("") + "</div>"
      : empty(ic, T("لا توجد بيانات قياس", "No measurements"), T("لا يوجد أي ظهور أو نقرة مسجَّل لهذه الإعلانات بعد.", "No impression or click has been recorded for these advertisements yet."), "", true);
    return '<section class="ads-panel">' + panelHead(label, ic, T("من نتائج الصفحة الحالية", "From the current page")) +
      '<div class="ads-panel-body">' + body + "</div></section>";
  }

  // --- attention queue ------------------------------------------------------
  function attention(s) {
    var pending = s.rows.filter(function (r) { return r.status === "pending"; });
    var ending = s.rows.filter(function (r) { return rowBucket(r) === "active" && r.endAt; })
      .slice().sort(function (a, b) { return new Date(a.endAt) - new Date(b.endAt); }).slice(0, 3);
    var items = pending.map(function (r) { return { r: r, kind: "pending" }; })
      .concat(ending.map(function (r) { return { r: r, kind: "ending" }; }));
    var title = T("يحتاج انتباهك", "Needs your attention");
    var sub = pending.length
      ? T("إعلانات بانتظار قرارك", "Advertisements waiting for your decision")
      : T("لا يوجد إعلان بانتظار مراجعة", "Nothing is waiting for review");
    var body = items.length
      ? '<div class="ads-queue">' + items.map(function (it) {
        var r = it.r, b = rowBucket(r);
        var when = it.kind === "pending"
          ? T("أُرسل", "Submitted") + " " + fmtDateTime(r.submittedAt || r.createdAt)
          : T("ينتهي", "Ends") + " " + fmtDateTime(r.endAt);
        var acts = "";
        if (CURRENT === "admin" && r.status === "pending") {
          acts = '<button class="btn green" onclick="event.stopPropagation();adsQuickReview(\'' + r.id + '\',\'approve\')">' + mi("check", 14) + " " + esc(T("اعتماد", "Approve")) + "</button>" +
            '<button class="btn" onclick="event.stopPropagation();adsOpenOne(\'' + r.id + '\')">' + esc(T("مراجعة", "Review")) + "</button>";
        } else {
          acts = '<button class="btn" onclick="event.stopPropagation();adsOpenOne(\'' + r.id + '\')">' + esc(T("عرض", "View")) + "</button>";
        }
        return '<div class="ads-queue-item ads-queue-item--' + (it.kind === "pending" ? "alert" : "info") + '" tabindex="0" role="link" onclick="adsOpenOne(\'' + r.id + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \')adsOpenOne(\'' + r.id + '\')">' +
          thumb(r, "queue", mi("image", 18)) +
          '<span class="ads-queue-main"><b>' + esc(r.name) + "</b>" +
          '<span class="ads-queue-meta">' + badge(b) + "<span>" + esc(when) + "</span>" +
          "<span>" + esc(advertiserName(r)) + "</span></span></span>" +
          '<span class="ads-queue-actions">' + acts + "</span></div>";
      }).join("") + "</div>"
      : empty("shield", T("لا شيء عاجل", "Nothing urgent"), T("كل إعلان في هذه النافذة إما معتمد أو منتهي أو مؤرشف.", "Every advertisement here is approved, expired or archived."));
    return '<section class="ads-panel">' + panelHead(title, "alert", sub) + '<div class="ads-panel-body">' + body + "</div></section>";
  }

  // --- recent list ----------------------------------------------------------
  function recent(s) {
    var rows = s.rows.slice(0, 7);
    var body = rows.length
      ? '<div class="ads-recent">' + rows.map(function (r) {
        return '<button type="button" class="ads-recent-item" onclick="adsOpenOne(\'' + r.id + '\')">' +
          thumb(r, "recent", mi("image", 15)) +
          '<span class="ads-recent-main"><b>' + esc(r.name) + "</b><small>" +
          esc(advertiserName(r) + " · " + fmtDate(r.createdAt)) + "</small></span>" +
          '<span class="ads-recent-side">' + badge(rowBucket(r)) +
          '<span class="ads-recent-clicks">' + mi("target", 12) + "<b>" + fmtNum(r.clicks) + "</b></span></span></button>";
      }).join("") + "</div>"
      : empty("inbox", T("لا توجد إعلانات", "No advertisements"), T("لم يُسجَّل أي إعلان يطابق هذه التصفية.", "No advertisement matches this filter."));
    return '<section class="ads-panel">' + panelHead(T("أحدث الإعلانات", "Most recent advertisements"), "history", "") +
      '<div class="ads-panel-body ads-panel-body--flush">' + body + "</div></section>";
  }

  function advertiserName(r) {
    if (!r) return "—";
    return r.organizationName || r.teacherName || r.advertiser || T("غير محدد", "Not set");
  }
  function adTypeLabel(v2) { var p = AD_TYPES.filter(function (x) { return x[0] === v2; })[0]; return p ? T(p[1], p[2]) : (v2 || "—"); }
  function billingLabel(v2) { var p = BILLING.filter(function (x) { return x[0] === v2; })[0]; return p ? T(p[1], p[2]) : (v2 || "—"); }
  function windowText(r) {
    if (!r.startAt && !r.endAt) return T("بلا نافذة محددة", "No window set");
    return fmtDate(r.startAt) + " ← " + fmtDate(r.endAt);
  }

  // --- overview -------------------------------------------------------------
  // Three layers, each answering one question: how much is there and how is it
  // doing (hero), what state is it in (lifecycle strip), what needs me (attention)
  // and which advertisement is carrying the traffic (ranked / recent). The status
  // donut is deliberately NOT here — it re-drew the hero's stacked bar a third
  // time. It belongs on the reports tab, where the breakdown is the subject.
  function overview(scope, s) {
    var out = "";
    if (s.loading && !s.loaded) return skeleton(3);
    if (s.error) return errorBox(s.error, "adsRefresh()");
    out += statBoard(scope, s);
    out += '<div class="ads-split" style="margin-top:16px">' + attention(s) + recent(s) + "</div>";
    out += '<div class="ads-split ads-split--even" style="margin-top:16px">' +
      ranked(s, "clicks") + ranked(s, "impressions") + "</div>";
    return out;
  }

  // ===========================================================================
  // 6. Filter bar
  // ===========================================================================

  function selectField(label, key, pairs, cur, scope) {
    return '<div class="ads-field"><label>' + esc(label) + "</label><select id=\"ads-f-" + key + "\" onchange=\"adsSetFilter('" + key + "',this.value)\">" +
      pairs.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(cur) === String(p[0]) ? " selected" : "") + ">" + esc(p[1]) + "</option>"; }).join("") +
      "</select></div>";
  }
  function filterBar(scope, s) {
    var isOwner = scope === "owner";
    var pairs = function (list) { return list.map(function (x) { return [x[0], T(x[1], x[2])]; }); };
    var effectivePairs = [["", T("كل الحالات", "All states")]].concat(pairs([
      ["active", "نشط", "Active"], ["scheduled", "مجدول", "Scheduled"], ["pending", "قيد المراجعة", "Pending review"],
      ["paused", "موقوف", "Paused"], ["rejected", "مرفوض", "Rejected"], ["expired", "منتهي", "Expired"],
      ["cancelled", "ملغي", "Cancelled"], ["archived", "مؤرشف", "Archived"],
    ]));
    var top = '<div class="ads-field ads-field--search"><label>' + esc(T("بحث متقدم", "Advanced search")) + "</label>" +
      mi("search", 15) +
      '<input id="ads-f-q" value="' + esc(s.q) + '" placeholder="' +
      esc(T("ابحث بالاسم، المعلن، نص الإعلان…", "Search by name, advertiser, ad text…")) +
      '" oninput="adsType(\'q\',this.value)" autocomplete="off"></div>' +
      selectField(T("الحالة المشتقّة", "Derived state"), "effective", effectivePairs, s.effective) +
      selectField(T("الحالة المخزَّنة", "Stored status"), "status", [["", T("كل الحالات", "All statuses")]].concat(pairs(STORED_STATUS)), s.status) +
      selectField(T("الترتيب", "Sort"), "sort", pairs(SORTS), s.sort);

    var adv = "";
    if (s.advanced) {
      adv += selectField(T("نوع الإعلان", "Ad type"), "adType", [["", T("كل الأنواع", "All types")]].concat(pairs(AD_TYPES)), s.adType);
      adv += selectField(T("الفوترة", "Billing"), "billing", [["", T("كل الأنواع", "All billing")]].concat(pairs(BILLING)), s.billing);
      if (!isOwner) {
        var ap = [["", T("كل المعلنين", "All advertisers")]];
        CATALOG.rows.forEach(function (a) {
          ap.push([a.kind + ":" + a.id, a.name + (a.kind === "organization" && a.ownerName ? " — " + a.ownerName : "")]);
        });
        adv += selectField(T("المعلن", "Advertiser"), "advertiser", ap, s.advertiser);
      }
      adv += selectField(T("الموضع", "Placement"), "placement", [["", T("كل المواضع", "All placements")]].concat(pairs(PLACEMENTS)), s.placement);
      adv += '<div class="ads-field"><label>' + esc(T("يبدأ بعد", "Starts after")) + '</label><input type="date" id="ads-f-from" value="' + esc(s.from) + '" onchange="adsSetFilter(\'from\',this.value)"></div>';
      adv += '<div class="ads-field"><label>' + esc(T("ينتهي قبل", "Ends before")) + '</label><input type="date" id="ads-f-to" value="' + esc(s.to) + '" onchange="adsSetFilter(\'to\',this.value)"></div>';
    }
    var advCount = [s.adType, s.billing, s.advertiser, s.placement, s.from, s.to].filter(Boolean).length;
    var foot = '<span class="ads-count">' + esc(
      s.loading ? T("جارٍ التحميل…", "Loading…")
        : T("عدد النتائج", "Results") + ": " + fmtNum(s.total) +
        (hasFilters(s) ? " · " + T("مُصفّى", "filtered") : "")
    ) + "</span>";
    foot += '<button class="btn" onclick="adsToggleAdvanced()">' + mi("filter", 14) + esc(T("فلاتر متقدمة", "Advanced filters")) +
      (advCount ? ' <b class="ads-tab-count" data-tone="info">' + advCount + "</b>" : "") + "</button>";
    if (hasFilters(s) || s.sort !== "newest" || s.advanced) {
      foot += '<button class="btn" onclick="adsClearFilters()">' + mi("x", 14) + esc(T("مسح الكل", "Clear all")) + "</button>";
    }
    foot += '<button class="btn" onclick="adsSetView(\'' + (s.view === "cards" ? "table" : "cards") + '\')">' +
      mi(s.view === "cards" ? "list" : "grid", 14) + esc(s.view === "cards" ? T("عرض كجدول", "Table view") : T("عرض كبطاقات", "Card view")) + "</button>";
    return '<div class="ads-filters">' + top + (adv ? adv : "") + '<div class="ads-filters-foot">' + foot + "</div></div>";
  }

  // ===========================================================================
  // 7. List view (cards or table) + pagination
  // ===========================================================================

  function adCard(scope, r) {
    var b = rowBucket(r);
    var logo = orgLogo(r);
    var acts = "";
    if (scope === "admin") {
      if (r.status === "pending") {
        acts += '<button class="btn green" onclick="event.stopPropagation();adsQuickReview(\'' + r.id + '\',\'approve\')">' + mi("check", 14) + esc(T("اعتماد", "Approve")) + "</button>";
      } else if (r.status === "approved") {
        acts += '<button class="btn" onclick="event.stopPropagation();adsQuickTransition(\'' + r.id + '\',\'pause\')">' + mi("eye", 14) + esc(T("إيقاف", "Pause")) + "</button>";
      } else if (r.status === "paused") {
        acts += '<button class="btn green" onclick="event.stopPropagation();adsQuickTransition(\'' + r.id + '\',\'resume\')">' + mi("play", 14) + esc(T("استئناف", "Resume")) + "</button>";
      }
    } else {
      if (r.status === "rejected") {
        acts += '<button class="btn green" onclick="event.stopPropagation();adsResubmit(\'' + r.id + '\')">' + mi("refresh", 14) + esc(T("إعادة إرسال", "Resubmit")) + "</button>";
      }
      if (r.status !== "cancelled" && r.status !== "archived") {
        acts += '<button class="btn" onclick="event.stopPropagation();adsCancel(\'' + r.id + '\')">' + mi("x", 14) + esc(T("إلغاء", "Cancel")) + "</button>";
      }
    }
    acts += '<span class="sp-actions"></span>';
    return '<article class="ads-card" tabindex="0" role="link" onclick="adsOpenOne(\'' + r.id + '\')" ' +
      'onkeydown="if(event.key===\'Enter\'||event.key===\' \')adsOpenOne(\'' + r.id + '\')">' +
      '<div class="ads-card-media">' + thumb(r, "card", mi("image", 22)) + badge(b) + "</div>" +
      '<div class="ads-card-body">' +
      '<h3 class="ads-card-title">' + esc(r.name) + "</h3>" +
      '<div class="ads-card-sub">' + (logo ? '<img class="ads-card-logo" src="' + esc(mediaUrl(logo)) + '" alt="" loading="lazy">' : "") +
      "<span>" + esc(advertiserName(r)) + "</span><span>·</span><span>" + esc(adTypeLabel(r.adType)) + "</span></div>" +
      (r.messageAr || r.messageEn ? '<p class="ads-card-msg">' + esc(r.messageAr || r.messageEn) + "</p>" : "") +
      '<div class="ads-card-window">' + mi("calendar", 13) + "<span>" + esc(windowText(r)) + "</span></div>" +
      '<div class="ads-card-stats">' +
      "<span>" + mi("eye", 13) + esc(T("ظهور", "Impr.")) + " <b>" + fmtNum(r.impressions) + "</b></span>" +
      "<span>" + mi("target", 13) + esc(T("نقرات", "Clicks")) + " <b>" + fmtNum(r.clicks) + "</b></span>" +
      "<span>" + mi("chart", 13) + esc(T("CTR", "CTR")) + " <b>" + esc(pctText(r.impressions, r.clicks)) + "</b></span>" +
      "</div></div>" +
      (acts ? '<div class="ads-card-actions">' + acts + "</div>" : "") +
      "</article>";
  }

  function adTable(scope, rows) {
    return '<div class="ads-table-wrap"><table class="ads-table"><thead><tr>' +
      "<th>" + esc(T("الإعلان", "Advertisement")) + "</th>" +
      "<th>" + esc(T("المعلن", "Advertiser")) + "</th>" +
      "<th>" + esc(T("الحالة", "Status")) + "</th>" +
      "<th>" + esc(T("النافذة", "Window")) + "</th>" +
      '<th class="num">' + esc(T("ظهور", "Impr.")) + "</th>" +
      '<th class="num">' + esc(T("نقرات", "Clicks")) + "</th>" +
      '<th class="num">' + esc(T("CTR", "CTR")) + "</th>" +
      "<th></th></tr></thead><tbody>" +
      rows.map(function (r) {
        // The row opens the details page; every icon inside is a shortcut. The
        // action set is the one the SERVER permits for this audience, so an
        // owner is never offered a delete that would come back 403.
        var acts = '<div class="ads-crud">' +
          '<button onclick="event.stopPropagation();adsOpenOne(\'' + r.id + '\')" title="' + esc(T("عرض", "View")) + '">' + mi("eye", 14) + "</button>" +
          (scope === "admin"
            ? (r.status === "pending"
              ? '<button data-tone="ok" onclick="event.stopPropagation();adsQuickReview(\'' + r.id + '\',\'approve\')" title="' + esc(T("اعتماد", "Approve")) + '">' + mi("check", 14) + "</button>"
              : r.status === "approved"
                ? '<button onclick="event.stopPropagation();adsQuickTransition(\'' + r.id + '\',\'pause\')" title="' + esc(T("إيقاف", "Pause")) + '">' + mi("stop", 14) + "</button>"
                : r.status === "paused"
                  ? '<button data-tone="ok" onclick="event.stopPropagation();adsQuickTransition(\'' + r.id + '\',\'resume\')" title="' + esc(T("استئناف", "Resume")) + '">' + mi("play", 14) + "</button>"
                  : "") +
              '<button data-tone="bad" onclick="event.stopPropagation();adsRemove(\'' + r.id + '\')" title="' + esc(T("حذف", "Delete")) + '">' + mi("trash", 14) + "</button>"
            : (r.status === "rejected"
              ? '<button data-tone="ok" onclick="event.stopPropagation();adsResubmit(\'' + r.id + '\')" title="' + esc(T("إعادة إرسال", "Resubmit")) + '">' + mi("undo", 14) + "</button>"
              : (r.status !== "cancelled" && r.status !== "archived")
                ? '<button data-tone="bad" onclick="event.stopPropagation();adsCancel(\'' + r.id + '\')" title="' + esc(T("إلغاء", "Cancel")) + '">' + mi("x", 14) + "</button>"
                : "")) +
          '<button onclick="event.stopPropagation();adsOpenEdit(\'' + r.id + '\')" title="' + esc(T("تعديل", "Edit")) + '">' + mi("edit", 14) + "</button>" +
          "</div>";
        return '<tr class="row-click" tabindex="0" role="link" onclick="adsOpenOne(\'' + r.id + '\')" onkeydown="if(event.key===\'Enter\')adsOpenOne(\'' + r.id + '\')">' +
          '<td><div class="ads-cell-ad">' + thumb(r, "thumb", mi("image", 14)) +
          "<span><b>" + esc(r.name) + "</b><small>" + esc(adTypeLabel(r.adType) + " · " + billingLabel(r.billingMode) + " · " + fmtDate(r.createdAt)) + "</small></span></div></td>" +
          "<td>" + esc(advertiserName(r)) + "</td>" +
          "<td>" + badge(rowBucket(r)) + "</td>" +
          '<td class="win">' + esc(fmtDate(r.startAt) + " → " + fmtDate(r.endAt)) + "</td>" +
          '<td class="num">' + fmtNum(r.impressions) + "</td>" +
          '<td class="num">' + fmtNum(r.clicks) + "</td>" +
          '<td class="num">' + esc(pctText(r.impressions, r.clicks)) + "</td>" +
          "<td>" + acts + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function pager(scope, s) {
    if (!s.total) return "";
    var page = Math.floor(s.offset / s.limit) + 1;
    var pages = Math.max(1, Math.ceil(s.total / s.limit));
    var from = s.offset + 1, to = Math.min(s.total, s.offset + s.rows.length);
    var btns = "";
    for (var i = 1; i <= pages; i++) {
      if (pages > 9 && i > 2 && i < pages - 1 && Math.abs(i - page) > 1) {
        if (Math.abs(i - page) === 2) btns += '<button disabled>…</button>';
        continue;
      }
      btns += '<button class="' + (i === page ? "green" : "") + '" onclick="adsPage(' + ((i - 1) * s.limit) + ')">' + i + "</button>";
    }
    return '<div class="ads-pager"><span class="ads-pager-info">' +
      esc(T("عرض", "Showing") + " " + fmtNum(from) + "–" + fmtNum(to) + " " + T("من", "of") + " " + fmtNum(s.total)) +
      "</span>" +
      '<button onclick="adsPage(' + Math.max(0, s.offset - s.limit) + ')"' + (page <= 1 ? " disabled" : "") + ">" + esc(T("السابق", "Previous")) + "</button>" +
      '<span class="ads-pager-pages">' + btns + "</span>" +
      '<button onclick="adsPage(' + Math.min((pages - 1) * s.limit, s.offset + s.limit) + ')"' + (page >= pages ? " disabled" : "") + ">" + esc(T("التالي", "Next")) + "</button>" +
      '<select onchange="adsSetLimit(this.value)" style="height:38px;border:1px solid var(--ads-line);border-radius:9px;background:var(--ads-wash);color:var(--ads-ink);font-family:inherit;font-size:12px;padding:0 8px">' +
      [12, 24, 48, 100].map(function (n) { return '<option value="' + n + '"' + (n === s.limit ? " selected" : "") + ">" + n + "</option>"; }).join("") +
      "</select></div>";
  }

  function listView(scope, s) {
    var out = "";
    if (s.loading && !s.loaded) return skeleton(4);
    if (s.error) return errorBox(s.error, "adsRefresh()");
    var noRows = !s.rows.length;
    // Resolve the panel title through tabDef, never through stLabel(s.tab):
    // stLabel only knows lifecycle states, so the reports tab fell through to the
    // raw key and rendered a panel literally titled «report». tabDef always
    // answers with a translated label and falls back to the overview tab.
    var tdef = tabDef(s.tab);
    var title = scope === "owner" ? T("إعلاناتي", "My advertisements") : T(tdef.ar, tdef.en);
    if (s.tab === "all") title = T("كل الإعلانات", "All advertisements");
    if (s.tab === "archived") title = T("ملغي / مؤرشف", "Cancelled / archived");
    var clear = hasFilters(s)
      ? '<button class="ads-link" onclick="adsClearFilters()">' + mi("x", 13) + esc(T("مسح التصفية", "Clear filters")) + "</button>"
      : "";
    var body;
    if (noRows) {
      body = empty("search",
        hasFilters(s) ? T("لا نتائج لهذه التصفية", "No results for this filter") : T("لا توجد إعلانات بعد", "No advertisements yet"),
        hasFilters(s)
          ? T("وسّع النطاق أو امسح الفلاتر — التصفية تعمل على قاعدة البيانات كاملة، لا على نتائج مصفّاة.",
            "Widen the scope or clear the filters — filtering runs against the whole database, not a pre-cut list.")
          : (scope === "owner" ? T("أنشئ إعلانك الأول وأرسله للمراجعة.", "Create your first advertisement and submit it for review.")
            : T("أنشئ إعلاناً ليظهر هنا.", "Create an advertisement and it will appear here.")),
        hasFilters(s) ? '<button class="btn" onclick="adsClearFilters()">' + esc(T("مسح الفلاتر", "Clear filters")) + "</button>"
          : '<button class="btn green" onclick="adsOpenNew()">' + mi("plus", 14) + esc(T("إعلان جديد", "New advertisement")) + "</button>",
        false);
    } else {
      body = s.view === "cards"
        ? '<div class="ads-cards">' + s.rows.map(function (r) { return adCard(scope, r); }).join("") + "</div>"
        : adTable(scope, s.rows);
    }
    out += '<section class="ads-panel">' +
      panelHead(title, tabDef(s.tab).ic, T("اضغط أي صف لعرض التفاصيل الكاملة", "Click any row for the full details"), clear) +
      '<div class="ads-panel-body ads-panel-body--flush">' + body + "</div>" +
      pager(scope, s) + "</section>";
    return out;
  }

  // ===========================================================================
  // 8. Report view
  // ===========================================================================

  function reportModel(scope, s) {
    var isOwner = scope === "owner";
    var sm = s.summary || { total: 0, counts: {}, performance: {} };
    var p = sm.performance || {};
    var chips = [];
    if (s.q) chips.push(T("بحث", "Search") + ": " + s.q);
    if (s.effective) chips.push(stLabel(s.effective));
    if (s.status) chips.push(stLabel(s.status));
    if (s.adType) chips.push(adTypeLabel(s.adType));
    if (s.billing) chips.push(billingLabel(s.billing));
    if (s.from) chips.push(T("بعد", "After") + " " + fmtDate(s.from));
    if (s.to) chips.push(T("قبل", "Before") + " " + fmtDate(s.to));
    return {
      title: { ar: "تقرير الإعلانات", en: "Advertisement report" },
      subtitle: { ar: isOwner ? "إعلانات مؤسستك" : "منصة مدرستي", en: isOwner ? "Your institution" : "Madarasati platform" },
      period: {
        label: { ar: "نطاق التقرير", en: "Report scope" },
        fromLabel: chips.length ? chips.join(" · ") : T("كل الإعلانات", "All advertisements"),
        toLabel: T("أُنشئ", "Generated") + " " + fmtDateTime(new Date().toISOString()),
      },
      kpis: [
        { label: { ar: "إجمالي الإعلانات", en: "Total advertisements" }, value: fmtNum(sm.total) },
        { label: { ar: "نشط", en: "Active" }, value: fmtNum(sm.counts.active) },
        { label: { ar: "مجدول", en: "Scheduled" }, value: fmtNum(sm.counts.scheduled) },
        { label: { ar: "قيد المراجعة", en: "Pending review" }, value: fmtNum(sm.counts.pending) },
        { label: { ar: "مرات الظهور", en: "Impressions" }, value: fmtNum(p.impressions) },
        { label: { ar: "النقرات", en: "Clicks" }, value: fmtNum(p.clicks) },
        { label: { ar: "CTR", en: "CTR" }, value: p.ctr == null ? "—" : p.ctr + "%" },
      ],
      tables: [{
        key: "ads",
        title: { ar: "تفصيل الإعلانات", en: "Advertisement detail" },
        columns: [
          { key: "name", label: { ar: "الإعلان", en: "Advertisement" } },
          { key: "advertiser", label: { ar: "المعلن", en: "Advertiser" } },
          { key: "type", label: { ar: "النوع", en: "Type" } },
          { key: "status", label: { ar: "الحالة", en: "Status" }, type: "badge" },
          { key: "start", label: { ar: "يبدأ", en: "Starts" } },
          { key: "end", label: { ar: "ينتهي", en: "Ends" } },
          { key: "impressions", label: { ar: "ظهور", en: "Impressions" } },
          { key: "clicks", label: { ar: "نقرات", en: "Clicks" } },
          { key: "ctr", label: { ar: "CTR", en: "CTR" } },
        ],
        rows: s.rows.map(function (r) {
          return {
            name: r.name, advertiser: advertiserName(r), type: adTypeLabel(r.adType),
            status: { v: rowBucket(r) }, start: fmtDate(r.startAt), end: fmtDate(r.endAt),
            impressions: fmtNum(r.impressions), clicks: fmtNum(r.clicks), ctr: pctText(r.impressions, r.clicks),
          };
        }),
      }],
    };
  }

  function reportView(scope, s) {
    var out = "";
    if (s.loading && !s.loaded) return skeleton(3);
    if (s.error) return errorBox(s.error, "adsRefresh()");
    out += '<div class="ads-panel"><div class="ads-panel-head"><h2>' + mi("sheet", 16) + esc(T("ملخص التقرير", "Report summary")) + "</h2>" +
      "<p>" + esc(T("محسوب من نفس الاستعلام الذي يملأ الجدول", "Computed from the same query that fills the table")) + "</p>" +
      '<div class="sp-actions">' +
      '<button class="btn" onclick="adsExport(\'csv\')">' + mi("download", 14) + esc(T("CSV", "CSV")) + "</button>" +
      '<button class="btn" onclick="adsExport(\'xlsx\')">' + mi("sheet", 14) + esc(T("Excel", "Excel")) + "</button>" +
      '<button class="btn green" onclick="adsExport(\'print\')">' + mi("printer", 14) + esc(T("طباعة", "Print")) + "</button>" +
      '</div></div><div class="ads-panel-body">' + metricStrip(s) + "</div></div>";
    out += '<div class="ads-split" style="margin-top:14px">' + distribution(s) + ranked(s, "clicks") + "</div>";
    out += note(T(
      "تقرير صادق: قاعدة البيانات تخزّن عدّادين إجماليين (ظهور ونقرات) لكل إعلان، ولا تخزّن سجلاً يومياً. لذلك يعرض التقرير الأرقام الإجمالية والترتيب، ويعرض «—» بدلاً من نسبة نقر مخترَعة، ولا يرسم خطاً زمنياً غير موجود.",
      "An honest report: the database stores two aggregate counters per advertisement (impressions and clicks) and no daily log. So this report shows totals and ranking, prints “—” instead of an invented rate, and draws no timeline that does not exist."), "mute");
    out += '<div style="height:14px"></div>';
    out += listView(scope, s);
    return out;
  }

  // ===========================================================================
  // 9. Detail page
  // ===========================================================================

  function fieldCell(label, value, sub, dir) {
    return '<div class="ads-field-cell"><label>' + esc(label) + "</label><b" + (dir ? ' dir="ltr"' : "") + ">" +
      esc(value == null || value === "" ? "—" : value) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>";
  }
  function copyBlock(label, text, dir) {
    return '<div><label style="display:block;font-size:10.5px;font-weight:800;color:var(--ads-dim);margin-bottom:5px">' + esc(label) + "</label>" +
      (text ? '<div class="ads-copy"' + (dir ? ' dir="ltr"' : "") + ">" + esc(text) + "</div>"
        : '<div class="ads-copy ads-copy--empty">' + esc(T("لا يوجد نص", "No text")) + "</div>") + "</div>";
  }
  function previewBlock(r) {
    var target = r.targetRoute ? "#/" + r.targetRoute : r.targetUrl;
    return '<div class="ads-preview">' +
      '<span class="ads-preview-label">' + mi("eye", 13) + esc(T("معاينة تخطيطية — لا تنشر شيئاً", "Layout preview — publishes nothing")) + "</span>" +
      '<div class="ads-preview-frame">' +
      '<div class="ads-preview-banner">' + (r.image ? '<img src="' + esc(mediaUrl(r.image)) + '" alt="" loading="lazy">' : '<span class="ads-empty-icon">' + mi("image", 20) + "</span>") + "</div>" +
      '<div class="ads-preview-body">' +
      '<div class="ads-preview-title">' + esc(r.name) + "</div>" +
      ((r.messageAr || r.messageEn) ? '<p class="ads-preview-text">' + esc(r.messageAr || r.messageEn) + "</p>" : "") +
      (target ? '<span class="ads-preview-cta">' + esc(r.targetRoute || T("رابط خارجي", "External link")) + "</span>"
        : '<span class="ads-preview-cta ads-preview-cta--none">' + esc(T("بدون وجهة", "No destination")) + "</span>") +
      "</div></div></div>";
  }
  function timeline(s) {
    if (s.historyLoading) return '<div class="ads-skel"><div class="ads-skel-line"></div><div class="ads-skel-line"></div><div class="ads-skel-line"></div></div>';
    var items = s.history || [];
    if (!items.length) {
      return empty("history", T("لا يوجد سجل بعد", "No trail yet"), T("سجل الحركات يُكتب عند كل إجراء فعلي على الإعلان.", "The trail is written on every real action taken on this advertisement."), "", true);
    }
    return '<div class="ads-timeline">' + items.map(function (e) {
      var m = auditMeta(e.action);
      return '<div class="ads-tl-item" data-tone="' + m.tone + '"><span class="ads-tl-dot">' + mi(stIcon(e.status || (e.action.indexOf("reject") > -1 ? "rejected" : e.action.indexOf("approve") > -1 ? "approved" : "archived")), 12) + "</span>" +
        '<span class="ads-tl-body"><b>' + esc(T(m.ar, m.en)) + "</b><small>" +
        esc(fmtDateTime(e.at) + (e.actorName ? " · " + e.actorName : "") + (e.actorRole ? " (" + e.actorRole + ")" : "")) +
        "</small></span></div>";
    }).join("") + "</div>";
  }
  function approvalPanel(r, scope) {
    var b = rowBucket(r);
    var head2 = T("المراجعة والقرارات", "Review and decisions");
    if (scope === "admin") {
      var acts = "", noteHtml = "";
      if (r.rejectionReason) noteHtml += '<div class="ads-note" data-tone="bad"><b>' + esc(T("سبب الرفض", "Rejection reason")) + "</b>" + esc(r.rejectionReason) + "</div>";
      if (r.reviewNotes) noteHtml += '<div class="ads-note" data-tone="warn"><b>' + esc(T("ملاحظات المراجعة", "Review notes")) + "</b>" + esc(r.reviewNotes) + "</div>";
      if (r.status === "pending") {
        acts = '<div class="ads-decision"><label for="ads-review-notes">' + esc(T("ملاحظات المراجعة (تُحفظ مع القرار)", "Review notes (stored with the decision)")) + "</label>" +
          '<textarea id="ads-review-notes" placeholder="' + esc(T("اكتب سبب الطلب أو الرفض…", "State why changes are needed or why it is rejected…")) + '"></textarea>' +
          '<div class="ads-decision-row">' +
          '<button class="btn green" onclick="adsReview(\'' + r.id + '\',\'approve\')">' + mi("check", 14) + esc(T("اعتماد", "Approve")) + "</button>" +
          '<button class="btn" onclick="adsReview(\'' + r.id + '\',\'request_changes\')">' + esc(T("طلب تعديل", "Request changes")) + "</button>" +
          '<button class="btn" onclick="adsReview(\'' + r.id + '\',\'reject\')">' + mi("x", 14) + esc(T("رفض", "Reject")) + "</button>" +
          "</div></div>";
      } else {
        var t = [];
        if (r.status === "approved") {
          t.push(["pause", T("إيقاف الإعلان", "Pause"), "eye", ""]);
          t.push(["cancel", T("إلغاء الإعلان", "Cancel"), "x", "btn--danger"]);
          t.push(["archive", T("أرشفة", "Archive"), "file", ""]);
        } else if (r.status === "paused") {
          t.push(["resume", T("استئناف", "Resume"), "play", "green"]);
          t.push(["cancel", T("إلغاء الإعلان", "Cancel"), "x", "btn--danger"]);
          t.push(["archive", T("أرشفة", "Archive"), "file", ""]);
        } else if (r.status === "rejected") {
          t.push(["archive", T("أرشفة", "Archive"), "file", ""]);
        } else {
          t.push(["archive", T("أرشفة", "Archive"), "file", ""]);
        }
        acts = '<div class="ads-decision-row" style="padding:14px 15px;border-top:1px solid var(--ads-line)">' +
          t.map(function (x) {
            return '<button class="btn ' + x[3] + '" onclick="adsTransition(\'' + r.id + '\',\'' + x[0] + '\')">' + mi(x[2], 14) + esc(T(x[1], x[1])) + "</button>";
          }).join("") + "</div>";
      }
      return '<section class="ads-approval" data-tone="' + stTone(b) + '"><div class="ads-approval-head">' +
        mi("shield", 16) + "<h3>" + esc(head2) + "</h3>" + badge(b) + "</div>" +
        (noteHtml ? '<div class="ads-approval-body">' + noteHtml + "</div>" : "") + acts + "</section>";
    }
    // Owner: no workflow state is editable here. The server owns the decision.
    var own = "";
    if (r.status === "rejected") {
      own = '<div class="ads-decision"><div class="ads-decision-row">' +
        '<button class="btn green" onclick="adsResubmit(\'' + r.id + '\')">' + mi("refresh", 14) + esc(T("إعادة إرسال للمراجعة", "Resubmit for review")) + "</button></div></div>";
    } else if (r.status !== "cancelled" && r.status !== "archived") {
      own = '<div class="ads-decision"><div class="ads-decision-row">' +
        '<button class="btn btn--danger" onclick="adsCancel(\'' + r.id + '\')">' + mi("x", 14) + esc(T("إلغاء الإعلان", "Cancel advertisement")) + "</button></div></div>";
    } else {
      own = '<div class="ads-decision"><div class="ads-decision-row"><span class="ads-note" data-tone="mute" style="width:100%">' +
        esc(T("هذا الإعلان خارج دورة الحياة ولا يقبل أي إجراء.", "This advertisement is out of the lifecycle and accepts no action.")) + "</span></div></div>";
    }
    var oNote = "";
    if (r.rejectionReason) oNote = '<div class="ads-note" data-tone="bad"><b>' + esc(T("سبب الرفض", "Rejection reason")) + "</b>" + esc(r.rejectionReason) + "</div>";
    if (r.reviewNotes) oNote += '<div class="ads-note" data-tone="warn"><b>' + esc(T("ملاحظات المراجعة", "Review notes")) + "</b>" + esc(r.reviewNotes) + "</div>";
    return '<section class="ads-approval" data-tone="' + stTone(b) + '"><div class="ads-approval-head">' +
      mi("shield", 16) + "<h3>" + esc(T("حالة الطلب", "Request state")) + "</h3>" + badge(b) + "</div>" +
      (oNote ? '<div class="ads-approval-body">' + oNote + "</div>" : "") + own + "</section>";
  }

  // Returns the page body only; adsPage() owns the .ads-page wrapper and the
  // back control, so nothing is nested twice.
  function detailView(scope, s) {
    if (s.oneLoading || (!s.one && !s.oneError)) return skeleton(3);
    if (s.oneError && !s.one) return errorBox(s.oneError, "adsRefresh()");
    var r = s.one, b = rowBucket(r);
    var hero = '<section class="ads-hero">' +
      '<div class="ads-hero-media">' + thumb(r, "hero", mi("image", 30)) +
      '<span class="ads-hero-badges">' + badge(b, true) +
      (r.status !== b ? '<span class="ads-badge ads-badge--plain" data-tone="mute">' + esc(T("مخزَّن:", "Stored:") + " " + stLabel(r.status)) + "</span>" : "") +
      "</span></div>" +
      '<div class="ads-hero-main">' +
      (r.organizationId
        ? (orgLogo(r) ? '<img class="ads-hero-logo" src="' + esc(mediaUrl(orgLogo(r))) + '" alt="" loading="lazy">' : '<span class="ads-hero-logo-empty">' + mi("building", 20) + "</span>")
        : '<span class="ads-hero-logo-empty">' + mi("user", 20) + "</span>") +
      "<div><h2 class=\"ads-hero-title\">" + esc(r.name) + "</h2><p class=\"ads-hero-sub\">" +
      "<span>" + esc(advertiserName(r)) + "</span><span>·</span><span>" + esc(adTypeLabel(r.adType)) + "</span>" +
      "<span>·</span><span>" + esc(billingLabel(r.billingMode)) + "</span>" +
      (r.organizationType ? "<span>·</span><span>" + esc(r.organizationType) + "</span>" : "") +
      "</p></div></div>" +
      '<div class="ads-hero-window">' +
      fieldCell(T("يبدأ", "Starts"), r.startAt ? fmtDateTime(r.startAt) : T("فورياً", "Immediately")) +
      fieldCell(T("ينتهي", "Ends"), r.endAt ? fmtDateTime(r.endAt) : T("بلا نهاية", "No end")) +
      fieldCell(T("الحالة المشتقّة", "Derived state"), stLabel(b), T("محسوبة من الاعتماد والنافذة", "Computed from approval plus window")) +
      fieldCell(T("الترتيب", "Priority"), String(num(r.priority))) +
      "</div>" +
      '<div class="ads-hero-actions">' +
      '<button class="btn" onclick="adsBackList()">' + mi("arrow", 14) + esc(T("رجوع", "Back")) + "</button>" +
      '<button class="btn" onclick="adsOpenEdit(\'' + r.id + '\')">' + mi("edit", 14) + esc(T("تعديل", "Edit")) + "</button>" +
      (scope === "admin" ? '<button class="btn btn--danger" onclick="adsRemove(\'' + r.id + '\')">' + mi("trash", 14) + esc(T("حذف", "Delete")) + "</button>" : "") +
      "</div></section>";

    var out = hero;
    out += '<div class="ads-split" style="margin-top:14px">' +
      '<div>' +
      '<section class="ads-panel">' + panelHead(T("المحتوى", "Content"), "edit", T("ما يراه الزائر في الشريط", "What a visitor sees in the ticker")) +
      '<div class="ads-panel-body" style="display:grid;gap:12px">' +
      (r.image ? '<div class="ads-media"><img src="' + esc(mediaUrl(r.image)) + '" alt="" loading="lazy"></div>' : "") +
      copyBlock(T("النص بالعربية", "Arabic text"), r.messageAr) +
      copyBlock(T("النص بالإنجليزية", "English text"), r.messageEn, true) +
      "</div></section>" +
      '<div style="height:14px"></div>' +
      '<section class="ads-panel">' + panelHead(T("الوجهة والموضع", "Target and placement"), "link") +
      '<div class="ads-panel-body"><div class="ads-fields">' +
      fieldCell(T("الموضع", "Placement"), (r.placement || []).map(function (p) { var d = PLACEMENTS.filter(function (x) { return x[0] === p; })[0]; return d ? T(d[1], d[2]) : p; }).join(" · ")) +
      fieldCell(T("وجهة داخلية", "Internal route"), r.targetRoute || "—", r.targetRoute ? "#/" + r.targetRoute : null, true) +
      fieldCell(T("رابط خارجي", "External URL"), r.targetUrl || "—", null, true) +
      fieldCell(T("ملاحظات داخلية", "Internal notes"), r.notes || "—") +
      fieldCell(T("أُرسل في", "Submitted"), fmtDateTime(r.submittedAt || r.createdAt)) +
      fieldCell(T("رُوجع في", "Reviewed"), fmtDateTime(r.reviewedAt)) +
      "</div></div></section>" +
      "</div>" +
      "<div>" +
      '<section class="ads-panel">' + panelHead(T("الأداء", "Performance"), "chart", T("أرقام مسجَّلة، بلا تقدير", "Recorded figures, no estimates")) +
      '<div class="ads-panel-body"><div class="ads-metrics" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
      metricCard("eye", "info", fmtNum(r.impressions), T("ظهور", "Impressions")) +
      metricCard("target", "ok", fmtNum(r.clicks), T("نقرات", "Clicks")) +
      metricCard("chart", "mute", pctText(r.impressions, r.clicks), T("CTR", "CTR")) +
      '</div><div style="height:12px"></div>' +
      note(T(
        "لا يوجد سجل أداء يومي مخزَّن لهذا الإعلان، لذلك لا نعرض مخططاً زمنياً. الأرقام أعلاه هي إجماليات من قاعدة البيانات.",
        "No daily performance log is stored for this advertisement, so no timeline is shown. The figures above are database totals."), "mute") +
      "</div></section>" +
      '<div style="height:14px"></div>' +
      '<section class="ads-panel">' + panelHead(T("سجل الحركات", "Activity trail"), "history", T("كل خطوة كتبها النظام فعلياً", "Every step the system actually wrote")) +
      '<div class="ads-panel-body">' + timeline(s) + "</div></section>" +
      "</div></div>";
    out += '<div style="height:14px"></div>';
    out += approvalPanel(r, scope);
    out += '<div style="height:14px"></div>';
    out += '<section class="ads-panel">' + panelHead(T("معاينة", "Preview"), "eye", T("شكل الإعلان كما سيظهر", "How the advertisement will look")) +
      '<div class="ads-panel-body">' + previewBlock(r) + "</div></section>";
    return out;
  }
  function backLink(scope) {
    return '<button type="button" class="uf-back" onclick="adsBackList()">' +
      esc(T("← العودة إلى", "← Back to") + " " + (scope === "owner" ? T("إعلاناتي", "my advertisements") : T("مركز الإعلانات", "the advertisement center"))) + "</button>";
  }

  // ===========================================================================
  // 10. Form (wizard)
  // ===========================================================================

  var STEPS = [
    { key: "basic", ar: "الأساسيات", en: "Basics" },
    { key: "content", ar: "المحتوى", en: "Content" },
    { key: "schedule", ar: "الجدولة", en: "Schedule" },
    { key: "review", ar: "المراجعة", en: "Review" },
  ];
  function stepLabel(k) { var s = STEPS.filter(function (x) { return x.key === k; })[0]; return s ? T(s.ar, s.en) : k; }
  function group(label, control, wide) {
    return '<div class="form-group' + (wide ? " ac-field-wide" : "") + '"><label>' + esc(label) + "</label>" + control + "</div>";
  }
  function textF(id, val, dir) { return '<input id="' + id + '" value="' + esc(val == null ? "" : val) + '"' + (dir ? ' dir="' + dir + '"' : "") + ">"; }
  function areaF(id, val, dir, rows) { return '<textarea id="' + id + '" rows="' + (rows || 3) + '"' + (dir ? ' dir="' + dir + '"' : "") + ">" + esc(val == null ? "" : val) + "</textarea>"; }
  function selF(id, pairs, val) {
    return '<select id="' + id + '" class="f-select">' + pairs.map(function (p) { return opt(p[0], p[1], String(val) === String(p[0])); }).join("") + "</select>";
  }
  function dateF(id, val) { return '<input id="' + id + '" type="datetime-local" dir="ltr" value="' + esc(toLocalInput(val)) + '">'; }

  function advertiserOptions(scope, cur) {
    var out = opt("", T("— اختر المعلن —", "— Choose advertiser —"), !cur);
    var groups = [];
    if (scope === "owner") {
      var orgs = [];
      try { orgs = (typeof ownData !== "undefined" && ownData.orgs) ? ownData.orgs : []; } catch (e) { orgs = []; }
      if (orgs.length) groups.push([T("مؤسساتي", "My institutions"), orgs.map(function (o) { return opt("organization:" + o.id, o.name, cur === "organization:" + o.id); })]);
      var teachers = CATALOG.rows.filter(function (a) { return a.kind === "teacher"; });
      if (teachers.length) groups.push([T("المعلمون (خاص)", "Private teachers"), teachers.map(function (a) { return opt("teacher:" + a.id, a.name, cur === "teacher:" + a.id); })]);
    } else {
      var orgs2 = CATALOG.rows.filter(function (a) { return a.kind === "organization"; });
      var teachers2 = CATALOG.rows.filter(function (a) { return a.kind === "teacher"; });
      if (orgs2.length) groups.push([T("المؤسسات (الملاك)", "Institutions (owners)"), orgs2.map(function (a) { return opt("organization:" + a.id, a.name + (a.ownerName ? " — " + a.ownerName : ""), cur === "organization:" + a.id); })]);
      if (teachers2.length) groups.push([T("المعلمون (خاص)", "Private teachers"), teachers2.map(function (a) { return opt("teacher:" + a.id, a.name, cur === "teacher:" + a.id); })]);
    }
    groups.forEach(function (g) { out += '<optgroup label="' + esc(g[0]) + '">' + g[1].join("") + "</optgroup>"; });
    return out;
  }

  // The wizard repaints one step at a time, so the controls of the previous step
  // are no longer in the DOM. The draft captured on every step change is what a
  // field must show, otherwise pressing Back would silently clear what was typed.
  function formRow(f) {
    var out = {}, base = f.row || {}, d = f.draft || {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(d).forEach(function (k) { if (d[k] !== undefined) out[k] = d[k]; });
    return out;
  }
  function advertiserKey(f) {
    if (f.draft && f.draft.adv) return f.draft.adv;
    if (f.adv) return f.adv;
    var r = f.row || {};
    return r.organizationId ? "organization:" + r.organizationId : r.teacherId ? "teacher:" + r.teacherId : "";
  }

  function formBody(scope, f) {
    var r = formRow(f);
    var cur = advertiserKey(f);
    if (f.tab === "basic") {
      return '<div class="form-row2 ac-field-wide">' +
        group(T("اسم الإعلان", "Advertisement name"), textF("ads-n-name", r.name)) +
        group(T("المعلن", "Advertiser"), '<select id="ads-n-adv" class="f-select">' + advertiserOptions(scope, cur) + "</select>") +
        "</div>" +
        '<div class="form-row2 ac-field-wide">' +
        group(T("نوع الإعلان", "Ad type"), selF("ads-n-type", AD_TYPES.map(function (x) { return [x[0], T(x[1], x[2])]; }), r.adType || "general")) +
        group(T("الفوترة", "Billing"), selF("ads-n-bill", BILLING.map(function (x) { return [x[0], T(x[1], x[2])]; }), r.billingMode || "free")) +
        "</div>" +
        (scope === "admin" ? '<div class="form-row2 ac-field-wide">' +
          group(T("الحالة المخزَّنة", "Stored status"), selF("ads-n-status", STORED_STATUS.map(function (x) { return [x[0], T(x[1], x[2])]; }), r.status || "pending")) +
          group(T("الترتيب", "Priority"), '<input id="ads-n-prio" type="number" dir="ltr" min="0" value="' + esc(r.priority == null ? 0 : r.priority) + '">') +
          "</div>" : "") +
        note(T(
          "«نشط» و«مجدول» و«منتهي» ليست خيارات تُكتب: تُشتق من الحالة المخزَّنة مع النافذة الزمنية. «قيد المراجعة» هي نقطة البداية لأي إعلان جديد.",
          "“Active”, “scheduled” and “expired” are not written anywhere: they are derived from the stored status plus the window. “Pending review” is the starting point for a new advertisement."));
    }
    if (f.tab === "content") {
      return '<div class="form-row2 ac-field-wide">' +
        group(T("نص الإعلان (عربي)", "Message (Arabic)"), areaF("ads-n-mar", r.messageAr)) +
        group(T("نص الإعلان (إنجليزي)", "Message (English)"), areaF("ads-n-men", r.messageEn, "ltr")) +
        "</div>" +
        '<div class="ac-field-wide">' + ufImageUpload("ads-n-image", T("صورة الإعلان", "Advertisement image"), mediaUrl(r.image), "banners", {
          hint: T("PNG أو JPG أو WEBP. تُعرض في الشريط المتحرك بنسبة عريضة.", "PNG, JPG or WEBP. The ticker shows it in a wide strip."),
        }) + "</div>" +
        '<div class="form-row2 ac-field-wide">' +
        group(T("رابط خارجي", "External URL"), textF("ads-n-url", r.targetUrl, "ltr")) +
        group(T("وجهة داخلية", "Internal route"), selF("ads-n-route", [["", "—"]].concat(CTA_ROUTES.map(function (x) { return [x, x]; })), r.targetRoute || "")) +
        "</div>";
    }
    if (f.tab === "schedule") {
      return '<div class="form-row2 ac-field-wide">' +
        group(T("يبدأ في", "Starts at"), dateF("ads-n-start", r.startAt)) +
        group(T("ينتهي في", "Ends at"), dateF("ads-n-end", r.endAt)) +
        "</div>" +
        '<div class="ac-field-wide">' + group(T("ملاحظات داخلية", "Internal notes"), textF("ads-n-notes", r.notes)) + "</div>" +
      note(T(
        "اترك الحقلين فارغين ليعمل الإعلان فور الاعتماد، أو حدّد نافذة زمنية واحدة لعرضه داخلها فقط.",
        "Leave both empty to have the advertisement run from the moment it is approved, or set a window to show it only inside it."));
    }
    // review — the previous steps are no longer in the DOM, so the preview is
    // drawn from the draft rather than from fields that do not exist any more.
    var draft = {
      name: r.name, messageAr: r.messageAr, messageEn: r.messageEn, image: r.image,
      targetRoute: r.targetRoute, targetUrl: r.targetUrl,
      organizationId: r.organizationId, organizationType: r.organizationType,
    };
    return '<div class="ac-field-wide"><div class="ads-panel">' + panelHead(T("معاينة قبل الحفظ", "Preview before saving"), "eye", T("لن يُحفظ شيء قبل الضغط على «حفظ البيانات»", "Nothing is saved until you press Save")) +
      '<div class="ads-panel-body">' + previewBlock(draft) + "</div></div></div>" +
      '<div class="ac-field-wide">' + note(f.mode === "edit"
        ? T("الحفظ سيحدّث بيانات هذا الإعلان فقط، ولا يغيّر حالته إلا إذا غيّرتَها أنت.",
            "Saving updates this advertisement only, and its status changes only if you change it.")
        : T("الحفظ سيُنشئ إعلاناً جديداً في حالة «قيد المراجعة». لا يظهر في الشريط المتحرك إلا بعد اعتماده من الإدارة.",
            "Saving creates a new advertisement in “pending review”. It reaches the ticker only after administration approves it."),
        "info") + "</div>";
  }

  function formView(scope, s) {
    var f = s.form;
    if (!f) return "";
    if (f.mode === "edit" && !f.row && !f.error) return skeleton(2);
    var idx = STEPS.map(function (x) { return x.key; }).indexOf(f.tab);
    var defs = STEPS.map(function (x) { return [x.key, T(x.ar, x.en)]; });
    // The back control returns to the list the user came from, keeping the
    // filters and the page they were on instead of resetting the view.
    var backQ = buildQuery(s);
    return formPage({
      back: scope === "owner" ? "owner/ads" : ("ads" + (backQ ? "?" + backQ : "")),
      backLabel: T("← العودة إلى القائمة", "← Back to the list"),
      error: f.error || null,
      busy: s.saving,
      title: f.mode === "edit" ? T("تعديل إعلان", "Edit advertisement") : T("إعلان جديد", "New advertisement"),
      subtitle: scope === "owner"
        ? T("يُرسل للمراجعة تلقائياً، وتقرر الإدارة القبول أو الطلب أو الرفض.", "It is submitted for review; administration decides to accept, request changes, or reject.")
        : T("إعلان الشريط المتحرك. لا يظهر إلا بعد الاعتماد ودخول النافذة الزمنية.", "A ticker advertisement. It appears only after approval and inside its schedule window."),
      tabs: '<div class="ac-field-wide uf-wide">' + ufTabStrip(defs, f.tab, "adsStep") + "</div>",
      body: formBody(scope, f),
      actions: ufWizardFooter({
        index: idx, total: STEPS.length, busy: s.saving,
        onCancel: "adsCloseForm()", onBack: "adsStep('" + (STEPS[Math.max(0, idx - 1)].key) + "')",
        onNext: "adsNextStep()", onSave: "adsSave()",
      }),
    });
  }

  // ===========================================================================
  // 11. Actions
  // ===========================================================================

  var CURRENT = "admin";

  // Which audience is on screen. #/owner/ads/... is the owner's own route, so a
  // direct deep link resolves to the owner's scope rather than the admin one.
  function routeScope() {
    return (route() === "owner" && routeSub() === "ads" && seg(2)) ? "owner" : "admin";
  }

  // "Are we looking at a detail page right now?" The two scopes put the
  // literal "view" at a different depth — #/ads/view/:id is segment 1, while
  // #/owner/ads/view/:id is segment 2 — so this cannot be a single index. Getting
  // it wrong means a review decision lands and the screen never updates, or a
  // cancel silently stays on a page that no longer exists.
  function onDetailRoute() {
    return CURRENT === "owner" ? seg(2) === "view" : routeSub() === "view";
  }

  function goList() {
    if (CURRENT === "owner") {
      // Back to the owner's dashboard, on the advertisements tab.
      try { ownData.tab = "ads"; } catch (e) { }
      if (("#/owner") === location.hash) { render(); return; }
      location.hash = "#/owner";
      return;
    }
    var s = scopeState(CURRENT);
    var qs2 = buildQuery(s);
    var next = "ads" + (qs2 ? "?" + qs2 : "");
    if (("#/" + next) === location.hash) render(); else go(next);
  }

  function adsGo(tab) { rememberFocus(); commitTab(CURRENT, tab); }
  function adsSetFilter(key, value) { rememberFocus(); var p = {}; p[key] = value; p.offset = 0; commit(CURRENT, p); }
  function adsType(key, value) { onType(key, value); }
  function adsToggleAdvanced() { rememberFocus(); commit(CURRENT, { advanced: !scopeState(CURRENT).advanced }); }
  function adsClearFilters() {
    rememberFocus();
    commit(CURRENT, { q: "", status: "", effective: "", adType: "", billing: "", advertiser: "", placement: "", from: "", to: "", sort: "newest", offset: 0 });
  }
  function adsSetView(view) { rememberFocus(); commit(CURRENT, { view: view, offset: 0 }); }
  function adsSetLimit(value) { rememberFocus(); commit(CURRENT, { limit: clampNum(value, 6, 200), offset: 0 }); }
  function adsPage(offset) {
    rememberFocus();
    var s = scopeState(CURRENT);
    commit(CURRENT, { offset: Math.max(0, Math.min(offset, Math.max(0, s.total - 1))) });
  }
  function adsRefresh() { invalidate(); var s = scopeState(CURRENT); s.loaded = false; load(CURRENT, { force: true }); }
  function adsOpenOne(id) {
    if (CURRENT === "owner") go("owner/ads/view/" + encodeURIComponent(id));
    else go("ads/view/" + encodeURIComponent(id));
  }
  function adsOpenEdit(id) {
    if (CURRENT === "owner") go("owner/ads/edit/" + encodeURIComponent(id));
    else go("ads/edit/" + encodeURIComponent(id));
  }
  function adsOpenNew() {
    if (CURRENT === "owner") go("owner/ads/new");
    else go("ads/new");
  }
  function adsBackList() { goList(); }
  function adsCloseForm() { scopeState(CURRENT).form = null; goList(); }

  // --- workflow ------------------------------------------------------------
  function afterWrite() {
    invalidate();
    var s = scopeState(CURRENT);
    s.loaded = false;
    s.form = null;
    load(CURRENT, { force: true });
  }
  function adsReview(id, decision) {
    var notes = v("ads-review-notes");
    if (decision !== "approve" && notes.length < 5) {
      alert(T("اكتب سبباً مختصراً (5 أحرف على الأقل) حتى يعرف المعلن ما الذي يجب تغييره.",
        "Write a short reason (at least 5 characters) so the advertiser knows what to change."));
      var el = document.getElementById("ads-review-notes");
      if (el) el.focus();
      return;
    }
    if (!window.confirm(T("تأكيد القرار على هذا الإعلان؟", "Confirm this decision?"))) return;
    apiPost(EP.admin.review(id), { decision: decision, notes: notes }).then(function () {
      scopeState(CURRENT).one = null;
      afterWrite();
      if (onDetailRoute()) loadOne(CURRENT, id, true);
    }).catch(function (e) { alert(errText(e)); });
  }
  function adsQuickReview(id, decision) {
    apiPost(EP.admin.review(id), { decision: decision, notes: "" }).then(function () {
      afterWrite();
      if (onDetailRoute()) loadOne(CURRENT, id, true);
    }).catch(function (e) { alert(errText(e)); });
  }
  function adsTransition(id, transition) {
    var labels = { pause: T("إيقاف", "pause"), resume: T("استئناف", "resume"), cancel: T("إلغاء", "cancel"), archive: T("أرشفة", "archive") };
    if (!window.confirm(T("هل تريد " + labels[transition] + " هذا الإعلان؟", "Do you want to " + labels[transition] + " this advertisement?"))) return;
    apiPost(EP.admin.transition(id), { transition: transition }).then(function () {
      afterWrite();
      if (onDetailRoute()) loadOne(CURRENT, id, true);
    }).catch(function (e) { alert(errText(e)); });
  }
  function adsQuickTransition(id, transition) { adsTransition(id, transition); }
  // Cancel and resubmit are the owner's endpoints. An owner token on an admin
  // URL is refused by the server, so the buttons are not even rendered there.
  function adsCancel(id) {
    if (CURRENT !== "owner") return;
    if (!window.confirm(T("إلغاء هذا الإعلان؟ سيخرج من الشريط المتحرّك.", "Cancel this advertisement? It leaves the ticker."))) return;
    apiPost(EP.owner.cancel(id), {}).then(function () {
      afterWrite();
      if (onDetailRoute()) loadOne(CURRENT, id, true);
    }).catch(function (e) { alert(errText(e)); });
  }
  function adsResubmit(id) {
    if (CURRENT !== "owner") return;
    if (!window.confirm(T("إعادة إرسال هذا الإعلان للمراجعة؟", "Resubmit this advertisement for review?"))) return;
    apiPost(EP.owner.resubmit(id), {}).then(function () {
      afterWrite();
      if (onDetailRoute()) loadOne(CURRENT, id, true);
    }).catch(function (e) { alert(errText(e)); });
  }
  function adsRemove(id) {
    if (CURRENT !== "admin") return;
    if (!window.confirm(T("حذف هذا الإعلان نهائياً؟ سيُسجَّل الحذف في سجل الحركات.", "Delete this advertisement permanently? The deletion is recorded in the trail."))) return;
    apiDelete(EP.admin.remove(id)).then(function () {
      scopeState(CURRENT).gone = id;
      afterWrite();
      if (onDetailRoute()) goList();
    }).catch(function (e) { alert(errText(e)); });
  }

  // --- form ----------------------------------------------------------------
  function adsStep(key) {
    var s = scopeState(CURRENT);
    if (!s.form) return;
    // The draft is read before a step change, so nothing typed is lost.
    adsDraft();
    s.form.tab = key;
    s.form.error = null;
    render();
  }
  function adsNextStep() {
    var s = scopeState(CURRENT);
    var idx = STEPS.map(function (x) { return x.key; }).indexOf(s.form.tab);
    if (idx < STEPS.length - 1) adsStep(STEPS[idx + 1].key);
    else adsSave();
  }
  // ufImageUpload keeps the stored path in a hidden input; only when that helper
  // is absent does an existing image have to survive on its own.
  function uploadedImage(f) {
    if (typeof window.ufUploadPath === "function") return ufUploadPath("ads-n-image");
    var d = f.draft || {};
    if (d.image !== undefined) return d.image;
    return (f.row && f.row.image) || "";
  }
  function adsDraft() {
    var s = scopeState(CURRENT), f = s.form;
    if (!f) return;
    f.draft = {
      name: v("ads-n-name"), adType: v("ads-n-type"), billingMode: v("ads-n-bill"),
      status: v("ads-n-status"), priority: v("ads-n-prio"), adv: v("ads-n-adv"),
      messageAr: v("ads-n-mar"), messageEn: v("ads-n-men"), image: uploadedImage(f),
      targetUrl: v("ads-n-url"), targetRoute: v("ads-n-route"),
      startAt: iso("ads-n-start"), endAt: iso("ads-n-end"), notes: v("ads-n-notes"),
    };
  }
  // Validation reads the DRAFT, not the DOM: the last step renders no inputs at
  // all, so a DOM-only guard would refuse a form the user filled in correctly.
  // The owner has no stored-status control, so that rule is admin-only.
  function firstProblem() {
    var f = scopeState(CURRENT).form || {};
    var d = f.draft || {};
    if (!d.name || d.name.length < 2)
      return { tab: "basic", id: "ads-n-name", tabLabel: stepLabel("basic"), label: T("اسم الإعلان", "Advertisement name") };
    if (!d.adv)
      return { tab: "basic", id: "ads-n-adv", tabLabel: stepLabel("basic"), label: T("المعلن", "Advertiser") };
    if (CURRENT === "admin" && !d.status)
      return { tab: "basic", id: "ads-n-status", tabLabel: stepLabel("basic"), label: T("الحالة المخزَّنة", "Stored status") };
    if (!d.messageAr && !d.messageEn && !d.image)
      return { tab: "content", id: "ads-n-mar", tabLabel: stepLabel("content"), label: T("نص أو صورة الإعلان", "an ad text or an image") };
    if ((d.messageAr || "").length > 240 || (d.messageEn || "").length > 240)
      return { tab: "content", id: "ads-n-mar", tabLabel: stepLabel("content"), label: T("النص أقصر من 240 حرفاً", "text under 240 characters") };
    return null;
  }
  function showProblem(hit) {
    var s = scopeState(CURRENT);
    s.form.tab = hit.tab;
    s.form.error = typeof window.ufValidationMessage === "function" ? ufValidationMessage(hit) : hit.label;
    // render() replaces the DOM, so the ring and the focus go on after the paint.
    window.ufPendingInvalid = hit;
    render();
  }
  function adsNextStep() {
    var s = scopeState(CURRENT), f = s.form;
    if (!f) return;
    var keys = STEPS.map(function (x) { return x.key; });
    var idx = keys.indexOf(f.tab);
    // Read the step the user is leaving, then refuse to move on only when the
    // missing field belongs to the step they are actually looking at.
    adsDraft();
    var problem = firstProblem();
    if (problem && keys.indexOf(problem.tab) <= idx) { showProblem(problem); return; }
    if (idx < STEPS.length - 1) { f.tab = keys[idx + 1]; f.error = null; render(); return; }
    adsSave();
  }
  function adsSave() {
    var s = scopeState(CURRENT), f = s.form;
    if (!f || s.saving) return;
    adsDraft();
    var problem = firstProblem();
    if (problem) { showProblem(problem); return; }
    var d = f.draft || {};
    var adv = d.adv || "";
    var payload = {
      name: d.name, advertiser: "", organizationId: null, teacherId: null,
      adType: d.adType || "general", billingMode: d.billingMode || "free",
      placement: ["ticker"], messageAr: d.messageAr || "", messageEn: d.messageEn || "",
      image: d.image || "", targetUrl: d.targetUrl || null, targetRoute: d.targetRoute || null,
      startAt: d.startAt, endAt: d.endAt, notes: d.notes || "",
    };
    if (adv.indexOf("organization:") === 0) { payload.organizationId = adv.slice(13); payload.advertiser = advName("organization", adv.slice(13)); }
    else if (adv.indexOf("teacher:") === 0) { payload.teacherId = adv.slice(8); payload.advertiser = advName("teacher", adv.slice(8)); }
    if (CURRENT === "admin") { payload.status = d.status || "pending"; payload.priority = num(d.priority); }
    s.saving = true; f.error = null; render();
    var req = f.mode === "edit" ? apiPut(EP[CURRENT].update(f.id), payload) : apiPost(EP[CURRENT].create, payload);
    req.then(function () {
      s.saving = false;
      afterWrite();
      goList();
    }).catch(function (e) {
      s.saving = false;
      f.error = errText(e);
      render();
    });
  }
  function advName(kind, id) {
    var hit = CATALOG.rows.filter(function (a) { return String(a.id) === String(id) && a.kind === kind; })[0];
    if (hit) return hit.name;
    if (kind === "organization") {
      try {
        var o = (typeof ownData !== "undefined" ? ownData.orgs : []).filter(function (x) { return String(x.id) === String(id); })[0];
        if (o) return o.name;
      } catch (e) { }
    }
    return "";
  }

  // --- export --------------------------------------------------------------
  function adsExport(format) {
    var s = scopeState(CURRENT);
    if (format === "print") { window.ReportExport.print(reportModel(CURRENT, s)); return; }
    // The file carries the whole filtered set, not only the visible page, and
    // says so when the database has more rows than one request returns.
    var p = filterParams(CURRENT, s);
    p.limit = 200; p.offset = 0;
    apiGet(EP[CURRENT].list + qs(p)).then(function (d) {
      var full = reportModel(CURRENT, s);
      full.tables[0].rows = (d.items || []).map(function (r) {
        return {
          name: r.name, advertiser: advertiserName(r), type: adTypeLabel(r.adType),
          status: { v: rowBucket(r) }, start: fmtDate(r.startAt), end: fmtDate(r.endAt),
          impressions: fmtNum(r.impressions), clicks: fmtNum(r.clicks), ctr: pctText(r.impressions, r.clicks),
        };
      });
      if (num(d.total) > (d.items || []).length) {
        full.subtitle = {
          ar: full.subtitle.ar + " · " + fmtNum(d.total) + " صف (الملف يحتوي أول " + fmtNum((d.items || []).length) + ")",
          en: full.subtitle.en + " · " + fmtNum(d.total) + " rows (file holds the first " + fmtNum((d.items || []).length) + ")",
        };
      }
      if (format === "xlsx") window.ReportExport.xlsx(full);
      else window.ReportExport.csv(full);
    }).catch(function (e) { alert(errText(e)); });
  }

  // ===========================================================================
  // 12. Page assembly + exports
  // ===========================================================================

  function centerPage(scope) {
    CURRENT = scope;
    syncState(scope);
    var s = scopeState(scope);
    load(scope);

    var body = '<div class="ads-page">' + head(scope, s);
    if (scope === "admin" && s.tab !== "overview" && s.tab !== "report") body += filterBar(scope, s);
    if (scope === "owner") body += filterBar(scope, s);
    body += tabs(scope, s);
    if (s.tab === "overview") body += overview(scope, s);
    else if (s.tab === "report") body += reportView(scope, s);
    else body += listView(scope, s);
    body += "</div>";
    return body;
  }

  function adsCenterPage() { return adminShell(centerPage("admin")); }

  // The owner's ads live inside the dashboard tab, so this returns the fragment
  // only — the shell is already applied by ownerDashboard().
  function ownerSection() { return centerPage("owner"); }

  // Owner routes the module owns: #/owner/ads, #/owner/ads/new,
  // #/owner/ads/edit/:id, #/owner/ads/view/:id. Returns null for every other
  // owner sub-route, so the dashboard keeps behaving exactly as before.
  function ownerPage() {
    if (routeSub() !== "ads") return null;
    // #/owner/ads is a shareable deep link to the dashboard's ads tab, so the
    // dashboard itself stays the one that renders it.
    if (!seg(2)) { try { ownData.tab = "ads"; } catch (e) { } return null; }
    CURRENT = "owner";
    return adsPage();
  }

  // ---- route dispatch ----------------------------------------------------
  function adsPage() {
    CURRENT = routeScope();
    var scope = CURRENT;
    var s = scopeState(scope);
    var sub = scope === "owner" ? seg(2) : routeSub();
    var id = scope === "owner" ? seg(3) : routeSubId();

    if (sub === "new") {
      if (!s.form || s.form.mode !== "create") {
        s.form = { mode: "create", tab: "basic", id: null, row: null, adv: "", draft: null };
        loadCatalog();
      }
      return formView(scope, s);
    }
    if (sub === "edit") {
      loadCatalog();
      if (id && (!s.form || String(s.form.id) !== String(id) || s.form.mode !== "edit")) {
        s.form = { mode: "edit", tab: "basic", id: id, row: null, error: null, draft: null };
        apiGet(EP[scope].one(id)).then(function (d) {
          s.form.row = unwrapItem(d);
          s.form.adv = s.form.row.organizationId ? "organization:" + s.form.row.organizationId : s.form.row.teacherId ? "teacher:" + s.form.row.teacherId : "";
          render();
        }).catch(function (e) { s.form.error = errText(e); render(); });
      }
      return formView(scope, s);
    }
    if (sub === "view") {
      loadOne(scope, id);
      return adminShell('<div class="ads-page">' + backLink(scope) + detailView(scope, s) + "</div>");
    }
    return adsCenterPage();
  }

  // ===========================================================================
  // 13. Wire up
  // ===========================================================================

  window.adsGo = adsGo;
  window.adsSetFilter = adsSetFilter;
  window.adsType = adsType;
  window.adsToggleAdvanced = adsToggleAdvanced;
  window.adsClearFilters = adsClearFilters;
  window.adsSetView = adsSetView;
  window.adsSetLimit = adsSetLimit;
  window.adsPage = adsPage;
  window.adsRefresh = adsRefresh;
  window.adsOpenOne = adsOpenOne;
  window.adsOpenEdit = adsOpenEdit;
  window.adsOpenNew = adsOpenNew;
  window.adsBackList = adsBackList;
  window.adsCloseForm = adsCloseForm;
  window.adsStep = adsStep;
  window.adsNextStep = adsNextStep;
  window.adsSave = adsSave;
  window.adsReview = adsReview;
  window.adsQuickReview = adsQuickReview;
  window.adsTransition = adsTransition;
  window.adsQuickTransition = adsQuickTransition;
  window.adsCancel = adsCancel;
  window.adsResubmit = adsResubmit;
  window.adsRemove = adsRemove;
  window.adsExport = adsExport;
  window.adsCenterPage = adsCenterPage;
  // The center REPLACES the legacy advertisements screens; slides and offers
  // keep the pages admin-marketing.js still provides.
  window.adsAdminPage = adsPage;
  window.adsOwnerPage = ownerPage;
  window.mkOwnerAdsSection = ownerSection;

  // A deep link painted by app.js before this file was parsed would keep the old
  // markup, so repaint once when the module loads on an advertisement route.
  try {
    var r = (typeof route === "function" ? route() : "");
    if (r === "ads") render();
  } catch (e) { }
})();
