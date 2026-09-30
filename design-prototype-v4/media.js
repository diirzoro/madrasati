// media.js
// Enterprise media resolver for the Madrasati V4 SPA.
//
// ONE ENTITY = ONE MEDIA ROOT.  DATABASE ID = MEDIA OWNER.  NAME = LABEL ONLY.
//
//   organization.id      -> assets/institutions/<type-folder>/<id>[-label]/
//                             {logo, cover, gallery, facilities, documents}
//   teacher_profiles.id  -> assets/teachers/<gender>/<id>[-label]/
//                             {profile, cover, gallery, documents}
//   users.id             -> assets/users/<id>/{avatar, documents}
//   owner.id             -> assets/owners/<id>/{profile, documents}
//
// The folder label is a human-readable alias appended AFTER the id; it is never
// the identity. Two entities with the same name get different roots because
// their ids differ, and renaming an entity never moves its media.
//
// RESOLUTION PRIORITY (never reversed, never random):
//   1. entity-owned media from the API/database   (o.image, o.gallery, t.avatarUrl)
//   2. explicit id -> existing-asset mapping      (media-map.js, built from the DB)
//   3. the entity's upload root                   (resolvePath / media-init.js)
//   4. a clearly-generic reference fallback       (assets/reference/**), deterministic by id
//
// Generic fallback media is flagged (generic:true) and never presented as the
// real photo of a named institution or teacher.
(function () {
  var REF = {
    institutions: {
      private_school: "assets/reference/institutions/private-school/",
      government_school: "assets/reference/institutions/government-school/",
      institute: "assets/reference/institutions/institute/",
      college: "assets/reference/institutions/college/",
      university: "assets/reference/institutions/university/"
    },
    teachers: { male: "assets/reference/teachers/male/", female: "assets/reference/teachers/female/" }
  };

  // Existing project photos (real campus images shipped with the repo) are the
  // preferred generic fallback and are used before the downloaded references.
  var INST_PROJECT = [
    "assets/images/school-1.jpg", "assets/images/school-2.jpg", "assets/images/school-3.jpg",
    "assets/images/school-4.jpg", "assets/images/school-5.jpg", "assets/images/school-6.jpg",
    "assets/images/school-7.jpg", "assets/images/school-8.jpg", "assets/images/school-detail-cover.jpg"
  ];
  var INST_REF = [
    "assets/reference/institutions/shared/cover-01.jpg", "assets/reference/institutions/shared/cover-02.jpg",
    "assets/reference/institutions/shared/cover-03.jpg", "assets/reference/institutions/shared/cover-04.jpg",
    "assets/reference/institutions/shared/cover-05.jpg", "assets/reference/institutions/shared/cover-06.jpg",
    "assets/reference/institutions/shared/cover-07.jpg", "assets/reference/institutions/shared/cover-08.jpg",
    "assets/reference/institutions/shared/cover-09.jpg", "assets/reference/institutions/shared/cover-10.jpg"
  ];
  var INST_POOL = INST_PROJECT.concat(INST_REF);
  function instPool() { return INST_PROJECT.length ? INST_PROJECT : INST_REF; }
  var TEACHER_POOL = {
    male: [1, 2, 3, 4, 5, 6].map(function (n) { return "assets/reference/teachers/male/profile-" + ("0" + n).slice(-2) + ".jpg"; }),
    female: [1, 2, 3, 4, 5, 6].map(function (n) { return "assets/reference/teachers/female/profile-" + ("0" + n).slice(-2) + ".jpg"; })
  };

  var CATEGORIES = {
    organization: ["logo", "cover", "gallery", "facilities", "documents"],
    teacher: ["profile", "cover", "gallery", "documents"],
    user: ["avatar", "documents"],
    owner: ["profile", "documents"]
  };

  function hash(s) {
    s = String(s || "");
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  function slugify(s) {
    var v = String(s || "").trim().toLowerCase();
    if (!v) return "";
    return v.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // id is mandatory and first; the label is an optional readable suffix.
  function segment(id, label) {
    var l = slugify(label);
    return l ? (String(id) + "-" + l) : String(id);
  }

  function typeFolder(type) {
    return ({
      private_school: "private-schools",
      government_school: "government-schools",
      institute: "institutes",
      college: "colleges",
      university: "universities"
    })[type] || "other";
  }

  function orgRoot(o) {
    if (!o || !o.id) return "";
    return "assets/institutions/" + typeFolder(o.type) + "/" + segment(o.id, o.slug) + "/";
  }
  function teacherRoot(t) {
    if (!t || !t.id) return "";
    var gender = (t.gender === "female") ? "female" : "male";
    return "assets/teachers/" + gender + "/" + segment(t.id, t.slug) + "/";
  }
  function userRoot(id) { return id ? ("assets/users/" + String(id) + "/") : ""; }
  function ownerRoot(id) { return id ? ("assets/owners/" + String(id) + "/") : ""; }

  // The single entry point every upload must use. The destination is derived
  // from the authenticated entity id + media type — never from the frontend.
  function resolvePath(owner) {
    owner = owner || {};
    var type = owner.entityType;
    var mid = owner.mediaType;
    if (type === "organization") {
      if (!owner.entityId) return "";
      var tf = typeFolder(owner.orgType || owner.type);
      var cat = (CATEGORIES.organization.indexOf(mid) > -1) ? mid : "documents";
      return "assets/institutions/" + tf + "/" + segment(owner.entityId, owner.label || owner.slug) + "/" + cat + "/";
    }
    if (type === "teacher") {
      if (!owner.entityId) return "";
      var g = (owner.gender === "female") ? "female" : "male";
      var tcat = (CATEGORIES.teacher.indexOf(mid) > -1) ? mid : "documents";
      return "assets/teachers/" + g + "/" + segment(owner.entityId, owner.label || owner.slug) + "/" + tcat + "/";
    }
    if (type === "user") {
      if (!owner.entityId) return "";
      var ucat = (CATEGORIES.user.indexOf(mid) > -1) ? mid : "documents";
      return "assets/users/" + String(owner.entityId) + "/" + ucat + "/";
    }
    if (type === "owner") {
      if (!owner.entityId) return "";
      var ocat = (CATEGORIES.owner.indexOf(mid) > -1) ? mid : "documents";
      return "assets/owners/" + String(owner.entityId) + "/" + ocat + "/";
    }
    return "";
  }

  function isRaster(p) { return !!p && /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(p); }

  function galleryOf(list) {
    if (Array.isArray(list) && list.length) {
      var mapped = list.map(function (g) { return (typeof g === "string") ? g : ((g && (g.url || g.path || g.src)) || ""); }).filter(Boolean);
      if (mapped.length) return mapped;
    }
    return [];
  }

  function pick(pool, seed, n) {
    var out = [];
    if (!pool.length) return out;
    var start = hash(seed) % pool.length;
    for (var i = 0; i < Math.min(n, pool.length); i++) out.push(pool[(start + i) % pool.length]);
    return out;
  }

  function mapFor(kind, id) {
    try {
      var m = window.MADRASATI_MEDIA_MAP;
      return (m && m[kind] && id) ? (m[kind][id] || null) : null;
    } catch (e) { return null; }
  }

  function orgMedia(o) {
    o = o || {};
    var ref = REF.institutions[o.type] || REF.institutions.private_school;
    var m = mapFor("organizations", o.id);
    var api = (o.media && typeof o.media === "object") ? o.media : null;
    var seed = o.id || "";

    // Priority 1: entity-owned media returned by the API (the media registry,
    // keyed on this organization's id). Nothing else may claim these paths.
    var apiGallery = api ? galleryOf(api.gallery) : [];
    var realGallery = apiGallery.length ? apiGallery
      : (galleryOf(o.gallery).length ? galleryOf(o.gallery) : galleryOf(m && m.gallery));

    var logo = (api && api.logo) || o.image || (m && m.logo) || (ref + "logo.svg");

    // The gallery is REAL entity media when it exists. With none, it falls back to
    // a deterministic set of the repo's real campus photos, flagged illustrative —
    // the same rule as the cover, so a school is never left with an empty gallery
    // and a placeholder is never passed off as that school's own photo.
    var gallery = realGallery;
    var illustrative = false;
    if (!gallery.length && instPool().length) {
      gallery = pick(instPool(), seed || "org", 5);
      illustrative = true;
    }
    var generic = !realGallery.length;

    var cover;
    if (api && api.cover) { cover = api.cover; generic = false; }
    else if (isRaster(o.image)) { cover = o.image; generic = false; }
    else if (realGallery.length) { cover = realGallery[0]; generic = false; }
    else if (m && isRaster(m.cover)) cover = m.cover;
    else cover = pick(instPool(), seed, 1)[0] || (ref + "cover.svg");

    return {
      root: orgRoot(o), logo: logo, cover: cover, gallery: gallery,
      generic: generic, illustrative: illustrative, isGenericLogo: !(api && api.logo) && !o.image, ref: ref
    };
  }

  function teacherMedia(t) {
    t = t || {};
    var g = (t.gender === "female") ? "female" : "male";
    var ref = REF.teachers[g];
    var m = mapFor("teachers", t.id);
    var pool = TEACHER_POOL[g];
    var real = t.avatarUrl || t.image || (m && m.avatar) || "";
    var avatar = real || pool[hash(t.id || "") % pool.length] || (ref + "profile.svg");
    var gallery = galleryOf(t.gallery).concat(galleryOf(m && m.gallery));
    return {
      root: teacherRoot(t), avatar: avatar, cover: ref + "cover.svg",
      gallery: gallery, generic: !real, gender: g, ref: ref
    };
  }

  window.MadrasatiMedia = {
    orgMedia: orgMedia,
    teacherMedia: teacherMedia,
    resolvePath: resolvePath,
    orgRoot: orgRoot,
    teacherRoot: teacherRoot,
    userRoot: userRoot,
    ownerRoot: ownerRoot,
    segment: segment,
    typeFolder: typeFolder,
    isRaster: isRaster,
    hash: hash,
    CATEGORIES: CATEGORIES,
    REF: REF,
    INST_POOL: INST_POOL,
    TEACHER_POOL: TEACHER_POOL
  };
})();
