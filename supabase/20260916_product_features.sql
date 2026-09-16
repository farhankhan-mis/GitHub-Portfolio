-- Personalized recommendations, résumé analysis, notifications, and safe account controls.

alter table public.opportunities_catalog add column if not exists source text;
alter table public.opportunities_catalog add column if not exists source_url text;
alter table public.opportunities_catalog add column if not exists term text;
alter table public.opportunities_catalog add column if not exists city text;
alter table public.opportunities_catalog add column if not exists state text;
alter table public.opportunities_catalog add column if not exists listing_status text not null default 'Active';
alter table public.opportunities_catalog add column if not exists details_eligibility text;
alter table public.opportunities_catalog add column if not exists link_type text;
alter table public.opportunities_catalog add column if not exists posting_verification text;
alter table public.opportunities_catalog add column if not exists last_verified date;
alter table public.opportunities_catalog add column if not exists first_seen_at timestamptz not null default now();
alter table public.opportunities_catalog add column if not exists updated_at timestamptz not null default now();
alter table public.opportunities_catalog add column if not exists closed_at timestamptz;
alter table public.opportunities_catalog add column if not exists canonical_key text;
create unique index if not exists opportunities_catalog_canonical_key_idx on public.opportunities_catalog(canonical_key);

drop policy if exists "Signed-in users read active opportunities" on public.opportunities_catalog;
drop policy if exists "Signed-in users read opportunity catalog" on public.opportunities_catalog;
create policy "Signed-in users read opportunity catalog" on public.opportunities_catalog
for select to authenticated using (true);

alter table public.applications add column if not exists catalog_id uuid references public.opportunities_catalog(id) on delete set null;
alter table public.applications add column if not exists user_notes text;
alter table public.applications add column if not exists updated_at timestamptz not null default now();
create unique index if not exists applications_user_catalog_idx on public.applications(user_id,catalog_id) where catalog_id is not null;

alter table public.resume_documents add column if not exists extracted_text text;
alter table public.resume_documents add column if not exists extracted_keywords text[] not null default '{}';
alter table public.resume_documents add column if not exists analysis_status text not null default 'Pending';
alter table public.resume_documents add column if not exists analysis_summary text;
alter table public.resume_documents add column if not exists updated_at timestamptz not null default now();

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_id uuid references public.opportunities_catalog(id) on delete cascade,
  sentiment text not null check (sentiment in ('up','down')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,catalog_id)
);
alter table public.recommendation_feedback enable row level security;
revoke all on public.recommendation_feedback from anon;
grant select,insert,update,delete on public.recommendation_feedback to authenticated;
create policy "Users own feedback reads" on public.recommendation_feedback for select to authenticated using ((select auth.uid())=user_id);
create policy "Users own feedback inserts" on public.recommendation_feedback for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Users own feedback updates" on public.recommendation_feedback for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users own feedback deletes" on public.recommendation_feedback for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  browser_enabled boolean not null default false,
  weekly_email_enabled boolean not null default false,
  deadline_days integer not null default 7 check (deadline_days between 1 and 30),
  follow_up_days integer not null default 7 check (follow_up_days between 1 and 30),
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from anon;
grant select,insert,update,delete on public.notification_preferences to authenticated;
create policy "Users own notification settings reads" on public.notification_preferences for select to authenticated using ((select auth.uid())=user_id);
create policy "Users own notification settings inserts" on public.notification_preferences for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Users own notification settings updates" on public.notification_preferences for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users own notification settings deletes" on public.notification_preferences for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'Pending' check (status in ('Pending','Completed','Cancelled'))
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon;
grant select,insert,delete on public.account_deletion_requests to authenticated;
create policy "Users own deletion requests" on public.account_deletion_requests for select to authenticated using ((select auth.uid())=user_id);
create policy "Users create own deletion requests" on public.account_deletion_requests for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Users cancel own deletion requests" on public.account_deletion_requests for delete to authenticated using ((select auth.uid())=user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at=now(); return new; end; $$;

drop trigger if exists touch_applications_updated_at on public.applications;
create trigger touch_applications_updated_at before update on public.applications for each row execute function public.touch_updated_at();
drop trigger if exists touch_resumes_updated_at on public.resume_documents;
create trigger touch_resumes_updated_at before update on public.resume_documents for each row execute function public.touch_updated_at();
drop trigger if exists touch_feedback_updated_at on public.recommendation_feedback;
create trigger touch_feedback_updated_at before update on public.recommendation_feedback for each row execute function public.touch_updated_at();
