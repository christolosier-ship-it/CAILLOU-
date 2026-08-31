-- Step 04: keep display case while enforcing the canonical login pseudo in Postgres.
alter table public.profiles
  add constraint profiles_username_max_v1 check (char_length(username) <= 24),
  add constraint profiles_username_spacing_v1 check (
    username = regexp_replace(btrim(username), '[[:space:]]+', ' ', 'g')
  ),
  add constraint profiles_username_normalization_match_v1 check (
    username_normalized = lower(regexp_replace(btrim(username), '[[:space:]]+', ' ', 'g'))
  );
