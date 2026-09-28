// admin-marketing.js — Super Admin management for landing slides, ticker ads,
// and institution offers. Talks to the PostgreSQL-backed marketing module at
// /api/admin/* (server/modules/marketing). Loaded after app.js; app.js render()
// dispatches to these pages by name so a missing file degrades to the generic
// placeholder instead of breaking the shell.

var MK_CTA_ROUTES = ["home", "private", "government", "colleges", "institutes", "teachers", "schools", "login"];
// Only placements the frontend actually renders are offered. Advertisements
// render in the ticker; hero slides render in the landing hero (a separate
// concept). `banner` and `sidebar` were never rendered, so they are gone.
var MK_PLACEMENTS = ["ticker"];
var MK_SLIDE_TYPES = [["platform", "منصة", "Platform"], ["promotion", "عرض", "Promotion"], ["premium_ad", "إعلان مميز", "Premium ad"]];
var MK_SLIDE_STATUS = [["draft", "مسودة", "Draft"], ["approved", "معتمد", "Approved"], ["paused", "موقوف", "Paused"], ["rejected", "مرفوض", "Rejected"], ["expired", "منتهي", "Expired"]];
var MK_AD_TYPES = [["general", "عام", "General"], ["promotion", "ترويجي", "Promotion"], ["enrollment", "تسجيل", "Enrollment"], ["notice", "تنبيه", "Notice"]];
var MK_AD_BILLING = [["free", "مجاني", "Free"], ["paid", "مدفوع", "Paid"]];
// Stored workflow statuses. scheduled / active / expired are derived on the
// server (effectiveStatus) and shown per tab without being stored.
var MK_AD_STATUS = [["pending", "قيد المراجعة", "Pending"], ["approved", "معتمد", "Approved"], ["paused", "موقوف", "Paused"], ["rejected", "مرفوض", "Rejected"], ["cancelled", "ملغي", "Cancelled"], ["archived", "مؤرشف", "Archived"]];

var mkSlides = { rows: [], loading: false, loaded: false, error: null, info: null, saving: false, form: { open: false, mode: "create", id: null } };
var mkAds = { rows: [], loading: false, loaded: false, error: null, info: null, saving: false, form: { open: false, mode: "create", id: null }, tab: "overview", q: "" };
var mkOffers = { rows: [], loading: false, loaded: false, error: null, info: null, saving: false, orgs: [], loadingOrgs: false, form: { open: false, mode: "create", id: null }, tab: "all", q: "" };
var mkAdvertisers = { rows: [], loading: false, loaded: false };
var mkOwner = { ads: [], adsLoading: false, adsLoaded: false, offers: [], offersLoading: false, offersLoaded: false, error: null, adTab: "all", offerTab: "all", offerForm: false, adForm: false, orgs: [] };

// ----------------------------- helpers -----------------------------
function mkT(ar, en) { return lang === "ar" ? ar : en; }
function mkErr(e) { return (e && e.data && e.data.error) || (e && e.message) || "error"; }
function mkMedia(p) { if (!p) return ""; return /^https?:/i.test(p) ? p : (API_BASE + p); }
function mkFmtDate(v) { if (!v) return "—"; try { return new Date(v).toLocaleDateString(lang === "ar" ? "ar-YE" : "en-GB"); } catch (e) { return String(v); } }
function mkFmtDateTime(v) { if (!v) return "—"; try { return new Date(v).toLocaleString(lang === "ar" ? "ar-YE" : "en-GB", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return String(v); } }
function mkToLocalInput(v) {
  if (!v) return "";
  var d = new Date(v);
  if (isNaN(d.getTime())) return "";
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}
function mkVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
function mkChecked(id) { var el = document.getElementById(id); return !!(el && el.checked); }
function mkIso(id) { var v = mkVal(id); return v ? new Date(v).toISOString() : null; }
function mkPairs(list) { return list.map(function (x) { return [x[0], lang === "ar" ? x[1] : x[2]]; }); }
function mkGroup(label, control) { return '<div class="form-group"><label>' + esc(label) + '</label>' + control + '</div>'; }
function mkInputF(id, val, dir) { return '<input id="' + id + '" value="' + esc(val == null ? "" : val) + '"' + (dir ? ' dir="' + dir + '"' : "") + '>'; }
function mkArea(id, val, dir) { return '<textarea id="' + id + '" rows="2"' + (dir ? ' dir="' + dir + '"' : "") + '>' + esc(val == null ? "" : val) + '</textarea>'; }
function mkSelectF(id, pairs, val) { return '<select id="' + id + '" class="f-select">' + pairs.map(function (p) { return opt(p[0], p[1], String(val) === String(p[0])); }).join("") + '</select>'; }
function mkNumberF(id, val) { return '<input id="' + id + '" type="number" dir="ltr" value="' + esc(val == null ? "" : val) + '">'; }
function mkDateF(id, val) { return '<input id="' + id + '" type="datetime-local" dir="ltr" value="' + mkToLocalInput(val) + '">'; }
function mkCheckF(id, label, checked) { return '<label class="mk-check"><input type="checkbox" id="' + id + '"' + (checked ? " checked" : "") + '> <span>' + esc(label) + '</span></label>'; }
function mkUploadF(id, label, current, endpoint) {
  var prev = current ? '<img class="mk-prev" id="' + id + '-prev" src="' + esc(mkMedia(current)) + '" alt="">' : '<img class="mk-prev" id="' + id + '-prev" style="display:none" alt="">';
  return '<div class="form-group"><label>' + esc(label) + '</label><div class="doc-upload">' +
    '<input type="file" id="' + id + '" accept="image/png,image/jpeg,image/webp" onchange="mkUploadFile(this,\'' + id + '-val\',\'' + id + '-prev\',\'' + (endpoint || '/api/admin/uploads/banner') + '\')">' +
    '<input type="hidden" id="' + id + '-val" value="' + esc(current || "") + '">' + prev +
    '</div></div>';
}
function mkUploadFile(input, valId, prevId, endpoint) {
  var file = input.files && input.files[0];
  if (!file) return;
  var val = document.getElementById(valId), prev = document.getElementById(prevId);
  if (val) val.value = "";
  fetch(API_BASE + (endpoint || '/api/admin/uploads/banner'), {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': file.name }, body: file
  }).then(function (r) {
    return r.text().then(function (t) { var d = null; try { d = JSON.parse(t); } catch (e) { d = t; } if (!r.ok) throw new Error((d && d.error) || 'upload failed'); return d; });
  }).then(function (d) {
    if (val) val.value = d.path || "";
    if (prev) { prev.src = d.url || mkMedia(d.path); prev.style.display = ""; }
  }).catch(function (e) { alert(e.message); });
}
function mkStatusBadge(s) {
  var cls = s === "approved" || s === "active" ? "ok" : s === "pending" || s === "scheduled" ? "wait" : s === "paused" ? "wait" : "bad";
  var label = s;
  if (s === "pending") label = mkT("قيد المراجعة", "Pending review");
  else if (s === "active") label = mkT("نشط", "Active");
  else if (s === "scheduled") label = mkT("مجدول", "Scheduled");
  else if (s === "approved") label = mkT("معتمد", "Approved");
  else if (s === "paused") label = mkT("موقوف", "Paused");
  else if (s === "rejected") label = mkT("مرفوض", "Rejected");
  else if (s === "cancelled") label = mkT("ملغي", "Cancelled");
  else if (s === "archived") label = mkT("مؤرشف", "Archived");
  else if (s === "expired") label = mkT("منتهي", "Expired");
  return '<span class="badge ' + cls + '">' + esc(label) + '</span>';
}
function mkAdStatus(s) { return mkStatusBadge(s); }
function mkConfirm(msg) { return window.confirm(msg); }

// A deep link into an edit route can arrive with a list that was loaded earlier
// and is now stale (a row created in another tab, or just before this page
// loaded). Force exactly one refresh before declaring the record missing, so a
// valid link is never a dead end while a genuinely absent id still stops.
var mkEditRetry = {};
function mkEditMiss(kind, id, state) {
  var key = kind + ":" + String(id);
  if (!state.loaded || mkEditRetry[key]) return false;
  mkEditRetry[key] = true; state.loaded = false; return true;
}

// ----------------------------- loaders -----------------------------
function mkSlidesLoad() {
  if (mkSlides.loading || mkSlides.loaded) return;
  mkSlides.loading = true; mkSlides.error = null;
  apiGet('/api/admin/hero-slides').then(function (d) {
    mkSlides.rows = (d && d.items) || []; mkSlides.loaded = true; mkSlides.loading = false; render();
  }).catch(function (e) { mkSlides.loading = false; mkSlides.error = mkErr(e); render(); });
}
function mkAdsLoad() {
  if (mkAds.loading || mkAds.loaded) return;
  mkAds.loading = true; mkAds.error = null;
  apiGet('/api/admin/advertisements').then(function (d) {
    mkAds.rows = (d && d.items) || []; mkAds.loaded = true; mkAds.loading = false; render();
  }).catch(function (e) { mkAds.loading = false; mkAds.error = mkErr(e); render(); });
}
function mkOffersLoad() {
  if (!mkOffers.orgs.length && !mkOffers.loadingOrgs) {
    mkOffers.loadingOrgs = true;
    apiGet('/api/organizations?limit=200&offset=0').then(function (d) {
      mkOffers.orgs = (d && d.items) || []; mkOffers.loadingOrgs = false; render();
    }).catch(function () { mkOffers.loadingOrgs = false; });
  }
  if (mkOffers.loading || mkOffers.loaded) return;
  mkOffers.loading = true; mkOffers.error = null;
  apiGet('/api/admin/offers').then(function (d) {
    mkOffers.rows = (d && d.items) || []; mkOffers.loaded = true; mkOffers.loading = false; render();
  }).catch(function (e) { mkOffers.loading = false; mkOffers.error = mkErr(e); render(); });
}

// The «المعلن» dropdown source: institution owners and private teachers.
function mkAdvertisersLoad() {
  if (mkAdvertisers.loading || mkAdvertisers.loaded) return;
  mkAdvertisers.loading = true;
  apiGet('/api/advertisements/advertisers').then(function (d) {
    mkAdvertisers.rows = (d && d.items) || []; mkAdvertisers.loaded = true; mkAdvertisers.loading = false; render();
  }).catch(function () { mkAdvertisers.loading = false; });
}

// ----------------------------- slides -----------------------------
// Add/edit opens on its own route (#/slides/new, #/slides/edit/:id); the list
// page never carries the form inline.
function mkSlidesOpen(row) {
  mkSlides.form = row ? { open: true, mode: "edit", id: row.id, row: row } : { open: true, mode: "create", id: null, row: null };
  mkSlides.info = null;
  var target = "slides/" + (row ? "edit/" + encodeURIComponent(row.id) : "new");
  if (("#/" + target) === location.hash) render(); else go(target);
}
function mkSlidesClose() {
  mkSlides.form = { open: false, mode: "create", id: null, row: null };
  var target = "slides"; if (("#/" + target) === location.hash) render(); else go(target);
}
function mkSlideForm(f) {
  var r = f.row || {};
  var typeOpts = mkPairs(MK_SLIDE_TYPES), statusOpts = mkPairs(MK_SLIDE_STATUS);
  return formPage({ back: "slides", error: mkSlides.info || null, busy: mkSlides.saving,
    onSave: "mkSlideSubmit()", onCancel: "mkSlidesClose()",
    title: f.mode === "edit" ? mkT("تعديل شريحة", "Edit slide") : mkT("شريحة جديدة", "New slide"),
    subtitle: mkT("شريحة واحدة من شرائح الواجهة الرئيسية (بحد أقصى 6).", "One landing hero slide (maximum 6)."),
    body:
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("النوع", "Type"), '<select id="mk-s-type" class="f-select">' + typeOpts.map(function (p) { return opt(p[0], p[1], (r.type || "promotion") === p[0]); }).join("") + '</select>') +
      mkGroup(mkT("الحالة", "Status"), '<select id="mk-s-status" class="f-select">' + statusOpts.map(function (p) { return opt(p[0], p[1], (r.status || "draft") === p[0]); }).join("") + '</select>') +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("العنوان (عربي)", "Title (Arabic)"), mkInputF("mk-s-tar", r.titleAr)) +
      mkGroup(mkT("العنوان (إنجليزي)", "Title (English)"), mkInputF("mk-s-ten", r.titleEn, "ltr")) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("العنوان الفرعي (عربي)", "Subtitle (Arabic)"), mkInputF("mk-s-sar", r.subtitleAr)) +
      mkGroup(mkT("العنوان الفرعي (إنجليزي)", "Subtitle (English)"), mkInputF("mk-s-sen", r.subtitleEn, "ltr")) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("الشارة (عربي)", "Badge (Arabic)"), mkInputF("mk-s-bar", r.badgeAr)) +
      mkGroup(mkT("الشارة (إنجليزي)", "Badge (English)"), mkInputF("mk-s-ben", r.badgeEn, "ltr")) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("نص الصورة (عربي)", "Overlay (Arabic)"), mkArea("mk-s-oar", r.overlayTitleAr, "auto")) +
      mkGroup(mkT("نص الصورة (إنجليزي)", "Overlay (English)"), mkArea("mk-s-oen", r.overlayTitleEn, "ltr")) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("الموقع (عربي)", "Location (Arabic)"), mkInputF("mk-s-lar", r.locationAr)) +
      mkGroup(mkT("الموقع (إنجليزي)", "Location (English)"), mkInputF("mk-s-len", r.locationEn, "ltr")) +
    '</div>' +
    '<div class="ac-field-wide">' + mkUploadF("mk-s-image", mkT("صورة الشريحة (JPG/PNG/WEBP)", "Slide image (JPG/PNG/WEBP)"), r.image) + '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("موضع الصورة", "Image position"), mkSelectF("mk-s-ipos", [["center", mkT("وسط", "Center")], ["top", mkT("أعلى", "Top")], ["bottom", mkT("أسفل", "Bottom")]], r.imagePosition || "center")) +
      mkGroup(mkT("الترتيب", "Priority"), mkNumberF("mk-s-prio", r.priority == null ? 0 : r.priority)) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("نص الزر (عربي)", "CTA label (Arabic)"), mkInputF("mk-s-ctaar", r.ctaLabelAr)) +
      mkGroup(mkT("نص الزر (إنجليزي)", "CTA label (English)"), mkInputF("mk-s-ctaen", r.ctaLabelEn, "ltr")) +
    '</div>' +
    '<div class="ac-field-wide">' + mkGroup(mkT("وجهة الزر", "CTA route"), mkSelectF("mk-s-route", [[ "", "—" ]].concat(MK_CTA_ROUTES.map(function (x) { return [x, x]; })), r.ctaRoute || "")) + '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("يبدأ في", "Starts at"), mkDateF("mk-s-start", r.startAt)) +
      mkGroup(mkT("ينتهي في", "Ends at"), mkDateF("mk-s-end", r.endAt)) +
    '</div>' +
    '<div class="ac-field-wide">' + mkCheckF("mk-s-active", mkT("نشط", "Active"), r.active !== false) + '</div>' });
}
function mkSlideSubmit() {
  if (mkSlides.saving) return;
  var f = mkSlides.form;
  var payload = {
    type: mkVal("mk-s-type"), status: mkVal("mk-s-status"),
    titleAr: mkVal("mk-s-tar"), titleEn: mkVal("mk-s-ten"),
    subtitleAr: mkVal("mk-s-sar"), subtitleEn: mkVal("mk-s-sen"),
    badgeAr: mkVal("mk-s-bar"), badgeEn: mkVal("mk-s-ben"),
    overlayTitleAr: mkVal("mk-s-oar"), overlayTitleEn: mkVal("mk-s-oen"),
    locationAr: mkVal("mk-s-lar"), locationEn: mkVal("mk-s-len"),
    ctaLabelAr: mkVal("mk-s-ctaar"), ctaLabelEn: mkVal("mk-s-ctaen"),
    ctaRoute: mkVal("mk-s-route") || null,
    image: mkVal("mk-s-image"), imagePosition: mkVal("mk-s-ipos"),
    priority: Number(mkVal("mk-s-prio") || 0),
    startAt: mkIso("mk-s-start"), endAt: mkIso("mk-s-end"),
    active: mkChecked("mk-s-active")
  };
  if (!payload.titleAr && !payload.titleEn) { mkSlides.info = mkT("أدخل عنواناً واحداً على الأقل.", "Enter at least one title."); render(); return; }
  if (!payload.image) { mkSlides.info = mkT("ارفع صورة الشريحة.", "Upload a slide image."); render(); return; }
  mkSlides.saving = true; mkSlides.info = null;
  var req = f.mode === "edit" ? apiPut('/api/admin/hero-slides/' + f.id, payload) : apiPost('/api/admin/hero-slides', payload);
  req.then(function () {
    mkSlides.saving = false; mkSlides.form = { open: false, mode: "create", id: null }; mkSlides.loaded = false;
    var target = "slides"; if (("#/" + target) === location.hash) render(); else go(target);
    mkSlidesLoad();
  }).catch(function (err) { mkSlides.saving = false; mkSlides.info = mkErr(err); render(); });
}
function mkSlideStatus(id, status) {
  apiPut('/api/admin/hero-slides/' + id, { status: status, active: status === "approved" }).then(function () {
    mkSlides.loaded = false; mkSlidesLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function mkSlideMove(id, delta) {
  var row = mkSlides.rows.filter(function (x) { return String(x.id) === String(id); })[0];
  if (!row) return;
  var next = (Number(row.priority) || 0) + delta;
  apiPut('/api/admin/hero-slides/' + id, { priority: next }).then(function () {
    mkSlides.loaded = false; mkSlidesLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function mkSlideDelete(id) {
  if (!mkConfirm(mkT("حذف هذه الشريحة؟", "Delete this slide?"))) return;
  apiDelete('/api/admin/hero-slides/' + id).then(function () {
    mkSlides.loaded = false; mkSlidesLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function slidesAdminPage() {
  // Add/edit is a dedicated page now, so the list never renders the form.
  var sub = routeSub();
  if (sub === "new" || sub === "edit") return mkSlideFormPage();
  mkSlidesLoad();
  var ar = lang === "ar";
  var body = '<div class="welcome"><div><h1>' + esc(tr("slides")) + '</h1><p>' + (ar ? "إدارة شرائح الواجهة الرئيسية (بحد أقصى 6)." : "Manage landing hero slides (maximum 6).") + '</p></div>' +
    '<div class="sp-actions"><button class="btn brown" onclick="mkSlidesOpen()">' + icon("plus", 15) + ' ' + (ar ? "شريحة جديدة" : "New slide") + '</button></div></div>';
  body += '<section class="panel"><div class="panel-title"><div><h2>' + esc(tr("slides")) + '</h2><p>' + mkSlides.rows.length + ' / 6</p></div></div>';
  if (mkSlides.loading) body += '<div class="loading-inline"><div class="loader"></div></div>';
  else if (mkSlides.error) body += '<div class="empty-state">' + esc(mkSlides.error) + '</div>';
  else if (!mkSlides.rows.length) body += '<div class="empty-state">' + (ar ? "لا توجد شرائح بعد." : "No slides yet.") + '</div>';
  else body += '<div class="table-wrap"><table class="tbl"><thead><tr><th>' + (ar ? "الترتيب" : "Order") + '</th><th>' + (ar ? "العنوان" : "Title") + '</th><th>' + (ar ? "النوع" : "Type") + '</th><th>' + (ar ? "الحالة" : "Status") + '</th><th>' + (ar ? "نشط" : "Active") + '</th><th></th></tr></thead><tbody>' +
    mkSlides.rows.map(function (r) {
      var acts = '<div class="crud-actions">' +
        '<button class="crud edit" onclick="mkSlideMove(\'' + r.id + '\',1)" title="' + mkT("أعلى", "Up") + '">' + icon("plus", 14) + '</button>' +
        '<button class="crud" onclick="mkSlideMove(\'' + r.id + '\',-1)" title="' + mkT("أسفل", "Down") + '">－</button>' +
        (r.status === "approved"
          ? '<button class="crud" onclick="mkSlideStatus(\'' + r.id + '\',\'paused\')" title="' + mkT("إيقاف", "Pause") + '">' + icon("eye", 14) + '</button>'
          : '<button class="crud verify" onclick="mkSlideStatus(\'' + r.id + '\',\'approved\')" title="' + mkT("اعتماد", "Approve") + '">' + icon("check", 14) + '</button>') +
        '<button class="crud edit" onclick="mkSlidesOpen(mkSlides.rows.filter(function(x){return String(x.id)===\'' + r.id + '\'})[0])" title="' + mkT("تعديل", "Edit") + '">' + icon("edit", 14) + '</button>' +
        '<button class="crud delete" onclick="mkSlideDelete(\'' + r.id + '\')" title="' + mkT("حذف", "Delete") + '">' + icon("trash", 14) + '</button>' +
        '</div>';
      return '<tr><td dir="ltr"><b>' + esc(r.priority || 0) + '</b></td>' +
        '<td><b>' + esc((lang === "ar" ? r.titleAr : r.titleEn || r.titleAr) || "—") + '</b>' + (r.image ? '<div class="entity-sub" dir="ltr">' + esc(r.image) + '</div>' : '') + '</td>' +
        '<td>' + esc(r.type) + '</td><td>' + mkStatusBadge(r.status) + '</td>' +
        '<td>' + (r.active ? '✓' : '—') + '</td><td>' + acts + '</td></tr>';
    }).join("") + '</tbody></table></div>';
  body += '</section>';
  return adminShell(body);
}

// Dedicated slide form page. A refresh re-finds the row from the list once it
// has loaded; a link to a missing id reports it instead of spinning forever.
function mkSlideFormPage() {
  var id = routeSubId();
  if (routeSub() === "edit" && id) {
    if (!(mkSlides.form.open && String(mkSlides.form.id) === String(id))) {
      var row = mkSlides.rows.filter(function (x) { return String(x.id) === String(id); })[0];
      if (row) { mkEditRetry["slides:" + id] = false; mkSlides.form = { open: true, mode: "edit", id: row.id, row: row }; }
      else if (mkSlides.error) return formPage({ back: "slides", title: mkT("تعديل شريحة", "Edit slide"),
        error: mkSlides.error, body: "", onSave: "", busy: true });
      else if (!mkSlides.loaded || mkEditMiss("slides", id, mkSlides)) {
        mkSlides.form = { open: false, mode: "edit", id: id, row: null }; mkSlidesLoad();
        return formPage({ back: "slides", title: mkT("تعديل شريحة", "Edit slide"),
          body: '<div class="loading-inline"><div class="loader"></div></div>', onSave: "", busy: true });
      }
      else return formPage({ back: "slides", title: mkT("تعديل شريحة", "Edit slide"),
        error: mkT("لم يتم العثور على الشريحة.", "Slide not found."), body: "", onSave: "", busy: true });
    }
  } else if (!mkSlides.form.open || mkSlides.form.mode !== "create") {
    mkSlides.form = { open: true, mode: "create", id: null, row: null };
  }
  return mkSlideForm(mkSlides.form);
}

// ----------------------------- advertisements -----------------------------
function mkAdsOpen(row) {
  mkAds.form = row ? { open: true, mode: "edit", id: row.id, row: row } : { open: true, mode: "create", id: null, row: null };
  mkAds.info = null;
  var target = "ads/" + (row ? "edit/" + encodeURIComponent(row.id) : "new");
  if (("#/" + target) === location.hash) render(); else go(target);
}
function mkAdsClose() {
  mkAds.form = { open: false, mode: "create", id: null, row: null };
  var target = "ads"; if (("#/" + target) === location.hash) render(); else go(target);
}
function mkAdvertiserSelected(r) {
  if (r.organizationId) return "org:" + r.organizationId;
  if (r.teacherId) return "t:" + r.teacherId;
  return "";
}
function mkAdvertiserName(v) {
  for (var i = 0; i < mkAdvertisers.rows.length; i++) {
    var a = mkAdvertisers.rows[i];
    if (a.kind === "organization" && v === "org:" + a.id) return a.name;
    if (a.kind === "teacher" && v === "t:" + a.id) return a.name;
  }
  return "";
}
function mkAdvertiserOpts(sel) {
  var out = opt("", mkT("— اختر المعلن —", "— Choose advertiser —"), !sel);
  var groups = [[ "organization", mkT("المؤسسات (الملاك)", "Institutions (owners)") ], [ "teacher", mkT("المعلمون (خاص)", "Private teachers") ]];
  groups.forEach(function (g) {
    var opts = "";
    mkAdvertisers.rows.forEach(function (a) {
      if (a.kind !== g[0]) return;
      var v = a.kind === "organization" ? "org:" + a.id : "t:" + a.id;
      opts += opt(v, a.name + (a.kind === "organization" && a.ownerName ? " — " + a.ownerName : ""), sel === v);
    });
    if (opts) out += '<optgroup label="' + esc(g[1]) + '">' + opts + '</optgroup>';
  });
  return out;
}
function mkAdForm(f) {
  var r = f.row || {};
  return formPage({ back: "ads", error: mkAds.info || null, busy: mkAds.saving,
    onSave: "mkAdSubmit()", onCancel: "mkAdsClose()",
    title: f.mode === "edit" ? mkT("تعديل إعلان", "Edit advertisement") : mkT("إعلان جديد", "New advertisement"),
    subtitle: mkT("إعلان الشريط المتحرك. الإعلان لا يظهر إلا بعد اعتماد الإدارة ودخوله النافذة الزمنية.", "Ticker advertising. An ad is only shown after admin approval and inside its schedule."),
    body:
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("الاسم", "Name"), mkInputF("mk-a-name", r.name)) +
      mkGroup(mkT("المعلن", "Advertiser"), '<select id="mk-a-adv" class="f-select">' + mkAdvertiserOpts(mkAdvertiserSelected(r)) + '</select>') +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("النوع", "Type"), mkSelectF("mk-a-type", mkPairs(MK_AD_TYPES), r.adType || "general")) +
      mkGroup(mkT("الفوترة", "Billing"), mkSelectF("mk-a-bill", mkPairs(MK_AD_BILLING), r.billingMode || "free")) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("الحالة", "Status"), mkSelectF("mk-a-status", mkPairs(MK_AD_STATUS), r.status || "pending")) +
      mkGroup(mkT("الترتيب", "Priority"), mkNumberF("mk-a-prio", r.priority == null ? 0 : r.priority)) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("نص الإعلان (عربي)", "Message (Arabic)"), mkArea("mk-a-mar", r.messageAr)) +
      mkGroup(mkT("نص الإعلان (إنجليزي)", "Message (English)"), mkArea("mk-a-men", r.messageEn, "ltr")) +
    '</div>' +
    '<div class="ac-field-wide">' + mkUploadF("mk-a-image", mkT("صورة (اختياري)", "Image (optional)"), r.image) + '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("رابط خارجي (https)", "External URL (https)"), mkInputF("mk-a-url", r.targetUrl, "ltr")) +
      mkGroup(mkT("وجهة داخلية", "Internal route"), mkSelectF("mk-a-route", [[ "", "—" ]].concat(MK_CTA_ROUTES.map(function (x) { return [x, x]; })), r.targetRoute || "")) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("يبدأ في", "Starts at"), mkDateF("mk-a-start", r.startAt)) +
      mkGroup(mkT("ينتهي في", "Ends at"), mkDateF("mk-a-end", r.endAt)) +
    '</div>' +
    '<div class="ac-field-wide">' + mkGroup(mkT("ملاحظات", "Notes"), mkInputF("mk-a-notes", r.notes)) + '</div>' });
}
function mkAdSubmit() {
  if (mkAds.saving) return;
  var f = mkAds.form;
  var adv = mkVal("mk-a-adv");
  var payload = {
    name: mkVal("mk-a-name"), advertiser: mkAdvertiserName(adv), organizationId: null, teacherId: null,
    adType: mkVal("mk-a-type"), billingMode: mkVal("mk-a-bill"), status: mkVal("mk-a-status"),
    placement: ["ticker"],
    messageAr: mkVal("mk-a-mar"), messageEn: mkVal("mk-a-men"),
    image: mkVal("mk-a-image"), targetUrl: mkVal("mk-a-url") || null, targetRoute: mkVal("mk-a-route") || null,
    priority: Number(mkVal("mk-a-prio") || 0), startAt: mkIso("mk-a-start"), endAt: mkIso("mk-a-end"),
    notes: mkVal("mk-a-notes")
  };
  if (adv.indexOf("org:") === 0) payload.organizationId = adv.slice(4);
  else if (adv.indexOf("t:") === 0) payload.teacherId = adv.slice(2);
  if (!payload.name) { mkAds.info = mkT("أدخل اسم الإعلان.", "Enter the advertisement name."); render(); return; }
  mkAds.saving = true; mkAds.info = null;
  var req = f.mode === "edit" ? apiPut('/api/admin/advertisements/' + f.id, payload) : apiPost('/api/admin/advertisements', payload);
  req.then(function () {
    mkAds.saving = false; mkAds.form = { open: false, mode: "create", id: null }; mkAds.loaded = false;
    var target = "ads"; if (("#/" + target) === location.hash) render(); else go(target);
    mkAdsLoad();
  }).catch(function (err) { mkAds.saving = false; mkAds.info = mkErr(err); render(); });
}
function mkAdReview(decision) {
  var notesEl = document.getElementById("mk-ads-notes");
  var id = routeSubId();
  apiPost('/api/admin/advertisements/' + id + '/review', { decision: decision, notes: notesEl ? notesEl.value : "" }).then(function () {
    mkAds.loaded = false; go('ads');
  }).catch(function (e) { alert(mkErr(e)); });
}
function mkAdTransition(transition) {
  var id = routeSubId();
  apiPost('/api/admin/advertisements/' + id + '/status', { transition: transition }).then(function () {
    mkAds.loaded = false; go('ads');
  }).catch(function (e) { alert(mkErr(e)); });
}
// Quick list actions carry the id explicitly (no open detail needed).
function mkAdReviewById(id, decision) {
  apiPost('/api/admin/advertisements/' + id + '/review', { decision: decision, notes: "" }).then(function () {
    mkAds.loaded = false; mkAdsLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function mkAdTransitionById(id, transition) {
  apiPost('/api/admin/advertisements/' + id + '/status', { transition: transition }).then(function () {
    mkAds.loaded = false; mkAdsLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function mkAdSelect(id) { go('ads/view/' + encodeURIComponent(id)); }
function mkAdsSetTab(t) { mkAds.tab = t; mkAds.selected = null; render(); }
function mkAdsQ() { mkAds.q = (document.getElementById("mk-ads-q") || {}).value || ""; render(); }
function mkAdDelete(id) {
  if (!mkConfirm(mkT("حذف هذا الإعلان؟", "Delete this advertisement?"))) return;
  apiDelete('/api/admin/advertisements/' + id).then(function () {
    mkAds.loaded = false; mkAdsLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function mkAdTabFilter(rows, tab) {
  if (tab === "overview" || tab === "all") return rows;
  if (tab === "pending") return rows.filter(function (r) { return r.status === "pending"; });
  if (tab === "active") return rows.filter(function (r) { return r.effectiveStatus === "active"; });
  if (tab === "scheduled") return rows.filter(function (r) { return r.effectiveStatus === "scheduled"; });
  if (tab === "paused") return rows.filter(function (r) { return r.status === "paused"; });
  if (tab === "rejected") return rows.filter(function (r) { return r.status === "rejected"; });
  if (tab === "expired") return rows.filter(function (r) { return r.effectiveStatus === "expired"; });
  if (tab === "archived") return rows.filter(function (r) { return r.status === "archived" || r.status === "cancelled"; });
  return rows;
}
function mkAdOverview(rows) {
  var ar = lang === "ar";
  var c = function (tab) { return rows.filter(function (r) { return mkAdTabFilter([r], tab).length; }).length; };
  var impressions = rows.reduce(function (s, r) { return s + (r.impressions || 0); }, 0);
  var clicks = rows.reduce(function (s, r) { return s + (r.clicks || 0); }, 0);
  var boxes = [["all", ar ? "إجمالي الإعلانات" : "Total ads", rows.length], ["pending", ar ? "قيد المراجعة" : "Pending review", c("pending")], ["active", ar ? "نشط" : "Active", c("active")], ["scheduled", ar ? "مجدول" : "Scheduled", c("scheduled")], ["paused", ar ? "موقوف" : "Paused", c("paused")], ["expired", ar ? "منتهي" : "Expired", c("expired")], ["rejected", ar ? "مرفوض" : "Rejected", c("rejected")], ["impressions", ar ? "مرات الظهور" : "Impressions", impressions], ["clicks", ar ? "النقرات" : "Clicks", clicks]];
  return '<div class="ac-summary mk-stats">' + boxes.map(function (b) {
    return '<div class="stat-box"><b>' + esc(b[2]) + '</b><span>' + esc(b[1]) + '</span></div>';
  }).join("") + '</div>';
}

// A field in a detail grid (label + value, optional sub-value).
function mkAdField(label, value, sub, dir) {
  return '<div><label>' + esc(label) + '</label><b' + (dir ? ' dir="ltr"' : '') + '>' + esc(value == null || value === "" ? "—" : value) + '</b>' + (sub ? '<span class="entity-sub">' + esc(sub) + '</span>' : '') + '</div>';
}
function mkAdSection(title, iconName, html) {
  return '<section class="panel"><div class="panel-title"><div><h2>' + icon(iconName, 15) + ' ' + esc(title) + '</h2></div></div>' + html + '</section>';
}

// The review/management actions for the current status.
function mkAdActions(r) {
  var acts = '';
  if (r.status === "pending") {
    acts += '<div class="mk-review-actions"><input id="mk-ads-notes" placeholder="' + mkT("ملاحظات المراجعة (اختياري)", "Review notes (optional)") + '">' +
      '<button class="btn green" onclick="mkAdReview(\'approve\')">' + icon("check", 14) + ' ' + mkT("الموافقة", "Approve") + '</button>' +
      '<button class="btn" onclick="mkAdReview(\'request_changes\')">' + mkT("طلب تعديل", "Request changes") + '</button>' +
      '<button class="btn brown" onclick="mkAdReview(\'reject\')">' + mkT("رفض", "Reject") + '</button></div>';
  } else if (r.status === "approved") {
    acts += '<div class="mk-review-actions">' +
      '<button class="btn" onclick="mkAdTransition(\'pause\')">' + mkT("إيقاف الإعلان", "Pause") + '</button>' +
      '<button class="btn green" onclick="mkAdTransition(\'resume\')" style="display:none">' + mkT("استئناف", "Resume") + '</button>' +
      '<button class="btn brown" onclick="mkAdTransition(\'cancel\')">' + mkT("إلغاء الإعلان", "Cancel") + '</button>' +
      '<button class="btn" onclick="mkAdTransition(\'archive\')">' + mkT("أرشفة", "Archive") + '</button></div>';
  } else if (r.status === "paused") {
    acts += '<div class="mk-review-actions">' +
      '<button class="btn green" onclick="mkAdTransition(\'resume\')">' + mkT("استئناف الإعلان", "Resume") + '</button>' +
      '<button class="btn brown" onclick="mkAdTransition(\'cancel\')">' + mkT("إلغاء الإعلان", "Cancel") + '</button></div>';
  } else if (r.status === "rejected") {
    acts += '<div class="mk-review-actions"><button class="btn green" onclick="mkAdReview(\'approve\')">' + mkT("الموافقة", "Approve") + '</button>' +
      '<button class="btn brown" onclick="mkAdTransition(\'archive\')">' + mkT("أرشفة", "Archive") + '</button></div>';
  } else {
    acts += '<div class="mk-review-actions"><button class="btn" onclick="mkAdTransition(\'archive\')">' + mkT("أرشفة", "Archive") + '</button></div>';
  }
  return acts;
}

// Dedicated advertisement detail/review page (#/ads/view/:id).
function mkAdDetailPage() {
  var id = routeSubId();
  mkAdsLoad();
  var ar = lang === "ar";
  var back = '<button type="button" class="uf-back" onclick="go(\'ads\')">' + (ar ? "← العودة إلى الإعلانات" : "← Back to advertisements") + '</button>';
  if (mkAds.loading || !mkAds.loaded) {
    return adminShell('<div class="uf-page">' + back + '<div class="loading-inline"><div class="loader"></div></div></div>');
  }
  var r = mkAds.rows.filter(function (x) { return String(x.id) === String(id); })[0];
  if (!r) {
    return adminShell('<div class="uf-page">' + back + '<div class="empty-state">' + (ar ? "لم يتم العثور على الإعلان." : "Advertisement not found.") + '</div></div>');
  }
  var ctr = r.impressions > 0 ? (r.clicks / r.impressions * 100).toFixed(1) + '%' : '—';
  var adv = r.organizationId ? (r.organizationName || r.advertiser || "—") : (r.teacherId ? (r.teacherName || r.advertiser || "—") : (r.advertiser || "—"));
  var advKind = r.organizationId ? mkT("مؤسسة", "Institution") : (r.teacherId ? mkT("معلم", "Teacher") : "—");
  var target = r.targetRoute ? mkT("وجهة داخلية:", "Internal route:") + ' ' + r.targetRoute : (r.targetUrl ? mkT("رابط خارجي:", "External URL:") + ' ' + r.targetUrl : "—");

  var body = '<div class="uf-page">' + back +
    '<div class="uf-head"><h1>' + esc(r.name) + '</h1><p>' + mkAdStatus(r.effectiveStatus) + '</p></div>' +
    '<section class="panel"><div class="panel-title"><div><h2>' + icon("info", 15) + ' ' + mkT("نظرة عامة", "Overview") + '</h2><p>' + esc(r.adType) + ' · ' + esc(r.billingMode) + '</p></div>' +
    '<button class="btn brown" onclick="mkAdsOpen(mkAds.rows.filter(function(x){return String(x.id)===\'' + r.id + '\'})[0])">' + icon("edit", 14) + ' ' + mkT("تعديل", "Edit") + '</button></div>' +
    '<div class="mk-detail-grid">' +
    mkAdField(mkT("المعلن", "Advertiser"), adv, advKind) +
    mkAdField(mkT("النوع", "Type"), r.adType) +
    mkAdField(mkT("الفوترة", "Billing"), r.billingMode) +
    mkAdField(mkT("الترتيب", "Priority"), r.priority, null, true) +
    mkAdField(mkT("قُدم في", "Submitted at"), r.submittedAt ? mkFmtDateTime(r.submittedAt) : "—") +
    mkAdField(mkT("رُوجع في", "Reviewed at"), r.reviewedAt ? mkFmtDateTime(r.reviewedAt) : "—") +
    '</div></section>';

  body += mkAdSection(mkT("المحتوى", "Content"), "edit",
    '<div class="mk-detail-grid">' +
    mkAdField(mkT("الرسالة (عربي)", "Message (Arabic)"), r.messageAr || "—") +
    mkAdField(mkT("الرسالة (إنجليزي)", "Message (English)"), r.messageEn || "—", null, true) +
    '</div>' + (r.image ? '<div class="mk-prev-wrap"><img class="mk-prev" src="' + esc(mkMedia(r.image)) + '" alt=""></div>' : ''));

  body += mkAdSection(mkT("الوجهة والموضع", "Target & Placement"), "pin",
    '<div class="mk-detail-grid">' +
    mkAdField(mkT("الوجهة", "Target"), target, null, true) +
    mkAdField(mkT("الموضع", "Placement"), (r.placement || []).join(" · ")) +
    '</div>');

  body += mkAdSection(mkT("الجدولة", "Schedule"), "calendar",
    '<div class="mk-detail-grid">' +
    mkAdField(mkT("يبدأ", "Starts"), r.startAt ? mkFmtDateTime(r.startAt) : "—", null, true) +
    mkAdField(mkT("ينتهي", "Ends"), r.endAt ? mkFmtDateTime(r.endAt) : "—", null, true) +
    mkAdField(mkT("الحالة الحالية", "Current state"), mkAdStatus(r.effectiveStatus)) +
    '</div>');

  body += mkAdSection(mkT("الأداء", "Performance"), "chart",
    '<div class="mk-detail-grid">' +
    mkAdField(mkT("مرات الظهور", "Impressions"), r.impressions || 0, null, true) +
    mkAdField(mkT("النقرات", "Clicks"), r.clicks || 0, null, true) +
    mkAdField(mkT("نسبة النقر CTR", "CTR"), ctr, null, true) +
    '</div>');

  var reviewNote = '';
  if (r.rejectionReason) reviewNote += '<div class="mk-note bad">' + mkT("سبب الرفض:", "Rejection reason:") + ' ' + esc(r.rejectionReason) + '</div>';
  if (r.reviewNotes) reviewNote += '<div class="mk-note">' + mkT("ملاحظات المراجعة:", "Review notes:") + ' ' + esc(r.reviewNotes) + '</div>';
  body += mkAdSection(mkT("المراجعة والإجراءات", "Review & Actions"), "shield", reviewNote + mkAdActions(r));

  return adminShell(body + '</div>');
}

function adsAdminPage() {
  var sub = routeSub();
  if (sub === "new" || sub === "edit") return mkAdFormPage();
  if (sub === "view") return mkAdDetailPage();
  mkAdsLoad();
  var ar = lang === "ar";
  var tabs = [["overview", mkT("نظرة عامة", "Overview")], ["pending", mkT("قيد المراجعة", "Pending")], ["active", mkT("نشط", "Active")], ["scheduled", mkT("مجدول", "Scheduled")], ["paused", mkT("موقوف", "Paused")], ["rejected", mkT("مرفوض", "Rejected")], ["expired", mkT("منتهي", "Expired")], ["archived", mkT("مؤرشف", "Archived")]];
  var pendingCount = mkAds.rows.filter(function (r) { return r.status === "pending"; }).length;
  var body = '<div class="welcome"><div><h1>' + esc(tr("ads")) + '</h1><p>' + (ar ? "إعلانات الشريط المتحرك. لا يظهر أي إعلان إلا بعد اعتماد الإدارة ودخوله النافذة الزمنية." : "Ticker advertisements. No ad appears until approved by administration and inside its schedule.") + '</p></div>' +
    '<div class="sp-actions"><button class="btn brown" onclick="mkAdsOpen()">' + icon("plus", 15) + ' ' + (ar ? "إعلان جديد" : "New ad") + '</button></div></div>';
  body += '<div class="view-row"><div class="view-switch">' + tabs.map(function (t) {
    return '<button class="' + (mkAds.tab === t[0] ? "active" : "") + '" onclick="mkAdsSetTab(\'' + t[0] + '\')">' + t[1] + (t[0] === "pending" && pendingCount ? ' <b>(' + pendingCount + ')</b>' : '') + '</button>';
  }).join("") + '</div><input id="mk-ads-q" class="mk-search" placeholder="' + mkT("بحث...", "Search...") + '" value="' + esc(mkAds.q) + '" oninput="mkAdsQ()"></div>';
  if (mkAds.loading) body += '<div class="loading-inline"><div class="loader"></div></div>';
  else if (mkAds.error) body += '<div class="empty-state">' + esc(mkAds.error) + '</div>';
  else if (mkAds.tab === "overview") {
    body += mkAdOverview(mkAds.rows);
  } else {
    var rows = mkAdTabFilter(mkAds.rows, mkAds.tab);
    if (mkAds.q) rows = rows.filter(function (r) { return (r.name || "").toLowerCase().indexOf(mkAds.q.toLowerCase()) > -1 || (r.advertiser || "").toLowerCase().indexOf(mkAds.q.toLowerCase()) > -1; });
    body += '<section class="panel"><div class="panel-title"><div><h2>' + esc(tr("ads")) + '</h2></div></div>';
    if (!rows.length) body += '<div class="empty-state">' + (ar ? "لا توجد إعلانات في هذا التبويب." : "No advertisements in this tab.") + '</div>';
    else body += '<div class="table-wrap"><table class="tbl"><thead><tr><th>' + (ar ? "الإعلان" : "Advertisement") + '</th><th>' + (ar ? "المعلن" : "Advertiser") + '</th><th>' + (ar ? "الحالة" : "Status") + '</th><th>' + (ar ? "النافذة" : "Window") + '</th><th>' + (ar ? "نقرات" : "Clicks") + '</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var acts = '<div class="crud-actions">' +
          '<button class="crud view" onclick="event.stopPropagation();mkAdSelect(\'' + r.id + '\')" title="' + mkT("عرض", "View") + '">' + icon("eye", 14) + '</button>' +
          (r.status === "pending" ? '<button class="crud verify" onclick="event.stopPropagation();mkAdReviewById(\'' + r.id + '\',\'approve\')" title="' + mkT("اعتماد", "Approve") + '">' + icon("check", 14) + '</button>' :
           r.status === "approved" ? '<button class="crud" onclick="event.stopPropagation();mkAdTransitionById(\'' + r.id + '\',\'pause\')" title="' + mkT("إيقاف", "Pause") + '">' + icon("eye", 14) + '</button>' :
           r.status === "paused" ? '<button class="crud verify" onclick="event.stopPropagation();mkAdTransitionById(\'' + r.id + '\',\'resume\')" title="' + mkT("استئناف", "Resume") + '">' + icon("check", 14) + '</button>' : '') +
          '<button class="crud edit" onclick="event.stopPropagation();mkAdsOpen(mkAds.rows.filter(function(x){return String(x.id)===\'' + r.id + '\'})[0])" title="' + mkT("تعديل", "Edit") + '">' + icon("edit", 14) + '</button>' +
          '<button class="crud delete" onclick="event.stopPropagation();mkAdDelete(\'' + r.id + '\')" title="' + mkT("حذف", "Delete") + '">' + icon("trash", 14) + '</button>' +
          '</div>';
        return '<tr class="row-click" onclick="mkAdSelect(\'' + r.id + '\')" tabindex="0" role="link"><td><b>' + esc(r.name) + '</b></td>' +
          '<td>' + esc(r.advertiser || r.organizationName || r.teacherName || "—") + '</td>' +
          '<td>' + mkAdStatus(r.effectiveStatus) + '</td>' +
          '<td dir="ltr">' + esc(mkFmtDate(r.startAt)) + ' → ' + esc(mkFmtDate(r.endAt)) + '</td>' +
          '<td dir="ltr">' + esc(r.clicks || 0) + '</td><td>' + acts + '</td></tr>';
      }).join("") + '</tbody></table></div>';
    body += '</section>';
  }
  return adminShell(body);
}

// Dedicated advertisement form page: refresh-safe and never inline.
function mkAdFormPage() {
  mkAdvertisersLoad();
  var id = routeSubId();
  if (routeSub() === "edit" && id) {
    if (!(mkAds.form.open && String(mkAds.form.id) === String(id))) {
      var row = mkAds.rows.filter(function (x) { return String(x.id) === String(id); })[0];
      if (row) { mkEditRetry["ads:" + id] = false; mkAds.form = { open: true, mode: "edit", id: row.id, row: row }; }
      else if (mkAds.error) return formPage({ back: "ads", title: mkT("تعديل إعلان", "Edit advertisement"),
        error: mkAds.error, body: "", onSave: "", busy: true });
      else if (!mkAds.loaded || mkEditMiss("ads", id, mkAds)) {
        mkAds.form = { open: false, mode: "edit", id: id, row: null }; mkAdsLoad();
        return formPage({ back: "ads", title: mkT("تعديل إعلان", "Edit advertisement"),
          body: '<div class="loading-inline"><div class="loader"></div></div>', onSave: "", busy: true });
      }
      else return formPage({ back: "ads", title: mkT("تعديل إعلان", "Edit advertisement"),
        error: mkT("لم يتم العثور على الإعلان.", "Advertisement not found."), body: "", onSave: "", busy: true });
    }
  } else if (!mkAds.form.open || mkAds.form.mode !== "create") {
    mkAds.form = { open: true, mode: "create", id: null, row: null };
  }
  return mkAdForm(mkAds.form);
}

// ----------------------------- offers -----------------------------
function mkOffersOpen(row) {
  mkOffers.form = row ? { open: true, mode: "edit", id: row.id, row: row } : { open: true, mode: "create", id: null, row: null };
  mkOffers.info = null;
  var target = "offers/" + (row ? "edit/" + encodeURIComponent(row.id) : "new");
  if (("#/" + target) === location.hash) render(); else go(target);
}
function mkOffersClose() {
  mkOffers.form = { open: false, mode: "create", id: null, row: null };
  var target = "offers"; if (("#/" + target) === location.hash) render(); else go(target);
}
function mkOfferForm(f) {
  var r = f.row || {};
  var orgOpts = [[ "", mkT("اختر مؤسسة", "Select organization") ]].concat(mkOffers.orgs.map(function (o) { return [o.id, o.name]; }));
  return formPage({ back: "offers", error: mkOffers.info || null, busy: mkOffers.saving,
    onSave: "mkOfferSubmit()", onCancel: "mkOffersClose()",
    title: f.mode === "edit" ? mkT("تعديل عرض", "Edit offer") : mkT("عرض جديد", "New offer"),
    subtitle: mkT("عرض مؤسسة. العرض النشط داخل نافذته الزمنية فقط هو ما يظهر على البطاقات.", "An institution offer. Only an active offer inside its window appears on the cards."),
    body:
    '<div class="ac-field-wide">' + mkGroup(mkT("المؤسسة", "Organization"), mkSelectF("mk-o-org", orgOpts, r.organizationId || "")) + '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("العنوان (عربي)", "Title (Arabic)"), mkInputF("mk-o-tar", r.title)) +
      mkGroup(mkT("العنوان (إنجليزي)", "Title (English)"), mkInputF("mk-o-ten", r.titleEn, "ltr")) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("الوصف (عربي)", "Description (Arabic)"), mkArea("mk-o-dar", r.description)) +
      mkGroup(mkT("الوصف (إنجليزي)", "Description (English)"), mkArea("mk-o-den", r.descriptionEn, "ltr")) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("نسبة الخصم %", "Discount %"), mkNumberF("mk-o-disc", r.discountPercent == null ? "" : r.discountPercent)) +
      mkCheckF("mk-o-active", mkT("نشط", "Active"), r.active !== false) +
    '</div>' +
    '<div class="form-row2 ac-field-wide">' +
      mkGroup(mkT("يبدأ في", "Starts at"), mkDateF("mk-o-start", r.startAt)) +
      mkGroup(mkT("ينتهي في", "Ends at"), mkDateF("mk-o-end", r.endAt)) +
    '</div>' });
}
function mkOfferSubmit() {
  if (mkOffers.saving) return;
  var f = mkOffers.form;
  var disc = mkVal("mk-o-disc");
  var payload = {
    organizationId: mkVal("mk-o-org") || null,
    title: mkVal("mk-o-tar"), titleEn: mkVal("mk-o-ten"),
    description: mkVal("mk-o-dar"), descriptionEn: mkVal("mk-o-den"),
    discountPercent: disc === "" ? null : Number(disc),
    startAt: mkIso("mk-o-start"), endAt: mkIso("mk-o-end"), active: mkChecked("mk-o-active")
  };
  if (!payload.organizationId) { mkOffers.info = mkT("اختر مؤسسة.", "Select an organization."); render(); return; }
  if (!payload.title) { mkOffers.info = mkT("أدخل عنوان العرض.", "Enter the offer title."); render(); return; }
  mkOffers.saving = true; mkOffers.info = null;
  var req = f.mode === "edit" ? apiPut('/api/admin/offers/' + f.id, payload) : apiPost('/api/admin/offers', payload);
  req.then(function () {
    mkOffers.saving = false; mkOffers.form = { open: false, mode: "create", id: null }; mkOffers.loaded = false;
    var target = "offers"; if (("#/" + target) === location.hash) render(); else go(target);
    mkOffersLoad();
  }).catch(function (err) { mkOffers.saving = false; mkOffers.info = mkErr(err); render(); });
}
function mkOfferDelete(id) {
  if (!mkConfirm(mkT("حذف هذا العرض؟", "Delete this offer?"))) return;
  apiDelete('/api/admin/offers/' + id).then(function () {
    mkOffers.loaded = false; mkOffersLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function mkOfferToggle(id, active) {
  apiPut('/api/admin/offers/' + id, { active: active }).then(function () {
    mkOffers.loaded = false; mkOffersLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function mkOfferEff(r) {
  if (!r.active) return "inactive";
  var now = Date.now();
  if (r.endsAt && new Date(r.endsAt).getTime() < now) return "expired";
  if (r.startsAt && new Date(r.startsAt).getTime() > now) return "scheduled";
  return "active";
}
function mkOffersSetTab(t) { mkOffers.tab = t; render(); }
function mkOffersQ() { mkOffers.q = (document.getElementById("mk-offers-q") || {}).value || ""; render(); }
function mkOfferTabFilter(rows, tab) {
  if (tab === "all") return rows;
  return rows.filter(function (r) { return mkOfferEff(r) === tab; });
}
function offersAdminPage() {
  // Add/edit is a dedicated page; the list never renders the form inline.
  var sub = routeSub();
  if (sub === "new" || sub === "edit") return mkOfferFormPage();
  mkOffersLoad();
  var ar = lang === "ar";
  var tabs = [["all", mkT("الكل", "All")], ["active", mkT("نشط", "Active")], ["scheduled", mkT("مجدول", "Scheduled")], ["expired", mkT("منتهي", "Expired")], ["inactive", mkT("غير نشط", "Inactive")]];
  var heroRows = mkOffers.rows || [];
  function heroCnt(st) { return heroRows.filter(function (r) { return mkOfferEff(r) === st; }).length; }
  var body = (typeof sectionHero === "function")
    ? sectionHero({ route: "offers", title: tr("offers"),
        subtitle: (ar ? "عروض المؤسسات. تظهر العروض النشطة داخل النافذة الزمنية على البطاقات." : "Institution offers. Active, in-window offers appear on cards."),
        actionHtml: '<button class="btn brown" onclick="mkOffersOpen()">' + icon("plus", 15) + ' ' + (ar ? "عرض جديد" : "New offer") + '</button>',
        stats: [
          { icon: "tag", value: heroRows.length, labelAr: "إجمالي العروض", labelEn: "Total offers", tone: "primary" },
          { icon: "check", value: heroCnt("active"), labelAr: "عروض نشطة", labelEn: "Active offers", tone: "pos" },
          { icon: "calendar", value: heroCnt("scheduled"), labelAr: "مجدولة", labelEn: "Scheduled", tone: "info" },
          { icon: "x", value: heroCnt("expired"), labelAr: "منتهية", labelEn: "Expired", tone: "neg" }
        ],
        donut: { title: { ar: "العروض حسب الحالة", en: "Offers by status" }, center: { ar: "عرض", en: "offers" },
          categories: [
            { label: { ar: "نشطة", en: "Active" }, value: heroCnt("active") },
            { label: { ar: "مجدولة", en: "Scheduled" }, value: heroCnt("scheduled") },
            { label: { ar: "منتهية", en: "Expired" }, value: heroCnt("expired") },
            { label: { ar: "غير نشطة", en: "Inactive" }, value: heroCnt("inactive") }
          ] } })
    : '<div class="welcome"><div><h1>' + esc(tr("offers")) + '</h1><p>' + (ar ? "عروض المؤسسات." : "Institution offers.") + '</p></div>' +
      '<div class="sp-actions"><button class="btn brown" onclick="mkOffersOpen()">' + icon("plus", 15) + ' ' + (ar ? "عرض جديد" : "New offer") + '</button></div></div>';
  body += '<div class="view-row"><div class="view-switch">' + tabs.map(function (t) {
    return '<button class="' + (mkOffers.tab === t[0] ? "active" : "") + '" onclick="mkOffersSetTab(\'' + t[0] + '\')">' + t[1] + '</button>';
  }).join("") + '</div><input id="mk-offers-q" class="mk-search" placeholder="' + mkT("بحث...", "Search...") + '" value="' + esc(mkOffers.q) + '" oninput="mkOffersQ()"></div>';
  body += '<section class="panel"><div class="panel-title"><div><h2>' + esc(tr("offers")) + '</h2></div></div>';
  if (mkOffers.loading) body += '<div class="loading-inline"><div class="loader"></div></div>';
  else if (mkOffers.error) body += '<div class="empty-state">' + esc(mkOffers.error) + '</div>';
  else {
    var rows = mkOfferTabFilter(mkOffers.rows, mkOffers.tab);
    if (mkOffers.q) rows = rows.filter(function (r) { return (r.title || "").toLowerCase().indexOf(mkOffers.q.toLowerCase()) > -1 || (r.organizationName || "").toLowerCase().indexOf(mkOffers.q.toLowerCase()) > -1; });
    if (!rows.length) body += '<div class="empty-state">' + (ar ? "لا توجد عروض في هذا التبويب." : "No offers in this tab.") + '</div>';
    else body += '<div class="table-wrap"><table class="tbl"><thead><tr><th>' + (ar ? "المؤسسة" : "Organization") + '</th><th>' + (ar ? "العرض" : "Offer") + '</th><th>' + (ar ? "الخصم" : "Discount") + '</th><th>' + (ar ? "النافذة" : "Window") + '</th><th>' + (ar ? "الحالة" : "Status") + '</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var acts = '<div class="crud-actions">' +
          '<button class="crud ' + (r.active ? "" : "verify") + '" onclick="mkOfferToggle(\'' + r.id + '\',' + (r.active ? "false" : "true") + ')" title="' + mkT("تبديل الحالة", "Toggle") + '">' + icon(r.active ? "eye" : "check", 14) + '</button>' +
          '<button class="crud edit" onclick="mkOffersOpen(mkOffers.rows.filter(function(x){return String(x.id)===\'' + r.id + '\'})[0])" title="' + mkT("تعديل", "Edit") + '">' + icon("edit", 14) + '</button>' +
          '<button class="crud delete" onclick="mkOfferDelete(\'' + r.id + '\')" title="' + mkT("حذف", "Delete") + '">' + icon("trash", 14) + '</button>' +
          '</div>';
        return '<tr><td><b>' + esc(r.organizationName || "—") + '</b></td>' +
          '<td><b>' + esc(r.title || "—") + '</b>' + (r.description ? '<div class="entity-sub">' + esc(r.description) + '</div>' : '') + '</td>' +
          '<td dir="ltr">' + esc(r.discountPercent == null ? "—" : r.discountPercent + "%") + '</td>' +
          '<td dir="ltr">' + esc(mkFmtDate(r.startAt)) + ' → ' + esc(mkFmtDate(r.endAt)) + '</td>' +
          '<td>' + mkAdStatus(mkOfferEff(r)) + '</td><td>' + acts + '</td></tr>';
      }).join("") + '</tbody></table></div>';
  }
  body += '</section>';
  return adminShell(body);
}

// Dedicated offer form page. The organization picker and the existing rows come
// from the same load the list uses, so a refresh re-finds everything.
function mkOfferFormPage() {
  var id = routeSubId();
  if (routeSub() === "edit" && id) {
    if (!(mkOffers.form.open && String(mkOffers.form.id) === String(id))) {
      var row = mkOffers.rows.filter(function (x) { return String(x.id) === String(id); })[0];
      if (row) { mkEditRetry["offers:" + id] = false; mkOffers.form = { open: true, mode: "edit", id: row.id, row: row }; }
      else if (mkOffers.error) return formPage({ back: "offers", title: mkT("تعديل عرض", "Edit offer"),
        error: mkOffers.error, body: "", onSave: "", busy: true });
      else if (!mkOffers.loaded || mkEditMiss("offers", id, mkOffers)) {
        mkOffers.form = { open: false, mode: "edit", id: id, row: null }; mkOffersLoad();
        return formPage({ back: "offers", title: mkT("تعديل عرض", "Edit offer"),
          body: '<div class="loading-inline"><div class="loader"></div></div>', onSave: "", busy: true });
      }
      else return formPage({ back: "offers", title: mkT("تعديل عرض", "Edit offer"),
        error: mkT("لم يتم العثور على العرض.", "Offer not found."), body: "", onSave: "", busy: true });
    }
  } else if (!mkOffers.form.open || mkOffers.form.mode !== "create") {
    mkOffers.form = { open: true, mode: "create", id: null, row: null };
  }
  mkOffersLoad();
  return mkOfferForm(mkOffers.form);
}

// ----------------------------- owner: offers + my advertisements -----------------------------
function mkOwnerOrgs() {
  if (typeof ownData !== "undefined" && ownData.orgs && ownData.orgs.length) mkOwner.orgs = ownData.orgs;
  return mkOwner.orgs;
}
function mkOwnerLoadOffers() {
  if (mkOwner.offersLoading || mkOwner.offersLoaded) return;
  mkOwner.offersLoading = true; mkOwner.error = null;
  apiGet('/api/offers/mine').then(function (d) { mkOwner.offers = (d && d.items) || []; mkOwner.offersLoaded = true; mkOwner.offersLoading = false; render(); })
    .catch(function (e) { mkOwner.offersLoading = false; mkOwner.error = mkErr(e); render(); });
}
function mkOwnerLoadAds() {
  if (mkOwner.adsLoading || mkOwner.adsLoaded) return;
  mkOwner.adsLoading = true; mkOwner.error = null;
  apiGet('/api/advertisements/mine').then(function (d) { mkOwner.ads = (d && d.items) || []; mkOwner.adsLoaded = true; mkOwner.adsLoading = false; render(); })
    .catch(function (e) { mkOwner.adsLoading = false; mkOwner.error = mkErr(e); render(); });
}
function mkOwnerOfferSubmit(e) {
  if (e) e.preventDefault();
  var disc = mkVal("mko-o-disc");
  var payload = {
    organizationId: mkVal("mko-o-org") || null,
    title: mkVal("mko-o-tar"), titleEn: mkVal("mko-o-ten"),
    description: mkVal("mko-o-dar"), descriptionEn: mkVal("mko-o-den"),
    discountPercent: disc === "" ? null : Number(disc),
    startAt: mkIso("mko-o-start"), endAt: mkIso("mko-o-end"), active: mkChecked("mko-o-active")
  };
  if (!payload.organizationId || !payload.title) { alert(mkT("اختر المؤسسة وأدخل العنوان.", "Pick an institution and enter a title.")); return; }
  apiPost('/api/offers', payload).then(function () { mkOwner.offerForm = false; mkOwner.offersLoaded = false; mkOwnerLoadOffers(); }).catch(function (e) { alert(mkErr(e)); });
}
function mkOwnerOfferToggle(id, active) {
  apiPut('/api/offers/' + id, { active: active }).then(function () { mkOwner.offersLoaded = false; mkOwnerLoadOffers(); }).catch(function (e) { alert(mkErr(e)); });
}
function mkOwnerOfferDelete(id) {
  if (!mkConfirm(mkT("حذف هذا العرض؟", "Delete this offer?"))) return;
  apiDelete('/api/offers/' + id).then(function () { mkOwner.offersLoaded = false; mkOwnerLoadOffers(); }).catch(function (e) { alert(mkErr(e)); });
}
function mkOwnerAdSubmit(e) {
  if (e) e.preventDefault();
  var adv = mkVal("mko-a-adv");
  var payload = {
    name: mkVal("mko-a-name"), advertiser: mkAdvertiserName(adv), organizationId: null, teacherId: null,
    adType: "general", billingMode: "free", placement: ["ticker"],
    messageAr: mkVal("mko-a-mar"), messageEn: mkVal("mko-a-men"),
    image: mkVal("mko-a-image"), targetUrl: mkVal("mko-a-url") || null, targetRoute: mkVal("mko-a-route") || null,
    startAt: mkIso("mko-a-start"), endAt: mkIso("mko-a-end")
  };
  if (adv.indexOf("org:") === 0) payload.organizationId = adv.slice(4);
  else if (adv.indexOf("t:") === 0) payload.teacherId = adv.slice(2);
  if (!payload.name) { alert(mkT("أدخل اسم الإعلان.", "Enter the advertisement name.")); return; }
  if (!adv) { alert(mkT("اختر المعلن.", "Choose the advertiser.")); return; }
  if (!payload.image) { alert(mkT("ارفع صورة الإعلان.", "Upload the advertisement image.")); return; }
  apiPost('/api/advertisements', payload).then(function () { mkOwner.adForm = false; mkOwner.adsLoaded = false; mkOwnerLoadAds(); }).catch(function (e) { alert(mkErr(e)); });
}
function mkOwnerAdCancel(id) {
  if (!mkConfirm(mkT("إلغاء هذا الإعلان؟", "Cancel this advertisement?"))) return;
  apiPost('/api/advertisements/' + id + '/cancel', {}).then(function () { mkOwner.adsLoaded = false; mkOwnerLoadAds(); }).catch(function (e) { alert(mkErr(e)); });
}
function mkOwnerAdResubmit(id) {
  apiPost('/api/advertisements/' + id + '/resubmit', {}).then(function () { mkOwner.adsLoaded = false; mkOwnerLoadAds(); }).catch(function (e) { alert(mkErr(e)); });
}
function mkOwnerOffersSection() {
  mkOwnerLoadOffers();
  var ar = lang === "ar";
  var orgOpts = mkOwnerOrgs().map(function (o) { return opt(o.id, o.name); }).join("") || opt("", mkT("لا توجد مؤسسات", "No institutions"), true);
  var tabs = [["all", mkT("الكل", "All")], ["active", mkT("نشط", "Active")], ["scheduled", mkT("مجدول", "Scheduled")], ["expired", mkT("منتهي", "Expired")]];
  var rows = mkOwner.offers.filter(function (r) {
    if (mkOwner.offerTab === "all") return true;
    return mkOfferEff(r) === mkOwner.offerTab;
  });
  var body = '<div class="view-row"><div class="view-switch">' + tabs.map(function (t) {
    return '<button class="' + (mkOwner.offerTab === t[0] ? "active" : "") + '" onclick="mkOwner.offerTab=\'' + t[0] + '\';render()">' + t[1] + '</button>';
  }).join("") + '</div>' +
    '<button class="btn brown" onclick="mkOwner.offerForm=!mkOwner.offerForm;render()">' + icon("plus", 15) + ' ' + mkT("عرض جديد", "New offer") + '</button></div>';
  if (mkOwner.offerForm) {
    body += '<form class="mk-inline-form" onsubmit="mkOwnerOfferSubmit(event)"><div class="form-row2">' +
      '<div class="form-group"><label>' + mkT("المؤسسة", "Organization") + '</label><select id="mko-o-org" class="f-select">' + orgOpts + '</select></div>' +
      '<div class="form-group"><label>' + mkT("العنوان", "Title") + '</label><input id="mko-o-tar"></div></div>' +
      '<div class="form-row2"><div class="form-group"><label>' + mkT("الخصم %", "Discount %") + '</label><input id="mko-o-disc" type="number" dir="ltr"></div>' +
      '<div class="form-group"><label>' + mkT("الوصف", "Description") + '</label><input id="mko-o-dar"></div></div>' +
      '<div class="form-row2"><div class="form-group"><label>' + mkT("يبدأ في", "Starts at") + '</label>' + mkDateF("mko-o-start", null) + '</div>' +
      '<div class="form-group"><label>' + mkT("ينتهي في", "Ends at") + '</label>' + mkDateF("mko-o-end", null) + '</div></div>' +
      mkCheckF("mko-o-active", mkT("نشط", "Active"), true) +
      '<button type="submit" class="btn green">' + mkT("حفظ", "Save") + '</button></form>';
  }
  if (mkOwner.offersLoading) body += '<div class="loading-inline"><div class="loader"></div></div>';
  else if (!rows.length) body += '<div class="empty-state">' + (ar ? "لا توجد عروض." : "No offers.") + '</div>';
  else body += '<div class="table-wrap"><table class="tbl"><thead><tr><th>' + mkT("العرض", "Offer") + '</th><th>' + mkT("الخصم", "Discount") + '</th><th>' + mkT("النافذة", "Window") + '</th><th>' + mkT("الحالة", "Status") + '</th><th></th></tr></thead><tbody>' +
    rows.map(function (r) {
      return '<tr><td><b>' + esc(r.title) + '</b>' + (r.description ? '<div class="entity-sub">' + esc(r.description) + '</div>' : '') + '</td>' +
        '<td dir="ltr">' + esc(r.discountPercent == null ? "—" : r.discountPercent + "%") + '</td>' +
        '<td dir="ltr">' + esc(mkFmtDate(r.startAt)) + ' → ' + esc(mkFmtDate(r.endAt)) + '</td>' +
        '<td>' + mkAdStatus(mkOfferEff(r)) + '</td>' +
        '<td><div class="crud-actions">' +
        '<button class="crud" onclick="mkOwnerOfferToggle(\'' + r.id + '\',' + (r.active ? "false" : "true") + ')">' + icon(r.active ? "eye" : "check", 14) + '</button>' +
        '<button class="crud delete" onclick="mkOwnerOfferDelete(\'' + r.id + '\')">' + icon("trash", 14) + '</button></div></td></tr>';
    }).join("") + '</tbody></table></div>';
  return body;
}
function mkOwnerAdsSection() {
  mkOwnerLoadAds();
  var ar = lang === "ar";
  var tabs = [["all", mkT("الكل", "All")], ["pending", mkT("قيد المراجعة", "Pending")], ["active", mkT("نشط", "Active")], ["scheduled", mkT("مجدول", "Scheduled")], ["paused", mkT("موقوف", "Paused")], ["rejected", mkT("مرفوض", "Rejected")], ["expired", mkT("منتهي/ملغي", "Expired/Cancelled")]];
  var rows = mkOwner.ads.filter(function (r) {
    if (mkOwner.adTab === "all") return true;
    if (mkOwner.adTab === "expired") return r.effectiveStatus === "expired" || r.status === "cancelled";
    if (mkOwner.adTab === "active") return r.effectiveStatus === "active";
    if (mkOwner.adTab === "scheduled") return r.effectiveStatus === "scheduled";
    return r.status === mkOwner.adTab;
  });
  var body = '<div class="view-row"><div class="view-switch">' + tabs.map(function (t) {
    return '<button class="' + (mkOwner.adTab === t[0] ? "active" : "") + '" onclick="mkOwner.adTab=\'' + t[0] + '\';render()">' + t[1] + '</button>';
  }).join("") + '</div>' +
    '<button class="btn brown" onclick="mkOwner.adForm=!mkOwner.adForm;mkAdvertisersLoad();render()">' + icon("plus", 15) + ' ' + mkT("إعلان جديد", "New ad") + '</button></div>';
  if (mkOwner.adForm) {
    var advOpts = opt("", mkT("— اختر المعلن —", "— Choose advertiser —"), true) +
      (mkOwnerOrgs().length ? '<optgroup label="' + esc(mkT("مؤسساتي", "My institutions")) + '">' + mkOwnerOrgs().map(function (o) { return opt("org:" + o.id, o.name); }).join("") + '</optgroup>' : '') +
      (mkAdvertisers.rows.filter(function (a) { return a.kind === "teacher"; }).length ? '<optgroup label="' + esc(mkT("المعلمون (خاص)", "Private teachers")) + '">' + mkAdvertisers.rows.filter(function (a) { return a.kind === "teacher"; }).map(function (a) { return opt("t:" + a.id, a.name); }).join("") + '</optgroup>' : '');
    body += '<form class="mk-inline-form" onsubmit="mkOwnerAdSubmit(event)">' +
      '<div class="form-row2"><div class="form-group"><label>' + mkT("الاسم", "Name") + '</label><input id="mko-a-name"></div>' +
      '<div class="form-group"><label>' + mkT("المعلن", "Advertiser") + '</label><select id="mko-a-adv" class="f-select">' + advOpts + '</select></div></div>' +
      '<div class="form-row2"><div class="form-group"><label>' + mkT("الرسالة (عربي)", "Message (Arabic)") + '</label>' + mkArea("mko-a-mar", "") + '</div>' +
      '<div class="form-group"><label>' + mkT("الرسالة (إنجليزي)", "Message (English)") + '</label>' + mkArea("mko-a-men", "", "ltr") + '</div></div>' +
      '<div class="form-row2"><div class="form-group"><label>' + mkT("يبدأ في", "Starts at") + '</label>' + mkDateF("mko-a-start", null) + '</div>' +
      '<div class="form-group"><label>' + mkT("ينتهي في", "Ends at") + '</label>' + mkDateF("mko-a-end", null) + '</div></div>' +
      '<div class="ac-field-wide">' + mkUploadF("mko-a-image", mkT("صورة الإعلان (مطلوبة)", "Advertisement image (required)"), null, '/api/uploads/banner') + '</div>' +
      '<button type="submit" class="btn green">' + mkT("إرسال للمراجعة", "Submit for review") + '</button></form>';
  }
  if (mkOwner.adsLoading) body += '<div class="loading-inline"><div class="loader"></div></div>';
  else if (!rows.length) body += '<div class="empty-state">' + (ar ? "لا توجد إعلانات." : "No advertisements.") + '</div>';
  else body += '<div class="table-wrap"><table class="tbl"><thead><tr><th>' + mkT("الإعلان", "Advertisement") + '</th><th>' + mkT("الحالة", "Status") + '</th><th>' + mkT("النافذة", "Window") + '</th><th>' + mkT("نقرات", "Clicks") + '</th><th></th></tr></thead><tbody>' +
    rows.map(function (r) {
      var reason = r.rejectionReason ? '<div class="entity-sub bad">' + esc(r.rejectionReason) + '</div>' : '';
      var acts = '<div class="crud-actions">';
      if (r.status === "rejected") acts += '<button class="crud verify" onclick="mkOwnerAdResubmit(\'' + r.id + '\')" title="' + mkT("إعادة إرسال", "Resubmit") + '">' + icon("check", 14) + '</button>';
      if (r.status !== "cancelled" && r.status !== "archived") acts += '<button class="crud delete" onclick="mkOwnerAdCancel(\'' + r.id + '\')" title="' + mkT("إلغاء", "Cancel") + '">' + icon("x", 14) + '</button>';
      acts += '</div>';
      return '<tr><td><b>' + esc(r.name) + '</b>' + reason + '</td>' +
        '<td>' + mkAdStatus(r.effectiveStatus) + '</td>' +
        '<td dir="ltr">' + esc(mkFmtDate(r.startAt)) + ' → ' + esc(mkFmtDate(r.endAt)) + '</td>' +
        '<td dir="ltr">' + esc(r.clicks || 0) + '</td><td>' + acts + '</td></tr>';
    }).join("") + '</tbody></table></div>';
  return body;
}

// Re-render once so a direct deep link to one of these routes picks up the
// page functions defined above (app.js runs its first render before this file).
try { if (["slides", "ads", "offers"].indexOf(route()) > -1) render(); } catch (e) {}
