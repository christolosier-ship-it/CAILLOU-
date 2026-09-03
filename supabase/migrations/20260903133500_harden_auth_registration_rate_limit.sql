create table if not exists public.auth_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default statement_timestamp(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default statement_timestamp(),
  constraint auth_rate_limits_key_hash_format check (key_hash ~ '^[0-9a-f]{64}$')
);

alter table public.auth_rate_limits enable row level security;

revoke all on table public.auth_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.auth_rate_limits to service_role;

create or replace function public.consume_auth_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_attempts integer;
  v_window interval;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_limit_key' using errcode = '22023';
  end if;

  if p_limit < 1 or p_limit > 100 then
    raise exception 'invalid_rate_limit_limit' using errcode = '22023';
  end if;

  if p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'invalid_rate_limit_window' using errcode = '22023';
  end if;

  v_window := make_interval(secs => p_window_seconds);

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key_hash, 0));

  delete from public.auth_rate_limits
  where updated_at < v_now - interval '2 days';

  insert into public.auth_rate_limits (key_hash, window_started_at, attempt_count, updated_at)
  values (p_key_hash, v_now, 1, v_now)
  on conflict (key_hash) do update
  set
    window_started_at = case
      when public.auth_rate_limits.window_started_at <= v_now - v_window then v_now
      else public.auth_rate_limits.window_started_at
    end,
    attempt_count = case
      when public.auth_rate_limits.window_started_at <= v_now - v_window then 1
      else public.auth_rate_limits.attempt_count + 1
    end,
    updated_at = v_now
  returning attempt_count into v_attempts;

  return v_attempts <= p_limit;
end;
$$;

revoke all on function public.consume_auth_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text, integer, integer) to service_role;

comment on table public.auth_rate_limits is
  'Compteurs éphémères anti-abus pour les brokers Auth. Aucune donnée utilisateur brute : uniquement des clés SHA-256 pseudonymisées.';

comment on function public.consume_auth_rate_limit(text, integer, integer) is
  'Consomme atomiquement un quota anti-abus. Fonction réservée au service_role des Edge Functions.';
