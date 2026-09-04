-- CAILLOU™ V2-02 Lot G acceptance: generic ledger identity without rewriting history.
begin;

insert into auth.users(id) values ('20200000-0000-4000-8000-000000000101'::uuid);
insert into public.profiles(id, username, username_normalized)
values ('20200000-0000-4000-8000-000000000101'::uuid, 'V202G', 'v202g');
insert into public.user_rocks(id, user_id, specimen_id, name, adopted_at)
values ('20200000-0000-4000-8000-000000000111'::uuid, '20200000-0000-4000-8000-000000000101'::uuid, 'rock-016', 'LedgerV2', now());
update public.wallets
set balance = 3000, lifetime_earned = 3000
where user_id = '20200000-0000-4000-8000-000000000101'::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20200000-0000-4000-8000-000000000101', true);

do $$
begin
  perform * from public.purchase_accessory(
    'monocle',
    '20200000-3000-4000-8000-000000000001'::uuid
  );

  if not exists (
    select 1 from public.lithon_ledger
    where user_id = '20200000-0000-4000-8000-000000000101'::uuid
      and event_key = '20200000-3000-4000-8000-000000000001'::uuid
      and reason = 'accessory_purchase'
      and accessory_id = 'monocle'
      and item_kind = 'accessory'
      and item_id = 'monocle'
  ) then
    raise exception 'new accessory purchase did not receive generic ledger identity';
  end if;

  perform * from public.purchase_rock_feature_unlock(
    '20200000-0000-4000-8000-000000000111'::uuid,
    'rock_movement',
    '20200000-3000-4000-8000-000000000002'::uuid
  );

  if not exists (
    select 1 from public.lithon_ledger
    where user_id = '20200000-0000-4000-8000-000000000101'::uuid
      and event_key = '20200000-3000-4000-8000-000000000002'::uuid
      and reason = 'feature_unlock'
      and user_rock_id = '20200000-0000-4000-8000-000000000111'::uuid
      and feature_id = 'rock_movement'
      and item_kind = 'rock_feature'
      and item_id = 'rock_movement'
  ) then
    raise exception 'new rock feature purchase did not receive generic ledger identity';
  end if;
end
$$;

reset role;

do $$
begin
  insert into public.lithon_ledger(
    user_id, delta, reason, event_key, item_kind, item_id
  ) values (
    '20200000-0000-4000-8000-000000000101'::uuid,
    -5,
    'item_purchase',
    '20200000-3000-4000-8000-000000000003'::uuid,
    'surface',
    'surface_test'
  );

  if not exists (
    select 1 from public.lithon_ledger
    where event_key = '20200000-3000-4000-8000-000000000003'::uuid
      and item_kind = 'surface'
      and item_id = 'surface_test'
      and accessory_id is null
      and feature_id is null
  ) then
    raise exception 'future generic item purchase shape was rejected';
  end if;

  begin
    insert into public.lithon_ledger(
      user_id, delta, reason, event_key, item_kind
    ) values (
      '20200000-0000-4000-8000-000000000101'::uuid,
      -5,
      'item_purchase',
      '20200000-3000-4000-8000-000000000004'::uuid,
      'surface'
    );
    raise exception 'incomplete generic identity unexpectedly accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.lithon_ledger(
      user_id, delta, reason, event_key, accessory_id, item_kind, item_id
    ) values (
      '20200000-0000-4000-8000-000000000101'::uuid,
      -5,
      'accessory_purchase',
      '20200000-3000-4000-8000-000000000005'::uuid,
      'monocle',
      'accessory',
      'different_id'
    );
    raise exception 'inconsistent specialized/generic identity unexpectedly accepted';
  exception when check_violation then null;
  end;
end
$$;

rollback;

select
  (select count(*) from auth.users where id = '20200000-0000-4000-8000-000000000101'::uuid) as fixture_users_after_rollback,
  (select count(*) from public.lithon_ledger where user_id = '20200000-0000-4000-8000-000000000101'::uuid) as fixture_ledger_after_rollback;
