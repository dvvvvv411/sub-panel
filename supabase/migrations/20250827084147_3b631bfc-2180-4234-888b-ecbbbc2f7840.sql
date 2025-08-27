
-- 1) Neue Tabelle für Bankdetails je Mitarbeiter (1:1)
create table if not exists public.employee_bank_details (
  employee_id uuid primary key,
  iban text,
  bic text,
  bank_name text,
  account_holder text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_employee_bank_details_employee
    foreign key (employee_id) references public.employees (id) on delete cascade
);

-- 2) RLS aktivieren
alter table public.employee_bank_details enable row level security;

-- 3) Policies
-- Admins: volle Rechte
create policy if not exists "Admins can manage all bank details"
  on public.employee_bank_details
  for all
  using (get_user_role(auth.uid()) = 'admin')
  with check (get_user_role(auth.uid()) = 'admin');

-- Mitarbeiter: eigene Bankdaten lesen
create policy if not exists "Employees can view their own bank details"
  on public.employee_bank_details
  for select
  using (
    exists (
      select 1
      from public.employees e
      where e.id = employee_bank_details.employee_id
        and e.email = (auth.jwt() ->> 'email')
    )
  );

-- Mitarbeiter: eigene Bankdaten anlegen
create policy if not exists "Employees can insert their own bank details"
  on public.employee_bank_details
  for insert
  with check (
    exists (
      select 1
      from public.employees e
      where e.id = employee_bank_details.employee_id
        and e.email = (auth.jwt() ->> 'email')
    )
  );

-- Mitarbeiter: eigene Bankdaten aktualisieren
create policy if not exists "Employees can update their own bank details"
  on public.employee_bank_details
  for update
  using (
    exists (
      select 1
      from public.employees e
      where e.id = employee_bank_details.employee_id
        and e.email = (auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1
      from public.employees e
      where e.id = employee_bank_details.employee_id
        and e.email = (auth.jwt() ->> 'email')
    )
  );

-- 4) Trigger für updated_at (wir verwenden die bereits vorhandene Funktion)
drop trigger if exists trg_employee_bank_details_updated_at on public.employee_bank_details;
create trigger trg_employee_bank_details_updated_at
before update on public.employee_bank_details
for each row execute function public.update_updated_at_column();

-- 5) Einmaliger Backfill aus den aktuellsten Submissions je Mitarbeiter
-- Hinweis: DISTINCT ON wählt je employee_id die zuletzt erstellte Submission
insert into public.employee_bank_details (employee_id, iban, bic, bank_name, account_holder, created_at, updated_at)
select
  s.employee_id,
  s.iban,
  s.bic,
  s.bank_name,
  trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')) as account_holder,
  now(),
  now()
from (
  select distinct on (employee_id) *
  from public.employment_contract_submissions
  order by employee_id, created_at desc
) s
on conflict (employee_id) do update
set
  iban = excluded.iban,
  bic = excluded.bic,
  bank_name = excluded.bank_name,
  account_holder = excluded.account_holder,
  updated_at = now();
