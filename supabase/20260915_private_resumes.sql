create table if not exists public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_type text not null,
  file_name text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
alter table public.resume_documents enable row level security;
revoke all on public.resume_documents from anon;
grant select, insert, update, delete on public.resume_documents to authenticated;
drop policy if exists "Users own resume metadata reads" on public.resume_documents;
create policy "Users own resume metadata reads" on public.resume_documents for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users own resume metadata inserts" on public.resume_documents;
create policy "Users own resume metadata inserts" on public.resume_documents for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Users own resume metadata updates" on public.resume_documents;
create policy "Users own resume metadata updates" on public.resume_documents for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Users own resume metadata deletes" on public.resume_documents;
create policy "Users own resume metadata deletes" on public.resume_documents for delete to authenticated using ((select auth.uid())=user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('resumes','resumes',false,10485760,array['application/pdf'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];

drop policy if exists "Users upload own resume files" on storage.objects;
create policy "Users upload own resume files" on storage.objects for insert to authenticated
with check (bucket_id='resumes' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users read own resume files" on storage.objects;
create policy "Users read own resume files" on storage.objects for select to authenticated
using (bucket_id='resumes' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users update own resume files" on storage.objects;
create policy "Users update own resume files" on storage.objects for update to authenticated
using (bucket_id='resumes' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='resumes' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users delete own resume files" on storage.objects;
create policy "Users delete own resume files" on storage.objects for delete to authenticated
using (bucket_id='resumes' and (storage.foldername(name))[1]=(select auth.uid())::text);
