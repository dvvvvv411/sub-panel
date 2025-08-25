
-- 1) Tabelle: employment_contract_requests
create table if not exists public.employment_contract_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  token text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  requested_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists idx_employment_contract_requests_employee_id
  on public.employment_contract_requests(employee_id);

alter table public.employment_contract_requests enable row level security;

create policy if not exists "Admins can manage all contract requests"
  on public.employment_contract_requests
  for all
  using (get_user_role(auth.uid()) = 'admin')
  with check (get_user_role(auth.uid()) = 'admin');

drop trigger if exists set_timestamp_employment_contract_requests on public.employment_contract_requests;
create trigger set_timestamp_employment_contract_requests
before update on public.employment_contract_requests
for each row execute procedure public.update_updated_at_column();

-- 2) Tabelle: employment_contract_submissions
create table if not exists public.employment_contract_submissions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.employment_contract_requests(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,

  -- Schritt 1: Persönliche Daten
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  desired_start_date date,
  marital_status text,

  -- Schritt 2: Steuer- und Versicherungsdaten
  social_security_number text,
  tax_number text,
  health_insurance text,

  -- Schritt 3: Bankverbindung
  iban text,
  bic text,
  bank_name text,

  -- Schritt 4: Personalausweis (Storage-Pfade)
  id_front_path text,
  id_back_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_contract_submissions_request_id
  on public.employment_contract_submissions(request_id);

create index if not exists idx_contract_submissions_employee_id
  on public.employment_contract_submissions(employee_id);

alter table public.employment_contract_submissions enable row level security;

create policy if not exists "Admins can manage all contract submissions"
  on public.employment_contract_submissions
  for all
  using (get_user_role(auth.uid()) = 'admin')
  with check (get_user_role(auth.uid()) = 'admin');

drop trigger if exists set_timestamp_employment_contract_submissions on public.employment_contract_submissions;
create trigger set_timestamp_employment_contract_submissions
before update on public.employment_contract_submissions
for each row execute procedure public.update_updated_at_column();

-- 3) Privater Storage-Bucket für Ausweisfotos
insert into storage.buckets (id, name, public)
values ('ids', 'ids', false)
on conflict (id) do nothing;

-- RLS-Policies auf storage.objects für den Bucket 'ids'
create policy if not exists "Admins can read ids"
on storage.objects
for select
using (bucket_id = 'ids' and get_user_role(auth.uid()) = 'admin');

create policy if not exists "Admins can insert ids"
on storage.objects
for insert
with check (bucket_id = 'ids' and get_user_role(auth.uid()) = 'admin');

create policy if not exists "Admins can update ids"
on storage.objects
for update
using (bucket_id = 'ids' and get_user_role(auth.uid()) = 'admin')
with check (bucket_id = 'ids' and get_user_role(auth.uid()) = 'admin');

create policy if not exists "Admins can delete ids"
on storage.objects
for delete
using (bucket_id = 'ids' and get_user_role(auth.uid()) = 'admin');
