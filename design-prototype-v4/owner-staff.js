// Institution staff management uses the organization's membership records.
(function () {
 'use strict';
 var cache={}, loading={}, errors={}, paging={}, filters={};
 var L=function(ar,en){return lang==='ar'?ar:en};
 var E=function(value){return esc(value==null?'':String(value))};
 var Q=function(value){return encodeURIComponent(value)};
 var roles=[['receptionist','موظف استقبال','Receptionist'],['accountant','محاسب','Accountant'],
  ['manager','مدير','Manager'],['controller','مراقب','Controller'],
  ['coordinator','منسق','Coordinator'],['admissions','موظف قبول','Admissions officer'],
  ['member','موظف','Staff member']];
 function fetchStaff(id){if(cache[id]||loading[id])return;loading[id]=true;delete errors[id];
  apiGet('/api/organizations/'+Q(id)+'/staff?limit=25&offset='+((paging[id]||0)*25)+'&search='+Q(filters[id]||''))
   .then(function(data){cache[id]=data;delete loading[id];render()})
   .catch(function(err){errors[id]=(err.data&&err.data.error)||err.message;delete loading[id];render()});}
 function error(err){alert((err.data&&err.data.error)||err.message||L('تعذرت العملية','Operation failed'))}
 function refresh(id){delete cache[id];fetchStaff(id)}
 window.ownerStaffPageMove=function(id,delta){paging[id]=Math.max(0,(paging[id]||0)+delta);refresh(id)};
 window.ownerStaffSearch=function(event,id){event.preventDefault();filters[id]=(document.getElementById('os-search').value||'').trim();paging[id]=0;refresh(id)};
 function roleName(role){var item=roles.find(function(x){return x[0]===role});return item?L(item[1],item[2]):role}
 function statusName(status){return ({active:L('نشط','Active'),pending:L('بانتظار التفعيل','Pending'),
  suspended:L('موقوف','Suspended'),inactive:L('غير نشط','Inactive')})[status]||status}
 function orgs(){return ownData.orgs||[]}
 function staffForm(org,member){
  var root='owner/staff/'+Q(org.id), edit=!!member, name=edit?member.name:'';
  var body='<div class="form-group"><label>'+L('البريد المسجل','Registered email')+'</label><input id="os-email" type="email" value="'+E(member&&member.email)+'"'+(edit?' disabled':' required')+'></div>'+
   '<div class="form-group"><label>'+L('الصفة الوظيفية','Staff role')+'</label><input id="os-role" list="os-role-options" value="'+E(member&&member.role||'receptionist')+'" pattern="[a-z][a-z0-9_]{1,39}" required><datalist id="os-role-options">'+
   roles.map(function(item){return '<option value="'+item[0]+'">'+E(L(item[1],item[2]))+'</option>'}).join('')+'</datalist></div>'+
   '<div class="form-group"><label>'+L('القسم','Department')+'</label><input id="os-department" maxlength="100" value="'+E(member&&member.department)+'"></div>'+
   '<div class="form-group"><label>'+L('المسمى الوظيفي','Job title')+'</label><input id="os-title" maxlength="120" value="'+E(member&&member.jobTitle)+'"></div>'+
   '<div class="form-group"><label>'+L('الحالة في المؤسسة','Institution status')+'</label><select id="os-status">'+
   ['active','pending','suspended','inactive'].map(function(s){return '<option value="'+s+'"'+(member&&member.status===s?' selected':'')+'>'+E(statusName(s))+'</option>'}).join('')+'</select></div>';
  return formPage({back:root,title:edit?L('تعديل موظف','Edit staff member'):L('إضافة موظف','Add staff member'),
   subtitle:org.name+' · '+L('أضف حسابًا مسجلاً ببريده؛ الصفة تخص هذه المؤسسة فقط.','Use an existing account email; the role applies only to this institution.'),
   body:body,onSave:'ownerStaffSave(\''+org.id+'\','+(edit?'\''+member.userId+'\'':'null')+')'});
 }
 window.ownerStaffSave=function(orgId,userId){
  var get=function(id){return document.getElementById(id).value.trim()};
  var data={role:get('os-role'),department:get('os-department'),jobTitle:get('os-title'),status:get('os-status')};
  if(!userId)data.email=get('os-email');
  var request=userId?apiPatch('/api/organizations/'+Q(orgId)+'/staff/'+Q(userId),data):
   apiPost('/api/organizations/'+Q(orgId)+'/staff',data);
  request.then(function(){delete cache[orgId];if(userId)delete cache['member:'+orgId+':'+userId];go('owner/staff/'+Q(orgId));render()}).catch(error);
 };
 window.ownerStaffStatus=function(orgId,userId,status){
  apiPatch('/api/organizations/'+Q(orgId)+'/staff/'+Q(userId),{status:status})
   .then(function(){refresh(orgId)}).catch(error);
 };
 window.ownerStaffArchive=function(orgId,userId){
  if(!confirm(L('أرشفة عضوية الموظف؟ ستبقى البيانات محفوظة ويمكن إعادته.','Archive this staff assignment? Its history will remain available.')))return;
  apiDelete('/api/organizations/'+Q(orgId)+'/staff/'+Q(userId)).then(function(){refresh(orgId)}).catch(error);
 };
 window.ownerStaffRestore=function(orgId,userId){
  var member=cache[orgId]&&cache[orgId].items.find(function(m){return m.userId===userId});
  if(!member)return;
  if(!confirm(L('إعادة الموظف إلى المؤسسة؟','Restore this staff member?')))return;
  apiPost('/api/organizations/'+Q(orgId)+'/staff',{email:member.email,role:member.role,
   department:member.department,jobTitle:member.jobTitle,status:'active'})
   .then(function(){refresh(orgId)}).catch(error);
 };
 window.ownerStaffPage=function(){
  var path=routePath(),id=path[2],org=orgs().find(function(o){return o.id===id});
  if(!ownData.loaded){return '<div class="loading-inline"><div class="loader"></div></div>'}
  if(!id)return '<div class="directory-body">'+sectionHead({title:L('فريق العمل','Staff'),icon:'users',
   sub:L('اختر المؤسسة لإدارة موظفيها.','Choose an institution to manage its staff.')},null)+
   '<div class="reference-grid">'+orgs().map(function(o){return '<a class="reference-card" href="#/owner/staff/'+Q(o.id)+'"><b>'+E(o.name)+'</b><span>'+E(o.type)+'</span></a>'}).join('')+'</div></div>';
  if(!org)return '<div class="empty-state">'+L('المؤسسة غير متاحة','Institution unavailable')+'</div>';
  fetchStaff(id);
  var data=cache[id],root='owner/staff/'+Q(id);
  if(path[3]==='new')return staffForm(org,null);
  if(path[3]==='edit'){
   var memberKey='member:'+id+':'+path[4],member=cache[memberKey];
   if(!member&&!loading[memberKey]){loading[memberKey]=true;
    apiGet('/api/organizations/'+Q(id)+'/staff/'+Q(path[4])).then(function(m){cache[memberKey]=m;delete loading[memberKey];render()})
     .catch(function(err){errors[memberKey]=(err.data&&err.data.error)||err.message;delete loading[memberKey];render()});}
   if(errors[memberKey])return '<div class="empty-state">'+E(errors[memberKey])+'</div>';
   return member&&!member.archivedAt?staffForm(org,member):'<div class="loading-inline"><div class="loader"></div></div>';
  }
  var html='<div class="directory-body">'+sectionHead({title:L('فريق العمل','Staff'),icon:'users',sub:org.name},null)+
   '<div class="sp-actions"><a class="btn" href="#/owner/staff">'+L('كل المؤسسات','All institutions')+'</a> '+
   '<a class="btn green" href="#/'+root+'/new">'+L('إضافة موظف','Add staff member')+'</a></div>'+
   '<div class="arch-note">'+L('تغيير حالة الموظف هنا يخص هذه المؤسسة. الأرشفة تحفظ بيانات العضوية وسجل العمليات. المسمى الوظيفي لا يمنح صلاحيات إدارة المنصة.','Status changes here apply to this institution. Archived assignments and audit history remain available. Job titles do not grant platform permissions.')+'</div>'+
   '<form class="toolbar" onsubmit="ownerStaffSearch(event,\''+id+'\')"><input id="os-search" value="'+E(filters[id]||'')+'" placeholder="'+L('ابحث بالاسم أو البريد','Search name or email')+'"><button class="btn" type="submit">'+L('بحث','Search')+'</button></form>';
  if(errors[id])return html+'<div class="empty-state">'+E(errors[id])+'</div></div>';
  if(!data)return html+'<div class="loading-inline"><div class="loader"></div></div></div>';
  html+='<div class="table-wrap"><table class="tbl"><thead><tr><th>'+L('الموظف','Staff member')+'</th><th>'+L('الصفة','Role')+
   '</th><th>'+L('القسم','Department')+'</th><th>'+L('الحالة','Status')+'</th><th>'+L('الإجراءات','Actions')+'</th></tr></thead><tbody>'+
   data.items.map(function(m){return '<tr><td><b>'+E(m.name)+'</b><div class="entity-sub" dir="ltr">'+E(m.email)+'</div></td><td>'+E(roleName(m.role))+
    '<div class="entity-sub">'+E(m.jobTitle)+'</div></td><td>'+E(m.department||'—')+'</td><td>'+E(m.archivedAt?L('مؤرشف','Archived'):statusName(m.status))+
    '</td><td><div class="crud-actions">'+(m.archivedAt?(m.accountStatus==='active'?'<button class="crud edit" onclick="ownerStaffRestore(\''+id+'\',\''+m.userId+'\')" title="'+L('استعادة','Restore')+'">'+icon('check',14)+'</button>':'—'):
    '<a class="crud edit" href="#/'+root+'/edit/'+Q(m.userId)+'" title="'+L('تعديل','Edit')+'">'+icon('edit',14)+'</a>'+
    '<button class="crud edit" onclick="ownerStaffStatus(\''+id+'\',\''+m.userId+'\',\''+(m.status==='suspended'?'active':'suspended')+'\')" title="'+(m.status==='suspended'?L('تفعيل','Activate'):L('إيقاف','Suspend'))+'">'+icon(m.status==='suspended'?'check':'x',14)+'</button>'+
    '<button class="crud delete" onclick="ownerStaffArchive(\''+id+'\',\''+m.userId+'\')" title="'+L('أرشفة','Archive')+'">'+icon('trash',14)+'</button>')+
    '</div></td></tr>'}).join('')+'</tbody></table></div><div class="sp-actions" style="padding:14px 0"><span>'+E(data.total)+' '+L('عضوية','assignments')+'</span><button class="btn" onclick="ownerStaffPageMove(\''+id+'\',-1)"'+((paging[id]||0)?'':' disabled')+'>'+L('السابق','Previous')+'</button><button class="btn" onclick="ownerStaffPageMove(\''+id+'\',1)"'+(((paging[id]||0)+1)*25<data.total?'':' disabled')+'>'+L('التالي','Next')+'</button></div></div>';
  return html;
 };
})();
