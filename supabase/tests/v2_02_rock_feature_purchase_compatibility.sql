-- CAILLOU™ V2-02 lots C/D/E acceptance test.
-- Fixtures are transactional and rolled back.

begin;

insert into auth.users(id) values
  ('c2000000-0000-4000-8000-000000000001'::uuid),
  ('c2000000-0000-4000-8000-000000000002'::uuid),
  ('c2000000-0000-4000-8000-000000000003'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('c2000000-0000-4000-8000-000000000001'::uuid, 'V202A', 'v202a'),
  ('c2000000-0000-4000-8000-000000000002'::uuid, 'V202B', 'v202b'),
  ('c2000000-0000-4000-8000-000000000003'::uuid, 'V202C', 'v202c');

insert into public.user_rocks(id, user_id, specimen_id, name, adopted_at) values
  ('c2000000-1000-4000-8000-000000000001'::uuid, 'c2000000-0000-4000-8000-000000000001'::uuid, 'rock-001', 'CDE-A1', now() - interval '1 day'),
  ('c2000000-1000-4000-8000-000000000002'::uuid, 'c2000000-0000-4000-8000-000000000002'::uuid, 'rock-002', 'CDE-B1', now() - interval '1 day');

update public.wallets set balance = 2500, lifetime_earned = 2500
where user_id = 'c2000000-0000-4000-8000-000000000001'::uuid;
update public.wallets set balance = 999, lifetime_earned = 999
where user_id = 'c2000000-0000-4000-8000-000000000002'::uuid;

-- Simulate a completed V1 receipt that an old cached PWA may retry after upgrade.
insert into private.mutation_receipts(user_id, event_key, operation, result)
values (
  'c2000000-0000-4000-8000-000000000003'::uuid,
  'c2000000-2000-4000-8000-000000000099'::uuid,
  'purchase_feature_unlock',
  jsonb_build_object(
    'balance', 42,
    'feature_id', 'rock_movement',
    'unlocked_at', '2026-09-02T07:42:36Z',
    'price_paid', 1000
  )
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000001', true);

do $$
declare
  v_rock uuid;
  v_balance bigint;
  v_unlocked timestamptz;
  v_replay timestamptz;
  v_price bigint;
begin
  begin
    perform * from public.purchase_rock_feature_unlock(
      'c2000000-1000-4000-8000-000000000002'::uuid,
      'rock_movement',
      'c2000000-2000-4000-8000-000000000001'::uuid
    );
    raise exception 'user A unexpectedly unlocked feature on user B rock';
  exception when insufficient_privilege then null;
  end;

  select user_rock_id, balance, unlocked_at, price_paid
    into v_rock, v_balance, v_unlocked, v_price
  from public.purchase_rock_feature_unlock(
    'c2000000-1000-4000-8000-000000000001'::uuid,
    'rock_movement',
    'c2000000-2000-4000-8000-000000000002'::uuid
  );

  if v_rock <> 'c2000000-1000-4000-8000-000000000001'::uuid or v_balance <> 1500 or v_price <> 1000 then
    raise exception 'authoritative per-rock purchase returned an invalid result';
  end if;
  if (select acquisition_source from public.rock_feature_unlocks where user_rock_id=v_rock and feature_id='rock_movement') <> 'purchase' then
    raise exception 'purchase acquisition source not persisted';
  end if;
  if (select user_rock_id from public.lithon_ledger where event_key='c2000000-2000-4000-8000-000000000002'::uuid) is distinct from v_rock then
    raise exception 'V2 feature ledger row is not tied to the purchased rock';
  end if;

  select unlocked_at into v_replay
  from public.purchase_rock_feature_unlock(
    'c2000000-1000-4000-8000-000000000001'::uuid,
    'rock_movement',
    'c2000000-2000-4000-8000-000000000002'::uuid
  );
  if v_replay is distinct from v_unlocked then
    raise exception 'same event key did not replay the original rock purchase';
  end if;
  if (select count(*) from public.lithon_ledger where event_key='c2000000-2000-4000-8000-000000000002'::uuid) <> 1 then
    raise exception 'same event key duplicated the ledger debit';
  end if;

  begin
    perform * from public.purchase_rock_feature_unlock(
      'c2000000-1000-4000-8000-000000000001'::uuid,
      'rock_movement',
      'c2000000-2000-4000-8000-000000000003'::uuid
    );
    raise exception 'second purchase with a distinct event key unexpectedly succeeded';
  exception when unique_violation then null;
  end;

  if (select count(*) from public.user_feature_unlocks where feature_id='rock_movement') <> 1 then
    raise exception 'V1 compatibility projection did not expose current active-rock entitlement';
  end if;

  perform * from public.commit_placement_session(
    'c2000000-1000-4000-8000-000000000001'::uuid,
    'c2000000-3000-4000-8000-000000000001'::uuid,
    true,
    '[0.1,0,0]'::jsonb,
    '[0,0,0,1]'::jsonb,
    '[]'::jsonb
  );
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000002', true);

do $$
begin
  if (select count(*) from public.rock_feature_unlocks) <> 0 then
    raise exception 'RLS leaked user A rock entitlement to user B';
  end if;
  if (select count(*) from public.user_feature_unlocks) <> 0 then
    raise exception 'V1 compatibility projection leaked user A entitlement to user B';
  end if;

  begin
    perform * from public.purchase_rock_feature_unlock(
      'c2000000-1000-4000-8000-000000000001'::uuid,
      'rock_movement',
      'c2000000-2000-4000-8000-000000000004'::uuid
    );
    raise exception 'user B unexpectedly purchased on user A rock';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.purchase_rock_feature_unlock(
      'c2000000-1000-4000-8000-000000000002'::uuid,
      'rock_movement',
      'c2000000-2000-4000-8000-000000000005'::uuid
    );
    raise exception 'insufficient wallet unexpectedly purchased feature';
  exception when numeric_value_out_of_range then null;
  end;
end
$$;

reset role;
update public.wallets set balance = 2000, lifetime_earned = 2000
where user_id = 'c2000000-0000-4000-8000-000000000002'::uuid;
update public.feature_catalog set active = false where id='rock_movement';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000002', true);

do $$
begin
  begin
    perform * from public.purchase_rock_feature_unlock(
      'c2000000-1000-4000-8000-000000000002'::uuid,
      'rock_movement',
      'c2000000-2000-4000-8000-000000000006'::uuid
    );
    raise exception 'inactive feature unexpectedly purchased';
  exception when invalid_parameter_value then null;
  end;
end
$$;

reset role;
update public.feature_catalog set active = true where id='rock_movement';
update public.user_rocks set discarded_at = now()
where id='c2000000-1000-4000-8000-000000000002'::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000002', true);

do $$
begin
  begin
    perform * from public.purchase_rock_feature_unlock(
      'c2000000-1000-4000-8000-000000000002'::uuid,
      'rock_movement',
      'c2000000-2000-4000-8000-000000000007'::uuid
    );
    raise exception 'discarded rock unexpectedly accepted a feature purchase';
  exception when insufficient_privilege then null;
  end;
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000001', true);

select * from public.discard_active_rock(
  'c2000000-1000-4000-8000-000000000001'::uuid,
  'c2000000-4000-4000-8000-000000000001'::uuid
);

do $$
begin
  if (select count(*) from public.rock_feature_unlocks where user_rock_id='c2000000-1000-4000-8000-000000000001'::uuid) <> 1 then
    raise exception 'discard removed historical per-rock entitlement';
  end if;
  if (select count(*) from public.user_feature_unlocks where feature_id='rock_movement') <> 0 then
    raise exception 'discarded rock still appears unlocked through V1 compatibility view';
  end if;
end
$$;

reset role;
insert into public.user_rocks(id, user_id, specimen_id, name, adopted_at) values
  ('c2000000-1000-4000-8000-000000000003'::uuid, 'c2000000-0000-4000-8000-000000000001'::uuid, 'rock-003', 'CDE-A2', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000001', true);

do $$
declare
  v_balance bigint;
  v_price bigint;
begin
  if (select count(*) from public.user_feature_unlocks where feature_id='rock_movement') <> 0 then
    raise exception 'new rock inherited feature through compatibility view';
  end if;

  begin
    perform * from public.commit_placement_session(
      'c2000000-1000-4000-8000-000000000003'::uuid,
      'c2000000-3000-4000-8000-000000000002'::uuid,
      true,
      '[0.1,0,0]'::jsonb,
      '[0,0,0,1]'::jsonb,
      '[]'::jsonb
    );
    raise exception 'new rock moved without its own permit';
  exception when insufficient_privilege then null;
  end;

  select balance, price_paid into v_balance, v_price
  from public.purchase_feature_unlock(
    'rock_movement',
    'c2000000-2000-4000-8000-000000000008'::uuid
  );
  if v_balance <> 500 or v_price <> 1000 then
    raise exception 'V1 compatibility RPC did not debit server price on active new rock';
  end if;
  if not exists (
    select 1 from public.rock_feature_unlocks
    where user_rock_id='c2000000-1000-4000-8000-000000000003'::uuid
      and feature_id='rock_movement'
  ) then
    raise exception 'V1 compatibility RPC did not route to the active rock entitlement';
  end if;
  if (select count(*) from public.user_feature_unlocks where feature_id='rock_movement') <> 1 then
    raise exception 'V1 compatibility view did not reflect the new active-rock purchase';
  end if;

  perform * from public.commit_placement_session(
    'c2000000-1000-4000-8000-000000000003'::uuid,
    'c2000000-3000-4000-8000-000000000003'::uuid,
    true,
    '[0.2,0,0]'::jsonb,
    '[0,0,0,1]'::jsonb,
    '[]'::jsonb
  );
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000003', true);

do $$
declare
  v_balance bigint;
  v_price bigint;
begin
  select balance, price_paid into v_balance, v_price
  from public.purchase_feature_unlock(
    'rock_movement',
    'c2000000-2000-4000-8000-000000000099'::uuid
  );
  if v_balance <> 42 or v_price <> 1000 then
    raise exception 'pre-upgrade V1 event key did not replay its historical receipt';
  end if;
  if exists (
    select 1 from public.rock_feature_unlocks rfu
    join public.user_rocks ur on ur.id=rfu.user_rock_id
    where ur.user_id='c2000000-0000-4000-8000-000000000003'::uuid
  ) then
    raise exception 'historical V1 replay incorrectly created a V2 entitlement';
  end if;
end
$$;

reset role;
rollback;

select
  (select count(*) from auth.users where id in (
    'c2000000-0000-4000-8000-000000000001'::uuid,
    'c2000000-0000-4000-8000-000000000002'::uuid,
    'c2000000-0000-4000-8000-000000000003'::uuid
  )) as fixture_users_after_rollback,
  (select count(*) from public.rock_feature_unlocks where user_rock_id in (
    'c2000000-1000-4000-8000-000000000001'::uuid,
    'c2000000-1000-4000-8000-000000000002'::uuid,
    'c2000000-1000-4000-8000-000000000003'::uuid
  )) as fixture_unlocks_after_rollback;