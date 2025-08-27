
-- 1) Neue Tabelle für manuelle Prämien-Anpassungen
create table if not exists public.premium_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null,
  amount numeric not null,          -- positive oder negative Beträge
  reason text,
  created_by uuid not null,         -- admin user_id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Performance: Index auf employee_id
create index if not exists idx_premium_adjustments_employee_id
  on public.premium_adjustments (employee_id);

-- updated_at automatisch pflegen (funktion existiert bereits im Projekt)
drop trigger if exists set_updated_at_on_premium_adjustments on public.premium_adjustments;
create trigger set_updated_at_on_premium_adjustments
before update on public.premium_adjustments
for each row execute function public.update_updated_at_column();

-- 2) Row Level Security aktivieren
alter table public.premium_adjustments enable row level security;

-- 3) RLS-Policies
-- Admins: dürfen alles
drop policy if exists "Admins can manage all premium adjustments" on public.premium_adjustments;
create policy "Admins can manage all premium adjustments"
  on public.premium_adjustments
  for all
  using (get_user_role(auth.uid()) = 'admin')
  with check (get_user_role(auth.uid()) = 'admin');

-- Mitarbeitende: dürfen nur ihre eigenen Anpassungen sehen (SELECT)
drop policy if exists "Employees can view their own premium adjustments" on public.premium_adjustments;
create policy "Employees can view their own premium adjustments"
  on public.premium_adjustments
  for select
  using (
    exists (
      select 1
      from public.employees e
      where e.id = premium_adjustments.employee_id
        and e.email = (auth.jwt() ->> 'email')
    )
  );
