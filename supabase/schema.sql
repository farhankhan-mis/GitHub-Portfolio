-- Internship Tracker account database. Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  in_school boolean,
  school_name text,
  graduation_year integer,
  job_types text[] not null default '{}',
  career_areas text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  location text,
  career_area text,
  posting_url text,
  source text,
  status text not null default 'Planning'
    check (status in ('Planning','Applied','Interviewing','Offer','Closed','Rejected','Withdrawn')),
  recommended_resume text,
  deadline date,
  priority_score integer check (priority_score between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists applications_user_company_role_unique
  on public.applications (user_id, lower(company), lower(role));

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
revoke all on public.profiles, public.applications from anon;
grant select, insert, update, delete on public.profiles, public.applications to authenticated;

drop policy if exists "Users own their profile reads" on public.profiles;
create policy "Users own their profile reads" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users own their profile inserts" on public.profiles;
create policy "Users own their profile inserts" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users own their profile updates" on public.profiles;
create policy "Users own their profile updates" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users own their profile deletes" on public.profiles;
create policy "Users own their profile deletes" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users own their application reads" on public.applications;
create policy "Users own their application reads" on public.applications for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users own their application inserts" on public.applications;
create policy "Users own their application inserts" on public.applications for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users own their application updates" on public.applications;
create policy "Users own their application updates" on public.applications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users own their application deletes" on public.applications;
create policy "Users own their application deletes" on public.applications for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists applications_touch_updated_at on public.applications;
create trigger applications_touch_updated_at before update on public.applications for each row execute function public.touch_updated_at();
