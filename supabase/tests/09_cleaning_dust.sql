-- CAILLOU™ step 09 cleaning contract acceptance test.
-- Safe on the target project: all fixtures are wrapped in a transaction and rolled back.

begin;

insert into auth.users(id) values
  ('90909090-9090-4909-8909-909090909091'::uuid),
  ('90909090-9090-4909-8909-909090909092'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('90909090-9090-4909-8909-909090909091'::uuid, 'Step09A', 'step09a'),
  ('90909090-9090-4909-8909-909090909092'::uuid, 'Step09B', 'step09b');

insert into public.user_rocks(id, user_id, specimen_id, name, adopted_at) values
  (
    '90909090-9090-4909-8909-909090909099'::uuid,
    '90909090-9090-4909-8909-909090909091'::uuid,
    'rock-012',
    'Proprement',
    now() - interval '2 days'
  );
insert into public.rock_progress(user_rock_id)
values ('90909090-9090-4909-8909-909090909099'::uuid);

set local role authenticated;
select set_config('request.jwt.claim.sub', '90909090-9090-4909-8909-909090909091', true);

select * from public.register_cleaning(
  '90909090-9090-4909-8909-909090909099'::uuid,
  '90909090-0001-4909-8909-909090909091'::uuid
);

-- Exact network replay: same receipt, no second cleaning.
select * from public.register_cleaning(
  '90909090-9090-4909-8909-909090909099'::uuid,
  '90909090-0001-4909-8909-909090909091'::uuid
);

DO $$
begin
  if (select cleaning_count from public.rock_progress where user_rock_id = '90909090-9090-4909-8909-909090909099'::uuid) <> 1 then
    raise exception 'cleaning replay incremented cleaning_count twice';
  end if;
  if (select interaction_count from public.rock_progress where user_rock_id = '90909090-9090-4909-8909-909090909099'::uuid) <> 1 then
    raise exception 'cleaning did not increment interaction_count exactly once';
  end if;
  if (select caress_count from public.rock_progress where user_rock_id = '90909090-9090-4909-8909-909090909099'::uuid) <> 0 then
    raise exception 'cleaning unexpectedly modified caress_count';
  end if;
  if (select lithons_generated from public.rock_progress where user_rock_id = '90909090-9090-4909-8909-909090909099'::uuid) <> 0 then
    raise exception 'cleaning unexpectedly generated Lithons';
  end if;
  if (select balance from public.wallets where user_id = '90909090-9090-4909-8909-909090909091'::uuid) <> 0 then
    raise exception 'cleaning unexpectedly changed wallet balance';
  end if;
  if exists (select 1 from public.lithon_ledger where user_id = '90909090-9090-4909-8909-909090909091'::uuid) then
    raise exception 'cleaning unexpectedly wrote to lithon_ledger';
  end if;
  if (select last_cleaned_at from public.user_rocks where id = '90909090-9090-4909-8909-909090909099'::uuid) is null then
    raise exception 'cleaning did not persist last_cleaned_at';
  end if;

  begin
    perform * from public.register_cleaning(
      '90909090-9090-4909-8909-909090909099'::uuid,
      '90909090-0002-4909-8909-909090909091'::uuid
    );
    raise exception 'distinct cleaning unexpectedly bypassed the 1-hour cadence';
  exception when sqlstate '55000' then
    null;
  end;
end
$$;

-- Once visible dust can exist again, the authoritative cadence must allow cleaning too.
reset role;
update public.user_rocks
set last_cleaned_at = now() - interval '61 minutes'
where id = '90909090-9090-4909-8909-909090909099'::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '90909090-9090-4909-8909-909090909091', true);
select * from public.register_cleaning(
  '90909090-9090-4909-8909-909090909099'::uuid,
  '90909090-0005-4909-8909-909090909091'::uuid
);

DO $$
begin
  if (select cleaning_count from public.rock_progress where user_rock_id = '90909090-9090-4909-8909-909090909099'::uuid) <> 2 then
    raise exception 'cleaning was not accepted after the one-hour cadence';
  end if;
  if (select interaction_count from public.rock_progress where user_rock_id = '90909090-9090-4909-8909-909090909099'::uuid) <> 2 then
    raise exception 'second valid cleaning did not increment interaction_count';
  end if;
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '90909090-9090-4909-8909-909090909092', true);

DO $$
begin
  begin
    perform * from public.register_cleaning(
      '90909090-9090-4909-8909-909090909099'::uuid,
      '90909090-0003-4909-8909-909090909092'::uuid
    );
    raise exception 'another user unexpectedly cleaned user A rock';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

reset role;
set local role anon;
DO $$
begin
  begin
    perform * from public.register_cleaning(
      '90909090-9090-4909-8909-909090909099'::uuid,
      '90909090-0004-4909-8909-909090909091'::uuid
    );
    raise exception 'anon unexpectedly executed register_cleaning';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

reset role;
rollback;

select
  (select count(*) from auth.users where id in (
    '90909090-9090-4909-8909-909090909091'::uuid,
    '90909090-9090-4909-8909-909090909092'::uuid
  )) as fixture_users_after_rollback,
  (select count(*) from public.lithon_ledger where user_id = '90909090-9090-4909-8909-909090909091'::uuid) as fixture_ledger_after_rollback;
