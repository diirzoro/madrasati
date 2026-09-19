// auth-pages.js — Premium Madarasati auth UI (login + guided multi-step register).
// Loaded AFTER app.js. Overrides loginPage()/registerPage()/handleRegister() and
// regKeep() globals from app.js, keeping the SAME backend API, session, RBAC,
// ownership-approval flow, location cascade, availability checks and validation.
// No new auth system, routes, API or state management was introduced.

function authAr(){return lang==="ar"}
function authT(k){return tr(k)}

// ---- auth-only localized strings (local fallback only; app.js tr() dictionary untouched) ----
var _authExtra={
 ar:{orText:"أو",google:"المتابعة عبر Google",rememberMe:"تذكرني",googleSoon:"تسجيل الدخول عبر Google سيكون متاحاً قريباً",rememberSaved:"سنحفظ بريدك الإلكتروني في هذا المتصفح لتسهيل الدخول",navTitle:"تنقل مدرستي",authQuote:"منصة تعليمية يمنية لكل المؤسسات التعليمية",
  loginInfoHead:"مستقبل تعليمي أفضل يبدأ من هنا",loginInfoDesc:"مدرستي منصة تعليمية يمنية تربط الطلاب وأولياء الأمور بأفضل المدارس والمعلمين والخدمات التعليمية",
  loginInfo1:"استكشاف المدارس والمؤسسات التعليمية",loginInfo2:"التواصل مع المعلمين والخدمات التعليمية",loginInfo3:"الوصول إلى محتوى ومعلومات تعليمية",loginInfo4:"خدمات تساعدك في رحلتك التعليمية",
  registerInfoHead:"لماذا تنضم إلى مدرستي؟",registerInfoDesc:"انضم إلى منصة مدرستي التعليمية وانطلق في رحلتك التعليمية مع المدارس والمعلمين والخدمات المناسبة",registerInfo1:"اكتشف المؤسسات والمدارس المناسبة",registerInfo2:"تواصل مع المعلمين والخدمات التعليمية",registerInfo3:"استفد من الأدوات والمعلومات التعليمية",registerInfo4:"أنشئ حسابك وابدأ رحلتك التعليمية",
  loginImgAlt:"مدرسة تعليمية — منصة مدرستي",signupImgAlt:"طلاب ومعلمون — منصة مدرستي",
  helpCenter:"المساعدة"},
 en:{orText:"or",google:"Continue with Google",rememberMe:"Remember me",googleSoon:"Google sign-in will be available soon",rememberSaved:"We will remember your email on this browser for easier sign-in",navTitle:"Madarasati navigation",authQuote:"A Yemeni education platform for every learning institution",
  loginInfoHead:"A better educational future starts here",loginInfoDesc:"Madarasati is a Yemeni education platform connecting students and parents with the best schools, teachers, and educational services",
  loginInfo1:"Discover schools & educational institutions",loginInfo2:"Connect with teachers & educational services",loginInfo3:"Access educational content & information",loginInfo4:"Services to support your educational journey",
  registerInfoHead:"Why join Madarasati?",registerInfoDesc:"Join Madarasati and start your educational journey with the right schools, teachers, and services",registerInfo1:"Discover suitable institutions & schools",registerInfo2:"Connect with teachers & educational services",registerInfo3:"Benefit from educational tools & information",registerInfo4:"Create your account & start your educational journey",
  loginImgAlt:"Educational school — Madarasati platform",signupImgAlt:"Students and teachers — Madarasati platform",
  helpCenter:"Help"}
};
function authL(k){
 var m=_authExtra[(lang==="ar"?"ar":"en")]||{};
 return m[k]!=null?m[k]:authT(k);
}

// ---- welcoming icon for login card head ----
function authWaveIcon(){
 return '<svg class="auth-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
  '<path d="M3 12c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0"/><path d="M3 16.5c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0"/><path d="M3 7.5c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0"/>'+
 '</svg>';
}

// ---- Google "G" mark (standard four-color branding glyph) ----
function authGoogleMark(){
 return '<svg class="auth-google-mark" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
  '<path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>'+
  '<path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"/>'+
  '<path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12.01 12.01 0 0 0 0 10.76l3.98-3.09z"/>'+
  '<path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.94 1.19 15.23 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>'+
 '</svg>';
}
function authGoogleButton(){
 return '<button type="button" class="auth-google" onclick="authGoogle()">'+authGoogleMark()+'<span>'+esc(authL("google"))+'</span></button>';
}
function authOrDivider(){
 return '<div class="auth-or"><span class="auth-or-line"></span><span class="auth-or-text">'+esc(authL("orText"))+'</span><span class="auth-or-line"></span></div>';
}
function authAltAuth(){
 return '<div class="auth-alt">'+authOrDivider()+authGoogleButton()+'<div class="auth-google-msg" id="auth-google-msg" hidden>'+esc(authL("googleSoon"))+'</div></div>';
}

// ---- remember-me (local email memory only; session policy stays server-side) ----
function authRememberToggle(){
 var cb=document.getElementById("rg-remember");
 if(!cb)return;
 var mail=document.getElementById("login-email");
 if(cb.checked){if(mail&&mail.value)localStorage.setItem("madarasati_remember_email",mail.value)}
 else{localStorage.removeItem("madarasati_remember_email")}
}
function authGoogle(){
 var msg=document.getElementById("auth-google-msg");
 if(msg)msg.hidden=!msg.hidden;
}

// ---- inline SVG icon helpers (inherit color) ----
function authSvgIcon(name){
 var paths={
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 7l9 6 9-6"/>',
  lock:'<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  school:'<path d="M2 9l10-6 10 6-10 6z"/><path d="M6 11v7h12v-7"/><path d="M9 18v-4h6v4"/>',
  pin:'<path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 8v.01M12 12v4"/>',
  doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h6"/>',
  chev:'<path d="M6 9l6 6 6-6"/>',
  eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>',
   check:'<path d="M5 12l5 5 9-11"/>',
   wave:'<path d="M3 12c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0"/><path d="M3 16.5c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0"/><path d="M3 7.5c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0"/>'
  };
 var d=paths[name]||paths.info;
 return '<svg class="auth-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
}
function authChev(){return '<svg class="auth-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'}

// ---- persistence-safe field capture (only fields present in DOM are updated) ----
function regKeep(){
 var ids={name:"rg-name",phone:"rg-phone",email:"rg-email",pass:"rg-pass",pass2:"rg-pass2",
  orgName:"rg-org-name",orgAddress:"rg-org-address",orgPhone:"rg-org-phone",orgEmail:"rg-org-email",
  orgDesc:"rg-org-desc",orgProof:"rg-org-proof"};
 Object.keys(ids).forEach(function(k){
  var el=document.getElementById(ids[k]);
  if(el)regForm[k]=el.value;
 });
}

// ---- password policy (mirrors server/modules/identity) ----
function authPwOk(p){
 p=p||"";
 return {len:p.length>=8,upper:/[A-Z]/.test(p),sym:/[^A-Za-z0-9\s]/.test(p)};
}
function authPwRulesHtml(p){
 var chk=authPwOk(p);
 var rules=[
  {ok:chk.len,t:authT("authPwLen")},
  {ok:chk.upper,t:authT("authPwUpper")},
  {ok:chk.sym,t:authT("authPwSymbol")}
 ];
 return '<div class="auth-pw-rule-title">'+esc(authT("authPwStrength"))+'</div>'+
  rules.map(function(r){
   return '<div class="auth-pw-item'+(r.ok?' ok':'')+'"><span class="auth-pw-dot"></span>'+esc(r.t)+'</div>';
  }).join('');
}
function authPwLive(){
 var el=document.getElementById("rg-pw-rules");
 if(el)el.innerHTML=authPwRulesHtml(regForm.pass);
}
function authTogglePass(id,btn){
 var el=document.getElementById(id);if(!el)return;
 var show=el.type==="password";
 el.type=show?"text":"password";
 if(btn){
  btn.setAttribute("aria-label",show?authT("hidePassword"):authT("showPassword"));
  btn.innerHTML=authSvgIcon(show?"eyeOff":"eye");
 }
}

function authNavLinks(){
 // Reuses the SAME nav array + tr() dictionary from app.js (no duplicate data source).
 var items=nav||[["home","landingHome"]];
 return items.filter(function(n){
  // Keep header taxonomy compact: skip landingHome alias, keep the 5 directory routes.
  return n[0]==="home"||n[0]==="private"||n[0]==="government"||n[0]==="colleges"||n[0]==="institutes"||n[0]==="teachers";
 }).map(function(n){
  return '<a class="auth-nav-link" href="#/'+esc(n[0])+'">'+esc(tr(n[1]))+'</a>';
 }).join("");
}

// ---- top brand bar (horizontal Madarasati header: brand, badge, nav, home) ----
function authTopBar(){
 var ar=authAr();
 return '<header class="auth-top"><div class="auth-top-inner">'+
  '<button type="button" class="auth-brand" onclick="go(\'home\')"><span class="logo-mark auth-brand-mark">م</span><b>مدرستي</b></button>'+
  '<span class="auth-top-hint">Madarasati</span>'+
  '<nav class="auth-top-nav" aria-label="'+esc(authL("navTitle"))+'">'+authNavLinks()+'</nav>'+
  '<button type="button" class="auth-home-link" onclick="go(\'home\')">'+(ar?"← ":"")+esc(authT("backHome"))+(ar?"":" →")+'</button>'+
 '</div></header>';
}

// ---- two-panel shell (unified large centered card: visual + form) ----
function authPageShell(visualHtml,formHtml){
 return '<div class="auth-page">'+authTopBar()+
  '<div class="auth-shell">'+
   '<div class="auth-card-frame">'+
    '<section class="auth-visual">'+visualHtml+'</section>'+
    '<section class="auth-panel">'+formHtml+'</section>'+
   '</div>'+
  '</div></div>';
}

// ---- premium visual / education panel (information + illustration) ----
function authVisual(kind){
  kind=kind||"login";
  var ar=authAr();
  var dots='<div class="auth-dots" aria-hidden="true"><span class="on"></span><span></span><span></span></div>';
  var inner='<div class="auth-mobile-emblem"><span class="logo-mark auth-brand-mark">م</span></div>'+
    '<div class="auth-visual-quote">'+esc(authL("authQuote"))+'</div>'+
    '<h1 class="auth-tagline">'+esc(authL(kind==="register"?"registerInfoHead":"loginInfoHead"))+'</h1>'+
    '<p class="auth-sub">'+esc(authL(kind==="register"?"registerInfoDesc":"loginInfoDesc"))+'</p>'+
    '<div class="auth-visual-image">'+authIllustrationImg(kind)+'</div>';
  if(kind==="register"){
    inner+='<ul class="auth-points">'+
      '<li><span class="auth-point-bullet"></span><span>'+esc(authL("registerInfo1"))+'</span></li>'+
      '<li><span class="auth-point-bullet"></span><span>'+esc(authL("registerInfo2"))+'</span></li>'+
      '<li><span class="auth-point-bullet"></span><span>'+esc(authL("registerInfo3"))+'</span></li>'+
      '<li><span class="auth-point-bullet"></span><span>'+esc(authL("registerInfo4"))+'</span></li>'+
    '</ul>';
  }else{
    inner+='<ul class="auth-points">'+
      '<li><span class="auth-point-bullet"></span><span>'+esc(authL("loginInfo1"))+'</span></li>'+
      '<li><span class="auth-point-bullet"></span><span>'+esc(authL("loginInfo2"))+'</span></li>'+
      '<li><span class="auth-point-bullet"></span><span>'+esc(authL("loginInfo3"))+'</span></li>'+
      '<li><span class="auth-point-bullet"></span><span>'+esc(authL("loginInfo4"))+'</span></li>'+
    '</ul>';
  }
  inner+='<div class="auth-info-links">'+
    '<a href="#!" onclick="return false">'+esc(authT("termsLabel"))+'</a>'+
    '<span class="auth-info-dot">·</span>'+
    '<a href="#!" onclick="return false">'+esc(authT("privacyLabel"))+'</a>'+
    '<span class="auth-info-dot">·</span>'+
    '<a href="#!" onclick="return false">'+esc(authL("helpCenter"))+'</a>'+
  '</div>';
  inner+=dots;
  return '<div class="auth-visual-inner">'+inner+'</div>';
}

// ---- approved local auth images (right information panel) ----
// Uses only the approved local project assets:
//   assets/auth/madarasati-auth-login.png   (login)
//   assets/auth/madarasati-auth-signup.png  (signup)
function authIllustrationImg(kind){
 var ar=authAr();
 var src=kind==="register"?"assets/auth/madarasati-auth-signup.png":"assets/auth/madarasati-auth-login.png";
 var alt=authL(kind==="register"?"signupImgAlt":"loginImgAlt");
 return '<img class="auth-ill" src="'+src+'" alt="'+esc(alt)+'" loading="lazy">';
}

// ---- stepper ----
function authStepLabels(total){
 var labels=[authT("authStepAccount"),authT("authStepLocation")];
 if(total===3)labels.push(authT("authStepInstitution"));
 return labels;
}
function authStepper(step,total){
 var labels=authStepLabels(total);
 var html='<div class="auth-steps" role="tablist" aria-label="'+esc(authT("authRegisterProgress"))+'">';
 for(var i=1;i<=total;i++){
  var done=i<step;
  html+='<div class="auth-step'+(i===step?" active":(done?" done":""))+'" role="tab" aria-selected="'+(i===step?"true":"false")+'">'+
   '<span class="auth-step-num">'+(done?'<svg viewBox="0 0 24 24" class="auth-step-check" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-11"/></svg>':i)+'</span>'+
   '<span class="auth-step-label">'+esc(labels[i-1])+'</span>'+
  '</div>';
  if(i<total)html+='<span class="auth-step-line'+(i<step?" done":"")+'"></span>';
 }
 return html+'</div>';
}

// ---- account type cards ----
function authAccountTypes(){
 var ar=authAr();
 return '<div class="auth-account-types">'+
  '<button type="button" class="auth-account-type" onclick="regSetMode(\'normal\')">'+
   '<span class="auth-at-ico">'+authSvgIcon("user")+'</span>'+
   '<span class="auth-at-text"><b>'+esc(authT("regNormal"))+'</b><small>'+esc(authT("regNormalDesc"))+'</small></span>'+
   '<span class="auth-at-arrow">'+authSvgIcon("chev")+'</span>'+
  '</button>'+
  '<button type="button" class="auth-account-type" onclick="regSetMode(\'owner\')">'+
   '<span class="auth-at-ico">'+authSvgIcon("school")+'</span>'+
   '<span class="auth-at-text"><b>'+esc(authT("regOwner"))+'</b><small>'+esc(authT("regOwnerDesc"))+'</small></span>'+
   '<span class="auth-at-arrow">'+authSvgIcon("chev")+'</span>'+
  '</button>'+
 '</div>';
}

// ---- field builders ----
function authField(labelText,innerHtml,afterHtml){
 return '<div class="auth-field"><label class="auth-label">'+labelText+'</label>'+innerHtml+(afterHtml||"")+'</div>';
}
function authInput(iconName,inputHtml){
 return '<div class="auth-input"><span class="auth-input-ico">'+authSvgIcon(iconName)+'</span>'+inputHtml+'</div>';
}
function authSelect(selectHtml){
 return '<div class="auth-select">'+selectHtml+authChev()+'</div>';
}
function authNameField(){
 return authField(authT("fullName"),
  authInput("user",'<input id="rg-name" required placeholder="'+esc(authT("localSchoolPlaceholder"))+'" value="'+esc(regForm.name)+'" oninput="regForm.name=this.value" autocomplete="name">'));
}
function authCountryRow(){
 var c=regCountry();
 return '<div class="auth-row2">'+
  authField(authT("country"),authSelect('<select id="rg-country" class="f-select" onchange="regOnCountry()">'+regCountryOptions()+'</select>'))+
  authField(authT("countryCode"),authInput("phone",'<input id="rg-cc" dir="ltr" readonly value="'+esc(c&&c.callingCode?("+"+c.callingCode):"")+'">'))+
 '</div>';
}
function authPhoneField(){
 return authField(authT("phoneNumber"),
  authInput("phone",'<input id="rg-phone" dir="ltr" required placeholder="+967 7XXXXXXXX" value="'+esc(regForm.phone)+'" oninput="regForm.phone=this.value;regCheckPhone()" autocomplete="tel">'),
  regHint(regState.phoneState,"phoneAvailable","phoneTaken"));
}
function authEmailField(){
 return authField(authT("email"),
  authInput("mail",'<input id="rg-email" type="email" dir="ltr" required placeholder="'+esc(authT("emailPlaceholder"))+'" value="'+esc(regForm.email)+'" oninput="regForm.email=this.value;regCheckEmail()" autocomplete="email">'),
  regHint(regState.emailState,"emailAvailable","emailTaken"));
}
function authPasswordField(){
 return authField(authT("password"),
  '<div class="auth-input"><span class="auth-input-ico">'+authSvgIcon("lock")+'</span>'+
  '<input id="rg-pass" type="password" required placeholder="••••••••" value="'+esc(regForm.pass)+'" oninput="regForm.pass=this.value;authPwLive()" autocomplete="new-password">'+
  '<button type="button" class="auth-eye" data-for="rg-pass" onclick="authTogglePass(\'rg-pass\',this)" aria-label="'+esc(authT("showPassword"))+'">'+authSvgIcon("eye")+'</button>'+
  '</div>');
}
function authConfirmPasswordField(){
 return authField(authT("confirmPassword"),
  '<div class="auth-input"><span class="auth-input-ico">'+authSvgIcon("lock")+'</span>'+
  '<input id="rg-pass2" type="password" required placeholder="••••••••" value="'+esc(regForm.pass2)+'" oninput="regForm.pass2=this.value" autocomplete="new-password">'+
  '</div>');
}

// ---- fallback location options for non-YE (no fake data) ----
function authNbOptions(distId){
 var list=regNbs[distId];
 if(!list)return opt("",authT("allNeighborhoods"),true);
 return opt("",authT("allNeighborhoods"),!regState.nb)+list.map(function(n){return opt(n.name,n.name,regState.nb===n.name)}).join("");
}

// ---- steps ----
function authStepAccount(){
 var html=authNameField();
 html+=authCountryRow();
 html+=authPhoneField();
 html+=authEmailField();
 html+='<div class="auth-row2">'+authPasswordField()+authConfirmPasswordField()+'</div>';
 html+='<div class="auth-pw-rules" id="rg-pw-rules">'+authPwRulesHtml(regForm.pass)+'</div>';
 return html;
}
function authStepLocation(isYE){
 if(isYE){
  regLoadGovs();
  var html='<p class="auth-step-hint">'+esc(authT("authLocIntro"))+'</p>';
  html+=authField(authT("governorate"),authSelect('<select id="rg-gov" class="f-select" onchange="regOnGov()">'+regGovOptions()+'</select>'));
  html+=authField(authT("district"),authSelect('<select id="rg-district" class="f-select" onchange="regOnDistrict()"'+(regState.govId?"":" disabled")+'>'+regDistOptions()+'</select>'));
  if(regState.govId)regLoadDists(regState.govId);
  html+=authField(authT("neighborhood"),authSelect('<select id="rg-nb" class="f-select" onchange="regState.nb=this.value"'+(regState.districtId?"":" disabled")+'>'+(regState.districtId?authNbOptions(regState.districtId):opt("",authT("allNeighborhoods"),true))+'</select>'));
  if(regState.districtId)regLoadNbs(regState.districtId);
  return html;
 }
 return '<p class="auth-step-hint">'+esc(authT("authLocNoteOther"))+'</p>';
}
function authStepInstitution(){
 var typeOpts=["private_school","government_school","college","university","institute"].map(function(t){return opt(t,orgTypeLabel(t),regState.orgType===t||(!regState.orgType&&t==="private_school"))}).join("");
 var html='<div class="auth-subhead"><span class="auth-subhead-ico">'+authSvgIcon("school")+'</span>'+esc(authT("institutionSection"))+'</div>';
 html+=authField(authT("orgType"),authSelect('<select id="rg-org-type" class="f-select" onchange="regState.orgType=this.value">'+typeOpts+'</select>'));
 html+=authField(authT("institutionName"),authInput("school",'<input id="rg-org-name" required placeholder="'+esc(authT("localSchoolPlaceholder"))+'" value="'+esc(regForm.orgName)+'" oninput="regForm.orgName=this.value">'));
 html+=authField(authT("institutionAddress"),authInput("pin",'<input id="rg-org-address" value="'+esc(regForm.orgAddress)+'" oninput="regForm.orgAddress=this.value">'));
 html+='<div class="auth-row2">'+
  authField(authT("institutionPhone"),authInput("phone",'<input id="rg-org-phone" dir="ltr" value="'+esc(regForm.orgPhone)+'" oninput="regForm.orgPhone=this.value">'))+
  authField(authT("institutionEmail"),authInput("mail",'<input id="rg-org-email" type="email" dir="ltr" value="'+esc(regForm.orgEmail)+'" oninput="regForm.orgEmail=this.value">'))+
 '</div>';
 html+=authField(authT("institutionDesc"),authInput("info",'<input id="rg-org-desc" value="'+esc(regForm.orgDesc)+'" oninput="regForm.orgDesc=this.value">'));
 html+='<div class="auth-subhead"><span class="auth-subhead-ico">'+authSvgIcon("doc")+'</span>'+esc(authT("ownershipSection"))+'</div>';
 html+=authField(authT("ownershipProof"),authInput("doc",'<input id="rg-org-proof" value="'+esc(regForm.orgProof)+'" oninput="regForm.orgProof=this.value">'),'<small class="rg-hint idle">'+esc(authT("ownershipProofHint"))+'</small>');
 return html;
}
function authTerms(){
 var ar=authAr();
 return '<label class="auth-terms">'+
  '<input type="checkbox" id="rg-terms" class="auth-terms-box">'+
  '<span>'+esc(ar?("أوافق على"):"I agree to the ")+' </span>'+
  '<a href="#!" onclick="return false">'+esc(authT("termsLabel"))+'</a>'+
  '<span>'+esc(ar?(" و"):" and ")+' </span>'+
  '<a href="#!" onclick="return false">'+esc(authT("privacyLabel"))+'</a>'+
  '<span>'+esc(ar?("."):" of Madarasati services.")+'</span>'+
 '</label>';
}

// ---- step navigation ----
function regTotalSteps(){return regState.mode==="owner"?3:2}
function regCurrentStep(){return regState.step||1}
function authStepNav(step,total,isOwner){
 var ar=authAr();
 var nav='<div class="auth-nav">';
 if(step>1)nav+='<button type="button" class="auth-btn ghost" onclick="regBack()">'+(ar?"← ":"")+esc(authT("authStepBack"))+(ar?"":" →")+'</button>';
 if(step<total){
  nav+='<button type="button" class="auth-btn primary" onclick="regNext()">'+esc(authT("authStepContinue"))+' '+(ar?"←":"→")+'</button>';
 }else{
  nav+='<button type="submit" class="auth-btn primary auth-full" id="rg-submit"'+(regState.submitting?" disabled":"")+'>'+(isOwner?esc(authT("submitOwnerRequest")):esc(authT("createAccountBtn")))+'</button>';
 }
 nav+='</div>';
 return nav;
}
function regNext(){
 var step=regCurrentStep();
 var err=regValidateStep(step);
 if(err){regState.error=err;render();return}
 regState.error=null;
 regKeep();
 regState.step=Math.min(regTotalSteps(),step+1);
 render();
}
function regBack(){
 regState.step=Math.max(1,regCurrentStep()-1);
 regState.error=null;
 render();
}

// ---- per-step validation ----
function regValidateStep(step){
 if(step===1){
  if(regForm.name.length<2)return authT("mustAcceptName");
  if(!regState.country)return authT("selectCountry");
  if(!regForm.phone)return authT("invalidPhone");
  if(!regForm.email||regForm.email.indexOf("@")<0)return authT("invalidEmail");
  var p=regForm.pass;
  if(!authPwOk(p).len||!authPwOk(p).upper||!authPwOk(p).sym)return authT("mustAcceptPassword");
  if(p!==regForm.pass2)return authT("passwordMismatch");
 }
 if(step===3){
  if(regForm.orgName.length<2)return authT("authOrgNameRequired");
 }
 return null;
}

// ================= REGISTER PAGE (override) =================
function registerPage(){
 var ar=authAr();
 regLoadCountries();
 // force YE state sync for cascades only when a country was previously selected
 var isYE=regState.country==="YE";
 var errHtml=regState.error?'<div class="auth-alert error" role="alert">'+esc(regState.error)+'</div>':'';
 var infoHtml=regState.info?'<div class="auth-alert ok" role="status">'+esc(regState.info)+'</div>':'';
 var card='<div class="auth-card">'+
  '<div class="auth-card-head">'+
   '<span class="auth-welcome-ico">'+authSvgIcon("school")+'</span>'+
   '<h2>'+esc(authT("registerTitle"))+'</h2>'+
   '<p>'+esc(authT("authRegisterLead"))+'</p>'+
  '</div>'+errHtml+infoHtml;

 // Account type selection (pre-step)
 if(!regState.mode){
  card+=authAccountTypes();
  card+='<div class="auth-switch-row"><span>'+esc(authT("alreadyHaveAccount"))+'</span>'+
   '<button type="button" class="auth-link" onclick="go(\'login\')">'+esc(authT("loginCta"))+'</button></div>';
  return authPageShell(authVisual("register"),card+'</div>');
 }

 var total=regTotalSteps();
 var step=regCurrentStep();
 card+='<div class="auth-stepper-wrap">'+authStepper(step,total)+'</div>';
 card+='<form class="auth-form" onsubmit="handleRegister(event)" novalidate>';
 if(step===1)card+=authStepAccount();
  else if(step===2)card+=authStepLocation(isYE);
  else if(step===3)card+=authStepInstitution();
  if(step===total)card+=authTerms();
 card+=authStepNav(step,total,regState.mode==="owner");
 card+='</form>';
 if(step===total)card+=authAltAuth();
 card+='<div class="auth-switch-row"><span>'+esc(authT("alreadyHaveAccount"))+'</span>'+
  '<button type="button" class="auth-link" onclick="go(\'login\')">'+esc(authT("loginCta"))+'</button></div>';
 return authPageShell(authVisual("register"),card+'</div>');
}

// ================= LOGIN PAGE (override) =================
function loginPage(){
 var ar=authAr();
 var errMsg=authState.error?'<div class="auth-alert error" role="alert">'+esc(authState.error)+'</div>':'';
 var remembered="";
 try{remembered=localStorage.getItem("madarasati_remember_email")||""}catch(e){}
 var card='<div class="auth-card">'+
  '<div class="auth-card-head">'+
   '<span class="auth-welcome-ico">'+authSvgIcon("wave")+'</span>'+
   '<h2>'+esc(authT("loginCta"))+'</h2>'+
   '<p>'+esc(authT("authWelcomeBack"))+' — '+esc(authT("loginLead"))+'</p>'+
  '</div>'+errMsg+
  '<form class="auth-form" onsubmit="handleLogin(event)" novalidate>'+
   authField(authT("email"),authInput("mail",'<input type="email" id="login-email" required placeholder="'+esc(authT("emailPlaceholder"))+'" value="'+esc(remembered)+'" autocomplete="email">'))+
   authField(authT("password"),'<div class="auth-input"><span class="auth-input-ico">'+authSvgIcon("lock")+'</span>'+
    '<input type="password" id="login-password" required placeholder="••••••••" autocomplete="current-password">'+
    '<button type="button" class="auth-eye" data-for="login-password" onclick="authTogglePass(\'login-password\',this)" aria-label="'+esc(authT("showPassword"))+'">'+authSvgIcon("eye")+'</button>'+
    '</div>')+
   '<div class="auth-options-row">'+
    '<label class="auth-remember"><input type="checkbox" id="rg-remember" onclick="authRememberToggle()"'+(remembered?' checked':'')+'><span>'+esc(authL("rememberMe"))+'</span></label>'+
    '<button type="button" class="auth-link" onclick="authForgot()">'+esc(authT("forgotPassword"))+'</button>'+
   '</div>'+
   '<button type="submit" class="auth-btn primary auth-full" id="login-submit">'+esc(authT("loginCta"))+'<span class="auth-btn-arrow">'+(ar?"←":"→")+'</span></button>'+
  '</form>'+
  authAltAuth()+
  '<div class="auth-switch-row"><span>'+esc(authT("noAccountQuestion"))+'</span>'+
   '<button type="button" class="auth-link" onclick="go(\'register\')">'+esc(authT("createNow"))+'</button></div>'+
 '</div>';
 return authPageShell(authVisual("login"),card);
}
function authForgot(){
 var ar=authAr();
 var card=document.querySelector(".auth-card");
 if(card){
  var old=document.getElementById("auth-forgot-msg");
  var msg=old||document.createElement("div");
  msg.id="auth-forgot-msg";
  msg.className="auth-forgot-msg";
  msg.textContent=authT("forgotMsg");
  if(!old)card.insertBefore(msg,card.querySelector(".auth-form")?card.querySelector(".auth-form").nextSibling:card.firstChild);
  var visible=old?old.dataset.open==="1":false;
  msg.dataset.open=visible?"0":"1";
  msg.style.display=visible?"none":"block";
 }
}

// ================= REGISTER SUBMIT (override — same APIs) =================
async function handleRegister(e){
 e.preventDefault();
 if(regState.submitting)return;
 regState.error=null;
 // defensive re-validation across all steps using persisted regForm
 var total=regTotalSteps();
 for(var s=1;s<=total;s++){
  var se=regValidateStep(s);
  if(se){regState.error=se;render();return}
 }
 var terms=document.getElementById("rg-terms");
 if(terms&&!terms.checked){regState.error=authT("mustAcceptTerms");render();return}
 var c=regCountry();
 var profile={countryCode:regState.country,phoneCountryCode:c&&c.callingCode?c.callingCode:""};
 if(regState.country==="YE"){
  if(regState.govId)profile.governorateId=regState.govId;
  if(regState.districtId)profile.districtId=regState.districtId;
 }
 regState.submitting=true;render();
 try{
  var user=await apiPost('/api/auth/register',{
   name:regForm.name,email:regForm.email,password:regForm.pass,phone:regForm.phone,
   phoneCountryCode:c&&c.callingCode?c.callingCode:"",countryIso:regState.country,profile:profile
  });
  authState.currentUser=user;
  if(regState.mode==="owner"){
   try{
    await apiPost('/api/ownership/requests',{
     requestType:"new_institution",
     institutionName:regForm.orgName,
     institutionType:regState.orgType||"private_school",
     countryCode:regState.country,
     governorateCode:regState.country==="YE"?(function(){var g=(regGovs||[]).filter(function(x){return x.id===regState.govId})[0];return g?g.code:null})():null,
     districtCode:regState.country==="YE"?(function(){var l=regDists[regState.govId]||[];var d=l.filter(function(x){return x.id===regState.districtId})[0];return d?d.code:null})():null,
     neighborhood:regState.nb||null,
     address:regForm.orgAddress,contactPhone:regForm.orgPhone,contactEmail:regForm.orgEmail,
     description:regForm.orgDesc,ownershipProof:regForm.orgProof
    });
    regState.info=authT("requestSubmitted");
   }catch(reqErr){
    regState.info=authT("requestSubmitFailed")+": "+regApiError(reqErr);
   }
  }else{
   regState.info=authT("accountCreated");
  }
  regState.submitting=false;
  go(consumeReturnAfterAuth()||(regState.mode==="owner"?"owner":"home"));
 }catch(err){
  regState.submitting=false;
  regState.error=regApiError(err);
  render();
 }
}