
-- 1) Tabelle für Terminbuchungen erstellen
create table if not exists public.order_appointments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  scheduled_at timestamptz not null, -- gebuchter Zeitpunkt
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_at timestamptz,
  approved_by uuid references public.user_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) RLS aktivieren
alter table public.order_appointments enable row level security;

-- 3) RLS-Policies
-- Admins: Vollzugriff
drop policy if exists "Admins can manage all order appointments" on public.order_appointments;
create policy "Admins can manage all order appointments"
on public.order_appointments
as permissive
for all
to authenticated
using (get_user_role(auth.uid()) = 'admin')
with check (get_user_role(auth.uid()) = 'admin');

-- Mitarbeiter: Eigene Termine sehen
drop policy if exists "Employees can view their own appointments" on public.order_appointments;
create policy "Employees can view their own appointments"
on public.order_appointments
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from employees e
    where e.id = order_appointments.employee_id
      and e.email = (auth.jwt() ->> 'email')
  )
);

-- Mitarbeiter: Termine anlegen, aber nur für ihnen zugewiesene Aufträge
drop policy if exists "Employees can create appointments for assigned orders" on public.order_appointments;
create policy "Employees can create appointments for assigned orders"
on public.order_appointments
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from employees e
    where e.id = order_appointments.employee_id
      and e.email = (auth.jwt() ->> 'email')
  )
  and exists (
    select 1
    from order_assignments oa
    where oa.employee_id = order_appointments.employee_id
      and oa.order_id = order_appointments.order_id
  )
);

-- Hinweis: Updates/Löschungen durch Mitarbeiter sind derzeit nicht erlaubt (nur Admin).

-- 4) Trigger für updated_at
drop trigger if exists set_updated_at_order_appointments on public.order_appointments;
create trigger set_updated_at_order_appointments
before update on public.order_appointments
for each row
execute function public.update_updated_at_column();

-- 5) Optional: Validierung – keine Termine in der Vergangenheit buchen
create or replace function public.prevent_past_appointment()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if (tg_op = 'INSERT') and new.scheduled_at < now() then
    raise exception 'Cannot book appointments in the past';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_past_appointment_trigger on public.order_appointments;
create trigger prevent_past_appointment_trigger
before insert on public.order_appointments
for each row
execute function public.prevent_past_appointment();

-- 6) Realtime aktivieren
alter table public.order_appointments replica identity full;
alter publication supabase_realtime add table public.order_appointments;

-- 7) Indizes für schnellere Abfragen im Admin
create index if not exists idx_order_appointments_order_id on public.order_appointments(order_id);
create index if not exists idx_order_appointments_employee_id on public.order_appointments(employee_id);
create index if not exists idx_order_appointments_status on public.order_appointments(status);
