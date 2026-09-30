// Client-owned preferences, feedback and transparent activity consent.
(function(){
  var data={userId:null,profile:null,feedback:null,loading:false,error:"",notice:"",lastEvent:"",lastAt:0};
  function label(key){return tr(key)}
  function value(id){var el=document.getElementById(id);return el?el.value.trim():""}
  function ensureUser(){var user=getCurrentUser(),id=user&&user.role==="client"?user.id:null;
    if(data.userId!==id)data={userId:id,profile:null,feedback:null,loading:false,error:"",notice:"",lastEvent:"",lastAt:0}}
  function load(){
    ensureUser();
    if(data.loading||data.profile&&data.feedback||data.error&&!data.profile)return;
    data.loading=true;
    var userId=data.userId;
    Promise.all([apiGet("/api/clients/me/profile"),apiGet("/api/clients/me/feedback")]).then(function(items){
      if(data.userId!==userId)return;
      data.profile=items[0];data.feedback=items[1];data.loading=false;
      if(data.profile.analytics_consent&&data.lastEvent)track("page_view",route());
      render();
    }).catch(function(e){if(data.userId!==userId)return;data.loading=false;data.error=e&&e.message||label("clientLoadError");render()});
  }
  function track(eventType,section,term,place){
    var user=getCurrentUser();if(!user||user.role!=="client"||!data.profile||!data.profile.analytics_consent)return;
    apiPost("/api/clients/me/events",{eventType:eventType,section:section,searchTerm:term||null,locationLabel:place||null}).catch(function(){});
  }
  window.clientTrackRoute=function(section){
    ensureUser();
    var valid=["home","private","government","colleges","institutes","teachers","detail","teacher"];
    var user=getCurrentUser();if(!user||user.role!=="client"||valid.indexOf(section)<0)return;
    if(!data.profile&&!data.loading)load();
    var key=location.hash,now=Date.now();if(key===data.lastEvent&&now-data.lastAt<10000)return;
    data.lastEvent=key;data.lastAt=now;track("page_view",section);
  };
  window.clientTrackSearch=function(section,term,place){
    ensureUser();
    if(!term&&!place)return;
    track("search",section,String(term||"").slice(0,80),String(place||"").slice(0,100));
  };
  window.clientProfileSave=function(){
    var body={clientKind:value("cl-kind"),interests:value("cl-interests"),preferredLocations:value("cl-places"),
      contactPreference:value("cl-contact"),analyticsConsent:!!document.getElementById("cl-consent").checked};
    apiPut("/api/clients/me/profile",body).then(function(p){data.profile=p;data.notice=label("clientSaved");data.error="";render()}).catch(function(e){data.error=e&&e.data&&e.data.error||e.message;render()});
  };
  window.clientFeedbackSend=function(){
    var body=value("cl-feedback");if(body.length<10){data.error=label("clientFeedbackMin");render();return}
    apiPost("/api/clients/me/feedback",{kind:value("cl-feedback-kind"),body:body}).then(function(){
      data.feedback=null;data.notice=label("clientReceived");data.error="";load();
    }).catch(function(e){data.error=e&&e.data&&e.data.error||e.message;render()});
  };
  window.clientDashboard=function(){
    ensureUser();
    var user=getCurrentUser();if(!user||user.role!=="client")return adminShell('<div class="empty-state">'+label("clientLoadError")+'</div>');
    if(!data.profile&&!data.loading)load();
    var p=data.profile||{},items=data.feedback||[];
    var opts=function(values,selected){return values.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===selected?' selected':'')+'>'+x[1]+'</option>'}).join("")};
    var field=function(label,id,val){return '<div class="form-group"><label for="'+id+'">'+label+'</label><input id="'+id+'" value="'+esc(val||"")+'"></div>'};
    var body='<div class="welcome"><div><h1>'+label("clientDashboardTitle")+'</h1><p>'+esc(user.name)+'</p></div></div>'+
      (data.error?'<div class="login-error">'+esc(data.error)+'</div>':"")+(data.notice?'<div class="rg-info">'+esc(data.notice)+'</div>':"");
    if(data.loading&&!data.profile)return adminShell(body+'<div class="loading-inline"><div class="loader"></div></div>');
    body+='<section class="panel" style="padding:20px"><h2>'+label("clientDetails")+'</h2>'+
      '<p>'+label("clientRegisteredLocation")+esc([p.country_code,p.governorate_name,p.district_name].filter(Boolean).join(" · ")||"—")+'</p>'+
      '<div class="form-row2"><div class="form-group"><label for="cl-kind">'+label("clientKind")+'</label><select id="cl-kind">'+opts([
        ["unspecified",label("clientUnspecified")],["visitor",label("clientVisitor")],["student",label("clientStudent")],["parent",label("clientParent")],
        ["both",label("clientBoth")],["other",label("clientOther")]],p.client_kind||"unspecified")+'</select></div>'+
      '<div class="form-group"><label for="cl-contact">'+label("clientContact")+'</label><select id="cl-contact">'+opts([
        ["none",label("clientNoPreference")],["phone",label("clientPhone")],["email",label("clientEmail")],["whatsapp",label("clientWhatsapp")]],p.contact_preference||"none")+'</select></div></div>'+
      '<div class="form-row2">'+field(label("clientInterests"),"cl-interests",p.interests)+field(label("clientPlaces"),"cl-places",p.preferred_locations)+'</div>'+
      '<label><input id="cl-consent" type="checkbox"'+(p.analytics_consent?" checked":"")+'> '+
      label("clientConsent")+'</label>'+
      '<div style="margin-top:16px"><button class="btn green" onclick="clientProfileSave()">'+label("clientSave")+'</button></div></section>'+
      '<section class="panel" style="padding:20px"><h2>'+label("clientFeedbackTitle")+'</h2>'+
      '<div class="form-group"><label for="cl-feedback-kind">'+label("clientFeedbackType")+'</label><select id="cl-feedback-kind">'+opts([
        ["suggestion",label("clientSuggestion")],["complaint",label("clientComplaint")],["inquiry",label("clientInquiry")]],"suggestion")+'</select></div>'+
      '<div class="form-group"><label for="cl-feedback">'+label("clientFeedbackMessage")+'</label><textarea id="cl-feedback" rows="4"></textarea></div>'+
      '<button class="btn green" onclick="clientFeedbackSend()">'+label("clientFeedbackSend")+'</button>'+
      '<h3>'+label("clientPreviousFeedback")+'</h3>'+
      (items.length?items.map(function(f){var kind={suggestion:label("clientSuggestion"),complaint:label("clientComplaint"),inquiry:label("clientInquiry")}[f.kind]||f.kind;
        var status={open:label("clientOpen"),in_progress:label("clientInProgress"),closed:label("clientClosed")}[f.status]||f.status;
        return '<div class="ed-fact"><span>'+esc(kind)+' · '+esc(status)+'</span><b>'+esc(f.body)+'</b></div>'}).join(""):
      '<div class="empty-state">'+label("clientNoFeedback")+'</div>')+'</section>';
    return adminShell(body);
  };
})();
