alter table public.applications add column if not exists term text;
alter table public.applications add column if not exists city text;
alter table public.applications add column if not exists state text;
alter table public.applications add column if not exists work_mode text;
alter table public.applications add column if not exists listing_status text;
alter table public.applications add column if not exists details_eligibility text;
alter table public.applications add column if not exists source_url text;
alter table public.applications add column if not exists date_applied date;
alter table public.applications add column if not exists follow_up_notes text;
alter table public.applications add column if not exists date_added date not null default current_date;
alter table public.applications add column if not exists priority_level text;
alter table public.applications add column if not exists duplicate_status text not null default 'Unique';
alter table public.applications add column if not exists link_type text;
alter table public.applications add column if not exists posting_verification text not null default 'Not Verified';
alter table public.applications add column if not exists last_verified date;
alter table public.applications add column if not exists follow_up_date date;
alter table public.applications add column if not exists company_interest integer check (company_interest between 1 and 5);
alter table public.applications add column if not exists role_fit integer check (role_fit between 1 and 5);
alter table public.applications add column if not exists resume_match integer check (resume_match between 1 and 5);
alter table public.applications add column if not exists similar_company_roles integer not null default 1;
alter table public.applications add column if not exists application_guardrail text;
alter table public.applications add column if not exists cover_letter_url text;
alter table public.applications add column if not exists archived_on date;
alter table public.applications add column if not exists archive_reason text;

alter table public.opportunities_catalog add column if not exists term text;
alter table public.opportunities_catalog add column if not exists city text;
alter table public.opportunities_catalog add column if not exists state text;
alter table public.opportunities_catalog add column if not exists listing_status text not null default 'Active';
alter table public.opportunities_catalog add column if not exists details_eligibility text;
alter table public.opportunities_catalog add column if not exists source text;
alter table public.opportunities_catalog add column if not exists link_type text;
alter table public.opportunities_catalog add column if not exists posting_verification text not null default 'Not Verified';
alter table public.opportunities_catalog add column if not exists last_verified date;

create table if not exists public.networking_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  contact_name text not null,
  current_title text,
  location text,
  connection_type text,
  verification_source text,
  verified_on date,
  verification_status text not null default 'Not Verified',
  outreach_status text not null default 'Not Contacted',
  date_contacted date,
  follow_up_date date,
  response text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.networking_contacts enable row level security;
revoke all on public.networking_contacts from anon;
grant select, insert, update, delete on public.networking_contacts to authenticated;
drop policy if exists "Users own networking reads" on public.networking_contacts;
create policy "Users own networking reads" on public.networking_contacts for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users own networking inserts" on public.networking_contacts;
create policy "Users own networking inserts" on public.networking_contacts for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Users own networking updates" on public.networking_contacts;
create policy "Users own networking updates" on public.networking_contacts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Users own networking deletes" on public.networking_contacts;
create policy "Users own networking deletes" on public.networking_contacts for delete to authenticated using ((select auth.uid())=user_id);
