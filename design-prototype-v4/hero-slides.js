// hero-slides.js — Dynamic hero / premium promotions slider for Madarasati V4 landing.
//
// ARCHITECTURE (presentation vs business logic separation):
//   1. HERO_SLIDES_LOCAL .... permanent platform fallback (type "platform").
//      Landing NEVER renders empty: if no eligible promotion exists, these show.
//   2. Promotion adapter ..... getEligibleHeroSlides(remoteSlides)
//      filters + sorts remote campaigns WITHOUT any billing logic.
//      Eligibility: status approved/active, placement includes "public_hero",
//      within startAt/endAt window. Draft/pending/rejected/expired are dropped.
//   3. HeroSlider controller .. autoplay + dots + arrows + swipe + pause-on-hover.
//      Single interval only; destroy() on route change prevents timer leaks.
//
// BACKEND CONTRACT (live):
//   GET /api/hero-slides?placement=public_hero  ->  { slides: [HeroSlide] }
//   Served by server/modules/marketing (PostgreSQL hero_slides table).
//   A HeroSlide uses the same shape as below (camelCase follows server module
//   conventions). snake_case aliases are accepted and normalized by
//   normalizeSlide() (e.g. title_ar, image_position, starts_at, ends_at,
//   cta_route, target_url ...). Placement filter: "public_hero".
//   The fetch is attempted once with a short timeout; ANY failure resolves to
//   the local fallback with no console noise (fetch is same-origin-safe via
//   API_BASE).
//
// TRUST MODEL (frontend boundary):
//   - Eligibility (approved/active/paid/within-period) is DECIDED BY THE
//     BACKEND and carried by status/startAt/endAt. The frontend only re-checks
//     placement + status + date window as a safety net and never promotes an
//     unapproved/expired item on its own.
//   - Remote payloads are defensively normalized (normalizeSlide) and dropped
//     when obviously invalid (non-object, missing id, unparseable dates,
//     unknown type).
//   - CTA is DATA/ACTION ONLY: internal public routes (allowlist) or external
//     https:// URLs. Never eval, never injected script handlers.
//
// PREMIUM ELIGIBILITY (recorded, not billed):
//   billing_mode free|paid is data only — no payment provider is integrated.
//   Admin approval -> status approved + active -> eligible for hero placement
//   -> auto-hidden after endAt. Rows live in the hero_slides table managed by
//   server/modules/marketing (Super Admin). See final task report.

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Slide data model (single renderer consumes this shape — never hard-code
  // rendering per slide). normalizeSlide() is the single adapter converting
  // any accepted remote payload into this canonical shape.
  //
  // {
  //   id, type: "platform" | "promotion" | "premium_ad",
  //   source,
  //   titleAr, titleEn,            // HTML allowed (<br>, <span class="g|b">)
  //   subtitleAr, subtitleEn,
  //   badgeAr, badgeEn,
  //   image, imagePosition,        // object-position crop hint
  //   overlayTitleAr, overlayTitleEn, locationAr, locationEn,
  //   ctaLabelAr, ctaLabelEn,
  //   ctaRoute,                    // internal public route (allowlisted)
  //   ctaUrl,                      // optional external https:// destination
  //   priority, placement: ["public_hero"],
  //   status: "approved", startAt, endAt, active
  // }
  // ---------------------------------------------------------------------------

  var PLACEMENT_HERO = "public_hero";

  // TEMPORARY demo assets: design-prototype-v4/assets/hero-slides/hero{1..4}.png
  // These banners contain BAKED Arabic text (full-bleed design), so they are NOT
  // clean image-only assets. They are used here cropped toward the photographic
  // side (imagePosition) to minimise baked-text duplication with the HTML text.
  // Permanent fix: replace with clean image-only exports (no baked text).
  var HERO_SLIDES_LOCAL = [
    {
      id: "platform-private-schools",
      type: "platform",
      source: "local-fallback",
      titleAr: 'مدارس أفضل<br><span class="g">لمستقبل أكثر</span> <span class="b">إشراقاً</span>',
      titleEn: 'Better schools<br>for a <span class="g">brighter</span> <span class="b">future</span>',
      subtitleAr: "اكتشف أفضل المدارس في اليمن، وقارن وتواصل بسهولة، وابنِ مستقبلاً أفضل لأبنائك.",
      subtitleEn: "Discover schools across Yemen, compare options, connect easily, and build a better future for your family.",
      badgeAr: "مدارس أهلية",
      badgeEn: "Private Schools",
      image: "assets/hero-slides/hero3.png",
      imagePosition: "72% center",
      overlayTitleAr: "بالتعليم<br>نصنع مستقبلاً أكثر إشراقاً لليمن",
      overlayTitleEn: "Through education<br>we build a brighter future",
      locationAr: "صنعاء القديمة",
      locationEn: "Old Sana'a",
      ctaLabelAr: null, // falls back to global "searchNow"
      ctaLabelEn: null,
      ctaRoute: "private",
      priority: 100,
      placement: [PLACEMENT_HERO],
      status: "approved",
      startAt: null,
      endAt: null,
      active: true
    },
    {
      id: "platform-teachers",
      type: "platform",
      source: "local-fallback",
      titleAr: 'مدرسون خصوصيون<br><span class="g">بخبرة</span> <span class="b">وثقة</span>',
      titleEn: 'Private tutors<br>with <span class="g">experience</span> you <span class="b">trust</span>',
      subtitleAr: "ابحث عن المدرس المناسب حسب التخصص والموقع والخبرة.",
      subtitleEn: "Find the right tutor by subject, location and experience.",
      badgeAr: "مدرسون خصوصيون",
      badgeEn: "Private Tutors",
      image: "assets/hero-slides/hero2.png",
      imagePosition: "70% center",
      overlayTitleAr: "تعلم بمرونة أكبر",
      overlayTitleEn: "Learn with more flexibility",
      locationAr: "جميع المحافظات",
      locationEn: "All governorates",
      ctaLabelAr: null,
      ctaLabelEn: null,
      ctaRoute: "teachers",
      priority: 90,
      placement: [PLACEMENT_HERO],
      status: "approved",
      startAt: null,
      endAt: null,
      active: true
    },
    {
      id: "platform-colleges",
      type: "platform",
      source: "local-fallback",
      titleAr: 'أفضل الكليات والمعاهد<br><span class="b">بين يديك</span>',
      titleEn: 'Top colleges & institutes<br><span class="b">at your fingertips</span>',
      subtitleAr: "ابحث، قارن، واختر المؤسسة التعليمية المناسبة لك بسهولة.",
      subtitleEn: "Search, compare and choose the right institution with ease.",
      badgeAr: "كليات ومعاهد",
      badgeEn: "Colleges & Institutes",
      image: "assets/hero-slides/hero1.png",
      imagePosition: "72% center",
      overlayTitleAr: "فرص تعليمية متعددة",
      overlayTitleEn: "Diverse learning opportunities",
      locationAr: "اليمن",
      locationEn: "Yemen",
      ctaLabelAr: null,
      ctaLabelEn: null,
      ctaRoute: "colleges",
      priority: 80,
      placement: [PLACEMENT_HERO],
      status: "approved",
      startAt: null,
      endAt: null,
      active: true
    },
    {
      id: "demo-premium-slot",
      type: "promotion",
      source: "local-demo",
      titleAr: 'عروض وإعلانات<br><span class="g">تعليمية</span> <span class="b">مميزة</span>',
      titleEn: 'Featured <span class="g">education</span> <span class="b">offers</span>',
      subtitleAr: "مساحة العروض المميزة — تظهر هنا الحملات المعتمدة ضمن فترتها المدفوعة.",
      subtitleEn: "Featured offers slot — approved campaigns appear here during their paid period.",
      badgeAr: "إعلان مميز",
      badgeEn: "Featured",
      image: "assets/hero-slides/hero4.png",
      imagePosition: "72% center",
      overlayTitleAr: "روّج لمؤسستك التعليمية باحتراف",
      overlayTitleEn: "Promote your institution professionally",
      locationAr: "منصة مدرستي",
      locationEn: "Madarasati platform",
      ctaLabelAr: null,
      ctaLabelEn: null,
      ctaRoute: "login",
      priority: 10,
      placement: [PLACEMENT_HERO],
      status: "approved",
      startAt: null,
      endAt: null,
      active: true
    }
  ];

  // ---------------------------------------------------------------------------
  // Promotion adapter — pure filter/sort, zero billing logic.
  // Remote campaigns must already carry settled business state from the backend
  // (package purchased, admin approved, paid/captured, within period).
  // ---------------------------------------------------------------------------

  // snake_case aliases accepted by the future backend wire contract.
  var SLIDE_ALIASES = {
    title_ar: "titleAr",
    title_en: "titleEn",
    subtitle_ar: "subtitleAr",
    subtitle_en: "subtitleEn",
    badge_ar: "badgeAr",
    badge_en: "badgeEn",
    image_position: "imagePosition",
    overlay_title_ar: "overlayTitleAr",
    overlay_title_en: "overlayTitleEn",
    location_ar: "locationAr",
    location_en: "locationEn",
    cta_label_ar: "ctaLabelAr",
    cta_label_en: "ctaLabelEn",
    cta_route: "ctaRoute",
    target_url: "ctaUrl",
    starts_at: "startAt",
    ends_at: "endAt"
  };

  function alias(key) { return SLIDE_ALIASES[key] || key; }

  // Resolve media stored as a backend path ("/uploads/...") against API_BASE.
  // Absolute/remote/data URLs and relative static assets are returned as-is.
  function mediaUrl(p) {
    if (!p) return "";
    p = String(p);
    if (/^(https?:)?\/\//.test(p) || p.indexOf("data:") === 0) return p;
    var base = (typeof API_BASE === "string") ? API_BASE : "";
    if (p.charAt(0) === "/") return base + p;
    return p;
  }

  // Single adapter converting an accepted remote payload into the canonical
  // slide shape. Returns null for obviously invalid payloads; those are dropped
  // by getEligibleHeroSlides(). Never asserts business approval — it only makes
  // the payload structurally safe to consume.
  function normalizeSlide(raw) {
    if (!raw || typeof raw !== "object") return null;
    var s = {};
    Object.keys(raw).forEach(function (k) {
      s[alias(k)] = raw[k];
    });
    var type = String(s.type || s.kind || "promotion").toLowerCase();
    if (type !== "platform" && type !== "promotion" && type !== "premium_ad") return null;
    var id = s.id != null ? String(s.id) : null;
    if (!id) return null;
    var starts = new Date(s.startAt == null ? 0 : s.startAt);
    var ends = new Date(s.endAt == null ? 0 : s.endAt);
    if (isNaN(starts.getTime()) || isNaN(ends.getTime())) return null;
    // Renderable content required: an image and at least one available title.
    // Items lacking these would render a blank hero slide.
    if (!s.image) return null;
    if (!s.titleAr && !s.titleEn) return null;
    var out = {
      id: id,
      type: type,
      source: s.source != null ? String(s.source) : "remote",
      titleAr: s.titleAr != null ? String(s.titleAr) : "",
      titleEn: s.titleEn != null ? String(s.titleEn) : "",
      subtitleAr: s.subtitleAr != null ? String(s.subtitleAr) : "",
      subtitleEn: s.subtitleEn != null ? String(s.subtitleEn) : "",
      badgeAr: s.badgeAr != null ? String(s.badgeAr) : "",
      badgeEn: s.badgeEn != null ? String(s.badgeEn) : "",
      image: s.image != null ? mediaUrl(s.image) : "",
      imagePosition: s.imagePosition != null ? String(s.imagePosition) : "center",
      overlayTitleAr: s.overlayTitleAr != null ? String(s.overlayTitleAr) : "",
      overlayTitleEn: s.overlayTitleEn != null ? String(s.overlayTitleEn) : "",
      locationAr: s.locationAr != null ? String(s.locationAr) : "",
      locationEn: s.locationEn != null ? String(s.locationEn) : "",
      ctaLabelAr: s.ctaLabelAr != null ? String(s.ctaLabelAr) : "",
      ctaLabelEn: s.ctaLabelEn != null ? String(s.ctaLabelEn) : "",
      ctaRoute: s.ctaRoute != null ? String(s.ctaRoute) : "",
      ctaUrl: s.ctaUrl != null ? String(s.ctaUrl) : "",
      priority: Number(s.priority) || 0,
      placement: s.placement != null ? s.placement : PLACEMENT_HERO,
      status: s.status != null ? String(s.status) : "approved",
      startAt: s.startAt != null ? s.startAt : null,
      endAt: s.endAt != null ? s.endAt : null,
      active: s.active !== false
    };
    return out;
  }

  // CTA is DATA/ACTION ONLY. Internal route must be a known public route.
  // External destination must be https:// (never let a payload hand us a JS URL
  // or raw attribute breakout).
  var SAFE_ROUTES = ["home", "private", "government", "colleges", "institutes", "teachers", "schools", "login"];
  function resolveCta(s) {
    var route = String(s && s.ctaRoute ? s.ctaRoute : "").trim();
    if (route && SAFE_ROUTES.indexOf(route) !== -1) return { kind: "route", value: route };
    var url = String(s && s.ctaUrl ? s.ctaUrl : "").trim();
    if (/^https:\/\//i.test(url) && !/["'<>]/.test(url)) return { kind: "url", value: url };
    return { kind: "route", value: "private" };
  }

  function isSlideEligible(s, now) {
    if (!s || typeof s !== "object") return false;
    if (s.active === false) return false;
    var st = String(s.status || "approved").toLowerCase();
    if (st !== "approved" && st !== "active") return false; // drops draft/pending/rejected/expired
    var placement = s.placement || s.placements || PLACEMENT_HERO;
    var list = Array.isArray(placement) ? placement : [placement];
    if (list.indexOf(PLACEMENT_HERO) === -1) return false;
    var t = now instanceof Date ? now.getTime() : Date.now();
    if (s.startAt) {
      var st2 = new Date(s.startAt).getTime();
      if (!isNaN(st2) && t < st2) return false;
    }
    if (s.endAt) {
      var et = new Date(s.endAt).getTime();
      if (!isNaN(et) && t > et) return false;
    }
    return true;
  }

  function byPriorityDesc(a, b) {
    return (Number(b.priority) || 0) - (Number(a.priority) || 0);
  }

  // Backend-managed slides are the canonical source. When any eligible remote
  // slide exists (platform / promotion / premium_ad) it drives the whole slider.
  // The permanent local platform set is used ONLY when no eligible remote slide
  // exists, so the landing never renders empty.
  function getEligibleHeroSlides(remoteSlides, now) {
    var fallback = HERO_SLIDES_LOCAL.filter(function (s) {
      return s.type === "platform" && isSlideEligible(s, now);
    }).sort(byPriorityDesc);
    if (!fallback.length) fallback = HERO_SLIDES_LOCAL.filter(function (s) {
      return s.type === "platform";
    });
    var remote = (Array.isArray(remoteSlides) ? remoteSlides : []).map(function (s) {
      return normalizeSlide(s);
    }).filter(function (s) {
      return s && isSlideEligible(s, now);
    }).sort(byPriorityDesc);
    if (!remote.length) return fallback;
    return remote;
  }

  // Best-effort fetch of future backend endpoint. Same-origin relative URL with
  // a short timeout; ANY failure resolves to null (fallback used, no console
  // errors, no failed-app-request noise for the user).
  function fetchRemoteHeroSlides(timeoutMs) {
    if (typeof fetch !== "function") return Promise.resolve(null);
    var ms = timeoutMs || 2500;
    var ctrl = null;
    var timer = null;
    try {
      if (typeof AbortController !== "undefined") {
        ctrl = new AbortController();
        timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, ms);
      }
    } catch (e) { ctrl = null; }
    var opts = { cache: "no-store" };
    if (ctrl) opts.signal = ctrl.signal;
    var base = (typeof API_BASE === "string") ? API_BASE : "";
    return fetch(base + "/api/hero-slides?placement=" + PLACEMENT_HERO, opts).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res || !res.ok) return null;
      return res.json().then(function (data) {
        if (!data) return null;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.slides)) return data.slides;
        if (Array.isArray(data.items)) return data.items;
        return null;
      }).catch(function () { return null; });
    }).catch(function () {
      if (timer) clearTimeout(timer);
      return null;
    });
  }

  // ---------------------------------------------------------------------------
  // Slider controller — fixed container, only inner content cross-fades.
  // Guarantees: one interval at most, destroyed on route change, no layout
  // shift (fixed min-heights live in CSS), no full-section sliding.
  // ---------------------------------------------------------------------------
  var AUTOPLAY_MS = 6000;
  var FADE_MS = 220;
  var state = {
    slides: [],
    index: 0,
    timer: null,
    paused: false,
    reduceMotion: false,
    touchX: null,
    mounted: false,
    documentBound: false
  };

  function $(id) { return document.getElementById(id); }

  function currentLang() {
    try {
      if (typeof lang !== "undefined" && (lang === "ar" || lang === "en")) return lang;
    } catch (e) {}
    var h = document.documentElement;
    return (h && h.getAttribute("lang") === "en") ? "en" : "ar";
  }

  function stopTimer() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }

  function startTimer() {
    stopTimer();
    if (state.reduceMotion) return;
    if (state.slides.length < 2) return;
    if (state.paused) return;
    state.timer = setInterval(function () {
      if (state.paused) return;
      if (!document.getElementById("heroSlideContent")) { destroy(); return; }
      show(state.index + 1);
    }, AUTOPLAY_MS);
  }

  function setFade(on) {
    var c = $("heroSlideContent");
    var p = $("heroSlidePhoto");
    if (c) c.classList.toggle("is-fading", !!on);
    if (p) p.classList.toggle("is-fading", !!on);
  }

  function paintDots() {
    var dots = $("heroDots");
    if (!dots) return;
    var btns = dots.querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) {
      var on = (i === state.index);
      btns[i].classList.toggle("active", on);
      btns[i].setAttribute("aria-selected", on ? "true" : "false");
    }
    var live = $("heroSlideLive");
    if (live) live.textContent = String(state.index + 1) + " / " + String(state.slides.length);
  }

  function slideText(s, ar) {
    return {
      badge: ar ? s.badgeAr : s.badgeEn,
      title: ar ? s.titleAr : s.titleEn,
      subtitle: ar ? s.subtitleAr : s.subtitleEn,
      overlay: ar ? s.overlayTitleAr : s.overlayTitleEn,
      location: ar ? s.locationAr : s.locationEn
    };
  }

    // Single renderer for ALL slide types (platform / promotion / premium_ad).
  function renderSlide(s) {
    var ar = currentLang() === "ar";
    var t = slideText(s, ar);
    var c = $("heroSlideContent");
    var photo = $("heroSlidePhoto");
    if (!c || !photo) return;
    var ctaLabel = (ar ? s.ctaLabelAr : s.ctaLabelEn) ||
      ((typeof tr === "function") ? tr("searchNow") : (ar ? "ابدأ البحث الآن" : "Start searching"));
    var createLabel = (typeof tr === "function") ? tr("createAccount") : (ar ? "إنشاء حساب" : "Create account");
    var badge = t.badge ? '<span class="eyebrow">' + t.badge + "</span>" : "";
    var promoFlag = (s.type === "premium_ad" || s.type === "promotion")
      ? '<span class="hero-promo-flag">' + (ar ? "مميز" : "Featured") + "</span>" : "";
    var resolved = resolveCta(s);
    var ctaAction = resolved.kind === "url"
      ? '<a class="btn green" href="' + resolved.value + '" target="_blank" rel="noopener">' + ctaLabel + " 🔍</a>"
      : '<button class="btn green" data-hero-cta="' + resolved.value + '">' + ctaLabel + " 🔍</button>";
    c.innerHTML =
      badge + promoFlag +
      "<h1>" + t.title + "</h1>" +
      "<p>" + t.subtitle + "</p>" +
      '<div class="hero-buttons">' +
        ctaAction +
        '<button class="btn" data-hero-cta="login">' + createLabel + " 👤</button>" +
      "</div>";
    var img = photo.querySelector("img");
    if (img) {
      img.src = s.image;
      img.alt = "";
      img.style.objectPosition = s.imagePosition || "center";
    }
    var ov = photo.querySelector(".quote");
    if (ov) ov.innerHTML = t.overlay;
    var pl = photo.querySelector(".place");
    if (pl) pl.textContent = "⌖ " + t.location;
    paintDots();
  }

  function show(n) {
    if (!state.slides.length) return;
    var next = ((n % state.slides.length) + state.slides.length) % state.slides.length;
    if (next === state.index && $("heroSlideContent") && $("heroSlideContent").innerHTML) {
      paintDots();
      return;
    }
    if (state.reduceMotion) {
      state.index = next;
      renderSlide(state.slides[state.index]);
      return;
    }
    setFade(true);
    setTimeout(function () {
      if (!document.getElementById("heroSlideContent")) return; // navigated away
      state.index = next;
      renderSlide(state.slides[state.index]);
      // Force reflow so the fade-in transition plays.
      var c = $("heroSlideContent");
      if (c) { void c.offsetWidth; }
      setFade(false);
    }, FADE_MS);
  }

  function goTo(i) {
    state.index = ((i % state.slides.length) + state.slides.length) % state.slides.length;
    renderSlide(state.slides[state.index]);
    startTimer(); // reset autoplay phase after manual navigation
  }

  function bindControls() {
    var hero = $("landingHero");
    if (!hero || hero._heroBound) return;
    hero._heroBound = true;
    // Pause on hover / focus (desktop), resume on leave.
    hero.addEventListener("mouseenter", function () { state.paused = true; stopTimer(); });
    hero.addEventListener("mouseleave", function () { state.paused = false; startTimer(); });
    hero.addEventListener("focusin", function () { state.paused = true; stopTimer(); });
    hero.addEventListener("focusout", function () { state.paused = false; startTimer(); });
    // Lightweight touch swipe (mobile).
    hero.addEventListener("touchstart", function (e) {
      try { state.touchX = e.touches[0].clientX; } catch (err) { state.touchX = null; }
    }, { passive: true });
    hero.addEventListener("touchend", function (e) {
      if (state.touchX == null) return;
      try {
        var dx = e.changedTouches[0].clientX - state.touchX;
        if (Math.abs(dx) > 40) show(state.index + (dx < 0 ? 1 : -1));
      } catch (err) {}
      state.touchX = null;
    }, { passive: true });
    // Dots + arrows + CTA via delegation (survives innerHTML re-renders).
    hero.addEventListener("click", function (e) {
      var t = e.target;
      while (t && t !== hero && !t.getAttribute) t = t.parentNode;
      if (!t || t === hero) return;
      var dot = t.getAttribute && t.getAttribute("data-hero-dot");
      if (dot != null && dot !== "") { goTo(parseInt(dot, 10) || 0); return; }
      var nav = t.getAttribute && t.getAttribute("data-hero-nav");
      if (nav === "prev") { show(state.index - 1); startTimer(); return; }
      if (nav === "next") { show(state.index + 1); startTimer(); return; }
      var cta = t.getAttribute && t.getAttribute("data-hero-cta");
      if (cta && typeof go === "function") { go(cta); }
    });
    // Document-level listener: registered ONCE per slider module lifetime.
    // Element-level listeners above are re-bound per mount (new element each
    // render); this one must not accumulate across home visits.
    if (!state.documentBound) {
      state.documentBound = true;
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stopTimer();
        else if (document.getElementById("heroSlideContent")) startTimer();
      });
    }
  }

  function buildDots() {
    var dots = $("heroDots");
    if (!dots) return;
    var html = "";
    for (var i = 0; i < state.slides.length; i++) {
      html += '<button type="button" role="tab" data-hero-dot="' + i + '" aria-label="slide ' + (i + 1) + '"></button>';
    }
    dots.innerHTML = html;
    paintDots();
  }

  function preload() {
    for (var i = 0; i < state.slides.length; i++) {
      try {
        var im = new Image();
        im.src = state.slides[i].image;
      } catch (e) {}
    }
  }

  // Called by app.js render() AFTER landing HTML is in the DOM.
  function mount(remoteSlides) {
    destroy();
    var hero = $("landingHero");
    if (!hero) return;
    try {
      state.reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { state.reduceMotion = false; }
    state.slides = getEligibleHeroSlides(remoteSlides, new Date());
    state.index = 0;
    state.paused = false;
    state.mounted = true;
    bindControls();
    buildDots();
    preload();
    renderSlide(state.slides[0]);
    startTimer();
    // Best-effort remote upgrade: when the backend returns eligible slides they
    // replace the local fallback, keeping the current index stable when possible.
    fetchRemoteHeroSlides().then(function (remote) {
      if (!remote || !remote.length) return;
      if (!document.getElementById("heroSlideContent")) return;
      var merged = getEligibleHeroSlides(remote, new Date());
      var hasRemote = merged.some(function (s) { return s.source !== "local-fallback"; });
      if (!hasRemote) return;
      var curId = state.slides[state.index] && state.slides[state.index].id;
      state.slides = merged;
      var keep = 0;
      for (var i = 0; i < merged.length; i++) { if (merged[i].id === curId) { keep = i; break; } }
      state.index = keep;
      buildDots();
      preload();
      renderSlide(state.slides[state.index]);
      startTimer();
    });
  }

  function destroy() {
    stopTimer();
    state.paused = false;
    state.mounted = false;
    state.touchX = null;
  }

  window.MadarasatiHero = {
    PLACEMENT_HERO: PLACEMENT_HERO,
    LOCAL_SLIDES: HERO_SLIDES_LOCAL,
    AUTOPLAY_MS: AUTOPLAY_MS,
    getEligibleHeroSlides: getEligibleHeroSlides,
    isSlideEligible: isSlideEligible,
    normalizeSlide: normalizeSlide,
    resolveCta: resolveCta,
    SAFE_ROUTES: SAFE_ROUTES,
    fetchRemoteHeroSlides: fetchRemoteHeroSlides,
    mount: mount,
    destroy: destroy,
    show: show,
    goTo: goTo,
    // Manual injection point for QA / future backend wiring:
    //   MadarasatiHero.setRemoteSlides([...])
    setRemoteSlides: function (slides) {
      state.slides = getEligibleHeroSlides(slides, new Date());
      state.index = 0;
      buildDots();
      if (state.slides.length) renderSlide(state.slides[0]);
      startTimer();
    }
  };
})();
