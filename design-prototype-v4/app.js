
let lang=localStorage.getItem("v4lang")||"ar";
let theme=localStorage.getItem("v4theme")||"light";

function icon(name,size=18){
 const p={
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>',
  school:'<path d="M4 21V10l8-4 8 4v11"/><path d="M2 21h20"/><path d="M8 12h1M15 12h1M8 16h1M15 16h1"/><path d="M10 21v-4h4v4"/>',
  institute:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  college:'<path d="m3 8 9-5 9 5-9 5-9-5Z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/><path d="M21 8v6"/>',
  teacher:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2"/><path d="M17 8h4M19 6v4"/>',
  users:'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21v-2a6 6 0 0 1 12 0v2"/><path d="M14 16a5 5 0 0 1 8 4v1"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H10v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V10h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3H14v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1A1.7 1.7 0 0 0 19.4 9c.2.4.4.7.7 1 .3.3.7.4 1.1.4h.1V14h-.1a1.7 1.7 0 0 0-1.1.4c-.3.2-.5.4-.7.6Z"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash:'<path d="M3 6h18"/><path d="M8 6V4h8v2M19 6l-1 15H6L5 6"/><path d="M10 11v5M14 11v5"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  shield:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  pin:'<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
   search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
   palette:'<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.1"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="15.5" cy="10" r="1.1"/><path d="M12 21c-1.2 0-1.7-.6-1.2-1.7.4-.9-.1-1.6-.9-2-.7-.4-1-1-1-1.8"/>',
   globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z"/>',
   tag:'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  whatsapp:'<path d="M21 11.6a8.5 8.5 0 0 1-12.5 7.5L3 20.6l1.6-5.4A8.5 8.5 0 1 1 21 11.6Z"/><path d="M8.9 8.5c.3-.6 1-.6 1.3 0l.6 1.3c.1.3.1.6-.2.8l-.4.5c-.2.2-.2.4-.1.6.5 1 1.3 1.8 2.3 2.3.2.1.5.1.6-.1l.5-.4c.2-.3.5-.3.8-.2l1.3.6c.6.3.6 1 0 1.3-3 1.6-7.4-2.8-6.7-6.7Z"/>',
  phone:'<path d="M6.6 3h2.9l1.4 4-2 1.4a12 12 0 0 0 6.7 6.7l1.4-2 4 1.4v2.9a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3Z"/>',
  download:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  printer:'<path d="M7 9V3h10v6"/><path d="M7 19H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
  file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  sheet:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10M15 10v10"/>',
  doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  building:'<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M15 9h3a2 2 0 0 1 2 2v10"/><path d="M2 21h20"/><path d="M8 7h3M8 11h3M8 15h3"/>',
   back:'<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
   share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.7 6.8-3.4M8.6 13.3l6.8 3.4"/>',
   pdf:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M8 14h2a1 1 0 0 1 0 2H8v-2Zm0 0v4"/>',
   book:'<path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2Z"/><path d="M8 7h6M8 11h6"/>',
   heart:'<path d="M12 20s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 5C19 15.5 12 20 12 20Z"/>',
   info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
   flask:'<path d="M9 3h6"/><path d="M10 3v6.2L5.2 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.8-2.9L14 9.2V3"/><path d="M7.6 15h8.8"/>',
   trophy:'<path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 5H4v1a3 3 0 0 0 3 3"/><path d="M17 5h3v1a3 3 0 0 1-3 3"/><path d="M12 13v4"/><path d="M9 21h6"/><path d="M10 17h4"/>',
   med:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
   snow:'<path d="M12 3v18"/><path d="m4.5 7.5 15 9"/><path d="m19.5 7.5-15 9"/><path d="m9 5 3 3 3-3"/><path d="m9 19 3-3 3 3"/>',
   wifi:'<path d="M4.5 11.5a11 11 0 0 1 15 0"/><path d="M8 15a6 6 0 0 1 8 0"/><circle cx="12" cy="18.5" r="1"/>',
   access:'<circle cx="12" cy="5" r="2"/><path d="M12 7v6M12 13l-3 6M12 13l3 6M6 10h12"/>',
   utensils:'<path d="M5 3v7a2 2 0 0 0 4 0V3"/><path d="M7 10v11"/><path d="M17 3c-1.4 0-2.5 1.6-2.5 4.5S15.6 12 17 12v9"/>',
   parking:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M10 16V8h2.6a2.5 2.5 0 0 1 0 5H10"/>',
   bus:'<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M4 10h16"/><path d="M7 16v2M17 16v2"/><circle cx="8" cy="18" r="1"/><circle cx="16" cy="18" r="1"/>',
   shirt:'<path d="M16 3 20 5l-1.4 5-2 .5V21H7.4V10.5l-2-.5L4 5l4-2 4 2 4-2Z"/>',
   ticket:'<path d="M4 9a2 2 0 0 1 0 4v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-4V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z"/><path d="M14 6v12"/>',
   sparkle:'<path d="M12 3.5 13.7 9l5.3 1.7L13.7 12.5 12 18l-1.7-5.5L5 10.7 10.3 9Z"/>',
   blocks:'<rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/><rect x="8.5" y="4" width="7" height="7" rx="1"/>'
   }[name]||'';
 return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

/* ---------- shared organization presentation helpers ---------- */

// Falls back to the generated placeholder when an organization has no logo, so
// a card never renders a broken image.
function orgLogo(o){
 if(o&&o.image)return o.image;
 // One resolver for every view: dashboard card, table, landing card and detail
 // all resolve an organization's logo the same way, by its id.
 try{if(typeof MadrasatiMedia!=="undefined")return MadrasatiMedia.orgMedia(o).logo;}catch(e){}
 return "assets/reference/institutions/private-school/logo.svg";
}

// wa.me accepts only a full international number in bare digits, so
// "+967 733 101 001" and "+967-733-101-001" must collapse to the same chat.
// A locally stored number written as "0733..." is lifted to +967 so it still
// opens a chat instead of silently failing.
function waNumber(phone){
 var digits=String(phone||"").replace(/\D/g,"");
 if(!digits)return "";
 if(digits.indexOf("00")===0)digits=digits.slice(2);
 if(digits.charAt(0)==="0")digits="967"+digits.slice(1);
 return digits;
}
function waLink(phone){var n=waNumber(phone);return n?"https://wa.me/"+n:""}
function telLink(phone){var d=String(phone||"").replace(/[^\d+]/g,"");return d?"tel:"+d:""}

function waButton(phone,opts){
 var href=waLink(phone);if(!href)return "";
 var o=opts||{};var label=o.label||tr("whatsapp");
 return '<a class="wa-btn'+(o.compact?" compact":"")+'" href="'+href+'" target="_blank" rel="noopener noreferrer" title="'+esc(label)+'">'+
  icon("whatsapp",o.size||15)+'<span>'+esc(label)+'</span></a>';
}

// The API returns status tokens in English snake_case. Badges render them inside
// an otherwise Arabic UI, so known tokens are translated and anything unknown
// falls through as-is rather than being hidden.
var STATUS_LABELS={
 active:"فعّال",inactive:"غير فعّال",verified:"موثّق",unverified:"غير موثّق",deletion_requested:"قيد طلب الحذف",
 pending:"قيد المراجعة",under_review:"قيد المراجعة",approved:"معتمد",
 rejected:"مرفوض",changes_requested:"تعديلات مطلوبة",suspended:"موقوف",
 deleted:"محذوف",cancelled:"ملغي",accepted:"مقبول",completed:"مكتمل",
 confirmed:"مؤكد",open:"التسجيل مفتوح",closed:"التسجيل مغلق"
};
function statusLabel(v){
 if(lang!=="ar")return v||"—";
 return STATUS_LABELS[v]||v||"—";
}



const i18n={
 ar:{
  home:"الرئيسية", landingHome:"الصفحة الرئيسية", privateSchools:"المدارس الخاصة", governmentSchools:"المدارس الحكومية",
  colleges:"الكليات", institutes:"المعاهد", privateTeachers:"المدرسين الخصوصيين",
  schools:"إدارة المؤسسات الدراسية", teachers:"المعلمون", students:"العملاء", bookings:"الحجوزات", verify:"التحقق والمراجعة",
  clientDashboardTitle:"لوحة العميل", clientDetails:"بياناتي واهتماماتي", clientRegisteredLocation:"الموقع المسجل: ",
  clientKind:"صفتي", clientContact:"طريقة التواصل المفضلة", clientInterests:"اهتماماتي", clientPlaces:"المناطق التي أهتم بها",
  clientConsent:"أوافق على تسجيل الأقسام التي أزورها وعمليات بحثي لتحسين الخدمة. تعرض الإدارة نشاط آخر 90 يوماً، وإلغاء الموافقة يمحو سجل نشاطي.",
  clientSave:"حفظ بياناتي", clientFeedbackTitle:"اقتراح أو شكوى أو استفسار", clientFeedbackType:"النوع", clientFeedbackMessage:"الرسالة",
  clientFeedbackSend:"إرسال", clientPreviousFeedback:"طلباتي السابقة", clientNoFeedback:"لا توجد طلبات بعد.",
  clientUnspecified:"غير محدد", clientVisitor:"زائر مسجل", clientStudent:"طالب", clientParent:"ولي أمر", clientBoth:"طالب وولي أمر", clientOther:"أخرى",
  clientNoPreference:"لا تفضيل", clientPhone:"هاتف", clientEmail:"بريد إلكتروني", clientWhatsapp:"واتساب",
  clientSuggestion:"اقتراح", clientComplaint:"شكوى", clientInquiry:"استفسار", clientOpen:"مفتوح", clientInProgress:"قيد المعالجة", clientClosed:"مغلق",
  clientSaved:"حُفظت البيانات.", clientReceived:"وصل طلبك.", clientFeedbackMin:"اكتب 10 أحرف على الأقل.", clientLoadError:"تعذر تحميل البيانات.",
  academic:"البيانات الأكاديمية", stages:"المراحل", grades:"الصفوف", subjects:"المواد", curricula:"المناهج",
  teachingLanguages:"لغات التدريس", teachingMethods:"طرق التدريس",
  locations:"المناطق", countries:"الدول", governorates:"المحافظات", districts:"المديريات", neighborhoods:"الأحياء",
  locationRequests:"طلبات إضافة المواقع", offers:"العروض", ads:"الإعلانات", slides:"شرائح الواجهة",
  institutions:"المؤسسات التعليمية", institutesAdmin:"إدارة المعاهد", collegesAdmin:"إدارة الكليات",
  reports:"التقارير والتحليلات", usersAccess:"المستخدمون والصلاحيات", users:"المستخدمون", roles:"الأدوار",
  permissions:"الصلاحيات", orgPermissions:"صلاحيات المؤسسات", teacherPermissions:"صلاحيات المدرسين",
  pageAccess:"صلاحيات الأقسام والصفحات", settings:"الإعدادات",
  search:"ابحث عن مدرسة أو معلم أو طالب ...", superAdmin:"مدير النظام",
  language:"اللغة", theme:"المظهر", genericNote:"نفس التمبليت المعتمد، ويختلف محتوى القسم فقط.",
  sampleContent:"محتوى تجريبي للعرض فقط.",
  login:"تسجيل الدخول", createAccount:"إنشاء حساب", searchNow:"ابدأ البحث الآن", featuredSchools:"مدارس مميزة",
  allStages:"كل المراحل", allSchoolTypes:"كل أنواع المدارس", allGovernorates:"كل المحافظات", searchBtn:"بحث",
  settingsGeneral:"عام", settingsAppearance:"المظهر والثيمات", settingsBackup:"النسخ الاحتياطي",
  settingsSecurity:"الأمان", settingsIntegrations:"التكاملات", settingsMaintenance:"الصيانة والإصلاحات",
  settingsNotifications:"الإشعارات", settingsSystem:"النظام", settingsData:"البيانات",
  accessOverview:"إدارة الوصول", accessMatrix:"مصفوفة الصلاحيات", accessOverrides:"استثناءات المستخدمين",
  publicSections:"الأقسام والصفحات", save:"حفظ التغييرات",
  cancel:"إلغاء", applyTheme:"تطبيق الثيم", preview:"معاينة", customTheme:"ثيم مخصص",
  primaryColor:"اللون الأساسي", accentColor:"اللون التمييزي", currentTheme:"الثيم الحالي",
  homeBrand:"مدرستي", menu:"القائمة", close:"إغلاق",
  governorate:"المحافظة", district:"المديرية", neighborhood:"الحي",
  allDistricts:"كل المديريات", allNeighborhoods:"كل الأحياء",
   searchOrg:"ابحث عن مدرسة بالاسم أو الحي ...", searchTeacher:"ابحث عن مدرس بالاسم ...",
   searchModelTitle:"نموذج البحث - مع نوع المؤسسة", keywordLabel:"كلمة البحث",
   keywordPlaceholder:"ابحث بالاسم أو التخصص ...",
   orgType:"نوع الجهة", allOrgTypes:"كل الأنواع",
   apply:"تطبيق", reset:"إعادة تعيين",
  listView:"عرض القائمة", mapView:"عرض الخريطة",
  viewOnMap:"عرض على الخريطة", verified:"موثق", viewDetails:"عرض التفاصيل",
  noResults:"لا توجد نتائج", noTeachers:"لا يوجد مدرسون بعد",
  mapNote:"نقطة تكامل خرائط جوجل — مطلوب مفتاح API للعرض المباشر",
  noOptions:"لا توجد خيارات", noGovernorates:"لا توجد محافظات متاحة",
  results:"نتيجة", perHour:" ساعة", yrsExp:" سنة خبرة",
  locationPlaceholder:"الموقع غير محدد",
   privateSub:"استكشف وقارن المدارس الخاصة المتاحة",
   // --- Registration / ownership / documents (Phase B) ---
   registerTitle:"إنشاء حساب جديد", registerSub:"اختر نوع الحساب المناسب لك",
   regNormal:"مستخدم عادي", regNormalDesc:"طالب، ولي أمر، أو باحث عن خدمات تعليمية — تفعيل فوري",
   regOwner:"مالك / ممثل مؤسسة", regOwnerDesc:"تسجيل مؤسسة تعليمية وإدارتها بعد مراجعة الإدارة",
   fullName:"الاسم الكامل", country:"الدولة", countryCode:"رمز الاتصال", phoneNumber:"رقم الهاتف",
   email:"البريد الإلكتروني", password:"كلمة المرور", confirmPassword:"تأكيد كلمة المرور",
   emailAvailable:"✓ البريد متاح", emailTaken:"⚠ هذا البريد الإلكتروني مستخدم بالفعل.",
   phoneAvailable:"✓ الرقم متاح", phoneTaken:"⚠ هذا الرقم مسجل بالفعل.",
   checking:"جارٍ التحقق...", createAccountBtn:"إنشاء الحساب", alreadyHaveAccount:"لديك حساب؟ سجل الدخول",
   noAccountYet:"ليس لديك حساب؟ أنشئ حساباً", mustAcceptName:"الاسم مطلوب (حرفان على الأقل)",
   mustAcceptPassword:"كلمة المرور: 8 أحرف على الأقل، حرف كبير (A-Z)، ورمز خاص (!، @، #)", passwordMismatch:"كلمتا المرور غير متطابقتين",
   invalidEmail:"يرجى إدخال بريد إلكتروني صحيح", invalidPhone:"رقم الهاتف غير صالح للدولة المحددة", selectCountry:"اختر الدولة",
   authRegisterLead:"أنشئ حسابك للوصول إلى خدمات مدرستي", authWelcomeBack:"مرحباً بعودتك من جديد",
   authTagline:"تعليم أفضل يبدأ من هنا", authSub:"منصة مدرستي تربط الطلاب وأولياء الأمور بأفضل المدارس والمعلمين في اليمن",
   authPoint1:"مدارس ومراكز موثقة", authPoint2:"معلمون مختارون بعناية", authPoint3:"حجز وخدمات تعليمية متكاملة",
   authStepAccount:"الحساب", authStepLocation:"الموقع", authStepInstitution:"المؤسسة",
   authStepContinue:"متابعة", authStepBack:"رجوع", authRegisterProgress:"مراحل إنشاء الحساب",
   authPwStrength:"متطلبات كلمة المرور", authPwLen:"8 أحرف على الأقل", authPwUpper:"حرف كبير (A-Z)", authPwSymbol:"رمز خاص (!، @، #)",
   authOrgNameRequired:"اسم المؤسسة مطلوب (حرفان على الأقل)",
   mustAcceptTerms:"يجب الموافقة على الشروط وسياسة الخصوصية للمتابعة",
   authTermsAgree1:"أوافق على ", authTermsAnd:" و", authTermsOf:" لخدمات مدرستي",
   termsLabel:"الشروط والأحكام", privacyLabel:"سياسة الخصوصية",
   authLocIntro:"أخبرنا عن منطقتك لتفعيل الخدمات القريبة",
   authLocNoteYE:"بيانات المحافظات والمديريات متاحة حالياً لليمن فقط",
   authLocNoteOther:"اختر دولتك لإظهار خيارات الموقع. يمكنك أيضاً المتابعة مباشرة.",
   localSchoolPlaceholder:"مثال: الاسم الكامل", emailPlaceholder:"you@example.com",
   loginLead:"ادخل بياناتك للوصول إلى حسابك", loginCta:"تسجيل الدخول", loginEmail:"البريد الإلكتروني", loginPassword:"كلمة المرور",
   forgotPassword:"نسيت كلمة المرور؟", forgotMsg:"استعادة كلمة المرور ستتوفر قريباً — تواصل مع إدارة المنصة.",
   noAccountQuestion:"ليس لديك حساب؟", createNow:"أنشئ حساباً", backHome:"العودة للرئيسية",
   showPassword:"إظهار كلمة المرور", hidePassword:"إخفاء كلمة المرور",
   mobileAuthTagline:"منصة تعليمية يمنية متكاملة",
   institutionSection:"بيانات المؤسسة", institutionName:"اسم المؤسسة", institutionDesc:"نبذة عن المؤسسة",
   institutionAddress:"العنوان", institutionPhone:"هاتف المؤسسة", institutionEmail:"بريد المؤسسة",
   ownershipSection:"معلومات الملكية / التفويض", ownershipProof:"مستند الملكية أو خطاب التفويض (مرجع)",
   ownershipProofHint:"اذكر رقم الترخيص أو جهة التفويض — تُرفع الملفات من لوحة المالك بعد الإنشاء",
   submitOwnerRequest:"إنشاء الحساب وإرسال الطلب", accountCreated:"تم إنشاء الحساب بنجاح",
   requestSubmitted:"تم إرسال طلب إدارة المؤسسة — بانتظار مراجعة الإدارة",
   requestSubmitFailed:"تم إنشاء الحساب لكن تعذر إرسال الطلب — أعد المحاولة من لوحة المالك",
   myDashboard:"لوحتي", myInstitutions:"مؤسساتي", myRequests:"طلباتي", myDocuments:"المستندات", myAdvertisements:"إعلاناتي",
   reqStatus:"الحالة", statusPending:"بانتظار المراجعة", statusUnderReview:"قيد المراجعة",
   statusApproved:"معتمد", statusRejected:"مرفوض", statusChangesRequested:"يتطلب تعديلات",
   noInstitutions:"لا توجد مؤسسات مرتبطة بعد", noRequests:"لا توجد طلبات بعد",
   uploadDoc:"رفع مستند", docType:"نوع المستند", docFile:"الملف",
   docLicense:"ترخيص", docOwnership:"مستند ملكية", docAuthorization:"خطاب تفويض",
   docRegistration:"سجل تجاري / شهادة تسجيل", docAccreditation:"اعتماد", docOther:"أخرى",
   docPending:"بانتظار المراجعة", docVerified:"معتمد", docRejected:"مرفوض",
   downloadDoc:"تنزيل", deleteDoc:"حذف", noDocuments:"لا توجد مستندات بعد",
   fileTooBig:"الملف يتجاوز 10MB", badFileType:"نوع الملف غير مدعوم (PDF/JPG/PNG/WEBP)",
   verifyQueue:"المراجعة والاعتماد", ownerRequests:"طلبات المؤسسات", locationRequestsTab:"طلبات المواقع",
   documentsTab:"المستندات", applicantInfo:"بيانات المتقدم", institutionInfo:"بيانات المؤسسة",
   reviewNotesLabel:"ملاحظات المراجعة", approveBtn:"اعتماد", rejectBtn:"رفض", changesBtn:"طلب تعديلات",
   confirmApprove:"سيتم إنشاء المؤسسة ومنح صلاحية الإدارة. متابعة؟",
   locAddTitle:"إضافة موقع جديد", locKind:"النوع", locNameAr:"الاسم بالعربية", locNameEn:"الاسم بالإنجليزية",
   locCode:"الرمز (اختياري)", locNotes:"ملاحظات", locSubmit:"إضافة", locRequestSubmit:"إرسال طلب إضافة",
   locRequestSent:"تم إرسال طلب الموقع للمراجعة", locAdded:"تمت إضافة الموقع",
   locIsoCode:"رمز الدولة (ISO)", locCallingCode:"مفتاح الاتصال الدولي", sortOrderLabel:"الترتيب",
   reqBy:"بواسطة", reqAt:"بتاريخ", noLocationRows:"لا توجد بيانات بعد",
   ownerDashboardNeedLogin:"سجل الدخول للوصول إلى لوحة المالك",
   reLoginAfterApproval:"تم اعتماد طلبك — سجل الخروج والدخول مجدداً لتفعيل صلاحيات المالك",
  governmentSub:"استكشف المدارس الحكومية",
  collegesSub:"استكشف الكليات",
  institutesSub:"استكشف المعاهد",
  teachersSub:"ابحث عن مدرس خصوصي مناسب",
  whatsapp:"واتساب", call:"اتصال", viewCards:"كروت", viewTable:"جدول",
  sharedCore:"المعلومات المشتركة", institutionDetail:"تفاصيل المؤسسة",
  backToInstitutions:"رجوع إلى المؤسسات", identityLabel:"الهوية والنبذة",
  contactInfo:"بيانات الاتصال", ownerLabel:"المالك", principalLabel:"مدير المؤسسة",
  exactLocation:"الموقع الجغرافي", accreditation:"حالة الاعتماد",
  facilitiesLabel:"المرافق", servicesLabel:"الخدمات", openMap:"فتح الخريطة",
  noFacilities:"لا توجد مرافق مسجلة", noServices:"لا توجد خدمات مسجلة",
  seatsLabel:"المقاعد المتاحة", locationUnavailable:"الموقع غير محدد",
  stageFeesLabel:"المراحل والرسوم", orgSubjectsLabel:"المواد الدراسية للمؤسسة",
  addStageLabel:"إضافة مرحلة للمدرسة", editLabel:"تعديل", feeLabel:"الرسوم", currencyLabel:"العملة",
  frequencyLabel:"دورية السداد", capacityLabel:"السعة", remainingSeatsLabel:"المقاعد المتبقية",
  deliveryLabel:"طريقة التدريس", languageLabel:"لغة التدريس", yearly:"سنوي", termly:"فصلي", monthly:"شهري",
  onSite:"حضوري", onlineDelivery:"عن بُعد", hybridDelivery:"مدمج",
  noOfferingStages:"لم تُحدَّد مراحل لهذه المؤسسة بعد", noOfferingSubjects:"لا توجد مواد خاصة بهذه المؤسسة",
  seatsAvailableBadge:"متوفر مقاعد (فاضي)", seatsFullBadge:"مكتمل السعة (مليان)", seatsUndeclared:"السعة غير معلنة",
  addOwnSubject:"إضافة مادة خاصة بالمؤسسة", subjectNameLabel:"اسم المادة", subjectScopeOwn:"مادة خاصة بالمؤسسة",
  reviewPending:"بانتظار مراجعة الإدارة", reviewApproved:"معتمدة", reviewRejected:"مرفوضة",
  reviewLabel:"حالة المراجعة", approveLabel:"اعتماد", rejectLabel:"رفض",
  gradesCountLabel:"عدد الصفوف", gradeNamesLabel:"أسماء الصفوف", nameEnLabel:"الاسم بالإنجليزية",
  descriptionLabel:"الوصف", stageCodeLabel:"الرمز",
  printReport:"طباعة", exportReport:"تصدير", exportXlsx:"Excel (.xlsx)", exportDocx:"Word (.docx)", exportPdf:"PDF",
  reportTitle:"تقرير مؤسسة", reportIssued:"تاريخ الإصدار", reportPlatform:"منصة مدرستي",
  pricingGated:"سجّل الدخول لعرض الرسوم والتسجيل",
  seatsOf:"مقعداً",
  printHint:"اختر «حفظ كملف PDF» من نافذة الطباعة للحصول على نسخة PDF.",
   typeLabel:"النوع", phoneLabel:"الهاتف", websiteLabel:"الموقع الإلكتروني", curriculumLabel:"المنهج",
   aboutInstitution:"نبذة عن المؤسسة", generalInfo:"معلومات عامة", academicPrograms:"البرامج الأكاديمية",
   facilitiesServices:"المرافق والخدمات", profileActions:"إجراءات", share:"مشاركة", noDescription:"لا يوجد وصف بعد",
   programDetails:"تفاصيل البرنامج", stageRangeLabel:"الصفوف", studentsLabel:"طالب وتلميذ", teachersLabel:"معلم",
   classroomsLabel:"فصل", stagesCountLabel:"مراحل", stageLabel:"المرحلة", seatsRemainingShort:"مقعد متبقٍ",
   galleryLabel:"معرض الصور", institutionName:"اسم المؤسسة", viewAll:"عرض الكل"
  },
 en:{
  home:"Home", landingHome:"Home", privateSchools:"Private Schools", governmentSchools:"Government Schools",
  colleges:"Colleges", institutes:"Institutes", privateTeachers:"Private Teachers",
  schools:"Institutions Management", teachers:"Teachers", students:"Clients", bookings:"Bookings", verify:"Verification & Review",
  clientDashboardTitle:"Client dashboard", clientDetails:"My details and interests", clientRegisteredLocation:"Registered location: ",
  clientKind:"My classification", clientContact:"Preferred contact", clientInterests:"Interests", clientPlaces:"Locations of interest",
  clientConsent:"I agree to record visited sections and searches to improve the service. Admins see the last 90 days; revoking consent erases my activity history.",
  clientSave:"Save my details", clientFeedbackTitle:"Suggestion, complaint or inquiry", clientFeedbackType:"Type", clientFeedbackMessage:"Message",
  clientFeedbackSend:"Send", clientPreviousFeedback:"Previous submissions", clientNoFeedback:"No submissions yet.",
  clientUnspecified:"Unspecified", clientVisitor:"Registered visitor", clientStudent:"Student", clientParent:"Parent", clientBoth:"Student and parent", clientOther:"Other",
  clientNoPreference:"No preference", clientPhone:"Phone", clientEmail:"Email", clientWhatsapp:"WhatsApp",
  clientSuggestion:"Suggestion", clientComplaint:"Complaint", clientInquiry:"Inquiry", clientOpen:"Open", clientInProgress:"In progress", clientClosed:"Closed",
  clientSaved:"Saved.", clientReceived:"Your submission was received.", clientFeedbackMin:"Write at least 10 characters.", clientLoadError:"Unable to load data.",
  academic:"Academic Data", stages:"Stages", grades:"Grades", subjects:"Subjects", curricula:"Curricula",
  teachingLanguages:"Teaching Languages", teachingMethods:"Teaching Methods",
  locations:"Locations", countries:"Countries", governorates:"Governorates", districts:"Districts", neighborhoods:"Neighborhoods",
  locationRequests:"Location Requests", offers:"Offers", ads:"Advertisements", slides:"Landing Slides",
  institutions:"Educational Institutions", institutesAdmin:"Institute Management", collegesAdmin:"College Management",
  reports:"Reports & Analytics", usersAccess:"Users & Permissions", users:"Users", roles:"Roles",
  permissions:"Permissions", orgPermissions:"Organization Permissions", teacherPermissions:"Teacher Permissions",
  pageAccess:"Section & Page Access", settings:"Settings",
  search:"Search for a school, teacher or student ...", superAdmin:"Super Admin",
  language:"Language", theme:"Theme", genericNote:"The approved template stays unchanged; only section content changes.",
  sampleContent:"Demo content for visual preview only.",
  login:"Sign in", createAccount:"Create account", searchNow:"Start searching", featuredSchools:"Featured schools",
  allStages:"All stages", allSchoolTypes:"All school types", allGovernorates:"All governorates", searchBtn:"Search",
  settingsGeneral:"General", settingsAppearance:"Appearance & Themes", settingsBackup:"Backup",
  settingsSecurity:"Security", settingsIntegrations:"Integrations", settingsMaintenance:"Maintenance & Repairs",
  settingsNotifications:"Notifications", settingsSystem:"System", settingsData:"Data",
  accessOverview:"Access Management", accessMatrix:"Permission Matrix", accessOverrides:"User Overrides",
  publicSections:"Sections & Pages", save:"Save changes",
  cancel:"Cancel", applyTheme:"Apply theme", preview:"Preview", customTheme:"Custom theme",
  primaryColor:"Primary color", accentColor:"Accent color", currentTheme:"Current theme",
  homeBrand:"Madarasati", menu:"Menu", close:"Close",
  governorate:"Governorate", district:"District", neighborhood:"Neighborhood",
  allDistricts:"All districts", allNeighborhoods:"All neighborhoods",
   searchOrg:"Search by school name or neighborhood ...", searchTeacher:"Search teachers by name ...",
   searchModelTitle:"Search form - with institution type", keywordLabel:"Keyword",
   keywordPlaceholder:"Search by name or specialization ...",
   orgType:"Institution type", allOrgTypes:"All types",
   apply:"Apply", reset:"Reset",
  listView:"List view", mapView:"Map view",
  viewOnMap:"View on map", verified:"Verified", viewDetails:"View details",
  noResults:"No results found", noTeachers:"No teachers found yet",
  mapNote:"Google Maps integration point — an API key is required to embed live maps",
  noOptions:"No options", noGovernorates:"No governorates available",
  results:"Results", perHour:" /hr", yrsExp:"yrs exp",
  locationPlaceholder:"Location not specified",
   privateSub:"Explore and compare available private schools",
   // --- Registration / ownership / documents (Phase B) ---
   registerTitle:"Create a new account", registerSub:"Choose the right account type",
   regNormal:"Normal user", regNormalDesc:"Student, parent, or education seeker — instant activation",
   regOwner:"Institution owner / representative", regOwnerDesc:"Register an institution; manage after admin review",
   fullName:"Full name", country:"Country", countryCode:"Calling code", phoneNumber:"Phone number",
   email:"Email", password:"Password", confirmPassword:"Confirm password",
   emailAvailable:"✓ Email available", emailTaken:"⚠ This email is already registered.",
   phoneAvailable:"✓ Number available", phoneTaken:"⚠ This number is already registered.",
checking:"Checking...", createAccountBtn:"Create account", alreadyHaveAccount:"Have an account? Sign in",
    noAccountYet:"No account yet? Create one", mustAcceptName:"Name required (2+ characters)",
    mustAcceptPassword:"Password must be 8+ chars with a capital letter (A-Z) and a symbol (!, @, #)", passwordMismatch:"Passwords do not match",
    invalidEmail:"Please enter a valid email address", invalidPhone:"Invalid phone for the selected country", selectCountry:"Select country",
    authRegisterLead:"Create your account to access Madarasati services", authWelcomeBack:"Welcome back",
    authTagline:"Better education starts here", authSub:"Madarasati connects students and parents with the best trusted schools and teachers in Yemen",
    authPoint1:"Verified schools & centers", authPoint2:"Carefully selected teachers", authPoint3:"Integrated booking & services",
    authStepAccount:"Account", authStepLocation:"Location", authStepInstitution:"Institution",
    authStepContinue:"Continue", authStepBack:"Back", authRegisterProgress:"Registration steps",
    authPwStrength:"Password requirements", authPwLen:"At least 8 characters", authPwUpper:"One capital letter (A-Z)", authPwSymbol:"One symbol (!, @, #)",
    authOrgNameRequired:"Institution name is required (2+ characters)",
    mustAcceptTerms:"You must accept the Terms & Privacy Policy to continue",
    authTermsAgree1:"I agree to the ", authTermsAnd:" and", authTermsOf:" of Madarasati services",
    termsLabel:"Terms & Conditions", privacyLabel:"Privacy Policy",
    authLocIntro:"Tell us your area to enable nearby services",
    authLocNoteYE:"Governorate & district data is currently available for Yemen only",
    authLocNoteOther:"Select your country to show location options. You may also continue directly.",
    localSchoolPlaceholder:"e.g. Full name", emailPlaceholder:"you@example.com",
    loginLead:"Enter your details to access your account", loginCta:"Sign In", loginEmail:"Email", loginPassword:"Password",
    forgotPassword:"Forgot password?", forgotMsg:"Password recovery will be available soon — please contact the platform admin.",
    noAccountQuestion:"No account yet?", createNow:"Create account", backHome:"Back to home",
    showPassword:"Show password", hidePassword:"Hide password",
    mobileAuthTagline:"A complete Yemeni education platform",
   institutionSection:"Institution details", institutionName:"Institution name", institutionDesc:"About",
   institutionAddress:"Address", institutionPhone:"Institution phone", institutionEmail:"Institution email",
   ownershipSection:"Ownership / authorization info", ownershipProof:"Ownership proof or authorization ref",
   ownershipProofHint:"State license number or authorizing body — files upload later from owner dashboard",
   submitOwnerRequest:"Create account & submit request", accountCreated:"Account created successfully",
   requestSubmitted:"Institution request submitted — pending admin review",
   requestSubmitFailed:"Account created but request failed — retry from owner dashboard",
   myDashboard:"My dashboard", myInstitutions:"My institutions", myRequests:"My requests", myDocuments:"Documents", myAdvertisements:"My advertisements",
   reqStatus:"Status", statusPending:"Pending review", statusUnderReview:"Under review",
   statusApproved:"Approved", statusRejected:"Rejected", statusChangesRequested:"Changes requested",
   noInstitutions:"No institutions linked yet", noRequests:"No requests yet",
   uploadDoc:"Upload document", docType:"Document type", docFile:"File",
   docLicense:"License", docOwnership:"Ownership deed", docAuthorization:"Authorization letter",
   docRegistration:"Registration certificate", docAccreditation:"Accreditation", docOther:"Other",
   docPending:"Pending review", docVerified:"Verified", docRejected:"Rejected",
   downloadDoc:"Download", deleteDoc:"Delete", noDocuments:"No documents yet",
   fileTooBig:"File exceeds 10MB", badFileType:"Unsupported type (PDF/JPG/PNG/WEBP)",
   verifyQueue:"Review & approval", ownerRequests:"Institution requests", locationRequestsTab:"Location requests",
   documentsTab:"Documents", applicantInfo:"Applicant", institutionInfo:"Institution",
   reviewNotesLabel:"Review notes", approveBtn:"Approve", rejectBtn:"Reject", changesBtn:"Request changes",
   confirmApprove:"This will create the institution and grant management. Continue?",
   locAddTitle:"Add new location", locKind:"Kind", locNameAr:"Arabic name", locNameEn:"English name",
   locCode:"Code (optional)", locNotes:"Notes", locSubmit:"Add", locRequestSubmit:"Submit add request",
   locRequestSent:"Location request sent for review", locAdded:"Location added",
   locIsoCode:"Country code (ISO)", locCallingCode:"International calling code", sortOrderLabel:"Order",
   reqBy:"By", reqAt:"On", noLocationRows:"No data yet",
   ownerDashboardNeedLogin:"Sign in to access the owner dashboard",
   reLoginAfterApproval:"Your request was approved — sign out and back in to activate owner permissions",
  governmentSub:"Explore government schools",
  collegesSub:"Explore colleges",
  institutesSub:"Explore institutes",
  teachersSub:"Find a suitable private tutor",
  whatsapp:"WhatsApp", call:"Call", viewCards:"Cards", viewTable:"Table",
  sharedCore:"Shared information", institutionDetail:"Institution details",
  backToInstitutions:"Back to institutions", identityLabel:"Identity and overview",
  contactInfo:"Contact details", ownerLabel:"Owner", principalLabel:"Principal",
  exactLocation:"Location", accreditation:"Accreditation status",
  facilitiesLabel:"Facilities", servicesLabel:"Services", openMap:"Open map",
  noFacilities:"No facilities recorded", noServices:"No services recorded",
  seatsLabel:"Seats available", locationUnavailable:"Location not set",
  stageFeesLabel:"Stages and fees", orgSubjectsLabel:"Institution subjects",
  addStageLabel:"Add stage to school", editLabel:"Edit", feeLabel:"Fee", currencyLabel:"Currency",
  frequencyLabel:"Payment period", capacityLabel:"Capacity", remainingSeatsLabel:"Remaining seats",
  deliveryLabel:"Delivery mode", languageLabel:"Teaching language", yearly:"Yearly", termly:"Termly", monthly:"Monthly",
  onSite:"On-site", onlineDelivery:"Online", hybridDelivery:"Blended",
  noOfferingStages:"No stages defined for this institution yet", noOfferingSubjects:"No subjects specific to this institution",
  seatsAvailableBadge:"Seats available (free)", seatsFullBadge:"At full capacity (full)", seatsUndeclared:"Capacity not declared",
  addOwnSubject:"Add an institution subject", subjectNameLabel:"Subject name", subjectScopeOwn:"Institution subject",
  reviewPending:"Awaiting admin review", reviewApproved:"Approved", reviewRejected:"Rejected",
  reviewLabel:"Review state", approveLabel:"Approve", rejectLabel:"Reject",
  gradesCountLabel:"Number of grades", gradeNamesLabel:"Grade names", nameEnLabel:"English name",
  descriptionLabel:"Description", stageCodeLabel:"Code",
  printReport:"Print", exportReport:"Export", exportXlsx:"Excel (.xlsx)", exportDocx:"Word (.docx)", exportPdf:"PDF",
  reportTitle:"Institution report", reportIssued:"Issued", reportPlatform:"Madrasati platform",
  pricingGated:"Sign in to view fees and register",
  seatsOf:"seats",
  printHint:"Choose “Save as PDF” in the print dialog to get a PDF copy.",
   typeLabel:"Type", phoneLabel:"Phone", websiteLabel:"Website", curriculumLabel:"Curriculum",
   aboutInstitution:"About the institution", generalInfo:"General information", academicPrograms:"Academic programs",
   facilitiesServices:"Facilities & services", profileActions:"Actions", share:"Share", noDescription:"No description yet",
   programDetails:"Program details", stageRangeLabel:"Grades", studentsLabel:"Students", teachersLabel:"Teachers",
   classroomsLabel:"Classrooms", stagesCountLabel:"Stages", stageLabel:"Stage", seatsRemainingShort:"seats left",
   galleryLabel:"Photo gallery", institutionName:"Institution name", viewAll:"View all"
  }
 };
function tr(k){return (i18n[lang]&&i18n[lang][k])||k}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}

// Institution data has ONE source of truth: the API/database (/api/organizations),
// keyed by organization.id. There is no hardcoded demo institution array — every
// view (landing, directory, dashboard, detail) reads the same records and resolves
// their media through MadrasatiMedia.
var filters={q:"",governorate:"",district:"",neighborhood:"",govId:null,districtId:null,orgType:""};
var mapView=false;
var teacherQuery="";
var teacherSearchTimeout=null;
var orgSearchTimeout=null;
var locData={governorates:null,districts:{},neighborhoods:{}};
var locPending={governorates:false,districts:{},neighborhoods:{}};
var orgData={items:[],total:0,loading:false,error:null,loaded:false,cacheKey:null,loadedType:null,_loadingSince:0};
var teacherData={items:[],total:0,loading:false,error:null,loaded:false,cacheKey:"",pricingGated:false};
var homeSearchMode="schools",homeSearchPending=null;
var currentOrg=null;
var currentTeacher=null;
var orgPage={offset:0,limit:20};
var prevRoute="";

function opt(v,label,selected){return '<option value="'+esc(v)+'"'+(selected?' selected':'')+'>'+esc(label)+'</option>'}
function govName(code){var g=(locData.governorates||[]).filter(function(x){return x.code===code})[0];return g?g.name:(code||"")}
function distName(code){var list=[];Object.keys(locData.districts).forEach(function(k){list=list.concat(locData.districts[k])});var d=list.filter(function(x){return x.code===code})[0];return d?d.name:(code||"")}
function orgLocText(o){
 var parts=[];var g=o.governorate||"";var d=o.district||"";
 if(g)parts.push(govName(g));
 if(d)parts.push(distName(d));
 if(o.neighborhood)parts.push(o.neighborhood);
 if(o.address)parts.push(o.address);
 return parts.join(" - ")||tr("locationPlaceholder");
}
function googleMapsUrl(o){
 try{
  if(o.latitude!=null&&o.longitude!=null&&isFinite(Number(o.latitude))&&isFinite(Number(o.longitude))){
   return "https://www.google.com/maps?q="+encodeURIComponent(String(o.latitude)+","+String(o.longitude));
  }
 }catch(e){}
 var q=[o.name,o.address,o.neighborhood,o.governorate].filter(function(x){return x}).join(" ");
 return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q||"Yemen");
}

async function loadGovernorates(){
 if(locData.governorates)return locData.governorates;
 if(locPending.governorates)return locData.governorates||[];
 locPending.governorates=true;
 try{locData.governorates=(await apiGet('/api/locations/governorates'))||[]}
 catch(e){locData.governorates=[]}
 return locData.governorates;
}
async function loadDistricts(govId){
 if(locData.districts[govId]!=null)return locData.districts[govId];
 if(govId==null||govId==="")return [];
 if(locPending.districts[govId])return locData.districts[govId]||[];
 locPending.districts[govId]=true;
 try{locData.districts[govId]=(await apiGet('/api/locations/districts?governorateId='+encodeURIComponent(govId)))||[]}
 catch(e){locData.districts[govId]=[]}
 locPending.districts[govId]=false;
 return locData.districts[govId];
}
async function loadNeighborhoods(distId){
 if(locData.neighborhoods[distId]!=null)return locData.neighborhoods[distId];
 if(distId==null||distId==="")return [];
 if(locPending.neighborhoods[distId])return locData.neighborhoods[distId]||[];
 locPending.neighborhoods[distId]=true;
 try{locData.neighborhoods[distId]=(await apiGet('/api/locations/neighborhoods?districtId='+encodeURIComponent(distId)))||[]}
 catch(e){locData.neighborhoods[distId]=[]}
 locPending.neighborhoods[distId]=false;
 return locData.neighborhoods[distId];
}

function orgTypeForRoute(r){
 return {private:"private_school",government:"government_school",colleges:"college",institutes:"institute"}[r]||null;
}
// Effective institution-type filter: "" follows the current route preset,
// "all" means every type, otherwise the explicitly chosen type code.
function effectiveOrgType(r){
 if(filters.orgType===""||filters.orgType==null)return orgTypeForRoute(r);
 if(filters.orgType==="all")return null;
 return filters.orgType;
}
function orgCacheKey(r){
 var type=effectiveOrgType(r)||"";
 return type+"|t="+filters.orgType+"|q="+filters.q.trim()+"|g="+filters.governorate+"|d="+filters.district+"|n="+filters.neighborhood+"|o="+orgPage.offset;
}
async function loadOrgsFor(r){
 var ck=orgCacheKey(r);
 if(orgData.cacheKey===ck||orgData.loading)return;
 orgData.cacheKey=ck;
 orgData.loading=true;orgData.error=null;
 orgData._loadingSince=Date.now();
  try{
   var type=effectiveOrgType(r);
   var params='?limit='+orgPage.limit+'&offset='+orgPage.offset+(type?'&type='+type:'');
  var q=filters.q.trim();if(q)params+='&search='+encodeURIComponent(q);
  if(filters.governorate)params+='&governorate='+encodeURIComponent(filters.governorate);
  if(filters.district)params+='&district='+encodeURIComponent(filters.district);
  if(filters.neighborhood)params+='&neighborhood='+encodeURIComponent(filters.neighborhood);
  var res=await apiGet('/api/organizations'+params);
   orgData.items=res.items||[];
   orgData.total=res.total||0;
   orgData.error=null;
   orgData.loadedType=type||null;
   // Prefetch district catalogs for result governorates so card location
   // names (distName) resolve instead of showing raw district codes.
   // Fire-and-forget: district loads must not block the org loading
   // finally block. A hanging district fetch previously caused the
   // spinner to get stuck indefinitely.
   try{
    var rCodes={};orgData.items.forEach(function(o){if(o.governorate)rCodes[o.governorate]=1});
    (locData.governorates||[]).filter(function(g){return rCodes[g.code]}).forEach(function(g){loadDistricts(g.id)});
   }catch(e){}
  }catch(e){
   orgData.error=e.message;orgData.items=[];orgData.total=0;
  }finally{
   orgData.loading=false;orgData.loaded=true;orgData._loadingSince=0;
   render();
  }
}

async function loadTeachers(q){
 teacherData.loading=true;teacherData.error=null;
 try{
  var params='?limit='+orgPage.limit+'&offset=0';
  if(q)params+='&search='+encodeURIComponent(q);
  var res=await apiGet('/api/teachers'+params);
  // The endpoint answers with a paginated envelope ({items, total,
  // pricingGated}); treating it as a bare array left the public directory
  // permanently empty.
  teacherData.items=Array.isArray(res)?res:(res&&Array.isArray(res.items)?res.items:[]);
  teacherData.total=Number(res&&res.total!=null?res.total:teacherData.items.length);
  teacherData.pricingGated=Boolean(res&&res.pricingGated);
 }catch(e){
  teacherData.error=e.message;teacherData.items=[];
 }finally{
  teacherData.loading=false;
  teacherData.loaded=true;
 }
}

async function loadOrganization(id){
 currentOrg=null;
 try{
  currentOrg=await apiGet('/api/organizations/'+id);
 }catch(e){
  currentOrg=null;
 }
}

async function loadTeacher(id){
 currentTeacher=null;
 try{
  currentTeacher=await apiGet('/api/teachers/'+id);
 }catch(e){
  currentTeacher=null;
 }
}

// Documents, facilities and services are three separate resources the detail
// screen needs at once. They are fetched in parallel, and each one settles on
// its own so a single failing endpoint degrades one panel instead of blanking
// the whole page.
var detailExtras={orgId:null,docs:[],facilities:[],services:[],subjects:[],grades:[],offering:null,loading:false};
function asList(d){if(Array.isArray(d))return d;if(d&&Array.isArray(d.items))return d.items;if(d&&Array.isArray(d.rows))return d.rows;return []}
async function loadOrgDetailExtras(orgId){
 detailExtras.loading=true;detailExtras.docs=[];detailExtras.facilities=[];detailExtras.services=[];detailExtras.subjects=[];detailExtras.grades=[];detailExtras.offering=null;
 var enc=encodeURIComponent(orgId);
 var res=await Promise.all([
  apiGet('/api/documents?organizationId='+enc).catch(function(){return []}),
  apiGet('/api/organizations/'+enc+'/facilities').catch(function(){return []}),
  apiGet('/api/organizations/'+enc+'/services').catch(function(){return []}),
  apiGet('/api/academic/org/'+enc+'/subjects').catch(function(){return []}),
  // The priced layer of this institution: which stages it teaches, with the fee,
  // currency, period, language, delivery mode and capacity of each. The server
  // decides whether amounts come back at all, so a gated response is normal.
  apiGet('/api/academic/org/'+enc+'/offering/public').catch(function(){return null}),
  // The public grade ladder, so a program card can name its real grade range
  // (e.g. "الصف الأول - الصف السادس") instead of showing a bare stage code.
  apiGet('/api/academic/grades').catch(function(){return []})
 ]);
 detailExtras.orgId=orgId;
 detailExtras.docs=asList(res[0]);
 detailExtras.facilities=asList(res[1]);
 detailExtras.services=asList(res[2]);
 detailExtras.subjects=asList(res[3]);
 detailExtras.offering=res[4]||null;
 detailExtras.grades=asList(res[5]);
 detailExtras.loading=false;
}
function orgOffering(){return detailExtras.offering||null}
function moneyText(amount,currency){
 if(amount==null||amount==="")return "—";
 var n=Number(amount);
 var num=isFinite(n)?n.toLocaleString(lang==="ar"?"ar-YE":"en-US"):String(amount);
 return num+" "+String(currency||"YER");
}
function frequencyLabel(f){
 var map={yearly:"yearly",annual:"yearly",termly:"termly",semester:"termly",monthly:"monthly",month:"monthly"};
 return tr(map[String(f||"").toLowerCase()]||"yearly");
}

function orgTypeLabel(type){
 var map={
  private_school:lang==="ar"?"مدرسة أهلية":"Private School",
  government_school:lang==="ar"?"مدرسة حكومية":"Government School",
  college:lang==="ar"?"كلية":"College",
  university:lang==="ar"?"جامعة":"University",
  institute:lang==="ar"?"معهد":"Institute"
 };
 return map[type]||type||"—";
}

function orgStatusLabel(verified){
 if(verified)return lang==="ar"?"مفعل":"Active";
 return lang==="ar"?"بانتظار التحقق":"Pending";
}

function orgStatusClass(verified){
 return verified?"ok":"wait";
}

function normalizeNameList(v){
 if(!Array.isArray(v))return [];
 return v.map(function(x){return x&&typeof x==="object"?(x.nameAr||x.name||x.label||""):String(x==null?"":x)}).filter(Boolean);
}

function orgCardFromApi(o){
 // Same resolver as the dashboard and the detail page: an organization's card
 // image and logo are keyed on its id, never on hash/position/name.
 var m=(typeof MadrasatiMedia!=="undefined")?MadrasatiMedia.orgMedia(o):{cover:"",logo:orgLogo(o)};
 return {
  n:o.name||"—",
  t:orgTypeLabel(o.type),
  loc:orgLocText(o),
  r:o.rating||0,
  rv:o.reviews||0,
  verified:Boolean(o.verified),
  img:m.cover||m.logo,
  logo:m.logo,
  mapUrl:googleMapsUrl(o),
  id:o.id,
  stages:normalizeNameList(o.stages),
  // Services are their own organization records. Reading facilities here — as
  // this did before — put facility names under the services badges, so a
  // school's real services never appeared on a card.
  services:normalizeNameList(o.services),
  offers:Number(o.offersCount)||0,
  open:o.registrationOpen===true
 };
}

function hashStr(s){
 var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0}return Math.abs(h);
}

function orgCard(p,opts){
 opts=opts||{};
 var ver=p.verified?'<span class="verify-chip">'+icon("shield",12)+' '+tr("verified")+'</span>':'';
 var rating=(p.r>0)?'<div class="rating"><span><b>'+p.r+'</b> <span class="star">★</span>'+(p.rv>0?' ('+p.rv+')':'')+'</span></div>':'';
 var chips=[];
 if(p.stages&&p.stages.length)chips.push('<span class="c-chip">'+icon("college",11)+' '+esc(p.stages.slice(0,2).join("، "))+'</span>');
 if(p.open)chips.push('<span class="c-chip ok">'+icon("check",11)+' '+(lang==="ar"?"التسجيل مفتوح":"Registration open")+'</span>');
 var chipsHtml=chips.length?'<div class="c-chips">'+chips.join("")+'</div>':'';
 var servicesHtml=(p.services&&p.services.length)?'<div class="c-services">'+p.services.slice(0,3).map(function(s){return '<span class="c-svc">'+esc(s)+'</span>'}).join("")+'</div>':'';
 var offersBtn=(p.offers>0)?'<button type="button" class="card-offers" onclick="event.stopPropagation();openOfferPopup(\''+p.id+'\')">'+icon("tag",12)+' '+tr("offers")+' <b>'+p.offers+'</b></button>':'';
 // The dashboard adds management buttons to the SAME card the public grid uses,
 // so a school looks identical in both places and only the controls differ. Each
 // button stops the click from bubbling, or a verify would also open the record.
 var adminActions=opts.admin?(
  '<button type="button" class="card-admin" title="'+esc(lang==="ar"?"تعديل":"Edit")+'" onclick="event.stopPropagation();acOrgEdit(\''+p.id+'\')">'+icon("edit",13)+'</button>'+
  '<button type="button" class="card-admin" title="'+esc(lang==="ar"?(p.verified?"إلغاء التوثيق":"توثيق"):(p.verified?"Unverify":"Verify"))+'" onclick="event.stopPropagation();acOrgVerify(\''+p.id+'\','+(p.verified?"true":"false")+')">'+icon(p.verified?"x":"shield",13)+'</button>'+
  '<button type="button" class="card-admin danger" title="'+esc(lang==="ar"?"أرشفة":"Archive")+'" onclick="event.stopPropagation();acOrgArchive(\''+p.id+'\')">'+icon("trash",13)+'</button>'
 ):"";
 return '<article class="school-card" onclick="go(\'detail?id='+p.id+'\')">'+
  '<div class="school-img"><img src="'+esc(p.img)+'" loading="lazy" onerror="this.onerror=null;this.src=\''+esc(p.logo)+'\'"><span class="school-tag'+(p.t.indexOf("حكومية")>-1?' gov':'')+'">'+p.t+'</span>'+ver+'</div>'+
  '<div class="school-body"><h3>'+esc(p.n)+'</h3><p>'+icon("pin",11)+' '+esc(p.loc)+'</p>'+
  rating+chipsHtml+servicesHtml+
  '<div class="card-cta">'+offersBtn+'<button class="card-details" onclick="event.stopPropagation();go(\'detail?id='+p.id+'\')">'+tr("viewDetails")+'</button><a class="card-map" href="'+p.mapUrl+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">'+icon("pin",11)+' '+tr("viewOnMap")+'</a>'+adminActions+'</div>'+
  '</div></article>'
}

function orgTable(){
 if(orgData.loading)return '<div class="loading-inline"><div class="loader"></div></div>';
 if(orgData.error)return '<div class="empty-state">'+orgData.error+'</div>';
 if(!orgData.items.length)return '<div class="empty-state">'+(lang==="ar"?"لا توجد مدارس مسجلة بعد":"No schools registered yet")+'</div>';
 var pages=Math.ceil(orgData.total/orgPage.limit)||1;
 var currentPage=Math.floor(orgPage.offset/orgPage.limit)+1;
 return '<div class="table-wrap"><table class="tbl"><thead><tr>'+
 '<th>'+(lang==="ar"?"اسم المدرسة":"School Name")+'</th><th>'+(lang==="ar"?"النوع":"Type")+'</th><th>'+(lang==="ar"?"المحافظة":"Governorate")+'</th><th>'+(lang==="ar"?"المعلمون":"Teachers")+'</th><th>'+(lang==="ar"?"الطلاب":"Students")+'</th><th>'+(lang==="ar"?"الحالة":"Status")+'</th><th>'+(lang==="ar"?"التحكم":"Actions")+'</th>'+
 '</tr></thead><tbody>'+
  orgData.items.map(function(o){
   var m=(typeof MadrasatiMedia!=="undefined")?MadrasatiMedia.orgMedia(o):{logo:orgLogo(o)};
   return '<tr class="row-click" onclick="go(\'detail?id='+o.id+'\')">'+
   '<td><div class="entity school-entity"><img class="school-logo" src="'+esc(m.logo)+'"><div><b>'+o.name+'</b><div class="entity-sub">'+(o.bio||"—")+'</div></div></div></td>'+
  '<td>'+orgTypeLabel(o.type)+'</td><td>'+(o.governorate||"—")+'</td>'+
  '<td>'+o.teachers+'</td><td>'+o.students+'</td>'+
  '<td><span class="badge '+orgStatusClass(o.verified)+'">'+orgStatusLabel(o.verified)+'</span></td>'+
  '<td><div class="crud-actions">'+
   // Buttons inside a clickable row must swallow the click, otherwise verifying
   // or deleting would also navigate to the detail screen.
   '<button class="crud view" title="'+(lang==="ar"?"عرض التفاصيل":"View")+'" onclick="event.stopPropagation();go(\'detail?id='+o.id+'\')">'+icon("eye",15)+'</button>'+
   '<button class="crud verify" title="'+(lang==="ar"?"تحقق":"Verify")+'" onclick="event.stopPropagation();toggleVerify(\''+o.id+'\','+o.verified+')">'+icon("shield",15)+'</button>'+
   '<button class="crud delete" title="'+(lang==="ar"?"حذف":"Delete")+'" onclick="event.stopPropagation();deleteOrg(\''+o.id+'\')">'+icon("trash",15)+'</button>'+
  '</div></td>'+
  '</tr>'
 }).join("")+
 '</tbody></table></div>'+
 '<div class="pager">'+
 (currentPage>1?'<button onclick="orgPagePrev()">&#8249;</button>':'<button disabled>&#8249;</button>')+
 Array.from({length:Math.min(pages,5)},function(_,i){
  var p=i+1;
  return '<button class="'+(p===currentPage?"active":"")+'" onclick="orgPageGo('+(p-1)*orgPage.limit+')">'+p+'</button>'
 }).join("")+
 (currentPage<pages?'<button onclick="orgPageNext()">&#8250;</button>':'<button disabled>&#8250;</button>')+
 '</div>';
}

function orgPageNext(){orgPage.offset+=orgPage.limit;loadOrgsFor(route())}
function orgPagePrev(){orgPage.offset=Math.max(0,orgPage.offset-orgPage.limit);loadOrgsFor(route())}
function orgPageGo(off){orgPage.offset=off;loadOrgsFor(route())}

async function toggleVerify(id,currentVerified){
 try{
  if(currentVerified){
   await apiDelete('/api/organizations/'+id+'/verify');
  }else{
   await apiPatch('/api/organizations/'+id+'/verify');
  }
  await loadOrgsFor("schools");
 }catch(e){
  alert(e.message);
 }
}

async function deleteOrg(id){
 if(!confirm(lang==="ar"?"هل أنت متأكد من حذف هذه المدرسة؟":"Are you sure you want to delete this school?"))return;
 try{
  await apiDelete('/api/organizations/'+id);
  await loadOrgsFor("schools");
 }catch(e){
  alert(e.message);
 }
}

function setLang(v){lang=v;localStorage.setItem("v4lang",v);render()}
function toggleTheme(){theme=theme==="light"?"dark":"light";localStorage.setItem("v4theme",theme);apply()}
function apply(){document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";document.documentElement.dataset.theme=theme;document.body.classList.toggle("rtl-mode",lang==="ar");document.body.classList.toggle("ltr-mode",lang==="en");if(window.MadarasatiTheme&&MadarasatiTheme.applyMode)MadarasatiTheme.applyMode()}
var pendingThemeId=null;
var sfState={governoratesLoaded:false,districtsLoading:false,neighborhoodsLoading:false};
function toggleThemeMenu(e){
 if(e&&e.stopPropagation)e.stopPropagation();
 var sw=document.getElementById('publicThemeSwitch');
 if(sw)sw.classList.toggle('open');
}
function closeThemeMenu(){var sw=document.getElementById('publicThemeSwitch');if(sw)sw.classList.remove('open')}
function pickTheme(id){closeThemeMenu();MadarasatiTheme.applyTheme(id,true);render()}
function setPendingTheme(id){pendingThemeId=id;MadarasatiTheme.applyTheme(id,false);render()}
function confirmTheme(){if(pendingThemeId){MadarasatiTheme.applyTheme(pendingThemeId,true);pendingThemeId=null}render()}
function cancelTheme(){var cur=MadarasatiTheme.getCurrentThemeId();pendingThemeId=null;MadarasatiTheme.applyTheme(cur,true);render()}
function currentThemeValues(){
 var cs=getComputedStyle(document.documentElement);
 var v=function(n){return cs.getPropertyValue(n).trim()};
 return {primary:v('--theme-primary')||'#1F5D46',primary_dark:v('--theme-primary-dark')||'#174837',accent:v('--theme-accent')||'#B55A3C',background:v('--theme-bg')||'#FAF7F2',surface:v('--theme-surface')||'#FFFFFF',text:v('--theme-text')||'#1F2937',muted:v('--theme-muted')||'#6B7280',border:v('--theme-border')||'#E7DED3'};
}
function applyCustomTheme(){
 var primary=document.getElementById('customPrimary').value;
 var accent=document.getElementById('customAccent').value;
 if(!/^#[0-9a-fA-F]{6}$/.test(primary)||!/^#[0-9a-fA-F]{6}$/.test(accent)){alert(lang==="ar"?"أدخل لوناً صحيحاً بصيغة #RRGGBB":"Enter a valid color as #RRGGBB");return}
 var t=currentThemeValues();t.primary=primary;t.accent=accent;
 MadarasatiTheme.saveCustomTheme(t);
 pendingThemeId=null;
 render();
}
function go(r){location.hash="#/"+r}
// V4 is hash-routing only, and a route has at most two meaningful segments:
// "#/teachersAdmin" is a section page and "#/teachersAdmin/new" is that same
// section's dedicated form page. Only the first segment selects the page, so a
// new form route never registers a second sidebar entry or a second product;
// the extra segment just tells the page what to render.
function routePath(){
  var raw=(location.hash.replace(/^#\/?/,"")||"home").split("?")[0];
  return raw.split("/").filter(function(x){return x!==""});
}
function route(){return routePath()[0]||"home"}
function routeSub(){var p=routePath();return p.length>1?p[1]:""}
function routeSubId(){var p=routePath();return p.length>2?decodeURIComponent(p[2]):""}

var sidebarOpen=false;
function toggleSidebar(){
 sidebarOpen=!sidebarOpen;
 var sidebar=document.querySelector('.sidebar');
 var overlay=document.querySelector('.sidebar-overlay');
 if(sidebar)sidebar.classList.toggle('open',sidebarOpen);
 if(overlay)overlay.classList.toggle('active',sidebarOpen);
 // Lock the page behind the drawer so a touch scroll moves the menu, not the
 // dashboard underneath it (matters on Android where the URL bar reclaims space).
 document.body.classList.toggle('sidebar-open',sidebarOpen);
}
function closeSidebar(){
 sidebarOpen=false;
 var sidebar=document.querySelector('.sidebar');
 var overlay=document.querySelector('.sidebar-overlay');
 if(sidebar)sidebar.classList.remove('open');
 if(overlay)overlay.classList.remove('active');
 document.body.classList.remove('sidebar-open');
}

function publicRail(){
 const ar=lang==="ar";
 return '<aside class="public-rail"><div class="rail-logo"><div class="rail-emblem"></div><h1>'+(ar?"مدرستي":"Madarasati")+'</h1><small>Madarasati</small><p>'+(ar?"بوابتك لعالم أفضل من التعليم":"Your gateway to better education")+'</p></div><div class="rail-line"></div><div class="rail-values"><div class="value-card"><b>🎓</b><span>'+(ar?"تعليم<br>جودة عالية":"Education<br>High quality")+'</span></div><div class="value-card"><b>👥</b><span>'+(ar?"مجتمع<br>داعم ومترابط":"Community<br>Connected")+'</span></div><div class="value-card"><b>✓</b><span>'+(ar?"ثقة<br>ومصداقية":"Trust<br>Reliability")+'</span></div><div class="value-card"><b>▥</b><span>'+(ar?"تطور<br>مستمر":"Growth<br>Continuous")+'</span></div></div><div class="rail-quote">'+(ar?"جيل متعلم<br>يمن أكثر ازدهاراً":"An educated generation<br>A thriving Yemen")+'</div><div class="rail-art"></div></aside>'
}
function publicShell(body){
 return '<div class="public-shell"><div class="public-frame">'+
  '<main class="public-main">'+publicTop()+body+'</main>'+
  publicRail()+
 '</div></div>'
}

/* ---------- Registration (Phase B: normal + owner paths) ---------- */
var regState={mode:null,country:null,govId:null,districtId:null,emailState:null,phoneState:null,submitting:false,error:null,info:null};
// regForm persists typed values across re-renders (availability hints,
// cascades). Updated on every keystroke; render() replays it.
var regForm={name:"",phone:"",email:"",pass:"",pass2:"",orgName:"",orgAddress:"",orgPhone:"",orgEmail:"",orgDesc:"",orgProof:""};
function regKeep(){
 var g=function(id){var el=document.getElementById(id);return el?el.value:""};
 regForm.name=g("rg-name");regForm.phone=g("rg-phone");regForm.email=g("rg-email");
 regForm.pass=g("rg-pass");regForm.pass2=g("rg-pass2");
 regForm.orgName=g("rg-org-name");regForm.orgAddress=g("rg-org-address");
 regForm.orgPhone=g("rg-org-phone");regForm.orgEmail=g("rg-org-email");
 regForm.orgDesc=g("rg-org-desc");regForm.orgProof=g("rg-org-proof");
}
var regCountries=null,regCountriesLoading=false;
var regGovs=null,regGovsLoading=false,regDists={},regDistsLoading={},regNbs={},regNbsLoading={};
var regEmailTimer=null,regPhoneTimer=null;

function regReset(){regState={mode:regState.mode,country:null,govId:null,districtId:null,emailState:null,phoneState:null,submitting:false,error:null,info:null}}
function regSetMode(m){regState.mode=m;regReset();regState.mode=m;render()}
function regLoadCountries(){
 if(regCountries||regCountriesLoading)return;
 regCountriesLoading=true;
 apiGet('/api/locations/countries').then(function(list){regCountries=list||[];render()}).catch(function(){regCountries=[];render()});
}
function regCountry(){return (regCountries||[]).filter(function(c){return c.code===regState.country})[0]||null}
function regLoadGovs(){
 if(regGovs||regGovsLoading)return;
 regGovsLoading=true;
 apiGet('/api/locations/governorates').then(function(list){regGovs=list||[];render()}).catch(function(){regGovs=[];render()});
}
function regLoadDists(govId){
 if(regDists[govId]!=null||regDistsLoading[govId])return;
 regDistsLoading[govId]=true;
 apiGet('/api/locations/districts?governorateId='+encodeURIComponent(govId)).then(function(list){regDists[govId]=list||[];render()}).catch(function(){regDists[govId]=[];render()});
}
function regLoadNbs(distId){
 if(regNbs[distId]!=null||regNbsLoading[distId])return;
 regNbsLoading[distId]=true;
 apiGet('/api/locations/neighborhoods?districtId='+encodeURIComponent(distId)).then(function(list){regNbs[distId]=list||[];render()}).catch(function(){regNbs[distId]=[];render()});
}
function regOnCountry(){
 regKeep();
 var v=document.getElementById("rg-country").value;
 regState.country=v;regState.govId=null;regState.districtId=null;
 regState.phoneState=null;
 if(v==="YE")regLoadGovs();
 render();
}
function regOnGov(){
 regKeep();
 var v=document.getElementById("rg-gov").value;
 regState.govId=v===""?null:Number(v);regState.districtId=null;
 if(regState.govId)regLoadDists(regState.govId);
 render();
}
function regOnDistrict(){
 var v=document.getElementById("rg-district").value;
 regState.districtId=v===""?null:Number(v);
 var nb=document.getElementById("rg-nb");
 if(regState.districtId)regLoadNbs(regState.districtId);
}
function regCheckEmail(){
 var v=regForm.email.trim();
 regState.emailState=null;
 clearTimeout(regEmailTimer);
 if(!v||v.indexOf("@")<0){render();return}
 regEmailTimer=setTimeout(function(){
  apiGet('/api/auth/check-email?email='+encodeURIComponent(v)).then(function(r){
   regKeep();regState.emailState=r.available?"ok":"taken";render();
  }).catch(function(){});
 },400);
}
function regCheckPhone(){
 var v=regForm.phone.trim();
 var c=regCountry();
 regState.phoneState=null;
 clearTimeout(regPhoneTimer);
 if(!v||!c){render();return}
 regPhoneTimer=setTimeout(function(){
  apiGet('/api/auth/check-phone?phone='+encodeURIComponent(v)+'&cc='+encodeURIComponent(c.callingCode||'')+'&iso='+encodeURIComponent(c.code)).then(function(r){
   regKeep();regState.phoneState=r.available?"ok":(r.reason==="invalid"?"invalid":"taken");render();
  }).catch(function(){});
 },400);
}
function regHint(state,okKey,takenKey){
 if(state==="ok")return '<small class="rg-hint ok">'+esc(tr(okKey))+'</small>';
 if(state==="taken")return '<small class="rg-hint bad">'+esc(tr(takenKey))+'</small>';
 if(state==="invalid")return '<small class="rg-hint bad">'+esc(tr("invalidPhone"))+'</small>';
 return '<small class="rg-hint idle">'+esc(tr("checking"))+'</small>';
}
function regCountryOptions(){
 if(!regCountries)return opt("",lang==="ar"?"جارٍ التحميل...":"Loading...",true);
 return opt("",tr("selectCountry"),!regState.country)+regCountries.map(function(c){
  return opt(c.code,(lang==="ar"?c.name:(c.nameEn||c.name))+" (+"+(c.callingCode||"—")+")",regState.country===c.code);
 }).join("");
}
function regGovOptions(){
 if(!regGovs)return opt("",lang==="ar"?"جارٍ التحميل...":"Loading...",true);
 return opt("",tr("allGovernorates"),!regState.govId)+regGovs.map(function(g){
  return opt(g.id,g.name,regState.govId===g.id);
 }).join("");
}
function regDistOptions(){
 if(!regState.govId)return opt("",tr("allDistricts"),true);
 var list=regDists[regState.govId];
 if(!list)return opt("",lang==="ar"?"جارٍ التحميل...":"Loading...",true);
 return opt("",tr("allDistricts"),!regState.districtId)+list.map(function(d){
  return opt(d.id,d.name,regState.districtId===d.id);
 }).join("");
}
function regNbOptions(distId){
 var list=regNbs[distId];
 if(!list)return opt("",tr("allNeighborhoods"),true);
 var cur=document.getElementById("rg-nb");
 var curv=cur?cur.value:"";
 return opt("",tr("allNeighborhoods"),!curv)+list.map(function(n){return opt(n.name,n.name)}).join("");
}
function registerPage(){
 var ar=lang==="ar";
 regLoadCountries();
 var errHtml=regState.error?'<div class="login-error">'+esc(regState.error)+'</div>':'';
 var infoHtml=regState.info?'<div class="rg-info">'+esc(regState.info)+'</div>':'';
 var head='<div class="login-card"><div class="login-header"><div class="logo-mark login-logo">م</div>'+
  '<h2>'+esc(tr("registerTitle"))+'</h2><p>'+esc(tr("registerSub"))+'</p></div>'+errHtml+infoHtml;
 if(!regState.mode){
  return publicShell('<div class="login-container">'+head+
   '<div class="rg-modes">'+
   '<button type="button" class="rg-mode" onclick="regSetMode(\'normal\')"><b>'+esc(tr("regNormal"))+'</b><span>'+esc(tr("regNormalDesc"))+'</span></button>'+
   '<button type="button" class="rg-mode" onclick="regSetMode(\'owner\')"><b>'+esc(tr("regOwner"))+'</b><span>'+esc(tr("regOwnerDesc"))+'</span></button>'+
   '</div><div class="rg-swap"><button type="button" class="sp-reset" onclick="go(\'login\')">'+esc(tr("alreadyHaveAccount"))+'</button></div>'+
   '</div></div>');
 }
 var c=regCountry();
 var isYE=regState.country==="YE";
 var govHtml='';
 if(isYE){
  regLoadGovs();
  govHtml='<div class="form-row2">'+
   '<div class="form-group"><label>'+esc(tr("governorate"))+'</label><select id="rg-gov" class="f-select" onchange="regOnGov()">'+regGovOptions()+'</select></div>'+
   '<div class="form-group"><label>'+esc(tr("district"))+'</label><select id="rg-district" class="f-select" onchange="regOnDistrict()"'+(regState.govId?"":" disabled")+'>'+regDistOptions()+'</select></div>'+
  '</div>';
  if(regState.govId)regLoadDists(regState.govId);
 }
 var ownerHtml='';
 if(regState.mode==="owner"){
  var typeOpts=["private_school","government_school","college","university","institute"].map(function(t){return opt(t,orgTypeLabel(t))}).join("");
  ownerHtml='<div class="rg-section"><h3>'+esc(tr("institutionSection"))+'</h3>'+
   '<div class="form-row2">'+
   '<div class="form-group"><label>'+esc(tr("institutionName"))+'</label><input id="rg-org-name" required value="'+esc(regForm.orgName)+'" oninput="regForm.orgName=this.value"></div>'+
   '<div class="form-group"><label>'+esc(tr("orgType"))+'</label><select id="rg-org-type" class="f-select">'+typeOpts+'</select></div>'+
   '</div>'+
   (isYE?'<div class="form-row2">'+
    '<div class="form-group"><label>'+esc(tr("neighborhood"))+'</label><select id="rg-nb" class="f-select"'+(regState.districtId?"":" disabled")+'>'+(regState.districtId?regNbOptions(regState.districtId):opt("",tr("allNeighborhoods"),true))+'</select></div>'+
    '<div class="form-group"><label>'+esc(tr("institutionAddress"))+'</label><input id="rg-org-address" value="'+esc(regForm.orgAddress)+'" oninput="regForm.orgAddress=this.value"></div>'+
   '</div>':'<div class="form-group"><label>'+esc(tr("institutionAddress"))+'</label><input id="rg-org-address" value="'+esc(regForm.orgAddress)+'" oninput="regForm.orgAddress=this.value"></div>')+
   '<div class="form-row2">'+
   '<div class="form-group"><label>'+esc(tr("institutionPhone"))+'</label><input id="rg-org-phone" dir="ltr" value="'+esc(regForm.orgPhone)+'" oninput="regForm.orgPhone=this.value"></div>'+
   '<div class="form-group"><label>'+esc(tr("institutionEmail"))+'</label><input id="rg-org-email" type="email" dir="ltr" value="'+esc(regForm.orgEmail)+'" oninput="regForm.orgEmail=this.value"></div>'+
   '</div>'+
   '<div class="form-group"><label>'+esc(tr("institutionDesc"))+'</label><input id="rg-org-desc" value="'+esc(regForm.orgDesc)+'" oninput="regForm.orgDesc=this.value"></div>'+
   '</div><div class="rg-section"><h3>'+esc(tr("ownershipSection"))+'</h3>'+
   '<div class="form-group"><label>'+esc(tr("ownershipProof"))+'</label><input id="rg-org-proof" value="'+esc(regForm.orgProof)+'" oninput="regForm.orgProof=this.value"><small class="rg-hint idle">'+esc(tr("ownershipProofHint"))+'</small></div>'+
   '</div>';
 }
 if(regState.districtId)regLoadNbs(regState.districtId);
 return publicShell('<div class="login-container">'+head+
  '<form class="login-form" onsubmit="handleRegister(event)">'+
  '<div class="form-group"><label>'+esc(tr("fullName"))+'</label><input id="rg-name" required value="'+esc(regForm.name)+'" oninput="regForm.name=this.value" autocomplete="name"></div>'+
  '<div class="form-row2">'+
  '<div class="form-group"><label>'+esc(tr("country"))+'</label><select id="rg-country" class="f-select" onchange="regOnCountry()">'+regCountryOptions()+'</select></div>'+
  '<div class="form-group"><label>'+esc(tr("countryCode"))+'</label><input id="rg-cc" dir="ltr" readonly value="'+esc(c&&c.callingCode?('+'+c.callingCode):"")+'"></div>'+
  '</div>'+govHtml+
  '<div class="form-group"><label>'+esc(tr("phoneNumber"))+'</label><input id="rg-phone" dir="ltr" required value="'+esc(regForm.phone)+'" oninput="regForm.phone=this.value;regCheckPhone()" autocomplete="tel">'+regHint(regState.phoneState,"phoneAvailable","phoneTaken")+'</div>'+
  '<div class="form-group"><label>'+esc(tr("email"))+'</label><input id="rg-email" type="email" dir="ltr" required value="'+esc(regForm.email)+'" oninput="regForm.email=this.value;regCheckEmail()" autocomplete="email">'+regHint(regState.emailState,"emailAvailable","emailTaken")+'</div>'+
  '<div class="form-row2">'+
  '<div class="form-group"><label>'+esc(tr("password"))+'</label><input id="rg-pass" type="password" required value="'+esc(regForm.pass)+'" oninput="regForm.pass=this.value" autocomplete="new-password"></div>'+
  '<div class="form-group"><label>'+esc(tr("confirmPassword"))+'</label><input id="rg-pass2" type="password" required value="'+esc(regForm.pass2)+'" oninput="regForm.pass2=this.value" autocomplete="new-password"></div>'+
  '</div>'+ownerHtml+
  '<button type="submit" class="btn green login-btn" id="rg-submit"'+(regState.submitting?" disabled":"")+'>'+esc(regState.mode==="owner"?tr("submitOwnerRequest"):tr("createAccountBtn"))+'</button>'+
  '</form><div class="rg-swap"><button type="button" class="sp-reset" onclick="regSetMode(null)">← '+esc(tr("registerSub"))+'</button> <button type="button" class="sp-reset" onclick="go(\'login\')">'+esc(tr("alreadyHaveAccount"))+'</button></div>'+
  '</div></div>');
}
function regApiError(e){
 var code=e&&e.data&&e.data.code;
 if(code==="EMAIL_EXISTS")return tr("emailTaken");
 if(code==="PHONE_EXISTS")return tr("phoneTaken");
 if(e&&e.data&&e.data.error)return e.data.error;
 return (e&&e.message)||"Error";
}
// Generic backend-message mapper (Arabic-first for known cases).
function msgErr(e){
 var m=(e&&e.data&&e.data.error)||"";
 if(lang==="ar"&&m){
  if(/already exists/i.test(m))return "هذا العنصر موجود بالفعل.";
  if(/already reviewed/i.test(m))return "تمت مراجعة هذا الطلب مسبقاً.";
  if(/own request/i.test(m))return "لا يمكنك مراجعة طلبك الخاص.";
  if(/pending request/i.test(m))return "لديك طلب معلق لهذه المؤسسة.";
  if(/Authentication required/i.test(m))return "يلزم تسجيل الدخول.";
  if(/Insufficient permissions|Not authorized/i.test(m))return "لا تملك الصلاحية.";
 }
 return m||(e&&e.message)||"Error";
}
async function handleRegister(e){
 e.preventDefault();
 if(regState.submitting)return;
 regState.error=null;
 var v=function(id){var el=document.getElementById(id);return el?el.value.trim():""};
 var name=v("rg-name"),email=v("rg-email"),pass=v("rg-pass"),pass2=v("rg-pass2"),phone=v("rg-phone");
 if(name.length<2){regState.error=tr("mustAcceptName");render();return}
 if(!regState.country){regState.error=tr("selectCountry");render();return}
 if(!phone){regState.error=tr("invalidPhone");render();return}
 if(pass.length<8){regState.error=tr("mustAcceptPassword");render();return}
 if(pass!==pass2){regState.error=tr("passwordMismatch");render();return}
 var c=regCountry();
 var profile={countryCode:regState.country,phoneCountryCode:c&&c.callingCode?c.callingCode:""};
 if(regState.country==="YE"){
  if(regState.govId)profile.governorateId=regState.govId;
  if(regState.districtId)profile.districtId=regState.districtId;
 }
 regState.submitting=true;render();
 try{
  var user=await apiPost('/api/auth/register',{name:name,email:email,password:pass,phone:phone,phoneCountryCode:c&&c.callingCode?c.callingCode:"",countryIso:regState.country,profile:profile});
  authState.currentUser=user;
  if(regState.mode==="owner"){
   var nbEl=document.getElementById("rg-nb");
   try{
    await apiPost('/api/ownership/requests',{
     requestType:"new_institution",
     institutionName:v("rg-org-name"),institutionType:(document.getElementById("rg-org-type")||{}).value,
     countryCode:regState.country,
     governorateCode:regState.country==="YE"?(function(){var g=(regGovs||[]).filter(function(x){return x.id===regState.govId})[0];return g?g.code:null})():null,
     districtCode:regState.country==="YE"?(function(){var l=regDists[regState.govId]||[];var d=l.filter(function(x){return x.id===regState.districtId})[0];return d?d.code:null})():null,
     neighborhood:nbEl?nbEl.value||null:null,
     address:v("rg-org-address"),contactPhone:v("rg-org-phone"),contactEmail:v("rg-org-email"),
     description:v("rg-org-desc"),ownershipProof:v("rg-org-proof")
    });
    regState.info=tr("requestSubmitted");
   }catch(reqErr){
    regState.info=tr("requestSubmitFailed")+": "+regApiError(reqErr);
   }
  }else{
   regState.info=tr("accountCreated");
  }
  regState.submitting=false;
  go(regState.mode==="owner"?"owner":"home");
 }catch(err){
  regState.submitting=false;
  regState.error=regApiError(err);
  render();
 }
}

function loginPage(){
 const ar=lang==="ar";
 const errMsg=authState.error?`<div class="login-error">${authState.error}</div>`:'';
 const body='<div class="login-container">'+
  '<div class="login-card">'+
   '<div class="login-header">'+
    '<div class="logo-mark login-logo">م</div>'+
    '<h2>'+(ar?"تسجيل الدخول":"Sign In")+'</h2>'+
    '<p>'+(ar?"ادخل بيانات حسابك للوصول إلى لوحة التحكم":"Enter your credentials to access the dashboard")+'</p>'+
   '</div>'+
   errMsg+
   '<form class="login-form" onsubmit="handleLogin(event)">'+
'<div class="form-group">'+
      '<label>'+(ar?"البريد الإلكتروني":"Email")+'</label>'+
      '<input type="email" id="login-email" required placeholder="'+(ar?"البريد الإلكتروني esempio":"Email example")+'" value="" autocomplete="email">'+
     '</div>'+
     '<div class="form-group">'+
      '<label>'+(ar?"كلمة المرور":"Password")+'</label>'+
      '<input type="password" id="login-password" required placeholder="'+(ar?"كلمة المرور esempio":"Password example")+'" value="" autocomplete="current-password">'+
     '</div>'+
     '<button type="submit" class="btn green login-btn" id="login-submit">'+(ar?"دخول":"Sign in")+'</button>'+
    '</form>'+
    '<div class="rg-swap"><button type="button" class="sp-reset" onclick="go(\'register\')">'+(ar?"ليس لديك حساب؟ أنشئ حساباً":"No account yet? Create one")+'</button></div>'+
   '</div>'+
  '</div>';
 return publicShell(body);
}

function handleLogin(e){
 e.preventDefault();
 var email=document.getElementById('login-email').value;
 var password=document.getElementById('login-password').value;
 var btn=document.getElementById('login-submit');
 btn.disabled=true;btn.textContent=lang==="ar"?"جارٍ الدخول...":"Signing in...";
 loginUser(email,password).then(function(user){
  var dest=consumeReturnAfterAuth()||getLoginRedirect(user);
  // If the destination is the current hash (e.g. an inline login shown on a
  // protected route), go() would not fire hashchange — render explicitly.
  if(("#/"+dest)===location.hash)render();else go(dest);
 }).catch(function(err){
  btn.disabled=false;btn.textContent=lang==="ar"?"دخول":"Sign in";
  render();
 });
}
const nav=[
 ["home","landingHome"],["private","privateSchools"],["government","governmentSchools"],
 ["colleges","colleges"],["institutes","institutes"],["teachers","privateTeachers"]
];
var adsData={items:[],loading:false,loaded:false};
function adTickerText(a){
 if(lang==="ar")return a.messageAr||a.messageEn||a.name||"";
 return a.messageEn||a.messageAr||a.name||"";
}
function adTrack(id){
  try{apiPost('/api/advertisements/'+encodeURIComponent(id)+'/click',{}).catch(function(){})}catch(e){}
}
// An impression is counted only when the strip actually renders that ad, and
// only once per page view: a re-render from hash navigation is not a second
// view, so the counter reflects people, not render passes. The server refuses
// an ineligible advertisement anyway, so a stale list cannot inflate a number.
var adImpressions={counted:{}};
function adImpression(id){
  if(!id||adImpressions.counted[id])return;
  adImpressions.counted[id]=true;
  try{apiPost('/api/advertisements/'+encodeURIComponent(id)+'/impression',{}).catch(function(){})}catch(e){}
}
function adGo(route_,id){adTrack(id);go(route_)}
function loadAds(){
 if(adsData.loaded||adsData.loading)return;
 adsData.loading=true;
 apiGet('/api/advertisements?placement=ticker').then(function(d){
  adsData.items=((d&&d.items)||[]).slice(0,5);
 }).catch(function(){
  adsData.items=[];
 }).then(function(){
  adsData.loading=false;adsData.loaded=true;
  if(publicRoutes.indexOf(route())>-1)render();
 });
}
// Non-dismissible continuous announcement ticker. Ads come from PostgreSQL via
// /api/advertisements?placement=ticker. The strip is always present: when no
// eligible ads exist it shows a default promotional message instead of vanishing.
function publicAnnouncement(){
 const ar=lang==="ar";
 const items=(adsData.items||[]).slice(0,5);
 let any=false;
 const sep='<span class="ticker-sep" aria-hidden="true">•</span>';
  const rendered=items.map(function(a){
   const label=adTickerText(a);
   if(!label)return "";
   any=true;
   adImpression(a.id);
  const body='<span class="ticker-msg">'+esc(label)+'</span>'+
   (a.advertiser?'<span class="ticker-src">'+esc(a.advertiser)+'</span>':'');
  let item;
  if(a.targetRoute)item='<button type="button" class="ticker-item" data-ad-route="'+esc(a.targetRoute)+'" data-ad-id="'+esc(a.id)+'">'+body+'</button>';
  else if(a.targetUrl&&/^https:\/\//i.test(a.targetUrl))item='<a class="ticker-item" href="'+esc(a.targetUrl)+'" target="_blank" rel="noopener" data-ad-id="'+esc(a.id)+'">'+body+'</a>';
  else item='<span class="ticker-item">'+body+'</span>';
  return item+sep;
 }).join("");
 let group,animate;
 if(!any){
  // No eligible ads: keep the strip available with a default promo message.
  group='<span class="ticker-group"><span class="ticker-item"><span class="ticker-msg">'+
   esc(ar?"أضف إعلانك هنا وكن مميزاً":"Advertise here and stand out")+'</span></span></span>';
  animate=false;
 }else{
  group='<span class="ticker-group">'+rendered+'</span>';
  animate=items.length>1;
 }
 return '<div class="pub-announce pub-ticker" role="region" aria-label="'+(ar?"إعلانات متحركة":"Scrolling announcements")+'">'+
   '<div class="ticker-track'+(animate?(ar?" rtl":""):" static")+'">'+(animate?group+group:group)+'</div>'+
  '</div>';
}
// ---- Auth return-destination (used by offer gate, login + register) ----
function setReturnAfterAuth(){try{localStorage.setItem("v4return",location.hash||"#/home")}catch(e){}}
function consumeReturnAfterAuth(){try{var r=localStorage.getItem("v4return");if(r){localStorage.removeItem("v4return");return r.replace(/^#?\/?/,"")}}catch(e){}return ""}

// ---- Offer popup (active offers only; contact is auth-gated) ----
var offerPopup={open:false,orgId:null,name:"",loading:false,error:null,items:[]};
function offerWindowText(o){
 const ar=lang==="ar";
 if(!o.startsAt&&!o.endsAt)return "";
 const f=function(s){try{return new Date(s).toLocaleDateString(ar?"ar-YE":"en-GB")}catch(e){return s}};
 if(o.startsAt&&o.endsAt)return '<div class="offer-win">'+icon("calendar",11)+' '+f(o.startsAt)+' — '+f(o.endsAt)+'</div>';
 if(o.endsAt)return '<div class="offer-win">'+icon("calendar",11)+' '+(ar?"ينتهي في ":"Ends ")+f(o.endsAt)+'</div>';
 return '<div class="offer-win">'+icon("calendar",11)+' '+(ar?"يبدأ في ":"Starts ")+f(o.startsAt)+'</div>';
}
function openOfferPopup(orgId,name){
 offerPopup.open=true;offerPopup.orgId=orgId;offerPopup.name=name||"";
 offerPopup.loading=true;offerPopup.error=null;offerPopup.items=[];
 renderOfferPopup();
 apiGet('/api/offers?organizationId='+encodeURIComponent(orgId)).then(function(d){
  offerPopup.items=((d&&d.items)||[]);offerPopup.loading=false;renderOfferPopup();
 }).catch(function(err){
  offerPopup.error=(err&&err.message)||"error";offerPopup.loading=false;renderOfferPopup();
 });
}
function closeOfferPopup(){offerPopup.open=false;offerPopup.orgId=null;offerPopup.items=[];offerPopup.error=null;renderOfferPopup()}
function offerGoDetail(){var id=offerPopup.orgId;closeOfferPopup();if(id)go('detail?id='+id)}
function offerLogin(){setReturnAfterAuth();closeOfferPopup();go('login')}
function offerRegister(){setReturnAfterAuth();closeOfferPopup();go('register')}
function renderOfferPopup(){
 var el=document.getElementById("offerPopup");
 if(!offerPopup.open){if(el)el.remove();return}
 const ar=lang==="ar";
 var body;
 if(offerPopup.loading)body='<div class="loading-inline"><div class="loader"></div></div>';
 else if(offerPopup.error)body='<div class="empty-state">'+esc(offerPopup.error)+'</div>';
 else if(!offerPopup.items.length)body='<div class="empty-state">'+(ar?"لا توجد عروض نشطة حالياً":"No active offers right now")+'</div>';
 else body=offerPopup.items.map(function(o){
  var title=(ar?o.title:o.titleEn||o.title)||o.title||"";
  var desc=(ar?o.description:o.descriptionEn||o.description)||"";
  var disc=(o.discountPercent!=null&&o.discountPercent!=="")?'<span class="offer-disc">'+esc(o.discountPercent)+'%</span>':'';
  return '<div class="offer-row">'+disc+'<div class="offer-copy"><b>'+esc(title)+'</b>'+(desc?'<p>'+esc(desc)+'</p>':'')+offerWindowText(o)+'</div></div>';
 }).join("");
 var gate=isLoggedIn()
  ?'<div class="offer-gate ok">'+icon("check",14)+' '+(ar?"يمكنك التواصل مع المؤسسة للاستفادة من العرض":"You can contact the institution to claim this offer")+'<div class="offer-gate-actions"><button class="btn brown" onclick="offerGoDetail()">'+(ar?"عرض المؤسسة":"View institution")+'</button></div></div>'
  :'<div class="offer-gate">'+icon("shield",14)+' '+(ar?"سجّل الدخول لعرض تفاصيل التواصل مع المؤسسة":"Sign in to see institution contact details")+'<div class="offer-gate-actions"><button class="btn brown" onclick="offerLogin()">'+tr("login")+'</button><button class="btn" onclick="offerRegister()">'+tr("createAccount")+'</button></div></div>';
 var html='<div class="offer-overlay" onclick="if(event.target===this)closeOfferPopup()" role="dialog" aria-modal="true" aria-label="'+(ar?"العروض":"Offers")+'"><div class="offer-modal">'+
  '<div class="offer-head"><h3>'+tr("offers")+(offerPopup.name?' — '+esc(offerPopup.name):'')+'</h3><button type="button" class="offer-close" onclick="closeOfferPopup()" aria-label="'+(ar?"إغلاق":"Close")+'">'+icon("x",16)+'</button></div>'+
  '<div class="offer-body">'+body+'</div>'+gate+'</div></div>';
 if(el)el.innerHTML=html;else{el=document.createElement("div");el.id="offerPopup";el.innerHTML=html;document.body.appendChild(el)}
}
function headerSearchFocus(){
 try{
  var el=document.querySelector("#f-q,#t-q,.search-row input,.f-search input");
  if(el){el.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(function(){try{el.focus({preventScroll:true})}catch(e){el.focus()}},350);return}
 }catch(e){}
 try{window.scrollTo({top:0,behavior:"smooth"})}catch(e){window.scrollTo(0,0)}
}
function publicTop(){
 const ar=lang==="ar";
 const tabIcon=function(x){
  if(x==="home")return "home";
  if(x==="private"||x==="government")return "school";
  if(x==="colleges")return "college";
  if(x==="institutes")return "institute";
  return "teacher";
 };
 const pills=nav.map(function(x){return '<button class="top-tab'+(route()===x[0]?" active":"")+'" onclick="go(\''+x[0]+'\')">'+icon(tabIcon(x[0]),13)+' <span>'+tr(x[1])+'</span></button>'}).join("");
 const drawerLinks=nav.map(function(x){return '<button class="drawer-link'+(route()===x[0]?" active":"")+'" onclick="go(\''+x[0]+'\');closePublicNav()">'+tr(x[1])+'</button>'}).join("");
  const brandName=ar?"مدرستي":"Madarasati";
  const brandLatin=ar?"MADARASATI":"مدرستي";
  // One account entry, always. A visitor gets a single "Sign in" button — the
  // sign-up link now lives inside the login page, so the header never offers two
  // doors to the same place. A signed-in person gets a Dashboard button instead,
  // pointing at the console that matches their role.
  const accountBtn=(function(){
   var u=getCurrentUser();
   if(u)return '<button class="login dash-btn" type="button" onclick="go(\''+getLoginRedirect(u)+'\')">'+icon("grid",14)+' <span>'+(ar?"لوحة التحكم":"Dashboard")+'</span></button>';
   return '<button class="login" type="button" onclick="go(\'login\')">'+tr("login")+'</button>';
  })();
  return publicAnnouncement()+
  '<div class="public-top">'+
  '<button class="top-burger" onclick="togglePublicNav()" aria-label="'+tr("menu")+'">'+icon("menu",20)+'</button>'+
  '<div class="brand" onclick="go(\'home\')"><div class="logo-mark">م</div><div class="brand-txt"><b>'+brandName+'</b><small>'+brandLatin+'</small></div></div>'+
  '<nav class="top-nav" aria-label="'+(ar?"التنقل الرئيسي":"Primary")+'">'+pills+'</nav>'+
  '<div class="top-left">'+
   '<button class="hdr-icon" type="button" onclick="headerSearchFocus()" aria-label="'+tr("search")+'" title="'+tr("searchBtn")+'">'+icon("search",16)+'</button>'+
   '<button class="hdr-icon hdr-theme" type="button" onclick="toggleTheme()" aria-label="'+tr("theme")+'" title="'+tr("theme")+'">☀</button>'+
   publicThemeSwitch()+
   publicLangSwitch()+
    accountBtn+
  '</div>'+
  '</div>'+
  '<div class="public-drawer" id="publicDrawer" aria-label="'+tr("menu")+'">'+
   '<div class="drawer-head"><div class="logo-mark">م</div><div class="brand-txt"><b>'+brandName+'</b><small>'+brandLatin+'</small></div><button class="drawer-close" onclick="togglePublicNav()" aria-label="'+tr("close")+'">'+icon("x",18)+'</button></div>'+
   '<nav class="drawer-nav">'+drawerLinks+'</nav>'+
    '<div class="drawer-actions">'+(getCurrentUser()
      ?'<button class="login drawer-account" onclick="go(\''+getLoginRedirect(getCurrentUser())+'\');closePublicNav()">'+(ar?"لوحة التحكم":"Dashboard")+'</button>'
      :'<button class="login" onclick="go(\'login\');closePublicNav()">'+tr("login")+'</button>')+'</div>'+
  '</div>'+
  '<div class="public-overlay" onclick="closePublicNav()"></div>';
}
function togglePublicNav(){if(document.body.classList.toggle("public-nav-open")){closeThemeMenu();closeLangMenu()}}
function closePublicNav(){document.body.classList.remove("public-nav-open")}
function publicThemeSwitch(){
 var themes=MadarasatiTheme.listThemes();
 var ids=Object.keys(themes);
 var current=MadarasatiTheme.getCurrentThemeId();
 var customItem=(current==="custom")?'<button type="button" class="theme-menu-item active" onclick="closeThemeMenu()"><span class="theme-dot" style="background:#8a8f93"></span><span class="theme-dot" style="background:#b9a07a"></span><span>'+MadarasatiTheme.themeName("custom",lang)+'</span><b class="theme-check">✓</b></button><div class="theme-menu-sep"></div>':'';
 return '<div class="public-theme-switch" id="publicThemeSwitch">'+
  '<button type="button" class="theme-switch-btn theme-icon-btn" onclick="toggleThemeMenu(event)" aria-haspopup="true" aria-expanded="false" title="'+tr("theme")+'">'+icon("palette",17)+'</button>'+
  '<div class="theme-menu">'+
  customItem+
  ids.map(function(id){
   var t=themes[id];
   return '<button type="button" class="theme-menu-item'+(current===id?' active':'')+'" onclick="pickTheme(\''+id+'\')"><span class="theme-dot" style="background:'+t.primary+'"></span><span class="theme-dot" style="background:'+t.accent+'"></span><span>'+MadarasatiTheme.themeName(id,lang)+'</span>'+(current===id?'<b class="theme-check">✓</b>':'')+'</button>';
  }).join("")+
  '</div></div>';
}
function publicLangSwitch(){
 const ar=lang==="ar";
 return '<div class="hdr-lang" id="hdrLang">'+
  '<button type="button" class="hdr-icon" onclick="toggleLangMenu(event)" aria-haspopup="true" aria-expanded="false" title="'+tr("language")+'" aria-label="'+tr("language")+'">'+icon("globe",17)+'</button>'+
  '<div class="theme-menu hdr-lang-menu" role="menu">'+
   '<button type="button" role="menuitem" class="theme-menu-item'+(ar?" active":"")+'" onclick="setLang(\'ar\')"><span>العربية</span>'+(ar?'<b class="theme-check">✓</b>':'')+'</button>'+
   '<button type="button" role="menuitem" class="theme-menu-item'+(ar?"":" active")+'" onclick="setLang(\'en\')"><span>English</span>'+(ar?'':'<b class="theme-check">✓</b>')+'</button>'+
  '</div></div>';
}
function toggleLangMenu(e){
 if(e&&e.stopPropagation)e.stopPropagation();
 closeThemeMenu();
 var l=document.getElementById("hdrLang");
 if(l)l.classList.toggle("open");
}
function closeLangMenu(){var l=document.getElementById("hdrLang");if(l)l.classList.remove("open")}

function card(p,i=0){
 return `<article class="school-card">
  <div class="school-img"><img src="assets/images/${p.img}"><span class="school-tag ${p.t.includes("حكومية")?"gov":""}">${p.t}</span></div>
  <div class="school-body"><h3>${p.n}</h3><p>⌖ ${p.l}</p>
  <div class="rating"><span><b>${p.r}</b> <span class="star">★</span> (${p.rv})</span></div>
  <div class="metrics"><div><b>${p.s}</b>طالب</div><div><b>${p.m}</b>معلم</div><div><b>3</b>مراحل</div></div>
  </div></article>`
}
function landing(){
 var ar=lang==="ar";
 var featured=orgData.items.slice(0,4).map(function(o){return orgCard(orgCardFromApi(o))});
 var featuredHtml=featured.length?featured.join(""):'<div class="empty-state">'+(ar?"لا توجد مؤسسات معروضة بعد":"No institutions to show yet")+'</div>';
 var featuredTeachers=teacherData.items.slice(0,4).map(function(x){return teacherCard(x)}).join("");
 var orgCount=orgData.loaded&&!orgData.error?orgData.total:"—";
 var teacherCount=teacherData.loaded&&!teacherData.error?teacherData.total:"—";
 var governorateCount=Array.isArray(locData.governorates)?locData.governorates.length:"—";
  var body=
   '<section class="landing-hero" id="landingHero">'+
    '<div class="hero-photo" data-hero-slider id="heroSlidePhoto"><img src="assets/hero-slides/hero3.png" alt=""><div class="photo-note">'+(ar?"من هنا<br>نبني أجمل اليمن":"From here<br>we build Yemen's future")+'</div><div class="quote">'+(ar?"بالتعليم<br>نصنع مستقبلاً أكثر إشراقاً لليمن":"Through education<br>we build a brighter future")+'</div><div class="place">⌖ '+(ar?"صنعاء القديمة":"Old Sana'a")+'</div>'+
    '<button type="button" class="hero-arrow prev" data-hero-nav="prev" aria-label="'+(ar?"السابق":"Previous")+'">‹</button>'+
    '<button type="button" class="hero-arrow next" data-hero-nav="next" aria-label="'+(ar?"التالي":"Next")+'">›</button></div>'+
    '<div class="hero-copy"><div id="heroSlideContent" aria-live="polite"><span class="eyebrow">'+(ar?"منصة تربط الطلبة بأفضل المدارس والمعلمين في جميع المحافظات":"A platform connecting learners with schools and teachers across Yemen")+'</span>'+
     '<h1>'+(ar?'مدارس أفضل<br><span class="g">لمستقبل أكثر</span> <span class="b">إشراقاً</span>':'Better schools<br>for a <span class="g">brighter</span> <span class="b">future</span>')+'</h1>'+
     '<p>'+(ar?"اكتشف أفضل المدارس في اليمن، وقارن وتواصل بسهولة، وابنِ مستقبلاً أفضل لأبنائك.":"Discover schools across Yemen, compare options, connect easily, and build a better future for your family.")+'</p>'+
     '<div class="hero-buttons"><button class="btn green" onclick="document.getElementById(\'home-search\').focus()">'+tr("searchNow")+' 🔍</button><button class="btn" onclick="go(\'register\')">'+tr("createAccount")+' 👤</button></div></div>'+
     '<div class="hero-numbers"><div>'+esc(teacherCount)+'<span>'+(ar?"معلم ومعلمة":"Teachers")+'</span></div><div>'+esc(orgCount)+'<span>'+(ar?"مؤسسة تعليمية":"Institutions")+'</span></div><div>'+esc(governorateCount)+'<span>'+(ar?"محافظة متاحة":"Governorates")+'</span></div></div>'+
     '<div class="hero-dots" id="heroDots" role="tablist" aria-label="'+(ar?"شرائح العرض":"Slides")+'"></div>'+
     '<span class="sr-only" id="heroSlideLive" aria-live="polite"></span>'+
    '</div>'+
   '</section>'+
   '<div class="search-tabs"><button type="button" class="search-tab'+(homeSearchMode==="schools"?' active':'')+'" onclick="homeSearchTab(\'schools\')">🏫 '+(ar?"البحث عن مؤسسات":"Search institutions")+'</button><button type="button" class="search-tab'+(homeSearchMode==="teachers"?' active':'')+'" onclick="homeSearchTab(\'teachers\')">♙ '+(ar?"البحث عن معلمين":"Search teachers")+'</button></div>'+
   '<form class="search-row" onsubmit="homeSearch(event)"><input id="home-search" aria-label="'+(ar?"كلمة البحث":"Search term")+'" placeholder="'+(homeSearchMode==="teachers"?tr("searchTeacher"):(ar?"ابحث عن مؤسسة بالاسم...":"Search institutions by name..."))+'"><button class="btn green" type="submit">'+tr("searchBtn")+' 🔍</button></form>'+
   '<section class="featured"><div class="section-title"><div><h2>'+(ar?"المؤسسات التعليمية":"Educational institutions")+'</h2><p>'+(ar?"مؤسسات من دليل المنصة الموحّد":"Institutions from the platform directory")+'</p></div><button class="view-all" onclick="go(\'private\')">'+(ar?"عرض جميع المؤسسات":"View all institutions")+' ←</button></div><div class="school-grid">'+featuredHtml+'</div></section>'+
   '<section class="featured"><div class="section-title"><div><h2>'+(ar?"المعلمون":"Teachers")+'</h2><p>'+(ar?"ملفات المعلمين المتاحة من قاعدة بيانات المنصة":"Teacher profiles available from the platform")+'</p></div><button class="view-all" onclick="go(\'teachers\')">'+(ar?"عرض جميع المعلمين":"View all teachers")+' ←</button></div><div class="school-grid">'+(featuredTeachers||'<div class="empty-state">'+esc(tr("noTeachers"))+'</div>')+'</div></section>'+
   (getCurrentUser()&&getCurrentUser().role==="admin"?'<div class="featured"><button class="btn green" onclick="go(\'students\')">'+icon("users",16)+' '+(ar?"إدارة العملاء":"Manage clients")+'</button></div>':"")+
   '<div class="bottom-stats"><div class="lead">'+(ar?"معاً لتعليم أفضل":"Together for better education")+'<span>'+(ar?"فرص متكافئة • مستقبل مشرق":"Equal opportunity • brighter future")+'</span></div><div class="bs"><b>'+esc(governorateCount)+'</b><span>'+(ar?"محافظة":"Governorates")+'</span></div><div class="bs"><b>'+esc(orgCount)+'</b><span>'+(ar?"مؤسسة تعليمية":"Institutions")+'</span></div><div class="bs"><b>'+esc(teacherCount)+'</b><span>'+(ar?"معلم ومعلمة":"Teachers")+'</span></div></div>';
 return publicShell(body);
}
function homeSearchTab(mode){homeSearchMode=mode;render();var input=document.getElementById("home-search");if(input)input.focus()}
function homeSearch(e){e.preventDefault();var input=document.getElementById("home-search");homeSearchPending={mode:homeSearchMode,q:input?input.value.trim():""};go(homeSearchMode==="teachers"?"teachers":"private")}
function teacherContactSelected(button){
 var phone=button&&button.getAttribute("data-phone"),url=waLink(phone);
 if(!url)return;
 var subject=document.getElementById("tv-subject-choice"),name=subject?subject.value:"";
 var message=(lang==="ar"?"مرحباً، أود الاستفسار عن درس ":"Hello, I would like to ask about a lesson in ")+name;
 window.open(url+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
}

function sectionConfig(r){
 var keys={
  private:["privateSchools","school","privateSub"],
  government:["governmentSchools","school","governmentSub"],
  colleges:["colleges","college","collegesSub"],
  institutes:["institutes","institute","institutesSub"],
  teachers:["privateTeachers","teacher","teachersSub"]
 };
 var m=keys[r]||keys.private;
 return {title:tr(m[0]),icon:m[1],sub:tr(m[2])};
}
function sectionHead(cfg,count){
 var c='';
 if(count!=null)c='<div class="sh-count"><b>'+count+'</b><span>'+tr("results")+'</span></div>';
 return '<div class="section-head"><div class="sh-ico">'+icon(cfg.icon,24)+'</div><div class="sh-copy"><h1>'+esc(cfg.title)+'</h1><p>'+esc(cfg.sub)+'</p></div>'+c+'</div>';
}
function govOptionsHtml(){
 var opts=[opt("",tr("allGovernorates"),filters.governorate==="")];
 (locData.governorates||[]).forEach(function(g){opts.push(opt(g.code,g.name,filters.governorate===g.code))});
 return opts.join("");
}
function orgTypeSelectHtml(r){
 var routeType=orgTypeForRoute(r);
 var sel=filters.orgType===""||filters.orgType==null?(routeType||"all"):filters.orgType;
 var codes=["private_school","government_school","college","university","institute"];
 return opt("all",tr("allOrgTypes"),sel==="all")+
  codes.map(function(c){return opt(c,orgTypeLabel(c),sel===c)}).join("");
}
function publicFilters(r){
 return '<section class="search-panel" aria-label="'+esc(tr("searchModelTitle"))+'">'+
  '<div class="sp-head"><span class="sp-ico">'+icon("search",18)+'</span><h2>'+esc(tr("searchModelTitle"))+'</h2><button class="sp-reset" onclick="resetFilters(true)">'+esc(tr("reset"))+'</button></div>'+
  '<div class="sp-grid">'+
   '<div class="sp-field"><label for="f-gov">'+esc(tr("governorate"))+'</label><select id="f-gov" class="f-select" onchange="onGovernorateChange()" aria-label="'+esc(tr("governorate"))+'">'+govOptionsHtml()+'</select></div>'+
   '<div class="sp-field"><label for="f-district">'+esc(tr("district"))+'</label><select id="f-district" class="f-select" onchange="onDistrictChange()" disabled aria-label="'+esc(tr("district"))+'">'+opt("",tr("allDistricts"))+'</select></div>'+
   '<div class="sp-field"><label for="f-nb">'+esc(tr("neighborhood"))+'</label><select id="f-nb" class="f-select" onchange="onNeighborhoodChange()" disabled aria-label="'+esc(tr("neighborhood"))+'">'+opt("",tr("allNeighborhoods"))+'</select></div>'+
   '<div class="sp-field"><label for="f-type">'+esc(tr("orgType"))+'</label><select id="f-type" class="f-select" onchange="onOrgTypeChange()" aria-label="'+esc(tr("orgType"))+'">'+orgTypeSelectHtml(r)+'</select></div>'+
  '</div>'+
  '<div class="sp-field sp-keyword"><label for="f-q">'+esc(tr("keywordLabel"))+'</label>'+
   '<div class="f-search">'+icon("search",15)+'<input id="f-q" value="'+esc(filters.q)+'" placeholder="'+esc(tr("keywordPlaceholder"))+'" oninput="onFilterInput(this.value)" onkeydown="if(event.key===\'Enter\')applyFiltersNow()" aria-label="'+esc(tr("keywordLabel"))+'"><button class="f-clear" onclick="clearSearch()" aria-label="'+tr("reset")+'"'+(filters.q?'':' style="display:none"')+'>'+icon("x",13)+'</button></div></div>'+
  '<div class="sp-actions"><button class="btn sp-search" onclick="applyFiltersNow()">'+icon("search",15)+' '+esc(tr("searchBtn"))+'</button><button class="btn sp-map" onclick="searchOnMap()">'+icon("map",15)+' '+esc(tr("viewOnMap"))+'</button></div>'+
 '</section>';
}
function teacherFilters(){
 return '<div class="f-grid f-grid-teachers">'+
  '<div class="f-search">'+icon("search",15)+'<input id="t-q" value="'+esc(teacherQuery)+'" placeholder="'+tr("searchTeacher")+'" oninput="onTeacherSearch(this.value)" aria-label="'+tr("searchTeacher")+'">'+(teacherQuery?'<button class="f-clear" onclick="clearTeacherSearch()" aria-label="'+tr("reset")+'">'+icon("x",13)+'</button>':'')+'</div>'+
 '</div>';
}
function viewSwitchHtml(){
 return '<div class="view-switch">'+
  '<button class="'+(mapView?"":"active")+'" onclick="setMapView(false)">'+icon("grid",14)+' '+tr("listView")+'</button>'+
  '<button class="'+(mapView?"active":"")+'" onclick="setMapView(true)">'+icon("map",14)+' '+tr("mapView")+'</button>'+
 '</div>';
}
function orgCountHtml(){
 if(orgData.loading||!orgData.loaded)return '';
 return '<div class="f-count">'+orgData.total+' '+tr("results")+'</div>';
}
function mapPanel(items){
 if(!items.length)return '<div class="empty-state">'+tr("noResults")+'</div>';
 var hasEmbed=false;
 var rows=items.map(function(o){
  var embed="";
  if(o.mapUrl&&/^https:\/\//i.test(o.mapUrl)){
   hasEmbed=true;
   embed='<div class="map-embed"><iframe src="'+esc(o.mapUrl)+'" loading="lazy" title="'+esc(o.name)+'" allowfullscreen></iframe></div>';
  }
  return '<div class="map-row">'+embed+'<div class="map-row-info"><b>'+esc(o.name)+'</b><p>'+icon("pin",12)+' '+esc(orgLocText(o))+'</p><a class="btn brown map-link" href="'+googleMapsUrl(o)+'" target="_blank" rel="noopener">'+icon("map",13)+' '+tr("viewOnMap")+'</a></div></div>';
 }).join("");
 return '<div class="map-panel"><div class="map-note">'+icon("map",13)+' '+tr("mapNote")+'</div>'+rows+'</div>';
}
function gridBody(){
 if(orgData.loading)return '<div class="loading-inline"><div class="loader"></div></div>';
 if(orgData.error)return '<div class="empty-state">'+esc(orgData.error)+'</div>';
 if(!orgData.items.length)return '<div class="empty-state">'+tr("noResults")+'</div>';
 return '<div class="directory-grid">'+orgData.items.map(function(o){return orgCard(orgCardFromApi(o))}).join("")+'</div>';
}
function directory(r){
 var cfg=sectionConfig(r);
 var body='<div class="directory-body">'+sectionHead(cfg,orgData.loaded&&!orgData.loading?orgData.total:null);
  body+=publicFilters(r);
 body+='<div class="view-row">'+viewSwitchHtml()+orgCountHtml()+'</div>';
 if(mapView&&orgData.loaded&&!orgData.loading)body+=mapPanel(orgData.items);
 else body+=gridBody();
 return publicShell(body+'</div>');
}

function teacherCard(t,opts){
 opts=opts||{};
 var exp=t.experienceYears||0;
 var sub=t.headline||(t.subjects&&t.subjects.length?t.subjects.slice(0,3).map(function(s){return s.name}).join(" · "):"");
 var quals=sub?'<p class="tq">'+esc(sub)+'</p>':'';
 var trav=(t.travelRadiusKm!=null&&t.travelRadiusKm!=="")?'<div><b>'+esc(t.travelRadiusKm)+'</b>'+(lang==="ar"?" كم نطاق":" km range")+'</div>':'';
 var name=t.userName||t.userEmail||"—";
 // The one avatar resolver the directory, the dashboard and the profile share, so
 // a teacher's real photo (or the deterministic illustrative portrait) appears on
 // every card instead of an initial.
 var m=(typeof MadrasatiMedia!=="undefined")?MadrasatiMedia.teacherMedia(t):null;
 var initial=esc((String(name).trim().charAt(0))||"م");
 var avatar=(m&&m.avatar)
  ?'<span class="teacher-avatar teacher-avatar-img"><img src="'+esc(m.avatar)+'" alt="'+esc(name)+'" loading="lazy" onerror="this.style.display=\'none\'"></span>'
  :'<span class="teacher-avatar">'+initial+'</span>';
 var adminActions=opts.admin?(
  '<div class="card-cta">'+
   '<button type="button" class="card-admin" title="'+esc(lang==="ar"?"تعديل":"Edit")+'" onclick="event.stopPropagation();acTeacherEdit(\''+t.id+'\')">'+icon("edit",13)+'</button>'+
   '<button type="button" class="card-admin" title="'+esc(lang==="ar"?"التفاصيل":"Details")+'" onclick="event.stopPropagation();acTeacherDetailOpen(\''+t.id+'\')">'+icon("eye",13)+'</button>'+
  '</div>'
 ):"";
 return '<article class="school-card teacher-card" role="link" tabindex="0" onclick="go(\'teacher?id='+encodeURIComponent(t.id)+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click()}">'+
  '<div class="teacher-head">'+avatar+'<div class="school-body"><h3>'+esc(name)+'</h3></div></div>'+
  '<div class="school-body">'+quals+(t.bio?'<p>'+esc(t.bio)+'</p>':'')+
  '<div class="metrics"><div><b>'+exp+'</b>'+tr("yrsExp")+'</div>'+trav+'</div>'+
  adminActions+
  '</div></article>';
}
function teacherPage(){
 var cfg=sectionConfig("teachers");
 var body='<div class="directory-body">'+sectionHead(cfg,teacherData.loaded&&!teacherData.loading?teacherData.items.length:null);
 body+=teacherFilters();
 if(teacherData.loading||!teacherData.loaded){body+='<div class="loading-inline"><div class="loader"></div></div>'}
 else if(teacherData.error){body+='<div class="empty-state">'+esc(teacherData.error)+'</div>'}
 else if(!teacherData.items.length){body+='<div class="empty-state">'+tr("noTeachers")+'</div>'}
 else{body+='<div class="directory-grid">'+teacherData.items.map(teacherCard).join("")+'</div>'}
 return publicShell(body+'</div>');
}

function onFilterInput(v){
 filters.q=v;
 // Toggle the inline clear button without re-rendering (keeps input focus).
 var btns=document.querySelectorAll("#f-q ~ .f-clear");
 for(var i=0;i<btns.length;i++){btns[i].style.display=v?"":"none"}
}
function clearSearch(){
 filters.q="";
 var q=document.getElementById("f-q");if(q)q.value="";
 var btns=document.querySelectorAll("#f-q ~ .f-clear");
 for(var i=0;i<btns.length;i++){btns[i].style.display="none"}
 orgPage.offset=0;mapView=false;loadOrgsFor(route());
}
function applyFiltersNow(){orgPage.offset=0;mapView=false;if(window.clientTrackSearch){var sel=document.getElementById("f-gov"),place=sel&&sel.value?sel.options[sel.selectedIndex].text:"";clientTrackSearch(route(),filters.q,place)}loadOrgsFor(route())}
function searchOnMap(){mapView=true;orgPage.offset=0;loadOrgsFor(route());render()}
function onOrgTypeChange(){
 var v=document.getElementById("f-type").value;
 // Normalize back to "" when the choice matches the route preset.
 filters.orgType=(v===orgTypeForRoute(route()))?"":v;
}
function onGovernorateChange(){
 var v=document.getElementById("f-gov").value;
 filters.governorate=v;filters.district="";filters.neighborhood="";filters.govId=null;filters.districtId=null;
 var gov=(locData.governorates||[]).filter(function(g){return g.code===v})[0]||null;
 filters.govId=gov?gov.id:null;
 var dSel=document.getElementById("f-district");
 var nSel=document.getElementById("f-nb");
 if(nSel){nSel.innerHTML=opt("",tr("allNeighborhoods"));nSel.disabled=true}
 if(!gov){
  if(dSel){dSel.innerHTML=opt("",tr("allDistricts"));dSel.disabled=true}
  return;
 }
 loadDistricts(gov.id).then(function(list){
  var d2=document.getElementById("f-district");if(!d2)return;
  if(!list.length){d2.innerHTML=opt("",tr("noOptions"));d2.disabled=true}
  else{d2.innerHTML=opt("",tr("allDistricts"))+list.map(function(x){return opt(x.code,x.name)}).join("");d2.disabled=false}
 });
}
function onDistrictChange(){
 var v=document.getElementById("f-district").value;
 filters.district=v;filters.neighborhood="";filters.districtId=null;
 var dist=(locData.districts[filters.govId]||[]).filter(function(x){return x.code===v})[0]||null;
 filters.districtId=dist?dist.id:null;
 var nSel=document.getElementById("f-nb");
 if(!dist){if(nSel){nSel.innerHTML=opt("",tr("allNeighborhoods"));nSel.disabled=true}return}
 loadNeighborhoods(dist.id).then(function(nbs){
  var n2=document.getElementById("f-nb");if(!n2)return;
  if(!nbs.length){n2.innerHTML=opt("",tr("noOptions"));n2.disabled=true}
  else{n2.innerHTML=opt("",tr("allNeighborhoods"))+nbs.map(function(x){return opt(x.name,x.name)}).join("");n2.disabled=false}
 });
}
function onNeighborhoodChange(){filters.neighborhood=document.getElementById("f-nb").value}
function resetFilters(reload){
 filters.q="";filters.governorate="";filters.district="";filters.neighborhood="";filters.govId=null;filters.districtId=null;filters.orgType="";
 mapView=false;
 if(reload){orgPage.offset=0;loadOrgsFor(route())}
}
function setMapView(v){mapView=v;render()}
function onTeacherSearch(v){
 teacherQuery=v;
 clearTimeout(teacherSearchTimeout);
 teacherSearchTimeout=setTimeout(function(){if(window.clientTrackSearch&&teacherQuery.trim())clientTrackSearch("teachers",teacherQuery,"");teacherData.cacheKey="q="+teacherQuery;loadTeachers(teacherQuery).then(function(){render()})},350);
}
function clearTeacherSearch(){onTeacherSearch("")}
function syncFilterControls(){
  var govSel=document.getElementById("f-gov");
  if(!govSel)return;
if(locData.governorates===null){
    if(sfState.governoratesLoaded)return;
    sfState.governoratesLoaded=true;
    govSel._loading=true;
    loadGovernorates().then(function(){sfState.governoratesLoaded=false;syncFilterControls()});
    return;
  }
  if(!govSel._synced||govSel._syncedKey!==filters.governorate){
   govSel.innerHTML=govOptionsHtml();
   govSel._synced=true;govSel._syncedKey=filters.governorate;
  }
  govSel.disabled=!locData.governorates.length;
  if(!locData.governorates.length){
   var d0=document.getElementById("f-district");if(d0){d0.innerHTML=opt("",tr("noGovernorates"));d0.disabled=true}
   var n0=document.getElementById("f-nb");if(n0){n0.innerHTML=opt("",tr("noGovernorates"));n0.disabled=true}
   return;
  }
 var gov=(locData.governorates||[]).filter(function(g){return g.code===filters.governorate})[0]||null;
 var dSel=document.getElementById("f-district");
 var nSel=document.getElementById("f-nb");
 if(!gov){
  if(dSel){dSel.innerHTML=opt("",tr("allDistricts"),true);dSel.disabled=true}
  if(nSel){nSel.innerHTML=opt("",tr("allNeighborhoods"),true);nSel.disabled=true}
  return;
 }
if(!locData.districts[filters.govId]){
   if(sfState.districtsLoading)return;
   sfState.districtsLoading=true;
   govSel._loadingDist=true;
   loadDistricts(gov.id).then(function(){sfState.districtsLoading=false;syncFilterControls()});
   if(dSel){dSel.innerHTML=opt("",(lang==="ar"?"جارٍ التحميل...":"Loading..."),true);dSel.disabled=true}
   return;
  }
  var dlist=locData.districts[filters.govId]||[];
  if(dSel&&dSel._syncedKey!==filters.district){
  if(!dlist.length){dSel.innerHTML=opt("",tr("noOptions"),true);dSel.disabled=true}
  else{dSel.innerHTML=opt("",tr("allDistricts"),filters.district==="")+dlist.map(function(x){return opt(x.code,x.name,filters.district===x.code)}).join("");dSel.disabled=false}
  dSel._syncedKey=filters.district;
 }
 var dist=dlist.filter(function(x){return x.code===filters.district})[0]||null;
 if(!dist){
  if(nSel){nSel.innerHTML=opt("",tr("allNeighborhoods"),true);nSel.disabled=true}
  return;
 }
if(!locData.neighborhoods[filters.districtId]){
   if(sfState.neighborhoodsLoading)return;
   sfState.neighborhoodsLoading=true;
   govSel._loadingNb=true;
   loadNeighborhoods(dist.id).then(function(){sfState.neighborhoodsLoading=false;syncFilterControls()});
   if(nSel){nSel.innerHTML=opt("",(lang==="ar"?"جارٍ التحميل...":"Loading..."),true);nSel.disabled=true}
   return;
  }
 var nlist=locData.neighborhoods[filters.districtId]||[];
 if(nSel&&nSel._syncedKey!==filters.neighborhood){
  if(!nlist.length){nSel.innerHTML=opt("",tr("noOptions"),true);nSel.disabled=true}
  else{nSel.innerHTML=opt("",tr("allNeighborhoods"),filters.neighborhood==="")+nlist.map(function(x){return opt(x.name,x.name,filters.neighborhood===x.name)}).join("");nSel.disabled=false}
  nSel._syncedKey=filters.neighborhood;
 }
}
// The approved admin sidebar, in order, and the only routes it may render.
// "Fees" is deliberately absent: fees are a property of the priced entity
// (stage, subject, course, service), never a standalone module with its own page.
//
// Institutions are ONE entry. Private schools, government schools, colleges,
// universities and institutes are five tabs of one screen over one shared
// organization core, so "institutesAdmin" and "collegesAdmin" are NOT sidebar
// entries — splitting them out duplicated the same catalog and made an
// institution's type look like three products. They survive only as route
// aliases so an old deep link still resolves to the unified screen, and the
// filter below makes that structural: an entry that is not on this list cannot
// render in the menu no matter what a caller passes in.
var ADMIN_SIDEBAR=[
 ["admin","home","home"],
 ["schools","school","schools"],
 ["teachersAdmin","teacher","teachers"],
 ["students","users","students"],
 ["bookings","calendar","bookings"],
 ["verify","shield","verify"],
 ["academic","college","academic"],
 ["locations","school","locations"],
 ["offers","chart","offers"],
 ["ads","chart","ads"],
 ["reports","chart","reports"],
 ["access","shield","usersAccess"],
 ["settings","settings","settings"]
];
var ADMIN_SIDEBAR_ROUTES=ADMIN_SIDEBAR.map(function(x){return x[0]});
function sideMenu(){
 var user=getCurrentUser();
 var role=user?user.role:null;
 var items;
 if(role==="admin"){
  items=ADMIN_SIDEBAR;
 }else if(role==="owner"){
  items=[["owner","home","myDashboard"]].concat(ADMIN_SIDEBAR.filter(function(x){return ["access","verify","offers","ads","slides","students"].indexOf(x[0])<0}));
 }else if(role==="teacher"){
  items=[["admin","home","home"],["bookings","calendar","bookings"]];
 }else if(role==="client"){
  items=[["client","home","myDashboard"]];
 }else{
  items=[["admin","home","home"]];
 }
 // Belt and braces: every role's list is filtered against the frozen routes, so
 // an institutions alias can never reintroduce a duplicate menu entry.
 items=items.filter(function(x){return x[0]==="owner"||x[0]==="client"||ADMIN_SIDEBAR_ROUTES.indexOf(x[0])>-1});
 return items.map(function(x){return '<button class="'+(route()===x[0]?"active":"")+'" onclick="go(\''+x[0]+'\');closeSidebar()"><span class="side-ico">'+icon(x[1],18)+'</span>'+tr(x[2])+'</button>'}).join("")
}
/* ---------- Unified section hero ----------
   Every admin section opens with the same branded banner: a themed photograph
   under a neutral scrim, the section title, an optional primary action, and a
   row of statistic cards. The figures are always supplied by the caller from
   real API data — this component only presents them, it never invents one. */
var SECTION_HERO={
 admin:{image:"assets/sections/dashboard.jpg",pos:"center 55%"},
 schools:{image:"assets/sections/schools.jpg",pos:"center 55%"},
 institutions:{image:"assets/sections/schools.jpg",pos:"center 55%"},
 institutesAdmin:{image:"assets/sections/schools.jpg",pos:"center 55%"},
 collegesAdmin:{image:"assets/sections/schools.jpg",pos:"center 55%"},
 teachersAdmin:{image:"assets/sections/teachers.jpg",pos:"center 38%"},
 teachers:{image:"assets/sections/teachers.jpg",pos:"center 38%"},
 students:{image:"assets/sections/clients.jpg",pos:"center 45%"},
 bookings:{image:"assets/sections/bookings.jpg",pos:"center 55%"},
 verify:{image:"assets/sections/verify.jpg",pos:"center 40%"},
 academic:{image:"assets/sections/academic.jpg",pos:"center 50%"},
 locations:{image:"assets/sections/locations.jpg",pos:"center 60%"},
 access:{image:"assets/sections/access.jpg",pos:"center 45%"},
 settings:{image:"assets/sections/settings.jpg",pos:"center 50%"},
 offers:{image:"assets/sections/offers.jpg",pos:"center 55%"},
 ads:{image:"assets/sections/ads.jpg",pos:"72% center"},
 slides:{image:"assets/sections/slides.jpg",pos:"center 55%"},
 reports:{image:"assets/sections/reports.jpg",pos:"center 55%"}
};
function sectionHeroConfig(r){return SECTION_HERO[r]||null}

// One cached platform headline for every section header (admin sections are
// admin-only, so /api/reports/headline is available). It powers the activity
// sparkline consistently across every page instead of a second calculation.
var __heroHeadline=null,__heroHeadlineLoading=false;
function heroHeadline(){
 if(!__heroHeadline&&!__heroHeadlineLoading){
  __heroHeadlineLoading=true;
  apiGet("/api/reports/headline").then(function(d){__heroHeadline=d;__heroHeadlineLoading=false;if(typeof render==="function")render()})
   .catch(function(){__heroHeadlineLoading=false});
 }
 return __heroHeadline;
}
function heroNum(v){var n=Number(v);return isFinite(n)?n.toLocaleString("en-US"):String(v==null?"0":v)}
function heroL(l){return l?(lang==="ar"?(l.ar||l.en):(l.en||l.ar)):""}

function heroDonutSvg(donut){
 donut=donut||{};var cats=(donut.categories||[]).filter(function(c){return Number(c.value)>0});
 var total=donut.total!=null?donut.total:cats.reduce(function(n,c){return n+Number(c.value)},0);
 if(!cats.length)return '<div class="rp-hviz-empty">'+esc(lang==="ar"?"لا توجد بيانات.":"No data.")+'</div>';
 var r=34,cx=44,cy=44,C=2*Math.PI*r,acc=0;
 var palette=["#7FD1AE","#E8A87C","#8FC3E0","#F2C879","#C7A8E0","#E39A8F"];
 var arcs=cats.map(function(c,i){
  var f=Number(c.value)/(total||1);
  var dash=(f*C).toFixed(2),gap=(C-f*C).toFixed(2),off=(-acc*C).toFixed(2);acc+=f;
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+palette[i%palette.length]+
   '" stroke-width="13" stroke-dasharray="'+dash+' '+gap+'" stroke-dashoffset="'+off+
   '" transform="rotate(-90 '+cx+' '+cy+')"><title>'+esc(heroL(c.label))+': '+heroNum(c.value)+'</title></circle>';
 }).join("");
 var legend=cats.slice(0,4).map(function(c,i){
  return '<span class="rp-hviz-leg"><i style="background:'+palette[i%palette.length]+'"></i>'+esc(heroL(c.label))+' '+heroNum(c.value)+'</span>';
 }).join("");
 return '<div class="rp-hviz-donut"><svg viewBox="0 0 88 88" role="img">'+arcs+
  '<text x="44" y="42" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">'+heroNum(total)+'</text>'+
  '<text x="44" y="57" text-anchor="middle" font-size="8" fill="rgba(255,255,255,.82)">'+esc(heroL(donut.center)||"")+'</text>'+
  '</svg><div class="rp-hviz-legend">'+legend+'</div></div>';
}
function heroSparkSvg(points){
 var vals=(points||[]).map(function(p){return Number(p.value)||0});
 if(!vals.length)vals=[0,0];
 var max=Math.max.apply(null,vals.concat([1]));
 var w=220,h=56,pad=4,step=(w-pad*2)/Math.max(1,vals.length-1);
 var pts=vals.map(function(v,i){return [pad+i*step,h-pad-(v/max)*(h-pad*2)]});
 var line=pts.map(function(p,i){return (i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)}).join(" ");
 var area=line+" L"+pts[pts.length-1][0].toFixed(1)+" "+(h-pad)+" L"+pad+" "+(h-pad)+" Z";
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" role="img">'+
  '<path d="'+area+'" fill="rgba(255,255,255,.2)"/>'+
  '<path d="'+line+'" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>';
}
function heroStatCard(s){
 var shown=(s.value==null||s.value==="")?"0":s.value;
 var n=Number(s.value);
 if(s.value!=null&&s.value!==""&&isFinite(n))shown=n.toLocaleString("en-US");
 return '<div class="rp-hstat tone-'+(s.tone||"primary")+'"><span class="rp-hstat-ico">'+icon(s.icon||"chart",18)+'</span>'+
  '<b>'+esc(shown)+'</b><span class="rp-hstat-label">'+esc(lang==="ar"?s.labelAr:s.labelEn)+'</span>'+
  (s.sub?'<small>'+esc(s.sub)+'</small>':'')+'</div>';
}
// The unified section header. It deliberately emits the same markup and class
// names as the Reports Center hero (`#/reports`) so every section — dashboard,
// institutions, teachers, clients, bookings, offers, advertisements, academic,
// locations, access, settings — is one identical header: themed photograph,
// title, live statistic cards and the two small visuals.
function sectionHero(o){
 o=o||{};
 var cfg=o.image?{image:o.image,pos:o.pos}:(SECTION_HERO[o.route||route()]);
 var hl=heroHeadline();
 var stats=(o.stats||[]).map(heroStatCard).join("");
 var donut=o.donut||null;
 var spark=o.spark||(hl?{title:{ar:"النشاط — آخر 14 يوماً",en:"Activity — last 14 days"},
   points:hl.activityDaily,foot:(lang==="ar"?"إجمالي الأحداث: ":"Total events: ")+heroNum(hl.activity)}:null);
 var visuals=(donut||spark)?'<div class="rp-hvisuals">'+
   (donut?'<div class="rp-hviz"><div class="rp-hviz-title">'+esc(heroL(donut.title))+'</div>'+heroDonutSvg(donut)+'</div>':'')+
   (spark?'<div class="rp-hviz"><div class="rp-hviz-title">'+esc(heroL(spark.title))+'</div>'+heroSparkSvg(spark.points)+(spark.foot?'<div class="rp-hviz-foot">'+esc(spark.foot)+'</div>':'')+'</div>':'')+
  '</div>':'';
 return '<header class="rp-hero rp-hero-rich">'+
  (cfg&&cfg.image?'<div class="rp-hero-photo" style="background-image:url(\''+cfg.image+'\');background-position:'+(cfg.pos||"center")+'"></div>':'')+
  '<div class="rp-hero-inner">'+
   '<div class="rp-hero-head"><div class="rp-hero-brand"><span class="rp-mark">'+(o.mark||"م")+'</span><div>'+
    '<div class="rp-hero-eyebrow">'+(o.eyebrow||"MADARASATI")+'</div>'+
    '<h1>'+esc(o.title||"")+'</h1>'+(o.subtitle?'<p>'+esc(o.subtitle)+'</p>':'')+'</div></div>'+
    '<div class="rp-hero-side">'+(o.actions||o.actionHtml||"")+
     (hl?'<div class="rp-hero-refresh"><span class="rp-live-dot"></span>'+(lang==="ar"?"آخر تحديث":"Last refresh")+' · '+esc(new Date(hl.generatedAt).toLocaleString(lang==="ar"?"ar-YE":"en-GB",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}))+'</div>':'')+
    '</div>'+
   '</div>'+
   '<div class="rp-hero-lower"><div class="rp-hstats">'+stats+'</div>'+visuals+'</div>'+
  '</div></header>';
}

function adminShell(body){
 var user=getCurrentUser();
 var userName=user?(lang==="ar"?user.name:user.name):tr("superAdmin");
 var userRole=user?(lang==="ar"?{"admin":"مدير النظام","owner":"مالك المؤسسة","teacher":"معلم","client":"عميل"}[user.role]||user.role:{"admin":"Super Admin","owner":"Owner","teacher":"Teacher","client":"Client"}[user.role]||user.role):tr("superAdmin");
 var avatarLetter=(userName&&userName.charAt(0))||"م";
 return '<div class="admin">'+
  '<div class="sidebar-overlay" onclick="closeSidebar()"></div>'+
  '<aside class="sidebar">'+
   '<div class="side-logo"><div class="logo-mark">م</div><div><b>'+(lang==="ar"?"مدرستي":"Madarasati")+'</b><small>Madarasati</small></div></div>'+
   '<div class="side-menu">'+sideMenu()+'</div>'+
   '<div class="side-user"><div class="avatar">'+avatarLetter+'</div><div><b>'+userName+'</b><small>'+userRole+'</small></div></div>'+
   '<div class="side-bottom-img"></div>'+
  '</aside>'+
  '<header class="admin-top">'+
   '<button class="hamburger-btn" onclick="toggleSidebar()" aria-label="'+(lang==="ar"?"القائمة":"Menu")+'">☰</button>'+
   '<div class="admin-user-mini">'+
    '<div class="avatar top-avatar">'+avatarLetter+'</div>'+
    '<div><b>'+userName+'</b><small>'+userRole+'</small></div>'+
   '</div>'+
   '<div class="admin-top-icons">'+
    '<button class="top-icon-btn" title="'+(lang==="ar"?"التنبيهات":"Notifications")+'">🔔<span class="notif-dot">3</span></button>'+
    '<button class="top-icon-btn" title="'+(lang==="ar"?"ملء الشاشة":"Fullscreen")+'">⛶</button>'+
   '</div>'+
   '<input class="admin-search" placeholder="'+tr("search")+'">'+
   '<div class="admin-date-block">'+
    '<b>'+(lang==="ar"?"الاثنين، 26 مايو 2026":"Monday, 26 May 2026")+'</b>'+
    '<small>⌖ '+(lang==="ar"?"صنعاء - اليمن":"Sana'a - Yemen")+'</small>'+
   '</div>'+
   '<div class="admin-top-actions">'+
    '<div class="admin-lang-switch" aria-label="'+tr("language")+'">'+
      '<button class="'+(lang==="ar"?"active":"")+'" onclick="setLang(\'ar\')">AR</button>'+
      '<button class="'+(lang==="en"?"active":"")+'" onclick="setLang(\'en\')">EN</button>'+
    '</div>'+
    '<button class="top-icon-btn" onclick="toggleTheme()" title="'+tr("theme")+'">◐</button>'+
    '<button class="top-icon-btn" onclick="handleLogout()" title="'+(lang==="ar"?"تسجيل الخروج":"Logout")+'" style="font-size:14px">⏻</button>'+
   '</div>'+
  '</header>'+
  '<main class="admin-content"><div class="admin-inner">'+body+'</div></main>'+
 '</div>'
}

/* ---------- Universal dedicated form page ----------
   Every add/edit screen in the platform (institutions, teachers, stages,
   grades, fees, offers, ads, slides) renders through this one builder, so the
   shape cannot drift between sections: a back link to the list, a single white
   card centred at 760px, the fields on a label/control grid that collapses to
   one column on mobile, and the two footer actions. Callers only supply the
   title, the field markup and the save/cancel handlers. UI only — no form here
   changes what the server accepts. */
function formPage(opts){
 var ar=lang==="ar",o=opts||{};
 var back=o.back||route()||"home";
 var backLabel=o.backLabel||(ar?"← العودة إلى القائمة":"← Back to the list");
 var cancel=o.onCancel||("go('"+back+"')");
 return adminShell(
  '<div class="uf-page">'+
   '<button type="button" class="uf-back" onclick="go(\''+esc(back)+'\')">'+esc(backLabel)+'</button>'+
   (o.title||o.subtitle?'<div class="uf-head">'+(o.title?'<h1>'+esc(o.title)+'</h1>':"")+
     (o.subtitle?'<p>'+esc(o.subtitle)+'</p>':"")+'</div>':"")+
   '<section class="uf-card">'+
    (o.error?'<div class="ac-form-error">'+esc(o.error)+'</div>':"")+
    (o.tabs||"")+
    '<div class="uf-grid">'+(o.body||"")+'</div>'+
    (o.foot||"")+
    // A wizard form supplies its own footer (Back / Next / one Save), so the
    // default pair is replaced rather than repeated on every step.
    (o.actions||('<div class="uf-actions">'+
     '<button type="button" class="btn green uf-save"'+(o.busy?" disabled":"")+' onclick="'+o.onSave+'">'+
      esc(o.busy?(ar?"جاري الحفظ...":"Saving..."):(o.saveLabel||(ar?"حفظ البيانات":"Save data")))+'</button>'+
     '<button type="button" class="btn uf-cancel" onclick="'+cancel+'">'+esc(ar?"إلغاء":"Cancel")+'</button>'+
    '</div>'))+
   '</section>'+
  '</div>');
}

/* ---------- Shared wizard pieces ----------
   A long form is split into ordered steps. Three primitives are shared by every
   tabbed form so the behaviour cannot drift between modules: the step strip, the
   Back/Next/Save footer, and the strict validator that refuses to submit while a
   required field is empty and sends the user to the step that owns it. */

// The step strip. `defs` is [[key,label],…]; `active` is the current key.
function ufTabStrip(defs,active,handler){
 return '<div class="uf-tabs uf-wizard-tabs">'+
  defs.map(function(x){
   return '<button type="button" class="'+(active===x[0]?"active":"")+
    '" onclick="'+handler+'(\''+x[0]+'\')">'+esc(x[1])+'</button>'}).join("")+
  '</div>';
}

// The footer. Back is disabled on the first step, Next becomes the single Save on
// the last one, and Cancel never disappears — all on one bar, never duplicated.
function ufWizardFooter(o){
 var ar=lang==="ar";
 var first=o.index<=0,last=o.index>=o.total-1;
 return '<div class="uf-actions uf-wizard-actions">'+
  '<button type="button" class="btn uf-cancel" onclick="'+o.onCancel+'">'+esc(ar?"إلغاء":"Cancel")+'</button>'+
  '<span class="uf-step-count">'+esc((o.index+1)+" / "+o.total)+'</span>'+
  '<button type="button" class="btn uf-back-step"'+(first?" disabled":"")+' onclick="'+o.onBack+'">'+
   esc(ar?"السابق":"Back")+'</button>'+
  (last
   ?'<button type="button" class="btn green uf-save"'+(o.busy?" disabled":"")+' onclick="'+o.onSave+'">'+
     esc(o.busy?(ar?"جاري الحفظ...":"Saving..."):(o.saveLabel||(ar?"حفظ البيانات":"Save data")))+'</button>'
   :'<button type="button" class="btn green uf-next-step" onclick="'+o.onNext+'">'+
     esc(ar?"التالي":"Next")+'</button>')+
 '</div>';
}

// Strict validation. Each form declares its required controls once, with the step
// that owns each one, so the guard and the "jump to the offending field" behaviour
// cannot disagree about what is missing or where it lives.
function ufValidate(rules){
 for(var i=0;i<(rules||[]).length;i++){
  var r=rules[i];
  var el=document.getElementById(r.id);
  var raw=el?(r.kind==="checkbox"?(el.checked?"1":""):String(el.value==null?"":el.value).trim()):"";
  var bad=!raw;
  if(!bad&&r.kind==="number")bad=isNaN(Number(raw))||Number(raw)<0;
  if(!bad&&r.min&&raw.length<r.min)bad=true;
  if(bad)return {tab:r.tab,id:r.id,label:r.label||r.id};
 }
 return null;
}

// The step the form should open on after a failed submit, plus the field to ring.
// render() re-paints the whole page, so the mark is applied after the paint.
var ufPendingInvalid=null;
function ufApplyInvalid(){
 var hit=ufPendingInvalid;ufPendingInvalid=null;
 if(!hit)return;
 var el=document.getElementById(hit.id);
 if(!el)return;
 el.classList.add("uf-invalid");
 var group=el.closest?el.closest(".form-group"):null;
 if(group)group.classList.add("uf-invalid-group");
 try{el.focus({preventScroll:false})}catch(e){try{el.focus()}catch(e2){}}
}
// A failed submit must also say *what* is missing, not only ring the field.
function ufValidationMessage(hit){
 if(!hit)return "";
 var ar=lang==="ar";
 return (ar?"أكمل الحقل المطلوب: ":"Complete the required field: ")+hit.label+
  (ar?" — في خطوة «":" — in step \"")+hit.tabLabel+(ar?"».":"\".");
}

/* ---------- Real file uploads ----------
   A form field that carries an image or a document is a real upload control: a
   file picker, a thumbnail preview, and explicit change/remove actions. The
   stored path is what the form submits, so nothing else about the payload changes.
   The bytes go up as a raw body (no multipart dependency) the same way the
   marketing banner upload already worked. */
function ufUploadPath(id){
 var el=document.getElementById(id+"-val");
 return el?String(el.value||""):"";
}
function ufProgress(id,text){
 var el=document.getElementById(id+"-status");
 if(el)el.textContent=text||"";
}
function ufPickFile(input){
 input.click();
}
window.ufImageUploadFile=function(input,id,scope){
 var file=input.files&&input.files[0];
 if(!file)return;
 var val=document.getElementById(id+"-val");
 var prev=document.getElementById(id+"-preview");
 var img=document.getElementById(id+"-img");
 var ph=document.getElementById(id+"-ph");
 // A local preview paints immediately, so the user sees the choice before the
 // upload finishes and never wonders whether the picker worked.
 try{
  if(prev&&window.URL&&URL.createObjectURL){
   var url=URL.createObjectURL(file);
   if(img)img.src=url;
   if(prev)prev.style.display="";
   if(ph)ph.style.display="none";
  }
 }catch(e){}
 ufProgress(id,lang==="ar"?"جاري الرفع...":"Uploading...");
 fetch(API_BASE+'/api/admin/uploads/image?scope='+encodeURIComponent(scope||"images"),{
  method:'POST',credentials:'include',
  headers:{'Content-Type':'application/octet-stream','X-File-Name':file.name},
  body:file
 }).then(function(r){
  return r.text().then(function(t){
   var d=null;try{d=JSON.parse(t)}catch(e){d=t}
   if(!r.ok)throw new Error((d&&d.error)||'upload failed');
   return d;});
 }).then(function(d){
  if(val)val.value=d.path||"";
  if(img&&d.url)img.src=d.url;
  ufProgress(id,lang==="ar"?"تم الرفع":"Uploaded");
 }).catch(function(e){
  if(val)val.value="";
  if(prev)prev.style.display="none";
  if(ph)ph.style.display="";
  ufProgress(id,"");
  alert(e.message||"upload failed");
 });
};
window.ufUploadClear=function(id){
 var val=document.getElementById(id+"-val");if(val)val.value="";
 var prev=document.getElementById(id+"-preview");if(prev)prev.style.display="none";
 var ph=document.getElementById(id+"-ph");if(ph)ph.style.display="";
 var input=document.getElementById(id);if(input)input.value="";
 ufProgress(id,"");
};

// scope: which upload folder the file lands in (avatars / logos / documents).
function ufImageUpload(id,label,current,scope,opts){
 var o=opts||{},ar=lang==="ar";
 var has=!!current;
 return '<div class="form-group uf-upload-group">'+
  '<label>'+esc(label)+'</label>'+
  '<div class="uf-upload">'+
   '<div class="uf-upload-preview" id="'+id+'-preview"'+(has?"":' style="display:none"')+'>'+
    '<img id="'+id+'-img" src="'+esc(has?current:"")+'" alt="">'+
   '</div>'+
   '<div class="uf-upload-empty" id="'+id+'-ph"'+(has?' style="display:none"':"")+'>'+
    icon("download",20)+'<span>'+esc(ar?"لم يُرفع ملف بعد":"No file uploaded yet")+'</span>'+
   '</div>'+
   '<div class="uf-upload-actions">'+
    '<input type="file" id="'+id+'" class="uf-file-input" accept="'+
      esc(o.accept||"image/png,image/jpeg,image/webp")+'" onchange="ufImageUploadFile(this,\''+id+'\',\''+esc(scope||"images")+'\')">'+
    '<button type="button" class="btn" onclick="document.getElementById(\''+id+'\').click()">'+
      icon("plus",14)+' '+(has?(ar?"تغيير الملف":"Change file"):(ar?"اختيار ملف":"Choose file"))+'</button>'+
    '<button type="button" class="btn uf-upload-remove" onclick="ufUploadClear(\''+id+'\')">'+
      icon("trash",14)+' '+(ar?"حذف":"Remove")+'</button>'+
    '<span class="uf-upload-status" id="'+id+'-status"></span>'+
   '</div>'+
   '<input type="hidden" id="'+id+'-val" value="'+esc(current||"")+'">'+
  '</div>'+
  (o.hint?'<small class="ac-hint">'+esc(o.hint)+'</small>':"")+
 '</div>';
}
var dashboardData={pendingRegistrations:0,connected:false};

function kpis(){
 var ar=lang==="ar";
 var pending=dashboardData.connected?dashboardData.pendingRegistrations:"—";
 var notConnected="—";
 var a=[
  [notConnected,ar?"المدارس":"Schools","school","green",true],
  [notConnected,ar?"الكليات":"Colleges","college","blue",true],
  [notConnected,ar?"المعاهد":"Institutes","institute","brown",true],
  [notConnected,ar?"المعلمون":"Teachers","teacher","green",true],
  [notConnected,ar?"الحجوزات":"Bookings","calendar","brown",true],
  [pending,ar?"بانتظار التحقق":"Pending verification","shield","red",dashboardData.connected]
 ];
 return '<div class="kpis">'+a.map(function(x){
  var val=x[0];
  var connected=x[4];
  var subtitle=connected?(ar?"متصل":"Connected"):(ar?"غير متصل بعد":"Not yet connected");
  return '<div class="kpi '+x[3]+'"><div class="kpi-icon">'+icon(x[2],20)+'</div><div class="kpi-copy"><h3>'+val+'</h3><span>'+x[1]+'</span><small>'+subtitle+'</small></div></div>'
 }).join("")+'</div>'
}
function table(){
 return orgTable()
}
function admin(){
 return adminShell('<div class="welcome"><div><h1>'+(lang==="ar"?"مرحباً بك في منصة مدرستي ☀":"Welcome to Madarasati")+'</h1><p>'+(lang==="ar"?"نظرة شاملة على أداء المنصة اليوم":"Overview of platform performance today")+'</p></div></div>'+kpis()+'<section class="panel"><div class="panel-title"><div><h2>'+(lang==="ar"?"المدارس":"Schools")+'</h2><p>'+(lang==="ar"?"إدارة ومتابعة جميع المدارس المسجلة في المنصة":"Manage all schools registered on the platform")+'</p></div><button class="btn brown" onclick="go(\'schools\')">'+icon("plus",15)+' '+(lang==="ar"?"إضافة مدرسة":"Add school")+'</button></div><div class="toolbar"><input placeholder="'+(lang==="ar"?"ابحث عن مدرسة ...":"Search schools ...")+'"><select><option>'+(lang==="ar"?"كل الحالات":"All statuses")+'</option></select><select><option>'+tr("allGovernorates")+'</option></select><button class="btn">'+(lang==="ar"?"تصفية":"Filter")+'</button></div>'+table()+'</section>');
}
/* ---------- Institution detail: the shared organization core ----------
   One screen serves every institution type because the five blocks below are
   the fields all of them share. Type-specific data is added on top, never in
   place of, this core. */

// Delivery is an attribute with exactly three values: حضوري / عن بُعد / مدمج.
// The legacy teaching-methods catalog also carried pedagogy rows and an ACTIVE
// entry that used to render as "نشط" here — a status word that does not belong
// in a delivery list. Anything that is not a delivery signal resolves through
// the legacy map instead of being relabelled as a status.
var DELIVERY_LABELS={
 on_site:{ar:"حضوري",en:"On-site"},
 online:{ar:"عن بُعد",en:"Online"},
 hybrid:{ar:"مدمج",en:"Blended"}
};
var LEGACY_METHOD_LABELS={
 TRAD:{ar:"التلقين المباشر",en:"Direct instruction"},
 MONTESSORI:{ar:"منتسوري",en:"Montessori"}
};
function deliveryValue(code){
 var c=String(code==null?"":code).trim().toLowerCase();
 if(c==="on_site"||c==="onsite"||c==="residential"||c==="in_person"||c==="attendance")return "on_site";
 if(c==="online"||c==="remote"||c==="distance"||c==="e_learning")return "online";
 if(c==="hybrid"||c==="blended"||c==="mixed")return "hybrid";
 return c;
}
function detailDeliveryLabel(code){
 var v=deliveryValue(code);
 if(DELIVERY_LABELS[v])return DELIVERY_LABELS[v][lang==="ar"?"ar":"en"];
 var legacy=LEGACY_METHOD_LABELS[v];
 if(legacy)return legacy[lang==="ar"?"ar":"en"];
 return code;
}
function detailGenderLabel(g){
 var ar={male:"بنين",female:"بنات",mixed:"مختلط"};
 if(lang!=="ar")return {male:"Boys",female:"Girls",mixed:"Mixed"}[g]||g;
 return ar[g]||g;
}
function detailCurriculumLabel(c){
 if(!c)return "—";
 var key=String(c).replace(/^curriculum_/,"").toUpperCase();
 var ar={AHLI:"أهلي",WAZARI:"وزاري",DOWALI:"دولي",CUSTOM:"مخصص"};
 if(lang!=="ar")return {AHLI:"Private",WAZARI:"National",DOWALI:"International",CUSTOM:"Custom"}[key]||c;
 return ar[key]||c;
}
function detailDocType(d){return ownDocTypeLabel(d)}
function detailLangLabel(l){
 var ar={AR:"العربية",EN:"الإنجليزية",FR:"الفرنسية"};
 if(lang==="ar")return ar[l]||l;
 return {AR:"Arabic",EN:"English",FR:"French"}[l]||l;
}
function detailBytes(n){
 var b=Number(n||0);if(!b)return "";
 if(b<1024)return b+" B";
 if(b<1024*1024)return (b/1024).toFixed(1)+" KB";
 return (b/(1024*1024)).toFixed(1)+" MB";
}
// admin-core keeps its own badge() private to its IIFE, so the detail screen
// carries its own copy with the same colour mapping.
function coreBadge(v){
 var ok=["active","verified","approved","accepted","completed","confirmed"].indexOf(v)>-1;
 var bad=["suspended","rejected","deleted","cancelled","inactive"].indexOf(v)>-1;
 return '<span class="badge '+(ok?"ok":bad?"bad":"wait")+'">'+esc(statusLabel(v))+'</span>';
}
// There is a single institutions screen now, and it holds all five types as
// tabs, so the back button always returns there. The per-type routes it used to
// pick between no longer exist as separate destinations.
function backRouteForOrg(){
 return "schools";
}

function detailBlock(isPublic){
 var ar=lang==="ar";
 if(!currentOrg){
  return '<div class="detail-card"><div class="empty-state">'+(ar?"جاري التحميل...":"Loading...")+'</div></div>';
 }
 var o=currentOrg;
 var loc=[o.governorate,o.district,o.neighborhood].filter(Boolean).join(" · ");
 // Without stored coordinates the map button still has to land somewhere useful,
 // so it falls back to a Google Maps search on the institution name combined
 // with its neighbourhood, district and governorate.
 var mapQuery=[o.name,o.neighborhood,o.district,o.governorate].filter(Boolean).join(" ");
 var mapHref=o.mapUrl||(o.latitude&&o.longitude
  ?"https://www.google.com/maps?q="+encodeURIComponent(o.latitude+","+o.longitude)
  :(mapQuery?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(mapQuery):""));

 // ---- 1. profile hero (identity, contact strip) ----
 var editable=!isPublic&&canEditOrg(o);
 var gated0=(orgOffering()&&orgOffering().pricingGated===true);
 function contactItem(ic,label,value,href){
  if(!value)return "";
  var v=String(value).replace(/^https?:\/\//,"");
  var inner=icon(ic,16)+'<span class="phc-label">'+esc(label)+'</span><span class="phc-value">'+esc(v)+'</span>';
  return href?'<a class="phc-item" href="'+esc(href)+'"'+(href.indexOf("http")===0?' target="_blank" rel="noopener noreferrer"':'')+'>'+inner+'</a>':'<span class="phc-item">'+inner+'</span>';
 }
 function statTile(ic,val,label){
  return '<div class="profile-stat"><span class="profile-stat-ic">'+icon(ic,20)+'</span><b>'+esc(val==null?"—":String(val))+'</b><span>'+esc(label)+'</span></div>';
 }
 function factItem(ic,label,value,href){
  var v=(value==null||value==="")?"—":value;
  var val=href&&value?'<a href="'+esc(href)+'"'+(href.indexOf("http")===0?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(v)+'</a>':esc(v);
  return '<div class="profile-fact"><span class="profile-fact-ic">'+icon(ic,16)+'</span><span class="profile-fact-label">'+esc(label)+'</span><span class="profile-fact-value">'+val+'</span></div>';
 }
 var hero='<section class="core-hero profile-hero">'+
  '<div class="core-hero-top">'+
   '<button class="core-action" onclick="go(backRouteForOrg())">'+icon("back",15)+' <span>'+esc(tr("backToInstitutions"))+'</span></button>'+
   '<div class="core-hero-badges">'+coreBadge(o.verified?"verified":o.verificationStatus||"pending")+
   coreBadge(o.registrationOpen?"active":"inactive")+'</div>'+
  '</div>'+
  '<div class="profile-hero-main">'+
   '<div class="core-logo"><img src="'+esc(orgLogo(o))+'" alt="'+esc(o.name)+'"></div>'+
   '<div class="profile-hero-copy">'+
    '<h2>'+esc(o.name)+'</h2>'+
    (o.nameEn?'<div class="profile-hero-en" dir="ltr">'+esc(o.nameEn)+'</div>':"")+
    '<div class="core-sub">'+esc(orgTypeLabel(o.type))+(o.slug?' · '+esc(o.slug):'')+'</div>'+
    (o.description||o.bio?'<p class="profile-hero-tag">'+esc(o.description||o.bio)+'</p>':'')+
    (loc?'<div class="profile-hero-chips">'+icon("pin",13)+' <span>'+esc(loc)+'</span></div>':'')+
   '</div>'+
  '</div>'+
  '<div class="profile-hero-contact">'+
   contactItem("globe",tr("websiteLabel"),o.website,o.website)+
   contactItem("mail",tr("email"),o.email,o.email?"mailto:"+o.email:"")+
   contactItem("phone",tr("phoneLabel"),o.phone,telLink(o.phone))+
   contactItem("whatsapp",tr("whatsapp"),o.whatsapp||o.phone,waLink(o.whatsapp||o.phone))+
  '</div>'+
 '</section>';

 var tabs='<nav class="profile-tabs">'+
  '<button onclick="scrollToProfile(\'profileGeneral\')">'+icon("file",15)+'<span>'+esc(tr("generalInfo"))+'</span></button>'+
  '<button onclick="scrollToProfile(\'profileAcademic\')">'+icon("school",15)+'<span>'+esc(tr("academicPrograms"))+'</span></button>'+
  '<button onclick="scrollToProfile(\'profileFacilities\')">'+icon("building",15)+'<span>'+esc(tr("facilitiesServices"))+'</span></button>'+
  '<button onclick="scrollToProfile(\'profileDocs\')">'+icon("doc",15)+'<span>'+esc(tr("myDocuments"))+'</span></button>'+
 '</nav>';

 var actions='<section class="panel profile-panel"><div class="panel-title"><h2>'+esc(tr("profileActions"))+'</h2></div>'+
  '<div class="profile-actions">'+
   (editable?'<button class="btn green" onclick="acOrgEdit(\''+o.id+'\')">'+icon("edit",15)+' '+esc(tr("editLabel"))+'</button>':'')+
   '<button class="btn" onclick="printInstitution()">'+icon("printer",15)+' '+esc(tr("printReport"))+'</button>'+
   '<button class="btn" onclick="exportInstitution(\'pdf\')">'+icon("pdf",15)+' '+esc(tr("exportPdf"))+'</button>'+
   '<button class="btn" onclick="exportInstitution(\'docx\')">'+icon("doc",15)+' '+esc(tr("exportDocx"))+'</button>'+
   '<button class="btn" onclick="exportInstitution(\'xlsx\')">'+icon("sheet",15)+' '+esc(tr("exportXlsx"))+'</button>'+
   '<button class="btn" onclick="shareInstitution()">'+icon("share",15)+' '+esc(tr("share"))+'</button>'+
   (editable?'<button class="btn brown" onclick="orgStageFormOpen(null)">'+icon("plus",15)+' '+esc(tr("addStageLabel"))+'</button>':'')+
  '</div></section>';

 // ---- 2. about + institution details ----
 var aboutImg=(o.gallery&&o.gallery.length)?o.gallery[0]:((o.image&&!/\.svg(\?.*)?$/i.test(o.image))?o.image:"assets/images/school-detail-cover.jpg");
 var about='<section class="panel profile-panel" id="profileGeneral"><div class="panel-title"><h2>'+esc(tr("aboutInstitution"))+'</h2></div>'+
  '<div class="profile-about">'+
   '<div class="profile-about-text"><p>'+esc(o.description||o.bio||tr("noDescription"))+'</p></div>'+
   '<div class="profile-about-media"><img src="'+esc(aboutImg)+'" alt="'+esc(o.name)+'" onerror="this.parentNode.style.display=\'none\'"></div>'+
  '</div>'+
  '<div class="profile-stats">'+
   statTile("school",(o.stages||[]).length,tr("stagesCountLabel"))+
   statTile("doc",(o.subjects||[]).length,tr("subjects"))+
   statTile("building",(detailExtras.facilities||[]).length,tr("facilitiesLabel"))+
   statTile("users",o.seatsAvailable,tr("seatsLabel"))+
  '</div></section>';

 var details='<section class="panel profile-panel"><div class="panel-title"><h2>'+esc(tr("institutionDetail"))+'</h2></div>'+
  '<div class="profile-facts">'+
   factItem("school",tr("typeLabel"),orgTypeLabel(o.type))+
   factItem("chart",tr("curriculumLabel"),detailCurriculumLabel(o.curriculum))+
   factItem("globe",tr("languageLabel"),(o.languages||[]).map(detailLangLabel).join(" / "))+
   factItem("users",ar?"الجنس":"Gender",detailGenderLabel(o.gender))+
   factItem("pin",tr("exactLocation"),loc)+
   factItem("map",ar?"العنوان":"Address",o.address)+
   factItem("phone",tr("phoneLabel"),o.phone,telLink(o.phone))+
   factItem("mail",tr("email"),o.email,o.email?"mailto:"+o.email:"")+
   factItem("globe",tr("websiteLabel"),o.website,o.website)+
   factItem("shield",tr("accreditation"),o.verified?tr("docVerified"):tr("statusPending"))+
  '</div></section>';

 // ---- 2. contact + owner ----
 function row(label,value,link){
  var v=value||"—";
  return '<div class="core-row"><span>'+esc(label)+'</span><b>'+(link?'<a href="'+esc(link)+'">'+esc(v)+'</a>':esc(v))+'</b></div>';
 }
 var contact='<section class="panel core-panel"><div class="panel-title"><h2>'+esc(tr("contactInfo"))+'</h2></div>'+
  '<div class="core-rows">'+
  row(tr("principalLabel"),o.principalName)+
  row(tr("ownerLabel"),o.ownerId||(ar?"غير مرتبط بمالك":"No owner linked"))+
  row(tr("phoneLabel"),o.phone,telLink(o.phone))+
  row(tr("whatsapp"),o.whatsapp,waLink(o.whatsapp||o.phone))+
  row(tr("email"),o.email,o.email?"mailto:"+o.email:"")+
  row(tr("websiteLabel"),o.website,o.website)+
  '</div><div class="core-row-actions">'+waButton(o.whatsapp||o.phone,{label:tr("whatsapp")})+'</div></section>';

 // ---- 3. location ----
 var location='<section class="panel core-panel"><div class="panel-title"><h2>'+esc(tr("exactLocation"))+'</h2></div>'+
  (loc||o.address?'<div class="core-rows">'+
   row(tr("governorate"),o.governorate)+row(tr("district"),o.district)+row(tr("neighborhood"),o.neighborhood)+
   row(ar?"العنوان":"Address",o.address)+
   row(ar?"الإحداثيات":"Coordinates",o.latitude&&o.longitude?o.latitude+", "+o.longitude:"")
   +'</div>':"")+
  (mapHref?'<div class="core-map"><a class="btn green" href="'+esc(mapHref)+'" target="_blank" rel="noopener noreferrer">'+icon("map",15)+' '+esc(tr("openMap"))+'</a></div>'
   :'<div class="empty-state">'+esc(tr("locationUnavailable"))+'</div>')+
  '</section>';

 // ---- 4. documents and licences ----
 var docs=detailExtras.docs||[];
 var docsHtml=docs.length?
  '<div class="table-wrap"><table class="tbl"><thead><tr><th>'+esc(tr("docType"))+'</th><th>'+esc(tr("docFile"))+
  '</th><th>'+esc(tr("reqStatus"))+'</th><th></th></tr></thead><tbody>'+
  docs.map(function(d){
   return '<tr><td><b>'+esc(detailDocType(d.docType))+'</b></td>'+
    '<td>'+esc(d.fileName||"—")+'<div class="entity-sub">'+esc(detailBytes(d.fileSize))+'</div></td>'+
    '<td>'+coreBadge(d.status)+'</td>'+
    '<td><div class="crud-actions"><a class="crud view" style="text-decoration:none" title="'+esc(tr("downloadDoc"))+
    '" href="/api/documents/'+encodeURIComponent(d.id)+'/file" target="_blank" rel="noopener">'+icon("download",14)+'</a></div></td></tr>';
  }).join("")+'</tbody></table></div>'
  :'<div class="empty-state">'+esc(isPublic?tr("pricingGated"):tr("noDocuments"))+'</div>';
 var documents='<section class="panel core-panel"><div class="panel-title"><h2>'+esc(tr("myDocuments"))+'</h2></div>'+docsHtml+'</section>';

 // ---- 5. facilities, services and accreditation ----
 var fac=detailExtras.facilities||[];
 var svc=detailExtras.services||[];
 function chips(list,isService){
  if(!list.length)return "";
  return '<div class="core-chips">'+list.map(function(x){
   var off=x.available===false;
   var extra=isService&&x.price!=null&&Number(x.price)>0?(gated?' <b class="gated-value">'+esc(tr("pricingGated"))+'</b>':' <b>'+Number(x.price).toLocaleString(lang==="ar"?"ar-YE":"en-US")+' '+esc(x.currency||"YER")+'</b>'):"";
   var qty=!isService&&x.quantity>1?' <b>×'+x.quantity+'</b>':"";
   return '<span class="core-chip'+(off?" off":"")+'">'+icon(isService?"tag":"check",12)+esc(x.name)+extra+qty+'</span>';
  }).join("")+'</div>';
 }
 var langs=(o.languages||[]).map(function(l){return '<span class="core-chip">'+esc(detailLangLabel(l))+'</span>'}).join("");

 var facilityTiles='<section class="panel profile-panel" id="profileFacilities"><div class="panel-title"><h2>'+esc(tr("facilitiesServices"))+'</h2></div>'+
  (langs?'<h3 class="core-h3">'+esc(tr("teachingLanguages"))+'</h3><div class="core-chips profile-chiprow">'+langs+'</div>':"")+
  '<h3 class="core-h3">'+esc(tr("facilitiesLabel"))+'</h3>'+
   (fac.length?'<div class="profile-tiles">'+fac.map(function(x){return profileTile(facilityIcon(x.facilityType),x.name,(x.quantity>1?"×"+x.quantity:""),x.available===false)}).join("")+'</div>':'<div class="empty-state">'+esc(isPublic?tr("pricingGated"):tr("noFacilities"))+'</div>')+
  '<h3 class="core-h3">'+esc(tr("servicesLabel"))+'</h3>'+
   (svc.length?'<div class="profile-tiles">'+svc.map(function(x){return profileTile(serviceIcon(x.serviceType),x.name,(x.price!=null&&Number(x.price)>0&&!gated0?moneyText(x.price,x.currency):""),x.available===false)}).join("")+'</div>':'<div class="empty-state">'+esc(isPublic?tr("pricingGated"):tr("noServices"))+'</div>')+
  '</section>';

 // ---- 6. stages and fees of THIS institution (the priced layer) ----
 // Delivery modes come from the offering, not from the legacy teaching-methods
 // catalog: delivery is an attribute with exactly three values.
 var offering=orgOffering();
 var gated=offering?offering.pricingGated===true:false;
 var offStages=offering?offering.stages:null;
 var offSubjects=offering?offering.subjects:null;
 var deliveryCodes=[];
 (offStages||[]).forEach(function(s){if(s.deliveryMode&&deliveryCodes.indexOf(s.deliveryMode)<0)deliveryCodes.push(s.deliveryMode)});
 (o.teachingMethods||[]).map(deliveryValue).forEach(function(m){
   if(DELIVERY_LABELS[m]&&deliveryCodes.indexOf(m)<0)deliveryCodes.push(m)});
 var deliveryChips=deliveryCodes.map(function(m){
  return '<span class="core-chip">'+esc(detailDeliveryLabel(m))+'</span>'}).join("");
 var gatedNote=gated?'<div class="gated-note">'+icon("shield",14)+'<span>'+esc(tr("pricingGated"))+'</span></div>':"";
 function feeCell(fee){
  if(gated)return '<span class="gated-value">'+esc(tr("pricingGated"))+'</span>';
  if(!fee)return "—";
  return '<b>'+esc(moneyText(fee.amount,fee.currency))+'</b><div class="entity-sub">'+esc(frequencyLabel(fee.frequency))+'</div>';
 }
 var stagesTable;
 if(!offering)stagesTable='<div class="empty-state">'+esc(tr("noOfferingStages"))+'</div>';
 else if(!offStages.length)stagesTable='<div class="empty-state">'+esc(tr("noOfferingStages"))+'</div>';
 else stagesTable='<div class="table-wrap"><table class="tbl"><thead><tr>'+
  '<th>'+esc(tr("stages"))+'</th><th>'+esc(tr("feeLabel"))+'</th><th>'+esc(tr("languageLabel"))+
  '</th><th>'+esc(tr("deliveryLabel"))+'</th><th>'+esc(tr("capacityLabel"))+'</th><th>'+esc(tr("remainingSeatsLabel"))+
  '</th><th></th></tr></thead><tbody>'+offStages.map(function(s){
   var cap=s.capacity==null?"—":esc(String(s.capacity));
   // Capacity is derived, never typed: remaining_seats is generated as
   // capacity - current_students, and a negative number is a real
   // over-enrolment, not a value to clamp. The badge names the state and carries
   // the computed count, so "متوفر مقاعد (فاضي) · 12" answers "how many seats are
   // left" without the reader having to subtract two columns.
   var state;
   if(s.capacity==null)state='<span class="badge wait">'+esc(tr("seatsUndeclared"))+'</span>';
   else if(s.remainingSeats>0)state='<span class="badge ok">'+esc(tr("seatsAvailableBadge"))+' · '+esc(String(s.remainingSeats))+'</span>';
   else state='<span class="badge stop">'+esc(tr("seatsFullBadge"))+'</span>';
   var rem=s.remainingSeats==null?"—":'<b'+(s.remainingSeats<0?' class="over-capacity"':"")+'>'+esc(String(s.remainingSeats))+'</b>';
   return '<tr><td><b>'+esc(s.stageName||s.stageCode||"—")+'</b><div class="entity-sub" dir="ltr">'+
    esc(s.stageCode||"")+'</div></td><td>'+feeCell(s.fee)+'</td><td>'+esc(detailLangLabel(s.languageCode))+
    '</td><td>'+esc(detailDeliveryLabel(s.deliveryMode))+'</td><td>'+cap+state+'</td><td>'+rem+'</td>'+
    '<td>'+(isPublic?"":'<button class="crud edit" title="'+esc(tr("editLabel"))+'" onclick="orgStageFormOpen(\''+esc(s.stageId)+'\')">'+icon("edit",14)+'</button>')+'</td></tr>'
  }).join("")+'</tbody></table></div>';
 var subjRows=offSubjects&&offSubjects.length?offSubjects:(detailExtras.subjects||[]).map(function(s){
   return {subjectId:s.id,name:s.name,languageCode:s.language_code,amount:gated?null:s.fee_amount,
     currency:gated?null:s.currency,frequency:gated?null:s.frequency}});
 // A subject this institution defined for itself is marked as such and carries
 // its review state, so it is always clear which rows come from the platform
 // catalog and which are local ones the admin still has to look at.
 function subjectScopeCell(s){
  if(s.scope!=="organization")return "";
  var cls=s.reviewStatus==="approved"?"ok":s.reviewStatus==="rejected"?"stop":"wait";
  var label=s.reviewStatus==="approved"?tr("reviewApproved"):s.reviewStatus==="rejected"?tr("reviewRejected"):tr("reviewPending");
  return '<div class="entity-sub">'+esc(tr("subjectScopeOwn"))+'</div><span class="badge '+cls+'">'+esc(label)+'</span>';
 }
 var subjectsTable=subjRows.length?'<div class="table-wrap"><table class="tbl"><thead><tr>'+
  '<th>'+esc(tr("subjects"))+'</th><th>'+esc(tr("languageLabel"))+'</th><th>'+esc(tr("feeLabel"))+
  '</th></tr></thead><tbody>'+subjRows.map(function(s){
   return '<tr><td><b>'+esc(s.name)+'</b>'+subjectScopeCell(s)+'</td><td>'+esc(detailLangLabel(s.languageCode))+'</td><td>'+
    (gated?'<span class="gated-value">'+esc(tr("pricingGated"))+'</span>':esc(moneyText(s.amount,s.currency)))+
    (s.frequency?'<div class="entity-sub">'+esc(frequencyLabel(s.frequency))+'</div>':"")+'</td></tr>'
  }).join("")+'</tbody></table></div>':'<div class="empty-state">'+esc(tr("noOfferingSubjects"))+'</div>';
 // The "+" next to the subject heading is the institution's escape hatch when a
 // subject it teaches is not in the global catalog. The subject it creates belongs
 // to the institution and goes to the admin for review.
 var subjectsHeading='<div class="core-h3-row"><h3 class="core-h3">'+esc(tr("orgSubjectsLabel"))+'</h3>'+
  (isPublic?"":'<button class="mini-plus" title="'+esc(tr("addOwnSubject"))+'" onclick="orgSubjectFormOpen()">'+icon("plus",14)+'</button>')+'</div>';
 var programCards=(offering&&offStages&&offStages.length)?
   '<div class="profile-programs">'+offStages.map(function(s){
     var cap=s.capacity==null?tr("seatsUndeclared"):(s.capacity+" "+tr("seatsOf"));
     var rem=s.remainingSeats==null?"—":String(s.remainingSeats);
     var fee=(gated||!s.fee)?"—":moneyText(s.fee.amount,s.fee.currency);
     var detail=editable?'<button class="program-link" onclick="orgStageFormOpen(\''+esc(s.stageId)+'\')">'+esc(tr("programDetails"))+' '+icon("back",13)+'</button>':"";
     return '<div class="program-card">'+
       '<div class="program-card-head"><b>'+esc(s.stageName||s.stageCode||"—")+'</b>'+(s.stageCode?'<span class="program-code" dir="ltr">'+esc(s.stageCode)+'</span>':"")+'</div>'+
       '<div class="program-card-meta">'+
         '<div><span>'+esc(tr("capacityLabel"))+'</span><b>'+esc(cap)+'</b></div>'+
         '<div><span>'+esc(tr("remainingSeatsLabel"))+'</span><b>'+esc(rem)+'</b></div>'+
         '<div><span>'+esc(tr("languageLabel"))+'</span><b>'+esc(detailLangLabel(s.languageCode))+'</b></div>'+
         '<div><span>'+esc(tr("deliveryLabel"))+'</span><b>'+esc(detailDeliveryLabel(s.deliveryMode))+'</b></div>'+
         '<div><span>'+esc(tr("feeLabel"))+'</span><b>'+esc(fee)+'</b></div>'+
       '</div>'+detail+'</div>';
   }).join("")+'</div>'
  :'<div class="empty-state">'+esc(tr("noOfferingStages"))+'</div>';
 var academic='<section class="panel profile-panel" id="profileAcademic"><div class="panel-title"><div><h2>'+
  esc(tr("academicPrograms"))+'</h2><p>'+esc(lang==="ar"?"هذه الرسوم والسعة خاصة بهذه المؤسسة، والمصدر هو عرض المؤسسة لا الكتالوج العام.":"These fees and seats belong to this institution; the source is its offering, not the global catalog.")+
  '</p></div>'+(editable?'<button class="btn brown" onclick="orgStageFormOpen(null)">'+icon("plus",15)+' '+esc(tr("addStageLabel"))+'</button>':"")+'</div>'+
  gatedNote+programCards+
  '<div class="profile-subhead"><h3 class="core-h3">'+esc(tr("orgSubjectsLabel"))+'</h3>'+
   (editable?'<button class="mini-plus" title="'+esc(tr("addOwnSubject"))+'" onclick="orgSubjectFormOpen()">'+icon("plus",14)+'</button>':"")+'</div>'+
  subjectsTable+'</section>';

 // ===================== Editorial profile layout =====================
 // One shared document, rendered inside both the public shell and the admin
 // dashboard shell. Entity media comes from the resolver (media.js): the entity's
 // own DB media first, then mapped project media, then a clearly-generic fallback
 // that is always labelled as illustrative, never passed off as a real photo.
 var media=(typeof MadrasatiMedia!=="undefined")?MadrasatiMedia.orgMedia(o):{logo:orgLogo(o),cover:"",gallery:[],generic:""};
 var galleryImgs=media.gallery||[];
 var coverImg=media.cover||"assets/images/school-detail-cover.jpg";
 var mediaLogo=media.logo||orgLogo(o);
 var teacherCount=(o.teachers==null?null:o.teachers);
 var hasLoc=!!(loc||o.address||o.latitude||o.mapUrl);

 // Local builders for the editorial layout only: a fact cell, a contact row and
 // one number in the floating stat strip.
 function edFact(ic,label,value,href){
  var v=(value==null||value==="")?"—":value;
  var val=href&&value?'<a href="'+esc(href)+'"'+(href.indexOf("http")===0?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(v)+'</a>':esc(v);
  return '<div class="ed-fact"><span>'+esc(label)+'</span><b>'+val+'</b></div>';
 }
 function edContact(ic,label,value,href){
  if(!value)return "";
  var v=String(value).replace(/^https?:\/\//,"");
  return href?'<a class="ed-contact-link" title="'+esc(label)+'" href="'+esc(href)+'"'+(href.indexOf("http")===0?' target="_blank" rel="noopener noreferrer"':'')+'><span class="ed-ci">'+icon(ic,16)+'</span><span>'+esc(v)+'</span></a>'
   :'<span class="ed-contact-link"><span class="ed-ci">'+icon(ic,16)+'</span><span>'+esc(v)+'</span></span>';
 }
 function edStat(val,label){
  return '<div class="ed-stat"><b>'+esc(val==null?"—":String(val))+'</b><span>'+esc(label)+'</span></div>';
 }

 var edCrumb='<div class="ptopbar"><div class="pcrumbs">'+icon("home",14)+
  ' <a href="#/home">'+esc(tr("home"))+'</a> <span class="psep">›</span>'+
  ' <a href="#/schools">'+esc(tr("schools"))+'</a> <span class="psep">›</span>'+
  ' <span>'+esc(orgTypeLabel(o.type))+'</span> <span class="psep">›</span> <b>'+esc(o.name)+'</b></div></div>';

 var edCoverActions='<div class="ed-cover-actions">'+
  '<button class="picon-btn" title="'+esc(ar?"أضف للمفضلة":"Add to favorites")+'" onclick="this.classList.toggle(\'on\')">'+icon("heart",17)+'</button>'+
  '<button class="picon-btn" title="'+esc(tr("share"))+'" onclick="shareInstitution()">'+icon("share",16)+'</button>'+
  (editable?'<button class="btn green" onclick="acOrgEdit(\''+o.id+'\')">'+icon("edit",15)+' '+esc(tr("editLabel"))+'</button>':"")+
  '</div>';

 var edCover='<div class="ed-cover">'+
  '<img class="ed-cover-img" src="'+esc(coverImg)+'" alt="'+esc(o.name)+'" onerror="this.style.display=\'none\'">'+
  '<div class="ed-cover-top">'+
   '<span class="badge ok">'+esc(orgTypeLabel(o.type))+'</span>'+
   edCoverActions+
  '</div>'+
  '<div class="ed-identity">'+
   '<div class="ed-logo"><img src="'+esc(mediaLogo)+'" alt="'+esc(o.name)+'" onerror="this.style.display=\'none\'"></div>'+
   '<div class="ed-id-copy">'+
    '<div class="ed-badges">'+coreBadge(o.verified?"verified":o.verificationStatus||"pending")+coreBadge(o.registrationOpen?"active":"inactive")+'</div>'+
    '<h1>'+esc(o.name)+'</h1>'+
    (o.nameEn?'<div class="ed-en" dir="ltr">'+esc(o.nameEn)+'</div>':"")+
    (o.description||o.bio?'<p class="ed-tagline">'+esc(o.description||o.bio)+'</p>':"")+
    (loc?'<div class="ed-chips"><span>'+icon("pin",13)+' '+esc(loc)+'</span></div>':"")+
   '</div>'+
  '</div>'+
 '</div>';

 var edStrip='<div class="ed-strip">'+
  edStat((o.stages||[]).length,tr("stagesCountLabel"))+
  edStat((o.subjects||[]).length,tr("subjects"))+
  edStat(fac.length,tr("facilitiesLabel"))+
  edStat(o.seatsAvailable,tr("seatsLabel"))+
 '</div>';

 var edTabs='<nav class="ed-tabs">'+
  '<button class="on" onclick="scrollToProfile(\'edGeneral\')">'+icon("home",15)+'<span>'+esc(tr("generalInfo"))+'</span></button>'+
  '<button onclick="scrollToProfile(\'edAcademic\')">'+icon("school",15)+'<span>'+esc(tr("academicPrograms"))+'</span></button>'+
  '<button onclick="scrollToProfile(\'edTeachers\')">'+icon("teacher",15)+'<span>'+esc(tr("teachers"))+'</span></button>'+
  '<button onclick="scrollToProfile(\'edFacilities\')">'+icon("building",15)+'<span>'+esc(tr("facilitiesServices"))+'</span></button>'+
  '<button onclick="scrollToProfile(\'edDocs\')">'+icon("doc",15)+'<span>'+esc(tr("documentsTab"))+'</span></button>'+
 '</nav>';

 // ---- about + facts + gallery ----
 var edAbout='<section class="ed-sec" id="edGeneral">'+
  '<div class="ed-sec-head"><h3>'+sectionIcon("book","#2F7A59")+' '+esc(tr("aboutInstitution"))+'</h3></div>'+
  (media.generic?'<div class="gated-note">'+icon("info",14)+'<span>'+esc(ar?"الصورة المعروضة توضيحية، ولم ترفع المؤسسة صوراً حقيقية بعد.":"The image shown is illustrative; this institution has not uploaded real photos yet.")+'</span></div>':"")+
  '<p class="ed-lead"><span class="ed-drop">'+esc((String(o.name||"").trim().charAt(0))||"م")+'</span>'+esc(o.description||o.bio||tr("noDescription"))+'</p>'+
  '<div class="ed-facts" style="margin-top:16px">'+
   edFact("tag",tr("typeLabel"),orgTypeLabel(o.type))+
   edFact("doc",tr("curriculumLabel"),detailCurriculumLabel(o.curriculum))+
   edFact("globe",tr("languageLabel"),(o.languages||[]).map(detailLangLabel).join(" · "))+
   edFact("users",ar?"الجنس":"Gender",detailGenderLabel(o.gender))+
   edFact("pin",tr("exactLocation"),loc)+
   edFact("map",ar?"العنوان":"Address",o.address)+
   edFact("phone",tr("phoneLabel"),o.phone,telLink(o.phone))+
   edFact("mail",tr("email"),o.email,o.email?"mailto:"+o.email:"")+
   edFact("globe",tr("websiteLabel"),o.website,o.website)+
   edFact("shield",tr("accreditation"),o.verified?tr("docVerified"):tr("statusPending"))+
  '</div>'+
  (galleryImgs.length?
   '<div class="ed-sec-head" style="margin-top:22px"><h3>'+sectionIcon("grid","#7C5CFF")+' '+esc(tr("galleryLabel"))+'</h3></div>'+
   '<div class="ed-gallery">'+galleryImgs.slice(0,5).map(function(g,i){return '<img class="'+(i===0?"big":"")+'" src="'+esc(g)+'" alt="">'}).join("")+
   (galleryImgs.length>5?'<div class="more"><img src="'+esc(galleryImgs[5])+'" alt=""><span>+'+(galleryImgs.length-5)+'</span></div>':'')+'</div>'
   :(coverImg?'<div class="ed-sec-head" style="margin-top:22px"><h3>'+esc(tr("galleryLabel"))+'</h3></div>'+
     '<div class="ed-gallery"><img class="big" src="'+esc(coverImg)+'" alt=""></div>':""))+
 '</section>';

 // ---- academic programs + this institution's own subjects ----
 var edPrograms=(offering&&offStages&&offStages.length)?
  '<div class="ed-programs">'+offStages.map(function(s){
   var cap=(s.capacity==null?null:s.capacity);
   var rem=(s.remainingSeats==null?null:s.remainingSeats);
   var fee=(gated||!s.fee)?"—":moneyText(s.fee.amount,s.fee.currency);
   var meta=[];
   if(cap!=null)meta.push(esc(String(cap))+' '+esc(tr("seatsOf")));
   if(rem!=null)meta.push(esc(String(rem))+' '+esc(tr("seatsRemainingShort")));
   if(s.deliveryMode)meta.push(esc(detailDeliveryLabel(s.deliveryMode)));
   var detail=editable?'<button class="pprogram-link" onclick="orgStageFormOpen(\''+esc(s.stageId)+'\')">'+esc(tr("programDetails"))+' '+icon("back",13)+'</button>':"";
   return '<div class="ed-prog rd-prog rd-prog-'+esc(String(s.stageCode||"other").toLowerCase().replace(/[^a-z0-9_-]/g,""))+'"><span class="ed-prog-ic">'+icon(programGlyph(s.stageCode).i,30)+'</span>'+
    '<b>'+esc(s.stageName||s.stageCode||"—")+'</b>'+
    (s.stageCode?'<div class="ed-prog-meta" dir="ltr">'+esc(s.stageCode)+'</div>':"")+
    (meta.length?'<div class="ed-prog-meta">'+meta.join(" · ")+'</div>':"")+
    '<div class="ed-prog-fee">'+fee+'</div>'+detail+'</div>';
  }).join("")+'</div>'
  :'<div class="empty-state">'+esc(tr("noOfferingStages"))+'</div>';
 var edAcademic='<section class="ed-sec" id="edAcademic">'+
  '<div class="ed-sec-head"><h3>'+sectionIcon("school","#2563EB")+' '+esc(tr("academicPrograms"))+'</h3>'+
   (editable?'<button class="ed-link" onclick="orgStageFormOpen(null)">'+icon("plus",14)+' '+esc(tr("addStageLabel"))+'</button>':"")+'</div>'+
  gatedNote+edPrograms+
  '<div class="core-h3-row"><h3 class="core-h3">'+esc(tr("orgSubjectsLabel"))+'</h3>'+
   (editable?'<button class="mini-plus" title="'+esc(tr("addOwnSubject"))+'" onclick="orgSubjectFormOpen()">'+icon("plus",14)+'</button>':"")+'</div>'+
  subjectsTable+
 '</section>';

 // ---- teachers strip ----
 var edTeachers='<section class="ed-sec" id="edTeachers">'+
  '<div class="ed-sec-head"><h3>'+sectionIcon("teacher","#0E9488")+' '+esc(tr("teachers"))+'</h3></div>'+
  '<div class="ed-facts">'+
   edFact("teacher",ar?"إجمالي المعلمين":"Total teachers",teacherCount==null?"—":String(teacherCount))+
   edFact("school",ar?"المراحل":"Stages",(o.stages||[]).length)+
   edFact("doc",ar?"المواد":"Subjects",(o.subjects||[]).length)+
   edFact("building",ar?"المرافق":"Facilities",fac.length)+
  '</div>'+
  (teacherCount==null?'<div class="gated-note" style="margin-top:12px">'+icon("info",14)+'<span>'+esc(ar?"عدد المعلمين غير معلن لهذه المؤسسة.":"The teacher count is not declared for this institution.")+'</span></div>':"")+
 '</section>';

 // ---- facilities and services ----
 var edFacilities='<section class="ed-sec" id="edFacilities">'+
  '<div class="ed-sec-head"><h3>'+sectionIcon("building","#D98A2B")+' '+esc(tr("facilitiesServices"))+'</h3></div>'+
  (langs?'<h3 class="core-h3">'+esc(tr("teachingLanguages"))+'</h3><div class="core-chips">'+langs+'</div>':"")+
  '<h3 class="core-h3">'+esc(tr("facilitiesLabel"))+'</h3>'+
   (fac.length?'<div class="profile-tiles">'+fac.map(function(x){return profileTile(facilityIcon(x.facilityType),x.name,(x.quantity>1?"×"+x.quantity:""),x.available===false)}).join("")+'</div>':'<div class="empty-state">'+esc(isPublic?tr("pricingGated"):tr("noFacilities"))+'</div>')+
  '<h3 class="core-h3">'+esc(tr("servicesLabel"))+'</h3>'+
   (svc.length?'<div class="profile-tiles">'+svc.map(function(x){return profileTile(serviceIcon(x.serviceType),x.name,(x.price!=null&&Number(x.price)>0&&!gated0?moneyText(x.price,x.currency):""),x.available===false)}).join("")+'</div>':'<div class="empty-state">'+esc(isPublic?tr("pricingGated"):tr("noServices"))+'</div>')+
 '</section>';

 // ---- documents ----
 var edDocs='<section class="ed-sec" id="edDocs">'+
  '<div class="ed-sec-head"><h3>'+sectionIcon("doc","#4B6B8A")+' '+esc(tr("documentsTab"))+'</h3></div>'+docsHtml+'</section>';

 // ---- side column ----
 var edSide=
  '<div class="ed-card"><h4>'+icon("phone",16)+' '+esc(tr("contactInfo"))+'</h4>'+
   (edContact("phone",tr("phoneLabel"),o.phone,telLink(o.phone))+
    edContact("whatsapp",tr("whatsapp"),o.whatsapp||o.phone,waLink(o.whatsapp||o.phone))+
    edContact("mail",tr("email"),o.email,o.email?"mailto:"+o.email:"")+
    edContact("globe",tr("websiteLabel"),o.website,o.website)||'<div class="empty-state">'+esc(tr("noDescription"))+'</div>')+
   ((o.whatsapp||o.phone)?'<div style="margin-top:12px">'+waButton(o.whatsapp||o.phone,{label:tr("whatsapp")})+'</div>':"")+
  '</div>'+
  '<div class="ed-card"><h4>'+icon("pin",16)+' '+esc(tr("exactLocation"))+'</h4>'+
   (hasLoc?
    '<div class="ed-map"><span class="pin">📍</span>'+(loc?'<span class="lbl">'+esc(loc)+'</span>':'')+'</div>'+
    (mapHref?'<button class="btn green" style="width:100%;justify-content:center;margin-top:12px" onclick="window.open(\''+esc(mapHref)+'\',\'_blank\')">'+icon("map",15)+' '+esc(tr("openMap"))+'</button>':'')
    :'<div class="empty-state">'+esc(tr("locationUnavailable"))+'</div>')+
  '</div>'+
  '<div class="ed-card"><h4>'+icon("building",16)+' '+esc(tr("facilitiesLabel"))+'</h4>'+
   (fac.length?'<div class="ed-fac-chips">'+fac.slice(0,12).map(function(x){return '<span>'+esc(x.name)+'</span>'}).join("")+'</div>':'<div class="empty-state">'+esc(isPublic?tr("pricingGated"):tr("noFacilities"))+'</div>')+
  '</div>'+
  '<div class="ed-card"><h4>'+icon("settings",16)+' '+esc(tr("profileActions"))+'</h4><div class="ed-actions">'+
   (editable?'<button class="btn" onclick="acOrgEdit(\''+o.id+'\')">'+icon("edit",15)+' '+esc(tr("editLabel"))+'</button>':"")+
   '<button class="btn" onclick="printInstitution()">'+icon("printer",15)+' '+esc(tr("printReport"))+'</button>'+
   '<button class="btn" onclick="exportInstitution(\'pdf\')">'+icon("pdf",15)+' '+esc(tr("exportPdf"))+'</button>'+
   '<button class="btn" onclick="exportInstitution(\'docx\')">'+icon("doc",15)+' '+esc(tr("exportDocx"))+'</button>'+
   '<button class="btn" onclick="exportInstitution(\'xlsx\')">'+icon("sheet",15)+' '+esc(tr("exportXlsx"))+'</button>'+
   '<button class="btn" onclick="shareInstitution()">'+icon("share",15)+' '+esc(tr("share"))+'</button>'+
   (editable?'<button class="btn brown" onclick="orgStageFormOpen(null)">'+icon("plus",15)+' '+esc(tr("addStageLabel"))+'</button>':"")+
  '</div></div>';

 // The supplied school-detail reference places identity over a light cover,
 // then presents facts and description side by side. This document is still
 // shared by the public route and the editable dashboard route.
 function rdFact(ic,label,value,href){
  var shown=value==null||value===""?"—":String(value);
  var content=href&&value?'<a href="'+esc(href)+'"'+(href.indexOf("http")===0?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(shown.replace(/^https?:\/\//,""))+'</a>':esc(shown);
  return '<div class="rd-fact"><span class="rd-fact-icon">'+icon(ic,17)+'</span><span class="rd-fact-label">'+esc(label)+'</span><b>'+content+'</b></div>';
 }
 var rdTop='<div class="rd-top"><div class="rd-breadcrumb"><a href="#/home">'+esc(tr("home"))+'</a><span>›</span><a href="#/schools">'+esc(tr("schools"))+'</a><span>›</span><span>'+esc(orgTypeLabel(o.type))+'</span><span>›</span><b>'+esc(o.name)+'</b></div>'+
  '<div class="rd-top-actions">'+(editable?'<button class="rd-primary" onclick="acOrgEdit(\''+o.id+'\')">'+icon("edit",16)+' '+esc(tr("editLabel"))+'</button>':"")+
   '<button class="rd-icon-button" title="'+esc(ar?"أضف للمفضلة":"Add to favorites")+'" onclick="this.classList.toggle(\'on\')">'+icon("heart",18)+'</button>'+
   '<button class="rd-icon-button" title="'+esc(tr("share"))+'" onclick="shareInstitution()">'+icon("share",17)+'</button></div></div>';
 var rdHero='<header class="rd-hero">'+
  '<img class="rd-hero-image" src="'+esc(coverImg)+'" alt="" onerror="this.style.display=\'none\'">'+
  '<div class="rd-hero-copy"><div class="rd-hero-logo"><img src="'+esc(mediaLogo)+'" alt="'+esc(o.name)+'" onerror="this.style.display=\'none\'"></div>'+
   '<div class="rd-hero-text"><span class="rd-type">'+icon(o.type==="college"||o.type==="university"?"college":o.type==="institute"?"institute":"school",14)+' '+esc(orgTypeLabel(o.type))+'</span><h1>'+esc(o.name)+'</h1>'+
    '<div class="ed-badges">'+coreBadge(o.verified?"verified":o.verificationStatus||"pending")+coreBadge(o.registrationOpen?"active":"inactive")+'</div>'+
    (o.nameEn?'<span class="rd-name-en" dir="ltr">'+esc(o.nameEn)+'</span>':"")+
    '<p>'+esc(o.description||o.bio||tr("noDescription"))+'</p>'+
    (loc?'<div class="rd-location">'+icon("pin",16)+' '+esc(loc)+'</div>':"")+
    '<div class="rd-hero-contact">'+
     (o.phone?'<a href="'+esc(telLink(o.phone))+'">'+icon("phone",15)+' '+esc(o.phone)+'</a>':"")+
     (o.email?'<a href="mailto:'+esc(o.email)+'">'+icon("mail",15)+' '+esc(o.email)+'</a>':"")+
     (o.website?'<a href="'+esc(o.website)+'" target="_blank" rel="noopener noreferrer">'+icon("globe",15)+' '+esc(String(o.website).replace(/^https?:\/\//,""))+'</a>':"")+
    '</div></div></div>'+
   (media.generic?'<span class="rd-illustration">'+esc(ar?"صورة توضيحية":"Illustrative photo")+'</span>':"")+
  '</header>';
 var rdTabs='<nav class="rd-tabs" aria-label="'+esc(tr("institutionDetail"))+'">'+
  '<button onclick="scrollToProfile(\'rdOverview\')">'+icon("home",17)+' '+esc(tr("generalInfo"))+'</button>'+
  '<button onclick="scrollToProfile(\'rdPrograms\')">'+icon("school",17)+' '+esc(tr("academicPrograms"))+'</button>'+
  '<button onclick="scrollToProfile(\'rdTeachers\')">'+icon("teacher",17)+' '+esc(tr("teachers"))+'</button>'+
  '<button onclick="scrollToProfile(\'rdFacilities\')">'+icon("building",17)+' '+esc(tr("facilitiesServices"))+'</button>'+
  '<button onclick="scrollToProfile(\'rdDocuments\')">'+icon("doc",17)+' '+esc(tr("documentsTab"))+'</button>'+
  '</nav>';
 var rdFacts='<section class="rd-card" id="rdOverview"><h2>'+icon("info",19)+' '+esc(tr("institutionDetail"))+'</h2><div class="rd-facts">'+
  rdFact("school",ar?"اسم المؤسسة":"Institution name",o.name)+
  rdFact(o.type==="college"||o.type==="university"?"college":o.type==="institute"?"institute":"school",tr("typeLabel"),orgTypeLabel(o.type))+
  rdFact("doc",tr("curriculumLabel"),detailCurriculumLabel(o.curriculum))+
  rdFact("users",ar?"الجنس":"Gender",detailGenderLabel(o.gender))+
  rdFact("globe",tr("languageLabel"),(o.languages||[]).map(detailLangLabel).join(" · "))+
  rdFact("pin",tr("exactLocation"),loc)+
  rdFact("map",ar?"العنوان":"Address",o.address)+
  rdFact("phone",tr("phoneLabel"),o.phone,telLink(o.phone))+
  rdFact("phone",tr("whatsapp"),o.whatsapp,waLink(o.whatsapp))+
  rdFact("mail",tr("email"),o.email,o.email?"mailto:"+o.email:"")+
  rdFact("globe",tr("websiteLabel"),o.website,o.website)+
  rdFact("shield",tr("accreditation"),o.verified?tr("docVerified"):tr("statusPending"))+
  rdFact("users",tr("seatsLabel"),o.seatsAvailable)+
  rdFact("building",tr("facilitiesLabel"),fac.length)+
  '</div></section>';
 var rdAbout='<section class="rd-card rd-about"><h2>'+icon("book",19)+' '+esc(tr("aboutInstitution"))+'</h2>'+
  '<p>'+esc(o.description||o.bio||tr("noDescription"))+'</p>'+
  (coverImg?'<div class="rd-about-photo"><img src="'+esc(coverImg)+'" alt="" onerror="this.style.display=\'none\'"></div>':"")+
  (media.generic?'<p class="rd-media-note">'+esc(ar?"الصورة توضيحية؛ لم ترفع المؤسسة صورة خاصة بها بعد.":"Illustrative photo; this institution has not uploaded its own image yet.")+'</p>':"")+
  '</section>';
 var rdPrograms='<section class="rd-card rd-full" id="rdPrograms"><h2>'+icon("school",20)+' '+esc(tr("academicPrograms"))+'</h2>'+
  (editable?'<div class="rd-program-actions"><button class="rd-primary" onclick="orgStageFormOpen(null)">'+icon("plus",15)+' '+esc(tr("addStageLabel"))+'</button><button class="rd-primary" onclick="orgSubjectFormOpen()">'+icon("plus",15)+' '+esc(tr("addOwnSubject"))+'</button></div>':"")+
  gatedNote+edPrograms+'<div class="rd-subjects"><h3>'+esc(tr("orgSubjectsLabel"))+'</h3>'+subjectsTable+'</div></section>';
 var rdTeachers='<section class="rd-card" id="rdTeachers"><h2>'+icon("teacher",20)+' '+esc(tr("teachers"))+'</h2>'+
  '<div class="rd-teacher-stats"><div><b>'+esc(teacherCount==null?"—":String(teacherCount))+'</b><span>'+esc(tr("teachers"))+'</span></div>'+
  '<div><b>'+esc(String((o.stages||[]).length))+'</b><span>'+esc(tr("stages"))+'</span></div>'+
  '<div><b>'+esc(String((o.subjects||[]).length))+'</b><span>'+esc(tr("subjects"))+'</span></div></div></section>';
 var rdFacilities='<section class="rd-card" id="rdFacilities"><h2>'+icon("building",20)+' '+esc(tr("facilitiesServices"))+'</h2>'+
  (langs?'<h3>'+esc(tr("teachingLanguages"))+'</h3><div class="core-chips">'+langs+'</div>':"")+
  '<h3>'+esc(tr("facilitiesLabel"))+'</h3>'+
  (fac.length?'<div class="rd-facilities">'+fac.map(function(x){return '<span class="rd-facility rd-facility-'+esc(String(x.facilityType||x.facility_type||"other").toLowerCase().replace(/[^a-z0-9_-]/g,""))+'"><i>'+icon(facilityIcon(x.facilityType||x.facility_type).i,25)+'</i><b>'+esc(x.name)+'</b>'+(x.quantity>1?'<small>×'+esc(String(x.quantity))+'</small>':"")+(x.available===false?'<small>'+esc(ar?"غير متاح":"Unavailable")+'</small>':"")+'</span>'}).join("")+'</div>':'<div class="empty-state">'+esc(isPublic?tr("pricingGated"):tr("noFacilities"))+'</div>')+
  '<h3>'+esc(tr("servicesLabel"))+'</h3>'+
  (svc.length?'<div class="rd-facilities">'+svc.map(function(x){return '<span class="rd-facility rd-facility-'+esc(String(x.serviceType||x.service_type||"other").toLowerCase().replace(/[^a-z0-9_-]/g,""))+'"><i>'+icon(serviceIcon(x.serviceType||x.service_type).i,25)+'</i><b>'+esc(x.name)+'</b>'+(x.price!=null&&Number(x.price)>0&&!gated0?'<small>'+esc(moneyText(x.price,x.currency))+'</small>':"")+(x.available===false?'<small>'+esc(ar?"غير متاح":"Unavailable")+'</small>':"")+'</span>'}).join("")+'</div>':'<div class="empty-state">'+esc(isPublic?tr("pricingGated"):tr("noServices"))+'</div>')+
  '</section>';
 var rdMap='<section class="rd-card" id="rdMap"><h2>'+icon("pin",20)+' '+esc(tr("exactLocation"))+'</h2>'+
  '<div class="rd-map"><span>'+icon("pin",30)+'</span><b>'+esc(loc||tr("locationUnavailable"))+'</b></div>'+
  (mapHref?'<a class="rd-map-link" href="'+esc(mapHref)+'" target="_blank" rel="noopener noreferrer">'+icon("map",16)+' '+esc(tr("openMap"))+'</a>':"")+'</section>';
 var rdPhotos=galleryImgs.length?galleryImgs:[coverImg];
 var rdGallery='<section class="rd-card" id="rdGallery"><h2>'+icon("grid",20)+' '+esc(tr("galleryLabel"))+'</h2>'+
  '<div class="rd-gallery">'+rdPhotos.slice(0,5).map(function(src,i){return '<img class="'+(i===0?"rd-gallery-main":"")+'" src="'+esc(src)+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">'}).join("")+'</div>'+
  (media.generic?'<p class="rd-media-note">'+esc(ar?"صور توضيحية حتى تضيف المؤسسة صورها.":"Illustrative image until the institution adds its photos.")+'</p>':"")+'</section>';
 var rdDocuments='<section class="rd-card rd-full" id="rdDocuments"><h2>'+icon("doc",20)+' '+esc(tr("documentsTab"))+'</h2>'+docsHtml+'</section>';
 var rdActions='<section class="rd-actions"><h2>'+icon("settings",20)+' '+esc(tr("profileActions"))+'</h2><div>'+
  (editable?'<button class="rd-primary" onclick="acOrgEdit(\''+o.id+'\')">'+icon("edit",16)+' '+esc(tr("editLabel"))+'</button>':"")+
  '<button onclick="printInstitution()">'+icon("printer",16)+' '+esc(tr("printReport"))+'</button>'+
  '<button onclick="exportInstitution(\'pdf\')">'+icon("pdf",16)+' '+esc(tr("exportPdf"))+'</button>'+
  '<button onclick="exportInstitution(\'docx\')">'+icon("doc",16)+' '+esc(tr("exportDocx"))+'</button>'+
  '<button onclick="exportInstitution(\'xlsx\')">'+icon("sheet",16)+' '+esc(tr("exportXlsx"))+'</button>'+
  '<button onclick="shareInstitution()">'+icon("share",16)+' '+esc(tr("share"))+'</button>'+
  '</div></section>';
 return '<div class="rd-page">'+rdTop+rdHero+rdTabs+'<div class="rd-grid">'+rdFacts+rdAbout+rdPrograms+rdTeachers+rdFacilities+rdMap+rdGallery+rdDocuments+'</div>'+rdActions+'</div>';
}

// A priced offering belongs to exactly one institution. The platform admin may
// edit any institution's; an owner may edit only the institution they belong to,
// and sees every other institution exactly as a visitor does. The server enforces
// the same rule through requireOrgMember + requireRole('admin','owner') — this
// only decides which controls are worth showing (AGENTS.md rule 7).
function canEditOrg(org){
 if(!org)return false;
 var u=getCurrentUser();
 if(!u)return false;
 if(u.role==="admin")return true;
 if(u.role!=="owner")return false;
 return String(u.organizationId||"")===String(org.id);
}

// ---- Teacher profile (public directory) ----
// One teacher profile document, rendered inside the public shell here and, with
// admin extras (a back button, management panels and their tabs), inside the
// dashboard. `opts` carries `back`, `extraTabs`, `extraMain` and `extraSide` so
// the admin tools live on the SAME editorial layout the visitor sees.
function teacherProfileHtml(t,opts){
 opts=opts||{};
 var ar=lang==="ar";
 if(!t){
  return '<div class="td-wrap"><div class="td-empty">'+(ar?"جارٍ التحميل...":"Loading...")+'</div></div>';
 }
 var name=t.userName||t.nameEn||t.userEmail||"-";
 var headline=t.headline||"";
 var loc=[t.governorateName,t.districtName,t.neighborhoodName].filter(Boolean).join(" · ");
 var gated=!!t.pricingGated;
 var subjects=t.subjects||[];
 var stages=t.stages||[];
 var skills=t.skills||[];
 var quals=t.qualifications||[];
 var availability=t.availability||[];

 // Media: a teacher's real uploaded avatar wins; otherwise a deterministic real
 // reference portrait (by id, never random) — the same resolver the directory
 // uses. The gallery reuses the repo's real teacher photos the same way.
 var media=(typeof MadrasatiMedia!=="undefined")?MadrasatiMedia.teacherMedia(t):null;
 var avatarSrc=media?media.avatar:"";
 var gallery=media&&Array.isArray(media.gallery)?media.gallery:[];

 function chip(s,cls){return '<span class="td-chip'+(cls?" "+cls:"")+'">'+esc(s)+'</span>'}
 function statTile(ic,val,label){return '<div class="td-stat"><span class="td-stat-ic">'+icon(ic,20)+'</span><b>'+esc(val==null?"-":String(val))+'</b><span>'+esc(label)+'</span></div>'}
 function fact(ic,label,value,href){
  var v=(value==null||value==="")?"-":value;
  var val=href&&value?'<a href="'+esc(href)+'"'+(href.indexOf("http")===0?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(v)+'</a>':esc(v);
  return '<div class="td-fact"><span class="td-fact-ic">'+icon(ic,16)+'</span><span class="td-fact-label">'+esc(label)+'</span><span class="td-fact-value">'+val+'</span></div>';
 }
 function dayLabel(d){
  var days=ar?["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"]:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return days[Number(d)%7]||String(d);
 }
 function modeLabel(m){
  if(m==="online")return ar?"عن بُعد":"Online";
  if(m==="student_home")return ar?"في منزل الطالب":"At student's home";
  if(m==="teacher_location")return ar?"في مكان المعلم":"At teacher's location";
  return m||"-";
 }
 function billingLabel(p){return p==="monthly"?(ar?"شهرياً":"per month"):(ar?"بالساعة":"per hour");}

 var modes=[];
 if(t.offersOnline)modes.push(ar?"عن بُعد":"Online");
 if(t.travelsToStudentHome)modes.push(ar?"منزل الطالب":"Student's home");
 if(t.acceptsStudentHome)modes.push(ar?"مكان المعلم":"Teacher's location");

 // The editorial layout mirrors the institution detail: the same `ed-*` shell,
 // bound to this teacher's record. For an anonymous visitor the server has
 // already stripped every amount and set `pricingGated`.
 var edFact=function(ic,label,value,href){
  var v=(value==null||value==="")?"—":value;
  var val=href&&value?'<a href="'+esc(href)+'"'+(href.indexOf("http")===0?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(v)+'</a>':esc(v);
  return '<div class="ed-fact"><span>'+esc(label)+'</span><b>'+val+'</b></div>';
 };
 var edContact=function(ic,label,value,href){
  if(!value)return "";
  var v=String(value).replace(/^https?:\/\//,"");
  return href?'<a class="ed-contact-link" title="'+esc(label)+'" href="'+esc(href)+'"'+(href.indexOf("http")===0?' target="_blank" rel="noopener noreferrer"':'')+'><span class="ed-ci">'+icon(ic,16)+'</span><span>'+esc(v)+'</span></a>'
   :'<span class="ed-contact-link"><span class="ed-ci">'+icon(ic,16)+'</span><span>'+esc(v)+'</span></span>';
 };
 var edStat=function(val,label){return '<div class="ed-stat"><b>'+esc(val==null?"—":String(val))+'</b><span>'+esc(label)+'</span></div>'};

 var edCrumb='<div class="ptopbar"><div class="pcrumbs">'+icon("home",14)+
  ' <a href="#/home">'+esc(tr("home"))+'</a> <span class="psep">›</span>'+
  ' <a href="#/teachers">'+esc(tr("teachers"))+'</a> <span class="psep">›</span> <b>'+esc(name)+'</b></div></div>';

 var initial=esc((String(name).trim().charAt(0))||"؟");
 var logoInner=avatarSrc
  ?'<img class="ed-avatar" style="object-fit:cover" src="'+esc(avatarSrc)+'" alt="'+esc(name)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'+
    '<span style="display:none;width:100%;height:100%;place-items:center;background:var(--theme-primary,#1F5D46);color:#fff;font-size:44px;font-weight:900;border-radius:14px">'+initial+'</span>'
  :'<span style="width:100%;height:100%;display:grid;place-items:center;background:var(--theme-primary,#1F5D46);color:#fff;font-size:44px;font-weight:900;border-radius:14px">'+initial+'</span>';

 var edCover='<div class="ed-cover tv-cover">'+
  '<div class="ed-cover-top">'+
   '<span class="badge ok">'+esc(ar?"معلم خصوصي":"Private teacher")+'</span>'+
   '<div class="ed-cover-actions">'+
    (opts.back||"")+
    '<button class="picon-btn" title="'+esc(tr("share"))+'" onclick="shareAnon(this.getAttribute(\'data-name\'))" data-name="'+esc(name)+'">'+icon("share",16)+'</button>'+
   '</div>'+
  '</div>'+
  '<div class="ed-identity">'+
   '<div class="ed-logo">'+logoInner+'</div>'+
   '<div class="ed-id-copy">'+
    '<div class="ed-badges">'+coreBadge(t.verified?"verified":(t.verificationStatus||t.status||"pending"))+'</div>'+
    '<h1>'+esc(name)+'</h1>'+
    (headline?'<p class="ed-tagline">'+esc(headline)+'</p>':"")+
    (loc?'<div class="ed-chips"><span>'+icon("pin",13)+' '+esc(loc)+'</span></div>':"")+
    (modes.length?'<div class="ed-chips">'+modes.map(function(m){return '<span>'+esc(m)+'</span>'}).join("")+'</div>':"")+
   '</div>'+
  '</div>'+
 '</div>';

 var edStrip='<div class="ed-strip">'+
  edStat(t.experienceYears,ar?"سنوات خبرة":"Years experience")+
  edStat(subjects.length,tr("subjects"))+
  edStat(stages.length,tr("stages"))+
  edStat(t.verified?"✓":"—",ar?"حالة التوثيق":"Verification")+
 '</div>';

 var edAbout='<section class="ed-sec" id="tgGeneral">'+
  '<div class="ed-sec-head"><h3>'+sectionIcon("book","#2F7A59")+' '+esc(ar?"نبذة عن المعلم":"About the teacher")+'</h3></div>'+
  (media&&media.generic?'<div class="gated-note">'+icon("info",14)+' '+esc(ar?"الصورة توضيحية إلى أن يرفع المعلم صورته.":"The portrait is illustrative until the teacher uploads a photo.")+'</div>':"")+
  '<p class="ed-lead"><span class="ed-drop">'+esc((String(name).trim().charAt(0))||"م")+'</span>'+esc(t.bio||tr("noDescription"))+'</p>'+
  (skills.length?'<div class="core-chips" style="margin-top:12px">'+skills.map(function(s){return '<span class="core-chip">'+esc(s)+'</span>'}).join("")+'</div>':"")+
  '<div class="ed-facts" style="margin-top:16px">'+
   edFact("user",ar?"الاسم الكامل":"Full name",name)+
   edFact("tag",ar?"التخصص":"Specialty",headline||"—")+
   edFact("teacher",ar?"سنوات الخبرة":"Experience",t.experienceYears!=null?(t.experienceYears+" "+(ar?"سنة":"yrs")):"—")+
   edFact("globe",ar?"طريقة التدريس":"Teaching mode",modes.join(" · ")||"—")+
   edFact("users",ar?"الجنس":"Gender",detailGenderLabel(t.gender))+
   edFact("shield",ar?"الحالة":"Status",statusLabel(t.verificationStatus||t.status))+
   (t.travelRadiusKm!=null?edFact("pin",ar?"نطاق التنقل":"Travel radius",t.travelRadiusKm+" km"):"")+
  '</div>'+
 '</section>';

 var subjectChips=subjects.map(function(s){
  var price=gated?esc(tr("pricingGated")):(s.amount!=null?esc(moneyText(s.amount,s.currency))+" · "+esc(billingLabel(s.billingPeriod)):"—");
  return '<article class="tv-subject"><span class="tv-subject-icon">'+icon("book",18)+'</span><div><b>'+esc(s.name||"—")+'</b><small>'+esc([s.languageCode,modeLabel(s.locationMode)].filter(Boolean).join(" · "))+'</small></div><strong>'+price+'</strong></article>';
 }).join("");
 var stageChips=stages.map(function(s){return '<span class="core-chip">'+esc(s.name||"—")+'</span>'}).join("");
 var edAcademic='<section class="ed-sec" id="tgAcademic">'+
  '<div class="ed-sec-head"><h3>'+sectionIcon("school","#2563EB")+' '+esc(ar?"المواد والمراحل":"Subjects & stages")+'</h3></div>'+
  '<h3 class="core-h3">'+esc(tr("subjects"))+'</h3>'+
  (subjectChips?'<div class="tv-subjects">'+subjectChips+'</div>':'<div class="empty-state">'+esc(tr("noDescription"))+'</div>')+
  '<h3 class="core-h3">'+esc(tr("stages"))+'</h3>'+
  (stageChips?'<div class="core-chips">'+stageChips+'</div>':'<div class="empty-state">'+esc(tr("noDescription"))+'</div>')+
  (quals.length?'<h3 class="core-h3">'+esc(ar?"المؤهلات":"Qualifications")+'</h3><div class="ed-facts">'+quals.map(function(q){
    return '<div class="ed-fact"><span>'+esc(q.title||"—")+'</span><b>'+esc([q.institutionName,q.degree,q.year].filter(Boolean).join(" · ")||"—")+'</b></div>';
   }).join("")+'</div>':"")+
 '</section>';

 var pricingRows=subjects.map(function(s){
  var price=gated?('<span class="gated-value">'+esc(tr("pricingGated"))+'</span>'):(s.amount!=null?moneyText(s.amount,s.currency):"—");
  var period=(!gated&&s.amount!=null)?'<div class="ed-prog-meta">'+esc(billingLabel(s.billingPeriod))+'</div>':"";
  var promo=(!gated&&s.discountPercent!=null&&s.promoLabel)?' <span class="promo-tag">'+esc(s.promoLabel)+' (-'+esc(s.discountPercent)+'%)</span>':"";
  return '<div class="ed-fact"><span>'+esc(s.name||"—")+'</span><b>'+price+promo+period+'</b></div>';
 }).join("");
 var edPricing='<section class="ed-sec" id="tgPricing">'+
  '<div class="ed-sec-head"><h3>'+sectionIcon("tag","#D98A2B")+' '+esc(ar?"الأسعار":"Pricing")+'</h3></div>'+
  (gated?'<div class="gated-note">'+icon("shield",14)+'<span>'+esc(tr("pricingGated"))+'</span></div>':"")+
  (pricingRows?'<div class="ed-facts">'+pricingRows+'</div>':'<div class="empty-state">'+esc(tr("noDescription"))+'</div>')+
 '</section>';

 var availRows=availability.map(function(s){
  return '<div class="ed-fact"><span>'+esc(dayLabel(s.dayOfWeek))+'</span><b>'+esc((s.startTime||"")+" – "+(s.endTime||""))+
   (s.locationMode?'<div class="ed-prog-meta">'+esc(modeLabel(s.locationMode))+'</div>':'')+'</b></div>';
 }).join("");
 var edAvailability='<section class="ed-sec" id="tgAvailability">'+
  '<div class="ed-sec-head"><h3>'+sectionIcon("calendar","#0E9488")+' '+esc(ar?"المواعيد المتاحة":"Availability")+'</h3></div>'+
  (availRows?'<div class="ed-facts">'+availRows+'</div>':'<div class="empty-state">'+esc(ar?"لا توجد مواعيد معلنة":"No availability posted")+'</div>')+
 '</section>';

 var edSide='<div class="ed-card tv-booking"><h4>'+icon("calendar",16)+' '+esc(ar?"ابدأ طلب الدرس":"Start a lesson request")+'</h4><p>'+esc(subjects.length?(ar?"اختر مادة من الملف، ثم تواصل مع المعلم لترتيب الموعد.":"Choose a subject, then contact the teacher to arrange a time."):(ar?"لم تُعلن مواد بعد. يمكنك التواصل مع المعلم للاستفسار عن الدروس المتاحة.":"No subjects are listed yet. Contact the teacher to ask about available lessons."))+'</p>'+
  (subjects.length?'<label>'+esc(tr("subjects"))+'<select id="tv-subject-choice">'+subjects.map(function(s){return '<option value="'+esc(s.name||"")+'">'+esc(s.name||"—")+'</option>'}).join("")+'</select></label>':"")+
  (availability.length?'<div class="tv-availability-note">'+icon("calendar",15)+' '+esc(availability.length+" "+(ar?"مواعيد معلنة":"listed time slots"))+'</div>':"")+
  ((t.whatsapp||t.phone)?'<button class="btn green tv-contact-btn" data-phone="'+esc(t.whatsapp||t.phone)+'" onclick="teacherContactSelected(this)">'+icon("whatsapp",16)+' '+esc(ar?"تواصل لترتيب الدرس":"Contact to arrange a lesson")+'</button>':'<div class="gated-note">'+esc(ar?"لا توجد وسيلة تواصل معلنة":"No contact method listed")+'</div>')+
  (gated?'<div class="gated-note">'+icon("shield",14)+' '+esc(tr("pricingGated"))+'</div>':"")+'</div>'+
  '<div class="ed-card"><h4>'+icon("phone",16)+' '+esc(tr("contactInfo"))+'</h4>'+
  (edContact("phone",tr("phoneLabel"),t.phone,telLink(t.phone))+
   edContact("whatsapp",tr("whatsapp"),t.whatsapp||t.phone,waLink(t.whatsapp||t.phone))+
   edContact("mail",tr("email"),t.userEmail,t.userEmail?"mailto:"+t.userEmail:"")||'<div class="empty-state">'+esc(tr("noDescription"))+'</div>')+
  ((t.whatsapp||t.phone)?'<div style="margin-top:12px">'+waButton(t.whatsapp||t.phone,{label:tr("whatsapp")})+'</div>':"")+
 '</div>'+
 (gallery.length?'<div class="ed-card"><h4>'+icon("grid",16)+' '+esc(ar?"معرض الصور":"Photo gallery")+'</h4><div class="ed-gallery">'+gallery.slice(0,2).map(function(g,i){return '<img class="'+(i===0?"big":"")+'" src="'+esc(g)+'" alt="'+esc(name)+'" loading="lazy">'}).join("")+'</div></div>':"")+
  '<div class="ed-card"><h4>'+icon("settings",16)+' '+esc(tr("profileActions"))+'</h4><div class="ed-actions">'+
   '<button class="btn" onclick="shareAnon(this.getAttribute(\'data-name\'))" data-name="'+esc(name)+'">'+icon("share",15)+' '+esc(tr("share"))+'</button>'+
   '<button class="btn" onclick="window.print()">'+icon("printer",15)+' '+esc(tr("printReport"))+'</button>'+
  '</div></div>'+(opts.extraSide||"");

 return edCrumb+'<div class="ed tv-detail">'+edCover+edStrip+
  '<nav class="ed-tabs">'+
   '<button class="on" onclick="scrollToProfile(\'tgGeneral\')">'+icon("home",15)+'<span>'+esc(tr("generalInfo"))+'</span></button>'+
   '<button onclick="scrollToProfile(\'tgAcademic\')">'+icon("school",15)+'<span>'+esc(ar?"المواد والمراحل":"Subjects & stages")+'</span></button>'+
   '<button onclick="scrollToProfile(\'tgAvailability\')">'+icon("calendar",15)+'<span>'+esc(ar?"المواعيد":"Availability")+'</span></button>'+
   (opts.extraTabs||"")+
  '</nav>'+
  '<div class="ed-body">'+
   '<div class="ed-main">'+edAbout+edAcademic+edAvailability+(opts.extraMain||"")+'</div>'+
   '<aside class="ed-side">'+edSide+'</aside>'+
  '</div></div>';
}

/* One profile resolver: the public directory and the dashboard both call this,
   so a teacher's profile is literally the same document in both places. */
function teacherDetailBlock(){
 return teacherProfileHtml(currentTeacher,{});
}

// Sharing for any entity profile, driven by the name on the button. Kept apart
// from shareTeacher() so the dashboard (which has no currentTeacher) reuses it.
function shareAnon(name){
 var url=location.href;
 if(navigator.share){navigator.share({title:name||"",text:name||"",url:url}).catch(function(){});return}
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(function(){alert(lang==="ar"?"تم نسخ الرابط":"Link copied")}).catch(function(){});return}
 window.prompt(lang==="ar"?"انسخ الرابط":"Copy the link",url);
}

function teacherDetailPage(){
 return publicShell(teacherDetailBlock());
}
function shareTeacher(){
 var t=currentTeacher||{};
 var name=t.userName||t.nameEn||"";
 var url=location.href;
 if(navigator.share){navigator.share({title:name,text:name,url:url}).catch(function(){});return}
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(function(){alert(lang==="ar"?"تم نسخ الرابط":"Link copied")}).catch(function(){});return}
 window.prompt(lang==="ar"?"انسخ الرابط":"Copy the link",url);
}

// The same detail document serves the dashboard and the public directory. Only
// the shell differs: visitors get the public chrome and no editing controls, and
// the server has already withheld every priced field from their offering call.
function detailPage(){
 var u=getCurrentUser();
 var sub=routeSub();
 var editable=canEditOrg(currentOrg);
 // The priced writes own a route each; only someone allowed to edit this
 // institution reaches the editor, and everyone else gets the read-only document.
 if(sub==="offering"||sub==="subject"){
  if(!currentOrg)return adminShell('<div class="uf-page"><div class="loading-inline"><div class="loader"></div></div></div>');
  if(editable)return offeringFormPage(sub);
 }
 if(editable)return adminShell(detailBlock(false));
 return publicShell(detailBlock(true));
}

// Dedicated page for one priced row of the institution offering:
// #/detail/offering/:stageId|new and #/detail/subject/new, both carrying ?id=
// so the institution being priced is still the one in the address bar.
function offeringFormPage(kind){
 var orgId=currentOrg&&currentOrg.id;
 if(!orgId)return adminShell('<div class="uf-page"><div class="loading-inline"><div class="loader"></div></div></div>');
 if(kind==="offering"){
  var sid=routeSubId();
  if(!orgStageEdit.open||String(orgStageEdit.stageId||"")!==(sid==="new"?"":String(sid))){
   orgStageEdit.open=true;orgStageEdit.stageId=(sid&&sid!=="new")?sid:null;orgStageEdit._error=null;
   if(!orgStageEdit.catalog){apiGet('/api/academic/stages').then(function(rows){orgStageEdit.catalog=rows||[];render()})
    .catch(function(){orgStageEdit.catalog=[];render()})}
  }
  return orgStageForm();
 }
 if(!orgSubjectEdit.open){orgSubjectEdit.open=true;orgSubjectEdit._error=null}
 return orgSubjectForm();
}

function generic(title){
 return adminShell(`<div class="welcome"><div><h1>${title}</h1><p>${tr("genericNote")}</p></div></div>${kpis()}<section class="panel"><div class="panel-title"><h2>${title}</h2></div><div style="padding:24px;color:#78827d">${tr("sampleContent")}</div></section>`)
}

/* ---------- Organization offering: stage + fee editing on the detail screen ----------
   These write to the same tenant-scoped endpoints the institution dashboard uses
   (/api/academic/org/:orgId/offering/stages/:stageId), which enforce
   requireOrgMember and the admin/owner role server-side. The screen only decides
   what is convenient to show, never what is allowed. */
var orgStageEdit={open:false,stageId:null,catalog:null,_error:null,_busy:false};
// Local field builders: admin-core keeps its own private copies for the admin
// forms, so the detail screen carries the small set it needs instead of
// reaching into that module.
function detailOpt(value,label,selected){
 return '<option value="'+esc(value)+'"'+(selected===value?" selected":"")+'>'+esc(label)+'</option>';
}
function detailField(label,id,html,wide){
 return '<div class="form-group'+(wide?" ac-field-wide":"")+'"><label>'+esc(label)+'</label>'+html+'</div>';
}
function detailInput(label,id,value,placeholder){
 return detailField(label,id,'<input id="'+id+'" type="text" value="'+esc(value==null?"":value)+
  '" placeholder="'+esc(placeholder||"")+'">');
}
function detailSelect(label,id,options,wide){
 return detailField(label,id,'<select id="'+id+'">'+options+'</select>',wide);
}
function detailBackRoute(){var id=currentOrg&&currentOrg.id;return "detail"+(id?"?id="+encodeURIComponent(id):"")}
function orgStageFormOpen(stageId){
 var target="detail/offering/"+encodeURIComponent(stageId||"new")+(currentOrg&&currentOrg.id?"?id="+encodeURIComponent(currentOrg.id):"");
 if(("#/"+target)===location.hash)render();else go(target);
}
function orgStageFormClose(){
 orgStageEdit.open=false;
 var target=detailBackRoute();if(("#/"+target)===location.hash)render();else go(target);
}
function orgStageForm(){
 if(!orgStageEdit.open)return "";
 var offering=orgOffering();
 var existing=null;
 if(orgStageEdit.stageId&&offering){
  (offering.stages||[]).forEach(function(s){if(s.stageId===orgStageEdit.stageId)existing=s});
 }
 var cat=orgStageEdit.catalog||[];
 var used={};
 if(offering)(offering.stages||[]).forEach(function(s){used[s.stageId]=true});
 var stageOpts=cat.filter(function(s){return !used[s.id]||s.id===orgStageEdit.stageId})
  .map(function(s){return detailOpt(s.id,s.name,s.id===orgStageEdit.stageId)}).join("");
 var cur=(existing&&existing.fee)||{};
 return formPage({back:detailBackRoute(),error:orgStageEdit._error,busy:orgStageEdit._busy,
  onSave:"orgStageSave()",onCancel:"orgStageFormClose()",
  title:orgStageEdit.stageId?tr("editLabel"):tr("addStageLabel"),
  subtitle:lang==="ar"?"هذه الرسوم والسعة خاصة بهذه المؤسسة، والمصدر هو عرض المؤسسة لا الكتالوج العام.":"These fees and seats belong to this institution; the source is its offering, not the global catalog.",
  body:detailSelect(tr("stages"),"os-stage",stageOpts)+
  detailInput(tr("feeLabel"),"os-fee",cur.amount!=null?String(cur.amount):"","0.00")+
  detailSelect(tr("currencyLabel"),"os-currency",["YER","SAR","USD"].map(function(c){return detailOpt(c,c,cur.currency||"YER")}).join(""))+
  detailSelect(tr("frequencyLabel"),"os-frequency",[["yearly",tr("yearly")],["termly",tr("termly")],["monthly",tr("monthly")]]
    .map(function(x){return detailOpt(x[0],x[1],cur.frequency||"yearly")}).join(""))+
  detailSelect(tr("deliveryLabel"),"os-delivery",[["on_site",tr("onSite")],["online",tr("onlineDelivery")],["hybrid",tr("hybridDelivery")]]
    .map(function(x){return detailOpt(x[0],x[1],(existing&&existing.deliveryMode)||"on_site")}).join(""))+
  detailSelect(tr("languageLabel"),"os-language",[["AR",detailLangLabel("AR")],["EN",detailLangLabel("EN")],["FR",detailLangLabel("FR")]]
    .map(function(x){return detailOpt(x[0],x[1],(existing&&existing.languageCode)||"AR")}).join(""))+
  detailInput(tr("capacityLabel"),"os-capacity",existing&&existing.capacity!=null?String(existing.capacity):"","")});
}
function orgStageSave(){
 var f=orgStageEdit;if(f._busy)return;
 var orgId=currentOrg&&currentOrg.id;if(!orgId)return;
 var stageId=(document.getElementById("os-stage")||{}).value||f.stageId;
 if(!stageId){f._error=lang==="ar"?"اختر المرحلة.":"Select a stage.";render();return}
 var payload={
  deliveryMode:(document.getElementById("os-delivery")||{}).value||"on_site",
  languageCode:(document.getElementById("os-language")||{}).value||"AR",
  amount:(document.getElementById("os-fee")||{}).value||"",
  currency:(document.getElementById("os-currency")||{}).value||"YER",
  frequency:(document.getElementById("os-frequency")||{}).value||"yearly"
 };
 var capacity=(document.getElementById("os-capacity")||{}).value;
 payload.capacity=capacity===""?null:Number(capacity);
 f._busy=true;
 apiPut('/api/academic/org/'+encodeURIComponent(orgId)+'/offering/stages/'+encodeURIComponent(stageId),payload)
  .then(function(){f._busy=false;f.open=false;f.stageId=null;return loadOrgDetailExtras(orgId)})
  .then(function(){var t=detailBackRoute();if(("#/"+t)===location.hash)render();else go(t)})
  .catch(function(e){f._busy=false;f._error=(e&&e.data&&e.data.error)||(e&&e.message)||"Error";render()});
}

// A subject the institution teaches but the platform catalog does not list.
// It is created under the institution, never in the global catalog, and it is
// born with reviewStatus "pending" so an admin still has to approve it.
var orgSubjectEdit={open:false,_error:null,_busy:false};
function orgSubjectFormOpen(){
 var target="detail/subject/new"+(currentOrg&&currentOrg.id?"?id="+encodeURIComponent(currentOrg.id):"");
 orgSubjectEdit.open=true;orgSubjectEdit._error=null;
 if(("#/"+target)===location.hash)render();else go(target);
}
function orgSubjectFormClose(){
 orgSubjectEdit.open=false;
 var target=detailBackRoute();if(("#/"+target)===location.hash)render();else go(target);
}
function orgSubjectForm(){
 if(!orgSubjectEdit.open)return "";
 return formPage({back:detailBackRoute(),error:orgSubjectEdit._error,busy:orgSubjectEdit._busy,
  onSave:"orgSubjectSave()",onCancel:"orgSubjectFormClose()",
  title:tr("addOwnSubject"),
  subtitle:lang==="ar"?"مادة تُضاف لهذه المؤسسة فقط، وتبقى بانتظار اعتماد المدير العام. المادة العامة لا تُعدّل من هنا.":"A subject added for this institution only; it stays pending until the platform admin approves it. The global catalog is not edited here.",
  body:detailInput(tr("subjectNameLabel"),"osub-name","",lang==="ar"?"مثال: الروبوتات":"e.g. Robotics")+
  detailSelect(tr("languageLabel"),"osub-language",[["AR",detailLangLabel("AR")],["EN",detailLangLabel("EN")],["FR",detailLangLabel("FR")]]
    .map(function(x){return detailOpt(x[0],x[1])}).join(""))+
  detailInput(tr("feeLabel"),"osub-fee","","0.00")+
  detailSelect(tr("currencyLabel"),"osub-currency",["YER","SAR","USD"].map(function(c){return detailOpt(c,c,"YER")}).join(""))+
  detailSelect(tr("frequencyLabel"),"osub-frequency",[["yearly",tr("yearly")],["termly",tr("termly")],["monthly",tr("monthly")]]
    .map(function(x){return detailOpt(x[0],x[1],"yearly")}).join(""))});
}
function orgSubjectSave(){
 var f=orgSubjectEdit;if(f._busy)return;
 var orgId=currentOrg&&currentOrg.id;if(!orgId)return;
 var name=((document.getElementById("osub-name")||{}).value||"").trim();
 if(!name){f._error=lang==="ar"?"اكتب اسم المادة.":"Enter the subject name.";render();return}
 f._busy=true;
 apiPost('/api/academic/org/'+encodeURIComponent(orgId)+'/subjects',{
  name:name,
  languageCode:(document.getElementById("osub-language")||{}).value||"AR",
  amount:(document.getElementById("osub-fee")||{}).value||"",
  currency:(document.getElementById("osub-currency")||{}).value||"YER",
  frequency:(document.getElementById("osub-frequency")||{}).value||"yearly"
 }).then(function(){f._busy=false;f.open=false;return loadOrgDetailExtras(orgId)})
  .then(function(){var t=detailBackRoute();if(("#/"+t)===location.hash)render();else go(t)})
  .catch(function(e){f._busy=false;f._error=(e&&e.data&&e.data.error)||(e&&e.message)||"Error";render()});
}

/* ---------- Institution report: print, Excel, Word, PDF ---------- */
// One report object drives all four outputs so the printed sheet and the exported
// files can never disagree about the institution's data.
function institutionReport(){
 var o=currentOrg||{};
 var offering=orgOffering();
 var gated=offering?offering.pricingGated===true:false;
 var ar=lang==="ar";
 var meta=[
  [tr("typeLabel"),orgTypeLabel(o.type)],
  [tr("principalLabel"),o.principalName||"—"],
  [tr("phoneLabel"),o.phone||"—"],
  [tr("email"),o.email||"—"],
  [tr("whatsapp"),o.whatsapp||o.phone||"—"],
  [tr("websiteLabel"),o.website||"—"],
  [tr("governorate"),o.governorate||"—"],
  [tr("district"),o.district||"—"],
  [tr("neighborhood"),o.neighborhood||"—"],
  [ar?"العنوان":"Address",o.address||"—"],
  [tr("accreditation"),o.verified?tr("docVerified"):tr("statusPending")],
  [tr("curriculumLabel"),detailCurriculumLabel(o.curriculum)]
 ];
 var stageRows=[[tr("stages"),tr("languageLabel"),tr("deliveryLabel"),tr("feeLabel"),tr("currencyLabel"),tr("frequencyLabel"),tr("capacityLabel"),tr("remainingSeatsLabel")]];
 (offering&&offering.stages?offering.stages:[]).forEach(function(s){
  stageRows.push([
   s.stageName||s.stageCode||"—",
   detailLangLabel(s.languageCode),
   detailDeliveryLabel(s.deliveryMode),
   gated||!s.fee?"—":Number(s.fee.amount),
   gated||!s.fee?"—":(s.fee.currency||"YER"),
   gated||!s.fee?"—":frequencyLabel(s.fee.frequency),
   s.capacity==null?"—":s.capacity,
   s.remainingSeats==null?"—":s.remainingSeats
  ]);
 });
 var subjectRows=[[tr("subjects"),tr("languageLabel"),tr("feeLabel"),tr("currencyLabel")]];
 asList(offering&&offering.subjects).forEach(function(s){
  subjectRows.push([s.name,detailLangLabel(s.languageCode),
   gated||s.amount==null?"—":Number(s.amount), s.currency||"YER"]);
 });
 var facilityRows=[[tr("facilitiesLabel"),ar?"الكمية":"Quantity",ar?"متاح":"Available"]];
 (detailExtras.facilities||[]).forEach(function(x){facilityRows.push([x.name,x.quantity||1,x.available===false?(ar?"لا":"No"):(ar?"نعم":"Yes")])});
 var serviceRows=[[tr("servicesLabel"),tr("feeLabel"),tr("currencyLabel")]];
 (detailExtras.services||[]).forEach(function(x){
  serviceRows.push([x.name,gated||x.price==null?"—":Number(x.price),x.currency||"YER"])});
 var docRows=[[tr("docType"),tr("docFile"),tr("reqStatus")]];
 (detailExtras.docs||[]).forEach(function(d){docRows.push([detailDocType(d.docType),d.fileName||"—",d.status||"—"])});

 var blocks=[
  {type:"title",text:tr("reportTitle")+" — "+tr("reportPlatform")},
  {type:"heading",text:o.name||"—"},
  {type:"sub",text:tr("reportIssued")+": "+new Date().toLocaleString(ar?"ar-YE":"en-GB")},
  {type:"heading",text:tr("identityLabel")},
  {type:"table",rows:[[ar?"الحقل":"Field",ar?"القيمة":"Value"]].concat(meta)},
  {type:"heading",text:tr("stageFeesLabel")},
  {type:"table",rows:stageRows},
  {type:"heading",text:tr("orgSubjectsLabel")},
  {type:"table",rows:subjectRows}
 ];
 if(facilityRows.length>1||serviceRows.length>1){
  blocks.push({type:"heading",text:tr("facilitiesLabel")},{type:"table",rows:facilityRows},
   {type:"heading",text:tr("servicesLabel")},{type:"table",rows:serviceRows});
 }
 if((detailExtras.docs||[]).length)blocks.push({type:"heading",text:tr("myDocuments")},{type:"table",rows:docRows});

 return {
  name:o.name||"institution",
  title:tr("reportTitle"),
  logo:orgLogo(o),
  meta:meta,
  sheets:[
   {name:ar?"البيانات الأساسية":"Details",rows:meta},
   {name:ar?"المراحل والرسوم":"Stages and fees",rows:stageRows},
   {name:ar?"المواد":"Subjects",rows:subjectRows},
   {name:ar?"المرافق":"Facilities",rows:facilityRows},
   {name:ar?"الخدمات":"Services",rows:serviceRows}
  ],
  blocks:blocks,
  gated:gated
 };
}
// The printed sheet is a standalone document with the platform letterhead and the
// institution logo, not a screenshot of the dashboard.
function printInstitution(){
 var report=institutionReport();
 var o=currentOrg||{};
 var ar=lang==="ar";
 var head='<header class="print-head"><div class="print-brand"><span class="print-mark">م</span><div><b>'+
  esc(tr("reportPlatform"))+'</b><small>'+(ar?"مدرستي — منصة التعليم اليمنية":"Madrasati — Yemen education platform")+'</small></div></div>'+
  '<div class="print-org"><img src="'+esc(report.logo)+'" alt=""><div><b>'+esc(o.name||"—")+'</b><small>'+
  esc(orgTypeLabel(o.type))+'</small></div></div></header>';
 var body=report.blocks.map(function(b){
  if(b.type==="title")return '<h1>'+esc(b.text)+'</h1>';
  if(b.type==="heading")return '<h2>'+esc(b.text)+'</h2>';
  if(b.type==="sub")return '<p class="print-sub">'+esc(b.text)+'</p>';
  if(b.type==="table")return '<table class="print-tbl">'+b.rows.map(function(r,i){
   return '<tr>'+r.map(function(c){return (i===0?"<th>":"<td>")+esc(c==null?"":c)+(i===0?"</th>":"</td>")}).join("")+'</tr>'
  }).join("")+'</table>';
  return "<p>"+esc(b.text)+"</p>";
 }).join("");
 var foot='<footer class="print-foot">'+esc(tr("reportPlatform"))+' · '+esc(tr("reportIssued"))+': '+
  esc(new Date().toLocaleDateString(ar?"ar-YE":"en-GB"))+'</footer>';
 var w=window.open("","_blank");
 if(!w){alert(ar?"تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة.":"Could not open the print window. Allow pop-ups.");return}
 w.document.write('<!doctype html><html lang="'+lang+'" dir="'+(ar?"rtl":"ltr")+'"><head><meta charset="utf-8">'+
  '<title>'+esc(report.title+" — "+(o.name||""))+'</title><style>'+
  'body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#1F2937;margin:24px}'+
  '.print-head{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:3px solid #1F5D46;padding-bottom:12px;margin-bottom:18px}'+
  '.print-brand,.print-org{display:flex;gap:10px;align-items:center}'+
  '.print-mark{display:inline-flex;width:40px;height:40px;border-radius:10px;background:#1F5D46;color:#fff;align-items:center;justify-content:center;font-weight:700;font-size:20px}'+
  '.print-org img{width:56px;height:56px;object-fit:contain}'+
  '.print-head small{display:block;color:#6B7280;font-size:11px}'+
  'h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;color:#174837;margin:18px 0 6px;border-inline-start:4px solid #B55A3C;padding-inline-start:8px}'+
  '.print-sub{color:#6B7280;font-size:12px;margin:0 0 12px}'+
  '.print-tbl{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px}'+
  '.print-tbl th,.print-tbl td{border:1px solid #E7DED3;padding:6px 8px;text-align:start}'+
  '.print-tbl th{background:#F1F5F2;font-weight:700}'+
  '.print-foot{margin-top:20px;border-top:1px solid #E7DED3;padding-top:8px;color:#6B7280;font-size:11px}'+
  '@page{size:A4;margin:12mm}'+
  '</style></head><body>'+head+body+foot+
  '<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>');
 w.document.close();
}
function exportInstitution(format){
 var report=institutionReport();
 if(!window.InstitutionReport){alert(lang==="ar"?"وحدة التصدير غير محمّلة.":"Export module not loaded.");return}
 if(format==="xlsx")return window.InstitutionReport.exportXlsx(report);
 if(format==="docx")return window.InstitutionReport.exportDocx(report);
 // PDF keeps the browser's own PDF writer: correct Arabic shaping in a PDF needs
 // an embedded font, which a no-build SPA cannot ship. The print-ready report is
 // the same document, so "Save as PDF" gives the intended result.
 return printInstitution();
}

// ---- institution profile view helpers ----
function scrollToProfile(id){
 var el=document.getElementById(id);
 if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});
}
function shareInstitution(){
 var o=currentOrg||{};
 var url=location.href;
 var title=o.name||"";
 if(navigator.share){navigator.share({title:title,text:title,url:url}).catch(function(){});return}
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(function(){alert(lang==="ar"?"تم نسخ الرابط":"Link copied")}).catch(function(){});return}
 window.prompt(lang==="ar"?"انسخ الرابط":"Copy the link",url);
}
// Large colorful icons (template scale). Every facility, service and programme
// maps to one icon in the single SVG set AND to a colour that suits it, so the
// detail sections read as designed: a flask for the lab, a wifi icon for the
// internet, a bus for transport, and so on. `tileIco` paints the icon in its
// colour on a soft tint of the same colour.
var FACILITY_GLYPHS={
 laboratory:{i:"flask",c:"#7C5CFF"},library:{i:"book",c:"#2F7A59"},sports:{i:"trophy",c:"#D98A2B"},
 security:{i:"shield",c:"#2563EB"},medical:{i:"med",c:"#E0455A"},air_conditioning:{i:"snow",c:"#3AA0C9"},
 internet:{i:"wifi",c:"#1F9D6B"},accessibility:{i:"access",c:"#7A4FBF"},cafeteria:{i:"utensils",c:"#C9743A"},
 parking:{i:"parking",c:"#4B6B8A"},playground:{i:"school",c:"#1F5D46"},other:{i:"grid",c:"#6B7280"}};
function facilityIcon(type){return FACILITY_GLYPHS[type]||FACILITY_GLYPHS.other}
var SERVICE_GLYPHS={
 transportation:{i:"bus",c:"#D98A2B"},after_school:{i:"palette",c:"#C2569B"},tutoring:{i:"book",c:"#2F7A59"},
 exam_prep:{i:"edit",c:"#2563EB"},field_trip:{i:"map",c:"#0E9488"},uniform:{i:"shirt",c:"#7C5CFF"},
 meal:{i:"utensils",c:"#C9743A"},entertainment:{i:"ticket",c:"#E0455A"},other:{i:"sparkle",c:"#6B7280"}};
function serviceIcon(type){return SERVICE_GLYPHS[type]||SERVICE_GLYPHS.other}
var PROGRAM_GLYPHS={KG:{i:"blocks",c:"#C2569B"},PRIMARY:{i:"book",c:"#2F7A59"},PREP:{i:"flask",c:"#7C5CFF"},
 SECONDARY:{i:"college",c:"#2563EB"},DIPLOMA:{i:"doc",c:"#D98A2B"},HIGHER_DIPLOMA:{i:"doc",c:"#D98A2B"},
 BACHELOR:{i:"college",c:"#0E9488"},MASTER:{i:"college",c:"#7A4FBF"},DOCTORATE:{i:"college",c:"#1F5D46"}};
function programGlyph(code){return PROGRAM_GLYPHS[code]||{i:"book",c:"#2F7A59"}}
// One tinted badge primitive, used by the facility/service/programme tiles.
function tileIco(spec,size){
 if(typeof spec==="string")spec={i:spec,c:"#1F5D46"};
 if(!spec||!spec.i)spec={i:"info",c:"#6B7280"};
 return '<span class="tile-ico" style="color:'+spec.c+';background:'+spec.c+'1f">'+icon(spec.i,size||22)+'</span>';
}
// A matching color chip for a detail section heading.
function sectionIcon(name,color){return '<span class="ed-sec-ic" style="color:'+color+';background:'+color+'1f">'+icon(name,16)+'</span>'}
function profileTile(glyph,label,extra,off){
 return '<div class="profile-tile'+(off?" off":"")+'">'+tileIco(glyph,22)+'<b>'+esc(label)+'</b>'+(extra?'<span class="profile-tile-extra">'+esc(extra)+'</span>':"")+'</div>';
}

function tabBar(tabs,active){
 return `<div class="section-tabs">${tabs.map(x=>`<button class="${active===x[0]?"active":""}" onclick="setSectionTab('${x[0]}')">${tr(x[1])}</button>`).join("")}</div>`
}
let sectionTab="overview";
function setSectionTab(v){sectionTab=v;render()}

/* ---------- Locations admin: one catalog, dedicated form pages (A5) ----------
   The geography is a cascade — country -> governorate -> district -> neighborhood
   — so every level is a row in one tree, and adding or editing any level happens
   on its own dedicated route through the shared formPage() builder rather than in
   a panel pressed into the list. That is the shape every other module uses
   (#/schools/new, #/teachersAdmin/new, …), so a form is never "the one place the
   system looks different".
   Writes require the platform admin role; the server enforces that, and this
   screen only decides which controls are worth showing. */
var locAdmin={tab:"governorates",rows:[],counts:{},loading:false,loadedTab:null,error:null,
 countries:[],govs:[],filterGov:"",nbGov:"",nbDist:"",submitting:false,info:null,
 form:null,_error:null,_busy:false,draft:{}};

// app.js has no t(ar,en) helper of its own (that one lives inside admin-core's
// IIFE), so the locations module declares the same plain-language switch locally
// instead of reaching across modules.
function locT(ar,en){return lang==="ar"?ar:en}

var LOC_TABS=[["countries","countries"],["governorates","governorates"],["districts","districts"],
  ["neighborhoods","neighborhoods"],["requests","locationRequests"]];

// The route segment for each level, and the level each segment means.
var LOC_SEG_KIND={countries:"country",governorates:"governorate",districts:"district",
  neighborhoods:"neighborhood",requests:"request"};
var LOC_KIND_SEG={country:"countries",governorate:"governorates",district:"districts",
  neighborhood:"neighborhoods",request:"requests"};

function locAdminSetTab(tab){
 locAdmin.tab=tab;locAdmin.info=null;locAdmin.loadedTab=null;
 var target="locations";if(("#/"+target)===location.hash)render();else go(target);
}

function locAdminLoad(){
 if(locAdmin.loading||locAdmin.loadedTab===locAdmin.tab)return;
 locAdmin.loading=true;locAdmin.error=null;
 // The admin sees every country including a deactivated one, so the manage read
 // is what this screen lists; the public read stays the filtered one.
 var url=locAdmin.tab==="countries"?(isAdmin()?'/api/locations/countries/manage':'/api/locations/countries')
  :locAdmin.tab==="governorates"?'/api/locations/governorates'
  :locAdmin.tab==="districts"?'/api/locations/districts'+(locAdmin.filterGov?'?governorateId='+encodeURIComponent(locAdmin.filterGov):'')
  :locAdmin.tab==="neighborhoods"?'/api/locations/neighborhoods'+(locAdmin.nbDist?'?districtId='+encodeURIComponent(locAdmin.nbDist):'')
  :'/api/locations/requests';
 var p=apiGet(url);
 // Countries are the root of the cascade on every level, not only on their own
 // tab, so they are fetched once and cached here.
 if(!locAdmin.countries.length){
  apiGet('/api/locations/countries').then(function(c){locAdmin.countries=c||[];render()}).catch(function(){});
 }
 if(locAdmin.tab==="governorates"&&!locAdmin.govs.length){
  p=p.then(function(rows){locAdmin.govs=rows||[];return rows});
 }
 // Neighborhoods without a district filter would dump the whole table: require a
 // district selection first.
 if(locAdmin.tab==="neighborhoods"&&!locAdmin.nbDist){
  locAdmin.loading=false;locAdmin.loadedTab=null;locAdmin.rows=[];
  if(!locAdmin.govs.length){
   apiGet('/api/locations/governorates').then(function(g){locAdmin.govs=g||[];render()}).catch(function(){});
  }
  return;
 }
 p.then(function(rows){
  locAdmin.rows=rows||[];locAdmin.loading=false;locAdmin.loadedTab=locAdmin.tab;render();
 }).catch(function(e){
  // Non-admin users cannot list requests — show empty instead of an error.
  if(locAdmin.tab==="requests"&&e.status===403){locAdmin.rows=[];locAdmin.loading=false;locAdmin.loadedTab=locAdmin.tab;render();return}
  locAdmin.loading=false;locAdmin.error=e.message;render();
 });
}
function locAdminFilterGov(){
 var v=(document.getElementById("la-fgov")||{}).value||"";
 locAdmin.filterGov=v;locAdmin.loadedTab=null;locAdminLoad();
}
function locAdminNbGov(){
 var v=(document.getElementById("la-ngov")||{}).value||"";
 locAdmin.nbGov=v===""?null:Number(v);locAdmin.nbDist="";locAdmin.loadedTab=null;
 if(locAdmin.nbGov)regLoadDists(locAdmin.nbGov);
 render();
}
function locAdminNbDist(){
 var v=(document.getElementById("la-ndist")||{}).value||"";
 locAdmin.nbDist=v;locAdmin.loadedTab=null;locAdminLoad();
}
function locTypeLabel(kind){
 var map={country:"countries",governorate:"governorates",district:"districts",
   neighborhood:"neighborhoods",request:"locRequestSubmit"};
 return tr(map[kind]||kind);
}

/* ---------- the dedicated form routes ----------
   #/locations/countries/new      #/locations/countries/edit/:id
   #/locations/governorates/new   #/locations/governorates/edit/:id
   #/locations/districts/new      #/locations/districts/edit/:id
   #/locations/neighborhoods/new  #/locations/neighborhoods/edit/:id
   #/locations/requests/new
   The level is routePath()[1], the mode routePath()[2] and the id routePath()[3]. */
function locFormTarget(kind,row){
 return "locations/"+LOC_KIND_SEG[kind]+"/"+(row?"edit/"+encodeURIComponent(row.id):"new");
}

function locEnsureLookups(kind,row){
 if(!locAdmin.countries.length){
  apiGet('/api/locations/countries').then(function(c){locAdmin.countries=c||[];render()}).catch(function(){});
 }
 if((kind==="district"||kind==="neighborhood")&&!locAdmin.govs.length){
  apiGet('/api/locations/governorates').then(function(g){locAdmin.govs=g||[];render()}).catch(function(){});
 }
 if(kind==="neighborhood"&&row&&row.governorateId)regLoadDists(row.governorateId);
}

function locFormOpen(kind,row){
 locAdmin.form={kind:kind,row:row||null,mode:row?"edit":"add"};
 locAdmin._error=null;locAdmin.draft={};
 locEnsureLookups(kind,row);
 var target=locFormTarget(kind,row);
 if(("#/"+target)===location.hash)render();else go(target);
}
function locFormClose(){
 locAdmin.form=null;locAdmin._error=null;
 var target="locations";if(("#/"+target)===location.hash)render();else go(target);
}
// The draft survives the re-renders a cascading select triggers, so typed values
// are read back off the DOM before each render and replayed after.
function locDraft(){
 var f=locAdmin.form;if(!f)return;
 locDraftIds(f.kind).forEach(function(id){
  var el=document.getElementById(id);if(el)locAdmin.draft[id]=el.value;});
}
function locDraftIds(kind){
 if(kind==="country")return ["lc-name","lc-nameen","lc-code","lc-calling","lc-sort"];
 if(kind==="governorate")return ["lc-country","lc-name","lc-nameen","lc-code"];
 if(kind==="district")return ["lc-gov","lc-name","lc-nameen","lc-code"];
 if(kind==="neighborhood")return ["lc-gov","lc-dist","lc-name","lc-nameen","lc-code"];
 return ["lc-rkind","lc-rgov","lc-rdist","lc-rname","lc-rnameen","lc-rcode","lc-rnotes"];
}
function locVal(id,fallback){
 var d=locAdmin.draft[id];
 if(d!==undefined&&d!==null&&d!=="")return d;
 var el=document.getElementById(id);
 if(el)return el.value;
 return fallback==null?"":fallback;
}
// Choosing a governorate resets the district beneath it: the cascade must never
// offer a district that belongs to a different governorate.
window.locGovChange=function(){
 locDraft();
 locAdmin.draft["lc-gov"]=(document.getElementById("lc-gov")||{}).value||"";
 locAdmin.draft["lc-dist"]="";
 if(locAdmin.draft["lc-gov"])regLoadDists(Number(locAdmin.draft["lc-gov"]));
 render();
};

/* ---------- field builders (the same .uf-grid shape as every other form) ---- */
function locNameFields(nameAr,nameEn){
 return '<div class="form-group"><label>'+tr("locNameAr")+'</label>'+
  '<input id="lc-name" value="'+esc(nameAr)+'" placeholder="'+esc(locT("مثال: صنعاء","e.g. Sana'a"))+'"></div>'+
  '<div class="form-group"><label>'+tr("locNameEn")+'</label>'+
  '<input id="lc-nameen" dir="ltr" value="'+esc(nameEn)+'"></div>';
}
function locCodeField(value){
 return '<div class="form-group"><label>'+tr("locCode")+'</label>'+
  '<input id="lc-code" dir="ltr" value="'+esc(value)+'"></div>';}

function locFormBody(f){
 var kind=f.kind,row=f.row||{};
 function v(id,fallback){return locVal(id,fallback)}
 if(kind==="country"){
  return locNameFields(v("lc-name",row.name||""),v("lc-nameen",row.nameEn||""))+
   '<div class="form-group"><label>'+tr("locIsoCode")+'</label>'+
   '<input id="lc-code" dir="ltr" maxlength="2" value="'+esc(v("lc-code",row.code||""))+'" placeholder="YE"></div>'+
   '<div class="form-group"><label>'+tr("locCallingCode")+'</label>'+
   '<input id="lc-calling" dir="ltr" inputmode="numeric" value="'+esc(v("lc-calling",row.callingCode||""))+'" placeholder="967">'+
   '<small class="ac-hint">'+locT("مفتاح الاتصال الدولي بأرقام فقط.","The international calling code, digits only.")+'</small></div>'+
   '<div class="form-group"><label>'+tr("sortOrderLabel")+'</label>'+
   '<input id="lc-sort" type="number" dir="ltr" value="'+esc(v("lc-sort",row.sortOrder==null?0:row.sortOrder))+'"></div>'+
   (row.isDefault?'<p class="uf-wide ac-hint">'+locT("هذا البلد الافتراضي ولا يمكن تعطيله، لأن بقية المواقع تتفرع منه.","This is the default country and cannot be deactivated, because the rest of the hierarchy hangs from it.")+'</p>':"");
 }
 if(kind==="governorate"){
  var cur=v("lc-country",row.countryId==null?"":String(row.countryId));
  var cOpts=opt("",locT("— بدون بلد —","— No country —"),cur==="");
  locAdmin.countries.forEach(function(c){cOpts+=opt(String(c.id),c.name,String(c.id)===String(cur))});
  return '<div class="form-group"><label>'+tr("countries")+'</label>'+
   '<select id="lc-country">'+cOpts+'</select></div>'+
   locNameFields(v("lc-name",row.name||""),v("lc-nameen",row.nameEn||""))+
   locCodeField(v("lc-code",row.code||""));
 }
 if(kind==="district"){
  var curG=v("lc-gov",row.governorateId==null?"":String(row.governorateId));
  var gOpts=opt("",locT("— اختر المحافظة —","— Select a governorate —"),curG==="");
  locAdmin.govs.forEach(function(g){gOpts+=opt(String(g.id),g.name,String(g.id)===String(curG))});
  return '<div class="form-group"><label>'+tr("governorates")+'</label>'+
   '<select id="lc-gov" onchange="locGovChange()">'+gOpts+'</select></div>'+
   locNameFields(v("lc-name",row.name||""),v("lc-nameen",row.nameEn||""))+
   locCodeField(v("lc-code",row.code||""));
 }
 if(kind==="neighborhood"){
  var curGv=v("lc-gov",row.governorateId==null?"":String(row.governorateId));
  var gOpts2=opt("",locT("— اختر المحافظة —","— Select a governorate —"),curGv==="");
  locAdmin.govs.forEach(function(g){gOpts2+=opt(String(g.id),g.name,String(g.id)===String(curGv))});
  var dl=curGv?(regDists[curGv]||[]):[];
  var curD=v("lc-dist",row.districtId==null?"":String(row.districtId));
  var dOpts='<option value="">'+esc(locT("— اختر المديرية —","— Select a district —"))+'</option>'+
   dl.map(function(d){return opt(String(d.id),d.name,String(d.id)===String(curD))}).join("");
  return '<div class="form-group"><label>'+tr("governorates")+'</label>'+
   '<select id="lc-gov" onchange="locGovChange()">'+gOpts2+'</select></div>'+
   '<div class="form-group"><label>'+tr("districts")+'</label>'+
   '<select id="lc-dist"'+(curGv?"":" disabled")+'>'+dOpts+'</select></div>'+
   (curGv?"":'<p class="uf-wide ac-hint">'+locT("اختر المحافظة أولاً لعرض مديرياتها.","Choose a governorate first to list its districts.")+'</p>')+
   locNameFields(v("lc-name",row.name||""),v("lc-nameen",row.nameEn||""))+
   locCodeField(v("lc-code",row.code||""));
 }
 // The missing-location request: any authenticated user may file one, only an
 // admin reviews it, so this is the one level the screen does not gate.
 var rk=v("lc-rkind",row.kind||"neighborhood");
 var rGov=v("lc-rgov",locAdmin.govs[0]?String(locAdmin.govs[0].id):"");
 if(rGov&&!regDists[rGov])regLoadDists(Number(rGov));
 var rdl=rGov?(regDists[rGov]||[]):[];
 var rGovOpts=locAdmin.govs.map(function(g){return opt(String(g.id),g.name,String(g.id)===String(rGov))}).join("");
 var rDistOpts='<option value="">—</option>'+
  rdl.map(function(d){return opt(String(d.id),d.name,String(d.id)===String(locVal("lc-rdist","")))}).join("");
 return '<div class="form-group"><label>'+tr("locKind")+'</label>'+
  '<select id="lc-rkind" onchange="render()">'+
   opt("neighborhood",tr("neighborhoods"),rk==="neighborhood")+opt("district",tr("districts"),rk==="district")+
   opt("governorate",tr("governorates"),rk==="governorate")+'</select></div>'+
  (rk==="governorate"?"":
   '<div class="form-group"><label>'+tr("governorates")+'</label>'+
   '<select id="lc-rgov" onchange="render()">'+rGovOpts+'</select></div>')+
  (rk==="neighborhood"?
   '<div class="form-group"><label>'+tr("districts")+'</label>'+
   '<select id="lc-rdist">'+rDistOpts+'</select></div>':"")+
  '<div class="form-group"><label>'+tr("locNameAr")+'</label>'+
  '<input id="lc-rname" value="'+esc(v("lc-rname",""))+'"></div>'+
  '<div class="form-group"><label>'+tr("locNameEn")+'</label>'+
  '<input id="lc-rnameen" dir="ltr" value="'+esc(v("lc-rnameen",""))+'"></div>'+
  '<div class="form-group"><label>'+tr("locCode")+'</label>'+
  '<input id="lc-rcode" dir="ltr" value="'+esc(v("lc-rcode",""))+'"></div>'+
  '<div class="form-group"><label>'+tr("locNotes")+'</label>'+
  '<input id="lc-rnotes" value="'+esc(v("lc-rnotes",""))+'"></div>';
}

function locFormPage(kind){
 // A refresh or a pasted link arrives with no draft, so the row is re-resolved
 // from whatever list is already cached before the form is built.
 if(!locAdmin.form||locAdmin.form.kind!==kind)locFormInit(kind);
 var f=locAdmin.form;
 return formPage({back:"locations",error:locAdmin._error,busy:locAdmin._busy,
  onSave:"locFormSave()",onCancel:"locFormClose()",
  title:(f.mode==="edit"?locT("تعديل","Edit")+" ":"")+locTypeLabel(kind),
  subtitle:locT("التسلسل الجغرافي: البلد ثم المحافظة ثم المديرية ثم الحي. كل مستوى يُدار من صفحته المستقلة.",
    "The geographic cascade: country, then governorate, then district, then neighborhood. Each level is managed from its own page."),
  body:locFormBody(f)});
}
function locFormInit(kind){
 var path=routePath();
 var mode=path[2]||"new";
 var id=path[3]?decodeURIComponent(path[3]):"";
 var row=null;
 if(mode==="edit"&&id){
  var list=kind==="country"?locAdmin.countries
   :kind==="governorate"?locAdmin.govs
   :(locAdmin.rows||[]);
  for(var i=0;i<list.length;i++){if(String(list[i].id)===String(id))row=list[i]}
 }
 locAdmin.form={kind:kind,row:row,mode:mode==="edit"?"edit":"add"};
 locAdmin._error=null;locAdmin.draft={};
 locEnsureLookups(kind,row);
}

window.locFormSave=function(){
 var f=locAdmin.form;if(!f||locAdmin._busy)return;
 locDraft();
 var v=function(id){var el=document.getElementById(id);return el?String(el.value||"").trim():""};
 var payload,url,method="post",missing=null;
 if(f.kind==="country"){
  payload={name:v("lc-name"),nameEn:v("lc-nameen")||null,code:v("lc-code")||null,
   callingCode:v("lc-calling")||null,sortOrder:Number(v("lc-sort")||0)};
  url="/api/locations/countries";
  if(f.mode==="edit"){url+="/"+f.row.id;method="patch"}
 } else if(f.kind==="governorate"){
  payload={name:v("lc-name"),nameEn:v("lc-nameen")||null,code:v("lc-code")||null,
   countryId:v("lc-country")||null};
  url="/api/locations/governorates";
 } else if(f.kind==="district"){
  payload={governorateId:v("lc-gov")||null,name:v("lc-name"),nameEn:v("lc-nameen")||null,code:v("lc-code")||null};
  if(!payload.governorateId)missing=locT("اختر المحافظة.","Select a governorate.");
  url="/api/locations/districts";
 } else if(f.kind==="neighborhood"){
  payload={districtId:v("lc-dist")||null,name:v("lc-name"),nameEn:v("lc-nameen")||null,code:v("lc-code")||null};
  if(!payload.districtId)missing=locT("اختر المديرية.","Select a district.");
  url="/api/locations/neighborhoods";
 } else {
  var rk=v("lc-rkind")||"neighborhood";
  payload={kind:rk,nameAr:v("lc-rname"),nameEn:v("lc-rnameen")||null,
   code:v("lc-rcode")||null,notes:v("lc-rnotes")||null};
  if(rk==="governorate")payload.countryCode=(locAdmin.countries[0]||{}).code||"YE";
  else{
   payload.governorateId=v("lc-rgov")||null;
   if(!payload.governorateId)missing=locT("اختر المحافظة.","Select a governorate.");
   else if(rk==="neighborhood"){
    payload.districtId=v("lc-rdist")||null;
    if(!payload.districtId)missing=locT("اختر المديرية.","Select a district.");
   }
  }
  url="/api/locations/requests";
 }
 var nameValue=payload.name!==undefined?payload.name:payload.nameAr;
 if(!missing&&(!nameValue||nameValue.length<2))
  missing=locT("الاسم بالعربية مطلوب (حرفان على الأقل).","The Arabic name is required (at least two characters).");
 if(missing){locAdmin._error=missing;render();return}
 locAdmin._busy=true;locAdmin._error=null;
 var req=method==="patch"?apiPatch(url,payload):apiPost(url,payload);
 req.then(function(){
  locAdmin._busy=false;locAdmin.form=null;
  locAdmin.info=tr(f.kind==="request"?"locRequestSent":"locAdded");
  // Every cached level can hold a stale list after a write; drop them all.
  locAdmin.loadedTab=null;locAdmin.rows=[];
  if(f.kind==="country")locAdmin.countries=[];
  if(f.kind==="governorate")locAdmin.govs=[];
  var target="locations";if(("#/"+target)===location.hash)render();else go(target);
 }).catch(function(e){locAdmin._busy=false;locAdmin._error=msgErr(e);render()});
};

/* ---------- the section page: tabs + one table, no inline forms ---------- */
function locationsPage(){
 // A form route renders the form; the list route renders the list. Nothing here
 // ever puts the two on the screen at the same time.
 var path=routePath();
 var kind=LOC_SEG_KIND[path[1]];
 if(kind){
  var mode=path[2]||"";
  if(mode==="new"||mode==="edit"){locAdmin.tab=LOC_KIND_SEG[kind];return locFormPage(kind)}
 }
 var admin=isAdmin();
 if(!LOC_TABS.some(function(x){return x[0]===locAdmin.tab}))locAdmin.tab="governorates";
 if(!locAdmin.govs.length&&locAdmin.tab!=="countries"){
  apiGet('/api/locations/governorates').then(function(g){locAdmin.govs=g||[];if(locAdmin.tab==="governorates")render()}).catch(function(){});
 }
 locAdminLoad();
 var titleKey={countries:"countries",governorates:"governorates",districts:"districts",
  neighborhoods:"neighborhoods",requests:"locationRequests"};
 var canAdd=admin&&locAdmin.tab!=="requests";
 var locHero=(typeof sectionHero==="function")?sectionHero({route:"locations",title:tr("locations"),
  subtitle:locT("الكتالوج الجغرافي: البلد ثم المحافظة ثم المديرية ثم الحي. كل إضافة أو تعديل تُفتح في صفحة مستقلة.",
    "The geographic catalog: country, then governorate, then district, then neighborhood. Every add or edit opens on its own page."),
  stats:[{icon:"globe",value:(locAdmin.countries||[]).length,labelAr:"الدول",labelEn:"Countries",tone:"primary"},
    {icon:"map",value:(locAdmin.govs||[]).length,labelAr:"المحافظات",labelEn:"Governorates",tone:"info"},
    {icon:"pin",value:(locAdmin.rows||[]).length,labelAr:tr(titleKey[locAdmin.tab]),labelEn:tr(titleKey[locAdmin.tab]),tone:"pos"}],
  donut:{title:{ar:"مستويات الكتالوج",en:"Catalog levels"},center:{ar:"عنصر",en:"items"},categories:[
    {label:{ar:"الدول",en:"Countries"},value:(locAdmin.countries||[]).length},
    {label:{ar:"المحافظات",en:"Governorates"},value:(locAdmin.govs||[]).length},
    {label:{ar:tr(titleKey[locAdmin.tab]),en:tr(titleKey[locAdmin.tab])},value:(locAdmin.rows||[]).length}]}}):'';
 var body=locHero+
  '<div class="section-tabs">'+LOC_TABS.map(function(x){return '<button class="'+(locAdmin.tab===x[0]?"active":"")+
  '" onclick="locAdminSetTab(\''+x[0]+'\')">'+esc(tr(x[1]))+'</button>'}).join("")+'</div>';
 body+='<section class="panel"><div class="panel-title"><div><h2>'+esc(tr(titleKey[locAdmin.tab]))+
  '</h2>'+(locAdmin.info?'<p>'+esc(locAdmin.info)+'</p>':'')+'</div><div class="sp-actions">';
 if(canAdd)
  body+='<button class="btn brown" onclick="locFormOpen(\''+LOC_SEG_KIND[locAdmin.tab]+'\',null)">'+icon("plus",15)+' '+
   locT("إضافة","Add")+'</button>';
 if(locAdmin.tab==="requests")
  body+='<button class="btn brown" onclick="locFormOpen(\'request\',null)">'+icon("plus",15)+' '+esc(tr("locRequestSubmit"))+'</button>';
 body+='</div></div>';
 if(locAdmin.tab==="districts"){
  body+='<div class="toolbar"><select id="la-fgov" class="f-select" onchange="locAdminFilterGov()"><option value="">'+esc(tr("allGovernorates"))+'</option>'+
   locAdmin.govs.map(function(g){return opt(g.id,g.name,String(locAdmin.filterGov)===String(g.id))}).join("")+'</select></div>';
 }
 if(locAdmin.tab==="neighborhoods"){
  var nbDl=locAdmin.nbGov?(regDists[locAdmin.nbGov]||[]):[];
  body+='<div class="toolbar"><select id="la-ngov" class="f-select" onchange="locAdminNbGov()"><option value="">'+esc(tr("governorate"))+'...</option>'+
   locAdmin.govs.map(function(g){return opt(g.id,g.name,locAdmin.nbGov===g.id)}).join("")+'</select>'+
   '<select id="la-ndist" class="f-select" onchange="locAdminNbDist()"'+(locAdmin.nbGov?"":" disabled")+'>'+(locAdmin.nbGov?opt("",tr("district")+"...",!locAdmin.nbDist)+nbDl.map(function(d){return opt(d.id,d.name,String(locAdmin.nbDist)===String(d.id))}).join(""):opt("",tr("district")+"...",true))+'</select></div>';
 }
 if(locAdmin.loading)body+='<div class="loading-inline"><div class="loader"></div></div>';
 else if(locAdmin.error)body+='<div class="empty-state">'+esc(locAdmin.error)+'</div>';
 else{
  var rows=locAdmin.rows;
  if(!rows.length)body+='<div class="empty-state">'+esc(tr("noLocationRows"))+'</div>';
  else if(locAdmin.tab==="countries"){
   body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+(lang==="ar"?"الاسم":"Name")+
   '</th><th>'+(lang==="ar"?"الإنجليزية":"English")+'</th><th>'+esc(tr("locIsoCode"))+'</th><th>'+esc(tr("countryCode"))+
   '</th>'+(admin?'<th></th>':'')+'</tr></thead><tbody>'+
   rows.map(function(r){
    var json=esc(JSON.stringify(r)).replace(/"/g,'&quot;');
    var open="locRowEdit('country',"+json+")";
    var acts=admin?'<td class="crud-actions"><button class="crud edit" title="'+esc(tr("editLabel"))+
      '" onclick="event.stopPropagation();'+open+'">'+icon("edit",14)+'</button></td>':'';
    return '<tr'+(admin?' class="row-click" onclick="'+open+'"':'')+
      '><td><b>'+esc(r.name)+'</b>'+(r.isDefault?' <span class="badge ok">'+esc(locT("افتراضي","default"))+'</span>':"")+
      (r.isActive===false?' <span class="badge wait">'+esc(locT("معطّل","inactive"))+'</span>':"")+'</td>'+
      '<td dir="ltr">'+esc(r.nameEn||"—")+'</td><td dir="ltr">'+esc(r.code||"—")+'</td>'+
      '<td dir="ltr">'+(r.callingCode?"+"+esc(r.callingCode):"—")+'</td>'+(admin?acts:'')+'</tr>';
   }).join("")+'</tbody></table></div>';
  }else if(locAdmin.tab==="requests"){
   body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+esc(tr("locKind"))+'</th><th>'+esc(tr("locNameAr"))+
   '</th><th>'+esc(tr("governorate"))+' / '+esc(tr("district"))+'</th><th>'+esc(tr("reqStatus"))+
   '</th>'+(admin?'<th></th>':'')+'</tr></thead><tbody>'+
   rows.map(function(r){
    var act="";
    if(admin&&r.status==="pending"){
     act='<td class="crud-actions">'+
      '<button class="crud verify" onclick="verLocReviewAdmin('+r.id+',\'approved\')" title="'+esc(tr("approveBtn"))+'">'+icon("check",15)+'</button>'+
      '<button class="crud delete" onclick="verLocReviewAdmin('+r.id+',\'rejected\')" title="'+esc(tr("rejectBtn"))+'">'+icon("x",15)+'</button>'+
      '</td>';
    }
    return '<tr><td>'+esc(r.kind)+'</td><td><b>'+esc(r.name_ar)+'</b>'+
     (r.name_en?'<div class="entity-sub">'+esc(r.name_en)+'</div>':'')+'</td><td>'+
     esc(r.governorate_name||"—")+' / '+esc(r.district_name||"—")+'</td><td><span class="badge '+
     (r.status==="approved"?"ok":r.status==="rejected"?"bad":"wait")+'">'+esc(r.status)+'</span></td>'+
     (admin?act:'')+'</tr>';
   }).join("")+'</tbody></table></div>';
  }else{
   // Governorates, districts and neighborhoods share one table shape: the row
   // opens that level's own editor, exactly like the institutions catalog.
   var kindName=LOC_SEG_KIND[locAdmin.tab];
   var allDists=[];
   Object.keys(regDists).forEach(function(k){allDists=allDists.concat(regDists[k]||[])});
   body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+(lang==="ar"?"الاسم":"Name")+
   '</th><th>'+(lang==="ar"?"الإنجليزية":"English")+'</th><th>'+(lang==="ar"?"الرمز":"Code")+
   '</th><th>'+(lang==="ar"?"الأصل":"Parent")+'</th>'+(admin?'<th></th>':'')+'</tr></thead><tbody>'+
   rows.map(function(r){
    var parent=r.countryCode||"—";
    if(r.governorateId){
     var g=locAdmin.govs.filter(function(x){return String(x.id)===String(r.governorateId)})[0];
     parent=(g&&g.name)||("gov:"+r.governorateId);
    }
    if(r.districtId){
     var d=allDists.filter(function(x){return String(x.id)===String(r.districtId)})[0];
     parent=(d&&d.name)||("dist:"+r.districtId);
    }
    var json=esc(JSON.stringify(r)).replace(/"/g,'&quot;');
    var open="locRowEdit('"+kindName+"',"+json+")";
    var acts=admin?'<td class="crud-actions"><button class="crud edit" title="'+esc(tr("editLabel"))+
      '" onclick="event.stopPropagation();'+open+'">'+icon("edit",14)+'</button></td>':'';
    return '<tr'+(admin?' class="row-click" onclick="'+open+'"':'')+
      '><td><b>'+esc(r.name)+'</b></td><td dir="ltr">'+esc(r.nameEn||"—")+'</td>'+
      '<td dir="ltr">'+esc(r.code||r.pcode||"—")+'</td><td>'+esc(parent)+'</td>'+(admin?acts:'')+'</tr>';
   }).join("")+'</tbody></table></div>';
  }
 }
 body+='</section>';
 return adminShell(body);
}
// A row clicked from a non-country table: open that level's editor, loading the
// lookups it needs first.
window.locRowEdit=function(kind,row){
 locFormOpen(kind,row);
};

function verLocReviewAdmin(id,decision){
 var notes=prompt(lang==="ar"?"ملاحظات المراجعة (اختياري)":"Review notes (optional)","")||"";
 apiPatch('/api/locations/requests/'+id,{decision:decision,reviewNotes:notes}).then(function(){locAdmin.loadedTab=null;locAdminLoad()}).catch(function(e){alert((e.data&&e.data.error)||e.message)});
}

function accessPage(){
 const tabs=[["overview","accessOverview"],["users","users"],["roles","roles"],["matrix","accessMatrix"],["overrides","accessOverrides"],["pages","publicSections"]];
 if(!tabs.some(x=>x[0]===sectionTab)) sectionTab="overview";
 const roles=["Super Admin","Organization Owner","Teacher","Client"];
 const modules=[["إدارة المؤسسات الدراسية","schools"],["المعلمون","teachers"],["المناطق","locations"],["العروض","offers"],["الإعلانات","ads"],["التقارير","reports"],["الإعدادات","settings"]];
 return adminShell(`<div class="welcome"><div><h1>${tr("usersAccess")}</h1><p>${lang==="ar"?"تحكم بمن يرى الأقسام والصفحات وما الذي يستطيع تنفيذه داخل كل قسم.":"Control who can see sections/pages and what actions they can perform."}</p></div></div>
 ${tabBar(tabs,sectionTab)}
 ${sectionTab==="matrix"||sectionTab==="pages"?`
 <section class="panel"><div class="panel-title"><div><h2>${tr(sectionTab==="matrix"?"accessMatrix":"publicSections")}</h2><p>${lang==="ar"?"عرض / إنشاء / تعديل / حذف / اعتماد حسب الدور أو المستخدم":"View / create / edit / delete / approve by role or user"}</p></div><button class="btn green">${tr("save")}</button></div>
 <div class="permission-matrix"><div class="pm-head"><b>${lang==="ar"?"القسم":"Section"}</b>${roles.map(r=>`<b>${r}</b>`).join("")}</div>
 ${modules.map((m,i)=>`<div class="pm-row"><span>${m[0]}</span>${roles.map((r,j)=>`<label class="perm-toggle"><input type="checkbox" ${j===0||((i+j)%3!==0)?"checked":""}><span></span></label>`).join("")}</div>`).join("")}</div></section>`:
 sectionTab==="roles"?`
 <section class="panel"><div class="panel-title"><h2>${tr("roles")}</h2><button class="btn brown">${icon("plus",15)} ${lang==="ar"?"دور جديد":"New role"}</button></div><div class="reference-grid">${roles.map(r=>`<div class="reference-card"><div class="ref-icon">${icon("shield",19)}</div><div><b>${r}</b><span>${lang==="ar"?"صلاحيات قابلة للتخصيص":"Customizable permissions"}</span></div><div class="crud-actions"><button class="crud edit">${icon("edit",14)}</button><button class="crud view">${icon("eye",14)}</button></div></div>`).join("")}</div></section>`:
 `<section class="panel"><div class="panel-title"><h2>${tr(sectionTab==="users"?"users":sectionTab==="overrides"?"accessOverrides":"accessOverview")}</h2></div><div style="padding:22px;color:var(--muted)">${lang==="ar"?"إدارة المستخدمين، الأدوار، الصلاحيات، الاستثناءات، وصلاحيات إظهار الأقسام والصفحات من مكان واحد.":"Manage users, roles, permissions, overrides, and page/section visibility from one place."}</div></section>`}`)
}

function settingsPage(){
 const tabs=[["general","settingsGeneral"],["appearance","settingsAppearance"],["backup","settingsBackup"],["security","settingsSecurity"],["integrations","settingsIntegrations"],["notifications","settingsNotifications"],["maintenance","settingsMaintenance"],["system","settingsSystem"],["data","settingsData"]];
 if(!tabs.some(x=>x[0]===sectionTab)) sectionTab="general";
 const content={
  general:["اسم المنصة","اللغة الافتراضية","المنطقة الزمنية"],
  appearance:[],
  backup:["آخر نسخة احتياطية","سياسة الاحتفاظ","جاهزية الاستعادة"],
  security:["سياسة كلمات المرور","الجلسات","التحقق الثنائي"],
  integrations:["البريد","SMS","خرائط","خدمات خارجية"],
  notifications:["إشعارات النظام","البريد","داخل التطبيق"],
  maintenance:["فحص الصحة","الإصلاحات","السجلات","مهام الصيانة"],
  system:["إعدادات النظام","الميزات","حدود الرفع","السجلات"],
  data:["جودة البيانات","التصدير","الاستيراد","الأرشفة"]
 };
var extra='';
  if(sectionTab==="appearance"){
   var themes=MadarasatiTheme.listThemes();
   var saved=MadarasatiTheme.getCurrentThemeId();
   var active=pendingThemeId||saved;
   var isPreview=pendingThemeId&&pendingThemeId!==saved;
   var themeIds=Object.keys(themes);
   var vals=currentThemeValues();
   extra='<div class="theme-preset-section" style="margin-top:20px"><h3 style="margin:0 0 12px;font-size:15px">'+(lang==="ar"?"اختر الثيم":"Choose Theme")+'</h3><div class="theme-preset-grid" id="themePresetGrid">'+themeIds.map(function(id){
    var t=themes[id];
    var n=MadarasatiTheme.themeName(id,lang);
    var a=active===id;
    return '<div class="theme-preset-card'+(a?' active':'')+'" onclick="setPendingTheme(\''+id+'\')" data-theme-id="'+id+'"><div class="theme-swatch-row"><div class="theme-swatch" style="background:'+t.primary+'"></div><div class="theme-swatch" style="background:'+t.accent+'"></div><div class="theme-swatch" style="background:'+t.background+'"></div><div class="theme-swatch" style="background:'+t.text+'"></div></div><div class="theme-preset-label"><b>'+n+'</b>'+(saved===id?'<span class="theme-active-badge">✓ '+(lang==="ar"?"الحالي":"Current")+'</span>':'')+(isPreview&&a?'<span class="theme-preview-badge">'+(lang==="ar"?"معاينة":"Preview")+'</span>':'')+'</div></div>';
   }).join("")+'</div>'+
   (isPreview?'<div class="theme-preview-bar"><span>'+(lang==="ar"?"معاينة، اضغط تطبيق للحفظ أو إلغاء لاستعادة":"Preview — press Apply to save, or Cancel to revert")+'</span><div><button class="btn" onclick="cancelTheme()">'+tr("cancel")+'</button><button class="btn green" onclick="confirmTheme()">'+tr("applyTheme")+'</button></div></div>':'')+
   '<div class="custom-theme-block"><h4>'+tr("customTheme")+'</h4><div class="custom-theme-row"><label>'+tr("primaryColor")+'</label><input type="color" id="customPrimary" value="'+vals.primary+'"><label>'+tr("accentColor")+'</label><input type="color" id="customAccent" value="'+vals.accent+'"><button class="btn brown" onclick="applyCustomTheme()">'+(lang==="ar"?"تطبيق":"Apply")+'</button></div></div>'+
   '</div>';
  }
 return adminShell(`<div class="welcome"><div><h1>${tr("settings")}</h1><p>${lang==="ar"?"مركز التحكم الكامل والموقع والبرنامج.":"Central control for the website and application."}</p></div></div>
 ${tabBar(tabs,sectionTab)}
 <section class="panel"><div class="panel-title"><div><h2>${tr(tabs.find(x=>x[0]===sectionTab)[1])}</h2><p>${tr("genericNote")}</p></div><button class="btn green">${tr("save")}</button></div>
 <div class="settings-grid">${(content[sectionTab]||[]).map((x,i)=>`<div class="setting-card"><div class="setting-icon">${icon(i%2?"settings":"shield",19)}</div><div><b>${x}</b><span>${lang==="ar"?"إعداد قابل للتحكم":"Configurable setting"}</span></div><label class="switch-control"><input type="checkbox" ${i%2===0?"checked":""}><span></span></label></div>`).join("")}</div>${extra}</section>`)
}

/* ---------- Owner dashboard (Phase B: B14/B15) ---------- */
var ownData={orgs:[],requests:[],loading:false,loaded:false,error:null,tab:"orgs"};
var ownDocs={};var ownDocsLoading={};
var ownReqForm={show:false,govId:null,districtId:null,submitting:false,error:null,info:null};

function ownLoad(){
 if(ownData.loading)return;
 ownData.loading=true;ownData.error=null;
 Promise.all([
  apiGet('/api/ownership/my-organizations').catch(function(e){return []}),
  apiGet('/api/ownership/requests/mine').catch(function(e){return []})
 ]).then(function(r){
  ownData.orgs=r[0]||[];ownData.requests=r[1]||[];
  ownData.loading=false;ownData.loaded=true;render();
  // Resolve Arabic location names on cards (this page has no filter bar,
  // so the catalog would otherwise never load here).
  try{
   loadGovernorates().then(function(){
    var codes={};ownData.orgs.forEach(function(o){if(o.governorate)codes[o.governorate]=1});
    var jobs=(locData.governorates||[]).filter(function(g){return codes[g.code]}).map(function(g){return loadDistricts(g.id)});
    if(jobs.length)Promise.all(jobs).then(function(){render()});
    else render();
   });
  }catch(e){}
 }).catch(function(e){ownData.loading=false;ownData.error=e.message;render()});
}
function ownSetTab(t){ownData.tab=t;render()}
function ownDocsLoad(orgId){
 if(ownDocsLoading[orgId])return;
 ownDocsLoading[orgId]=true;
 apiGet('/api/documents?organizationId='+encodeURIComponent(orgId)).then(function(list){
  ownDocs[orgId]=list||[];render();
 }).catch(function(){ownDocs[orgId]=[];render()});
}
function ownUploadDoc(orgId){
 var inp=document.getElementById("doc-file-"+orgId);
 var typEl=document.getElementById("doc-type-"+orgId);
 if(!inp||!inp.files||!inp.files.length)return;
 var f=inp.files[0];
 if(f.size>10*1024*1024){alert(tr("fileTooBig"));return}
 var allowed=["application/pdf","image/jpeg","image/png","image/webp"];
 if(allowed.indexOf(f.type)<0){alert(tr("badFileType"));return}
 var btn=document.getElementById("doc-up-"+orgId);
 if(btn){btn.disabled=true}
 f.arrayBuffer().then(function(buf){
  return fetch(API_BASE+'/api/documents/upload?organizationId='+encodeURIComponent(orgId)+'&docType='+encodeURIComponent(typEl?typEl.value:"other"),{
   method:'POST',credentials:'include',
   headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(f.name)},
   body:buf
  });
 }).then(function(res){
  if(!res.ok)throw new Error('Upload failed');
  return res.json();
 }).then(function(){
  inp.value="";delete ownDocs[orgId];ownDocsLoading[orgId]=false;ownDocsLoad(orgId);
 }).catch(function(e){if(btn)btn.disabled=false;alert(e.message)});
}
function ownDeleteDoc(docId,orgId){
 if(!confirm(lang==="ar"?"حذف المستند؟":"Delete document?"))return;
 apiDelete('/api/documents/'+docId).then(function(){delete ownDocs[orgId];ownDocsLoading[orgId]=false;ownDocsLoad(orgId)}).catch(function(e){alert(e.message)});
}
function ownDocTypeLabel(t){
 var m={license:tr("docLicense"),ownership:tr("docOwnership"),authorization:tr("docAuthorization"),registration:tr("docRegistration"),accreditation:tr("docAccreditation"),other:tr("docOther")};
 return m[t]||t;
}
function ownStatusLabel(s){
 var m={pending:tr("statusPending"),under_review:tr("statusUnderReview"),approved:tr("statusApproved"),rejected:tr("statusRejected"),changes_requested:tr("statusChangesRequested")};
 return m[s]||s;
}
function ownReqToggle(){ownReqForm.show=!ownReqForm.show;ownReqForm.error=null;ownReqForm.info=null;render()}
function ownReqGov(){
 var v=document.getElementById("ow-gov").value;
 ownReqForm.govId=v===""?null:Number(v);ownReqForm.districtId=null;
 if(ownReqForm.govId)regLoadDists(ownReqForm.govId);
 render();
}
function ownReqDist(){
 var v=document.getElementById("ow-district").value;
 ownReqForm.districtId=v===""?null:Number(v);
 render();
}
function ownSubmitReq(e){
 e.preventDefault();
 if(ownReqForm.submitting)return;
 var v=function(id){var el=document.getElementById(id);return el?el.value.trim():""};
 var name=v("ow-name"),type=(document.getElementById("ow-type")||{}).value;
 if(name.length<2||!type){ownReqForm.error=tr("institutionName");render();return}
 var gov=(regGovs||[]).filter(function(x){return x.id===ownReqForm.govId})[0]||null;
 var dl=regDists[ownReqForm.govId]||[];
 var dist=dl.filter(function(x){return x.id===ownReqForm.districtId})[0]||null;
 ownReqForm.submitting=true;ownReqForm.error=null;render();
 apiPost('/api/ownership/requests',{
  requestType:"new_institution",institutionName:name,institutionType:type,
  countryCode:"YE",governorateCode:gov?gov.code:null,districtCode:dist?dist.code:null,
  neighborhood:v("ow-nb")||null,address:v("ow-addr")||null,
  contactPhone:v("ow-phone")||null,contactEmail:v("ow-email")||null,
  description:v("ow-desc")||null,ownershipProof:v("ow-proof")||null
 }).then(function(){
  ownReqForm.submitting=false;ownReqForm.show=false;ownReqForm.info=null;
  ownData.loaded=false;ownLoad();
 }).catch(function(err){
  ownReqForm.submitting=false;
  ownReqForm.error=(err&&err.data&&err.data.error)||err.message;
  render();
 });
}
function ownerDashboard(){
 var user=getCurrentUser();
 if(!user)return loginPage();
 if(!ownData.loaded&&!ownData.loading)ownLoad();
  if(routeSub()==='staff'&&window.ownerStaffPage)return ownerStaffPage();
  // The Advertisement Management Center owns the owner's advertisement sub-routes
  // (#/owner/ads, /new, /edit/:id, /view/:id). It returns null for anything else,
  // so every other owner tab keeps rendering exactly as it did before.
  if(window.adsOwnerPage){var adsOwned=adsOwnerPage();if(adsOwned)return adsOwned}
  var tabs=[["orgs","myInstitutions"],["reqs","myRequests"],["offers","offers"],["ads","myAdvertisements"]];
 var body='<div class="directory-body">'+sectionHead({title:tr("myDashboard"),icon:"home",sub:user.name},null);
 body+='<div class="view-row"><div class="view-switch">'+tabs.map(function(t){
  return '<button class="'+(ownData.tab===t[0]?"active":"")+'" onclick="ownSetTab(\''+t[0]+'\')">'+esc(tr(t[1]))+'</button>';
 }).join("")+'</div></div>';
  body+='<div class="sp-actions"><a class="btn green" href="#/owner/staff">'+
   (lang==='ar'?'إدارة فريق العمل':'Manage staff')+'</a></div>';
 if(ownData.loading)body+='<div class="loading-inline"><div class="loader"></div></div>';
 else if(ownData.error)body+='<div class="empty-state">'+esc(ownData.error)+'</div>';
 else if(ownData.tab==="orgs"){
  if(!ownData.orgs.length)body+='<div class="empty-state">'+esc(tr("noInstitutions"))+'</div>';
  body+=ownData.orgs.map(function(o){
   var docs=ownDocs[o.id];
   if(docs===undefined){ownDocsLoad(o.id)}
   var docHtml='';
   if(!docs)docHtml='<div class="loading-inline"><div class="loader"></div></div>';
   else{
    docHtml=docs.length?'<div class="table-wrap"><table class="tbl"><thead><tr><th>'+esc(tr("docType"))+'</th><th>'+esc(tr("docFile"))+'</th><th>'+esc(tr("reqStatus"))+'</th><th></th></tr></thead><tbody>'+
     docs.map(function(d){
      return '<tr><td>'+esc(ownDocTypeLabel(d.docType))+'</td><td><b>'+esc(d.fileName)+'</b><div class="entity-sub">'+esc(d.mimeType)+' • '+Math.round(d.fileSize/1024)+'KB</div></td><td><span class="badge '+(d.status==="verified"?"ok":d.status==="rejected"?"bad":"wait")+'">'+esc(d.status==="verified"?tr("docVerified"):d.status==="rejected"?tr("docRejected"):tr("docPending"))+'</span></td>'+
      '<td><div class="crud-actions"><a class="crud view" style="text-decoration:none" href="'+API_BASE+'/api/documents/'+d.id+'/file" target="_blank" rel="noopener" title="'+esc(tr("downloadDoc"))+'">'+icon("eye",15)+'</a><button class="crud delete" onclick="ownDeleteDoc(\''+d.id+'\',\''+o.id+'\')" title="'+esc(tr("deleteDoc"))+'">'+icon("trash",15)+'</button></div></td></tr>';
     }).join("")+'</tbody></table></div>':'<div class="empty-state">'+esc(tr("noDocuments"))+'</div>';
   }
   var typeOpts=["license","ownership","authorization","registration","accreditation","other"].map(function(t){return opt(t,ownDocTypeLabel(t))}).join("");
   return '<section class="panel"><div class="panel-title"><div><h2>'+esc(o.name)+'</h2><p>'+esc(orgTypeLabel(o.type))+' • '+esc(orgLocText(o))+' • '+esc(o.membershipRole||"")+'</p></div>'+
    '<button class="btn brown" onclick="go(\'detail?id='+o.id+'\')">'+esc(tr("viewDetails"))+'</button></div>'+
    '<div class="panel-title"><div><h2 style="font-size:13px">'+esc(tr("myDocuments"))+'</h2></div></div>'+docHtml+
    '<div class="doc-upload"><select id="doc-type-'+o.id+'" class="f-select">'+typeOpts+'</select><input type="file" id="doc-file-'+o.id+'" accept=".pdf,.jpg,.jpeg,.png,.webp"><button id="doc-up-'+o.id+'" class="btn green" onclick="ownUploadDoc(\''+o.id+'\')">'+esc(tr("uploadDoc"))+'</button></div>'+
   '</section>';
  }).join("");
 }else if(ownData.tab==="offers"){
  body+=(window.mkOwnerOffersSection?mkOwnerOffersSection():"");
 }else if(ownData.tab==="ads"){
  body+=(window.mkOwnerAdsSection?mkOwnerAdsSection():"");
 }else{
  var reqHtml=ownData.requests.length?'<div class="table-wrap"><table class="tbl"><thead><tr><th>'+esc(tr("institutionName"))+'</th><th>'+esc(tr("orgType"))+'</th><th>'+esc(tr("reqStatus"))+'</th><th>'+esc(tr("reviewNotesLabel"))+'</th></tr></thead><tbody>'+
   ownData.requests.map(function(r){
    return '<tr><td><b>'+esc(r.institutionName||r.organizationName||"—")+'</b></td><td>'+esc(orgTypeLabel(r.institutionType)||"—")+'</td><td><span class="badge '+(r.status==="approved"?"ok":r.status==="rejected"?"bad":"wait")+'">'+esc(ownStatusLabel(r.status))+'</span></td><td>'+esc(r.reviewNotes||"—")+'</td></tr>';
   }).join("")+'</tbody></table></div>':'<div class="empty-state">'+esc(tr("noRequests"))+'</div>';
  body+='<section class="panel"><div class="panel-title"><div><h2>'+esc(tr("myRequests"))+'</h2></div><button class="btn brown" onclick="ownReqToggle()">'+icon("plus",15)+' '+esc(tr("institutionName"))+'</button></div>'+reqHtml;
  if(ownReqForm.show){
   regLoadGovs();
   var govOpts=regGovs?opt("",tr("allGovernorates"),!ownReqForm.govId)+regGovs.map(function(g){return opt(g.id,g.name,ownReqForm.govId===g.id)}).join(""):opt("",tr("checking"),true);
   var dl2=ownReqForm.govId?(regDists[ownReqForm.govId]||[]):[];
   var distOpts=ownReqForm.govId?(opt("",tr("allDistricts"),!ownReqForm.districtId)+dl2.map(function(d){return opt(d.id,d.name,ownReqForm.districtId===d.id)}).join("")):opt("",tr("allDistricts"),true);
   body+='<form class="rg-section" onsubmit="ownSubmitReq(event)">'+
    (ownReqForm.error?'<div class="login-error">'+esc(ownReqForm.error)+'</div>':'')+
    '<h3>'+esc(tr("institutionSection"))+'</h3><div class="form-row2">'+
    '<div class="form-group"><label>'+esc(tr("institutionName"))+'</label><input id="ow-name" required></div>'+
    '<div class="form-group"><label>'+esc(tr("orgType"))+'</label><select id="ow-type" class="f-select">'+["private_school","government_school","college","university","institute"].map(function(t){return opt(t,orgTypeLabel(t))}).join("")+'</select></div></div>'+
    '<div class="form-row2"><div class="form-group"><label>'+esc(tr("governorate"))+'</label><select id="ow-gov" class="f-select" onchange="ownReqGov()">'+govOpts+'</select></div>'+
    '<div class="form-group"><label>'+esc(tr("district"))+'</label><select id="ow-district" class="f-select" onchange="ownReqDist()"'+(ownReqForm.govId?"":" disabled")+'>'+distOpts+'</select></div></div>'+
    '<div class="form-row2"><div class="form-group"><label>'+esc(tr("neighborhood"))+'</label><input id="ow-nb"></div>'+
    '<div class="form-group"><label>'+esc(tr("institutionAddress"))+'</label><input id="ow-addr"></div></div>'+
    '<div class="form-group"><label>'+esc(tr("institutionDesc"))+'</label><input id="ow-desc"></div>'+
    '<div class="form-group"><label>'+esc(tr("ownershipProof"))+'</label><input id="ow-proof"><small class="rg-hint idle">'+esc(tr("ownershipProofHint"))+'</small></div>'+
    '<button type="submit" class="btn green"'+(ownReqForm.submitting?" disabled":"")+'>'+esc(tr("submitOwnerRequest"))+'</button></form>';
  }
  body+='</section>';
  var approved=ownData.requests.filter(function(r){return r.status==="approved"})[0];
  if(approved)body+='<div class="rg-info">'+esc(tr("reLoginAfterApproval"))+'</div>';
 }
 return adminShell(body+'</div>');
}

/* ---------- Admin verification queue (Phase B: B12/B26) ---------- */
var verData={tab:"owners",reqs:[],counts:{},selected:null,locReqs:[],docs:[],loading:false,loadedTab:null,error:null};
function verSetTab(t){verData.tab=t;verData.selected=null;render()}
function verLoad(){
 if(verData.loading||verData.loadedTab===verData.tab)return;
 verData.loading=true;verData.error=null;
 var url=verData.tab==="owners"?'/api/ownership/requests?status=pending'
  :verData.tab==="locations"?'/api/locations/requests?status=pending'
  :'/api/documents/pending';
 apiGet(url).then(function(r){
  if(verData.tab==="owners"){verData.reqs=(r.items||[]);verData.counts=(r.counts||{})}
  else if(verData.tab==="locations"){verData.locReqs=r||[]}
  else{verData.docs=r||[]}
  verData.loading=false;verData.loadedTab=verData.tab;render();
 }).catch(function(e){verData.loading=false;verData.error=e.message;render()});
}
function verSelect(id){
 apiGet('/api/ownership/requests/'+id).then(function(r){verData.selected=r;render()}).catch(function(e){alert(e.message)});
}
function verReview(decision){
 if(!verData.selected)return;
 var notesEl=document.getElementById("ver-notes");
 apiPatch('/api/ownership/requests/'+verData.selected.id,{decision:decision,reviewNotes:notesEl?notesEl.value:""}).then(function(){
  verData.selected=null;verData.loadedTab=null;verLoad();
 }).catch(function(e){alert((e.data&&e.data.error)||e.message)});
}
function verLocReview(id,decision){
 var notes=prompt(lang==="ar"?"ملاحظات المراجعة (اختياري)":"Review notes (optional)","")||"";
 apiPatch('/api/locations/requests/'+id,{decision:decision,reviewNotes:notes}).then(function(){verData.loadedTab=null;verLoad()}).catch(function(e){alert((e.data&&e.data.error)||e.message)});
}
function verDocReview(id,status){
 var notes=prompt(lang==="ar"?"ملاحظات المراجعة (اختياري)":"Review notes (optional)","")||"";
 apiPatch('/api/documents/'+id,{status:status,reviewNotes:notes}).then(function(){verData.loadedTab=null;verLoad()}).catch(function(e){alert((e.data&&e.data.error)||e.message)});
}
function verifyPage(){
 var user=getCurrentUser();
 if(!user||user.role!=="admin")return adminShell('<div class="welcome"><div><h1>'+(lang==="ar"?"غير مصرح":"Access Denied")+'</h1></div></div>');
 verLoad();
 var tabs=[["owners","ownerRequests"],["locations","locationRequestsTab"],["documents","documentsTab"]];
 var vStats=[{icon:"shield",value:verData.counts.pending||0,labelAr:"طلبات الملكية",labelEn:"Ownership requests",tone:"warn"},
  {icon:"pin",value:(verData.locReqs||[]).length,labelAr:"طلبات المواقع",labelEn:"Location requests",tone:"info"},
  {icon:"doc",value:(verData.docs||[]).length,labelAr:"الوثائق",labelEn:"Documents",tone:"warn"}];
 var vDonut={title:{ar:"المعلّق حسب النوع",en:"Pending by kind"},center:{ar:"طلب",en:"items"},categories:[
  {label:{ar:"الملكية",en:"Ownership"},value:verData.counts.pending||0},
  {label:{ar:"المواقع",en:"Locations"},value:(verData.locReqs||[]).length},
  {label:{ar:"الوثائق",en:"Documents"},value:(verData.docs||[]).length}]};
 var vHero=(typeof sectionHero==="function")?sectionHero({route:"verify",title:tr("verifyQueue"),
  subtitle:(lang==="ar"?"راجع طلبات الملكية والمواقع والوثائق. كل قرار يُسجَّل في سجل التدقيق.":"Review ownership, location and document requests. Every decision is written to the audit log."),
  stats:vStats,donut:vDonut}):'';
 var body='<div class="directory-body">'+vHero;
 body+='<div class="view-row"><div class="view-switch">'+tabs.map(function(t){
  return '<button class="'+(verData.tab===t[0]?"active":"")+'" onclick="verSetTab(\''+t[0]+'\')">'+esc(tr(t[1]))+'</button>';
 }).join("")+'</div></div>';
 if(verData.loading)body+='<div class="loading-inline"><div class="loader"></div></div>';
 else if(verData.error)body+='<div class="empty-state">'+esc(verData.error)+'</div>';
 else if(verData.tab==="owners"){
  if(!verData.reqs.length)body+='<div class="empty-state">'+esc(tr("noRequests"))+'</div>';
  else body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+esc(tr("fullName"))+'</th><th>'+esc(tr("institutionName"))+'</th><th>'+esc(tr("orgType"))+'</th><th>'+esc(tr("reqAt"))+'</th><th></th></tr></thead><tbody>'+
   verData.reqs.map(function(r){
    return '<tr><td><b>'+esc(r.applicantName||"—")+'</b><div class="entity-sub">'+esc(r.applicantEmail||"")+' • '+esc(r.applicantPhone||"")+'</div></td><td>'+esc(r.institutionName||r.organizationName||"—")+'</td><td>'+esc(orgTypeLabel(r.institutionType)||"—")+'</td><td>'+esc((r.submittedAt||"").slice(0,10))+'</td><td><button class="crud view" onclick="verSelect(\''+r.id+'\')">'+icon("eye",15)+'</button></td></tr>';
   }).join("")+'</tbody></table></div>';
  if(verData.selected){
   var s=verData.selected;
   body+='<section class="panel"><div class="panel-title"><div><h2>'+esc(tr("applicantInfo"))+'</h2><p>'+esc(s.applicantName||"")+' • '+esc(s.applicantEmail||"")+' • '+esc(s.applicantPhone||"")+'</p></div><span class="badge wait">'+esc(ownStatusLabel(s.status))+'</span></div>'+
   '<div class="detail-kpis">'+
   '<div class="mini"><span>'+esc(tr("institutionName"))+'</span><b>'+esc(s.institutionName||s.organizationName||"—")+'</b></div>'+
   '<div class="mini"><span>'+esc(tr("orgType"))+'</span><b>'+esc(orgTypeLabel(s.institutionType)||"—")+'</b></div>'+
   '<div class="mini"><span>'+esc(tr("governorate"))+'</span><b>'+esc(s.governorateCode||"—")+'</b></div>'+
   '<div class="mini"><span>'+esc(tr("district"))+'</span><b>'+esc(s.districtCode||"—")+'</b></div>'+
   '<div class="mini"><span>'+esc(tr("neighborhood"))+'</span><b>'+esc(s.neighborhood||"—")+'</b></div>'+
   '</div><div class="detail-bottom"><div class="subbox"><h3>'+esc(tr("institutionInfo"))+'</h3><p>'+esc(s.description||"—")+'</p><p>'+esc(s.address||"")+' '+(s.contactPhone||"")+' '+(s.contactEmail||"")+'</p><p>'+esc(tr("ownershipProof"))+': '+esc(s.ownershipProof||"—")+'</p></div></div>'+
   '<div class="form-group"><label>'+esc(tr("reviewNotesLabel"))+'</label><input id="ver-notes"></div>'+
   '<div class="sp-actions"><button class="btn sp-search" onclick="verReview(\'approved\')">'+esc(tr("approveBtn"))+'</button><button class="btn sp-map" onclick="verReview(\'changes_requested\')">'+esc(tr("changesBtn"))+'</button><button class="btn f-reset" onclick="verReview(\'rejected\')">'+esc(tr("rejectBtn"))+'</button></div>'+
   '</section>';
  }
 }else if(verData.tab==="locations"){
  if(!verData.locReqs.length)body+='<div class="empty-state">'+esc(tr("noRequests"))+'</div>';
  else body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+esc(tr("locKind"))+'</th><th>'+esc(tr("locNameAr"))+'</th><th>'+esc(tr("governorate"))+' / '+esc(tr("district"))+'</th><th>'+esc(tr("reqBy"))+'</th><th></th></tr></thead><tbody>'+
   verData.locReqs.map(function(r){
    return '<tr><td>'+esc(r.kind)+'</td><td><b>'+esc(r.name_ar)+'</b>'+(r.name_en?'<div class="entity-sub">'+esc(r.name_en)+'</div>':'')+'</td><td>'+esc(r.governorate_name||"—")+' / '+esc(r.district_name||"—")+'</td><td>'+esc(r.submitted_by||"—")+'</td>'+
    '<td><div class="crud-actions"><button class="crud verify" onclick="verLocReview('+r.id+',\'approved\')" title="'+esc(tr("approveBtn"))+'">'+icon("check",15)+'</button><button class="crud delete" onclick="verLocReview('+r.id+',\'rejected\')" title="'+esc(tr("rejectBtn"))+'">'+icon("x",15)+'</button></div></td></tr>';
   }).join("")+'</tbody></table></div>';
 }else{
  if(!verData.docs.length)body+='<div class="empty-state">'+esc(tr("noDocuments"))+'</div>';
  else body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+esc(tr("docFile"))+'</th><th>'+esc(tr("myInstitutions"))+'</th><th></th></tr></thead><tbody>'+
   verData.docs.map(function(d){
    return '<tr><td><b>'+esc(d.file_name)+'</b><div class="entity-sub">'+esc(ownDocTypeLabel(d.doc_type))+' • '+esc(d.uploader_name||"")+'</div></td><td>'+esc(d.organization_name||"")+'</td>'+
    '<td><div class="crud-actions"><a class="crud view" style="text-decoration:none" href="'+API_BASE+'/api/documents/'+d.id+'/file" target="_blank" rel="noopener">'+icon("eye",15)+'</a><button class="crud verify" onclick="verDocReview(\''+d.id+'\',\'verified\')" title="'+esc(tr("approveBtn"))+'">'+icon("check",15)+'</button><button class="crud delete" onclick="verDocReview(\''+d.id+'\',\'rejected\')" title="'+esc(tr("rejectBtn"))+'">'+icon("x",15)+'</button></div></td></tr>';
   }).join("")+'</tbody></table></div>';
 }
 return adminShell(body+'</div>');
}

// Browsing the directory is public, but opening a full entity record is not:
// `detail` (institution) and `teacher` (profile) are deliberately absent, so an
// anonymous visitor is sent to the login page with the record remembered, and
// lands on it once authenticated.
var publicRoutes=["home","private","government","colleges","institutes","teachers","register"];
var adminOnlyRoutes=["admin","institutions","schools","institutesAdmin","collegesAdmin","teachersAdmin","students","bookings","verify","academic","locations","reports","access","settings","offers","ads","slides"];

function handleLogout(){
 logoutUser().then(function(){
  go('home');
  render();
 });
}

async function loadDashboardData(){
 try{
  var data=await apiGet('/api/admin/dashboard');
  dashboardData.pendingRegistrations=data.pendingRegistrations||0;
  dashboardData.connected=true;
 }catch(e){
  dashboardData.connected=false;
 }
}

// Wide tables become stacked rows on a phone, and a stacked cell is meaningless
// without its column name. Instead of hand-writing data-label on every cell of
// every table (and forgetting it on the next one), copy the header text onto
// each cell here, once, right after the markup lands. One pass, every table.
function stampTableLabels(){
 try{
  var tables=document.querySelectorAll("table.tbl");
  for(var i=0;i<tables.length;i++){
   var ths=tables[i].querySelectorAll("thead th");
   if(!ths.length)continue;
   var labels=[].map.call(ths,function(th){return (th.textContent||"").replace(/\s+/g," ").trim()});
   var rows=tables[i].querySelectorAll("tbody tr");
   for(var r=0;r<rows.length;r++){
    var cells=rows[r].children;
    for(var c=0;c<cells.length&&c<labels.length;c++){
     if(cells[c].getAttribute("data-label")===null)cells[c].setAttribute("data-label",labels[c]);
    }
   }
  }
 }catch(e){console.error("[table labels]",e)}
}

function render(){
  apply();
  var r=route();
  var user=getCurrentUser();
  var html;

 // Session restore: if not initialized, check session first
 if(!authState.initialized){
  html='<div class="loading-screen"><div class="loader"></div></div>';
  document.getElementById("app").innerHTML=html;
  checkSession().then(function(){
   render();
  });
  return;
 }

 // Auth guard: login page for unauthenticated users
 if(!user && !publicRoutes.includes(r)){
  // Remember where the user was headed so login can return them there
  // (the login route itself is excluded so it cannot overwrite an
  // offer-gate destination set by offerLogin/offerRegister).
  if(r!=="login")setReturnAfterAuth();
  html=loginPage();
  document.getElementById("app").innerHTML=html;
  return;
 }

 // Role protection: admin-only routes
 if(user && adminOnlyRoutes.includes(r) && user.role!=="admin"){
  var deniedTitle=lang==="ar"?"غير مصرح":"Access Denied";
  var deniedMsg=lang==="ar"?"لا تملك صلاحية الوصول إلى هذا القسم":"You do not have access to this section";
  html=adminShell('<div class="welcome"><div><h1>'+deniedTitle+'</h1><p>'+deniedMsg+'</p></div></div>');
  document.getElementById("app").innerHTML=html;
  return;
 }

 // Load dashboard data when entering admin
 if(r==="admin" && dashboardData.connected===false){
  loadDashboardData().then(function(){render()});
 }

 // Reset public filters when navigating between routes (matches cascade reset rules)
 if(r!==prevRoute&&prevRoute!=="")resetFilters();
 if(r!==prevRoute&&r==="home")orgPage.offset=0;
 if(homeSearchPending&&r===(homeSearchPending.mode==="teachers"?"teachers":"private")){
  if(r==="teachers")teacherQuery=homeSearchPending.q;
  else filters.q=homeSearchPending.q;
  homeSearchPending=null;
 }
 prevRoute=r;

 // Load organizations per route (filter-aware, cacheKey-based, no refetch loops)
 if(r==="home"||r==="private"||r==="government"||r==="colleges"||r==="institutes"||r==="schools"){
  // Recovery: if loading has been stuck for >15s, force-reset so the user
  // can retry rather than seeing an infinite spinner.
  if(orgData.loading&&orgData._loadingSince&&(Date.now()-orgData._loadingSince>15000)){
   orgData.loading=false;orgData.loaded=true;orgData._loadingSince=0;
  }
  if(!orgData.loading&&orgData.cacheKey!==orgCacheKey(r)){
   loadOrgsFor(r);
  }
 }

 // Load teachers for teachers directory page (query-aware)
 if(r==="teachers"||r==="home"){
  var tck=r==="home"?"home":"q="+teacherQuery;
  if(!teacherData.loading&&teacherData.cacheKey!==tck){
   teacherData.cacheKey=tck;
   loadTeachers(r==="home"?"":teacherQuery).then(function(){render()});
  }
 }
 if(r==="home"&&locData.governorates===null&&!locPending.governorates){
  loadGovernorates().then(function(){render()});
 }

 // Load single organization for detail page
 if(r==="detail"){
  var params=new URLSearchParams(location.hash.split("?")[1]||"");
  var orgId=params.get("id");
  if(orgId&&(!currentOrg||currentOrg.id!==orgId)){
   loadOrganization(orgId).then(function(){render()});
  }
  if(orgId&&detailExtras.orgId!==orgId&&!detailExtras.loading){
   loadOrgDetailExtras(orgId).then(function(){render()});
  }
 }

 // Load single teacher for the profile page
 if(r==="teacher"){
  var tparams=new URLSearchParams(location.hash.split("?")[1]||"");
  var tid=tparams.get("id");
  if(tid&&(!currentTeacher||currentTeacher.id!==tid)){
   loadTeacher(tid).then(function(){render()});
  }
 }

 // Announcement ticker data: load once, only on public pages.
 if(publicRoutes.indexOf(r)>-1&&!adsData.loaded&&!adsData.loading)loadAds();

  if(r==="home")html=landing();
  else if(r==="login"){
   if(user){go(getLoginRedirect(user));return}
   html=loginPage();
  }
  else if(r==="register"){
   if(user){go(getLoginRedirect(user));return}
   html=registerPage();
  }
  else if(r==="owner")html=ownerDashboard();
  else if(r==="client")html=window.clientDashboard?clientDashboard():adminShell("");
  else if(r==="verify")html=verifyPage();
 else if(r==="private")html=directory("private");
 else if(r==="government")html=directory("government");
 else if(r==="colleges")html=directory("colleges");
 else if(r==="institutes")html=directory("institutes");
 else if(r==="teachers")html=teacherPage();
 else if(r==="admin")html=admin();
 else if(r==="schools"){
  // The one institutions screen: all five types as tabs over the shared core.
  if(typeof adminInstitutionsPage==="function")html=adminInstitutionsPage();
  else html=adminShell('<div class="welcome"><div><h1>'+tr("schools")+'</h1><p>'+tr("genericNote")+'</p></div></div><section class="panel"><div class="empty-state">'+(lang==="ar"?"وحدة المدارس غير متصلة بعد.":"The schools module is not connected yet.")+'</div></section>');
 }
 else if(r==="detail")html=detailPage();
 else if(r==="teacher")html=teacherDetailPage();
 else if(r==="academic")html=academicPage();
 else if(r==="locations")html=locationsPage();
 else if(r==="access")html=accessPage();
 else if(r==="settings")html=settingsPage();
 else {
  var titles={"institutesAdmin":tr("institutes"),"collegesAdmin":tr("colleges"),"teachersAdmin":tr("teachers"),
   "students":tr("students"),"bookings":tr("bookings"),"verify":tr("verify"),
   "offers":tr("offers"),"ads":tr("ads"),"slides":tr("slides"),"reports":tr("reports")};
  if(r==="slides"&&typeof slidesAdminPage==="function")html=slidesAdminPage();
  else if(r==="ads"&&typeof adsAdminPage==="function")html=adsAdminPage();
  else if(r==="offers"&&typeof offersAdminPage==="function")html=offersAdminPage();
  else html=generic(titles[r]||r);
 }
  document.getElementById("app").innerHTML=html;
  stampTableLabels();
  // A rejected submit repaints the page, so the mark that names the missing field
  // is applied after the paint rather than being lost with the previous DOM.
  ufApplyInvalid();
  if(publicRoutes.includes(r))syncFilterControls();
  if(window.clientTrackRoute)clientTrackRoute(r);
  // Dynamic hero slider: mount ONLY on home, destroy everywhere else so no
  // duplicate intervals survive navigation (returning to #/home remounts once).
  try{
   if(r==="home"){if(window.MadarasatiHero)MadarasatiHero.mount();}
   else{if(window.MadarasatiHero)MadarasatiHero.destroy();}
  }catch(e){}
 }
document.addEventListener("click",function(e){
 var sw=document.getElementById("publicThemeSwitch");
 if(sw&&!sw.contains(e.target))sw.classList.remove("open");
 var lg=document.getElementById("hdrLang");
 if(lg&&!lg.contains(e.target))lg.classList.remove("open");
 // Announcement ticker: genuine click tracking, route clicks use the router.
 var tick=e.target&&e.target.closest?e.target.closest(".ticker-item"):null;
 if(tick){
  var id=tick.getAttribute("data-ad-id")||"";
  var rr=tick.getAttribute("data-ad-route");
  if(rr){e.preventDefault();adGo(rr,id)}
  else if(id){adTrack(id)}
 }
});
window.addEventListener("hashchange",function(){closeThemeMenu();closeLangMenu();closePublicNav();closeOfferPopup();render()});
// ---- URL normalization: V4 is hash-routing only (#/route) ----
// The static host serves index.html for ANY path, so a legacy/bookmarked path
// such as /login or /register would otherwise combine with hash navigation and
// produce mixed URLs like /login#/register. Normalize once at startup to the
// canonical /#/<route> form. The full hash (including ?query) is preserved.
var V4_ROUTES=["home","private","government","colleges","institutes","teachers",
 "login","register","admin","schools","access","settings","verify","owner","client",
 "detail","institutions","teachersAdmin","students","bookings","academic","locations",
 "reports","slides","ads","offers"];
function normalizeV4Url(){
 try{
  var path=location.pathname||"/";
  if(path==="/"||path==="")return false;
  var hash=location.hash||"";
  var target;
  if(/^#\/./.test(hash))target="/"+hash;
  else{
   var seg=path.replace(/^\/+|\/+$/g,"").split("/")[0]||"home";
   target="/#/"+(V4_ROUTES.indexOf(seg)>-1?seg:"home");
  }
  // Rewrite the address bar in place (no reload); the following render()
  // paints the normalized route from location.hash.
  history.replaceState(null,"",target);
  return true;
 }catch(e){return false}
}
normalizeV4Url();
apply();render();
