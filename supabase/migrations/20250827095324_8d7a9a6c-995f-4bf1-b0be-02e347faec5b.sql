
-- 1) Feld für den neuen Admin-Schritt "Feedback" am Termin
alter table public.order_appointments
  add column if not exists feedback_requested boolean not null default false;

-- 2) WhatsApp-Accounts: Admin-Policy permissiv machen und Mitarbeiter-SELECT erlauben
--    Hintergrund: bisher war die Admin-Policy restriktiv (blockiert andere),
--    wodurch Join-Ergebnisse für Mitarbeitende leer blieben und der Button deaktiviert war.

drop policy if exists "Admins can manage all WhatsApp accounts" on public.whatsapp_accounts;

create policy "Admins can manage all WhatsApp accounts"
on public.whatsapp_accounts
as permissive
for all
to authenticated
using (get_user_role(auth.uid()) = 'admin')
with check (get_user_role(auth.uid()) = 'admin');

-- Mitarbeitende dürfen WhatsApp-Accounts sehen, wenn sie dem entsprechenden Auftrag zugewiesen sind
create policy "Employees can view WhatsApp accounts for assigned orders"
on public.whatsapp_accounts
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.order_assignments oa on oa.order_id = o.id
    join public.employees e on e.id = oa.employee_id
    where o.whatsapp_account_id = whatsapp_accounts.id
      and e.email = (auth.jwt() ->> 'email')
  )
);
