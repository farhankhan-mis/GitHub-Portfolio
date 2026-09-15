(async()=>{
  const config=window.INTERNSHIP_TRACKER_CONFIG;
  const cards=['authCard','verifyCard','recoveryCard','onboardingCard','workspace','setupNotice'];
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  let mode='signin',pendingEmail='',recoveryMode=false;

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
    const {data,error}=await client.from('opportunities_catalog').select('*').eq('is_active',true);
    if(error){message('#workspaceMessage',error.message);return}
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
    $('#privateList').innerHTML=ranked.map(item=>`<article class="private-row opportunity-card"><div><strong>${escapeHtml(item.company)}</strong><span>${escapeHtml(item.role)} · ${escapeHtml(item.location)}</span><span>${escapeHtml(item.opportunity_type)} · ${escapeHtml(item.work_mode)} · ${escapeHtml(item.industry)}</span></div>${item.is_demo?'<span class="demo-badge">Demo match</span>':`<a class="primary opportunity-link" href="${escapeHtml(item.posting_url)}" target="_blank" rel="noopener noreferrer">View posting</a>`}</article>`).join('')||'<p>No close matches are available yet. Edit your preferences to broaden the feed.</p>';
  }

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

  $$('.sign-out').forEach(button=>button.addEventListener('click',async()=>{await client.auth.signOut();show('authCard')}));
  client.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){recoveryMode=true}setTimeout(()=>routeSession(session),0)});
  recoveryMode=new URLSearchParams(location.search).get('recovery')==='1';
  const {data:{session}}=await client.auth.getSession();await routeSession(session);
})();
