-- Adds explicit classification fields so recommendation filtering never has to
-- infer a career field from a coincidental keyword alone.
alter table public.opportunities_catalog
  add column if not exists field_key text,
  add column if not exists role_key text,
  add column if not exists employment_type text,
  add column if not exists schedule_type text,
  add column if not exists description text,
  add column if not exists education_requirements text,
  add column if not exists experience_level text;

create index if not exists opportunities_catalog_field_key_idx
  on public.opportunities_catalog (field_key) where is_active = true;
create index if not exists opportunities_catalog_role_key_idx
  on public.opportunities_catalog (role_key) where is_active = true;
create index if not exists opportunities_catalog_employment_type_idx
  on public.opportunities_catalog (employment_type) where is_active = true;

comment on column public.opportunities_catalog.field_key is
  'Canonical top-level field from taxonomy.js; required for strict recommendation eligibility.';
comment on column public.opportunities_catalog.role_key is
  'Canonical role family from taxonomy.js; required for strict recommendation eligibility.';
