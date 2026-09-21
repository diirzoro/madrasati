// Connected Super Admin pages for the approved V4 shell.
// Pages compose existing domain APIs; PostgreSQL remains authoritative.
(function () {
  "use strict";
  var ac={cache:{},loading:{},errors:{},institutionType:"private_school",institutionSearch:"",institutionsView:"cards",
    userRole:"",userStatus:"",userSearch:"",academicTab:"stages",
    orgForm:null,teacherForm:null};
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
  function wSel(label,id,html,wide){return '<div class="form-group'+(wide?" ac-field-wide":"")+'"><label>'+esc(label)+'</label><select id="'+id+'">'+html+'</select></div>'}
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

  // ---- teachers: add / edit ----
  window.acTeacherFormOpen=function(mode,r){ac.teacherForm={mode:mode,row:r||null,_error:null,draft:{}};
    if(mode==="add"&&!ac.cache.teacherUsers)load("teacherUsers","/api/users?limit=100",function(d){return d.items||[]});render()};
  window.acTeacherFormClose=function(){ac.teacherForm=null;render()};
  window.acTeacherEdit=function(id){var rows=ac.cache.teachers||[];
    for(var i=0;i<rows.length;i++){if(rows[i].id===id){acTeacherFormOpen("edit",rows[i]);return}}};
  function acTeacherUserOptions(){var users=ac.cache.teacherUsers||[];var taken={};
    (ac.cache.teachers||[]).forEach(function(x){taken[x.userId]=1});
    var out="";users.forEach(function(u){if(!taken[u.id])out+=wOpt(u.id,(u.name||u.email||u.id)+" — "+(u.email||""),"")});return out}
  window.acTeacherSave=function(){var f=ac.teacherForm;if(!f||f._busy)return;f._error=null;
    var body={headline:wVal("ac-t-headline"),bio:wVal("ac-t-bio"),gender:wVal("ac-t-gender")};
    var el=function(id){return document.getElementById(id)||{checked:false}};
    if(f.mode==="add"){
      var uid=wVal("ac-t-user");
      if(!uid){f._error=t("اختر المستخدم.","Select a user.");render();return}
      body.userId=uid;body.experience=Number(wVal("ac-t-exp"))||0;
      body.offersOnline=el("ac-t-online").checked;body.travelsToStudentHome=el("ac-t-travel").checked;
      body.acceptsStudentHome=el("ac-t-home").checked;
    }else{
      body.experienceYears=Number(wVal("ac-t-exp"))||0;
      body.status=wVal("ac-t-status")||"active";body.verificationStatus=wVal("ac-t-verif")||"pending";
    }
    f._busy=true;
    var req=f.mode==="add"?apiPost("/api/teachers",body):apiPatch("/api/teachers/"+f.row.id,body);
    req.then(function(){ac.teacherForm=null;delete ac.cache.teachers;delete ac.cache.dashboard;render()})
      .catch(function(e){f._busy=false;f._error=errorText(e);render()})};
  function adminTeacherForm(){var f=ac.teacherForm;if(!f)return "";
    ["ac-t-headline","ac-t-exp","ac-t-bio","ac-t-gender","ac-t-status","ac-t-verif","ac-t-user"].forEach(function(id){
      var el=document.getElementById(id);if(el)f.draft[id]=el.value});
    function tf(id){var d=f.draft[id];if(d!=null)return d;
      if(f.mode==="edit"&&f.row){var rk={headline:"headline",exp:"experienceYears",bio:"bio",gender:"gender"}[id.split("-")[2]]||id.split("-")[2];
        var v=f.row[rk];return v===undefined||v===null?"":v}return ""}
    var curStatus=f.mode==="edit"?(tf("ac-t-status")||f.row.status||"active"):(tf("ac-t-status")||"active");
    var curVerif=f.mode==="edit"?(tf("ac-t-verif")||f.row.verificationStatus||"pending"):(tf("ac-t-verif")||"pending");
    var statusSel=wOpt("active",t("نشط","Active"),curStatus)+wOpt("inactive",t("غير نشط","Inactive"),curStatus)+
      wOpt("suspended",t("موقوف","Suspended"),curStatus);
    var verifSel=wOpt("pending",t("بانتظار التحقق","Pending"),curVerif)+wOpt("verified",t("موثق","Verified"),curVerif)+
      wOpt("rejected",t("مرفوض","Rejected"),curVerif);
    var userSlot=f.mode==="edit"?('<div class="entity-sub">'+esc((f.row.userName||"")+" "+(f.row.userEmail||""))+'</div>'):
      (ac.cache.teacherUsers?(acTeacherUserOptions()?wSel(t("المستخدم *","User *"),"ac-t-user",acTeacherUserOptions()):
        '<div class="ac-form-error">'+t("لا يوجد مستخدمون متاحون لإنشاء ملف مدرس.","No available users to create a teacher profile.")+
        '</div><button class="btn" onclick="acTeacherFormClose();go(\'students\')">'+t("إدارة المستخدمين","Manage users")+'</button>'):
        '<div class="loading-inline"><div class="loader"></div></div>');
    return '<section class="panel ac-form-panel">'+formError(f)+'<div class="panel-title"><h2>'+t("إضافة مدرس","Add teacher")+
      (f.mode==="edit"?t(" · تعديل"," · edit"):"")+'</h2><button class="btn" onclick="acTeacherFormClose()">'+t("إغلاق","Close")+'</button></div>'+
      '<div class="ac-form-grid">'+(f.mode==="add"?userSlot:'<div class="form-group"><label>'+t("المدرس","Teacher")+'</label>'+userSlot+'</div>')+
      wInput(t("العنوان","Headline"),"ac-t-headline",tf("ac-t-headline"),t("مثال: معلم رياضيات خبرة 10 سنوات","e.g. Math teacher, 10 years experience"))+
      wInput(t("سنوات الخبرة","Years of experience"),"ac-t-exp",tf("ac-t-exp"),t("السنوات","years"),true)+
      '<div class="form-group"><label>'+t("الجنس","Gender")+'</label><select id="ac-t-gender"><option value="">'+t("غير محدد","Unspecified")+'</option>'+
      '<option value="male"'+((tf("ac-t-gender")==="male")?" selected":"")+'>'+t("ذكر","Male")+'</option>'+
      '<option value="female"'+((tf("ac-t-gender")==="female")?" selected":"")+'>'+t("أنثى","Female")+'</option></select></div>'+
      (f.mode==="edit"?wSel(t("الحالة","Status"),"ac-t-status",statusSel):"")+
      (f.mode==="edit"?wSel(t("التحقق","Verification"),"ac-t-verif",verifSel):"")+
      '<div class="form-group ac-field-wide"><label>'+t("التفضيلات","Preferences")+'</label><div class="ac-checkgrid">'+
      wCheck(t("دروس عبر الإنترنت","Online lessons"),"ac-t-online",f.mode==="edit"?Boolean(f.row.offersOnline):false)+
      wCheck(t("الانتقال إلى منزل الطالب","Travels to student home"),"ac-t-travel",f.mode==="edit"?Boolean(f.row.travelsToStudentHome):false)+
      wCheck(t("استقبال الطلاب في المنزل","Accepts students at home"),"ac-t-home",f.mode==="edit"?Boolean(f.row.acceptsStudentHome):false)+
      '</div></div>'+wArea(t("نبذة","Bio"),"ac-t-bio",tf("ac-t-bio"))+
      '</div><div class="ac-form-actions"><button class="btn green" '+((f._busy)?"disabled":"")+' onclick="acTeacherSave()">'+
      (f._busy?t("جاري الحفظ...","Saving..."):t("حفظ","Save"))+'</button><button class="btn" onclick="acTeacherFormClose()">'+t("إلغاء","Cancel")+
      '</button></div></section>'
  }

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
  // what identifies an institution at a glance — logo, type, location, principal
  // and a direct WhatsApp channel.
  function orgCard(o){
    var place=[o.governorate,o.district,o.neighborhood].filter(Boolean).join(" · ");
    var wa=o.whatsapp||o.phone;
    return '<article class="org-card">'+
      '<div class="org-card-head"><div class="org-card-logo"><img src="'+esc(orgLogo(o))+'" alt="'+esc(o.name)+'" loading="lazy"></div>'+
      '<div class="org-card-id"><h3>'+esc(o.name)+'</h3><div class="entity-sub">'+esc(orgTypeLabel(o.type))+'</div>'+
      '<div class="org-card-badges">'+badge(o.verified?"verified":o.verificationStatus||"pending")+
      badge(o.registrationOpen?"active":"inactive")+'</div></div></div>'+
      '<div class="org-card-meta">'+
      '<div class="org-card-line">'+icon("pin",13)+'<span>'+esc(place||"—")+'</span></div>'+
      (o.principalName?'<div class="org-card-line">'+icon("user",13)+'<span>'+esc(o.principalName)+'</span></div>':"")+
      (o.phone?'<div class="org-card-line">'+icon("phone",13)+'<span dir="ltr">'+esc(o.phone)+'</span></div>':"")+
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
    var allTypes=[["private_school",t("مدارس خاصة","Private schools")],["government_school",t("مدارس حكومية","Government schools")],
      ["college",t("كليات","Colleges")],["university",t("جامعات","Universities")],["institute",t("معاهد","Institutes")]];
    var types=allowed?allTypes.filter(function(x){return allowed.indexOf(x[0])>-1}):allTypes;
    var body=head(t("المؤسسات التعليمية","Educational institutions"),t("إدارة المؤسسات من مصدر موحد.","Manage institutions through the shared organization core."),
      '<button class="btn green" onclick="acOrgFormOpen(\'add\',null)">'+icon("plus",15)+' '+t("إضافة","Add")+'</button>');
    if(types.length>1)body+='<div class="section-tabs ac-tabs">'+types.map(function(x){return '<button class="'+(ac.institutionType===x[0]?"active":"")+
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
      t("الموقع","Location")+'</th><th>'+t("التحقق","Verification")+'</th><th>'+t("التسجيل","Registration")+
      '</th><th></th></tr></thead><tbody>'+d.items.map(function(o){return '<tr><td><b>'+esc(o.name)+'</b><div class="entity-sub">'+
      esc(o.email||o.phone||"—")+'</div></td><td>'+esc([o.governorate,o.district,o.neighborhood].filter(Boolean).join(" · ")||"—")+
      '</td><td>'+badge(o.verified?"verified":o.verificationStatus||"pending")+'</td><td>'+badge(o.registrationOpen?"active":"inactive")+
      '</td><td><div class="crud-actions"><button class="crud view" onclick="go(\'detail?id='+o.id+'\')">'+icon("eye",14)+
      '</button><button class="crud edit" onclick="acOrgEdit(\''+o.id+'\')">'+icon("edit",14)+
      '</button><button class="crud verify" onclick="acOrgVerify(\''+o.id+'\','+(o.verified?"true":"false")+')">'+
      icon(o.verified?"x":"check",14)+'</button><button class="crud delete" onclick="acOrgArchive(\''+o.id+'\')">'+
      icon("trash",14)+'</button></div></td></tr>'}).join("")+'</tbody></table></div>';
    return adminShell(body+'</section>')
  };

  window.acTeacherUpdate=function(id,field,value){var p={};p[field]=value;apiPatch("/api/teachers/"+id,p).then(function(){
    delete ac.cache.teachers;delete ac.cache.dashboard;render()}).catch(function(e){alert(errorText(e))})};
  window.adminTeachersPage=function(){
    load("teachers","/api/teachers?limit=100",listOf);var rows=ac.cache.teachers;
    var body=head(t("المدرسون","Teachers"),t("ملفات المدرسين المستقلين والتحقق منها.","Independent teacher profiles and verification."),
      '<button class="btn green" onclick="acTeacherFormOpen(\'add\',null)">'+icon("plus",15)+' '+t("إضافة مدرس","Add teacher")+'</button>');
    body+=adminTeacherForm();
    if(!rows)body+=state("teachers");else if(!rows.length)body+='<div class="empty-state">'+t("لا توجد ملفات مدرسين.","No teacher profiles.")+'</div>';
    else body+='<section class="panel"><div class="table-wrap"><table class="tbl"><thead><tr><th>'+t("المدرس","Teacher")+
      '</th><th>'+t("الخبرة","Experience")+'</th><th>'+t("السعر","Rate")+'</th><th>'+t("الحالة","Status")+
      '</th><th>'+t("التحقق","Verification")+'</th><th></th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td><b>'+
      esc(r.userName||"—")+'</b><div class="entity-sub">'+esc(r.userEmail||r.headline||"—")+'</div></td><td>'+
      esc(r.experienceYears||0)+'</td><td>'+esc(r.hourlyRate||"—")+' '+esc(r.currency||"")+'</td><td>'+badge(r.status)+
      '</td><td>'+badge(r.verificationStatus)+'</td><td><div class="crud-actions"><button class="crud edit" onclick="acTeacherEdit(\''+
      r.id+'\')">'+icon("edit",14)+'</button><button class="crud verify" onclick="acTeacherUpdate(\''+
      r.id+'\',\'verificationStatus\',\''+(r.verified?"pending":"verified")+'\')">'+icon("check",14)+
      '</button><button class="crud delete" onclick="acTeacherUpdate(\''+r.id+'\',\'status\',\''+
      (r.status==="suspended"?"active":"suspended")+'\')">'+icon(r.status==="suspended"?"check":"x",14)+'</button></div></td></tr>'}).join("")+
      '</tbody></table></div></section>';return adminShell(body)
  };

  window.acUserFilters=function(e){e.preventDefault();ac.userRole=(document.getElementById("ac-user-role")||{}).value||"";
    ac.userStatus=(document.getElementById("ac-user-status")||{}).value||"";ac.userSearch=(document.getElementById("ac-user-q")||{}).value||"";
    invalidate("users:");render()};
  window.acUserStatus=function(id,status){apiPatch("/api/users/"+id,{status:status}).then(function(){
    invalidate("users:");delete ac.cache.dashboard;render()}).catch(function(e){alert(errorText(e))})};
  window.adminAccountsPage=function(){
    var key="users:"+ac.userRole+":"+ac.userStatus+":"+ac.userSearch,qs=["limit=100"];
    if(ac.userRole)qs.push("role="+encodeURIComponent(ac.userRole));if(ac.userStatus)qs.push("status="+encodeURIComponent(ac.userStatus));
    if(ac.userSearch)qs.push("search="+encodeURIComponent(ac.userSearch));
    load(key,"/api/users?"+qs.join("&"),function(d){return{items:listOf(d),total:Number(d&&d.total||listOf(d).length)}});
    var body=head(t("العملاء والطلاب","Clients and students"),
      t("إدارة الحسابات الحالية. علاقات الأسرة والطلاب مرحلة مستقلة.","Manage current accounts. Family/student relationships are a separate phase."))+
      '<section class="panel"><form class="toolbar" onsubmit="acUserFilters(event)"><input id="ac-user-q" value="'+esc(ac.userSearch)+
      '" placeholder="'+t("بحث...","Search...")+'"><select id="ac-user-role"><option value="">'+t("كل الأدوار","All roles")+
      '</option><option value="client">Client</option><option value="teacher">Teacher</option><option value="owner">Owner</option></select>'+
      '<select id="ac-user-status"><option value="">'+t("كل الحالات","All statuses")+'</option><option value="active">Active</option>'+
      '<option value="pending">Pending</option><option value="suspended">Suspended</option></select><button class="btn green">'+
      t("تطبيق","Apply")+'</button></form>';
    var d=ac.cache[key];if(!d)body+=state(key);else if(!d.items.length)body+='<div class="empty-state">'+t("لا توجد حسابات.","No accounts.")+'</div>';
    else body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+t("المستخدم","User")+'</th><th>'+t("الدور","Role")+
      '</th><th>'+t("الهاتف","Phone")+'</th><th>'+t("الحالة","Status")+'</th><th></th></tr></thead><tbody>'+
      d.items.map(function(u){return '<tr><td><b>'+esc(u.name)+'</b><div class="entity-sub">'+esc(u.email)+'</div></td><td>'+
      esc(u.role||"—")+'</td><td dir="ltr">'+esc(u.phone||"—")+'</td><td>'+badge(u.status)+'</td><td><button class="btn" onclick="acUserStatus(\''+
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

  window.acAcademicTab=function(tab){ac.academicTab=tab;render()};
  window.academicPage=function(){
    var defs={stages:["stages",t("المراحل","Stages")],grades:["grades",t("الصفوف","Grades")],
      subjects:["subjects",t("المواد","Subjects")],curricula:["curricula",t("المناهج","Curricula")],
      languages:["languages",t("لغات التدريس","Teaching languages")],methods:["teaching-methods",t("طرق التدريس","Teaching methods")]};
    var def=defs[ac.academicTab]||defs.stages,key="academic:"+ac.academicTab;load(key,"/api/academic/"+def[0],listOf);
    var body=head(t("البيانات الأكاديمية","Academic data"),t("المرجع الأكاديمي المشترك.","Shared academic reference catalog."))+
      '<div class="section-tabs ac-tabs">'+Object.keys(defs).map(function(k){return '<button class="'+(ac.academicTab===k?"active":"")+
      '" onclick="acAcademicTab(\''+k+'\')">'+esc(defs[k][1])+'</button>'}).join("")+'</div><section class="panel"><div class="panel-title"><h2>'+
      esc(def[1])+'</h2></div>';var rows=ac.cache[key];if(!rows)body+=state(key);else if(!rows.length)body+='<div class="empty-state">'+
      t("لا توجد بيانات.","No records.")+'</div>';else body+='<div class="reference-grid">'+rows.map(function(r){return '<div class="reference-card">'+
      '<div class="ref-icon">'+icon("college",18)+'</div><div><b>'+esc(r.name)+'</b><span>'+esc(r.code||r.slug||"")+
      '</span></div>'+badge(r.isActive===false?"inactive":"active")+'</div>'}).join("")+'</div>';return adminShell(body+'</section>')
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
    if(r==="schools")return adminInstitutionsPage("schools");
    if(r==="institutesAdmin")return adminInstitutionsPage("institutes");
    if(r==="collegesAdmin")return adminInstitutionsPage("colleges");
    if(r==="institutions")return adminInstitutionsPage();
    if(r==="teachersAdmin")return adminTeachersPage();if(r==="students")return adminAccountsPage();if(r==="bookings")return adminBookingsPage();
    if(r==="reports")return adminReportsPage();
    return previousGeneric(title)};
  try{if(adminOnlyRoutes.indexOf(route())>-1)render()}catch(e){console.error("[admin-core] render failed",e)}
})();
