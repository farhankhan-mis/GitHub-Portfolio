(async()=>{
  const config=window.INTERNSHIP_TRACKER_CONFIG;
  const cards=['authCard','verifyCard','recoveryCard','onboardingCard','workspace','setupNotice'];
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  let mode='signin',pendingEmail='',recoveryMode=false,currentProfile=null;

  function show(id){cards.forEach(card=>$('#'+card).classList.toggle('hidden',card!==id))}
  function message(selector,text,error=true){const el=$(selector);el.textContent=text;el.style.color=error?'#a33535':'#23734d'}
  function escapeHtml(value=''){const node=document.createElement('div');node.textContent=value;return node.innerHTML}
  function checkedValues(name){return $$(`input[name="${name}"]:checked`).map(input=>input.value)}

  if(!config?.supabaseUrl||!config?.supabasePublishableKey||config.supabaseUrl.includes('YOUR_PROJECT')){show('setupNotice');return}
  const client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);

  async function routeSession(session){
    if(!session){show(recoveryMode?'recoveryCard':'authCard');return}
    if(recoveryMode){show('recoveryCard');$('#recoveryRequestForm').classList.add('hidden');$('#newPasswordForm').classList.remove('hidden');$('#recoveryTitle').textContent='Choose a new password';$('#recoveryIntro').textContent='Create a new password for your account.';return}
    const {data,error}=await client.from('profiles').select('*').eq('user_id',session.user.id).maybeSingle();
    if(error){show('onboardingCard');message('#onboardingMessage',error.message);return}
    if(!data?.onboarding_complete){show('onboardingCard');return}
    show('workspace');await loadRecommendations(data);
  }

  async function loadRecommendations(profile){
    currentProfile=profile;
    const [catalogResponse,{data:tracked,error:trackedError},{data:contacts,error:contactsError},{data:resumes,error:resumeError}]=await Promise.all([fetch('opportunities.json',{cache:'no-store'}),client.from('applications').select('*').order('created_at',{ascending:false}),client.from('networking_contacts').select('*').order('created_at',{ascending:false}),client.from('resume_documents').select('*').order('created_at',{ascending:false})]);
    if(!catalogResponse.ok||trackedError||contactsError||resumeError){message('#workspaceMessage',(trackedError||contactsError||resumeError)?.message||'Could not load the opportunity catalog.');return}
    const data=await catalogResponse.json();
    const interests=[...(profile.role_interests||[]),...(profile.industries||[]),...(profile.custom_interests||[])].map(v=>v.toLowerCase());
    const locations=(profile.preferred_locations||[]).map(v=>v.toLowerCase());
    const ranked=(data||[]).map(item=>{
      const haystack=[item.role,item.role_family,item.industry,...(item.tags||[])].join(' ').toLowerCase();
      const interestMatches=interests.filter(value=>haystack.includes(value)||value.split(' ').some(word=>word.length>4&&haystack.includes(word))).length;
      const locationMatch=locations.some(value=>item.location.toLowerCase().includes(value)||value.includes(item.location.toLowerCase()))?2:0;
      const typeMatch=(profile.job_types||[]).includes(item.opportunity_type)?2:0;
      const modeMatch=(profile.work_modes||[]).includes(item.work_mode)?1:0;
      return {...item,match_score:interestMatches*3+locationMatch+typeMatch+modeMatch};
    }).filter(item=>item.match_score>0).sort((a,b)=>b.match_score-a.match_score);
    $('#feedSummary').textContent=`Showing ${ranked.length} matches based on your role, industry, location, and work preferences.`;
    $('#privateList').innerHTML=ranked.map(item=>`<article class="opportunity-record"><div class="record-head"><div><strong>${escapeHtml(item.company)}</strong><span>${escapeHtml(item.role)} · ${escapeHtml(item.location)}</span></div><span class="match-score">${item.match_score} match points</span></div><div class="record-tags"><span>${escapeHtml(item.opportunity_type)}</span><span>${escapeHtml(item.work_mode)}</span><span>${escapeHtml(item.industry)}</span><span>${escapeHtml(item.listing_status||'Active')}</span></div><p>${escapeHtml(item.details_eligibility||'Details will be added after verification.')}</p><div class="record-actions">${item.is_demo?'<span class="demo-badge">Demo match</span>':`<a class="primary opportunity-link" href="${escapeHtml(item.posting_url)}" target="_blank" rel="noopener noreferrer">View posting</a>`}<button class="secondary save-match" data-id="${item.id}" type="button">Save to tracker</button></div></article>`).join('')||'<p>No close matches are available yet. Edit your preferences to broaden the feed.</p>';
    $$('.save-match').forEach(button=>button.addEventListener('click',()=>saveMatch(button.dataset.id,ranked,profile)));
    renderTracker(tracked||[]);renderOverview(tracked||[]);renderNetworking(contacts||[]);renderResumes(resumes||[]);
  }

  async function saveMatch(id,ranked,profile){
    const item=ranked.find(row=>row.id===id),{data:{user}}=await client.auth.getUser();if(!item||!user)return;
    const resumeRecommendation=recommendResume(item.role_family,profile.majors||[]);
    const payload={user_id:user.id,company:item.company,role:item.role,location:item.location,career_area:item.role_family,posting_url:item.posting_url,source:item.source||'Recommendation feed',status:'Planning',recommended_resume:resumeRecommendation,deadline:item.deadline,priority_score:Math.min(100,60+item.match_score*4),term:item.term,city:item.city,state:item.state,work_mode:item.work_mode,listing_status:item.listing_status||'Active',details_eligibility:item.details_eligibility,source_url:item.posting_url,priority_level:item.match_score>=7?'High':item.match_score>=4?'Medium':'Low',link_type:item.link_type||'Needs review',posting_verification:item.posting_verification||'Not Verified',last_verified:item.last_verified,company_interest:3,role_fit:4,resume_match:4,application_guardrail:'No conflict'};
    const {error}=await client.from('applications').insert(payload);if(error){message('#workspaceMessage',error.code==='23505'?'This company and position are already saved.':error.message);return}
    message('#workspaceMessage','Saved to your tracker.',false);await loadRecommendations(profile);
  }
  function recommendResume(roleFamily,majors){const text=[roleFamily,...majors].join(' ').toLowerCase();if(text.includes('finance')||text.includes('account'))return'Finance résumé';if(text.includes('marketing')||text.includes('sales')||text.includes('communication'))return'Sales / Marketing résumé';if(text.includes('consult')||text.includes('strategy'))return'Consulting résumé';if(text.includes('data')||text.includes('analytics')||text.includes('information'))return'Data Analytics résumé';return'General résumé'}
  function renderOverview(records){
    const active=records.filter(r=>!['Rejected','Withdrawn','Closed','Closed / No Longer Open'].includes(r.status)),archived=records.length-active.length;
    const metrics=[['Active opportunities',active.length],['High priority',active.filter(r=>r.priority_level==='High').length],['Awaiting response',active.filter(r=>r.status==='Applied').length],['Interviews',active.filter(r=>r.status==='Interviewing').length],['Offers',active.filter(r=>r.status==='Offer').length],['Archived',archived]];
    $('#webMetrics').innerHTML=metrics.map(([label,value])=>`<article><span>${label}</span><strong>${value}</strong></article>`).join('');
    $('#nextActions').innerHTML=active.sort((a,b)=>(b.priority_score||0)-(a.priority_score||0)).slice(0,4).map(record=>`<div class="compact-action"><strong>${escapeHtml(record.company)} — ${escapeHtml(record.role)}</strong><span>${escapeHtml(record.priority_level||'Unscored')} priority · ${escapeHtml(record.status)}</span></div>`).join('')||'<p>Save opportunities from Discover to build your action list.</p>';
  }
  function renderTracker(records){
    const terminal=['Rejected','Withdrawn','Closed','Closed / No Longer Open'];const active=records.filter(record=>!terminal.includes(record.status)),archived=records.filter(record=>terminal.includes(record.status));
    $('#trackerList').innerHTML=active.map(record=>recordCard(record)).join('')||'<p>No saved opportunities yet.</p>';
    $('#archiveList').innerHTML=archived.map(record=>recordCard(record)).join('')||'<p>No archived opportunities.</p>';
    $$('.record-status').forEach(select=>select.addEventListener('change',()=>updateStatus(select.dataset.id,select.value)));
  }
  function recordCard(r){const statuses=['Planning','Applied','Interviewing','Offer','Rejected','Withdrawn','Closed / No Longer Open'];return `<details class="tracked-record"><summary><span><strong>${escapeHtml(r.company)}</strong><small>${escapeHtml(r.role)} · ${escapeHtml(r.location||'Location not listed')}</small></span><span class="priority-pill">${escapeHtml(r.priority_level||'Unscored')} · ${escapeHtml(r.status)}</span></summary><div class="record-grid"><label>Application status<select class="record-status" data-id="${r.id}">${statuses.map(status=>`<option ${status===r.status?'selected':''}>${status}</option>`).join('')}</select></label><div><b>Category</b>${escapeHtml(r.career_area||'')}</div><div><b>Term</b>${escapeHtml(r.term||'')}</div><div><b>Work mode</b>${escapeHtml(r.work_mode||'')}</div><div><b>Listing status</b>${escapeHtml(r.listing_status||'')}</div><div><b>Deadline</b>${escapeHtml(r.deadline||'Not listed')}</div><div><b>Priority score</b>${escapeHtml(String(r.priority_score??''))}</div><div><b>Recommended résumé</b>${escapeHtml(r.recommended_resume||'Review manually')}</div><div><b>Posting verification</b>${escapeHtml(r.posting_verification||'Not verified')}</div><div><b>Link type</b>${escapeHtml(r.link_type||'')}</div><div><b>Last verified</b>${escapeHtml(r.last_verified||'')}</div><div><b>Date applied</b>${escapeHtml(r.date_applied||'')}</div><div><b>Follow-up date</b>${escapeHtml(r.follow_up_date||'')}</div><div><b>Company interest</b>${escapeHtml(String(r.company_interest??''))}</div><div><b>Role fit</b>${escapeHtml(String(r.role_fit??''))}</div><div><b>Résumé match</b>${escapeHtml(String(r.resume_match??''))}</div><div><b>Duplicate check</b>${escapeHtml(r.duplicate_status||'Unique')}</div><div><b>Application guardrail</b>${escapeHtml(r.application_guardrail||'No conflict')}</div><div class="wide"><b>Eligibility and details</b>${escapeHtml(r.details_eligibility||'')}</div><div class="wide"><b>Follow-up and notes</b>${escapeHtml(r.follow_up_notes||r.notes||'')}</div></div>${r.source_url?`<a class="primary opportunity-link" href="${escapeHtml(r.source_url)}" target="_blank" rel="noopener noreferrer">Apply on source site</a>`:''}</details>`}
  async function updateStatus(id,status){const terminal=['Rejected','Withdrawn','Closed / No Longer Open'].includes(status);const changes={status,archived_on:terminal?new Date().toISOString().slice(0,10):null,archive_reason:terminal?status:null,date_applied:status==='Applied'?new Date().toISOString().slice(0,10):undefined};Object.keys(changes).forEach(key=>changes[key]===undefined&&delete changes[key]);const {error}=await client.from('applications').update(changes).eq('id',id);if(error){message('#workspaceMessage',error.message);return}message('#workspaceMessage',terminal?'Moved to Archive.':'Application status updated.',false);await loadRecommendations(currentProfile)}
  function renderNetworking(contacts){$('#networkingList').innerHTML=contacts.map(contact=>`<article class="opportunity-record"><strong>${escapeHtml(contact.contact_name)} · ${escapeHtml(contact.company)}</strong><p>${escapeHtml(contact.current_title||'Title not entered')} · ${escapeHtml(contact.location||'Location not entered')}</p><div class="record-tags"><span>${escapeHtml(contact.verification_status)}</span><span>${escapeHtml(contact.outreach_status)}</span><span>${escapeHtml(contact.connection_type||'Contact')}</span></div>${contact.verification_source?`<a href="${escapeHtml(contact.verification_source)}" target="_blank" rel="noopener noreferrer">Open verification source</a>`:''}</article>`).join('')||'<p>No verified contacts added.</p>'}
  function renderResumes(resumes){$('#resumeList').innerHTML=resumes.map(resume=>`<article class="opportunity-record"><strong>${escapeHtml(resume.resume_type)} résumé</strong><p>${escapeHtml(resume.file_name)} · uploaded ${escapeHtml(String(resume.created_at).slice(0,10))}</p></article>`).join('')||'<p>No résumé versions uploaded.</p>'}

  $$('.auth-tab').forEach(tab=>tab.addEventListener('click',()=>{
    mode=tab.dataset.mode;$$('.auth-tab').forEach(item=>item.classList.toggle('active',item===tab));
    $$('.signup-only').forEach(el=>el.classList.toggle('hidden',mode!=='signup'));
    $$('.signin-only').forEach(el=>el.classList.toggle('hidden',mode!=='signin'));
    $('#confirmPassword').required=mode==='signup';
    $('#password').autocomplete=mode==='signin'?'current-password':'new-password';
    $('#authForm button[type="submit"]').textContent=mode==='signin'?'Sign in':'Create account';
    $('#authMessage').textContent='';
  }));

  $('#authForm').addEventListener('submit',async event=>{
    event.preventDefault();message('#authMessage','Working…',false);
    const email=$('#email').value.trim(),password=$('#password').value;
    if(mode==='signup'){
      if(password!==$('#confirmPassword').value){message('#authMessage','Passwords do not match.');return}
      const {error}=await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('account.html',location.href).href}});
      if(error){message('#authMessage',error.message);return}
      pendingEmail=email;$('#verifyEmail').textContent=email;$('#verificationCode').value='';show('verifyCard');return;
    }
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error){message('#authMessage',error.message);return}
    await routeSession(data.session);
  });

  $('#verifyForm').addEventListener('submit',async event=>{
    event.preventDefault();message('#verifyMessage','Verifying…',false);
    const {data,error}=await client.auth.verifyOtp({email:pendingEmail,token:$('#verificationCode').value.trim(),type:'email'});
    if(error){message('#verifyMessage',error.message);return}
    message('#verifyMessage','Email verified.',false);await routeSession(data.session);
  });
  $('#backToSignIn').addEventListener('click',()=>show('authCard'));

  $('#forgotPassword').addEventListener('click',()=>{recoveryMode=false;$('#recoveryRequestForm').classList.remove('hidden');$('#newPasswordForm').classList.add('hidden');$('#recoveryTitle').textContent='Reset your password';$('#recoveryIntro').textContent='Enter your email and we’ll send a secure reset link.';show('recoveryCard')});
  $('#recoveryBack').addEventListener('click',()=>{recoveryMode=false;show('authCard')});
  $('#recoveryRequestForm').addEventListener('submit',async event=>{
    event.preventDefault();const redirectTo=new URL('account.html?recovery=1',location.href).href;
    const {error}=await client.auth.resetPasswordForEmail($('#recoveryEmail').value.trim(),{redirectTo});
    message('#recoveryMessage',error?error.message:'If an account exists for that email, a reset message has been sent.',Boolean(error));
  });
  $('#newPasswordForm').addEventListener('submit',async event=>{
    event.preventDefault();const password=$('#newPassword').value;
    if(password!==$('#confirmNewPassword').value){message('#recoveryMessage','Passwords do not match.');return}
    const {error}=await client.auth.updateUser({password});
    if(error){message('#recoveryMessage',error.message);return}
    recoveryMode=false;await client.auth.signOut();show('authCard');message('#authMessage','Password updated. Sign in with your new password.',false);
  });

  $('#onboardingForm').addEventListener('submit',async event=>{
    event.preventDefault();const roleInterests=checkedValues('role_interests'),industries=checkedValues('industries'),jobTypes=checkedValues('job_types');
    if(!roleInterests.length||!industries.length||!jobTypes.length){message('#onboardingMessage','Select at least one field, role type, and opportunity type.');return}
    const form=new FormData(event.currentTarget),{data:{user}}=await client.auth.getUser();
    const csv=name=>String(form.get(name)||'').split(',').map(v=>v.trim()).filter(Boolean);
    const profile={user_id:user.id,in_school:form.get('in_school')==='true',education_level:form.get('education_level')||null,school_name:form.get('school_name')||null,graduation_year:Number(form.get('graduation_year'))||null,majors:csv('majors'),minors:csv('minors'),career_areas:roleInterests,industries,role_interests:roleInterests,custom_interests:csv('custom_interests'),job_types:jobTypes,work_modes:checkedValues('work_modes'),preferred_locations:csv('preferred_locations'),onboarding_complete:true};
    const {error}=await client.from('profiles').upsert(profile,{onConflict:'user_id'});
    if(error){message('#onboardingMessage',error.message);return}
    show('workspace');await loadRecommendations(profile);
  });

  $('#studentStatus').addEventListener('change',event=>{$('#studentFields').classList.toggle('hidden',event.target.value!=='true')});
  $('#editPreferences').addEventListener('click',()=>show('onboardingCard'));
  $('#networkingForm').addEventListener('submit',async event=>{event.preventDefault();const {data:{user}}=await client.auth.getUser();const payload={...Object.fromEntries(new FormData(event.currentTarget)),user_id:user.id,verified_on:event.currentTarget.verification_status.value==='Verified'?new Date().toISOString().slice(0,10):null};const {error}=await client.from('networking_contacts').insert(payload);if(error){message('#workspaceMessage',error.message);return}event.currentTarget.reset();message('#workspaceMessage','Contact added.',false);await loadRecommendations(currentProfile)});
  $('#resumeForm').addEventListener('submit',async event=>{event.preventDefault();const file=event.currentTarget.resume_file.files[0],type=event.currentTarget.resume_type.value,{data:{user}}=await client.auth.getUser();if(!file||!user)return;const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=`${user.id}/${Date.now()}_${safeName}`;const {error:uploadError}=await client.storage.from('resumes').upload(path,file,{contentType:'application/pdf',upsert:false});if(uploadError){message('#workspaceMessage',uploadError.message);return}const {error}=await client.from('resume_documents').insert({user_id:user.id,resume_type:type,file_name:file.name,storage_path:path});if(error){message('#workspaceMessage',error.message);return}event.currentTarget.reset();message('#workspaceMessage','Résumé uploaded privately.',false);await loadRecommendations(currentProfile)});
  $$('.workspace-tab').forEach(tab=>tab.addEventListener('click',()=>{$$('.workspace-tab').forEach(item=>item.classList.toggle('active',item===tab));$$('.workspace-panel').forEach(panel=>panel.classList.toggle('active',panel.id===tab.dataset.panel+'Panel'));$('#workspaceTitle').textContent={overview:'Dashboard',discover:'Recommended opportunities',tracker:'My tracker',archive:'Archive',resumes:'Résumés',networking:'Networking'}[tab.dataset.panel]}));

  $$('.sign-out').forEach(button=>button.addEventListener('click',async()=>{await client.auth.signOut();show('authCard')}));
  client.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){recoveryMode=true}setTimeout(()=>routeSession(session),0)});
  recoveryMode=new URLSearchParams(location.search).get('recovery')==='1';
  const {data:{session}}=await client.auth.getSession();await routeSession(session);
})();
