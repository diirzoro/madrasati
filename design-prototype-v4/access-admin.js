// Users & Access lives under one sidebar entry. All displayed data comes from API.
(function () {
  'use strict';
  var cache={}, pending={}, errors={}, search='', offset=0, roleFilter='', statusFilter='';
  var L=function(ar,en){return lang==='ar'?ar:en};
  var E=function(v){return esc(v==null?'':String(v))};
  var N=function(v){return Number(v||0).toLocaleString('en-US')};
  var D=function(v){return v?new Intl.DateTimeFormat(lang==='ar'?'ar-YE-u-nu-latn':'en-GB',
    {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—'};
  var list=function(v){return Array.isArray(v)?v:(v&&v.items)||[]};
  var q=function(v){return encodeURIComponent(v)};
  var roleNames={admin:['مدير المنصة','Platform admin'],owner:['مالك مؤسسة','Institution owner'],
    teacher:['معلم','Teacher'],client:['عميل','Client'],receptionist:['استقبال','Receptionist'],
    accountant:['محاسب','Accountant'],manager:['مدير','Manager'],controller:['مراقب','Controller'],
    coordinator:['منسق','Coordinator'],admissions:['موظف قبول','Admissions officer'],member:['موظف','Staff member']};
  var statusNames={active:['نشط','Active'],pending:['قيد الانتظار','Pending'],suspended:['موقوف','Suspended'],
    inactive:['غير نشط','Inactive'],deleted:['مؤرشف','Archived'],archived:['مؤرشف','Archived'],
    approved:['معتمد','Approved'],rejected:['مرفوض','Rejected']};
  var moduleNames={academic:['البيانات الأكاديمية','Academic'],access:['المستخدمون والصلاحيات','Users & access'],
    admin:['إدارة المنصة','Administration'],ads:['الإعلانات','Ads'],bookings:['الحجوزات','Bookings'],
    colleges:['الكليات','Colleges'],government:['المدارس الحكومية','Government schools'],
    home:['الرئيسية','Home'],institutes:['المعاهد','Institutes'],locations:['المناطق','Locations'],
    login:['تسجيل الدخول','Sign in'],offers:['العروض','Offers'],private:['المدارس الأهلية','Private schools'],
    register:['التسجيل','Registration'],reports:['التقارير','Reports'],schools:['المؤسسات','Institutions'],
    settings:['الإعدادات','Settings'],students:['العملاء','Clients'],teachers:['المعلمون','Teachers'],
    teachersAdmin:['إدارة المعلمين','Teacher management'],verify:['التحقق','Verification']};
  var actionNames={view:['عرض','View'],create:['إضافة','Create'],update:['تعديل','Edit'],delete:['أرشفة','Archive']};
  var auditNames={login:['تسجيل دخول','Sign in'],create:['إضافة حساب','Create account'],
    update:['تعديل بيانات','Update details'],delete:['أرشفة حساب','Archive account'],
    staff_added:['إضافة موظف','Add staff'],staff_changed:['تعديل موظف','Edit staff'],
    staff_archived:['أرشفة موظف','Archive staff'],staff_restored:['استعادة موظف','Restore staff'],
    review_approve:['اعتماد','Approve'],review_reject:['رفض','Reject'],submit:['إرسال','Submit'],
    resubmit:['إعادة إرسال','Resubmit'],pause:['إيقاف مؤقت','Pause'],resume:['استئناف','Resume'],
    membership_created:['إضافة عضوية','Add membership'],membership_changed:['تعديل عضوية','Edit membership'],
    membership_archived:['أرشفة عضوية','Archive membership']};
  var entityNames={user:['مستخدم','User'],organization_membership:['عضوية مؤسسة','Organization membership'],
    offer:['عرض','Offer'],advertisement:['إعلان','Advertisement']};
  function label(map,key,fallback){var found=map[key];return found?L(found[0],found[1]):
    (lang==='ar'?fallback||'غير محدد':key||fallback||'—')}
  function roleName(value){return label(roleNames,value,L('صفة مخصصة','Custom role'))}
  function statusName(value){return label(statusNames,value,L('غير محدد','Unknown'))}
  function moduleName(value){return label(moduleNames,value,L('قسم آخر','Other section'))}
  function permissionName(p){return label(actionNames,p.action,L('إجراء','Action'))+' '+moduleName(p.module)}
  function auditName(value){return label(auditNames,value,L('عملية مسجلة','Recorded action'))}
  function entityName(value){return label(entityNames,value,L('سجل','Record'))}
  var tabs=[['overview','نظرة عامة','Overview'],['users','المستخدمون','Users'],
    ['roles','الأدوار','Roles'],['permissions','الصلاحيات','Permissions'],
    ['memberships','العضويات','Memberships'],['requests','طلبات التسجيل','Registration requests'],
    ['security','الأمان','Security'],['activity','النشاط وسجل التدقيق','Activity & audit']];
  var userTabs=[['overview','نظرة عامة','Overview'],['organizations','المؤسسات','Organizations'],
    ['access','الأدوار والصلاحيات','Roles & permissions'],['profile','الملف','Profile'],
    ['security','الأمان','Security'],['sessions','الجلسات','Sessions'],['activity','النشاط','Activity']];
  function fetch(key,url){
    if(pending[key]||Object.prototype.hasOwnProperty.call(cache,key))return;
    pending[key]=true; delete errors[key];
    apiGet(url).then(function(v){cache[key]=v;delete pending[key];render()})
      .catch(function(e){errors[key]=(e.data&&e.data.error)||e.message;delete pending[key];render()});
  }
  function reset(){cache={};errors={};render()}
  function bodyState(key){return errors[key]?'<div class="empty-state">'+E(lang==='ar'?'تعذّر تحميل البيانات. حاول مرة أخرى.':errors[key])+
    ' <button class="btn" onclick="accessReload()">'+L('إعادة المحاولة','Retry')+'</button></div>':
    '<div class="loading-inline"><div class="loader"></div></div>'}
  function panel(title,html){return '<section class="panel"><div class="panel-title"><h2>'+E(title)+
    '</h2></div>'+html+'</section>'}
  function bar(defs,selected,root){return '<div class="section-tabs ac-tabs access-tabs" role="tablist">'+defs.map(function(x){
    return '<a role="tab" aria-selected="'+(selected===x[0])+'" class="'+(selected===x[0]?'active':'')+
      '" href="#/'+root+'/'+x[0]+'">'+E(L(x[1],x[2]))+'</a>'}).join('')+'</div>'}
  function heading(title,sub,action){return '<div class="welcome ac-welcome"><div><h1>'+E(title)+'</h1><p>'+E(sub)+
    '</p></div>'+(action||'')+'</div>'}
  function notice(txt){return '<div class="arch-note"><div><span>'+E(txt)+'</span></div></div>'}
  function accountType(u){
    if(u.role==='admin')return L('إدارة المنصة','Platform admin');
    if(u.role==='teacher')return u.teacherKind==='institutional'?L('معلم مؤسسة','Institution teacher'):
      L('معلم مستقل','Independent teacher');
    if(u.role==='owner')return L('مالك مؤسسة','Institution owner');
    return ({visitor:L('زائر مسجل','Registered visitor'),
      student:L('طالب · تصنيف حساب','Student · account label'),
      parent:L('ولي أمر · تصنيف حساب','Parent · account label'),
      both:L('طالب وولي أمر · تصنيف حساب','Student & parent · account label'),
      other:L('عميل مسجل','Registered client'),
      unspecified:L('عميل · التصنيف غير محدد','Client · type unspecified')})[u.clientKind||'unspecified']||L('عميل مسجل','Registered client');
  }
  function affiliation(u){return u.organizationName?E(u.organizationName)+
    (u.organizationCount>1?' <small>+'+N(u.organizationCount-1)+'</small>':'')+
    '<div class="entity-sub">'+E(roleName(u.membershipRole))+'</div>':
    (u.role==='teacher'?L('مستقل','Independent'):'—')}
  function linkUser(u){return '<a href="#/access/users/'+q(u.id)+'/overview">'+E(u.name||u.userName)+'</a>'}
  function actionError(e){var raw=(e&&e.data&&e.data.error)||e.message||'Operation failed';
    if(lang!=='ar'){alert(raw);return}
    var known={'Email already registered.':'البريد الإلكتروني مسجل مسبقًا.',
      'A valid userId is required':'معرّف المستخدم غير صالح.',
      'User is already a member of this organization':'المستخدم مرتبط بهذه المؤسسة بالفعل.',
      'Invalid membership':'بيانات العضوية غير صالحة.',
      'Password must be at least 8 characters with at least one capital letter and one symbol.':'كلمة المرور تتطلب 8 أحرف على الأقل، وحرفًا كبيرًا ورمزًا.',
      'Protected system account role and status cannot be changed.':'لا يمكن تغيير دور أو حالة الحساب المحمي.'};
    alert(known[raw]||'تعذّر إكمال العملية. راجع البيانات وحاول مرة أخرى.')}
  window.accessReload=reset;
  window.accessSearch=function(e){e.preventDefault();search=(document.getElementById('access-search').value||'').trim();
    roleFilter=document.getElementById('access-role').value;statusFilter=document.getElementById('access-status').value;
    offset=0;Object.keys(cache).forEach(function(k){if(k.indexOf('users:')===0)delete cache[k]});render()};
  window.accessPageMove=function(delta){offset=Math.max(0,offset+delta*25);render()};

  function overview(){fetch('summary','/api/access/summary');var s=cache.summary;
    if(!s)return bodyState('summary');
    fetch('audit','/api/admin/audit-logs?limit=20');
    var items=[
      {key:'users',ar:'المستخدمون',en:'Users',icon:'users',tab:'users'},
      {key:'active_users',ar:'الحسابات النشطة',en:'Active accounts',icon:'check',tab:'users'},
      {key:'roles',ar:'الأدوار',en:'Roles',icon:'shield',tab:'roles'},
      {key:'permissions',ar:'الصلاحيات',en:'Permissions',icon:'list',tab:'permissions'},
      {key:'memberships',ar:'عضويات المؤسسات',en:'Organization memberships',icon:'school',tab:'memberships'},
      {key:'registration_requests',ar:'طلبات التسجيل',en:'Registration requests',icon:'file',tab:'requests'}];
    var recent=list(cache.audit).slice(0,5);
    return '<div class="access-overview"><div class="access-section-head"><div><h2>'+L('ملخص النظام','System overview')+
      '</h2><p>'+L('أرقام مباشرة من قاعدة البيانات','Live figures from the database')+'</p></div></div>'+ 
      '<div class="access-stats">'+items.map(function(x){return '<a class="access-stat" href="#/access/'+x.tab+'" aria-label="'+E(L(x.ar,x.en))+' '+N(s[x.key])+'">'+
        '<span class="access-stat__icon" aria-hidden="true">'+icon(x.icon,17)+'</span>'+
        '<span class="access-stat__content"><span class="access-stat__label">'+E(L(x.ar,x.en))+'</span><strong class="access-stat__number" dir="ltr">'+N(s[x.key])+'</strong></span></a>'}).join('')+'</div>'+ 
      '<div class="access-overview-bottom"><section class="access-overview-panel"><div class="access-section-head"><h2>'+L('آخر النشاطات','Recent activity')+'</h2><a href="#/access/activity">'+L('عرض السجل','View log')+'</a></div>'+ 
      (!cache.audit?bodyState('audit'):recent.length?'<div class="access-activity-list">'+recent.map(function(a){return '<div class="access-activity-item"><span class="access-activity-mark">'+icon('chart',15)+'</span><span><b>'+E(auditName(a.action))+'</b><small>'+E(a.actorName||L('النظام','System'))+'</small></span><time>'+E(D(a.createdAt||a.created_at))+'</time></div>'}).join('')+'</div>':
      '<div class="empty-state">'+L('لا توجد نشاطات مسجلة','No activity recorded')+'</div>')+'</section>'+ 
      '<section class="access-overview-panel access-quick"><div class="access-section-head"><h2>'+L('إدارة سريعة','Quick access')+'</h2></div>'+ 
      [['users','users','إدارة المستخدمين','Manage users'],['memberships','school','عضويات المؤسسات','Organization memberships'],['roles','shield','الأدوار والصلاحيات','Roles & permissions']].map(function(x){return '<a href="#/access/'+x[0]+'"><span>'+icon(x[1],17)+'</span><b>'+E(L(x[2],x[3]))+'</b><span class="access-quick-arrow" aria-hidden="true">←</span></a>'}).join('')+'</section></div></div>';
  }
  function users(){var key='users:'+search+':'+roleFilter+':'+statusFilter+':'+offset;
    var params='limit=25&offset='+offset+(search?'&search='+q(search):'')+
      (roleFilter?'&role='+q(roleFilter):'')+(statusFilter?'&status='+q(statusFilter):'');
    fetch(key,'/api/users?'+params);var d=cache[key];
    var toolbar='<form class="toolbar" onsubmit="accessSearch(event)"><input id="access-search" value="'+E(search)+
      '" placeholder="'+L('بحث بالاسم أو البريد','Search name or email')+'"><select id="access-role">'+
      [['','كل الأدوار','All roles'],['admin','مدير المنصة','Platform admin'],['owner','مالك','Owner'],
        ['teacher','معلم','Teacher'],['client','عميل','Client']].map(function(x){return '<option value="'+x[0]+'"'+
        (x[0]===roleFilter?' selected':'')+'>'+E(L(x[1],x[2]))+'</option>'}).join('')+'</select><select id="access-status">'+
      [['','كل الحالات','All statuses'],['active','نشط','Active'],['pending','معلق','Pending'],
        ['suspended','موقوف','Suspended']].map(function(x){return '<option value="'+x[0]+'"'+
        (x[0]===statusFilter?' selected':'')+'>'+E(L(x[1],x[2]))+'</option>'}).join('')+
      '</select><button class="btn green">'+L('بحث','Search')+'</button></form>';
    if(!d)return panel(L('المستخدمون','Users'),toolbar+bodyState(key));
    var rows=list(d);return panel(L('المستخدمون','Users'),'<div class="sp-actions" style="padding:0 16px 12px"><a class="btn green" href="#/access/users/new">'+icon('plus',15)+' '+L('إضافة حساب عميل','Add client account')+'</a></div>'+toolbar+(rows.length?
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>'+L('المستخدم','User')+'</th><th>'+L('النوع','Type')+
      '</th><th>'+L('الجهة','Affiliation')+'</th><th>'+L('الحالة','Status')+'</th><th>'+L('الإجراءات','Actions')+'</th></tr></thead><tbody>'+rows.map(function(u){
        return '<tr class="row-click" tabindex="0" role="link" onclick="go(\'access/users/'+q(u.id)+'/overview\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click()}"><td><b>'+linkUser(u)+
          '</b><div class="entity-sub" dir="ltr">'+E(u.email)+'</div></td><td>'+E(accountType(u))+'</td><td>'+affiliation(u)+
          '</td><td><span class="access-status access-status--'+E(u.status)+'">'+E(statusName(u.status))+'</span>'+(u.isProtected?' <span class="access-protected">'+L('محمي','Protected')+'</span>':'')+'</td><td><div class="crud-actions">'+
          '<a class="crud view" href="#/access/users/'+q(u.id)+'/overview" onclick="event.stopPropagation()" title="'+L('عرض','View')+'">'+icon('eye',14)+'</a>'+
          (u.isProtected?'':'<a class="crud edit" href="#/access/users/'+q(u.id)+'/edit" onclick="event.stopPropagation()" title="'+L('تعديل','Edit')+'">'+icon('edit',14)+'</a>'+
          '<button class="crud edit" onclick="event.stopPropagation();accessSetStatus(\''+u.id+'\',\''+(u.status==='suspended'?'active':'suspended')+'\')" title="'+(u.status==='suspended'?L('تفعيل','Activate'):L('إيقاف','Suspend'))+'">'+icon(u.status==='suspended'?'check':'x',14)+'</button>'+
          (u.role==='client'?'<button class="crud delete" onclick="event.stopPropagation();accessDeleteUser(\''+u.id+'\')" title="'+L('حذف منطقي','Soft delete')+'">'+icon('trash',14)+'</button>':''))+
          '</div></td></tr>'}).join('')+
      '</tbody></table></div>':'<div class="empty-state">'+L('لا توجد نتائج','No results')+'</div>')+
      '<div class="sp-actions" style="padding:16px"><span>'+N(d.total)+' '+L('مستخدم','users')+'</span><button class="btn" onclick="accessPageMove(-1)"'+
      (offset?'':' disabled')+'>'+L('السابق','Previous')+'</button><button class="btn" onclick="accessPageMove(1)"'+
      (offset+25<(d.total||0)?'':' disabled')+'>'+L('التالي','Next')+'</button></div>');
  }
  function roles(){fetch('roles','/api/rbac/roles');var rows=cache.roles;if(!rows)return bodyState('roles');
    return panel(L('الأدوار','Roles'),'<div class="reference-grid access-role-grid">'+rows.map(function(r){return '<a class="reference-card" href="#/access/roles/'+E(r.id)+'"><div class="ref-icon">'+icon('shield',18)+'</div><div><b>'+E(roleName(r.name))+'</b><span>'+N(r.user_count)+' '+L('مستخدم','users')+' · '+N(r.permission_count)+' '+L('صلاحية','permissions')+'</span></div></a>'}).join('')+'</div>');
  }
  function permissions(){fetch('permissions','/api/rbac/permissions');var rows=cache.permissions;if(!rows)return bodyState('permissions');
    var groups={};rows.forEach(function(p){(groups[p.module]||(groups[p.module]=[])).push(p)});
    var actions=['view','create','update','delete'];
    return panel(L('دليل الصلاحيات','Permission catalog'),
      '<div class="access-table-intro">'+L('الصلاحيات المتاحة لكل قسم؛ تُدار صلاحيات كل دور من صفحة الدور نفسه.','Available actions by section; manage grants from each role page.')+'</div>'+ 
      '<div class="table-wrap"><table class="tbl access-permissions-table"><thead><tr><th>'+L('القسم','Section')+'</th>'+actions.map(function(a){return '<th>'+E(label(actionNames,a))+'</th>'}).join('')+'</tr></thead><tbody>'+ 
      Object.keys(groups).sort(function(a,b){return moduleName(a).localeCompare(moduleName(b),lang==='ar'?'ar':'en')}).map(function(g){return '<tr><td><b>'+E(moduleName(g))+'</b></td>'+actions.map(function(a){return '<td>'+(groups[g].some(function(p){return p.action===a})?'<span class="access-permission-yes" aria-label="'+L('متاح','Available')+'">'+icon('check',15)+'</span>':'<span class="access-permission-no">—</span>')+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>');
  }
  function memberships(){fetch('memberships','/api/access/memberships?limit=50');var d=cache.memberships;if(!d)return bodyState('memberships');
    return panel(L('العضويات','Memberships'),list(d).length?'<div class="table-wrap"><table class="tbl"><thead><tr><th>'+L('المستخدم','User')+'</th><th>'+L('المؤسسة','Organization')+'</th><th>'+L('الصفة','Role')+'</th><th>'+L('الحالة','Status')+'</th></tr></thead><tbody>'+list(d).map(function(m){return '<tr><td>'+linkUser({id:m.userId,name:m.userName})+'</td><td><a href="#/detail?id='+q(m.organizationId)+'">'+E(m.organizationName)+'</a></td><td>'+E(roleName(m.role))+'</td><td>'+E(statusName(m.status))+'</td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty-state">'+L('لا توجد عضويات','No memberships')+'</div>');
  }
  function requests(){fetch('requests','/api/admin/pending-registrations?limit=50');var d=cache.requests;if(!d)return bodyState('requests');
    return panel(L('طلبات التسجيل','Registration requests'),list(d).length?'<div class="table-wrap"><table class="tbl"><thead><tr><th>'+L('الاسم','Name')+'</th><th>'+L('البريد','Email')+'</th><th>'+L('الحالة','Status')+'</th></tr></thead><tbody>'+list(d).map(function(r){return '<tr><td>'+E(r.name)+'</td><td dir="ltr">'+E(r.email)+'</td><td>'+E(statusName(r.status||'pending'))+'</td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty-state">'+L('لا توجد طلبات معلقة','No pending requests')+'</div>');
  }
  function activity(){fetch('audit','/api/admin/audit-logs?limit=50');var rows=cache.audit;if(!rows)return bodyState('audit');
    return panel(L('سجل التدقيق','Audit log'),'<div class="table-wrap"><table class="tbl"><thead><tr><th>'+L('العملية','Action')+'</th><th>'+L('المنفذ','Actor')+'</th><th>'+L('الكيان','Entity')+'</th><th>'+L('الوقت','Time')+'</th></tr></thead><tbody>'+list(rows).map(function(a){return '<tr><td>'+E(auditName(a.action))+'</td><td>'+E(a.actorName||a.actor_name||'—')+'</td><td>'+E(entityName(a.object_type||a.entityType))+'</td><td>'+E(D(a.created_at||a.createdAt))+'</td></tr>'}).join('')+'</tbody></table></div>');
  }
  function security(){return panel(L('ضوابط الأمان','Security controls'),notice(L(
    'تعطيل الحساب يوقف الدخول فوراً. الجلسات المعروضة تخص عملية الخادم الحالية ولا تبقى بعد إعادة التشغيل.',
    'Suspension blocks login immediately. Listed sessions belong to this API process and do not survive a restart.'))+
    '<p>'+L('افتح حساب مستخدم لإدارة حالته وجلساته.','Open a user record to manage status and sessions.')+'</p>');}

  window.accessSetStatus=function(id,status){if(!confirm(L('تغيير حالة الحساب؟','Change account status?')))return;
    apiPatch('/api/users/'+q(id),{status:status}).then(function(){delete cache['access-user:'+id];reset()}).catch(actionError)};
  window.accessDeleteUser=function(id){if(!confirm(L('أرشفة هذا الحساب؟ ستبقى بياناته للتحليل والتدقيق.','Archive this account? Its data will remain for analysis and audit.')))return;
    apiDelete('/api/users/'+q(id)).then(function(){reset()}).catch(actionError)};
  window.accessSaveUser=function(id){var val=function(key){return (document.getElementById('access-'+key).value||'').trim()};
    var name=val('name'),email=val('email'),phone=val('phone');
    if(!name||!email){alert(L('الاسم والبريد مطلوبان','Name and email are required'));return}
    var payload={name:name,email:email,phone:phone};
    if(!id){payload.password=val('password');if(!payload.password){alert(L('كلمة المرور مطلوبة','Password is required'));return}}
    var request=id?apiPatch('/api/users/'+q(id),payload):apiPost('/api/users',payload);
    request.then(function(u){reset();go('access/users/'+q(id||u.id)+'/overview')}).catch(actionError);
  };
  window.accessRevokeSessions=function(id){if(!confirm(L('إنهاء جميع جلسات هذا المستخدم؟','Revoke all sessions for this user?')))return;
    apiDelete('/api/access/users/'+q(id)+'/sessions').then(function(){delete cache['sessions:'+id];render()}).catch(actionError)};
  window.accessRevokeSession=function(id,sid){apiDelete('/api/access/users/'+q(id)+'/sessions/'+q(sid)).then(function(){delete cache['sessions:'+id];render()}).catch(actionError)};
  window.accessSaveMembership=function(id,mid){var role=document.getElementById('access-membership-role').value.trim(),
      status=document.getElementById('access-membership-status').value,
      org=document.getElementById('access-org-id').value;
    var request=mid?apiPatch('/api/access/memberships/'+mid,{role:role,status:status}):
      apiPost('/api/access/users/'+q(id)+'/memberships',{organizationId:org,role:role,status:status});
    request.then(function(){delete cache['memberships:'+id];delete cache.memberships;go('access/users/'+q(id)+'/organizations');render()})
      .catch(actionError)};
  window.accessRemoveMembership=function(id,mid){if(!confirm(L('إزالة العضوية؟','Remove membership?')))return;
    apiDelete('/api/access/memberships/'+mid).then(function(){delete cache['memberships:'+id];delete cache.memberships;render()}).catch(actionError)};
  window.accessSetOverride=function(id,pid,effect){var method=effect==='inherit'?apiDelete('/api/access/users/'+q(id)+'/permissions/'+q(pid)):
    apiPut('/api/access/users/'+q(id)+'/permissions/'+q(pid),{effect:effect});
    method.then(function(){delete cache['user-permissions:'+id];render()}).catch(actionError)};
  window.accessRoleToggle=function(roleId,pid,has,module,action){var method=has?
    apiDelete('/api/rbac/roles/'+roleId+'/permissions/'+q(pid)):
    apiPost('/api/rbac/roles/'+roleId+'/permissions',{module:module,action:action});
    method.then(function(){delete cache['role-permissions:'+roleId];delete cache.roles;render()}).catch(actionError)};

  function membershipForm(id,mode,mid){var key='memberships:'+id;fetch(key,'/api/access/users/'+q(id)+'/memberships');
    fetch('access-orgs','/api/organizations?limit=100');var ms=cache[key],orgs=list(cache['access-orgs']);
    if(!ms||!cache['access-orgs'])return adminShell(bodyState(!ms?key:'access-orgs'));
    var existing=mode==='edit'?ms.find(function(x){return String(x.id)===String(mid)}):null;
    if(mode==='edit'&&!existing)return adminShell('<div class="empty-state">'+L('العضوية غير موجودة','Membership not found')+'</div>');
    var options=orgs.map(function(o){return '<option value="'+E(o.id)+'"'+(existing&&existing.organizationId===o.id?' selected':'')+'>'+E(o.name)+'</option>'}).join('');
    var body='<div class="form-group"><label>'+L('المؤسسة','Organization')+'</label><select id="access-org-id"'+(existing?' disabled':'')+'>'+options+'</select></div>'+
      '<div class="form-group"><label>'+L('صفة العضوية','Membership role')+'</label><input id="access-membership-role" value="'+E(existing?existing.role:'member')+'" required></div>'+
      '<div class="form-group"><label>'+L('الحالة','Status')+'</label><select id="access-membership-status">'+
      ['active','inactive','suspended','pending'].map(function(s){return '<option value="'+s+'"'+(existing&&existing.status===s?' selected':'')+'>'+E(statusName(s))+'</option>'}).join('')+'</select></div>';
    return formPage({back:'access/users/'+q(id)+'/organizations',
      title:existing?L('تعديل العضوية','Edit membership'):L('إضافة عضوية','Add membership'),
      subtitle:L('تسري الصفة داخل المؤسسة المحددة فقط.','The role applies only in the selected organization.'),
      body:body,onSave:'accessSaveMembership(\''+id+'\','+(existing?mid:'null')+')'});
  }
  function userForm(id){var u=null,key='access-user:'+id;
    if(id){fetch(key,'/api/users/'+q(id));u=cache[key];if(!u)return adminShell(bodyState(key));}
    var field=function(name,label,value,type){return '<div class="form-group"><label>'+E(label)+'</label><input id="access-'+name+'" type="'+(type||'text')+'" value="'+E(value||'')+'"'+(name==='name'||name==='email'?' required':'')+'></div>'};
    var body=field('name',L('الاسم','Name'),u&&u.name)+field('email',L('البريد الإلكتروني','Email'),u&&u.email,'email')+
      field('phone',L('الهاتف','Phone'),u&&u.phone,'tel')+
      (id?'':field('password',L('كلمة مرور أولية','Initial password'),'', 'password'));
    return formPage({back:id?'access/users/'+q(id)+'/overview':'access/users',
      title:id?L('تعديل الحساب','Edit account'):L('إضافة حساب عميل','Add client account'),
      subtitle:id?L('عدّل بيانات الاتصال والاسم.','Edit name and contact details.'):L('يُنشأ حساب عميل فقط؛ يمكن ربطه بمؤسسة لاحقًا.','Creates a client account; you can link it to an institution later.'),
      body:body,onSave:'accessSaveUser('+(id?'\''+id+'\'':'null')+')'});
  }
  function userDetail(id,tab){var key='access-user:'+id;fetch(key,'/api/users/'+q(id));var u=cache[key];if(!u)return adminShell(bodyState(key));
    if(tab==='edit')return userForm(id);
    if(tab==='membership')return membershipForm(id,routePath()[4]||'new',routePath()[5]);
    var root='access/users/'+q(id),body=heading(u.name,u.email+' · '+accountType(u)+' · '+statusName(u.status),
      '<button class="btn" onclick="go(\'access/users\')">'+L('عودة','Back')+'</button>')+
      bar(userTabs,tab,root);
    if(tab==='overview')body+=panel(L('معلومات الحساب','Account information'),'<div class="ed-facts">'+
      [[L('رقم الحساب','Account ID'),u.id],[L('البريد الإلكتروني','Email'),u.email],
        [L('الهاتف','Phone'),u.phone],[L('الدور','Role'),roleName(u.role)],
        [L('نوع المستخدم','Account type'),accountType(u)],
        [L('المؤسسة','Institution'),u.organizationName],
        [L('صفة العضوية','Membership role'),u.membershipRole?roleName(u.membershipRole):'—'],
        [L('الحالة','Status'),statusName(u.status)],
        [L('تاريخ الإنشاء','Created'),D(u.createdAt)],[L('آخر تحديث','Updated'),D(u.updatedAt)],
        [L('حساب محمي','Protected'),u.isProtected?L('نعم','Yes'):L('لا','No')]].map(function(x){return '<div class="ed-fact"><span>'+E(x[0])+'</span><b>'+E(x[1]||'—')+'</b></div>'}).join('')+'</div>');
    else if(tab==='organizations'){
      var mk='memberships:'+id;fetch(mk,'/api/access/users/'+q(id)+'/memberships');var ms=cache[mk];
      body+=!ms?bodyState(mk):panel(L('عضويات المؤسسات','Organization memberships'),
        (ms.length?ms.map(function(m){return '<div class="reference-card"><div><b><a href="#/detail?id='+q(m.organizationId)+'">'+E(m.organizationName)+'</a></b><span>'+E(roleName(m.role))+' · '+E(statusName(m.status))+'</span></div>'+
          (u.isProtected?'':'<a class="btn" href="#/access/users/'+q(id)+'/membership/edit/'+m.id+'">'+L('تعديل','Edit')+'</a><button class="btn" onclick="accessRemoveMembership(\''+id+'\','+m.id+')">'+L('إزالة','Remove')+'</button>')+'</div>'}).join(''):'<div class="empty-state">'+L('لا توجد عضويات','No memberships')+'</div>')+
        (u.isProtected?'':'<a class="btn green" href="#/access/users/'+q(id)+'/membership/new">'+L('إضافة عضوية','Add membership')+'</a>'));
    }else if(tab==='access'){
      var pk='user-permissions:'+id;fetch(pk,'/api/access/users/'+q(id)+'/permissions');fetch('permissions','/api/rbac/permissions');
      var p=cache[pk],all=cache.permissions;
      body+=(!p||!all)?bodyState(!p?pk:'permissions'):panel(L('الصلاحيات الفعلية','Effective permissions'),
         notice(L('الموروثة من الدور: '+N(p.inherited.length)+' · الفعلية: '+N(p.effective.length),
           'Inherited: '+N(p.inherited.length)+' · effective: '+N(p.effective.length)))+
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>'+L('الصلاحية','Permission')+'</th><th>'+L('المصدر','Source')+'</th><th>'+L('استثناء مباشر','Direct override')+'</th></tr></thead><tbody>'+all.map(function(item){
          var own=p.overrides.find(function(x){return x.id===item.id&&!x.organizationId});
          var inherited=p.inherited.some(function(x){return x.id===item.id});
           return '<tr><td>'+E(permissionName(item))+'</td><td>'+E(own?
             (own.effect==='grant'?L('سماح مباشر','Direct grant'):L('منع مباشر','Direct deny')):
             (inherited?L('موروثة من الدور','Inherited from role'):'—'))+'</td><td>'+
            (u.isProtected?'—':'<select onchange="accessSetOverride(\''+id+'\',\''+item.id+'\',this.value)">'+
              [['inherit',L('من الدور','Inherit')],['grant',L('سماح','Grant')],['deny',L('منع','Deny')]].map(function(o){return '<option value="'+o[0]+'"'+((own?own.effect:'inherit')===o[0]?' selected':'')+'>'+E(o[1])+'</option>'}).join('')+'</select>')+'</td></tr>'}).join('')+'</tbody></table></div>');
    }else if(tab==='profile'){
      var profileKey='profile:'+id;fetch(profileKey,'/api/profiles/'+q(id));var profile=cache[profileKey];
      body+=!Object.prototype.hasOwnProperty.call(cache,profileKey)?bodyState(profileKey):panel(L('الملف الشخصي','Profile'),'<div class="ed-facts">'+
         [[L('الاسم','Name'),profile&&profile.full_name],[L('نبذة','Bio'),profile&&profile.bio],
           [L('اللغة المفضلة','Preferred language'),profile&&profile.preferred_language],
           [L('المنطقة الزمنية','Timezone'),profile&&profile.timezone]].map(function(x){return '<div class="ed-fact"><span>'+E(x[0])+'</span><b>'+E(x[1]||'—')+'</b></div>'}).join('')+'</div>');
     }else if(tab==='security')body+=panel(L('حالة الحساب','Account status'),'<p>'+E(statusName(u.status))+(u.isProtected?' · '+L('حساب محمي','Protected account'):'')+'</p>'+
      (u.isProtected?'':u.status==='active'?'<button class="btn" onclick="accessSetStatus(\''+id+'\',\'suspended\')">'+L('إيقاف','Suspend')+'</button>':
        '<button class="btn green" onclick="accessSetStatus(\''+id+'\',\'active\')">'+L('تفعيل','Activate')+'</button>'));
    else if(tab==='sessions'){
      var sk='sessions:'+id;fetch(sk,'/api/access/users/'+q(id)+'/sessions');var sd=cache[sk];
      body+=!sd?bodyState(sk):panel(L('الجلسات النشطة','Active sessions'),notice(L(
        'تظهر جلسات خادم API الحالي فقط. لا توجد بيانات موثوقة عن الأجهزة أو تاريخ الجلسات.',
        'Only sessions in the current API process are shown. Device and historical data are unavailable.'))+
        (sd.items.length?sd.items.map(function(s){return '<div class="reference-card"><b>'+E(s.current?L('الجلسة الحالية','Current session'):L('جلسة نشطة','Active session'))+'</b><span>'+E(D(s.expiresAt))+'</span><button class="btn" onclick="accessRevokeSession(\''+id+'\',\''+s.id+'\')">'+L('إنهاء','Revoke')+'</button></div>'}).join(''):'<div class="empty-state">'+L('لا توجد جلسات','No sessions')+'</div>')+
        (sd.items.length?'<button class="btn" onclick="accessRevokeSessions(\''+id+'\')">'+L('إنهاء الكل','Revoke all')+'</button>':''));
    }else if(tab==='activity'){
      var ak='user-activity:'+id;fetch(ak,'/api/access/users/'+q(id)+'/activity');var ad=cache[ak];
       body+=!ad?bodyState(ak):panel(L('نشاط المستخدم','User activity'),list(ad).length?list(ad).map(function(a){return '<div class="reference-card"><div><b>'+E(auditName(a.action))+'</b><span>'+E(a.actorName||'—')+'</span></div><time>'+E(D(a.createdAt))+'</time></div>'}).join(''):'<div class="empty-state">'+L('لا يوجد نشاط مسجل','No recorded activity')+'</div>');
    }
    return adminShell(body);
  }
  function roleDetail(id){fetch('roles','/api/rbac/roles');fetch('permissions','/api/rbac/permissions');
    var key='role-permissions:'+id;fetch(key,'/api/rbac/roles/'+id+'/permissions');
    var all=cache.permissions,grants=cache[key],r=list(cache.roles).find(function(x){return String(x.id)===String(id)});
    if(!all||!grants||!r)return adminShell(bodyState(!r?'roles':!all?'permissions':key));
    var ids=new Set(grants.map(function(g){return g.id}));
     return adminShell(heading(roleName(r.name),N(r.user_count)+' '+L('مستخدم','users')+' · '+N(grants.length)+' '+L('صلاحية','permissions'), '<button class="btn" onclick="go(\'access/roles\')">'+L('عودة','Back')+'</button>')+
      bar([['overview','نظرة عامة','Overview'],['permissions','الصلاحيات','Permissions']],
        routePath()[3]||'overview','access/roles/'+id)+
       (routePath()[3]==='permissions'?panel(L('صلاحيات الدور','Role permissions'),
         '<div class="access-role-permissions">'+Object.keys(all.reduce(function(acc,p){(acc[p.module]||(acc[p.module]=[])).push(p);return acc},{})).sort(function(a,b){return moduleName(a).localeCompare(moduleName(b),lang==='ar'?'ar':'en')}).map(function(module){return '<fieldset><legend>'+E(moduleName(module))+'</legend>'+all.filter(function(p){return p.module===module}).map(function(p){return '<label><input type="checkbox"'+
           (ids.has(p.id)?' checked':'')+(r.name==='admin'?' disabled':'')+' onchange="accessRoleToggle('+id+',\''+p.id+'\','+ids.has(p.id)+',\''+p.module+'\',\''+p.action+'\')"> '+E(label(actionNames,p.action))+'</label>'}).join('')+'</fieldset>'}).join('')+'</div>'):
         panel(L('ملخص الدور','Role overview'),'<div class="access-role-summary"><div><span>'+L('المستخدمون','Users')+'</span><b>'+N(r.user_count)+'</b></div><div><span>'+L('الصلاحيات','Permissions')+'</span><b>'+N(grants.length)+'</b></div></div>')));
  }
  window.accessPage=function(){var path=routePath(),tab=path[1]||'overview';
    if(tab==='users'&&path[2]==='new')return userForm(null);
    if(tab==='users'&&path[2])return userDetail(path[2],path[3]||'overview');
    if(tab==='roles'&&path[2])return roleDetail(path[2]);
    if(!tabs.some(function(x){return x[0]===tab}))tab='overview';
    var body=heading(L('المستخدمون والصلاحيات','Users & Access'),
      L('إدارة الهوية والعضويات والصلاحيات من بيانات النظام الفعلية.',
        'Manage identities, memberships and permissions from live system data.'))+
      bar(tabs,tab,'access');
    body+=({overview:overview,users:users,roles:roles,permissions:permissions,
      memberships:memberships,requests:requests,security:security,activity:activity})[tab]();
    return adminShell(body);
  };
})();
