
-- 1) Rollen-Enum
create type if not exists public.app_role as enum ('admin', 'mitarbeiter');

-- 2) Tabelle für Benutzerrollen
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- 3) RLS aktivieren
alter table public.user_roles enable row level security;

-- 4) Sicherheitsfunktion (bypass RLS) für Rollenprüfung
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- 5) Policies

-- Nutzer sehen ihre eigenen Rollen
drop policy if exists "Users can view their own roles" on public.user_roles;
create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

-- Admins dürfen alle Rollen sehen
drop policy if exists "Admins can view all roles" on public.user_roles;
create policy "Admins can view all roles"
on public.user_roles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Admins dürfen Rollen anlegen
drop policy if exists "Admins can insert roles" on public.user_roles;
create policy "Admins can insert roles"
on public.user_roles
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

-- Admins dürfen Rollen aktualisieren
drop policy if exists "Admins can update roles" on public.user_roles;
create policy "Admins can update roles"
on public.user_roles
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Admins dürfen Rollen löschen
drop policy if exists "Admins can delete roles" on public.user_roles;
create policy "Admins can delete roles"
on public.user_roles
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Optional: Nutzer dürfen sich einmalig selbst die Rolle 'mitarbeiter' geben,
-- falls sie noch KEINE Rolle haben (Erstzuweisung).
drop policy if exists "Users can self-assign 'mitarbeiter' once" on public.user_roles;
create policy "Users can self-assign 'mitarbeiter' once"
on public.user_roles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'mitarbeiter'::public.app_role
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
  )
);
