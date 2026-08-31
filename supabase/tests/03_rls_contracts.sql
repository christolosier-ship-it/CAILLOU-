-- CAILLOU™ step 03 acceptance test.
-- Run against a disposable/local database or inside a transaction on the target project.
-- The final ROLLBACK must remain in place: no fixture survives this script.

begin;

insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'::uuid),
  ('22222222-2222-4222-8222-222222222222'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'UserA', 'usera'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'UserB', 'userb');

update public.rock_catalog set active = true where id in ('rock-001', 'rock-002');
insert into public.accessories(id, name, price_lithons, slot, active)
values ('test-plinth', 'Test Plinth', 1, 'base', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select * from public.adopt_rock('rock-001', 'Bernard', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid);
select * from public.register_caress(
  (select id from public.user_rocks where user_id = '11111111-1111-4111-8111-111111111111'::uuid and discarded_at is null),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid
);
-- Same event key: must be a replay, not a second credit.
select * from public.register_caress(
  (select id from public.user_rocks where user_id = '11111111-1111-4111-8111-111111111111'::uuid and discarded_at is null),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid
);
select * from public.register_cleaning(
  (select id from public.user_rocks where user_id = '11111111-1111-4111-8111-111111111111'::uuid and discarded_at is null),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid
);
select * from public.register_cleaning(
  (select id from public.user_rocks where user_id = '11111111-1111-4111-8111-111111111111'::uuid and discarded_at is null),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid
);

DO $$
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'RLS A profile isolation failed';
  end if;
  if (select count(*) from public.user_rocks) <> 1 then
    raise exception 'RLS A rock isolation failed';
  end if;
  if (select balance from public.wallets where user_id = '11111111-1111-4111-8111-111111111111'::uuid) <> 1 then
    raise exception 'caress credit failed';
  end if;
  if (select caress_count from public.rock_progress limit 1) <> 1 then
    raise exception 'caress idempotence failed';
  end if;
  if (select cleaning_count from public.rock_progress limit 1) <> 1 then
    raise exception 'cleaning idempotence failed';
  end if;

  begin
    update public.wallets set balance = 999 where user_id = '11111111-1111-4111-8111-111111111111'::uuid;
    raise exception 'direct wallet update unexpectedly allowed';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.lithon_ledger(user_id, delta, reason, event_key)
    values ('11111111-1111-4111-8111-111111111111'::uuid, 1, 'caress', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9'::uuid);
    raise exception 'direct ledger insert unexpectedly allowed';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform * from public.adopt_rock('rock-002', 'Deuxieme', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid);
    raise exception 'second active rock unexpectedly allowed';
  exception when unique_violation then
    null;
  end;
end
$$;

select * from public.purchase_accessory('test-plinth', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'::uuid);
select * from public.purchase_accessory('test-plinth', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'::uuid);
select * from public.equip_accessory(
  (select id from public.user_rocks where user_id = '11111111-1111-4111-8111-111111111111'::uuid and discarded_at is null),
  'test-plinth',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6'::uuid
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select * from public.adopt_rock('rock-002', 'Granite', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid);

DO $$
declare
  v_a_rock uuid;
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'RLS B profile isolation failed';
  end if;
  if (select count(*) from public.user_rocks) <> 1 then
    raise exception 'RLS B rock isolation failed';
  end if;

  reset role;
  select id into v_a_rock from public.user_rocks where user_id = '11111111-1111-4111-8111-111111111111'::uuid and discarded_at is null;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

  begin
    perform * from public.register_caress(v_a_rock, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid);
    raise exception 'user B mutated user A rock';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select * from public.discard_active_rock(
  (select id from public.user_rocks where user_id = '11111111-1111-4111-8111-111111111111'::uuid and discarded_at is null),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7'::uuid
);

DO $$
begin
  if exists (select 1 from public.equipped_accessories) then
    raise exception 'discard did not clear equipment';
  end if;
  if (select count(*) from public.user_accessories) <> 1 then
    raise exception 'discard removed inventory';
  end if;
  if (select balance from public.wallets where user_id = '11111111-1111-4111-8111-111111111111'::uuid) <> 0 then
    raise exception 'purchase accounting failed';
  end if;
  if (select count(*) from public.lithon_ledger) <> 2 then
    raise exception 'ledger trace count failed';
  end if;
end
$$;

reset role;
set local role anon;
DO $$
begin
  if (select count(*) from public.rock_catalog) <> 2 then
    raise exception 'anon active rock catalog policy failed';
  end if;
  if (select count(*) from public.accessories) <> 1 then
    raise exception 'anon active accessory policy failed';
  end if;
  begin
    perform * from public.profiles;
    raise exception 'anon profile read unexpectedly allowed';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

reset role;
rollback;

select
  (select count(*) from public.profiles) as profiles_after_rollback,
  (select count(*) from public.user_rocks) as rocks_after_rollback,
  (select count(*) from public.accessories) as accessories_after_rollback,
  (select count(*) from public.rock_catalog where active) as active_rocks_after_rollback;
