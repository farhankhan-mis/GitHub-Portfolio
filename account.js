(async()=>{
  const config=window.INTERNSHIP_TRACKER_CONFIG;
  const authCard=document.querySelector('#authCard');
  const workspace=document.querySelector('#workspace');
  const setup=document.querySelector('#setupNotice');
  const authForm=document.querySelector('#authForm');
  const authMessage=document.querySelector('#authMessage');
  const workspaceMessage=document.querySelector('#workspaceMessage');
  let mode='signin';

  if(!config?.supabaseUrl||!config?.supabasePublishableKey||config.supabaseUrl.includes('YOUR_PROJECT')){
    authCard.classList.add('hidden'); setup.classList.remove('hidden'); return;
  }
  const client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);
  const setMessage=(element,message,isError=true)=>{element.textContent=message;element.style.color=isError?'#a33535':'#23734d'};

  async function loadApplications(){
    const {data,error}=await client.from('applications').select('*').order('created_at',{ascending:false});
    if(error){setMessage(workspaceMessage,error.message);return}
    document.querySelector('#privateList').innerHTML=(data||[]).map(item=>`<article class="private-row"><div><strong>${escapeHtml(item.company)}</strong><span>${escapeHtml(item.role)}${item.location?' · '+escapeHtml(item.location):''}</span></div><span>${escapeHtml(item.status)}</span></article>`).join('')||'<p>No applications yet. Add your first one above.</p>';
  }
  function escapeHtml(value=''){const node=document.createElement('div');node.textContent=value;return node.innerHTML}
  async function showSession(session){
    authCard.classList.toggle('hidden',Boolean(session));workspace.classList.toggle('hidden',!session);
    if(session) await loadApplications();
  }

  document.querySelectorAll('.auth-tab').forEach(tab=>tab.addEventListener('click',()=>{
    mode=tab.dataset.mode;document.querySelectorAll('.auth-tab').forEach(item=>item.classList.toggle('active',item===tab));
    authForm.querySelector('button').textContent=mode==='signin'?'Sign in':'Create account';
    document.querySelector('#password').autocomplete=mode==='signin'?'current-password':'new-password';authMessage.textContent='';
  }));
  authForm.addEventListener('submit',async event=>{
    event.preventDefault();setMessage(authMessage,'Working…',false);
    const email=document.querySelector('#email').value.trim(),password=document.querySelector('#password').value;
    const result=mode==='signin'?await client.auth.signInWithPassword({email,password}):await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('account.html',location.href).href}});
    if(result.error){setMessage(authMessage,result.error.message);return}
    if(mode==='signup'&&!result.data.session){setMessage(authMessage,'Check your email to verify your account.',false);return}
    setMessage(authMessage,'Signed in.',false);await showSession(result.data.session);
  });
  document.querySelector('#signOut').addEventListener('click',()=>client.auth.signOut());
  document.querySelector('#quickAdd').addEventListener('submit',async event=>{
    event.preventDefault();const {data:{user}}=await client.auth.getUser();if(!user)return;
    const fields=Object.fromEntries(new FormData(event.currentTarget));
    const {error}=await client.from('applications').insert({...fields,user_id:user.id});
    if(error){setMessage(workspaceMessage,error.code==='23505'?'That company and position are already in your tracker.':error.message);return}
    event.currentTarget.reset();setMessage(workspaceMessage,'Opportunity added.',false);await loadApplications();
  });
  client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>showSession(session),0));
  const {data:{session}}=await client.auth.getSession();await showSession(session);
})();
