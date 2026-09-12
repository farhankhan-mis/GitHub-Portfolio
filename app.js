const seedApplications = [
  {id:1,company:'Northstar Advisory',role:'Strategy Consulting Intern',location:'Washington, DC',area:'Consulting',score:92,status:'Planning',resume:'Consulting',deadline:'2026-09-20',materials:3},
  {id:2,company:'Harborline Aerospace',role:'Data Analytics Intern',location:'Arlington, VA',area:'Data Analytics',score:89,status:'Applied',resume:'Data Analytics',deadline:'2026-09-24',materials:4},
  {id:3,company:'Monument Financial',role:'Corporate Finance Intern',location:'Baltimore, MD',area:'Finance',score:85,status:'Interviewing',resume:'Finance',deadline:'2026-09-28',materials:4},
  {id:4,company:'Pioneer Consumer Group',role:'Product Management Intern',location:'Chicago, IL',area:'Product Management',score:81,status:'Planning',resume:'Analyst',deadline:'2026-10-04',materials:2},
  {id:5,company:'Blue Ridge Technologies',role:'Sales & Marketing Intern',location:'McLean, VA',area:'Sales & Marketing',score:78,status:'Applied',resume:'Sales / Marketing',deadline:'2026-10-12',materials:3},
  {id:6,company:'Capital Transit Labs',role:'Business Operations Intern',location:'Remote, USA',area:'Operations',score:74,status:'Planning',resume:'Analyst',deadline:'2026-10-18',materials:2}
];
const archive = [
  {company:'Summit Partners Group',role:'Business Analyst Intern',area:'Consulting',status:'Closed',date:'Sep 8, 2026',notes:'Posting closed before application.'},
  {company:'Atlantic Retail Co.',role:'Merchandising Intern',area:'Sales & Marketing',status:'Rejected',date:'Sep 2, 2026',notes:'Application history retained for reference.'}
];
const statuses=['Planning','Applied','Interviewing','Offer','Closed'];
let applications=JSON.parse(localStorage.getItem('internship-demo-data')||'null')||structuredClone(seedApplications);
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function save(){localStorage.setItem('internship-demo-data',JSON.stringify(applications));renderAll()}
function resumeFor(area){return {Consulting:'Consulting','Data Analytics':'Data Analytics',Finance:'Finance','Sales & Marketing':'Sales / Marketing',Operations:'Analyst','Product Management':'Analyst'}[area]||'General'}
function priority(score){return score>=85?'High':score>=75?'Medium':'Low'}
function statusClass(s){return `status-${s.toLowerCase()}`}
function daysUntil(d){return Math.ceil((new Date(d+'T12:00:00')-new Date())/86400000)}
function renderMetrics(){
 const applied=applications.filter(a=>a.status==='Applied').length, interviews=applications.filter(a=>a.status==='Interviewing').length, high=applications.filter(a=>a.score>=85).length;
 const metrics=[['Active opportunities',applications.length,'Across '+new Set(applications.map(a=>a.area)).size+' career areas','A'],['Applications sent',applied,'Awaiting a response','✓'],['Interviews',interviews,'Currently in progress','→'],['High priority',high,'Recommended next actions','!']];
 $('#metricGrid').innerHTML=metrics.map(m=>`<article class="metric"><div class="metric-top"><span>${m[0]}</span><span class="metric-icon">${m[3]}</span></div><div class="metric-value">${m[1]}</div><div class="metric-detail">${m[2]}</div></article>`).join('');
}
function renderPriority(){
 $('#priorityList').innerHTML=[...applications].sort((a,b)=>b.score-a.score).slice(0,4).map(a=>`<div class="priority-item"><div><div class="company">${a.company}</div><div class="role">${a.role} · ${a.location}</div><div class="tags"><span class="tag">${a.area}</span><span class="tag">${a.status}</span><span class="tag">${a.resume} résumé</span></div></div><div class="score">${a.score}<small>priority</small></div></div>`).join('')||'<p class="empty">No active opportunities.</p>';
}
function renderPipeline(){
 const max=Math.max(1,...statuses.map(s=>applications.filter(a=>a.status===s).length));
 $('#pipelineChart').innerHTML=statuses.map(s=>{const n=applications.filter(a=>a.status===s).length;return `<div class="pipeline-row"><span>${s}</span><div class="track"><div class="bar" style="width:${n/max*100}%"></div></div><strong>${n}</strong></div>`}).join('');
}
function renderDeadlines(){
 const upcoming=[...applications].filter(a=>a.status!=='Closed').sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,3);
 $('#deadlineList').innerHTML=upcoming.map(a=>{const d=new Date(a.deadline+'T12:00:00');return `<div class="deadline"><div class="date-box"><small>${d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</small>${d.getDate()}</div><div><div class="company">${a.company}</div><div class="role">${a.role} · ${Math.max(0,daysUntil(a.deadline))} days left</div></div></div>`}).join('');
}
function populateFilters(){
 const currentStatus=$('#statusFilter').value,currentArea=$('#areaFilter').value;
 $('#statusFilter').innerHTML='<option value="All">All statuses</option>'+statuses.map(s=>`<option>${s}</option>`).join('');
 $('#areaFilter').innerHTML='<option value="All">All areas</option>'+[...new Set(applications.map(a=>a.area))].sort().map(s=>`<option>${s}</option>`).join('');
 $('#statusFilter').value=currentStatus||'All';$('#areaFilter').value=currentArea||'All';
}
function renderApplications(){
 const query=$('#searchInput').value.toLowerCase(),sf=$('#statusFilter').value,af=$('#areaFilter').value;
 const rows=applications.filter(a=>(sf==='All'||a.status===sf)&&(af==='All'||a.area===af)&&[a.company,a.role,a.location].join(' ').toLowerCase().includes(query));
 $('#applicationsBody').innerHTML=rows.map(a=>`<tr><td><div class="company">${a.company}</div><div class="role">${a.role}</div></td><td>${a.location}</td><td class="priority-${priority(a.score).toLowerCase()}">${a.score} · ${priority(a.score)}</td><td><select class="status-select ${statusClass(a.status)}" data-id="${a.id}" aria-label="Status for ${a.company}">${statuses.map(s=>`<option ${s===a.status?'selected':''}>${s}</option>`).join('')}</select></td><td>${a.resume}</td><td><div class="materials" title="${a.materials} of 4 materials ready">${[1,2,3,4].map(n=>`<span class="material-dot ${n<=a.materials?'ready':''}">${n<=a.materials?'✓':'·'}</span>`).join('')}</div></td><td>${new Date(a.deadline+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No opportunities match these filters.</td></tr>';
 $('#resultCount').textContent=`Showing ${rows.length} of ${applications.length} active opportunities`;
 $$('.status-select').forEach(el=>el.addEventListener('change',e=>{const item=applications.find(a=>a.id===Number(e.target.dataset.id));item.status=e.target.value;save()}));
}
function renderArchive(){
 $('#archiveBody').innerHTML=archive.map(a=>`<tr><td><div class="company">${a.company}</div><div class="role">${a.role}</div></td><td>${a.area}</td><td><span class="status-select status-closed">${a.status}</span></td><td>${a.date}</td><td>${a.notes}</td></tr>`).join('');
}
function renderAll(){populateFilters();renderMetrics();renderPriority();renderPipeline();renderDeadlines();renderApplications();renderArchive();$('#navActiveCount').textContent=applications.length;$('#navArchiveCount').textContent=archive.length}
function showView(name){$$('.view').forEach(v=>v.classList.remove('active'));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name));$('#'+name+'View').classList.add('active');$('#pageTitle').textContent={dashboard:'Overview',applications:'Applications',archive:'Archive'}[name]}
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
['searchInput','statusFilter','areaFilter'].forEach(id=>$('#'+id).addEventListener(id==='searchInput'?'input':'change',renderApplications));
$('#addButton').addEventListener('click',()=>$('#addDialog').showModal());
$('#saveOpportunity').addEventListener('click',e=>{if(!$('#addForm').reportValidity()){e.preventDefault();return}const data=new FormData($('#addForm'));const fit=Number(data.get('fit'));applications.push({id:Date.now(),company:data.get('company'),role:data.get('role'),location:data.get('location'),area:data.get('area'),score:55+fit*8,status:'Planning',resume:resumeFor(data.get('area')),deadline:data.get('deadline'),materials:1});$('#addForm').reset();save();showView('applications')});
$('#resetDemo').addEventListener('click',()=>{applications=structuredClone(seedApplications);localStorage.removeItem('internship-demo-data');renderAll()});
renderAll();
