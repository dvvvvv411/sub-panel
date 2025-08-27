
-- Ensure RLS is enabled (usually already enabled)
alter table public.employment_contract_submissions enable row level security;

-- Allow employees to view their own contract submissions
create policy "Employees can view their own contract submissions"
  on public.employment_contract_submissions
  for select
  using (
    exists (
      select 1
      from public.employees e
      where e.id = employment_contract_submissions.employee_id
        and e.email = (auth.jwt() ->> 'email')
    )
  );

-- Allow employees to update their own contract submissions (e.g., IBAN/BIC/Bank name)
create policy "Employees can update their own contract submissions"
  on public.employment_contract_submissions
  for update
  using (
    exists (
      select 1
      from public.employees e
      where e.id = employment_contract_submissions.employee_id
        and e.email = (auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1
      from public.employees e
      where e.id = employment_contract_submissions.employee_id
        and e.email = (auth.jwt() ->> 'email')
    )
  );
