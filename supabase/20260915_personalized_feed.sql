alter table public.profiles add column if not exists education_level text;
alter table public.profiles add column if not exists majors text[] not null default '{}';
alter table public.profiles add column if not exists minors text[] not null default '{}';
alter table public.profiles add column if not exists industries text[] not null default '{}';
alter table public.profiles add column if not exists role_interests text[] not null default '{}';
alter table public.profiles add column if not exists custom_interests text[] not null default '{}';
alter table public.profiles add column if not exists work_modes text[] not null default '{}';

create table if not exists public.opportunities_catalog (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  location text not null,
  role_family text not null,
  industry text not null,
  opportunity_type text not null,
  work_mode text not null,
  posting_url text,
  tags text[] not null default '{}',
  deadline date,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.opportunities_catalog enable row level security;
revoke all on public.opportunities_catalog from anon;
grant select on public.opportunities_catalog to authenticated;
drop policy if exists "Signed-in users read active opportunities" on public.opportunities_catalog;
create policy "Signed-in users read active opportunities" on public.opportunities_catalog
for select to authenticated using (is_active = true);

insert into public.opportunities_catalog (company,role,location,role_family,industry,opportunity_type,work_mode,tags,is_demo)
select * from (values
  ('Northstar Health','Public Health Analytics Intern','Washington, DC','Analytics & Data','Healthcare','Internship','Hybrid',array['public health','statistics','data'],true),
  ('Monument Policy Institute','Research and Policy Intern','Washington, DC','Research & Policy','Government & Public Policy','Internship','Hybrid',array['political science','economics','research'],true),
  ('Blue Ridge Systems','Cybersecurity Intern','Arlington, VA','Software & IT','Technology','Internship','On-site',array['cybersecurity','information systems','computer science'],true),
  ('Harbor Financial Group','Corporate Finance Intern','Baltimore, MD','Finance & Accounting','Finance & Accounting','Internship','Hybrid',array['finance','accounting','economics'],true),
  ('Pioneer Consumer Labs','Marketing Insights Intern','Remote, USA','Marketing & Communications','Business & Consulting','Internship','Remote',array['marketing','communications','consumer research'],true),
  ('Capital Engineering Works','Industrial Engineering Co-op','Richmond, VA','Engineering','Engineering & Manufacturing','Co-op','On-site',array['industrial engineering','manufacturing','process improvement'],true),
  ('Atlantic Education Network','Education Program Fellow','Remote, USA','Research & Policy','Education & Research','Fellowship','Remote',array['education','program evaluation','nonprofit'],true),
  ('Greenway Energy','Sustainability Analyst Intern','Washington, DC','Analytics & Data','Environment & Sustainability','Internship','Hybrid',array['sustainability','environment','analytics'],true),
  ('Civic Legal Services','Compliance Intern','Washington, DC','Legal & Compliance','Law & Compliance','Internship','On-site',array['legal studies','compliance','policy'],true),
  ('Nova Biotech','Laboratory Research Intern','Rockville, MD','Science & Laboratory','Healthcare','Internship','On-site',array['biology','chemistry','laboratory'],true),
  ('Potomac Commerce','Supply Chain Intern','McLean, VA','Operations & Supply Chain','Business & Consulting','Internship','Hybrid',array['supply chain','operations','logistics'],true),
  ('Commonwealth Design Studio','UX Research Intern','Remote, USA','Design & UX','Technology','Internship','Remote',array['psychology','design','user research'],true)
) as seed(company,role,location,role_family,industry,opportunity_type,work_mode,tags,is_demo)
where not exists (select 1 from public.opportunities_catalog);
