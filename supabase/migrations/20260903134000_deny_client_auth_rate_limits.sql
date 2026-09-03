drop policy if exists auth_rate_limits_no_client_access on public.auth_rate_limits;

create policy auth_rate_limits_no_client_access
on public.auth_rate_limits
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
