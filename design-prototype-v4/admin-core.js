// Connected Super Admin pages for the approved V4 shell.
// Pages compose existing domain APIs; PostgreSQL remains authoritative.
(function () {
  "use strict";
  var ac={cache:{},loading:{},errors:{},institutionType:"private_school",institutionSearch:"",institutionsView:"cards",
    userRole:"",userStatus:"",userSearch:"",userOrg:"",academicTab:"stages",
    orgForm:null,teacherForm:null,teacherDetail:null,teachersView:"cards",teacherTab:"all",
    teacherSearch:"",teacherSubject:"",teacherCountry:""};
  function t(ar,en){return lang==="ar"?ar:en}
  function errorText(e){return e&&e.data&&e.data.error||e&&e.message||t("تعذر تحميل البيانات.","Unable to load data.")}
  function fmt(v){if(!v)return "—";try{return new Date(v).toLocaleString(lang==="ar"?"ar-YE":"en-GB")}catch(e){return String(v)}}
  function sum(rows,key){return(rows||[]).reduce(function(n,r){return n+Number(r[key]||0)},0)}
  function listOf(data){
    if(Array.isArray(data))return data;
    if(data&&Array.isArray(data.items))return data.items;
    if(data&&Array.isArray(data.rows))return data.rows;
    return [];
  }
  function badge(v){var ok=["active","verified","approved","accepted","completed","confirmed"].indexOf(v)>-1;
    var bad=["suspended","rejected","deleted","cancelled","inactive"].indexOf(v)>-1;
    return '<span class="badge '+(ok?"ok":bad?"bad":"wait")+'">'+esc(statusLabel(v))+'</span>'}
  function head(title,desc,actions){return '<div class="welcome ac-welcome"><div><h1>'+esc(title)+'</h1><p>'+esc(desc)+
    '</p></div><div class="sp-actions">'+(actions||"")+'</div></div>'}
  function state(key){if(ac.loading[key])return '<div class="loading-inline"><div class="loader"></div></div>';
    if(ac.errors[key])return '<div class="empty-state ac-error">'+esc(ac.errors[key])+'<div><button class="btn" onclick="acReload(\''+
      key+'\')">'+t("إعادة المحاولة","Retry")+'</button></div></div>';return ""}
  function load(key,url,normalizer){if(ac.loading[key]||Object.prototype.hasOwnProperty.call(ac.cache,key))return;
    ac.loading[key]=true;ac.errors[key]=null;apiGet(url).then(function(data){ac.cache[key]=normalizer?normalizer(data):data;
      ac.loading[key]=false;render()}).catch(function(e){ac.errors[key]=errorText(e);ac.loading[key]=false;render()})}
  window.acReload=function(key){delete ac.cache[key];ac.errors[key]=null;render()};
  function invalidate(prefix){Object.keys(ac.cache).forEach(function(k){if(k.indexOf(prefix)===0)delete ac.cache[k]})}
  function statusCounts(rows){var out={};(rows||[]).forEach(function(r){out[r.status||"other"]=Number(r.count||0)});return out}

  // ---- shared form helpers ----
  function wVal(id){return ((document.getElementById(id)||{}).value||"").trim()}
  function wOpt(v,label,sel){return '<option value="'+esc(v)+'"'+((sel===v)?" selected":"")+'>'+esc(label)+'</option>'}
  function wInput(label,id,val,ph,wide){return '<div class="form-group'+(wide?" ac-field-wide":"")+'"><label>'+esc(label)+'</label><input id="'+id+'" type="text" value="'+esc(val||"")+'" placeholder="'+esc(ph||"")+'"></div>'}
  function wArea(label,id,val){return '<div class="form-group ac-field-wide"><label>'+esc(label)+'</label><textarea id="'+id+'" rows="3">'+esc(val||"")+'</textarea></div>'}
  function wSel(label,id,html,wide,onchange){return '<div class="form-group'+(wide?" ac-field-wide":"")+'"><label>'+esc(label)+'</label><select id="'+id+'"'+(onchange?' onchange="'+onchange+'"':"")+'>'+html+'</select></div>'}
  function wCheck(label,id,checked){return '<label class="ac-check"><input type="checkbox" id="'+id+'"'+((checked)?" checked":"")+'><span>'+esc(label)+'</span></label>'}
  function formError(f){return f._error?'<div class="ac-form-error">'+esc(f._error)+'</div>':""}

  // ---- institutions: add / edit ----
  var orgTypeOps=[["private_school"],["government_school"],["college"],["university"],["institute"]];
  window.acOrgEdit=function(id){var key="institutions:"+ac.institutionType+":"+ac.institutionSearch;
    var rows=(ac.cache[key]||{}).items||[];for(var i=0;i<rows.length;i++){if(rows[i].id===id){acOrgFormOpen("edit",rows[i]);return}}};
  window.acOrgFormOpen=function(mode,o){ac.orgForm={mode:mode,row:o||null,gov:"",govId:"",dist:"",_error:null,draft:{}};
    if(mode==="edit"&&o){ac.orgForm.gov=o.governorate||"";ac.orgForm.dist=o.district||""}
    if(!ac.cache.locGovs)load("locGovs","/api/locations/governorates");render()};
  window.acOrgFormClose=function(){ac.orgForm=null;render()};
  window.acOrgGov=function(code){ac.orgForm.gov=code||"";ac.orgForm.govId="";ac.orgForm.dist="";
    invalidate("locDist:");var list=ac.cache.locGovs||[];
    for(var i=0;i<list.length;i++){if(list[i].code===code){ac.orgForm.govId=list[i].id;break}}
    if(code&&ac.orgForm.govId)load("locDist:"+ac.orgForm.govId,"/api/locations/districts?governorateId="+ac.orgForm.govId);render()};
  window.acOrgDist=function(code){ac.orgForm.dist=code||""};
  function acOrgGovOptions(){var out=wOpt("",t("— بدون محافظة —","— No governorate —"),ac.orgForm.gov);
    (ac.cache.locGovs||[]).forEach(function(g){out+=wOpt(g.code,g.name||g.code,ac.orgForm.gov)});return out}
  function acOrgDistOptions(){if(!ac.orgForm.govId)return wOpt("",t("— بدون مديرية —","— No district —"),ac.orgForm.dist);
    var out=wOpt("",t("— بدون مديرية —","— No district —"),ac.orgForm.dist);
    (ac.cache["locDist:"+ac.orgForm.govId]||[]).forEach(function(d){out+=wOpt(d.code,d.name||d.code,ac.orgForm.dist)});return out}
  window.acOrgSave=function(){var f=ac.orgForm;if(!f||f._busy)return;
    if(f.gov&&!f.govId){var list=ac.cache.locGovs||[];for(var i=0;i<list.length;i++){if(list[i].code===f.gov){f.govId=list[i].id;break}}}
    if(f.govId)load("locDist:"+f.govId,"/api/locations/districts?governorateId="+f.govId);
    f._error=null;var name=wVal("ac-org-name");
    if(!name){f._error=t("اسم المؤسسة مطلوب.","Institution name is required.");render();return}
    var payload={name:name,type:wVal("ac-org-type")||"private_school",email:wVal("ac-org-email"),
      phone:wVal("ac-org-phone"),website:wVal("ac-org-website"),description:wVal("ac-org-desc"),
      address:wVal("ac-org-address"),neighborhood:wVal("ac-org-neigh"),
      registration_open:(wVal("ac-org-reg")||"open")==="open"};
    var gov=wVal("ac-org-gov");if(gov){payload.governorate_code=gov;var dis=wVal("ac-org-dist");if(dis)payload.district_code=dis}
    f._busy=true;var req=f.mode==="edit"?apiPut("/api/organizations/"+f.row.id,payload):apiPost("/api/organizations",payload);
    req.then(function(){ac.orgForm=null;invalidate("institutions:");delete ac.cache.dashboard;render()})
      .catch(function(e){f._busy=false;f._error=errorText(e);render()})};
  function adminOrgForm(){var f=ac.orgForm;if(!f)return "";
    ["ac-org-name","ac-org-email","ac-org-phone","ac-org-website","ac-org-desc","ac-org-address",
     "ac-org-neigh","ac-org-gov","ac-org-dist","ac-org-reg"].forEach(function(id){
      var el=document.getElementById(id);if(el)f.draft[id]=el.value});
    function fd(id){var d=f.draft[id];if(d!=null)return d;
      if(f.mode==="edit"&&f.row){var rk={name:"name",email:"email",phone:"phone",website:"website",desc:"description",address:"address",neigh:"neighborhood"}[id.split("-")[2]]||id.split("-")[2];
        return f.row[rk]===undefined?"":f.row[rk]}return ""}
    if(f.gov&&!f.govId){var list=ac.cache.locGovs||[];for(var i=0;i<list.length;i++){if(list[i].code===f.gov){f.govId=list[i].id;break}}}
    if(f.govId)load("locDist:"+f.govId,"/api/locations/districts?governorateId="+f.govId);
    var typeSelVal=f.draft["ac-org-type"]!=null?f.draft["ac-org-type"]:(f.mode==="edit"?(f.row.type||"private_school"):ac.institutionType);
    var typeStr="";orgTypeOps.forEach(function(x){typeStr+=wOpt(x[0],orgTypeLabel(x[0]),typeSelVal)});
    var regOpen=f.draft["ac-org-reg"]!=null?f.draft["ac-org-reg"]:(f.mode==="edit"?(f.row.registrationOpen?"open":"closed"):"open");
    var distSlot=f.govId?(ac.loading["locDist:"+f.govId]?
      '<div class="loading-inline"><div class="loader"></div></div>':
      '<select id="ac-org-dist" onchange="acOrgDist(this.value)">'+acOrgDistOptions()+'</select>'):
      '<small class="ac-hint">'+t("اختر المحافظة أولاً.","Choose a governorate first.")+'</small>';
    return '<section class="panel ac-form-panel">'+formError(f)+'<div class="panel-title"><h2>'+t("إضافة مؤسسة","Add institution")+
      (f.mode==="edit"?t(" · تعديل"," · edit"):"")+'</h2><button class="btn" onclick="acOrgFormClose()">'+t("إغلاق","Close")+'</button></div>'+
      '<div class="ac-form-grid">'+wInput(t("الاسم *","Name *"),"ac-org-name",fd("ac-org-name"),t("اسم المؤسسة","Institution name"))+
      wSel(t("النوع","Type"),"ac-org-type",typeStr)+wInput(t("البريد الإلكتروني","Email"),"ac-org-email",fd("ac-org-email"),"")+
      wInput(t("الهاتف","Phone"),"ac-org-phone",fd("ac-org-phone"),t("+967...","+967..."))+
      wInput(t("الموقع الإلكتروني","Website"),"ac-org-website",fd("ac-org-website"),"https://")+
      '<div class="form-group"><label>'+t("التسجيل","Registration")+'</label><select id="ac-org-reg">'+wOpt("open",t("مفتوح","Open"),regOpen)+
      wOpt("closed",t("مغلق","Closed"),regOpen)+'</select></div>'+
      wSel(t("المحافظة","Governorate"),"ac-org-gov",acOrgGovOptions(),true)+
      '<div class="form-group ac-field-wide"><label>'+t("المديرية","District")+'</label>'+distSlot+'</div>'+
      wInput(t("الحي","Neighborhood"),"ac-org-neigh",fd("ac-org-neigh"),"",true)+
      wInput(t("العنوان","Address"),"ac-org-address",fd("ac-org-address"),"",true)+
      wArea(t("الوصف","Description"),"ac-org-desc",fd("ac-org-desc"))+
      '</div><div class="ac-form-actions"><button class="btn green" '+((f._busy)?"disabled":"")+' onclick="acOrgSave()">'+
      (f._busy?t("جاري الحفظ...","Saving..."):t("حفظ","Save"))+'</button><button class="btn" onclick="acOrgFormClose()">'+t("إلغاء","Cancel")+
      '</button></div></section>'
  }

  // ---- teachers ----
  // A teacher is an independent professional, not an institution: a real login
  // account, a declared location, a price per subject and their own documents.
  // This section composes the approved shell (org-grid/org-card for the cards,
  // core-hero/core-panel for the detail, wa-btn for the chat action) and never
  // rebuilds it. Subjects and stages stay linked to the shared global catalog.
  var TEACHER_CURRENCIES=["YER","SAR"];
  var TEACHER_LANGUAGES=["AR","EN"];
  var TEACHER_PERIODS=["hourly","monthly"];
  var TEACHER_DOC_ACCEPT="application/pdf,image/jpeg,image/png,image/webp";
  var TEACHER_TABS=[["all","الكل","All"],["verified","موثّق","Verified"],["pending","بانتظار التحقق","Pending"],
    ["suspended","موقوف","Suspended"],["deletion_requested","طلب حذف","Deletion requested"],
    ["deletions","قائمة طلبات الحذف","Deletion queue"]];

  function teacherCurrencyLabel(c){return c==="SAR"?t("ريال سعودي (SAR)","Saudi riyal (SAR)"):t("ريال يمني (YER)","Yemeni riyal (YER)")}
  function teacherLangLabel(c){return c==="EN"?t("إنجليزي","English"):t("عربي","Arabic")}
  function teacherPeriodLabel(p){return p==="monthly"?t("شهرياً","Monthly"):t("بالساعة","Hourly")}
  function teacherDocLabel(c){
    var map={degree:t("شهادة جامعية","Degree"),experience:t("إثبات خبرة","Experience letter"),
      identity:t("هوية","Identity"),certificate:t("شهادة تدريب","Certificate"),other:t("مستند آخر","Other")};
    return map[c]||c||"—"}
  function teacherName(r){return (r&&(r.userName||r.nameEn))||"—"}
  function teacherContact(r){return (r&&(r.whatsapp||r.phone||r.userPhone))||""}
  function teacherPlace(r){return [r&&r.countryName,r&&r.governorateName,r&&r.districtName,r&&r.neighborhoodName].filter(Boolean).join(" · ")}
  function teacherAvatar(r,small){
    var name=teacherName(r);
    var initials=name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0)}).join("");
    var cls="owner-avatar"+(small?"":" owner-avatar-lg");
    if(r&&r.avatarUrl)return '<span class="'+cls+'"><img src="'+esc(r.avatarUrl)+'" alt="'+esc(name)+'" loading="lazy"></span>';
    return '<span class="'+cls+'" aria-hidden="true">'+esc(initials||"—")+'</span>'}
  // The three stored flags answer "where can this teacher teach", and the
  // section's vocabulary is exactly (حضوري / عن بعد / مدمج).
  function teacherModes(r){
    var online=Boolean(r&&r.offersOnline),onSite=Boolean(r&&(r.travelsToStudentHome||r.acceptsStudentHome));
    if(online&&onSite)return [t("مدمج","Hybrid")];
    if(online)return [t("عن بعد","Online")];
    if(onSite)return [t("حضوري","On-site")];
    return []}
  function teacherSubjectChips(r,limit){
    var subs=(r&&r.subjects)||[];
    if(!subs.length)return '<span class="gated-value">'+t("لم تُحدَّد مواد بعد","No subjects yet")+'</span>';
    return subs.slice(0,limit||99).map(function(s){
      return '<span class="core-chip">'+esc(s.name)+
        (s.amount==null?'':' <b>'+esc(s.amount)+' '+esc(s.currency||"")+'</b>')+
        (s.languageCode?' <span class="chip-lang">'+esc(teacherLangLabel(s.languageCode))+'</span>':"")+
        '</span>'}).join("")}
  // Google Maps is asked for the teacher by name inside their own neighbourhood
  // when no coordinates were captured — an empty map is never shown.
  function teacherMapsUrl(r){
    if(r&&r.latitude&&r.longitude)return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(r.latitude+","+r.longitude);
    var parts=[teacherName(r),r&&r.neighborhoodName,r&&r.districtName,r&&r.governorateName,r&&r.countryName,r&&r.addressLine].filter(Boolean);
    return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(parts.join(", "))}

  function teacherLoadCatalog(){
    load("teacherCatalog","/api/teachers/form-catalog");
    load("locGovs","/api/locations/governorates")}
  function teacherCatalog(){return ac.cache.teacherCatalog||null}
  function teacherGovOptions(countryId,sel){
    var out=wOpt("",t("— بدون محافظة —","— No governorate —"),sel||"");
    (ac.cache.locGovs||[]).forEach(function(g){
      if(countryId&&g.countryCode&&g.countryCode!==countryId)return;
      out+=wOpt(String(g.id),g.name||g.code,String(sel||""))});
    return out}
  function teacherDistrictOptions(governorateId,sel){
    if(!governorateId)return wOpt("",t("— اختر المحافظة أولاً —","— Pick a governorate first —"),sel||"");
    var rows=ac.cache["locDist:"+governorateId];
    if(!rows)return wOpt("",t("— بانتظار التحميل —","— loading —"),sel||"");
    var out=wOpt("",t("— بدون مديرية —","— No district —"),sel||"");
    rows.forEach(function(d){out+=wOpt(String(d.id),d.name||d.code,String(sel||""))});
    return out}
  function teacherHoodOptions(districtId,sel){
    if(!districtId)return wOpt("",t("— اختر المديرية أولاً —","— Pick a district first —"),sel||"");
    var rows=ac.cache["locHood:"+districtId];
    if(!rows)return wOpt("",t("— بانتظار التحميل —","— loading —"),sel||"");
    var out=wOpt("",t("— بدون حي —","— No neighbourhood —"),sel||"");
    rows.forEach(function(n){out+=wOpt(String(n.id),n.name||n.code,String(sel||""))});
    return out}

  // The form's cascade. Each step clears the levels below it, so a stale
  // district from the previous governorate can never be submitted.
  window.acTeacherCountry=function(){var f=ac.teacherForm;if(!f)return;
    var countryId=wVal("ac-t-country");f.countryId=countryId;f.countryCode="";f.govId="";f.distId="";f.hoodId="";
    (teacherCatalog()||{countries:[]}).countries.forEach(function(c){if(String(c.id)===countryId)f.countryCode=c.code});
    delete f.draft["ac-t-gov"];delete f.draft["ac-t-dist"];delete f.draft["ac-t-hood"];
    render()};
  window.acTeacherGov=function(){var f=ac.teacherForm;if(!f)return;
    f.govId=wVal("ac-t-gov");f.distId="";f.hoodId="";
    invalidate("locDist:");invalidate("locHood:");
    if(f.govId)load("locDist:"+f.govId,"/api/locations/districts?governorateId="+f.govId,listOf);
    render()};
  window.acTeacherDistrict=function(){var f=ac.teacherForm;if(!f)return;
    f.distId=wVal("ac-t-dist");f.hoodId="";invalidate("locHood:");
    if(f.distId)load("locHood:"+f.distId,"/api/locations/neighborhoods?districtId="+f.distId,listOf);
    render()};
  window.acTeacherNeighborhood=function(){var f=ac.teacherForm;if(!f)return;
    f.hoodId=wVal("ac-t-hood");render()};

  window.acTeacherFormOpen=function(mode,r){
    ac.teacherForm={mode:mode,row:r||null,_error:null,draft:{},showPass:false,
      countryCode:"",countryId:"",govId:"",distId:"",hoodId:"",
      subjects:[],stages:[],quals:[],avails:[]};
    if(mode==="edit"&&r){
      var f=ac.teacherForm;
      f.countryCode=r.countryCode||"";
      f.countryId=r.countryId?String(r.countryId):"";
      f.govId=r.governorateId?String(r.governorateId):"";
      f.distId=r.districtId?String(r.districtId):"";
      f.hoodId=r.neighborhoodId?String(r.neighborhoodId):"";
      f.stages=(r.stages||[]).map(function(s){return String(s.id)});
      f.avails=(r.availability||[]).map(function(s){
        return{dayOfWeek:s.dayOfWeek,startTime:s.startTime,endTime:s.endTime,locationMode:s.locationMode}});
      f.quals=(r.qualifications||[]).map(function(q){
        return{title:q.title||"",institutionName:q.institutionName||"",degree:q.degree||"",year:q.year||""}});
      f.subjects=(r.subjects||[]).map(function(s){
        return{subjectId:String(s.subjectId||s.id),amount:s.amount==null?"":s.amount,
          currency:s.currency||"YER",billingPeriod:s.billingPeriod||"hourly",languageCode:s.languageCode||"AR"}});
    }
    if(mode==="add"){
      // Countries come from the locations catalog: Yemen and Saudi Arabia are
      // the two approved choices, so the form never offers a free-text country.
      var list=(teacherCatalog()||{}).countries||[];
      if(list.length){ac.teacherForm.countryCode=list[0].code;ac.teacherForm.countryId=String(list[0].id)}
    }
    teacherLoadCatalog();
    var f2=ac.teacherForm;
    // The catalog may still be in flight on first open, so the country and the
    // governorate cascade are resolved again once it lands.
    if(!f2.countryCode&&!(teacherCatalog()||null))teacherLoadCatalog();
    if(f2.govId)load("locDist:"+f2.govId,"/api/locations/districts?governorateId="+f2.govId,listOf);
    if(f2.distId)load("locHood:"+f2.distId,"/api/locations/neighborhoods?districtId="+f2.distId,listOf);
    render()};
  window.acTeacherFormClose=function(){ac.teacherForm=null;render()};
  window.acTeacherEdit=function(id){
    var source=ac.teacherDetail?[ac.teacherDetail.row]:(teacherRows()||[]);
    for(var i=0;i<source.length;i++){if(source[i]&&source[i].id===id){acTeacherFormOpen("edit",source[i]);return}}
    // A card opened from a filtered list may not carry the full profile, so the
    // editor falls back to the single-teacher endpoint.
    apiGet("/api/teachers/"+id).then(function(row){acTeacherFormOpen("edit",row)})
      .catch(function(e){alert(errorText(e))})};
  window.acTeacherPassToggle=function(){var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();
    f.showPass=!f.showPass;render();
    var el=document.getElementById("ac-t-password");if(el)el.focus()};

  // ---- priced subject rows ----
  // One row is one (subject, amount, currency, period, language) quote. The
  // server enforces one price per subject, and the form refuses to submit the
  // same subject twice before the request is even made.
  window.acTeacherSubjectAdd=function(subjectId){
    var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();
    var used={};f.subjects.forEach(function(s){used[String(s.subjectId)]=1});
    var pick="";
    if(subjectId)pick=String(subjectId);
    else{var list=(teacherCatalog()||{}).subjects||[];
      for(var i=0;i<list.length;i++){if(!used[String(list[i].id)]){pick=String(list[i].id);break}}}
    if(!pick){f._error=t("لا توجد مادة متاحة للإضافة. استخدم + لإضافة مادة جديدة.","No subject left to add. Use + to propose a new one.");return render()}
    f.subjects.push({subjectId:pick,amount:"",currency:"YER",billingPeriod:"hourly",languageCode:"AR"});
    f._error=null;render()};
  window.acTeacherSubjectRemove=function(index){
    var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();f.subjects.splice(index,1);render()};
  function acTeacherSubjectSync(){
    var f=ac.teacherForm;if(!f)return;
    f.subjects.forEach(function(s,i){
      var el=function(k){return document.getElementById("ac-t-sub-"+i+"-"+k)};
      if(el("amount"))s.amount=String(el("amount").value||"").trim();
      if(el("currency"))s.currency=el("currency").value;
      if(el("period"))s.billingPeriod=el("period").value;
      if(el("lang"))s.languageCode=el("lang").value;
      if(el("subject"))s.subjectId=el("subject").value})}
  window.acTeacherNewSubject=function(){
    var f=ac.teacherForm;if(!f||f._busy)return;
    var name=(prompt(t("اسم المادة الجديدة بالكامل:","Full name of the new subject:"))||"").trim();
    if(!name)return;
    var nameEn=(prompt(t("الاسم الإنجليزي للمادة (اختياري):","English name of the subject (optional):"))||"").trim();
    f._busy=true;f._error=null;
    apiPost("/api/teachers/subjects",{name:name,nameEn:nameEn||undefined}).then(function(row){
      f._busy=false;delete ac.cache.teacherCatalog;
      ac.cache.teacherCatalog=null;f._pendingSubjectId=String(row.id);
      // The proposal is a real catalog row, so the picker reloads from the API
      // and the newly created subject is selected straight away.
      apiGet("/api/teachers/form-catalog").then(function(cat){
        ac.cache.teacherCatalog=cat;acTeacherSubjectAdd(String(row.id))}).catch(function(){render()});
    }).catch(function(e){
      f._busy=false;
      if(e&&e.data&&e.data.code==="SUBJECT_EXISTS"){
        acTeacherDraft();
        var list=(teacherCatalog()||{}).subjects||[],hit=null;
        for(var i=0;i<list.length;i++){if(list[i].name===name)hit=String(list[i].id)}
        f._error=t("هذه المادة موجودة في الكتالوج العام — اخترها من القائمة بدل إضافتها.",
                   "That subject already exists in the global catalog — pick it from the list instead.");
        if(hit)acTeacherSubjectAdd(hit);else render();
      }else{f._error=errorText(e);render()}})};

  window.acTeacherSave=function(){
    var f=ac.teacherForm;if(!f||f._busy)return;f._error=null;
    var el=function(id){return document.getElementById(id)||{checked:false,value:""}};
    acTeacherDraft();
    var body={
      name:wVal("ac-t-name"),nameEn:wVal("ac-t-name-en"),bio:wVal("ac-t-bio"),
      headline:wVal("ac-t-headline"),gender:wVal("ac-t-gender"),
      phone:wVal("ac-t-phone"),whatsapp:wVal("ac-t-whatsapp")||wVal("ac-t-phone"),
      addressLine:wVal("ac-t-address"),skills:wVal("ac-t-skills"),
      countryId:wVal("ac-t-country")||null,
      governorateId:wVal("ac-t-gov")||null,districtId:wVal("ac-t-dist")||null,neighborhoodId:wVal("ac-t-hood")||null,
      offersOnline:el("ac-t-online").checked,travelsToStudentHome:el("ac-t-travel").checked,
      acceptsStudentHome:el("ac-t-home").checked,avatarUrl:wVal("ac-t-avatar")
    };
    var exp=wVal("ac-t-exp");if(exp!=="")body.experienceYears=Number(exp);
    body.stageIds=f.stages;
    body.subjects=f.subjects.map(function(s){
      return{subjectId:Number(s.subjectId),amount:s.amount===""?null:Number(s.amount),
        currency:s.currency,billingPeriod:s.billingPeriod,languageCode:s.languageCode}});
    body.qualifications=f.quals.map(function(q){return{title:q.title,institutionName:q.institutionName,degree:q.degree,year:q.year}}) .filter(function(q){return q.title});
    var el2=function(id){return document.getElementById(id)};
    if(el2("ac-t-skill-input")){var extra=String(el2("ac-t-skill-input").value||"").trim();if(extra)body.skills=(body.skills?body.skills+", ":"")+extra}
    if(f.mode==="add"){
      body.email=wVal("ac-t-email");body.password=wVal("ac-t-password");
      if(!body.name||!body.email||!body.password){f._error=t("الاسم والبريد وكلمة المرور مطلوبة.","Name, email and password are required.");return render()}
    }
    body.availability=f.avails.map(function(s){
      return{dayOfWeek:s.dayOfWeek,startTime:s.startTime,endTime:s.endTime,locationMode:s.locationMode}});
    if(f.mode==="edit")body.status=wVal("ac-t-status")||"active";
    if(f.mode==="edit")body.verificationStatus=wVal("ac-t-verif")||"pending";
    f._busy=true;
    var req=f.mode==="add"?apiPost("/api/teachers",body):apiPatch("/api/teachers/"+f.row.id,body);
    req.then(function(){
      ac.teacherForm=null;invalidate("teachers:");delete ac.cache.teacherDeletions;delete ac.cache.dashboard;
      render()}).catch(function(e){f._busy=false;f._error=errorText(e);render()})};

  window.acTeacherQualAdd=function(){var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();f.quals.push({title:"",institutionName:"",degree:"",year:""});render()};
  window.acTeacherQualRemove=function(index){var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();f.quals.splice(index,1);render()};
  function acTeacherQualSync(){var f=ac.teacherForm;if(!f)return;
    f.quals.forEach(function(q,i){
      ["title","institutionName","degree","year"].forEach(function(k){
        var el=document.getElementById("ac-t-qual-"+i+"-"+k);if(el)q[k]=String(el.value||"").trim()})})}
  window.acTeacherStageToggle=function(id){var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();
    var key=String(id),idx=f.stages.indexOf(key);
    if(idx<0)f.stages.push(key);else f.stages.splice(idx,1);render()};

  // ---- list / detail navigation ----
  window.acTeacherDetailOpen=function(id){
    window.scrollTo(0,0);
    apiGet("/api/teachers/"+id).then(function(r){
      ac.teacherDetail={id:id,tab:"profile",row:r};
      render();
      apiGet("/api/teachers/"+id+"/documents").then(function(docs){
        if(ac.teacherDetail&&ac.teacherDetail.id===id){ac.teacherDetail.docs=listOf(docs);render()}
      }).catch(function(){if(ac.teacherDetail&&ac.teacherDetail.id===id){ac.teacherDetail.docs=[];render()}});
    }).catch(function(e){alert(errorText(e))})};
  window.acTeacherDetailClose=function(){ac.teacherDetail=null;render()};
  window.acTeacherDetailTab=function(tab){if(ac.teacherDetail)ac.teacherDetail.tab=tab;render()};

  window.acTeacherStatus=function(id,status){
    apiPost("/api/teachers/"+id+"/status",{status:status}).then(function(){
      ac.teacherDetail=null;invalidate("teachers:");delete ac.cache.dashboard;render();
    }).catch(function(e){alert(errorText(e))})};
  window.acTeacherVerify=function(id,verificationStatus){
    apiPatch("/api/teachers/"+id,{verificationStatus:verificationStatus}).then(function(){
      if(ac.teacherDetail)return acTeacherDetailOpen(id);
      invalidate("teachers:");render()}).catch(function(e){alert(errorText(e))})};

  // ---- deletion is a request, never a click ----
  window.acTeacherDeleteRequest=function(id){
    var reason=(prompt(t("سبب طلب حذف المعلم (10 أحرف على الأقل):","Reason for deleting this teacher (at least 10 characters):"))||"").trim();
    if(!reason)return;
    if(reason.length<10){alert(t("السبب قصير جداً. اكتب 10 أحرف على الأقل.","The reason is too short. Write at least 10 characters."));return}
    apiPost("/api/teachers/"+id+"/deletion-requests",{reason:reason}).then(function(){
      alert(t("تم تسجيل طلب الحذف وتحويله إلى قسم التحقق والمراجعة.","The deletion request was recorded and sent to verification and review."));
      ac.teacherDetail=null;invalidate("teachers:");delete ac.cache.teacherDeletions;render();
    }).catch(function(e){alert(errorText(e))})};
  window.acTeacherDeletionDecision=function(requestId,decision){
    var notes=prompt(decision==="approve"
      ?t("ملاحظة اعتماد الحذف (اختياري):","Approval note (optional):")
      :t("سبب رفض طلب الحذف (اختياري):","Reason for rejecting the request (optional):"))||"";
    apiPatch("/api/teachers/deletion-requests/"+requestId,{decision:decision,reviewNotes:notes}).then(function(){
      alert(decision==="approve"?t("تم اعتماد الحذف النهائي.","Final deletion approved."):t("تم رفض طلب الحذف.","Deletion request rejected."));
      invalidate("teachers:");delete ac.cache.teacherDeletions;delete ac.cache.dashboard;render();
    }).catch(function(e){alert(errorText(e))})};

  // ---- documents: real PDFs and images, reviewed by the platform admin ----
  window.acTeacherDocUpload=function(teacherId){
    var inp=document.getElementById("ac-t-doc-file");var typeEl=document.getElementById("ac-t-doc-type");
    if(!inp||!inp.files||!inp.files.length){alert(t("اختر ملفاً أولاً.","Choose a file first."));return}
    var file=inp.files[0];
    if(file.size>10*1024*1024){alert(t("حجم الملف يتجاوز 10 ميجابايت.","The file exceeds 10 MB."));return}
    if(TEACHER_DOC_ACCEPT.indexOf(file.type)<0){alert(t("الأنواع المسموحة: PDF أو صورة (JPG/PNG/WebP).","Allowed types: PDF or image (JPG/PNG/WebP)."));return}
    var btn=document.getElementById("ac-t-doc-btn");if(btn)btn.disabled=true;
    file.arrayBuffer().then(function(buf){
      return fetch("/api/teachers/"+encodeURIComponent(teacherId)+"/documents?docType="+encodeURIComponent(typeEl?typeEl.value:"other"),{
        method:"POST",credentials:"include",
        // A header value must be a byte string, so the Arabic file name travels
        // percent-encoded and the API decodes it back.
        headers:{"Content-Type":"application/octet-stream","X-File-Name":encodeURIComponent(file.name)},
        body:buf})}).then(function(res){
      if(!res.ok)return res.json().then(function(b){throw new Error((b&&b.error)||"Upload failed")});
      return res.json()}).then(function(){
      if(inp)inp.value="";render();
    }).catch(function(e){if(btn)btn.disabled=false;alert(errorText(e))})};
  window.acTeacherDocReview=function(docId,status){
    apiPatch("/api/teachers/documents/"+docId,{status:status}).then(function(){
      if(ac.teacherDetail)return acTeacherDetailOpen(ac.teacherDetail.id);
      render()}).catch(function(e){alert(errorText(e))})};
  window.acTeacherDocDelete=function(docId){
    if(!confirm(t("حذف المستند؟","Delete the document?")))return;
    apiDelete("/api/teachers/documents/"+docId).then(function(){
      if(ac.teacherDetail)return acTeacherDetailOpen(ac.teacherDetail.id);
      render()}).catch(function(e){alert(errorText(e))})};
  // ---- add / edit form ----
  function acTeacherSubjectOptions(selectedId){
    var list=((teacherCatalog()||{}).subjects)||[];
    var found=false,out="";
    list.forEach(function(s){if(String(s.id)===String(selectedId))found=true;
      out+=wOpt(String(s.id),s.name,String(selectedId))});
    // A pending proposal is not in the approved catalog yet, but a row that
    // already references it must keep its subject visible.
    if(selectedId&&!found){
      var extra=null,row=ac.teacherForm.row;
      if(row&&row.subjects)row.subjects.forEach(function(s){if(String(s.subjectId)===String(selectedId))extra=s});
      out=wOpt(String(selectedId),(extra?extra.name:t("مادة قيد المراجعة","subject under review"))+
        " · "+t("قيد المراجعة","pending review"),String(selectedId))+out}
    return out}
  function acTeacherDayLabel(day){
    var ar=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
    var en=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    return (lang==="ar"?ar:en)[Number(day)]||"—"}
  function acTeacherSlotModeLabel(mode){
    var map={online:t("عن بعد","Online"),student_home:t("في منزل الطالب","At the student's home"),
      teacher_location:t("في مقر المعلم","At the teacher's place")};
    return map[mode]||mode||"—"}
  var AC_TEACHER_FORM_IDS=["ac-t-name","ac-t-name-en","ac-t-email","ac-t-phone","ac-t-whatsapp","ac-t-address",
    "ac-t-headline","ac-t-exp","ac-t-gender","ac-t-skills","ac-t-bio","ac-t-avatar","ac-t-password"];
  function acTeacherVal(f,id,fallback){
    if(f.draft[id]!=null)return f.draft[id];
    return fallback==null?"":String(fallback)}
  function acTeacherDraft(){var f=ac.teacherForm;if(!f)return;
    AC_TEACHER_FORM_IDS.forEach(function(id){var el=document.getElementById(id);if(el)f.draft[id]=el.value});
    acTeacherSubjectSync();acTeacherQualSync();acTeacherAvailSync()}
  window.acTeacherModesChanged=function(){acTeacherDraft();render()};
  window.acTeacherAvailAdd=function(){var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();f.avails.push({dayOfWeek:0,startTime:"08:00",endTime:"12:00",locationMode:"online"});render()};
  window.acTeacherAvailRemove=function(index){var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();f.avails.splice(index,1);render()};
  window.acTeacherAvailSync=acTeacherAvailSync;
  function acTeacherAvailSync(){var f=ac.teacherForm;if(!f)return;
    f.avails.forEach(function(s,i){
      ["day","start","end","mode"].forEach(function(k){
        var el=document.getElementById("ac-t-av-"+i+"-"+k);if(!el)return;
        if(k==="day")s.dayOfWeek=Number(el.value);
        else if(k==="start")s.startTime=el.value;
        else if(k==="end")s.endTime=el.value;
        else s.locationMode=el.value})})}

  function adminTeacherForm(){
    var f=ac.teacherForm;if(!f)return "";
    var cat=teacherCatalog();
    if(!cat)return '<section class="panel ac-form-panel">'+state("teacherCatalog")+'</section>';
    acTeacherDraft();
    var row=f.row||{};
    function val(id,fallback){return acTeacherVal(f,id,fallback)}
    var isAdd=f.mode==="add";
    // The selected country drives the governorate list; the draft value wins so
    // the choice survives every re-render of the dynamic rows.
    var countryOptions="";
    var countryId=f.countryId||(row.countryId?String(row.countryId):"");
    cat.countries.forEach(function(c){
      if(!countryId&&f.countryCode&&c.code===f.countryCode)countryId=c.id});
    if(!countryId&&cat.countries.length)countryId=String(cat.countries[0].id);
    cat.countries.forEach(function(c){countryOptions+=wOpt(String(c.id),c.name,countryId)});

    var subjectRows=f.subjects.map(function(s,i){
      return '<div class="ac-repeat-row">'+
        '<div class="form-group"><label>'+t("المادة","Subject")+'</label><select id="ac-t-sub-'+i+'-subject">'+acTeacherSubjectOptions(s.subjectId)+'</select></div>'+
        '<div class="form-group"><label>'+t("السعر","Price")+'</label><input id="ac-t-sub-'+i+'-amount" type="number" min="0" step="0.01" value="'+esc(s.amount)+'" placeholder="0.00"></div>'+
        '<div class="form-group"><label>'+t("العملة","Currency")+'</label><select id="ac-t-sub-'+i+'-currency">'+
          TEACHER_CURRENCIES.map(function(c){return wOpt(c,teacherCurrencyLabel(c),s.currency)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("الدورية","Billing")+'</label><select id="ac-t-sub-'+i+'-period">'+
          TEACHER_PERIODS.map(function(p){return wOpt(p,teacherPeriodLabel(p),s.billingPeriod)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("لغة التدريس","Teaching language")+'</label><select id="ac-t-sub-'+i+'-lang">'+
          TEACHER_LANGUAGES.map(function(l){return wOpt(l,teacherLangLabel(l),s.languageCode)}).join("")+'</select></div>'+
        '<button type="button" class="crud delete" title="'+t("حذف المادة","Remove subject")+'" onclick="acTeacherSubjectRemove('+i+')">'+icon("trash",14)+'</button>'+
        '</div>'}).join("");

    var availRows=f.avails.map(function(s,i){
      return '<div class="ac-repeat-row">'+
        '<div class="form-group"><label>'+t("اليوم","Day")+'</label><select id="ac-t-av-'+i+'-day">'+
          [0,1,2,3,4,5,6].map(function(d){return wOpt(String(d),acTeacherDayLabel(d),String(s.dayOfWeek))}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("من","From")+'</label><input id="ac-t-av-'+i+'-start" type="time" value="'+esc(s.startTime)+'"></div>'+
        '<div class="form-group"><label>'+t("إلى","To")+'</label><input id="ac-t-av-'+i+'-end" type="time" value="'+esc(s.endTime)+'"></div>'+
        '<div class="form-group"><label>'+t("المكان","Place")+'</label><select id="ac-t-av-'+i+'-mode">'+
          (cat.availabilityModes||["online","student_home","teacher_location"]).map(function(m){return wOpt(m,acTeacherSlotModeLabel(m),s.locationMode)}).join("")+'</select></div>'+
        '<button type="button" class="crud delete" title="'+t("حذف الوقت","Remove slot")+'" onclick="acTeacherAvailRemove('+i+')">'+icon("trash",14)+'</button>'+
        '</div>'}).join("");

    var qualRows=f.quals.map(function(q,i){
      return '<div class="ac-repeat-row">'+
        '<div class="form-group"><label>'+t("المؤهل","Qualification")+'</label><input id="ac-t-qual-'+i+'-title" value="'+esc(q.title)+'" placeholder="'+t("مثال: بكالوريوس فيزياء","e.g. BSc Physics")+'"></div>'+
        '<div class="form-group"><label>'+t("الجهة","Institution")+'</label><input id="ac-t-qual-'+i+'-institutionName" value="'+esc(q.institutionName)+'"></div>'+
        '<div class="form-group"><label>'+t("الدرجة","Degree")+'</label><input id="ac-t-qual-'+i+'-degree" value="'+esc(q.degree)+'"></div>'+
        '<div class="form-group"><label>'+t("السنة","Year")+'</label><input id="ac-t-qual-'+i+'-year" type="number" min="1950" max="2100" value="'+esc(q.year)+'"></div>'+
        '<button type="button" class="crud delete" title="'+t("حذف المؤهل","Remove qualification")+'" onclick="acTeacherQualRemove('+i+')">'+icon("trash",14)+'</button>'+
        '</div>'}).join("");

    var stageChips=cat.stages.map(function(st){
      var on=f.stages.indexOf(String(st.id))>-1;
      return '<button type="button" class="core-chip'+(on?"":" off")+'" onclick="acTeacherStageToggle(\''+st.id+'\')">'+
        (on?icon("check",12):icon("plus",12))+' '+esc(st.name)+'</button>'}).join("");

    var live=function(id){var el=document.getElementById(id);return el?el.checked:null};
    var modesNow=teacherModes({
      offersOnline:live("ac-t-online")===null?(isAdd?true:Boolean(row.offersOnline)):live("ac-t-online"),
      travelsToStudentHome:live("ac-t-travel")===null?Boolean(row.travelsToStudentHome):live("ac-t-travel"),
      acceptsStudentHome:live("ac-t-home")===null?Boolean(row.acceptsStudentHome):live("ac-t-home")});

    var curStatus=val("ac-t-status",row.status||"active");
    var curVerif=val("ac-t-verif",row.verificationStatus||"pending");

    return '<section class="panel ac-form-panel">'+formError(f)+
      '<div class="panel-title"><h2>'+(isAdd?t("إضافة معلم","Add teacher"):t("تعديل بيانات المعلم","Edit teacher"))+
      '</h2><button class="btn" onclick="acTeacherFormClose()">'+t("إغلاق","Close")+'</button></div>'+
      '<div class="ac-form-grid">'+
        wInput(t("الاسم الكامل (عربي) *","Full name (Arabic) *"),"ac-t-name",val("ac-t-name",row.userName),t("مثال: عبدالله الشامي","e.g. Abdullah Al-Shami"))+
        wInput(t("الاسم بالإنجليزية","Name in English"),"ac-t-name-en",val("ac-t-name-en",row.nameEn),"Abdullah Al-Shami")+
        wInput(t("البريد الإلكتروني *","Email *"),"ac-t-email",val("ac-t-email",row.userEmail),"teacher@example.com")+
        (isAdd?
          '<div class="form-group"><label>'+t("كلمة المرور *","Password *")+'</label><div class="ac-pass-wrap">'+
          '<input id="ac-t-password" type="'+(f.showPass?"text":"password")+'" value="'+esc(val("ac-t-password",""))+'" placeholder="'+t("8 أحرف مع حرف كبير ورمز","8+ chars, one capital, one symbol")+'">'+
          '<button type="button" class="btn ac-pass-toggle" onclick="acTeacherPassToggle()">'+icon("eye",14)+
          '<span>'+t(f.showPass?"إخفاء":"إظهار",f.showPass?"Hide":"Show")+'</span></button></div>'+
          '<p class="ac-hint">'+t("تُشفَّر كلمة المرور bcrypt على الخادم ولا تُحفظ كنص.","The password is bcrypt-hashed on the server and never stored as text.")+'</p></div>':
          wInput(t("كلمة المرور","Password"),"ac-t-password-hidden","",t("لا تُعدّل من هنا — تُدار من حساب المستخدم","Not edited here — it lives on the user account)")))+
        '<div class="form-group"><label>'+t("الهاتف","Phone")+'</label><input id="ac-t-phone" dir="ltr" value="'+esc(val("ac-t-phone",row.userPhone||row.phone))+'" placeholder="+967 7XX XXX XXX"></div>'+
        '<div class="form-group"><label>'+t("واتساب","WhatsApp")+'</label><input id="ac-t-whatsapp" dir="ltr" value="'+esc(val("ac-t-whatsapp",row.whatsapp))+'" placeholder="+967 7XX XXX XXX">'+
        '<p class="ac-hint">'+t("يُترك فارغاً لاستخدام رقم الهاتف نفسه.","Leave empty to use the phone number.")+'</p></div>'+
        wSel(t("البلد","Country"),"ac-t-country",countryOptions,"","acTeacherCountry()")+
        wSel(t("المحافظة","Governorate"),"ac-t-gov",teacherGovOptions(f.countryCode,f.govId),"","acTeacherGov()")+
        wSel(t("المديرية","District"),"ac-t-dist",teacherDistrictOptions(f.govId,f.distId),"","acTeacherDistrict()")+
        wSel(t("الحي","Neighbourhood"),"ac-t-hood",teacherHoodOptions(f.distId,f.hoodId),"","acTeacherNeighborhood()")+
        wInput(t("العنوان التفصيلي","Street address"),"ac-t-address",val("ac-t-address",row.addressLine),t("الشارع / أقرب معلم","Street / nearest landmark"),true)+
        wInput(t("العنوان المهني","Professional headline"),"ac-t-headline",val("ac-t-headline",row.headline),t("مثال: معلم رياضيات خبرة 10 سنوات","e.g. Math teacher, 10 years experience"),true)+
        wInput(t("سنوات الخبرة","Years of experience"),"ac-t-exp",val("ac-t-exp",row.experienceYears),t("السنوات","years"))+
        '<div class="form-group"><label>'+t("الجنس","Gender")+'</label><select id="ac-t-gender">'+
          wOpt("",t("غير محدد","Unspecified"),val("ac-t-gender",row.gender))+
          wOpt("male",t("ذكر","Male"),val("ac-t-gender",row.gender))+
          wOpt("female",t("أنثى","Female"),val("ac-t-gender",row.gender))+'</select></div>'+
        wInput(t("المهارات (مفصولة بفاصلة)","Skills (comma separated)"),"ac-t-skills",val("ac-t-skills",(row.skills||[]).join(", ")),t("برمجة, روبوتيكس, مختبرات","Programming, robotics, labs"),true)+
        wInput(t("رابط الصورة الرمزية","Avatar URL"),"ac-t-avatar",val("ac-t-avatar",row.avatarUrl),"/uploads/avatars/teacher.png",true)+
        wArea(t("نبذة","Bio"),"ac-t-bio",val("ac-t-bio",row.bio))+
        '<div class="form-group ac-field-wide"><label>'+t("طرق التدريس","Teaching modes")+'</label>'+
          '<div class="ac-checkgrid">'+
          wCheck(t("دروس عن بعد","Online lessons"),"ac-t-online",f.draft["ac-t-online"]!=null?f.draft["ac-t-online"]:(isAdd?true:Boolean(row.offersOnline)))+
          wCheck(t("الانتقال إلى منزل الطالب","Travels to the student\'s home"),"ac-t-travel",f.draft["ac-t-travel"]!=null?f.draft["ac-t-travel"]:Boolean(row.travelsToStudentHome))+
          wCheck(t("استقبال الطلاب في مقر المعلم","Receives students at their own place"),"ac-t-home",f.draft["ac-t-home"]!=null?f.draft["ac-t-home"]:Boolean(row.acceptsStudentHome))+
          '</div><div class="core-chips ac-mode-summary">'+
          (modesNow.length?'<span class="core-chip"><b>'+esc(modesNow.join(" / "))+'</b></span>':
            '<span class="gated-value">'+t("اختر طريقة تدريس واحدة على الأقل.","Select at least one teaching mode.")+'</span>')+
          '</div></div>'+
        '<div class="form-group ac-field-wide"><label>'+t("المستويات الدراسية","Academic stages")+'</label>'+
          '<div class="core-chips">'+(stageChips||'<span class="gated-value">'+t("لا مراحل في الكتالوج العام.","No stages in the global catalog.")+'</span>')+'</div></div>'+
        (isAdd?"":wSel(t("الحالة","Status"),"ac-t-status",
          wOpt("active",t("نشط","Active"),curStatus)+wOpt("inactive",t("غير نشط","Inactive"),curStatus)+
          wOpt("suspended",t("موقوف","Suspended"),curStatus)))+
        (isAdd?"":wSel(t("التحقق","Verification"),"ac-t-verif",
          wOpt("pending",t("بانتظار التحقق","Pending"),curVerif)+wOpt("verified",t("موثق","Verified"),curVerif)+
          wOpt("rejected",t("مرفوض","Rejected"),curVerif)))+
      '</div>'+
      '<div class="core-h3-row"><h3 class="core-h3">'+t("المواد الدراسية والأسعار","Subjects and pricing")+'</h3>'+
        '<div class="ac-row-actions"><button type="button" class="mini-plus" title="'+
        t("إضافة مادة غير موجودة في الكتالوج العام","Propose a subject missing from the global catalog")+'" '+
        (f._busy?"disabled":"")+' onclick="acTeacherNewSubject()">'+icon("plus",15)+'</button>'+
        '<button type="button" class="btn" onclick="acTeacherSubjectAdd()">'+icon("plus",14)+' '+t("إضافة مادة","Add subject")+'</button></div></div>'+
      (subjectRows||'<div class="empty-state">'+t("لم تُضف مواد بعد. لكل مادة سعرها وعملتها ودوريتها ولغتها.","No subjects yet. Each subject carries its own price, currency, billing period and language.")+'</div>')+
      '<div class="core-h3-row"><h3 class="core-h3">'+t("أوقات التوفر","Weekly availability")+'</h3>'+
        '<button type="button" class="btn" onclick="acTeacherAvailAdd()">'+icon("plus",14)+' '+t("إضافة وقت","Add slot")+'</button></div>'+
      (availRows||'<div class="empty-state">'+t("لم تُضف أوقات توفر بعد.","No availability added yet.")+'</div>')+
      '<div class="core-h3-row"><h3 class="core-h3">'+t("المؤهلات والخبرات","Qualifications and experience")+'</h3>'+
        '<button type="button" class="btn" onclick="acTeacherQualAdd()">'+icon("plus",14)+' '+t("إضافة مؤهل","Add qualification")+'</button></div>'+
      (qualRows||'<div class="empty-state">'+t("لم تُضف مؤهلات بعد.","No qualifications added yet.")+'</div>')+
      '<div class="ac-form-actions"><button class="btn green" '+(f._busy?"disabled":"")+' onclick="acTeacherSave()">'+
      (f._busy?t("جاري الحفظ...","Saving..."):t("حفظ","Save"))+'</button>'+
      '<button class="btn" onclick="acTeacherFormClose()">'+t("إلغاء","Cancel")+'</button></div></section>'
  }
  // ---- detail ----
  function teacherBadgeRow(r){
    var out=badge(r.verificationStatus||"pending")+badge(r.status);
    if(r.isProtected)out+='<span class="badge">'+t("حساب محمي","protected account")+'</span>';
    if(r.deletionRequestId)out+='<span class="badge bad">'+t("طلب حذف مفتوح","open deletion request")+'</span>';
    return out}
  function teacherContactRows(r){
    var rows="";
    rows+='<div class="core-row"><span>'+t("الهاتف","Phone")+'</span><b class="ltr-num" dir="ltr">'+esc(r.userPhone||r.phone||"—")+'</b></div>';
    rows+='<div class="core-row"><span>'+t("واتساب","WhatsApp")+'</span><b class="ltr-num" dir="ltr">'+esc(r.whatsapp||r.userPhone||r.phone||"—")+'</b></div>';
    rows+='<div class="core-row"><span>'+t("البريد الإلكتروني","Email")+'</span><b class="ltr-num" dir="ltr">'+esc(r.userEmail||"—")+'</b></div>';
    return rows}
  function teacherLocationRows(r){
    var rows="";
    [["country",t("البلد","Country"),r.countryName],["governorate",t("المحافظة","Governorate"),r.governorateName],
     ["district",t("المديرية","District"),r.districtName],["hood",t("الحي","Neighbourhood"),r.neighborhoodName],
     ["address",t("العنوان التفصيلي","Street address"),r.addressLine]].forEach(function(x){
      rows+='<div class="core-row"><span>'+x[1]+'</span><b>'+esc(x[2]||"—")+'</b></div>'});
    return rows}

  function adminTeacherDetail(d){
    var r=d.row||{};
    var tabs=[["profile",t("الملف والتواصل","Profile and contact")],["subjects",t("المواد والأسعار","Subjects and pricing")],
      ["documents",t("الوثائق والشهادات","Documents")],["lifecycle",t("الحالة والحذف","Status and deletion")]];
    var docs=d.docs||[];
    var body='<div class="ac-teacher-detail"><section class="core-hero"><div class="core-hero-top">'+
      '<button class="core-action" onclick="acTeacherDetailClose()">'+icon("back",15)+' <span>'+t("رجوع إلى القائمة","Back to the list")+'</span></button>'+
      '<div class="core-hero-badges">'+teacherBadgeRow(r)+'</div>'+
      '<div class="core-hero-actions">'+
        '<button class="core-action" onclick="acTeacherEdit(\''+r.id+'\')">'+icon("edit",15)+' <span>'+t("تعديل","Edit")+'</span></button>'+
        '<button class="core-action" onclick="acTeacherPublish(\''+r.id+'\',\''+(r.verificationStatus==="verified"?"pending":"verified")+'\')">'+
          icon("shield",15)+' <span>'+(r.verificationStatus==="verified"?t("إلغاء التوثيق","Unverify"):t("توثيق","Verify"))+'</span></button>'+
        '<button class="core-action" onclick="printTeacher()">'+icon("printer",15)+' <span>'+t("طباعة","Print")+'</span></button>'+
        '<div class="export-group">'+icon("download",15)+
          '<button class="core-action" onclick="exportTeacher(\'xlsx\')" title="'+t("Excel (.xlsx)","Excel (.xlsx)")+'">Excel</button>'+
          '<button class="core-action" onclick="exportTeacher(\'pdf\')" title="'+t("PDF","PDF")+'">PDF</button>'+
          '<button class="core-action" onclick="exportTeacher(\'docx\')" title="'+t("Word (.docx)","Word (.docx)")+'">Word</button>'+
        '</div>'+
      '</div></div>'+
      '<div class="core-hero-main"><div class="core-logo">'+teacherAvatar(r)+'</div>'+
      '<div class="core-hero-copy"><h2>'+esc(teacherName(r))+'</h2>'+
      '<div class="core-sub">'+esc(r.headline||t("معلم مستقل","Freelance teacher"))+'</div>'+
      '<div class="core-chips">'+
        '<span class="core-chip">'+icon("pin",12)+' '+esc(teacherPlace(r)||"—")+'</span>'+
        (r.experienceYears!=null?'<span class="core-chip">'+icon("chart",12)+' '+esc(r.experienceYears)+' '+t("سنوات خبرة","years")+'</span>':"")+
        teacherModes(r).map(function(m){return '<span class="core-chip">'+icon("globe",12)+' '+esc(m)+'</span>'}).join("")+
        '<span class="core-chip">'+icon("tag",12)+' '+esc(String((r.subjects||[]).length))+' '+t("مادة","subjects")+'</span>'+
      '</div>'+
      (r.bio?'<p>'+esc(r.bio)+'</p>':"")+
      '<div class="core-hero-actions">'+
        (teacherContact(r)?waButton(teacherContact(r),{size:15,label:t("محادثة واتساب","WhatsApp chat")}):"")+
        (r.userPhone||r.phone?'<a class="core-action" dir="ltr" href="tel:'+esc(String(r.userPhone||r.phone).replace(/[^\d+]/g,""))+'">'+icon("phone",15)+' <span>'+esc(r.userPhone||r.phone)+'</span></a>':"")+
        '<a class="core-action" href="'+esc(teacherMapsUrl(r))+'" target="_blank" rel="noopener noreferrer">'+icon("map",15)+' <span>'+t("فتح الموقع على الخريطة","Open location on the map")+'</span></a>'+
        (r.userEmail?'<a class="core-action" dir="ltr" href="mailto:'+esc(r.userEmail)+'">'+icon("mail",15)+' <span>'+esc(r.userEmail)+'</span></a>':"")+
      '</div></div></div></section>';

    body+='<div class="ac-tabs">'+tabs.map(function(x){
      return '<button class="'+(d.tab===x[0]?"active":"")+'" onclick="acTeacherDetailTab(\''+x[0]+'\')">'+x[1]+'</button>'}).join("")+'</div>';

    if(d.tab==="profile"){
      var qualRows=(r.qualifications||[]).map(function(q){
        return '<div class="core-row"><span>'+esc(q.year||"—")+'</span><b>'+esc([q.title,q.institutionName,q.degree].filter(Boolean).join(" · "))+'</b></div>'}).join("");
      var slots=(r.availability||[]).map(function(s){
        return '<div class="core-row"><span>'+esc(acTeacherDayLabel(s.dayOfWeek))+' · '+esc(acTeacherSlotModeLabel(s.locationMode))+'</span>'+
          '<b class="ltr-num" dir="ltr">'+esc(s.startTime)+' – '+esc(s.endTime)+'</b></div>'}).join("");
      body+='<div class="core-grid">'+
        '<div class="panel core-panel"><div class="panel-title"><h3>'+t("بيانات الاتصال","Contact")+'</h3></div>'+
          '<div class="core-rows">'+teacherContactRows(r)+'</div>'+
          '<div class="core-map">'+(teacherContact(r)?waButton(teacherContact(r),{size:15,label:t("مراسلة واتساب","Message on WhatsApp")}):"")+'</div></div>'+
        '<div class="panel core-panel"><div class="panel-title"><h3>'+t("الموقع الجغرافي","Location")+'</h3></div>'+
          '<div class="core-rows">'+teacherLocationRows(r)+'</div>'+
          '<div class="core-map"><a class="core-action" target="_blank" rel="noopener noreferrer" href="'+esc(teacherMapsUrl(r))+'">'+
          icon("map",15)+' <span>'+t("فتح على خرائط جوجل","Open in Google Maps")+'</span></a></div></div>'+
        '<div class="panel core-panel"><div class="panel-title"><h3>'+t("طرق التدريس والمستويات","Teaching modes and stages")+'</h3></div>'+
          '<div class="core-rows">'+
            '<div class="core-row"><span>'+t("طرق التدريس","Teaching modes")+'</span><b>'+esc(teacherModes(r).join(" / ")||"—")+'</b></div>'+
            '<div class="core-row"><span>'+t("عن بعد","Online lessons")+'</span><b>'+t(r.offersOnline?"نعم":"لا",r.offersOnline?"Yes":"No")+'</b></div>'+
            '<div class="core-row"><span>'+t("الانتقال إلى الطالب","Travels to the student")+'</span><b>'+t(r.travelsToStudentHome?"نعم":"لا",r.travelsToStudentHome?"Yes":"No")+'</b></div>'+
            '<div class="core-row"><span>'+t("استقبال الطلاب","Receives students")+'</span><b>'+t(r.acceptsStudentHome?"نعم":"لا",r.acceptsStudentHome?"Yes":"No")+'</b></div>'+
            '<div class="core-row"><span>'+t("سنوات الخبرة","Years of experience")+'</span><b>'+esc(r.experienceYears==null?"—":r.experienceYears)+'</b></div>'+
          '</div><div class="core-chips">'+((r.stages||[]).map(function(s){return '<span class="core-chip">'+esc(s.name)+'</span>'}).join("")||
            '<span class="gated-value">'+t("لا مستويات محددة","No stages declared")+'</span>')+'</div></div>'+
        '<div class="panel core-panel"><div class="panel-title"><h3>'+t("المهارات","Skills")+'</h3></div>'+
          '<div class="core-chips">'+((r.skills||[]).map(function(s){return '<span class="core-chip">'+esc(s)+'</span>'}).join("")||
            '<span class="gated-value">'+t("لا مهارات مسجلة","No skills recorded")+'</span>')+'</div></div>'+
      '</div>'+
      '<div class="panel core-panel"><div class="panel-title"><h3>'+t("أوقات التوفر","Weekly availability")+'</h3></div>'+
        (slots?('<div class="core-rows">'+slots+'</div>'):'<div class="empty-state">'+t("لم تُسجّل أوقات توفر.","No availability recorded.")+'</div>')+'</div>'+
      '<div class="panel core-panel"><div class="panel-title"><h3>'+t("المؤهلات والخبرات","Qualifications and experience")+'</h3></div>'+
        (qualRows?('<div class="core-rows">'+qualRows+'</div>'):'<div class="empty-state">'+t("لم تُسجّل مؤهلات.","No qualifications recorded.")+'</div>')+'</div>';
    }

    if(d.tab==="subjects"){
      var rows=(r.subjects||[]).map(function(s){
        return '<tr><td><b>'+esc(s.name)+'</td>'+
          '<td dir="ltr" class="ltr-num">'+esc(s.amount==null?"—":s.amount)+'</td>'+
          '<td>'+esc(s.currency||"—")+'</td>'+
          '<td>'+esc(teacherPeriodLabel(s.billingPeriod))+'</td>'+
          '<td>'+esc(teacherLangLabel(s.languageCode))+'</td>'+
          '<td>'+(s.isActive===false?badge("inactive"):badge("active"))+'</td></tr>'}).join("");
      body+='<div class="panel core-panel"><div class="panel-title"><h3>'+t("المواد الدراسية والأسعار","Subjects and pricing")+'</h3>'+
        '<button class="btn green" onclick="acTeacherEdit(\''+r.id+'\')">'+icon("edit",14)+' '+t("تعديل الأسعار","Edit prices")+'</button></div>'+
        '<p class="ac-hint">'+t("كل مادة يحملها المعلم لها سعرها وعملتها ودوريتها ولغتها الخاصة — الرسوم ليست على مستوى المنصة.",
          "Every subject a teacher carries has its own price, currency, billing period and language — nothing is priced at platform level.")+'</p>'+
        '<div class="table-wrap"><table class="tbl"><thead><tr>'+
        ['المادة','السعر','العملة','الدورية','لغة التدريس','الحالة'].map(function(h){return '<th>'+t(h,h)+'</th>'}).join("")+
        '</tr></thead><tbody>'+(rows||'<tr><td colspan="6">'+t("لا مواد مسجلة.","No subjects recorded.")+'</td></tr>')+'</tbody></table></div></div>';
    }

    if(d.tab==="documents"){
      var docRows=docs.map(function(doc){
        return '<tr><td><a href="/api/teachers/documents/'+esc(doc.id)+'/file" target="_blank" rel="noopener noreferrer" class="ltr-num" dir="ltr">'+icon("file",13)+' '+esc(doc.fileName)+'</a></td>'+
          '<td>'+esc(teacherDocLabel(doc.docType))+'</td>'+
          '<td>'+esc(doc.mimeType||"—")+'</td>'+
          '<td>'+badge(doc.status||"pending")+'</td>'+
          '<td class="crud-actions">'+
            '<button class="crud edit" title="'+t("اعتماد","Approve")+'" onclick="acTeacherDocReview(\''+doc.id+'\',\'approved\')">'+icon("check",14)+'</button>'+
            '<button class="crud" title="'+t("رفض","Reject")+'" onclick="acTeacherDocReview(\''+doc.id+'\',\'rejected\')">'+icon("x",14)+'</button>'+
            '<button class="crud delete" title="'+t("حذف","Delete")+'" onclick="acTeacherDocDelete(\''+doc.id+'\')">'+icon("trash",14)+'</button>'+
          '</td></tr>'}).join("");
      var docTypes=(teacherCatalog()||{}).docTypes||["degree","experience","identity","certificate","other"];
      body+='<div class="panel core-panel"><div class="panel-title"><h3>'+t("الوثائق والشهادات","Documents and certificates")+'</h3></div>'+
        '<div class="ac-form"><div class="ac-form-grid">'+
        wSel(t("نوع المستند","Document type"),"ac-t-doc-type",docTypes.map(function(x){return wOpt(x,teacherDocLabel(x),"degree")}).join(""))+
        '<div class="form-group"><label>'+t("الملف (PDF أو صورة، 10 ميجابايت كحد أقصى)","File (PDF or image, up to 10 MB)")+'</label>'+
        '<input id="ac-t-doc-file" type="file" accept="'+esc(TEACHER_DOC_ACCEPT)+'"></div></div>'+
        '<div class="ac-form-actions"><button class="btn green" id="ac-t-doc-btn" onclick="acTeacherDocUpload(\''+r.id+'\')">'+
        icon("download",14)+' '+t("رفع المستند","Upload document")+'</button></div></div>'+
        '<div class="table-wrap"><table class="tbl"><thead><tr>'+
        ['الملف','النوع','الصيغة','الحالة','إجراءات'].map(function(h){return '<th>'+t(h,h)+'</th>'}).join("")+
        '</tr></thead><tbody>'+(docRows||'<tr><td colspan="5">'+t("لا وثائق مرفوعة.","No documents uploaded.")+'</td></tr>')+'</tbody></table></div></div>';
    }

    if(d.tab==="lifecycle"){
      body+='<div class="core-grid">'+
        '<div class="panel core-panel"><div class="panel-title"><h3>'+t("حالة الحساب","Account lifecycle")+'</h3></div>'+
          '<div class="core-rows">'+
          '<div class="core-row"><span>'+t("الحالة","Status")+'</span><b>'+badge(r.status)+'</b></div>'+
          '<div class="core-row"><span>'+t("التحقق","Verification")+'</span><b>'+badge(r.verificationStatus||"pending")+'</b></div>'+
          '<div class="core-row"><span>'+t("عدد الوثائق","Documents")+'</span><b>'+esc(String(r.documentCount||docs.length||0))+'</b></div>'+
          '<div class="core-row"><span>'+t("حساب محمي","Protected account")+'</span><b>'+t(r.isProtected?"نعم":"لا",r.isProtected?"Yes":"No")+'</b></div>'+
          '<div class="core-row"><span>'+t("أنشئ في","Created")+'</span><b>'+esc(fmt(r.createdAt))+'</b></div>'+
          '</div>'+
          '<div class="core-row-actions">'+
            (r.status==="suspended"
              ?'<button class="btn green" onclick="acTeacherStatus(\''+r.id+'\',\'active\')">'+icon("check",14)+' '+t("إعادة التفعيل","Reactivate")+'</button>'
              :'<button class="btn" onclick="acTeacherStatus(\''+r.id+'\',\'suspended\')">'+icon("x",14)+' '+t("إيقاف","Suspend")+'</button>')+
            '<button class="btn" onclick="acTeacherPublish(\''+r.id+'\',\''+(r.verificationStatus==="verified"?"pending":"verified")+'\')">'+
              icon("shield",14)+' '+(r.verificationStatus==="verified"?t("إلغاء التوثيق","Unverify"):t("توثيق المعلم","Verify teacher"))+'</button>'+
          '</div></div>'+
        '<div class="panel core-panel"><div class="panel-title"><h3>'+t("طلب الحذف","Deletion request")+'</h3></div>'+
          '<p class="ac-hint">'+t("لا يُحذف معلم بنقرة واحدة: يُسجَّل طلب بسبب مكتوب ثم يعتمده قسم التحقق والمراجعة.",
            "A teacher is never deleted with one click: a written reason is recorded and verification and review approves it.")+'</p>'+
          (r.deletionRequestId
            ?'<div class="core-chips"><span class="core-chip"><b>'+t("طلب حذف مفتوح","Open deletion request")+'</b></span></div>'+
             '<div class="core-row-actions">'+
             '<button class="btn green" onclick="acTeacherDeletionDecision(\''+r.deletionRequestId+'\',\'approve\')">'+icon("check",14)+' '+t("اعتماد الحذف","Approve deletion")+'</button>'+
             '<button class="btn" onclick="acTeacherDeletionDecision(\''+r.deletionRequestId+'\',\'reject\')">'+icon("x",14)+' '+t("رفض الطلب","Reject request")+'</button></div>'
            :(r.isProtected
              ?'<div class="gated-note">'+icon("shield",14)+' '+t("حساب محمي — لا يمكن طلب حذفه.","Protected account — it cannot be deletion-requested.")+'</div>'
              :'<div class="core-row-actions"><button class="btn" onclick="acTeacherDeleteRequest(\''+r.id+'\')">'+icon("trash",14)+' '+t("طلب حذف المعلم","Request teacher deletion")+'</button></div>'))+
        '</div></div>';
    }
    return body+'</div>'}

  // ---- reports: print, Excel, Word, PDF ----
  function teacherReportData(){
    var d=ac.teacherDetail;if(!d||!d.row)return null;
    var r=d.row,docs=d.docs||[];
    var L=[t("الاسم","Name"),teacherName(r)];
    var profile=[[t("الحقل","Field"),t("القيمة","Value")],L,
      [t("الاسم بالإنجليزية","Name in English"),r.nameEn||"—"],
      [t("البريد الإلكتروني","Email"),r.userEmail||"—"],
      [t("الهاتف","Phone"),r.userPhone||r.phone||"—"],
      [t("واتساب","WhatsApp"),r.whatsapp||r.userPhone||r.phone||"—"],
      [t("البلد","Country"),r.countryName||"—"],
      [t("المحافظة","Governorate"),r.governorateName||"—"],
      [t("المديرية","District"),r.districtName||"—"],
      [t("الحي","Neighbourhood"),r.neighborhoodName||"—"],
      [t("العنوان","Address"),r.addressLine||"—"],
      [t("طرق التدريس","Teaching modes"),teacherModes(r).join(" / ")||"—"],
      [t("سنوات الخبرة","Years of experience"),r.experienceYears==null?"—":String(r.experienceYears)],
      [t("المستويات","Stages"),(r.stages||[]).map(function(s){return s.name}).join(", ")||"—"],
      [t("المهارات","Skills"),(r.skills||[]).join(", ")||"—"],
      [t("الحالة","Status"),statusLabel(r.status)],
      [t("التحقق","Verification"),statusLabel(r.verificationStatus||"pending")]];
    var subjectSheet=[[t("المادة","Subject"),t("السعر","Price"),t("العملة","Currency"),t("الدورية","Billing"),t("لغة التدريس","Language")]]
      .concat((r.subjects||[]).map(function(s){return[s.name,s.amount==null?"":s.amount,s.currency||"",teacherPeriodLabel(s.billingPeriod),teacherLangLabel(s.languageCode)]}));
    var availSheet=[[t("اليوم","Day"),t("من","From"),t("إلى","To"),t("المكان","Place")]]
      .concat((r.availability||[]).map(function(s){return[acTeacherDayLabel(s.dayOfWeek),s.startTime,s.endTime,acTeacherSlotModeLabel(s.locationMode)]}));
    var qualSheet=[[t("المؤهل","Qualification"),t("الجهة","Institution"),t("الدرجة","Degree"),t("السنة","Year")]]
      .concat((r.qualifications||[]).map(function(q){return[q.title||"",q.institutionName||"",q.degree||"",q.year||""]}));
    var docSheet=[[t("الملف","File"),t("النوع","Type"),t("الحالة","Status")]]
      .concat(docs.map(function(doc){return[doc.fileName,teacherDocLabel(doc.docType),statusLabel(doc.status||"pending")]}));
    var blocks=[
      {type:"title",text:teacherName(r)},
      {type:"sub",text:[r.headline,teacherPlace(r)].filter(Boolean).join(" · ")},
      {type:"heading",text:t("الهوية والاتصال","Identity and contact")},
      {type:"table",rows:profile},
      {type:"heading",text:t("المواد الدراسية والأسعار","Subjects and pricing")},
      {type:"table",rows:subjectSheet},
      {type:"heading",text:t("أوقات التوفر","Weekly availability")},
      {type:"table",rows:availSheet},
      {type:"heading",text:t("المؤهلات والخبرات","Qualifications and experience")},
      {type:"table",rows:qualSheet},
      {type:"heading",text:t("الوثائق والشهادات","Documents and certificates")},
      {type:"table",rows:docSheet}];
    return {name:t("تقرير معلم","Teacher report")+" - "+teacherName(r),
      title:t("تقرير معلم","Teacher report"),
      entityName:teacherName(r),
      entityType:(r.headline||t("معلم مستقل","Freelance teacher")),
      logo:r.avatarUrl||"",
      blocks:blocks,
      sheets:[{name:t("البيانات الأساسية","Profile"),rows:profile},
              {name:t("المواد","Subjects"),rows:subjectSheet},
              {name:t("الأوقات","Availability"),rows:availSheet},
              {name:t("المؤهلات","Qualifications"),rows:qualSheet},
              {name:t("الوثائق","Documents"),rows:docSheet}]}}
  window.printTeacher=function(){
    var report=teacherReportData();if(!report)return;
    if(!window.ReportDoc){alert(t("وحدة الطباعة غير محمّلة.","The print module is not loaded."));return}
    window.ReportDoc.print(report)};
  window.exportTeacher=function(format){
    var report=teacherReportData();if(!report)return;
    if(!window.InstitutionReport){alert(t("وحدة التصدير غير محمّلة.","The export module is not loaded."));return}
    if(format==="xlsx")return window.InstitutionReport.exportXlsx(report);
    if(format==="docx")return window.InstitutionReport.exportDocx(report);
    // PDF keeps the browser's own writer: correct Arabic shaping needs an
    // embedded font, and the print-ready document is the same report.
    return printTeacher()};
  window.acTeacherPublish=function(id,verificationStatus){acTeacherVerify(id,verificationStatus)};

  // ---- the section page ----
  function teacherListUrl(){
    var p=[];
    if(ac.teacherSearch)p.push("search="+encodeURIComponent(ac.teacherSearch));
    if(ac.teacherSubject)p.push("subjectId="+encodeURIComponent(ac.teacherSubject));
    if(ac.teacherCountry)p.push("countryId="+encodeURIComponent(ac.teacherCountry));
    if(ac.teacherTab==="verified")p.push("verificationStatus=verified");
    else if(ac.teacherTab==="pending")p.push("verificationStatus=pending");
    else if(ac.teacherTab==="suspended")p.push("status=suspended");
    else if(ac.teacherTab==="deletion_requested")p.push("status=deletion_requested");
    p.push("limit=100");
    return "/api/teachers?"+p.join("&")}
  function teacherRows(){
    var data=ac.cache["teachers:"+teacherListUrl()];
    if(!data)return null;
    return listOf(data)}
  window.acTeacherTabSet=function(tab){ac.teacherTab=tab;render()};
  window.acTeacherViewSet=function(view){ac.teachersView=view;render()};
  window.acTeacherSearchSet=function(v){ac.teacherSearch=v;render()};
  window.acTeacherSubjectFilter=function(v){ac.teacherSubject=v;render()};
  window.acTeacherCountryFilter=function(){ac.teacherCountry=wVal("ac-t-filter-country");render()};

  function teacherCardList(rows){
    if(!rows.length)return '<div class="empty-state">'+t("لا معلمين مطابقين للتصفية الحالية.","No teachers match the current filter.")+'</div>';
    return '<div class="org-grid">'+rows.map(teacherCard).join("")+'</div>'}
  function teacherTable(rows){
    var head=['المعلم','الموقع','المواد والأسعار','الاتصال','الحالة','إجراءات'];
    var body=rows.map(function(r){
      return '<tr class="row-click" onclick="acTeacherDetailOpen(\''+r.id+'\')">'+
        '<td><div class="row-entity">'+teacherAvatar(r,true)+'<div><b>'+esc(teacherName(r))+'</b>'+
          '<small class="ltr-num" dir="ltr">'+esc(r.userEmail||"—")+'</small></div></div></td>'+
        '<td>'+esc(teacherPlace(r)||"—")+'</td>'+
        '<td><div class="core-chips">'+teacherSubjectChips(r,2)+'</div></td>'+
        '<td><div class="contact-cell">'+
          (r.userPhone||r.phone?'<span class="ltr-num" dir="ltr">'+icon("phone",12)+' '+esc(r.userPhone||r.phone)+'</span>':"")+
          (teacherContact(r)?'<span onclick="event.stopPropagation()">'+waButton(teacherContact(r),{compact:true,size:12,label:t("واتساب","WhatsApp")})+'</span>':"")+
        '</div></td>'+
        '<td>'+badge(r.verificationStatus||"pending")+badge(r.status)+'</td>'+
        '<td class="crud-actions" onclick="event.stopPropagation()">'+
          '<button class="crud" title="'+t("التفاصيل","Details")+'" onclick="acTeacherDetailOpen(\''+r.id+'\')">'+icon("eye",14)+'</button>'+
          '<button class="crud edit" title="'+t("تعديل","Edit")+'" onclick="acTeacherEdit(\''+r.id+'\')">'+icon("edit",14)+'</button>'+
        '</td></tr>'}).join("");
    if(!rows.length)return '<div class="empty-state">'+t("لا معلمين مطابقين للتصفية الحالية.","No teachers match the current filter.")+'</div>';
    return '<div class="table-wrap"><table class="tbl"><thead><tr>'+
      head.map(function(h){return '<th>'+t(h,h)+'</th>'}).join("")+'</tr></thead><tbody>'+body+'</tbody></table></div>'}


  function teacherDeletionQueue(){
    var data=ac.cache.teacherDeletions;
    if(!data)return state("teacherDeletions");
    var rows=listOf(data);
    if(!rows.length)return '<div class="empty-state">'+t("لا طلبات حذف معلّقة.","No pending deletion requests.")+'</div>';
    return '<div class="table-wrap"><table class="tbl"><thead><tr>'+
      [t("المعلم","Teacher"),t("السبب","Reason"),t("مقدم الطلب","Requested by"),t("التاريخ","Date"),t("الحالة","Status"),t("إجراءات","Actions")].map(function(h){
        return '<th>'+h+'</th>'}).join("")+'</tr></thead><tbody>'+
      rows.map(function(q){
        // A decided request stays in the list as an audit trail, but only a
        // pending one can be decided, so it carries no buttons.
        var pending=(q.status||"pending")==="pending";
        return '<tr><td><b>'+esc(q.teacherName||q.teacher_name||"—")+'</b></td>'+
          '<td>'+esc(q.reason||"—")+'</td>'+
          '<td>'+esc(q.requestedByName||q.requested_by_name||"—")+'</td>'+
          '<td class="ltr-num" dir="ltr">'+esc(fmt(q.createdAt))+'</td>'+
          '<td>'+badge(q.status||"pending")+(q.reviewedByName?'<div class="entity-sub">'+esc(q.reviewedByName)+'</div>':"")+'</td>'+
          '<td class="crud-actions">'+(pending?
            '<button class="crud edit" title="'+t("اعتماد الحذف","Approve")+'" onclick="acTeacherDeletionDecision(\''+q.id+'\',\'approve\')">'+icon("check",14)+'</button>'+
            '<button class="crud" title="'+t("رفض","Reject")+'" onclick="acTeacherDeletionDecision(\''+q.id+'\',\'reject\')">'+icon("x",14)+'</button>':
            '<span class="entity-sub">'+t("مُبتّ","decided")+'</span>')+
          '</td></tr>'}).join("")+'</tbody></table></div>'}

  window.adminTeachersPage=function(){
    if(ac.teacherDetail)return adminTeacherDetail(ac.teacherDetail);
    teacherLoadCatalog();
    var listUrl=teacherListUrl();
    var rows=teacherRows();
    if(rows===null)load("teachers:"+listUrl,listUrl,listOf);
    if(ac.teacherTab==="deletions")load("teacherDeletions","/api/teachers/deletion-requests",listOf);
    var cat=teacherCatalog();
    var body='<div class="panel-title"><div><h2>'+t("المعلمون","Teachers")+'</h2>'+
      '<p class="ac-hint">'+t("المعلم مستقل: له حساب دخول حقيقي، ومواد بأسعارها، ووثائقه، وموقعه. الرسوم تُحدَّد لكل مادة وليست على مستوى المنصة.",
        "A teacher is independent: a real login account, per-subject prices, their own documents and their own location. Prices sit on the subject, never on the platform.")+'</p></div>'+
      '<button class="btn green" onclick="acTeacherFormOpen(\'add\')">'+icon("plus",14)+' '+t("إضافة معلم","Add teacher")+'</button>'+
      '<div class="view-toggle">'+
        '<button class="'+(ac.teachersView==="cards"?"active":"")+'" onclick="acTeacherViewSet(\'cards\')">'+icon("grid",14)+' '+t("كروت","Cards")+'</button>'+
        '<button class="'+(ac.teachersView==="table"?"active":"")+'" onclick="acTeacherViewSet(\'table\')">'+icon("list",14)+' '+t("جدول","Table")+'</button>'+
      '</div></div>';
    body+=adminTeacherForm();
    body+='<div class="ac-tabs">'+TEACHER_TABS.map(function(x){
      return '<button class="'+(ac.teacherTab===x[0]?"active":"")+'" onclick="acTeacherTabSet(\''+x[0]+'\')">'+t(x[1],x[2])+'</button>'}).join("")+'</div>';
    body+='<div class="ac-filter-bar">'+
      '<div class="form-group"><label>'+t("بحث","Search")+'</label><input id="ac-t-filter-search" value="'+esc(ac.teacherSearch)+
      '" placeholder="'+t("اسم أو بريد أو هاتف","Name, email or phone")+'" oninput="acTeacherSearchSet(this.value)"></div>'+
      '<div class="form-group"><label>'+t("المادة","Subject")+'</label><select onchange="acTeacherSubjectFilter(this.value)">'+
        wOpt("",t("كل المواد","All subjects"),ac.teacherSubject)+
        ((cat||{}).subjects||[]).map(function(s){return wOpt(String(s.id),s.name,ac.teacherSubject)}).join("")+'</select></div>'+
      '<div class="form-group"><label>'+t("البلد","Country")+'</label><select id="ac-t-filter-country" onchange="acTeacherCountryFilter()">'+
        wOpt("",t("كل البلدان","All countries"),ac.teacherCountry)+
        ((cat||{}).countries||[]).map(function(c){return wOpt(String(c.id),c.name,ac.teacherCountry)}).join("")+'</select></div>'+
      '</div>';
    if(ac.teacherTab==="deletions")body+=teacherDeletionQueue();
    else if(rows===null)body+=state("teachers:"+listUrl);
    else body+=(ac.teachersView==="table"?teacherTable(rows):teacherCardList(rows));
    return adminShell(body)};

  // ---- teacher card ----
  function teacherCard(r){
    var place=teacherPlace(r);
    var contact=teacherContact(r);
    return '<article class="org-card teacher-card" onclick="acTeacherDetailOpen(\''+r.id+'\')">'+
      '<div class="org-card-head"><div class="org-card-logo">'+teacherAvatar(r,true)+'</div>'+
      '<div class="org-card-id"><h3>'+esc(teacherName(r))+'</h3>'+
      '<div class="entity-sub">'+esc(r.headline||t("معلم مستقل","Freelance teacher"))+'</div>'+
      '<div class="org-card-badges">'+teacherBadgeRow(r)+'</div></div></div>'+
      '<div class="org-card-meta">'+
        '<div class="org-card-line">'+icon("pin",13)+'<span>'+esc(place||"—")+'</span></div>'+
        (r.experienceYears!=null?'<div class="org-card-line">'+icon("chart",13)+'<span>'+esc(r.experienceYears)+' '+t("سنوات خبرة","years of experience")+'</span></div>':"")+
        (r.userPhone||r.phone?'<div class="org-card-line">'+icon("phone",13)+'<span class="ltr-num" dir="ltr">'+esc(r.userPhone||r.phone)+'</span></div>':"")+
        (r.userEmail?'<div class="org-card-line">'+icon("mail",13)+'<span class="ltr-num" dir="ltr">'+esc(r.userEmail)+'</span></div>':"")+
      '</div>'+
      '<div class="core-chips">'+teacherSubjectChips(r,3)+'</div>'+
      '<div class="org-card-actions">'+
        '<button class="btn green" onclick="event.stopPropagation();acTeacherDetailOpen(\''+r.id+'\')">'+icon("eye",14)+' '+t("التفاصيل","Details")+'</button>'+
        (contact?'<span onclick="event.stopPropagation()">'+waButton(contact,{compact:true,size:14,label:t("واتساب","WhatsApp")})+'</span>':"")+
        '<button class="crud edit" title="'+t("تعديل","Edit")+'" onclick="event.stopPropagation();acTeacherEdit(\''+r.id+'\')">'+icon("edit",14)+'</button>'+
      '</div></article>'}
  window.admin=function(){
    load("dashboard","/api/admin/dashboard");var d=ac.cache.dashboard;
    var body=head(t("مركز إدارة مدرستي","Madarasati Administration"),t("بيانات تشغيلية مباشرة من PostgreSQL.","Live operational data from PostgreSQL."));
    if(!d)return adminShell(body+state("dashboard"));
    var cards=[[sum(d.organizations,"count"),t("المؤسسات التعليمية","Institutions"),"institutions"],
      [Number((d.teachers||{}).total||0),t("المدرسون","Teachers"),"teachersAdmin"],
      [sum(d.users,"count"),t("المستخدمون","Users"),"students"],[sum(d.bookings,"count"),t("الحجوزات","Bookings"),"bookings"],
      [sum(d.admissions,"count"),t("طلبات القبول","Admissions"),"reports"],
      [Number(d.pendingOwnershipRequests||0)+Number(d.pendingLocationRequests||0)+Number(d.pendingDocuments||0),t("بانتظار المراجعة","Pending review"),"verify"]];
    body+='<div class="ac-kpis">'+cards.map(function(x){return '<button class="ac-kpi" onclick="go(\''+x[2]+'\')"><strong>'+
      esc(x[0])+'</strong><span>'+esc(x[1])+'</span></button>'}).join("")+'</div><div class="ac-grid-2"><section class="panel">'+
      '<div class="panel-title"><h2>'+t("المؤسسات حسب النوع","Institutions by type")+'</h2></div><div class="ac-breakdown">'+
      (d.organizations||[]).map(function(r){return '<button onclick="acInstitutionType(\''+r.type+'\')"><b>'+esc(orgTypeLabel(r.type))+
        '</b><span>'+esc(r.count)+'</span><small>'+t("موثق: ","Verified: ")+esc(r.verified_count)+'</small></button>'}).join("")+
      '</div></section><section class="panel"><div class="panel-title"><h2>'+t("آخر النشاطات","Recent activity")+
      '</h2><button class="btn" onclick="go(\'reports\')">'+t("عرض الكل","View all")+'</button></div><div class="ac-activity">'+
      (d.recentAudit||[]).map(function(r){return '<div><span>'+esc(r.action)+'</span><b>'+esc(r.object_type||"—")+
        '</b><small>'+esc(r.actor_name||t("النظام","System"))+' · '+esc(fmt(r.created_at))+'</small></div>'}).join("")+
      '</div></section></div>';return adminShell(body)
  };

  window.acInstitutionType=function(type){ac.institutionType=type;invalidate("institutions:");render()};
  window.acInstitutionSearch=function(e){e.preventDefault();ac.institutionSearch=(document.getElementById("ac-org-q")||{}).value||"";
    invalidate("institutions:");render()};
  window.acOrgVerify=function(id,verified){var req=verified?apiDelete("/api/organizations/"+id+"/verify"):apiPatch("/api/organizations/"+id+"/verify",{});
    req.then(function(){invalidate("institutions:");delete ac.cache.dashboard;render()}).catch(function(e){alert(errorText(e))})};
  window.acOrgArchive=function(id){if(!confirm(t("أرشفة هذه المؤسسة؟","Archive this institution?")))return;
    apiDelete("/api/organizations/"+id).then(function(){invalidate("institutions:");delete ac.cache.dashboard;render()}).catch(function(e){alert(errorText(e))})};
  // Each sidebar entry (schools / institutes / colleges) lands on its own slice
  // of the catalog while all three keep sharing this one page implementation,
  // so the tenant core is never duplicated per institution type.
  var AC_TYPE_GROUPS={
    schools:["private_school","government_school"],
    institutes:["institute"],
    colleges:["college","university"]
  };
  // Card view: the same organization core the detail screen shows, condensed to
  // what identifies an institution at a glance — logo, type, owner avatar and
  // name, location, and a direct WhatsApp channel. Phone and email carry
  // dir="ltr" so the leading "+967" stays on the left in the Arabic (RTL) shell.
  function orgOwnerName(o){return o.principalName||o.ownerName||""}
  function avatarFor(o){
    var name=orgOwnerName(o);
    var initials=name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0)}).join("");
    var img=o.ownerAvatar||o.ownerImage||o.ownerAvatarUrl;
    if(img)return '<span class="owner-avatar"><img src="'+esc(img)+'" alt="'+esc(name)+'" loading="lazy"></span>';
    return '<span class="owner-avatar" aria-hidden="true">'+esc(initials||"—")+'</span>';
  }
  function contactLine(o){
    var out="";
    if(o.phone)out+='<div class="org-card-line">'+icon("phone",13)+'<span class="ltr-num" dir="ltr">'+esc(o.phone)+'</span></div>';
    if(o.email)out+='<div class="org-card-line">'+icon("mail",13)+'<span class="ltr-num" dir="ltr">'+esc(o.email)+'</span></div>';
    return out;
  }
  // Where a person belongs. An owner or client is tied to the institution of
  // their primary membership. A teacher is either on an institution's staff or
  // an independent freelancer, and those are genuinely different rows: a
  // freelancer has a teacher_profiles row and no membership at all.
  function userAffiliationCell(u){
    if(u.organizationName){
      return '<b>'+esc(u.organizationName)+'</b><div class="entity-sub">'+esc(orgTypeLabel(u.organizationType)||"")+
        (u.membershipRole?' · '+esc(u.membershipRole):"")+'</div>';
    }
    if(u.teacherKind==="freelancer")return '<span class="badge wait">'+t("مدرس مستقل","Freelance teacher")+'</span>';
    if(u.teacherKind==="institutional")return '<span class="badge ok">'+t("مدرس مؤسسة","Institution teacher")+'</span>';
    return "—";
  }
  function orgCard(o){
    var place=[o.governorate,o.district,o.neighborhood].filter(Boolean).join(" · ");
    var wa=o.whatsapp||o.phone;
    var owner=orgOwnerName(o);
    return '<article class="org-card">'+
      '<div class="org-card-head"><div class="org-card-logo"><img src="'+esc(orgLogo(o))+'" alt="'+esc(o.name)+'" loading="lazy"></div>'+
      '<div class="org-card-id"><h3>'+esc(o.name)+'</h3><div class="entity-sub">'+esc(orgTypeLabel(o.type))+'</div>'+
      '<div class="org-card-badges">'+badge(o.verified?"verified":o.verificationStatus||"pending")+
      badge(o.registrationOpen?"active":"inactive")+'</div></div></div>'+
      '<div class="org-card-owner">'+avatarFor(o)+'<div><span class="owner-role">'+
      esc(t("المالك / المدير","Owner / principal"))+'</span><b>'+esc(owner||t("غير مرتبط بمالك","No owner linked"))+'</b></div></div>'+
      '<div class="org-card-meta">'+
      '<div class="org-card-line">'+icon("pin",13)+'<span>'+esc(place||"—")+'</span></div>'+
      contactLine(o)+
      '</div>'+
      '<div class="org-card-actions">'+
      '<button class="btn green" onclick="go(\'detail?id='+o.id+'\')">'+icon("eye",14)+' '+t("التفاصيل","Details")+'</button>'+
      (wa?waButton(wa,{compact:true,size:14,label:t("واتساب","WhatsApp")}):"")+
      '<button class="crud edit" title="'+t("تعديل","Edit")+'" onclick="acOrgEdit(\''+o.id+'\')">'+icon("edit",14)+'</button>'+
      '</div></article>';
  }
  window.acInstitutionsView=function(v){ac.institutionsView=v;render()};

  window.adminInstitutionsPage=function(group){
    var allowed=(group&&AC_TYPE_GROUPS[group])||null;
    if(allowed&&allowed.indexOf(ac.institutionType)<0)ac.institutionType=allowed[0];
    var key="institutions:"+ac.institutionType+":"+ac.institutionSearch;
    var url="/api/organizations?type="+encodeURIComponent(ac.institutionType)+"&limit=100";
    if(ac.institutionSearch)url+="&search="+encodeURIComponent(ac.institutionSearch);
    load(key,url,function(d){return{items:listOf(d),total:Number(d&&d.total||listOf(d).length)}});
    // All five institution types are always one tap away. A sidebar entry
    // (schools / institutes / colleges) only decides which tab is selected on
    // arrival; it never hides the rest of the catalog.
    var allTypes=[["private_school",t("مدارس خاصة","Private schools")],["government_school",t("مدارس حكومية","Government schools")],
      ["college",t("كليات","Colleges")],["university",t("جامعات","Universities")],["institute",t("معاهد","Institutes")]];
    var body=head(t("إدارة المؤسسات الدراسية","Institutions management"),t("إدارة المؤسسات من مصدر موحد.","Manage institutions through the shared organization core."),
      '<button class="btn green" onclick="acOrgFormOpen(\'add\',null)">'+icon("plus",15)+' '+t("إضافة","Add")+'</button>')+
      '<div class="org-type-tabs">'+allTypes.map(function(x){return '<button class="'+(ac.institutionType===x[0]?"active":"")+
      '" onclick="acInstitutionType(\''+x[0]+'\')">'+esc(x[1])+'</button>'}).join("")+'</div>';
    body+=adminOrgForm()+'<section class="panel">'+
      '<form class="toolbar" onsubmit="acInstitutionSearch(event)"><input id="ac-org-q" value="'+esc(ac.institutionSearch)+
      '" placeholder="'+t("بحث بالاسم...","Search by name...")+'"><button class="btn green">'+t("بحث","Search")+'</button>'+
      '<div class="view-toggle"><button type="button" class="'+(ac.institutionsView==="cards"?"active":"")+
      '" onclick="acInstitutionsView(\'cards\')">'+icon("grid",13)+' '+t("كروت","Cards")+'</button>'+
      '<button type="button" class="'+(ac.institutionsView==="table"?"active":"")+
      '" onclick="acInstitutionsView(\'table\')">'+icon("list",13)+' '+t("جدول","Table")+'</button></div></form>';
    var d=ac.cache[key];if(!d)body+=state(key);else if(!d.items.length)body+='<div class="empty-state">'+t("لا توجد مؤسسات.","No institutions.")+'</div>';
    else if(ac.institutionsView==="cards")body+='<div class="org-grid">'+d.items.map(orgCard).join("")+'</div>';
    else body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+t("المؤسسة","Institution")+'</th><th>'+
      t("المالك / المدير","Owner / principal")+'</th><th>'+t("الموقع","Location")+'</th><th>'+t("الاتصال","Contact")+'</th><th>'+
      t("التحقق","Verification")+'</th><th></th></tr></thead><tbody>'+d.items.map(function(o){
        var wa=o.whatsapp||o.phone;
        return '<tr class="row-click" onclick="go(\'detail?id='+o.id+'\')">'+
        '<td><div class="row-entity"><span class="row-logo"><img src="'+esc(orgLogo(o))+'" alt="" loading="lazy"></span><div><b>'+
        esc(o.name)+'</b><div class="entity-sub">'+esc(orgTypeLabel(o.type))+'</div></div></div></td>'+
        '<td><div class="row-entity">'+avatarFor(o)+'<div><b>'+esc(orgOwnerName(o)||"—")+'</b></div></div></td>'+
        '<td>'+esc([o.governorate,o.district,o.neighborhood].filter(Boolean).join(" · ")||"—")+'</td>'+
        '<td><div class="contact-cell"><span class="ltr-num" dir="ltr">'+esc(o.phone||"—")+'</span>'+
        (o.email?'<span class="ltr-num" dir="ltr">'+esc(o.email)+'</span>':"")+'</div>'+
        (wa?waButton(wa,{compact:true,size:13}):"")+'</td>'+
        '<td>'+badge(o.verified?"verified":o.verificationStatus||"pending")+'</td>'+
        // The whole row opens the detail screen; each action button stops the
        // click from bubbling so a verify or archive never doubles as a visit.
        '<td><div class="crud-actions"><button class="crud view" onclick="event.stopPropagation();go(\'detail?id='+o.id+'\')">'+icon("eye",14)+
        '</button><button class="crud edit" onclick="event.stopPropagation();acOrgEdit(\''+o.id+'\')">'+icon("edit",14)+
        '</button><button class="crud verify" onclick="event.stopPropagation();acOrgVerify(\''+o.id+'\','+(o.verified?"true":"false")+')">'+
        icon(o.verified?"x":"check",14)+'</button><button class="crud delete" onclick="event.stopPropagation();acOrgArchive(\''+o.id+'\')">'+
        icon("trash",14)+'</button></div></td></tr>'}).join("")+'</tbody></table></div>';
    return adminShell(body+'</section>')
  };

  window.acUserFilters=function(e){e.preventDefault();ac.userRole=(document.getElementById("ac-user-role")||{}).value||"";
    ac.userStatus=(document.getElementById("ac-user-status")||{}).value||"";ac.userSearch=(document.getElementById("ac-user-q")||{}).value||"";
    ac.userOrg=(document.getElementById("ac-user-org")||{}).value||"";
    invalidate("users:");render()};
  window.acUserStatus=function(id,status){apiPatch("/api/users/"+id,{status:status}).then(function(){
    invalidate("users:");delete ac.cache.dashboard;render()}).catch(function(e){alert(errorText(e))})};
  window.adminAccountsPage=function(){
    var key="users:"+ac.userRole+":"+ac.userStatus+":"+ac.userSearch+":"+ac.userOrg,qs=["limit=100"];
    if(ac.userRole)qs.push("role="+encodeURIComponent(ac.userRole));if(ac.userStatus)qs.push("status="+encodeURIComponent(ac.userStatus));
    if(ac.userSearch)qs.push("search="+encodeURIComponent(ac.userSearch));
    if(ac.userOrg)qs.push("organizationId="+encodeURIComponent(ac.userOrg));
    load(key,"/api/users?"+qs.join("&"),function(d){return{items:listOf(d),total:Number(d&&d.total||listOf(d).length)}});
    // The institution filter lists the institutions already loaded on the
    // institutions screen, so the admin can ask "who belongs to this school?"
    // without a second catalog request.
    load("orgs:filter","/api/organizations?limit=100",function(d){return listOf(d)});
    var orgs=ac.cache["orgs:filter"]||[];
    var orgOpts='<option value="">'+t("كل المؤسسات","All institutions")+'</option>'+orgs.map(function(o){
      return '<option value="'+esc(o.id)+'"'+(ac.userOrg===o.id?" selected":"")+'>'+esc(o.name)+'</option>'}).join("");
    var body=head(t("العملاء والطلاب","Clients and students"),
      t("إدارة الحسابات الحالية وربطها بالمؤسسة التي تنتمي إليها. علاقات الأسرة والطلاب مرحلة مستقلة.","Manage current accounts and the institution each one belongs to. Family/student relationships are a separate phase."))+
      '<section class="panel"><form class="toolbar" onsubmit="acUserFilters(event)"><input id="ac-user-q" value="'+esc(ac.userSearch)+
      '" placeholder="'+t("بحث...","Search...")+'"><select id="ac-user-role"><option value="">'+t("كل الأدوار","All roles")+
      '</option><option value="client">Client</option><option value="teacher">Teacher</option><option value="owner">Owner</option></select>'+
      '<select id="ac-user-status"><option value="">'+t("كل الحالات","All statuses")+'</option><option value="active">Active</option>'+
      '<option value="pending">Pending</option><option value="suspended">Suspended</option></select>'+
      '<select id="ac-user-org">'+orgOpts+'</select><button class="btn green">'+
      t("تطبيق","Apply")+'</button></form>';
    var d=ac.cache[key];if(!d)body+=state(key);else if(!d.items.length)body+='<div class="empty-state">'+t("لا توجد حسابات.","No accounts.")+'</div>';
    else body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+t("المستخدم","User")+'</th><th>'+t("الدور","Role")+
      '</th><th>'+t("المؤسسة","Institution")+'</th><th>'+t("الهاتف","Phone")+'</th><th>'+t("الحالة","Status")+'</th><th></th></tr></thead><tbody>'+
      d.items.map(function(u){return '<tr><td><b>'+esc(u.name)+'</b><div class="entity-sub">'+esc(u.email)+'</div></td><td>'+
      esc(u.role||"—")+'</td><td>'+userAffiliationCell(u)+'</td><td dir="ltr">'+esc(u.phone||"—")+'</td><td>'+badge(u.status)+
      '</td><td><button class="btn" onclick="acUserStatus(\''+
      u.id+'\',\''+(u.status==="suspended"?"active":"suspended")+'\')">'+(u.status==="suspended"?t("تفعيل","Activate"):t("إيقاف","Suspend"))+
      '</button></td></tr>'}).join("")+'</tbody></table></div>';return adminShell(body+'</section>')
  };

  window.acBookingStatus=function(id,status){if(!status)return;apiPatch("/api/bookings/"+id+"/status",{status:status}).then(function(){
    delete ac.cache.bookings;delete ac.cache.dashboard;render()}).catch(function(e){alert(errorText(e))})};
  window.adminBookingsPage=function(){
    load("bookings","/api/bookings?limit=100",listOf);var rows=ac.cache.bookings;
    var body=head(t("الحجوزات","Bookings"),t("الحجوزات والزيارات والدروس من السجل التشغيلي.","Bookings, visits, and lessons from operational records."));
    if(!rows)body+=state("bookings");else if(!rows.length)body+='<div class="empty-state">'+t("لا توجد حجوزات.","No bookings.")+'</div>';
    else body+='<section class="panel"><div class="table-wrap"><table class="tbl"><thead><tr><th>'+t("النوع","Type")+
      '</th><th>'+t("العنوان","Title")+'</th><th>'+t("الموعد","Schedule")+'</th><th>'+t("الحالة","Status")+
      '</th><th></th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.bookingType)+'</td><td><b>'+
      esc(r.title||"—")+'</b><div class="entity-sub">'+esc(r.organizationId||r.teacherUserId||"—")+'</div></td><td>'+
      esc(fmt(r.startTime))+'</td><td>'+badge(r.status)+'</td><td><select onchange="acBookingStatus(\''+r.id+
      '\',this.value)"><option value="">'+t("تغيير...","Change...")+'</option><option value="confirmed">Confirmed</option>'+
      '<option value="completed">Completed</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option>'+
      '</select></td></tr>'}).join("")+'</tbody></table></div></section>';return adminShell(body)
  };

  window.acAcademicTab=function(tab){ac.academicTab=tab;ac.academicForm=null;render()};

  // ---- Global academic catalog (platform admin only) ----
  // This screen is the ABSTRACT, PRICE-FREE definition layer: stage names, the
  // grade ladder with its track, subject names, teaching languages and curriculum
  // classifications. It deliberately carries no amount, no currency and no seat
  // count — the platform never prices a stage centrally. Prices, capacity,
  // delivery mode and the teaching language of a specific school live on that
  // institution's offering instead. The two layers are not interchangeable.
  var TRACK_OPTIONS=[["",t("عام","General")],["general",t("عام","General")],
    ["science",t("علمي","Science")],["literary",t("أدبي","Literary")]];
  function trackLabel(track){
    if(!track)return t("عام","General");
    return {science:t("علمي","Science"),literary:t("أدبي","Literary"),general:t("عام","General")}[track]||track;
  }
  window.acCatalogFormOpen=function(kind){ac.academicForm={kind:kind,_error:null,_busy:false};render()};
  window.acCatalogFormClose=function(){ac.academicForm=null;render()};
  window.acCatalogSave=function(){
    var f=ac.academicForm;if(!f||f._busy)return;
    var name=wVal("ac-cat-name"),code=wVal("ac-cat-code");
    if(!name){f._error=t("الاسم مطلوب.","Name is required.");render();return}
    if(!code){f._error=t("الرمز مطلوب.","Code is required.");render();return}
    var payload={name:name,code:code};
    if(f.kind==="stage"){
      // Bilingual catalog: the Arabic name is what staff read, the English one is
      // what the EN shell renders, so both belong to the same definition.
      var nameEn=wVal("ac-cat-name-en"),desc=wVal("ac-cat-desc");
      if(nameEn)payload.nameEn=nameEn;
      if(desc)payload.description=desc;
    }
    var url="/api/academic/stages";
    if(f.kind==="grade"){
      url="/api/academic/grades";
      payload.stageId=(document.getElementById("ac-cat-stage")||{}).value||"";
      var track=(document.getElementById("ac-cat-track")||{}).value||"";
      if(!payload.stageId){f._error=t("اختر المرحلة.","Select a stage.");render();return}
      if(track)payload.track=track;
    }
    f._busy=true;apiPost(url,payload).then(function(){ac.academicForm=null;
      delete ac.cache["academic:"+(f.kind==="grade"?"grades":"stages")];
      // A new catalog row changes the options an offering form can pick from.
      invalidate("academic:");render()}).catch(function(e){f._busy=false;f._error=errorText(e);render()});
  };
  // Saving a track edits the shared grade, which is a catalog decision and not a
  // tenant one, so the control only appears for the platform admin page.
  window.acGradeTrackSave=function(id){
    var sel=document.getElementById("ac-track-"+id);if(!sel)return;
    apiPatch("/api/academic/grades/"+id,{track:sel.value||null}).then(function(){
      invalidate("academic:");render()}).catch(function(e){alert(errorText(e))});
  };
  function acCatalogForm(){
    var f=ac.academicForm;if(!f)return "";
    var isGrade=f.kind==="grade";
    var stages=ac.cache["academic:stages"]||[];
    var stageOpts=stages.map(function(s){return wOpt(s.id,s.name)}).join("");
    return '<section class="panel ac-form"><div class="panel-title"><h2>'+
      esc(isGrade?t("إضافة صف","Add grade"):t("إضافة مرحلة","Add stage"))+'</h2></div>'+formError(f)+
      '<div class="ac-form-grid">'+
      wInput(isGrade?t("اسم الصف","Grade name"):t("اسم المرحلة","Stage name"),"ac-cat-name","",
        isGrade?t("مثال: الأول ثانوي","e.g. First Secondary"):t("مثال: المرحلة الثانوية","e.g. Secondary stage"))+
      // The code is the key an institution offering points at, so the example
      // is a real catalog code and not a subject code such as "MATH".
      wInput(t("الرمز (يُكتب بالإنجليزية)","Code (Latin letters)"),"ac-cat-code","",
        isGrade?t("مثال: G12 أو ثالث ثانوي","e.g. G12"):t("مثال: SEC أو ثانوية","e.g. SEC"))+
      (isGrade?"":
        wInput(t("الاسم بالإنجليزية","English name"),"ac-cat-name-en","",t("مثال: Secondary stage","e.g. Secondary stage"))+
        wArea(t("الوصف","Description"),"ac-cat-desc",""))+
      (isGrade?wSel(t("المرحلة","Stage"),"ac-cat-stage",wOpt("",t("— اختر المرحلة —","— Select a stage —"))+stageOpts):"")+
      (isGrade?wSel(t("المسار","Track"),"ac-cat-track",TRACK_OPTIONS.map(function(x){return wOpt(x[0],x[1])}).join("")):"")+
      '</div><div class="ac-form-actions">'+
      '<button class="btn green" onclick="acCatalogSave()">'+t("حفظ","Save")+'</button>'+
      '<button class="btn" onclick="acCatalogFormClose()">'+t("إلغاء","Cancel")+'</button></div></section>';
  }
  window.academicPage=function(){
    var defs={
      stages:["stages",t("المراحل","Stages"),t("أسماء المراحل التعليمية على مستوى المنصة. بدون رسوم أو سعة.","Platform-wide stage names. No fees or capacity here.")],
      grades:["grades",t("الصفوف","Grades"),t("سلم الصفوف مع المسار: علمي / أدبي / عام.","The grade ladder with its track: science / literary / general.")],
      subjects:["subjects",t("المواد العامة","Subjects"),t("أسماء المواد العامة المشتركة.","Shared general subject names.")],
      languages:["languages",t("لغات التدريس","Teaching languages"),t("اللغات المتاحة للتدريس على مستوى المنصة.","Teaching languages available platform-wide.")],
      curricula:["curricula",t("تصنيفات المناهج","Curriculum classifications"),t("وزاري / أهلي / دولي — تصنيف يُربط بالمادة والمرحلة.","National / private / international — attached to subject and stage.")]
    };
    if(!defs[ac.academicTab])ac.academicTab="stages";
    var def=defs[ac.academicTab],key="academic:"+ac.academicTab;
    load(key,"/api/academic/"+def[0],listOf);
    if(ac.academicTab==="grades")load("academic:stages","/api/academic/stages",listOf);
    var canAdd=(ac.academicTab==="stages"||ac.academicTab==="grades");
    var body=head(t("البيانات الأكاديمية","Academic data"),def[2],
      '<button class="btn green" onclick="go(\'schools\')">'+icon("school",15)+' '+t("عروض المؤسسات","Institution offerings")+'</button>'+
      (canAdd?'<button class="btn brown" onclick="acCatalogFormOpen(\''+(ac.academicTab==="grades"?"grade":"stage")+'\')">'+
        icon("plus",15)+' '+t("إضافة","Add")+'</button>':""))+
      '<div class="arch-note">'+icon("shield",15)+'<div><b>'+
      t("كتالوج عام للمنصة — بدون أسعار","Global platform catalog — no prices")+'</b><span>'+
      t("هذه الشاشة تعريف مجرد يديره المدير العام. الرسوم والسعة ولغة التدريس وطريقة الحضور تُحدَّد لكل مؤسسة على حدة من صفحة المؤسسة.","This screen is an abstract definition owned by the platform admin. Fees, capacity, teaching language and delivery mode are set per institution from the institution page.")+
      '</span></div></div>'+
      '<div class="section-tabs ac-tabs">'+Object.keys(defs).map(function(k){return '<button class="'+(ac.academicTab===k?"active":"")+
      '" onclick="acAcademicTab(\''+k+'\')">'+esc(defs[k][1])+'</button>'}).join("")+'</div>'+
      acCatalogForm()+'<section class="panel"><div class="panel-title"><h2>'+esc(def[1])+'</h2></div>';
    var rows=ac.cache[key];
    if(!rows)body+=state(key);
    else if(!rows.length)body+='<div class="empty-state">'+t("لا توجد بيانات.","No records.")+'</div>';
    else if(ac.academicTab==="grades")body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+
      t("الصف","Grade")+'</th><th>'+t("الرمز","Code")+'</th><th>'+t("المرحلة","Stage")+
      '</th><th>'+t("المسار","Track")+'</th></tr></thead><tbody>'+rows.map(function(r){
        return '<tr><td><b>'+esc(r.name)+'</b></td><td dir="ltr"><code>'+esc(r.code||"—")+'</code></td><td>'+
          esc(r.stageName||"—")+'</td><td><select id="ac-track-'+r.id+'" class="ac-track-sel" onchange="acGradeTrackSave(\''+r.id+'\')">'+
          TRACK_OPTIONS.map(function(x){return wOpt(x[0],x[1],r.track||"")}).join("")+'</select>'+
          '<span class="entity-sub">'+esc(trackLabel(r.track))+'</span></td></tr>'}).join("")+'</tbody></table></div>';
    else body+='<div class="reference-grid">'+rows.map(function(r){return '<div class="reference-card">'+
      '<div class="ref-icon">'+icon(ac.academicTab==="languages"?"globe":ac.academicTab==="curricula"?"tag":"college",18)+'</div><div><b>'+esc(r.name)+'</b><span dir="ltr">'+esc(r.code||r.slug||"")+
      '</span></div>'+badge(r.isActive===false?"inactive":"active")+'</div>'}).join("")+'</div>';
    return adminShell(body+'</section>')
  };

  window.adminReportsPage=function(){
    load("dashboard","/api/admin/dashboard");load("audit","/api/admin/audit-logs?limit=100",listOf);var d=ac.cache.dashboard,logs=ac.cache.audit;
    var body=head(t("التقارير والتحليلات","Reports and analytics"),t("ملخصات مشتقة من البيانات التشغيلية الحالية.","Summaries derived from current operational data."));
    if(!d||!logs)body+=state(!d?"dashboard":"audit");else{var bm=statusCounts(d.bookings),am=statusCounts(d.admissions);
      body+='<div class="ac-grid-2"><section class="panel"><div class="panel-title"><h2>'+t("الحجوزات حسب الحالة","Bookings by status")+
      '</h2></div><div class="ac-breakdown">'+Object.keys(bm).map(function(k){return '<div><b>'+esc(k)+'</b><span>'+bm[k]+'</span></div>'}).join("")+
      '</div></section><section class="panel"><div class="panel-title"><h2>'+t("القبول حسب الحالة","Admissions by status")+
      '</h2></div><div class="ac-breakdown">'+Object.keys(am).map(function(k){return '<div><b>'+esc(k)+'</b><span>'+am[k]+'</span></div>'}).join("")+
      '</div></section></div><section class="panel"><div class="panel-title"><h2>'+t("سجل التدقيق","Audit log")+
      '</h2></div><div class="table-wrap"><table class="tbl"><thead><tr><th>'+t("العملية","Action")+'</th><th>'+t("الكيان","Entity")+
      '</th><th>'+t("المنفذ","Actor")+'</th><th>'+t("الوقت","Time")+'</th></tr></thead><tbody>'+logs.map(function(r){return '<tr><td>'+
      esc(r.action)+'</td><td>'+esc(r.entityType||"—")+'</td><td>'+esc(r.actorName||t("النظام","System"))+'</td><td>'+
      esc(fmt(r.createdAt))+'</td></tr>'}).join("")+'</tbody></table></div></section>'}return adminShell(body)
  };

  window.accessPage=function(){
    load("roles","/api/rbac/roles",listOf);load("permissions","/api/rbac/permissions",listOf);load("accessUsers","/api/users?limit=100",listOf);
    var body=head(t("المستخدمون والصلاحيات","Users and permissions"),t("الأدوار والصلاحيات الفعلية من قاعدة البيانات.","Database-backed roles and permissions."));
    if(!ac.cache.roles||!ac.cache.permissions||!ac.cache.accessUsers)body+=state(!ac.cache.roles?"roles":!ac.cache.permissions?"permissions":"accessUsers");
    else body+='<div class="ac-grid-2"><section class="panel"><div class="panel-title"><h2>'+t("الأدوار","Roles")+
      '</h2></div><div class="reference-grid">'+ac.cache.roles.map(function(r){return '<div class="reference-card"><div class="ref-icon">'+
      icon("shield",18)+'</div><div><b>'+esc(r.name)+'</b><span>'+esc(r.description||"")+'</span></div><strong>'+esc(r.permission_count)+
      '</strong></div>'}).join("")+'</div></section><section class="panel"><div class="panel-title"><h2>'+t("ملخص","Summary")+
      '</h2></div><div class="ac-summary"><b>'+esc((ac.cache.accessUsers||[]).length)+'</b><span>'+t("مستخدم","users")+'</span><b>'+
      esc((ac.cache.permissions||[]).length)+'</b><span>'+t("صلاحية معرفة","defined permissions")+'</span></div></section></div>';return adminShell(body)
  };
  window.acSettingEdit=function(key,index){var row=ac.cache.settings[index],next=prompt(t("قيمة JSON الجديدة","New JSON value"),JSON.stringify(row.value));
    if(next===null)return;var value;try{value=JSON.parse(next)}catch(e){alert(t("JSON غير صالح","Invalid JSON"));return}
    apiPut("/api/admin/settings/"+encodeURIComponent(key),{value:value,description:row.description}).then(function(){delete ac.cache.settings;render()})
      .catch(function(e){alert(errorText(e))})};
  window.settingsPage=function(){
    load("settings","/api/admin/settings",listOf);var rows=ac.cache.settings;
    var body=head(t("الإعدادات","Settings"),t("إعدادات النظام المحفوظة في PostgreSQL.","System settings stored in PostgreSQL."));
    if(!rows)body+=state("settings");else if(!rows.length)body+='<div class="empty-state">'+t("لا توجد إعدادات محفوظة بعد.","No settings saved yet.")+'</div>';
    else body+='<section class="panel"><div class="table-wrap"><table class="tbl"><thead><tr><th>'+t("المفتاح","Key")+
      '</th><th>'+t("القيمة","Value")+'</th><th>'+t("آخر تحديث","Updated")+'</th><th></th></tr></thead><tbody>'+
      rows.map(function(r,i){return '<tr><td><b>'+esc(r.key)+'</b><div class="entity-sub">'+esc(r.description||"")+'</div></td><td><code>'+
      esc(JSON.stringify(r.value))+'</code></td><td>'+esc(fmt(r.updatedAt))+'</td><td><button class="btn" onclick="acSettingEdit(\''+
      r.key.replace(/'/g,"")+'\','+i+')">'+t("تعديل","Edit")+'</button></td></tr>'}).join("")+'</tbody></table></div></section>';return adminShell(body)
  };

  var previousGeneric=window.generic;
  window.generic=function(title){var r=route();
    // One institutions screen. The former institutes/colleges routes are kept as
    // aliases rather than deleted, so an existing bookmark or an in-flight back
    // route still lands on the unified catalog instead of a placeholder page.
    if(r==="schools"||r==="institutions"||r==="institutesAdmin"||r==="collegesAdmin")return adminInstitutionsPage();
    if(r==="teachersAdmin")return adminTeachersPage();if(r==="students")return adminAccountsPage();if(r==="bookings")return adminBookingsPage();
    if(r==="reports")return adminReportsPage();
    return previousGeneric(title)};
  try{if(adminOnlyRoutes.indexOf(route())>-1)render()}catch(e){console.error("[admin-core] render failed",e)}
})();
