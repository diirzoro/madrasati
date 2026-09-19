// admin-marketing.js — Super Admin management for landing slides, ticker ads,
// and institution offers. Talks to the PostgreSQL-backed marketing module at
// /api/admin/* (server/modules/marketing). Loaded after app.js; app.js render()
// dispatches to these pages by name so a missing file degrades to the generic
// placeholder instead of breaking the shell.

var MK_CTA_ROUTES = ["home", "private", "government", "colleges", "institutes", "teachers", "schools", "login"];
var MK_PLACEMENTS = ["ticker", "banner", "sidebar", "public_hero"];
var MK_SLIDE_TYPES = [["platform", "منصة", "Platform"], ["promotion", "عرض", "Promotion"], ["premium_ad", "إعلان مميز", "Premium ad"]];
var MK_SLIDE_STATUS = [["draft", "مسودة", "Draft"], ["approved", "معتمد", "Approved"], ["paused", "موقوف", "Paused"], ["rejected", "مرفوض", "Rejected"], ["expired", "منتهي", "Expired"]];
var MK_AD_TYPES = [["general", "عام", "General"], ["promotion", "ترويجي", "Promotion"], ["enrollment", "تسجيل", "Enrollment"], ["notice", "تنبيه", "Notice"]];
var MK_AD_BILLING = [["free", "مجاني", "Free"], ["paid", "مدفوع", "Paid"]];
var MK_AD_STATUS = [["active", "نشط", "Active"], ["paused", "موقوف", "Paused"], ["expired", "منتهي", "Expired"], ["archived", "مؤرشف", "Archived"]];

var mkSlides = { rows: [], loading: false, loaded: false, error: null, info: null, saving: false, form: { open: false, mode: "create", id: null } };
var mkAds = { rows: [], loading: false, loaded: false, error: null, info: null, saving: false, form: { open: false, mode: "create", id: null } };
var mkOffers = { rows: [], loading: false, loaded: false, error: null, info: null, saving: false, orgs: [], loadingOrgs: false, form: { open: false, mode: "create", id: null } };

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
function mkUploadF(id, label, current) {
  var prev = current ? '<img class="mk-prev" id="' + id + '-prev" src="' + esc(mkMedia(current)) + '" alt="">' : '<img class="mk-prev" id="' + id + '-prev" style="display:none" alt="">';
  return '<div class="form-group"><label>' + esc(label) + '</label><div class="doc-upload">' +
    '<input type="file" id="' + id + '" accept="image/png,image/jpeg,image/webp" onchange="mkUploadFile(this,\'' + id + '-val\',\'' + id + '-prev\')">' +
    '<input type="hidden" id="' + id + '-val" value="' + esc(current || "") + '">' + prev +
    '</div></div>';
}
function mkUploadFile(input, valId, prevId) {
  var file = input.files && input.files[0];
  if (!file) return;
  var val = document.getElementById(valId), prev = document.getElementById(prevId);
  if (val) val.value = "";
  fetch(API_BASE + '/api/admin/uploads/banner', {
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
  var cls = s === "approved" || s === "active" ? "ok" : s === "paused" || s === "draft" ? "wait" : "bad";
  return '<span class="badge ' + cls + '">' + esc(s) + '</span>';
}
function mkConfirm(msg) { return window.confirm(msg); }

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

// ----------------------------- slides -----------------------------
function mkSlidesOpen(row) {
  mkSlides.form = row ? { open: true, mode: "edit", id: row.id, row: row } : { open: true, mode: "create", id: null, row: null };
  mkSlides.info = null; render();
}
function mkSlidesClose() { mkSlides.form = { open: false, mode: "create", id: null, row: null }; render(); }
function mkSlideForm(f) {
  var r = f.row || {};
  var typeOpts = mkPairs(MK_SLIDE_TYPES), statusOpts = mkPairs(MK_SLIDE_STATUS);
  return '<form class="rg-section" onsubmit="mkSlideSubmit(event)"><h3>' + (f.mode === "edit" ? mkT("تعديل شريحة", "Edit slide") : mkT("شريحة جديدة", "New slide")) + '</h3>' +
    '<div class="form-row2">' +
      mkGroup(mkT("النوع", "Type"), '<select id="mk-s-type" class="f-select">' + typeOpts.map(function (p) { return opt(p[0], p[1], (r.type || "promotion") === p[0]); }).join("") + '</select>') +
      mkGroup(mkT("الحالة", "Status"), '<select id="mk-s-status" class="f-select">' + statusOpts.map(function (p) { return opt(p[0], p[1], (r.status || "draft") === p[0]); }).join("") + '</select>') +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("العنوان (عربي)", "Title (Arabic)"), mkInputF("mk-s-tar", r.titleAr)) +
      mkGroup(mkT("العنوان (إنجليزي)", "Title (English)"), mkInputF("mk-s-ten", r.titleEn, "ltr")) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("العنوان الفرعي (عربي)", "Subtitle (Arabic)"), mkInputF("mk-s-sar", r.subtitleAr)) +
      mkGroup(mkT("العنوان الفرعي (إنجليزي)", "Subtitle (English)"), mkInputF("mk-s-sen", r.subtitleEn, "ltr")) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("الشارة (عربي)", "Badge (Arabic)"), mkInputF("mk-s-bar", r.badgeAr)) +
      mkGroup(mkT("الشارة (إنجليزي)", "Badge (English)"), mkInputF("mk-s-ben", r.badgeEn, "ltr")) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("نص الصورة (عربي)", "Overlay (Arabic)"), mkArea("mk-s-oar", r.overlayTitleAr, "auto")) +
      mkGroup(mkT("نص الصورة (إنجليزي)", "Overlay (English)"), mkArea("mk-s-oen", r.overlayTitleEn, "ltr")) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("الموقع (عربي)", "Location (Arabic)"), mkInputF("mk-s-lar", r.locationAr)) +
      mkGroup(mkT("الموقع (إنجليزي)", "Location (English)"), mkInputF("mk-s-len", r.locationEn, "ltr")) +
    '</div>' +
    mkUploadF("mk-s-image", mkT("صورة الشريحة (JPG/PNG/WEBP)", "Slide image (JPG/PNG/WEBP)"), r.image) +
    '<div class="form-row2">' +
      mkGroup(mkT("موضع الصورة", "Image position"), mkSelectF("mk-s-ipos", [["center", mkT("وسط", "Center")], ["top", mkT("أعلى", "Top")], ["bottom", mkT("أسفل", "Bottom")]], r.imagePosition || "center")) +
      mkGroup(mkT("الترتيب", "Priority"), mkNumberF("mk-s-prio", r.priority == null ? 0 : r.priority)) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("نص الزر (عربي)", "CTA label (Arabic)"), mkInputF("mk-s-ctaar", r.ctaLabelAr)) +
      mkGroup(mkT("نص الزر (إنجليزي)", "CTA label (English)"), mkInputF("mk-s-ctaen", r.ctaLabelEn, "ltr")) +
    '</div>' +
    mkGroup(mkT("وجهة الزر", "CTA route"), mkSelectF("mk-s-route", [[ "", "—" ]].concat(MK_CTA_ROUTES.map(function (x) { return [x, x]; })), r.ctaRoute || "")) +
    '<div class="form-row2">' +
      mkGroup(mkT("يبدأ في", "Starts at"), mkDateF("mk-s-start", r.startAt)) +
      mkGroup(mkT("ينتهي في", "Ends at"), mkDateF("mk-s-end", r.endAt)) +
    '</div>' +
    mkCheckF("mk-s-active", mkT("نشط", "Active"), r.active !== false) +
    '<div class="sp-actions"><button type="submit" class="btn green"' + (mkSlides.saving ? " disabled" : "") + '>' + mkT("حفظ", "Save") + '</button>' +
    '<button type="button" class="btn" onclick="mkSlidesClose()">' + mkT("إلغاء", "Cancel") + '</button></div>' +
    (mkSlides.info ? '<p class="mk-note">' + esc(mkSlides.info) + '</p>' : '') +
  '</form>';
}
function mkSlideSubmit(e) {
  e.preventDefault();
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
    mkSlides.info = mkT("تم الحفظ.", "Saved."); mkSlidesLoad();
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
  mkSlidesLoad();
  var ar = lang === "ar";
  var body = '<div class="welcome"><div><h1>' + esc(tr("slides")) + '</h1><p>' + (ar ? "إدارة شرائح الواجهة الرئيسية (بحد أقصى 6)." : "Manage landing hero slides (maximum 6).") + '</p></div>' +
    '<div class="sp-actions"><button class="btn brown" onclick="mkSlidesOpen()">' + icon("plus", 15) + ' ' + (ar ? "شريحة جديدة" : "New slide") + '</button></div></div>';
  body += '<section class="panel"><div class="panel-title"><div><h2>' + esc(tr("slides")) + '</h2><p>' + mkSlides.rows.length + ' / 6</p></div></div>';
  if (mkSlides.form.open) body += mkSlideForm(mkSlides.form);
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

// ----------------------------- advertisements -----------------------------
function mkAdsOpen(row) {
  mkAds.form = row ? { open: true, mode: "edit", id: row.id, row: row } : { open: true, mode: "create", id: null, row: null };
  mkAds.info = null; render();
}
function mkAdsClose() { mkAds.form = { open: false, mode: "create", id: null, row: null }; render(); }
function mkAdForm(f) {
  var r = f.row || {};
  var pl = r.placement || ["ticker"];
  return '<form class="rg-section" onsubmit="mkAdSubmit(event)"><h3>' + (f.mode === "edit" ? mkT("تعديل إعلان", "Edit advertisement") : mkT("إعلان جديد", "New advertisement")) + '</h3>' +
    '<div class="form-row2">' +
      mkGroup(mkT("الاسم", "Name"), mkInputF("mk-a-name", r.name)) +
      mkGroup(mkT("المعلن", "Advertiser"), mkInputF("mk-a-adv", r.advertiser)) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("النوع", "Type"), mkSelectF("mk-a-type", mkPairs(MK_AD_TYPES), r.adType || "general")) +
      mkGroup(mkT("الفوترة", "Billing"), mkSelectF("mk-a-bill", mkPairs(MK_AD_BILLING), r.billingMode || "free")) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("الحالة", "Status"), mkSelectF("mk-a-status", mkPairs(MK_AD_STATUS), r.status || "active")) +
      mkGroup(mkT("الترتيب", "Priority"), mkNumberF("mk-a-prio", r.priority == null ? 0 : r.priority)) +
    '</div>' +
    '<div class="form-group"><label>' + mkT("أماكن العرض", "Placements") + '</label><div class="mk-checks">' +
      MK_PLACEMENTS.map(function (p) { return mkCheckF("mk-a-p-" + p, p, pl.indexOf(p) > -1); }).join("") + '</div></div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("نص الإعلان (عربي)", "Message (Arabic)"), mkArea("mk-a-mar", r.messageAr)) +
      mkGroup(mkT("نص الإعلان (إنجليزي)", "Message (English)"), mkArea("mk-a-men", r.messageEn, "ltr")) +
    '</div>' +
    mkUploadF("mk-a-image", mkT("صورة (اختياري)", "Image (optional)"), r.image) +
    '<div class="form-row2">' +
      mkGroup(mkT("رابط خارجي (https)", "External URL (https)"), mkInputF("mk-a-url", r.targetUrl, "ltr")) +
      mkGroup(mkT("وجهة داخلية", "Internal route"), mkSelectF("mk-a-route", [[ "", "—" ]].concat(MK_CTA_ROUTES.map(function (x) { return [x, x]; })), r.targetRoute || "")) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("يبدأ في", "Starts at"), mkDateF("mk-a-start", r.startAt)) +
      mkGroup(mkT("ينتهي في", "Ends at"), mkDateF("mk-a-end", r.endAt)) +
    '</div>' +
    mkGroup(mkT("ملاحظات", "Notes"), mkInputF("mk-a-notes", r.notes)) +
    '<div class="sp-actions"><button type="submit" class="btn green"' + (mkAds.saving ? " disabled" : "") + '>' + mkT("حفظ", "Save") + '</button>' +
    '<button type="button" class="btn" onclick="mkAdsClose()">' + mkT("إلغاء", "Cancel") + '</button></div>' +
    (mkAds.info ? '<p class="mk-note">' + esc(mkAds.info) + '</p>' : '') +
  '</form>';
}
function mkAdSubmit(e) {
  e.preventDefault();
  if (mkAds.saving) return;
  var f = mkAds.form;
  var placement = MK_PLACEMENTS.filter(function (p) { return mkChecked("mk-a-p-" + p); });
  var payload = {
    name: mkVal("mk-a-name"), advertiser: mkVal("mk-a-adv"),
    adType: mkVal("mk-a-type"), billingMode: mkVal("mk-a-bill"), status: mkVal("mk-a-status"),
    placement: placement.length ? placement : ["ticker"],
    messageAr: mkVal("mk-a-mar"), messageEn: mkVal("mk-a-men"),
    image: mkVal("mk-a-image"), targetUrl: mkVal("mk-a-url") || null, targetRoute: mkVal("mk-a-route") || null,
    priority: Number(mkVal("mk-a-prio") || 0), startAt: mkIso("mk-a-start"), endAt: mkIso("mk-a-end"),
    notes: mkVal("mk-a-notes")
  };
  if (!payload.name) { mkAds.info = mkT("أدخل اسم الإعلان.", "Enter the advertisement name."); render(); return; }
  mkAds.saving = true; mkAds.info = null;
  var req = f.mode === "edit" ? apiPut('/api/admin/advertisements/' + f.id, payload) : apiPost('/api/admin/advertisements', payload);
  req.then(function () {
    mkAds.saving = false; mkAds.form = { open: false, mode: "create", id: null }; mkAds.loaded = false;
    mkAds.info = mkT("تم الحفظ.", "Saved."); mkAdsLoad();
  }).catch(function (err) { mkAds.saving = false; mkAds.info = mkErr(err); render(); });
}
function mkAdStatus(id, status) {
  apiPut('/api/admin/advertisements/' + id, { status: status }).then(function () {
    mkAds.loaded = false; mkAdsLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function mkAdDelete(id) {
  if (!mkConfirm(mkT("حذف هذا الإعلان؟", "Delete this advertisement?"))) return;
  apiDelete('/api/admin/advertisements/' + id).then(function () {
    mkAds.loaded = false; mkAdsLoad();
  }).catch(function (e) { alert(mkErr(e)); });
}
function adsAdminPage() {
  mkAdsLoad();
  var ar = lang === "ar";
  var body = '<div class="welcome"><div><h1>' + esc(tr("ads")) + '</h1><p>' + (ar ? "إعلانات الشريط المتحرك والبانرات. تظهر الإعلانات النشطة داخل النافذة الزمنية فقط." : "Ticker and banner advertisements. Only active, in-window ads are shown.") + '</p></div>' +
    '<div class="sp-actions"><button class="btn brown" onclick="mkAdsOpen()">' + icon("plus", 15) + ' ' + (ar ? "إعلان جديد" : "New ad") + '</button></div></div>';
  body += '<section class="panel"><div class="panel-title"><div><h2>' + esc(tr("ads")) + '</h2></div></div>';
  if (mkAds.form.open) body += mkAdForm(mkAds.form);
  if (mkAds.loading) body += '<div class="loading-inline"><div class="loader"></div></div>';
  else if (mkAds.error) body += '<div class="empty-state">' + esc(mkAds.error) + '</div>';
  else if (!mkAds.rows.length) body += '<div class="empty-state">' + (ar ? "لا توجد إعلانات بعد." : "No advertisements yet.") + '</div>';
  else body += '<div class="table-wrap"><table class="tbl"><thead><tr><th>' + (ar ? "الاسم" : "Name") + '</th><th>' + (ar ? "المعلن" : "Advertiser") + '</th><th>' + (ar ? "النوع" : "Type") + '</th><th>' + (ar ? "الفوترة" : "Billing") + '</th><th>' + (ar ? "الحالة" : "Status") + '</th><th>' + (ar ? "نقرات" : "Clicks") + '</th><th></th></tr></thead><tbody>' +
    mkAds.rows.map(function (r) {
      var acts = '<div class="crud-actions">' +
        (r.status === "active"
          ? '<button class="crud" onclick="mkAdStatus(\'' + r.id + '\',\'paused\')" title="' + mkT("إيقاف", "Pause") + '">' + icon("eye", 14) + '</button>'
          : '<button class="crud verify" onclick="mkAdStatus(\'' + r.id + '\',\'active\')" title="' + mkT("تنشيط", "Activate") + '">' + icon("check", 14) + '</button>') +
        '<button class="crud" onclick="mkAdStatus(\'' + r.id + '\',\'archived\')" title="' + mkT("أرشفة", "Archive") + '">' + icon("list", 14) + '</button>' +
        '<button class="crud edit" onclick="mkAdsOpen(mkAds.rows.filter(function(x){return String(x.id)===\'' + r.id + '\'})[0])" title="' + mkT("تعديل", "Edit") + '">' + icon("edit", 14) + '</button>' +
        '<button class="crud delete" onclick="mkAdDelete(\'' + r.id + '\')" title="' + mkT("حذف", "Delete") + '">' + icon("trash", 14) + '</button>' +
        '</div>';
      return '<tr><td><b>' + esc(r.name) + '</b><div class="entity-sub">' + esc((r.placement || []).join(" · ")) + '</div></td>' +
        '<td>' + esc(r.advertiser || "—") + '</td><td>' + esc(r.adType) + '</td><td>' + esc(r.billingMode) + '</td>' +
        '<td>' + mkStatusBadge(r.status) + '</td><td dir="ltr">' + esc(r.clicks || 0) + '</td><td>' + acts + '</td></tr>';
    }).join("") + '</tbody></table></div>';
  body += '</section>';
  return adminShell(body);
}

// ----------------------------- offers -----------------------------
function mkOffersOpen(row) {
  mkOffers.form = row ? { open: true, mode: "edit", id: row.id, row: row } : { open: true, mode: "create", id: null, row: null };
  mkOffers.info = null; render();
}
function mkOffersClose() { mkOffers.form = { open: false, mode: "create", id: null, row: null }; render(); }
function mkOfferForm(f) {
  var r = f.row || {};
  var orgOpts = [[ "", mkT("اختر مؤسسة", "Select organization") ]].concat(mkOffers.orgs.map(function (o) { return [o.id, o.name]; }));
  return '<form class="rg-section" onsubmit="mkOfferSubmit(event)"><h3>' + (f.mode === "edit" ? mkT("تعديل عرض", "Edit offer") : mkT("عرض جديد", "New offer")) + '</h3>' +
    mkGroup(mkT("المؤسسة", "Organization"), mkSelectF("mk-o-org", orgOpts, r.organizationId || "")) +
    '<div class="form-row2">' +
      mkGroup(mkT("العنوان (عربي)", "Title (Arabic)"), mkInputF("mk-o-tar", r.title)) +
      mkGroup(mkT("العنوان (إنجليزي)", "Title (English)"), mkInputF("mk-o-ten", r.titleEn, "ltr")) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("الوصف (عربي)", "Description (Arabic)"), mkArea("mk-o-dar", r.description)) +
      mkGroup(mkT("الوصف (إنجليزي)", "Description (English)"), mkArea("mk-o-den", r.descriptionEn, "ltr")) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("نسبة الخصم %", "Discount %"), mkNumberF("mk-o-disc", r.discountPercent == null ? "" : r.discountPercent)) +
      mkCheckF("mk-o-active", mkT("نشط", "Active"), r.active !== false) +
    '</div>' +
    '<div class="form-row2">' +
      mkGroup(mkT("يبدأ في", "Starts at"), mkDateF("mk-o-start", r.startAt)) +
      mkGroup(mkT("ينتهي في", "Ends at"), mkDateF("mk-o-end", r.endAt)) +
    '</div>' +
    '<div class="sp-actions"><button type="submit" class="btn green"' + (mkOffers.saving ? " disabled" : "") + '>' + mkT("حفظ", "Save") + '</button>' +
    '<button type="button" class="btn" onclick="mkOffersClose()">' + mkT("إلغاء", "Cancel") + '</button></div>' +
    (mkOffers.info ? '<p class="mk-note">' + esc(mkOffers.info) + '</p>' : '') +
  '</form>';
}
function mkOfferSubmit(e) {
  e.preventDefault();
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
    mkOffers.info = mkT("تم الحفظ.", "Saved."); mkOffersLoad();
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
function offersAdminPage() {
  mkOffersLoad();
  var ar = lang === "ar";
  var body = '<div class="welcome"><div><h1>' + esc(tr("offers")) + '</h1><p>' + (ar ? "عروض المؤسسات. تظهر العروض النشطة داخل النافذة الزمنية على البطاقات." : "Institution offers. Active, in-window offers appear on cards.") + '</p></div>' +
    '<div class="sp-actions"><button class="btn brown" onclick="mkOffersOpen()">' + icon("plus", 15) + ' ' + (ar ? "عرض جديد" : "New offer") + '</button></div></div>';
  body += '<section class="panel"><div class="panel-title"><div><h2>' + esc(tr("offers")) + '</h2></div></div>';
  if (mkOffers.form.open) body += mkOfferForm(mkOffers.form);
  if (mkOffers.loading) body += '<div class="loading-inline"><div class="loader"></div></div>';
  else if (mkOffers.error) body += '<div class="empty-state">' + esc(mkOffers.error) + '</div>';
  else if (!mkOffers.rows.length) body += '<div class="empty-state">' + (ar ? "لا توجد عروض بعد." : "No offers yet.") + '</div>';
  else body += '<div class="table-wrap"><table class="tbl"><thead><tr><th>' + (ar ? "المؤسسة" : "Organization") + '</th><th>' + (ar ? "العرض" : "Offer") + '</th><th>' + (ar ? "الخصم" : "Discount") + '</th><th>' + (ar ? "النافذة" : "Window") + '</th><th>' + (ar ? "نشط" : "Active") + '</th><th></th></tr></thead><tbody>' +
    mkOffers.rows.map(function (r) {
      var acts = '<div class="crud-actions">' +
        '<button class="crud ' + (r.active ? "" : "verify") + '" onclick="mkOfferToggle(\'' + r.id + '\',' + (r.active ? "false" : "true") + ')" title="' + mkT("تبديل الحالة", "Toggle") + '">' + icon(r.active ? "eye" : "check", 14) + '</button>' +
        '<button class="crud edit" onclick="mkOffersOpen(mkOffers.rows.filter(function(x){return String(x.id)===\'' + r.id + '\'})[0])" title="' + mkT("تعديل", "Edit") + '">' + icon("edit", 14) + '</button>' +
        '<button class="crud delete" onclick="mkOfferDelete(\'' + r.id + '\')" title="' + mkT("حذف", "Delete") + '">' + icon("trash", 14) + '</button>' +
        '</div>';
      return '<tr><td><b>' + esc(r.organizationName || "—") + '</b></td>' +
        '<td><b>' + esc(r.title || "—") + '</b>' + (r.description ? '<div class="entity-sub">' + esc(r.description) + '</div>' : '') + '</td>' +
        '<td dir="ltr">' + esc(r.discountPercent == null ? "—" : r.discountPercent + "%") + '</td>' +
        '<td dir="ltr">' + esc(mkFmtDate(r.startAt)) + ' → ' + esc(mkFmtDate(r.endAt)) + '</td>' +
        '<td>' + (r.active ? "✓" : "—") + '</td><td>' + acts + '</td></tr>';
    }).join("") + '</tbody></table></div>';
  body += '</section>';
  return adminShell(body);
}

// Re-render once so a direct deep link to one of these routes picks up the
// page functions defined above (app.js runs its first render before this file).
try { if (["slides", "ads", "offers"].indexOf(route()) > -1) render(); } catch (e) {}
