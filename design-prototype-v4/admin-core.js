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
  /* ---------- institutions: a four-step wizard ----------
     A school is not one flat record: it has an identity, a priced offering, the
     subjects it teaches and the licences that prove it may operate. Those are four
     different concerns, so the add/edit screen is four ordered steps rather than a
     long vertical scroll. The catalog stays price-free; every amount collected
     here lands in THIS institution's offering, so changing one school's fees never
     touches another's. */
  var ORG_STEPS=[["basic","المعلومات الأساسية"],["offering","المراحل والرسوم والسعة"],
    ["subjects","المواد والتخصصات"],["documents","الوثائق والتراخيص"]];
  var ORG_STEPS_EN=[["basic","Basic information"],["offering","Stages, fees and capacity"],
    ["subjects","Subjects and specialisations"],["documents","Documents and licences"]];
  function orgStepDefs(){return lang==="ar"?ORG_STEPS:ORG_STEPS_EN}
  function orgStepIndex(tab){
    var d=orgStepDefs();
    for(var i=0;i<d.length;i++){if(d[i][0]===tab)return i}
    return 0;
  }
  function orgStepLabel(tab){
    var d=orgStepDefs();
    for(var i=0;i<d.length;i++){if(d[i][0]===tab)return d[i][1]}
    return tab;
  }
  function acOrgStep(delta){
    var f=ac.orgForm;if(!f)return;
    acOrgDraft();
    var d=orgStepDefs();
    var i=Math.max(0,Math.min(d.length-1,orgStepIndex(f.tab)+delta));
    f.tab=d[i][0];render();
  }
  window.acOrgTab=function(tab){var f=ac.orgForm;if(!f)return;acOrgDraft();f.tab=tab;render()};

  window.acOrgEdit=function(id){var key="institutions:"+ac.institutionType+":"+ac.institutionSearch;
    var rows=(ac.cache[key]||{}).items||[];for(var i=0;i<rows.length;i++){if(rows[i].id===id){acOrgFormOpen("edit",rows[i]);return}}};
  window.acOrgFormOpen=function(mode,o){acOrgFormInit(mode,o);
    var target=route()+(mode==="edit"?"/edit/"+encodeURIComponent(o.id):"/new");
    if(("#/"+target)===location.hash)render();else go(target)};

  // Adding or editing happens on its own route (#/schools/new, #/schools/edit/:id),
  // never inside the list and never in a squeezed pop-up.
  function acOrgFormInit(mode,o){
    ac.orgForm={mode:mode,row:o||null,gov:"",govId:"",dist:"",_error:null,draft:{},
      tab:"basic",stages:[],subjects:[],docs:[],_refsLoaded:false};
    if(mode==="edit"&&o){ac.orgForm.gov=o.governorate||"";ac.orgForm.dist=o.district||""}
    if(!ac.cache.locGovs)load("locGovs","/api/locations/governorates");
    acOrgLoadRefs();
  }
  // The catalog stages/subjects are reference data; the offering and the document
  // list belong to the institution and only exist once it does.
  function acOrgLoadRefs(){
    var f=ac.orgForm;if(!f)return;
    if(!ac.cache["orgRef:stages"])load("orgRef:stages","/api/academic/stages",listOf);
    if(!ac.cache["orgRef:subjects"])load("orgRef:subjects","/api/academic/subjects",listOf);
    var id=f.row&&f.row.id;
    if(id&&!f._refsLoaded){
      f._refsLoaded=true;
      var enc=encodeURIComponent(id);
      apiGet("/api/academic/org/"+enc+"/offering").then(function(off){
        var g=ac.orgForm;if(!g||!g.row||String(g.row.id)!==String(id))return;
        g.stages=(off&&off.stages?off.stages:[]).map(function(s){
          return{stageId:String(s.stageId),amount:s.fee&&s.fee.amount!=null?String(s.fee.amount):"",
            currency:(s.fee&&s.fee.currency)||"YER",frequency:(s.fee&&s.fee.frequency)||"yearly",
            capacity:s.capacity==null?"":String(s.capacity),
            languageCode:s.languageCode||"AR",deliveryMode:s.deliveryMode||"on_site"}});
        g.subjects=(off&&off.subjects?off.subjects:[]).map(function(s){
          return{subjectId:String(s.subjectId),name:s.name||"",
            languageCode:s.languageCode||"AR",
            amount:s.amount!=null?String(s.amount):"",
            currency:s.currency||"YER",frequency:s.frequency||"yearly"}});
        render()}).catch(function(){});
      apiGet("/api/documents?organizationId="+enc).then(function(docs){
        var g=ac.orgForm;if(!g||!g.row||String(g.row.id)!==String(id))return;
        g.docs=asList(docs).map(function(d){
          return{docType:d.docType,file:null,name:d.fileName,uploaded:true,status:d.status}});
        render()}).catch(function(){});
    }
  }
  window.acOrgFormClose=function(){ac.orgForm=null;
    var target=route();if(("#/"+target)===location.hash)render();else go(target)};
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

  /* ---- step 2: the stages this institution teaches, with its own fee and seats ---- */
  function orgRefStages(){return ac.cache["orgRef:stages"]||[]}
  function orgRefSubjects(){return ac.cache["orgRef:subjects"]||[]}
  window.acOrgStageAdd=function(){
    var f=ac.orgForm;if(!f)return;acOrgDraft();
    var used={};f.stages.forEach(function(s){used[String(s.stageId)]=1});
    var pick="";var list=orgRefStages();
    for(var i=0;i<list.length;i++){if(!used[String(list[i].id)]){pick=String(list[i].id);break}}
    if(!pick){f._error=t("لا توجد مرحلة متاحة للإضافة — كل مراحل الكتالوج مضافة بالفعل.",
      "No stage left to add — every catalog stage is already offered.");render();return}
    f.stages.push({stageId:pick,amount:"",currency:"YER",frequency:"yearly",capacity:"",
      languageCode:"AR",deliveryMode:"on_site"});
    f._error=null;render()};
  window.acOrgStageRemove=function(i){var f=ac.orgForm;if(!f)return;acOrgDraft();f.stages.splice(i,1);render()};
  function acOrgStageSync(){var f=ac.orgForm;if(!f)return;
    f.stages.forEach(function(s,i){
      ["stage","amount","currency","frequency","capacity","lang","mode"].forEach(function(k){
        var el=document.getElementById("ac-org-st-"+i+"-"+k);if(!el)return;
        if(k==="stage")s.stageId=el.value;
        else if(k==="amount")s.amount=String(el.value||"").trim();
        else if(k==="currency")s.currency=el.value;
        else if(k==="frequency")s.frequency=el.value;
        else if(k==="capacity")s.capacity=String(el.value||"").trim();
        else if(k==="lang")s.languageCode=el.value;
        else s.deliveryMode=el.value})})}

  /* ---- step 3: the subjects it teaches, with an optional fee each ---- */
  window.acOrgSubjectAdd=function(){
    var f=ac.orgForm;if(!f)return;acOrgDraft();
    var used={};f.subjects.forEach(function(s){used[String(s.subjectId)]=1});
    var pick="";var list=orgRefSubjects();
    for(var i=0;i<list.length;i++){if(!used[String(list[i].id)]){pick=String(list[i].id);break}}
    if(!pick){f._error=t("لا توجد مادة متاحة للإضافة — كل مواد الكتالوج مضافة بالفعل. استخدم الاقتراح أدناه لمادة جديدة.",
      "No subject left to add — every catalog subject is already offered. Use the proposal below for a new one.");render();return}
    f.subjects.push({subjectId:pick,name:"",languageCode:"AR",amount:"",currency:"YER",frequency:"yearly"});
    f._error=null;render()};
  window.acOrgSubjectRemove=function(i){var f=ac.orgForm;if(!f)return;acOrgDraft();f.subjects.splice(i,1);render()};
  function acOrgSubjectSync(){var f=ac.orgForm;if(!f)return;
    f.subjects.forEach(function(s,i){
      ["subject","lang","amount","currency","frequency"].forEach(function(k){
        var el=document.getElementById("ac-org-sub-"+i+"-"+k);if(!el)return;
        if(k==="subject")s.subjectId=el.value;
        else if(k==="lang")s.languageCode=el.value;
        else if(k==="amount")s.amount=String(el.value||"").trim();
        else if(k==="currency")s.currency=el.value;
        else s.frequency=el.value})})}
  // A subject the catalog lacks: proposed for THIS institution, pending admin review.
  window.acOrgProposeSubject=function(){
    var f=ac.orgForm;if(!f||f._busy)return;acOrgDraft();
    var nameEl=document.getElementById("ac-org-newsub-ar");
    var enEl=document.getElementById("ac-org-newsub-en");
    var name=nameEl?String(nameEl.value||"").trim():"";
    var nameEn=enEl?String(enEl.value||"").trim():"";
    if(name.length<2){
      f._error=t("اكتب اسم المادة بالعربية (حرفان على الأقل) قبل الإرسال.",
        "Enter the subject name in Arabic (at least two characters) before submitting.");
      ufPendingInvalid={tab:"subjects",id:"ac-org-newsub-ar",label:t("اسم المادة (عربي)","Subject name (Arabic)")};
      render();return;
    }
    // Without an institution there is nothing to attach the proposal to yet, so it
    // is held and created right after the institution itself is saved.
    if(f.mode==="add"){
      f.subjects.push({subjectId:"",name:name,nameEn:nameEn,languageCode:"AR",amount:"",currency:"YER",
        frequency:"yearly",proposed:true});
      if(nameEl)nameEl.value="";if(enEl)enEl.value="";
      f._error=null;render();return;
    }
    f._busy=true;f._error=null;
    apiPost("/api/academic/org/"+encodeURIComponent(f.row.id)+"/subjects",
      {name:name,languageCode:"AR"}).then(function(){
        f._busy=false;if(nameEl)nameEl.value="";if(enEl)enEl.value="";
        delete ac.cache["orgRef:subjects"];render()})
      .catch(function(e){f._busy=false;f._error=errorText(e);render()})};

  /* ---- step 4: licences and accreditation files ---- */
  window.acOrgDocAdd=function(){
    var f=ac.orgForm;if(!f)return;
    var type=(document.getElementById("ac-org-doc-type")||{}).value||"license";
    var input=document.getElementById("ac-org-doc-file");
    var file=input&&input.files&&input.files[0];
    if(!file){
      f._error=t("اختر ملف الرخصة أولاً.","Choose the licence file first.");
      ufPendingInvalid={tab:"documents",id:"ac-org-doc-file",label:t("الملف","File")};
      render();return;
    }
    f.docs.push({docType:type,file:file,name:file.name,uploaded:false});
    f._error=null;
    if(input)input.value="";
    render();
  };
  window.acOrgDocRemove=function(i){
    var f=ac.orgForm;if(!f)return;f.docs.splice(i,1);render()};

  // Every required control, declared once with the step that owns it.
  function orgRequiredRules(){
    var rules=[{tab:"basic",id:"ac-org-name",label:t("اسم المؤسسة","Institution name"),min:2}];
    (ac.orgForm&&ac.orgForm.stages||[]).forEach(function(s,i){
      rules.push({tab:"offering",id:"ac-org-st-"+i+"-amount",kind:"number",
        label:t("رسوم المرحلة","Stage fee")});
    });
    return rules;
  }
  function orgFirstProblem(){
    var f=ac.orgForm;
    var rules=orgRequiredRules();
    var order=orgStepDefs().map(function(x){return x[0]});
    for(var s=0;s<order.length;s++){
      var hit=ufValidate(rules.filter(function(r){return r.tab===order[s]}));
      if(hit)return hit;
    }
    return null;
  }

  function acOrgDraft(){
    var f=ac.orgForm;if(!f)return;
    ["ac-org-name","ac-org-email","ac-org-phone","ac-org-website","ac-org-desc","ac-org-address",
     "ac-org-neigh","ac-org-gov","ac-org-dist","ac-org-reg","ac-org-type",
     "ac-org-logo-upload-val","ac-org-newsub-ar","ac-org-newsub-en"].forEach(function(id){
      var el=document.getElementById(id);if(el)f.draft[id]=el.value});
    acOrgStageSync();acOrgSubjectSync();
  }

  window.acOrgSave=function(){
    var f=ac.orgForm;if(!f||f._busy)return;
    if(f.mode==="edit"&&!f.row){f._error=t("تعذر تحميل المؤسسة. أعد المحاولة من القائمة.","Could not load the institution. Retry from the list.");render();return}
    acOrgDraft();
    // Strict validation: nothing is written while a required field on any step is
    // empty. The user is sent to the step that owns the missing field.
    var problem=orgFirstProblem();
    if(problem){
      problem.tabLabel=orgStepLabel(problem.tab);
      f.tab=problem.tab;f._error=ufValidationMessage(problem);ufPendingInvalid=problem;render();return;
    }
    if(f.gov&&!f.govId){var list=ac.cache.locGovs||[];for(var i=0;i<list.length;i++){if(list[i].code===f.gov){f.govId=list[i].id;break}}}
    if(f.govId)load("locDist:"+f.govId,"/api/locations/districts?governorateId="+f.govId);
    var payload={name:wVal("ac-org-name"),type:wVal("ac-org-type")||"private_school",
      email:wVal("ac-org-email"),phone:wVal("ac-org-phone"),website:wVal("ac-org-website"),
      description:wVal("ac-org-desc"),address:wVal("ac-org-address"),neighborhood:wVal("ac-org-neigh"),
      registration_open:(wVal("ac-org-reg")||"open")==="open",
      image:ufUploadPath("ac-org-logo-upload")};
    var gov=wVal("ac-org-gov");if(gov){payload.governorate_code=gov;var dis=wVal("ac-org-dist");if(dis)payload.district_code=dis}
    f._busy=true;f._error=null;
    var req=f.mode==="edit"?apiPut("/api/organizations/"+f.row.id,payload):apiPost("/api/organizations",payload);
    // The institution must exist before its offering, subjects and documents can be
    // written, so the remaining steps run in sequence and any failure is reported
    // instead of being hidden behind a "saved" message.
    req.then(function(created){
      var orgId=(created&&created.id)||(f.row&&f.row.id);
      return acOrgApplySteps(orgId,f).then(function(failures){
        return {orgId:orgId,failures:failures};
      });
    }).then(function(res){
      f._busy=false;
      ac.orgForm=null;invalidate("institutions:");delete ac.cache.dashboard;
      if(res.failures.length){
        ac.orgForm={mode:"edit",row:{id:res.orgId},gov:"",govId:"",dist:"",tab:"offering",
          stages:[],subjects:[],docs:[],draft:{},_busy:false,_refsLoaded:false,
          _error:t("حُفظت بيانات المؤسسة، لكن بعض الخطوات لم تكتمل: ","The institution was saved, but some steps did not complete: ")+res.failures.join(" · ")};
        var t2="schools/edit/"+encodeURIComponent(res.orgId);
        if(("#/"+t2)===location.hash)render();else go(t2);
        return;
      }
      var target="schools";if(("#/"+target)===location.hash)render();else go(target);
    }).catch(function(e){f._busy=false;f._error=errorText(e);render()})};

  // Writes what the other three steps collected. Each call is independent, so one
  // failing offer does not discard the rest; the failures are named back to the user.
  function acOrgApplySteps(orgId,f){
    var failures=[];
    if(!orgId)return Promise.resolve([t("تعذر تحديد المؤسسة","could not resolve the institution")]);
    var enc=encodeURIComponent(orgId);
    var chain=Promise.resolve();
    f.stages.forEach(function(s){
      chain=chain.then(function(){
        return apiPut("/api/academic/org/"+enc+"/offering/stages/"+encodeURIComponent(s.stageId),{
          deliveryMode:s.deliveryMode,languageCode:s.languageCode,
          amount:s.amount===""?null:s.amount,currency:s.currency,frequency:s.frequency,
          capacity:s.capacity===""?null:Number(s.capacity)
        }).catch(function(e){failures.push(t("المرحلة ","stage ")+(s.stageId)+": "+msgErr(e))});
      });
    });
    // A subject the admin proposed is created first, then offered like the rest.
    f.subjects.forEach(function(s){
      chain=chain.then(function(){
        if(s.proposed){
          return apiPost("/api/academic/org/"+enc+"/subjects",
            {name:s.name,nameEn:s.nameEn||undefined,languageCode:s.languageCode||"AR"})
            .catch(function(e){failures.push(t("المادة المقترحة ","proposed subject ")+(s.name)+": "+msgErr(e))});
        }
        if(!s.subjectId)return null;
        return apiPut("/api/academic/org/"+enc+"/offering/subjects/"+encodeURIComponent(s.subjectId),{
          languageCode:s.languageCode,
          fee_amount:s.amount===""?null:s.amount,currency:s.currency,frequency:s.frequency
        }).catch(function(e){failures.push(t("المادة ","subject ")+(s.subjectId)+": "+msgErr(e))});
      });
    });
    f.docs.forEach(function(d){
      if(!d.file)return;
      chain=chain.then(function(){
        return fetch(API_BASE+'/api/documents/upload?organizationId='+enc+'&docType='+encodeURIComponent(d.docType),{
          method:'POST',credentials:'include',
          headers:{'Content-Type':'application/octet-stream','X-File-Name':d.name},
          body:d.file
        }).then(function(r){
          if(!r.ok)return r.text().then(function(txt){
            var m=null;try{m=JSON.parse(txt).error}catch(e){}
            failures.push(t("الوثيقة ","document ")+d.name+": "+(m||r.status));});
        }).catch(function(e){failures.push(t("الوثيقة ","document ")+d.name+": "+e.message)});
      });
    });
    return chain.then(function(){return failures});
  }

  function adminOrgForm(){
    var f=ac.orgForm;if(!f)return "";
    // Reading the visible fields back first keeps a step switch from dropping what
    // was typed, the same contract the other wizard forms use.
    if(!f._refsLoaded)acOrgLoadRefs();
    var fdv=function(id){
      if(f.draft[id]!=null)return f.draft[id];
      if(f.mode==="edit"&&f.row){
        var rk={name:"name",email:"email",phone:"phone",website:"website",desc:"description",
          address:"address",neigh:"neighborhood",image:"image"}[id.split("-")[2]]||id.split("-")[2];
        return f.row[rk]===undefined?"":f.row[rk];
      }
      return "";
    };
    if(f.gov&&!f.govId){var list=ac.cache.locGovs||[];for(var i=0;i<list.length;i++){if(list[i].code===f.gov){f.govId=list[i].id;break}}}
    if(f.govId)load("locDist:"+f.govId,"/api/locations/districts?governorateId="+f.govId);
    var typeSelVal=f.draft["ac-org-type"]!=null?f.draft["ac-org-type"]:(f.mode==="edit"?(f.row.type||"private_school"):ac.institutionType);
    var typeStr="";orgTypeOps.forEach(function(x){typeStr+=wOpt(x[0],orgTypeLabel(x[0]),typeSelVal)});
    var regOpen=f.draft["ac-org-reg"]!=null?f.draft["ac-org-reg"]:(f.mode==="edit"?(f.row.registrationOpen?"open":"closed"):"open");
    var distSlot=f.govId?(ac.loading["locDist:"+f.govId]?
      '<div class="loading-inline"><div class="loader"></div></div>':
      '<select id="ac-org-dist" onchange="acOrgDist(this.value)">'+acOrgDistOptions()+'</select>'):
      '<small class="ac-hint">'+t("اختر المحافظة أولاً.","Choose a governorate first.")+'</small>';

    var basicStep=
      wInput(t("اسم المؤسسة *","Institution name *"),"ac-org-name",fdv("ac-org-name"),t("اسم المؤسسة","Institution name"))+
      wSel(t("النوع","Type"),"ac-org-type",typeStr)+
      // A real upload with preview and change/remove, not a path to retype.
      ufImageUpload("ac-org-logo-upload",t("شعار المؤسسة","Institution logo"),fdv("ac-org-logo-upload-val"),"logos",
        {hint:t("JPG أو PNG أو WEBP، بحد أقصى 4 ميجابايت. يظهر الشعار على البطاقة وصفحة التفاصيل.",
          "JPG, PNG or WEBP, up to 4 MB. The logo appears on the card and the detail page.")})+
      wInput(t("البريد الإلكتروني","Email"),"ac-org-email",fdv("ac-org-email"),"")+
      wInput(t("الهاتف","Phone"),"ac-org-phone",fdv("ac-org-phone"),t("+967...","+967..."))+
      wInput(t("الموقع الإلكتروني","Website"),"ac-org-website",fdv("ac-org-website"),"https://")+
      '<div class="form-group"><label>'+t("التسجيل","Registration")+'</label><select id="ac-org-reg">'+
        wOpt("open",t("مفتوح","Open"),regOpen)+wOpt("closed",t("مغلق","Closed"),regOpen)+'</select></div>'+
      wSel(t("المحافظة","Governorate"),"ac-org-gov",acOrgGovOptions(),true)+
      '<div class="form-group ac-field-wide"><label>'+t("المديرية","District")+'</label>'+distSlot+'</div>'+
      wInput(t("الحي","Neighborhood"),"ac-org-neigh",fdv("ac-org-neigh"),"",true)+
      wInput(t("العنوان","Address"),"ac-org-address",fdv("ac-org-address"),"",true)+
      wArea(t("الوصف","Description"),"ac-org-desc",fdv("ac-org-desc"));

    var stageRows=f.stages.map(function(s,i){
      var stageOpts=orgRefStages().map(function(x){return wOpt(String(x.id),x.name,s.stageId)}).join("");
      return '<div class="ac-repeat-row">'+
        '<div class="form-group"><label>'+t("المرحلة","Stage")+'</label><select id="ac-org-st-'+i+'-stage">'+stageOpts+'</select></div>'+
        '<div class="form-group"><label>'+t("الرسوم *","Fee *")+'</label><input id="ac-org-st-'+i+'-amount" type="number" min="0" step="0.01" value="'+esc(s.amount)+'" placeholder="0.00"></div>'+
        '<div class="form-group"><label>'+t("العملة","Currency")+'</label><select id="ac-org-st-'+i+'-currency">'+
          ["YER","SAR","USD"].map(function(c){return wOpt(c,c,s.currency)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("الدورية","Billing")+'</label><select id="ac-org-st-'+i+'-frequency">'+
          [["yearly",t("سنوي","Yearly")],["termly",t("فصلي","Termly")],["monthly",t("شهري","Monthly")]]
            .map(function(x){return wOpt(x[0],x[1],s.frequency)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("لغة التدريس","Language")+'</label><select id="ac-org-st-'+i+'-lang">'+
          [["AR",t("العربية","Arabic")],["EN",t("الإنجليزية","English")]]
            .map(function(x){return wOpt(x[0],x[1],s.languageCode)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("طريقة الحضور","Delivery")+'</label><select id="ac-org-st-'+i+'-mode">'+
          [["on_site",t("حضوري","On-site")],["online",t("عن بُعد","Online")],["hybrid",t("مدمج","Blended")]]
            .map(function(x){return wOpt(x[0],x[1],s.deliveryMode)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("السعة","Capacity")+'</label><input id="ac-org-st-'+i+'-capacity" type="number" min="0" dir="ltr" value="'+esc(s.capacity)+'" placeholder="—">'+
        '<small class="ac-hint">'+t("اتركها فارغة إن لم تُعلن. المقاعد المتبقية تُحسب آلياً.","Leave empty if undeclared; remaining seats are computed.")+'</small></div>'+
        '<button type="button" class="crud delete" title="'+t("حذف المرحلة","Remove stage")+'" onclick="acOrgStageRemove('+i+')">'+icon("trash",14)+'</button>'+
        '</div>'}).join("");
    var offeringStep=
      '<div class="core-h3-row ac-field-wide uf-wide"><h3 class="core-h3">'+
        t("المراحل التي تدرّسها هذه المؤسسة, ورسومها وسعتها","The stages this institution teaches, with its fees and seats")+'</h3>'+
        '<button type="button" class="btn" onclick="acOrgStageAdd()">'+icon("plus",14)+' '+t("إضافة مرحلة","Add stage")+'</button></div>'+
      '<p class="ac-field-wide uf-wide ac-hint">'+
        t("الرسوم والسعة خاصة بهذه المؤسسة وحدها؛ تغييرها لا يمس أي مؤسسة أخرى. الكتالوج العام بلا أسعار.",
          "Fees and seats belong to this institution alone; changing them never touches another. The global catalog carries no prices.")+'</p>'+
      (stageRows||'<div class="empty-state">'+t("لم تُضف مراحل بعد. أضف مرحلة لكل صف تدرّسه المؤسسة.",
        "No stages yet. Add one for each level the institution teaches.")+'</div>');

    var subjectRows=f.subjects.map(function(s,i){
      if(s.proposed){
        return '<div class="ac-repeat-row">'+
          '<div class="form-group"><label>'+t("مادة مقترحة","Proposed subject")+'</label>'+
          '<input value="'+esc(s.name)+'" readonly></div>'+
          '<div class="form-group"><label>'+t("الحالة","Status")+'</label>'+
          '<div><span class="badge wait">'+t("بانتظار اعتماد المدير العام","pending platform-admin approval")+'</span></div></div>'+
          '<button type="button" class="crud delete" title="'+t("حذف","Remove")+'" onclick="acOrgSubjectRemove('+i+')">'+icon("trash",14)+'</button>'+
          '</div>';
      }
      var subjOpts=orgRefSubjects().map(function(x){return wOpt(String(x.id),x.name,s.subjectId)}).join("");
      return '<div class="ac-repeat-row">'+
        '<div class="form-group"><label>'+t("المادة","Subject")+'</label><select id="ac-org-sub-'+i+'-subject">'+subjOpts+'</select></div>'+
        '<div class="form-group"><label>'+t("لغة التدريس","Language")+'</label><select id="ac-org-sub-'+i+'-lang">'+
          [["AR",t("العربية","Arabic")],["EN",t("الإنجليزية","English")]]
            .map(function(x){return wOpt(x[0],x[1],s.languageCode)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("الرسوم","Fee")+'</label><input id="ac-org-sub-'+i+'-amount" type="number" min="0" step="0.01" value="'+esc(s.amount)+'" placeholder="—"></div>'+
        '<div class="form-group"><label>'+t("العملة","Currency")+'</label><select id="ac-org-sub-'+i+'-currency">'+
          ["YER","SAR","USD"].map(function(c){return wOpt(c,c,s.currency)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("الدورية","Billing")+'</label><select id="ac-org-sub-'+i+'-frequency">'+
          [["yearly",t("سنوي","Yearly")],["termly",t("فصلي","Termly")],["monthly",t("شهري","Monthly")]]
            .map(function(x){return wOpt(x[0],x[1],s.frequency)}).join("")+'</select></div>'+
        '<button type="button" class="crud delete" title="'+t("حذف المادة","Remove subject")+'" onclick="acOrgSubjectRemove('+i+')">'+icon("trash",14)+'</button>'+
        '</div>'}).join("");
    var subjectsStep=
      '<div class="core-h3-row ac-field-wide uf-wide"><h3 class="core-h3">'+
        t("المواد واللغات المعتمدة","Subjects and approved languages")+'</h3>'+
        '<button type="button" class="btn" onclick="acOrgSubjectAdd()">'+icon("plus",14)+' '+t("إضافة مادة","Add subject")+'</button></div>'+
      (subjectRows||'<div class="empty-state">'+t("لم تُضف مواد بعد.","No subjects yet.")+'</div>')+
      '<div class="ac-subfield ac-field-wide uf-wide"><h3 class="core-h3">'+
        t("مادة غير موجودة في الكتالوج العام","A subject missing from the global catalog")+'</h3>'+
        '<div class="ac-repeat-row">'+
        '<div class="form-group"><label>'+t("اسم المادة (عربي)","Subject name (Arabic)")+'</label>'+
        '<input id="ac-org-newsub-ar" value="" placeholder="'+t("مثال: الروبوتات","e.g. Robotics")+'"></div>'+
        '<div class="form-group"><label>'+t("اسم المادة (إنجليزي)","Subject name (English)")+'</label>'+
        '<input id="ac-org-newsub-en" dir="ltr" value=""></div>'+
        '<button type="button" class="btn brown" onclick="acOrgProposeSubject()">'+icon("plus",14)+' '+
        t("إرسال للاعتماد","Submit for approval")+'</button></div>'+
        '<p class="ac-hint">'+t("تُضاف المادة لهذه المؤسسة وتبقى بانتظار اعتماد المدير العام. لغة التدريس والرسوم تُضبطان في سطر المادة.",
          "The subject is added for this institution and stays pending platform-admin approval. Its language and fee are set on the subject row.")+'</p></div>';

    var docTypes=[["license",t("ترخيص","Licence")],["ownership",t("إثبات ملكية","Ownership")],
      ["authorization",t("تفويض","Authorization")],["registration",t("تسجيل","Registration")],
      ["accreditation",t("اعتماد","Accreditation")],["other",t("أخرى","Other")]];
    var docList=f.docs.map(function(d,i){
      return '<div class="ac-repeat-row">'+
        '<div class="form-group"><label>'+t("النوع","Type")+'</label>'+
        '<input value="'+esc((docTypes.filter(function(x){return x[0]===d.docType})[0]||["",d.docType])[1])+'" readonly></div>'+
        '<div class="form-group"><label>'+t("الملف","File")+'</label><input value="'+esc(d.name||"")+'" readonly></div>'+
        '<div class="form-group"><label>'+t("الحالة","Status")+'</label><div>'+
        (d.uploaded?'<span class="badge wait">'+esc(statusLabel(d.status||"pending"))+'</span>':
          '<span class="badge wait">'+t("سيُرفع عند الحفظ","uploads on save")+'</span>')+
        '</div></div>'+
        '<button type="button" class="crud delete" title="'+t("حذف","Remove")+'" onclick="acOrgDocRemove('+i+')">'+icon("trash",14)+'</button>'+
        '</div>'}).join("");
    var documentsStep=
      '<div class="core-h3-row ac-field-wide uf-wide"><h3 class="core-h3">'+
        t("التراخيص والاعتمادات","Licences and accreditation")+'</h3></div>'+
      (docList||'<div class="empty-state">'+t("لا وثائق مرفوعة بعد.","No documents uploaded yet.")+'</div>')+
      '<div class="ac-subfield ac-field-wide uf-wide"><h3 class="core-h3">'+t("رفع وثيقة","Upload a document")+'</h3>'+
      '<div class="ac-repeat-row">'+
      '<div class="form-group"><label>'+t("نوع الوثيقة","Document type")+'</label>'+
      '<select id="ac-org-doc-type">'+docTypes.map(function(x){return wOpt(x[0],x[1],"license")}).join("")+'</select></div>'+
      '<div class="form-group"><label>'+t("الملف (PDF أو صورة، 10 ميجابايت)","File (PDF or image, up to 10 MB)")+'</label>'+
      '<input type="file" id="ac-org-doc-file" accept="application/pdf,image/jpeg,image/png,image/webp"></div>'+
      '<button type="button" class="btn" onclick="acOrgDocAdd()">'+icon("download",14)+' '+t("إضافة الوثيقة","Add document")+'</button>'+
      '</div><p class="ac-hint">'+
      t("الوثائق خاصة ولا تُعرض للزوار؛ تُرفع إلى ملف المؤسسة للمراجعة.",
        "Documents are private and are not shown to visitors; they go to the institution file for review.")+'</p></div>';

    var stepBodies={basic:basicStep,offering:offeringStep,subjects:subjectsStep,documents:documentsStep};
    var idx=orgStepIndex(f.tab);
    return formPage({back:route(),error:f._error,busy:f._busy,
      onSave:"acOrgSave()",onCancel:"acOrgFormClose()",
      title:f.mode==="edit"?t("تعديل مؤسسة","Edit institution"):t("إضافة مؤسسة","Add institution"),
      subtitle:t("بيانات المؤسسة, ثم مراحلها ورسومها, ثم موادها, ثم وثائقها.",
        "The institution's record, then its stages and fees, then its subjects, then its documents."),
      tabs:'<div class="ac-field-wide uf-wide">'+ufTabStrip(orgStepDefs(),f.tab,"acOrgTab")+'</div>',
      body:(stepBodies[f.tab]||basicStep),
      actions:ufWizardFooter({index:idx,total:orgStepDefs().length,
        busy:f._busy,onCancel:"acOrgFormClose()",
        onBack:"acOrgStep(-1)",onNext:"acOrgStep(1)",onSave:"acOrgSave()"})});
  }
  // The dedicated route is also the entry point on a refresh or a shared link, so
  // "edit" resolves its row from whatever list is already cached and falls back
  // to the single-institution endpoint when the list was never loaded.
  function adminOrgFormPage(){
    if(!ac.orgForm){
      var id=routeSubId();
      if(routeSub()==="edit"&&id){
        var row=null;
        Object.keys(ac.cache).forEach(function(k){if(k.indexOf("institutions:")===0){
          ((ac.cache[k]||{}).items||[]).forEach(function(x){if(String(x.id)===String(id))row=x})}});
        if(row)acOrgFormInit("edit",row);
        else{ac.orgForm={mode:"edit",row:null,gov:"",govId:"",dist:"",_error:null,draft:{},
          tab:"basic",stages:[],subjects:[],docs:[],_refsLoaded:false,_loading:true};
          apiGet("/api/organizations/"+encodeURIComponent(id)).then(function(r){ac.orgForm.row=r;
            ac.orgForm.gov=r.governorate||"";ac.orgForm.dist=r.district||"";
            ac.orgForm._loading=false;acOrgLoadRefs();render()})
            .catch(function(e){ac.orgForm._error=errorText(e);ac.orgForm._loading=false;render()})}
      } else acOrgFormInit("add",null);
    }
    var f=ac.orgForm;
    if(f&&f._loading)return formPage({back:route(),title:t("إضافة مؤسسة","Add institution"),
      body:'<div class="loading-inline"><div class="loader"></div></div>',onSave:"",busy:true});
    return adminOrgForm();
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

  // The teacher add/edit form is a wizard of four ordered steps, one concern each:
  // who the teacher is, what they teach (and where, and for how much), when they
  // are free, and what they are qualified in. Each step is a real editing surface —
  // not a placeholder waiting for a pop-up — and the fields are distributed so no
  // step is overloaded: teaching modes belong with the subject they price, and the
  // academic stages belong with the qualifications they describe.
  var TEACHER_FORM_TABS=[["basic","البيانات الأساسية"],["subjects","المواد والأسعار والعروض"],
    ["availability","أوقات التوفر والجدول"],["qualifications","المؤهلات والخبرات"]];
  var TEACHER_FORM_TABS_EN=[["basic","Basic info"],["subjects","Subjects, pricing and offers"],
    ["availability","Availability and schedule"],["qualifications","Qualifications and experience"]];
  function teacherStepDefs(){return lang==="ar"?TEACHER_FORM_TABS:TEACHER_FORM_TABS_EN}
  function teacherStepIndex(tab){
    var d=teacherStepDefs();
    for(var i=0;i<d.length;i++){if(d[i][0]===tab)return i}
    return 0;
  }
  function teacherStepLabel(tab){
    var d=teacherStepDefs();
    for(var i=0;i<d.length;i++){if(d[i][0]===tab)return d[i][1]}
    return tab;
  }
  window.acTeacherFormTab=function(tab){
    var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();
    f.tab=tab;render();
  };
  // Prev/Next move one step and sync the draft first, so a value typed on the
  // current step is never lost by the re-render that shows the next one.
  window.acTeacherStep=function(delta){
    var f=ac.teacherForm;if(!f)return;
    acTeacherDraft();
    var d=teacherStepDefs();
    var i=Math.max(0,Math.min(d.length-1,teacherStepIndex(f.tab)+delta));
    f.tab=d[i][0];render();
  };

  // What each step requires. Declared once, with the step that owns each field, so
  // the guard and the "jump to the offending step" behaviour cannot disagree.
  function teacherRequiredRules(){
    var isAdd=ac.teacherForm&&ac.teacherForm.mode==="add";
    var rules=[
      {tab:"basic",id:"ac-t-name",label:t("الاسم الكامل (عربي)","Full name (Arabic)"),min:2},
      {tab:"basic",id:"ac-t-email",label:t("البريد الإلكتروني","Email"),min:5}
    ];
    if(isAdd)rules.push({tab:"basic",id:"ac-t-password",label:t("كلمة المرور","Password"),min:8});
    // At least one subject, priced: a teacher with nothing to teach cannot be
    // offered, and the price is what a parent comes to see.
    rules.push({tab:"subjects",id:"ac-t-sub-0-amount",kind:"number",label:t("سعر المادة","Subject price")});
    rules.push({tab:"subjects",id:"ac-t-sub-0-mode",label:t("مكان التدريس","Teaching place")});
    return rules;
  }
  // The row-level rule needs a friendlier message than "field missing" when the
  // teacher simply has not added a subject yet. Steps are walked in order, so a
  // problem on step 1 is reported before a problem on step 2 — the user fixes the
  // form from the beginning instead of being sent back and forth.
  function teacherFirstProblem(){
    var f=ac.teacherForm;
    var rules=teacherRequiredRules();
    var order=teacherStepDefs().map(function(x){return x[0]});
    for(var s=0;s<order.length;s++){
      var step=order[s];
      if(step==="subjects"&&f&&!(f.subjects||[]).length)
        return {tab:"subjects",id:"ac-t-subject-add",label:t("أضف مادة واحدة على الأقل","Add at least one subject")};
      var hit=ufValidate(rules.filter(function(r){return r.tab===step}));
      if(hit)return hit;
    }
    return null;
  }

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

  window.acTeacherFormOpen=function(mode,r){acTeacherFormInit(mode,r);
    var target=route()+(mode==="edit"?"/edit/"+encodeURIComponent(r.id):"/new");
    if(("#/"+target)===location.hash)render();else go(target)};
  function acTeacherFormInit(mode,r){
    ac.teacherForm={mode:mode,row:r||null,_error:null,draft:{},showPass:false,
      tab:"basic",
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
          currency:s.currency||"YER",billingPeriod:s.billingPeriod||"hourly",languageCode:s.languageCode||"AR",
          locationMode:s.locationMode||"",
          discountPercent:s.discountPercent==null?"":s.discountPercent,promoLabel:s.promoLabel||""}});
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
  };
  window.acTeacherFormClose=function(){ac.teacherForm=null;
    var target=route();if(("#/"+target)===location.hash)render();else go(target)};
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
    if(!pick){f._error=t("لا توجد مادة متاحة للإضافة. اقترح مادة جديدة من الحقول أدناه.","No subject left to add. Propose a new one from the fields below.");return render()}
    // The place starts unchosen so the admin makes the decision explicitly; the
    // strict guard refuses to save a priced subject that does not say where it is
    // taught.
    f.subjects.push({subjectId:pick,amount:"",currency:"YER",billingPeriod:"hourly",languageCode:"AR",
      locationMode:"",discountPercent:"",promoLabel:""});
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
      if(el("mode"))s.locationMode=el("mode").value;
      if(el("discount"))s.discountPercent=String(el("discount").value||"").trim();
      if(el("promo"))s.promoLabel=String(el("promo").value||"").trim();
      if(el("subject"))s.subjectId=el("subject").value})}
  // A subject the catalog lacks is proposed from real fields inside the step, not
  // from a browser prompt: the values are visible, reviewable and part of the form.
  window.acTeacherProposeSubject=function(){
    var f=ac.teacherForm;if(!f||f._busy)return;
    acTeacherDraft();
    var nameEl=document.getElementById("ac-t-newsub-ar");
    var enEl=document.getElementById("ac-t-newsub-en");
    var name=nameEl?String(nameEl.value||"").trim():"";
    var nameEn=enEl?String(enEl.value||"").trim():"";
    if(name.length<2){
      f._error=t("اكتب اسم المادة بالعربية (حرفان على الأقل) قبل الإرسال.",
                 "Enter the subject name in Arabic (at least two characters) before submitting.");
      ufPendingInvalid={tab:"subjects",id:"ac-t-newsub-ar",label:t("اسم المادة (عربي)","Subject name (Arabic)")};
      render();return;
    }
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
    if(f.mode==="edit"&&!f.row){f._error=t("تعذر تحميل المعلم. أعد المحاولة من القائمة.","Could not load the teacher. Retry from the list.");render();return}
    acTeacherDraft();
    // Strict validation before anything is sent. A missing required field on any
    // step stops the save, opens the step that owns it, rings the field and says
    // what is missing — the submission never becomes a half-written record.
    var problem=teacherFirstProblem();
    if(problem){
      problem.tabLabel=teacherStepLabel(problem.tab);
      f.tab=problem.tab;
      f._error=ufValidationMessage(problem);
      ufPendingInvalid=problem;
      render();return;
    }
    var body={
      name:wVal("ac-t-name"),nameEn:wVal("ac-t-name-en"),bio:wVal("ac-t-bio"),
      headline:wVal("ac-t-headline"),gender:wVal("ac-t-gender"),
      phone:wVal("ac-t-phone"),whatsapp:wVal("ac-t-whatsapp")||wVal("ac-t-phone"),
      addressLine:wVal("ac-t-address"),skills:wVal("ac-t-skills"),
      countryId:wVal("ac-t-country")||null,
      governorateId:wVal("ac-t-gov")||null,districtId:wVal("ac-t-dist")||null,neighborhoodId:wVal("ac-t-hood")||null,
      // The profile photo is uploaded first; the form only carries the stored path.
      avatarUrl:ufUploadPath("ac-t-avatar-upload")
    };
    var exp=wVal("ac-t-exp");if(exp!=="")body.experienceYears=Number(exp);
    body.stageIds=f.stages;
    body.subjects=f.subjects.map(function(s){
      return{subjectId:Number(s.subjectId),amount:s.amount===""?null:Number(s.amount),
        currency:s.currency,billingPeriod:s.billingPeriod,languageCode:s.languageCode,
        locationMode:s.locationMode||null,
        // An empty discount is "no promotion", which the server stores as NULL
        // and reads back as undefined — never as a 0% discount.
        discountPercent:(s.discountPercent==null||s.discountPercent==="")?null:Number(s.discountPercent),
        promoLabel:s.promoLabel||null}});
    // The place of each lesson is the per-subject answer, so the teacher-level
    // flags the directory filters on are derived from those rows — one source of
    // truth, and the server re-derives them the same way.
    var modeList=body.subjects.map(function(s){return s.locationMode}).filter(Boolean);
    body.offersOnline=modeList.indexOf("online")>-1;
    body.travelsToStudentHome=modeList.indexOf("student_home")>-1;
    body.acceptsStudentHome=modeList.indexOf("teacher_location")>-1;
    body.qualifications=f.quals.map(function(q){return{title:q.title,institutionName:q.institutionName,degree:q.degree,year:q.year}}) .filter(function(q){return q.title});
    var el2=function(id){return document.getElementById(id)};
    if(el2("ac-t-skill-input")){var extra=String(el2("ac-t-skill-input").value||"").trim();if(extra)body.skills=(body.skills?body.skills+", ":"")+extra}
    if(f.mode==="add"){
      body.email=wVal("ac-t-email");body.password=wVal("ac-t-password");
    }
    body.availability=f.avails.map(function(s){
      return{dayOfWeek:s.dayOfWeek,startTime:s.startTime,endTime:s.endTime,locationMode:s.locationMode}});
    if(f.mode==="edit")body.status=wVal("ac-t-status")||"active";
    if(f.mode==="edit")body.verificationStatus=wVal("ac-t-verif")||"pending";
    f._busy=true;
    var req=f.mode==="add"?apiPost("/api/teachers",body):apiPatch("/api/teachers/"+f.row.id,body);
    req.then(function(){
      ac.teacherForm=null;invalidate("teachers:");delete ac.cache.teacherDeletions;delete ac.cache.dashboard;
      var target=route();if(("#/"+target)===location.hash)render();else go(target)})
      .catch(function(e){f._busy=false;f._error=errorText(e);render()})};

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
    "ac-t-headline","ac-t-exp","ac-t-gender","ac-t-skills","ac-t-bio","ac-t-password",
    // The upload control keeps the stored path in a hidden input, so the path the
    // admin just uploaded survives a step switch the same way a typed value does.
    "ac-t-avatar-upload-val"];
  function acTeacherVal(f,id,fallback){
    if(f.draft[id]!=null)return f.draft[id];
    return fallback==null?"":String(fallback)}
  function acTeacherDraft(){var f=ac.teacherForm;if(!f)return;
    AC_TEACHER_FORM_IDS.forEach(function(id){var el=document.getElementById(id);if(el)f.draft[id]=el.value});
    acTeacherSubjectSync();acTeacherQualSync();acTeacherAvailSync()}
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


  // The step strip sits at the top of the form card and spans both grid tracks.
  function teacherFormTabBar(f){
    return '<div class="ac-field-wide uf-wide">'+ufTabStrip(teacherStepDefs(),f.tab,"acTeacherFormTab")+'</div>';
  }
  // Where a lesson happens, as a per-subject choice. Same three values the weekly
  // availability uses, so "online" means one thing across the whole profile.
  function teacherModeOptions(selected){
    var modes=(teacherCatalog()||{}).availabilityModes||["online","student_home","teacher_location"];
    return wOpt("",t("— اختر مكان التدريس —","— Choose the place —"),selected||"")+
      modes.map(function(m){return wOpt(m,acTeacherSlotModeLabel(m),selected||"")}).join("");
  }

  function adminTeacherForm(){
    var f=ac.teacherForm;if(!f)return "";
    var cat=teacherCatalog();
    if(!cat)return formPage({back:route(),title:t("إضافة معلم","Add teacher"),
      body:'<div class="loading-inline"><div class="loader"></div></div>',onSave:"",busy:true});
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

    /* ---- step 2: one priced row per subject, including where it is taught ---- */
    var subjectRows=f.subjects.map(function(s,i){
      return '<div class="ac-repeat-row ac-subject-row">'+
        '<div class="form-group"><label>'+t("المادة","Subject")+'</label><select id="ac-t-sub-'+i+'-subject">'+acTeacherSubjectOptions(s.subjectId)+'</select></div>'+
        '<div class="form-group"><label>'+t("السعر","Price")+'</label><input id="ac-t-sub-'+i+'-amount" type="number" min="0" step="0.01" value="'+esc(s.amount)+'" placeholder="0.00"></div>'+
        '<div class="form-group"><label>'+t("العملة","Currency")+'</label><select id="ac-t-sub-'+i+'-currency">'+
          TEACHER_CURRENCIES.map(function(c){return wOpt(c,teacherCurrencyLabel(c),s.currency)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("الدورية","Billing")+'</label><select id="ac-t-sub-'+i+'-period">'+
          TEACHER_PERIODS.map(function(p){return wOpt(p,teacherPeriodLabel(p),s.billingPeriod)}).join("")+'</select></div>'+
        '<div class="form-group"><label>'+t("لغة التدريس","Teaching language")+'</label><select id="ac-t-sub-'+i+'-lang">'+
          TEACHER_LANGUAGES.map(function(l){return wOpt(l,teacherLangLabel(l),s.languageCode)}).join("")+'</select></div>'+
        // The place belongs with the price: an online lesson and a lesson at the
        // student's home are two different offers, not one flag on the profile.
        '<div class="form-group"><label>'+t("مكان التدريس *","Teaching place *")+'</label><select id="ac-t-sub-'+i+'-mode">'+
          teacherModeOptions(s.locationMode)+'</select></div>'+
        // The promotion rides on the same priced row as the list price, so a
        // discount can never contradict the amount it discounts.
        '<div class="form-group"><label>'+t("الخصم %","Discount %")+'</label><input id="ac-t-sub-'+i+'-discount" type="number" min="0" max="100" step="0.01" dir="ltr" value="'+esc(s.discountPercent==null?"":s.discountPercent)+'" placeholder="—"></div>'+
        '<div class="form-group"><label>'+t("عنوان العرض","Promo label")+'</label><input id="ac-t-sub-'+i+'-promo" value="'+esc(s.promoLabel||"")+'" placeholder="'+t("مثال: عرض بداية العام","e.g. Back-to-school offer")+'"></div>'+
        '<button type="button" class="crud delete" title="'+t("حذف المادة","Remove subject")+'" onclick="acTeacherSubjectRemove('+i+')">'+icon("trash",14)+'</button>'+
        '</div>'}).join("");

    /* ---- step 3: weekly windows ---- */
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

    /* ---- step 4: qualifications ---- */
    var qualRows=f.quals.map(function(q,i){
      return '<div class="ac-repeat-row">'+
        '<div class="form-group"><label>'+t("المؤهل","Qualification")+'</label><input id="ac-t-qual-'+i+'-title" value="'+esc(q.title)+'" placeholder="'+t("مثال: بكالوريوس فيزياء","e.g. BSc Physics")+'"></div>'+
        '<div class="form-group"><label>'+t("الجهة","Institution")+'</label><input id="ac-t-qual-'+i+'-institutionName" value="'+esc(q.institutionName)+'"></div>'+
        '<div class="form-group"><label>'+t("الدرجة","Degree")+'</label><input id="ac-t-qual-'+i+'-degree" value="'+esc(q.degree)+'"></div>'+
        '<div class="form-group"><label>'+t("السنة","Year")+'</label><input id="ac-t-qual-'+i+'-year" type="number" min="1950" max="2100" value="'+esc(q.year)+'"></div>'+
        '<button type="button" class="crud delete" title="'+t("حذف المؤهل","Remove qualification")+'" onclick="acTeacherQualRemove('+i+')">'+icon("trash",14)+'</button>'+
        '</div>'}).join("");
    // The academic stages describe what the teacher is qualified to teach, so they
    // live with the qualifications rather than among the contact details.
    var stageChips=cat.stages.map(function(st){
      var on=f.stages.indexOf(String(st.id))>-1;
      return '<button type="button" class="core-chip'+(on?"":" off")+'" onclick="acTeacherStageToggle(\''+st.id+'\')">'+
        (on?icon("check",12):icon("plus",12))+' '+esc(st.name)+'</button>'}).join("");

    var curStatus=val("ac-t-status",row.status||"active");
    var curVerif=val("ac-t-verif",row.verificationStatus||"pending");

    /* ---- the four steps ---- */
    var basicStep=
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
      '<div class="form-group"><label>'+t("واتساب","WhatsApp")+'</label><input id="ac-t-whatsapp" dir="ltr" value="'+esc(val("ac-t-whatsapp",row.whatsapp))+'" placeholder="+967 7XX XXX XXX"></div>'+
      wInput(t("العنوان المهني","Professional headline"),"ac-t-headline",val("ac-t-headline",row.headline),t("مثال: معلم رياضيات خبرة 10 سنوات","e.g. Math teacher, 10 years experience"),true)+
      wInput(t("سنوات الخبرة","Years of experience"),"ac-t-exp",val("ac-t-exp",row.experienceYears),t("السنوات","years"))+
      '<div class="form-group"><label>'+t("الجنس","Gender")+'</label><select id="ac-t-gender">'+
        wOpt("",t("غير محدد","Unspecified"),val("ac-t-gender",row.gender))+
        wOpt("male",t("ذكر","Male"),val("ac-t-gender",row.gender))+
        wOpt("female",t("أنثى","Female"),val("ac-t-gender",row.gender))+'</select></div>'+
      wInput(t("المهارات (مفصولة بفاصلة)","Skills (comma separated)"),"ac-t-skills",val("ac-t-skills",(row.skills||[]).join(", ")),t("برمجة, روبوتيكس, مختبرات","Programming, robotics, labs"),true)+
      wArea(t("نبذة","Bio"),"ac-t-bio",val("ac-t-bio",row.bio))+
      // A real upload with a preview and change/remove, not a path the admin has to
      // know. The stored path is what the form submits.
      ufImageUpload("ac-t-avatar-upload",t("الصورة الشخصية","Profile photo"),val("ac-t-avatar-upload-val",row.avatarUrl),"avatars",
        {hint:t("JPG أو PNG أو WEBP، بحد أقصى 4 ميجابايت.","JPG, PNG or WEBP, up to 4 MB.")})+
      wSel(t("البلد","Country"),"ac-t-country",countryOptions,"","acTeacherCountry()")+
      wSel(t("المحافظة","Governorate"),"ac-t-gov",teacherGovOptions(f.countryCode,f.govId),"","acTeacherGov()")+
      wSel(t("المديرية","District"),"ac-t-dist",teacherDistrictOptions(f.govId,f.distId),"","acTeacherDistrict()")+
      wSel(t("الحي","Neighbourhood"),"ac-t-hood",teacherHoodOptions(f.distId,f.hoodId),"","acTeacherNeighborhood()")+
      wInput(t("العنوان التفصيلي","Street address"),"ac-t-address",val("ac-t-address",row.addressLine),t("الشارع / أقرب معلم","Street / nearest landmark"),true)+
      (isAdd?"":wSel(t("الحالة","Status"),"ac-t-status",
        wOpt("active",t("نشط","Active"),curStatus)+wOpt("inactive",t("غير نشط","Inactive"),curStatus)+
        wOpt("suspended",t("موقوف","Suspended"),curStatus)))+
      (isAdd?"":wSel(t("التحقق","Verification"),"ac-t-verif",
        wOpt("pending",t("بانتظار التحقق","Pending"),curVerif)+wOpt("verified",t("موثق","Verified"),curVerif)+
        wOpt("rejected",t("مرفوض","Rejected"),curVerif)));

    var subjectsStep=
      '<div class="core-h3-row ac-field-wide uf-wide"><h3 class="core-h3">'+
        t("المواد: لكل مادة سعرها ومكان تدريسها","Subjects: a price and a place each")+'</h3>'+
        '<div class="ac-row-actions">'+
        '<button type="button" class="btn" id="ac-t-subject-add" onclick="acTeacherSubjectAdd()">'+icon("plus",14)+' '+
        t("إضافة مادة من الكتالوج","Add a catalog subject")+'</button></div></div>'+
      (subjectRows||'<div class="empty-state">'+t("لم تُضف مواد بعد. أضف مادة من الكتالوج، أو اقترح مادة جديدة بالأسفل.",
        "No subjects yet. Add one from the catalog, or propose a new one below.")+'</div>')+
      // A subject the catalog lacks is proposed with real fields, not a browser
      // prompt, and stays pending until the platform admin approves it.
      '<div class="ac-subfield ac-field-wide uf-wide"><h3 class="core-h3">'+
        t("مادة غير موجودة في الكتالوج العام","A subject missing from the global catalog")+'</h3>'+
        '<div class="ac-repeat-row">'+
        '<div class="form-group"><label>'+t("اسم المادة (عربي)","Subject name (Arabic)")+'</label>'+
        '<input id="ac-t-newsub-ar" value="" placeholder="'+t("مثال: الروبوتات","e.g. Robotics")+'"></div>'+
        '<div class="form-group"><label>'+t("اسم المادة (إنجليزي)","Subject name (English)")+'</label>'+
        '<input id="ac-t-newsub-en" dir="ltr" value=""></div>'+
        '<button type="button" class="btn brown" '+(f._busy?"disabled":"")+' onclick="acTeacherProposeSubject()">'+
        icon("plus",14)+' '+t("إرسال للاعتماد","Submit for approval")+'</button>'+
        '</div><p class="ac-hint">'+t("تُضاف المادة لهذه المنصة بانتظار اعتماد المدير العام، وتُختار تلقائياً بعد الاعتماد.",
          "The subject is submitted for platform-admin approval and selected automatically once approved.")+'</p></div>';

    var availabilityStep=
      '<div class="core-h3-row ac-field-wide uf-wide"><h3 class="core-h3">'+t("أوقات التوفر الأسبوعية","Weekly availability")+'</h3>'+
        '<button type="button" class="btn" onclick="acTeacherAvailAdd()">'+icon("plus",14)+' '+t("إضافة وقت","Add slot")+'</button></div>'+
      (availRows||'<div class="empty-state">'+t("لم تُضف أوقات توفر بعد. أضف وقتاً لكل نافذة يستقبل فيها المعلم الحجوزات.",
        "No availability yet. Add a slot for each window the teacher accepts bookings.")+'</div>');

    var qualificationsStep=
      '<div class="core-h3-row ac-field-wide uf-wide"><h3 class="core-h3">'+t("المؤهلات والخبرات","Qualifications and experience")+'</h3>'+
        '<button type="button" class="btn" onclick="acTeacherQualAdd()">'+icon("plus",14)+' '+t("إضافة مؤهل","Add qualification")+'</button></div>'+
      (qualRows||'<div class="empty-state">'+t("لم تُضف مؤهلات بعد.","No qualifications added yet.")+'</div>')+
      // The stages sit here because they describe what the teacher is qualified for.
      '<div class="form-group ac-field-wide uf-wide"><label>'+t("المستويات والدرجات العلمية التي يدرّسها","Academic stages and levels taught")+'</label>'+
        '<div class="core-chips">'+(stageChips||'<span class="gated-value">'+t("لا مراحل في الكتالوج العام.","No stages in the global catalog.")+'</span>')+'</div>'+
        '<small class="ac-hint">'+t("اختر كل مستوى يستطيع تدريسه.","Select every level the teacher can teach.")+'</small></div>';

    var stepBodies={basic:basicStep,subjects:subjectsStep,availability:availabilityStep,qualifications:qualificationsStep};
    var idx=teacherStepIndex(f.tab);

    return formPage({back:route(),error:f._error,busy:f._busy,
      onSave:"acTeacherSave()",onCancel:"acTeacherFormClose()",
      title:isAdd?t("إضافة معلم","Add teacher"):t("تعديل بيانات المعلم","Edit teacher"),
      subtitle:t("المعلم مستقل: حساب دخول، مواد بأسعارها ومكان تدريسها، أوقات توفر، مؤهلات وموقع.",
        "A teacher is independent: login account, per-subject price and place, availability, qualifications and location."),
      tabs:teacherFormTabBar(f),
      body:(stepBodies[f.tab]||basicStep),
      actions:ufWizardFooter({index:idx,total:teacherStepDefs().length,
        busy:f._busy,onCancel:"acTeacherFormClose()",
        onBack:"acTeacherStep(-1)",onNext:"acTeacherStep(1)",onSave:"acTeacherSave()"})});
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
        // The list price stays visible and the promotion is shown next to it, so
        // a discounted subject can never look like a cheaper list price.
        var price='<span dir="ltr" class="ltr-num">'+(s.amount==null?"—":esc(s.amount))+'</span>';
        var promo="";
        if(s.discountPercent!=null&&Number(s.discountPercent)>0){
          var net=Number(s.amount||0)*(1-Number(s.discountPercent)/100);
          promo='<div class="entity-sub"><span class="badge ok">'+esc(String(s.discountPercent))+'%</span> '+
            '<span dir="ltr" class="ltr-num">'+esc(net.toFixed(2))+'</span></div>'+
            (s.promoLabel?'<div class="entity-sub">'+esc(s.promoLabel)+'</div>':"");
        }
        return '<tr><td><b>'+esc(s.name)+'</b></td>'+
          // Where this subject is taught sits next to its price: the two are one
          // offer, so the reader never has to look in a different panel for it.
          '<td>'+esc(s.locationMode?acTeacherSlotModeLabel(s.locationMode):"—")+'</td>'+
          '<td>'+price+promo+'</td>'+
          '<td>'+esc(s.currency||"—")+'</td>'+
          '<td>'+esc(teacherPeriodLabel(s.billingPeriod))+'</td>'+
          '<td>'+esc(teacherLangLabel(s.languageCode))+'</td>'+
          '<td>'+(s.isActive===false?badge("inactive"):badge("active"))+'</td></tr>'}).join("");
      body+='<div class="panel core-panel"><div class="panel-title"><h3>'+t("المواد الدراسية والأسعار","Subjects and pricing")+'</h3>'+
        '<button class="btn green" onclick="acTeacherEdit(\''+r.id+'\')">'+icon("edit",14)+' '+t("تعديل الأسعار","Edit prices")+'</button></div>'+
        '<p class="ac-hint">'+t("كل مادة يحملها المعلم لها مكان تدريسها وسعرها وعملتها ودوريتها ولغتها الخاصة — الرسوم ليست على مستوى المنصة.",
          "Every subject a teacher carries has its own teaching place, price, currency, billing period and language — nothing is priced at platform level.")+'</p>'+
        '<div class="table-wrap"><table class="tbl"><thead><tr>'+
        ['المادة','مكان التدريس','السعر','العملة','الدورية','لغة التدريس','الحالة'].map(function(h){return '<th>'+t(h,h)+'</th>'}).join("")+
        '</tr></thead><tbody>'+(rows||'<tr><td colspan="7">'+t("لا مواد مسجلة.","No subjects recorded.")+'</td></tr>')+'</tbody></table></div></div>';
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
      .concat((r.subjects||[]).map(function(s){return[s.name,s.locationMode?acTeacherSlotModeLabel(s.locationMode):"",s.amount==null?"":s.amount,s.currency||"",teacherPeriodLabel(s.billingPeriod),teacherLangLabel(s.languageCode)]}));
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

  // Dedicated teacher add/edit page. A refresh or a shared link arrives with no
  // in-memory draft, so the row is resolved from the visible list first and from
  // the single-teacher endpoint when the list was never loaded.
  function adminTeacherFormPage(){
    if(!ac.teacherForm){
      var id=routeSubId();
      if(routeSub()==="edit"&&id){
        var source=ac.teacherDetail?[ac.teacherDetail.row]:(teacherRows()||[]);
        var row=null;
        for(var i=0;i<source.length;i++){if(source[i]&&String(source[i].id)===String(id))row=source[i]}
        if(row)acTeacherFormInit("edit",row);
        else{
          ac.teacherForm={mode:"edit",row:null,_error:null,draft:{},showPass:false,
            countryCode:"",countryId:"",govId:"",distId:"",hoodId:"",
            subjects:[],stages:[],quals:[],avails:[],_loading:true};
          teacherLoadCatalog();
          apiGet("/api/teachers/"+encodeURIComponent(id)).then(function(r){
            acTeacherFormInit("edit",r);ac.teacherForm._loading=false;render()})
            .catch(function(e){ac.teacherForm._error=errorText(e);ac.teacherForm._loading=false;render()});
        }
      } else acTeacherFormInit("add",null);
    }
    var f=ac.teacherForm;
    if(f&&f._loading)return formPage({back:route(),title:t("تعديل بيانات المعلم","Edit teacher"),
      body:'<div class="loading-inline"><div class="loader"></div></div>',onSave:"",busy:true});
    return adminTeacherForm();
  }

  window.adminTeachersPage=function(){
    // The add/edit screen is its own route (#/teachersAdmin/new, …/edit/:id).
    var sub=routeSub();
    if(sub==="new"||sub==="edit")return adminTeacherFormPage();
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
    // The whole card is the target: a click anywhere opens the institution, and
    // the action buttons inside stop propagation so a verify or archive never
    // doubles as a visit. tabindex + Enter keeps that reachable by keyboard.
    var open="go('detail?id="+o.id+"')";
    return '<article class="org-card" tabindex="0" role="link" onclick="'+open+
      '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();'+open+'}" aria-label="'+esc(o.name)+'">'+
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
      '<button class="btn green" onclick="event.stopPropagation();'+open+'">'+icon("eye",14)+' '+t("التفاصيل","Details")+'</button>'+
      (wa?'<span onclick="event.stopPropagation()">'+waButton(wa,{compact:true,size:14,label:t("واتساب","WhatsApp")})+'</span>':"")+
      '<button class="crud edit" title="'+t("تعديل","Edit")+'" onclick="event.stopPropagation();acOrgEdit(\''+o.id+'\')">'+icon("edit",14)+'</button>'+
      '</div></article>';
  }
  window.acInstitutionsView=function(v){ac.institutionsView=v;render()};

  window.adminInstitutionsPage=function(group){
    // Add/edit lives on its own route, so this page is either the list or the
    // dedicated form — never both at once and never a pop-up over the table.
    var sub=routeSub();
    if(sub==="new"||sub==="edit")return adminOrgFormPage();
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
    body+='<section class="panel">'+
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
  // Only the platform admin approves an institution's own subject; the service
  // refuses a global catalog row, so this can only ever act on a proposal.
  window.acSubjectReview=function(id,status){
    apiPatch("/api/academic/subjects/"+id+"/review",{status:status}).then(function(){
      invalidate("academic:");render()}).catch(function(e){alert(errorText(e))});
  };

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
  window.acCatalogFormOpen=function(kind){
    ac.academicForm={kind:kind,_error:null,_busy:false,gradeNames:[]};
    var target="academic/"+(kind==="grade"?"grades":"stages")+"/new";
    if(("#/"+target)===location.hash)render();else go(target)};
  window.acCatalogFormClose=function(){ac.academicForm=null;
    var target="academic";if(("#/"+target)===location.hash)render();else go(target)};
  // The grade ladder is typed here and posted with the stage in one call: the
  // service already accepts `grades`, so a stage arrives with its grade names
  // instead of the admin having to add each grade afterwards.
  function acCatalogDraft(){
    var f=ac.academicForm;if(!f)return;
    f.gradeNames=(f.gradeNames||[]).map(function(_,i){
      var el=document.getElementById("ac-cat-grade-"+i);return el?String(el.value||"").trim():""});
  }
  // The grade ladder uses the same repeatable-row pattern as the teacher form:
  // a button appends one named row and a delete button removes it. That keeps the
  // control identical across the platform and avoids a count field that has to be
  // committed before the rows it describes can appear.
  var AC_GRADE_MAX=20;
  window.acCatalogGradeAdd=function(){
    var f=ac.academicForm;if(!f)return;
    acCatalogDraft();
    if((f.gradeNames||[]).length>=AC_GRADE_MAX)return;
    f.gradeNames.push("");render();
  };
  window.acCatalogGradeRemove=function(index){
    var f=ac.academicForm;if(!f)return;
    acCatalogDraft();
    f.gradeNames.splice(index,1);render();
  };
  window.acCatalogSave=function(){
    var f=ac.academicForm;if(!f||f._busy)return;
    acCatalogDraft();
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
      // A named row is what becomes a real grade; a blank row is ignored rather
      // than rejected, so a half-typed ladder never blocks the stage.
      var ladder=(f.gradeNames||[]).filter(function(n){return n!==""});
      if(ladder.length)payload.grades=ladder;
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
      invalidate("academic:");
      var target="academic";if(("#/"+target)===location.hash)render();else go(target)})
      .catch(function(e){f._busy=false;f._error=errorText(e);render()});
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
    var names=f.gradeNames||[];
    var gradeRows='<div class="ac-field-wide uf-wide"><div class="core-h3-row"><h3 class="core-h3">'+
      t("أسماء الصفوف التابعة للمرحلة","Grade names in this stage")+'</h3>'+
      '<button type="button" class="btn" onclick="acCatalogGradeAdd()">'+icon("plus",14)+' '+
      t("إضافة صف","Add grade")+'</button></div>'+
      (names.length?names.map(function(n,i){
        return '<div class="ac-repeat-row">'+
          '<div class="form-group"><label>'+esc(t("الصف","Grade")+" "+(i+1))+'</label>'+
          '<input id="ac-cat-grade-'+i+'" value="'+esc(n)+'" placeholder="'+esc(t("مثال: الأول الثانوي","e.g. First Secondary"))+'"></div>'+
          '<button type="button" class="crud delete" title="'+t("حذف الصف","Remove grade")+'" onclick="acCatalogGradeRemove('+i+')">'+icon("trash",14)+'</button>'+
          '</div>';
      }).join(""):'<div class="empty-state">'+esc(t("لم تُضف صفوف بعد. أضف صفاً واحداً لكل اسم صف تريد إنشاءه مع المرحلة.","No grades yet. Add one row for each grade you want created with the stage."))+'</div>')+
      '</div>';
    return formPage({back:"academic",error:f._error,busy:f._busy,
      onSave:"acCatalogSave()",onCancel:"acCatalogFormClose()",
      title:isGrade?t("إضافة صف","Add grade"):t("إضافة مرحلة","Add stage"),
      subtitle:t("كتالوج عام للمنصة — بدون أسعار ولا سعة.","Global platform catalog — no prices and no capacity."),
      body:wInput(isGrade?t("اسم الصف","Grade name"):t("اسم المرحلة","Stage name"),"ac-cat-name","",
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
      (isGrade?"":
        gradeRows)});
  }
  // The catalog add form owns a route of its own: #/academic/stages/new and
  // #/academic/grades/new. A refresh rebuilds the form state from the URL.
  function academicCatalogFormPage(kind){
    if(!ac.academicForm||ac.academicForm.kind!==kind){
      ac.academicForm={kind:kind,_error:null,_busy:false,gradeNames:[]}}
    else if(!ac.academicForm.gradeNames)ac.academicForm.gradeNames=[];
    if(kind==="grade")load("academic:stages","/api/academic/stages",listOf);
    return acCatalogForm();
  }
  window.academicPage=function(){
    var sub=routeSub();
    if((sub==="stages"||sub==="grades")&&routeSubId()==="new"){
      ac.academicTab=sub;
      return academicCatalogFormPage(sub==="grades"?"grade":"stage");
    }
    var defs={
      stages:["stages",t("المراحل","Stages"),t("أسماء المراحل التعليمية على مستوى المنصة. بدون رسوم أو سعة.","Platform-wide stage names. No fees or capacity here.")],
      grades:["grades",t("الصفوف","Grades"),t("سلم الصفوف مع المسار: علمي / أدبي / عام.","The grade ladder with its track: science / literary / general.")],
      subjects:["subjects",t("المواد العامة","Subjects"),t("أسماء المواد العامة المشتركة.","Shared general subject names.")],
      languages:["languages",t("لغات التدريس","Teaching languages"),t("اللغات المتاحة للتدريس على مستوى المنصة.","Teaching languages available platform-wide.")],
      curricula:["curricula",t("تصنيفات المناهج","Curriculum classifications"),t("وزاري / أهلي / دولي — تصنيف يُربط بالمادة والمرحلة.","National / private / international — attached to subject and stage.")],
      // The institution proposals are not a catalog tab: they are the supervision
      // queue for the "+" an institution used, so the admin reviews them here.
      proposals:["org-subjects",t("مقترحات المؤسسات","Institution proposals"),
        t("مواد أضافتها مؤسسة لنفسها. لا تُعتمد إلا من المدير العام، وقبل ذلك تبقى داخل عرض المؤسسة فقط.",
          "Subjects an institution added for itself. Only the platform admin approves them; until then they stay inside that institution's offering.")]
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
      '<section class="panel"><div class="panel-title"><h2>'+esc(def[1])+'</h2></div>';
    var rows=ac.cache[key];
    if(!rows)body+=state(key);
    else if(!rows.length)body+='<div class="empty-state">'+t("لا توجد بيانات.","No records.")+'</div>';
    else if(ac.academicTab==="proposals")body+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+
      t("المادة","Subject")+'</th><th>'+t("المؤسسة","Institution")+'</th><th>'+t("الحالة","Status")+
      '</th><th></th></tr></thead><tbody>'+rows.map(function(r){
        return '<tr><td><b>'+esc(r.name)+'</b>'+(r.slug?'<div class="entity-sub" dir="ltr">'+esc(r.slug)+'</div>':"")+
          '</td><td>'+esc(r.organizationName||"—")+'</td><td>'+badge(r.reviewStatus||"pending")+'</td>'+
          '<td class="crud-actions">'+
          '<button class="crud verify" title="'+t("اعتماد","Approve")+'" onclick="acSubjectReview('+r.id+',\'approved\')">'+icon("check",14)+'</button>'+
          '<button class="crud delete" title="'+t("رفض","Reject")+'" onclick="acSubjectReview('+r.id+',\'rejected\')">'+icon("x",14)+'</button>'+
          '</td></tr>'}).join("")+'</tbody></table></div>';
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
