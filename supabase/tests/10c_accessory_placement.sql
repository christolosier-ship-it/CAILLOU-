-- CAILLOU™ step 10C acceptance test. All fixtures are transactional and rolled back.

begin;

insert into auth.users(id) values
  ('10c00000-0000-4000-8000-000000000001'::uuid),
  ('10c00000-0000-4000-8000-000000000002'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('10c00000-0000-4000-8000-000000000001'::uuid, 'Step10CA', 'step10ca'),
  ('10c00000-0000-4000-8000-000000000002'::uuid, 'Step10CB', 'step10cb');

insert into public.user_rocks(id, user_id, specimen_id, name, adopted_at) values
  ('10c00000-0000-4000-8000-000000000011'::uuid, '10c00000-0000-4000-8000-000000000001'::uuid, 'rock-012', 'PlacementA', now() - interval '1 day'),
  ('10c00000-0000-4000-8000-000000000012'::uuid, '10c00000-0000-4000-8000-000000000002'::uuid, 'rock-013', 'PlacementB', now() - interval '1 day');

insert into public.user_accessories(user_id, accessory_id) values
  ('10c00000-0000-4000-8000-000000000001'::uuid, 'monocle'),
  ('10c00000-0000-4000-8000-000000000001'::uuid, 'round-glasses'),
  ('10c00000-0000-4000-8000-000000000001'::uuid, 'bow-tie'),
  ('10c00000-0000-4000-8000-000000000002'::uuid, 'monocle');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10c00000-0000-4000-8000-000000000001', true);

DO $$
declare
  v_first uuid;
  v_replay uuid;
  v_second uuid;
  v_third uuid;
  v_position jsonb;
  v_index integer;
begin
  select instance_id into v_first from public.create_equipped_accessory(
    '10c00000-0000-4000-8000-000000000011'::uuid, 'monocle',
    '10c00000-1000-4000-8000-000000000001'::uuid,
    '[0,0.15,0.75]'::jsonb, '[0,0,0,1]'::jsonb, 1
  );
  select instance_id into v_replay from public.create_equipped_accessory(
    '10c00000-0000-4000-8000-000000000011'::uuid, 'monocle',
    '10c00000-1000-4000-8000-000000000001'::uuid,
    '[0,0.15,0.75]'::jsonb, '[0,0,0,1]'::jsonb, 1
  );
  if v_first is distinct from v_replay then
    raise exception 'create replay returned another instance';
  end if;

  select instance_id into v_second from public.create_equipped_accessory(
    '10c00000-0000-4000-8000-000000000011'::uuid, 'round-glasses',
    '10c00000-1000-4000-8000-000000000002'::uuid,
    '[0.1,0.2,0.8]'::jsonb, '[0,0,0,1]'::jsonb, 1
  );
  select instance_id into v_third from public.create_equipped_accessory(
    '10c00000-0000-4000-8000-000000000011'::uuid, 'monocle',
    '10c00000-1000-4000-8000-000000000003'::uuid,
    '[-0.1,0.25,0.72]'::jsonb, '[0,0,0,1]'::jsonb, 0.9
  );

  if (select count(*) from public.equipped_accessories where user_rock_id = '10c00000-0000-4000-8000-000000000011'::uuid) <> 3 then
    raise exception 'three simultaneous instances expected';
  end if;
  if (select count(*) from public.equipped_accessories where user_rock_id = '10c00000-0000-4000-8000-000000000011'::uuid and slot = 'visage') <> 3 then
    raise exception 'slot/category still behaves as a uniqueness lock';
  end if;

  select local_position into v_position from public.update_equipped_accessory(
    v_first, '[0.12,0.22,0.62]'::jsonb, '[0,0,0.70710678,0.70710678]'::jsonb, 1.2
  );
  if v_position is distinct from '[0.12,0.22,0.62]'::jsonb then
    raise exception 'local transform not persisted';
  end if;

  begin
    perform * from public.update_equipped_accessory(v_first, '[0,0,0]'::jsonb, '[0,0,0,1]'::jsonb, 2.0);
    raise exception 'out-of-catalog scale unexpectedly accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform * from public.create_equipped_accessory(
      '10c00000-0000-4000-8000-000000000011'::uuid, 'pedestal-gallery',
      '10c00000-1000-4000-8000-000000000004'::uuid,
      '[0,-0.8,0]'::jsonb, '[0,0,0,1]'::jsonb, 1
    );
    raise exception 'unowned accessory unexpectedly equipped';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.create_equipped_accessory(
      '10c00000-0000-4000-8000-000000000012'::uuid, 'monocle',
      '10c00000-1000-4000-8000-000000000005'::uuid,
      '[0,0,0]'::jsonb, '[0,0,0,1]'::jsonb, 1
    );
    raise exception 'another user rock unexpectedly accepted';
  exception when insufficient_privilege then null;
  end;

  for v_index in 1..5 loop
    perform * from public.create_equipped_accessory(
      '10c00000-0000-4000-8000-000000000011'::uuid, 'bow-tie',
      ('10c00000-2000-4000-8000-' || lpad(v_index::text, 12, '0'))::uuid,
      jsonb_build_array(v_index * 0.03, -0.2, 0.7), '[0,0,0,1]'::jsonb, 1
    );
  end loop;

  if (select count(*) from public.equipped_accessories where user_rock_id = '10c00000-0000-4000-8000-000000000011'::uuid) <> 8 then
    raise exception 'V1 instance limit setup did not reach eight';
  end if;

  begin
    perform * from public.create_equipped_accessory(
      '10c00000-0000-4000-8000-000000000011'::uuid, 'bow-tie',
      '10c00000-3000-4000-8000-000000000001'::uuid,
      '[0,0,0]'::jsonb, '[0,0,0,1]'::jsonb, 1
    );
    raise exception 'ninth instance unexpectedly accepted';
  exception when program_limit_exceeded then null;
  end;

  perform * from public.remove_equipped_accessory(v_second, '10c00000-4000-4000-8000-000000000001'::uuid);
  perform * from public.remove_equipped_accessory(v_second, '10c00000-4000-4000-8000-000000000001'::uuid);
  if (select count(*) from public.equipped_accessories where user_rock_id = '10c00000-0000-4000-8000-000000000011'::uuid) <> 7 then
    raise exception 'remove replay was not idempotent';
  end if;

  begin
    insert into public.equipped_accessories(user_rock_id, accessory_id, slot)
    values ('10c00000-0000-4000-8000-000000000011'::uuid, 'monocle', 'visage');
    raise exception 'direct authenticated insert unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10c00000-0000-4000-8000-000000000002', true);

DO $$
begin
  if (select count(*) from public.equipped_accessories where user_rock_id = '10c00000-0000-4000-8000-000000000011'::uuid) <> 0 then
    raise exception 'RLS leaked user A placements to user B';
  end if;
end
$$;

reset role;
set local role anon;
DO $$
begin
  begin
    perform * from public.create_equipped_accessory(
      '10c00000-0000-4000-8000-000000000011'::uuid, 'monocle',
      '10c00000-5000-4000-8000-000000000001'::uuid,
      '[0,0,0]'::jsonb, '[0,0,0,1]'::jsonb, 1
    );
    raise exception 'anon unexpectedly executed create_equipped_accessory';
  exception when insufficient_privilege then null;
  end;
end
$$;

reset role;
rollback;

select
  (select count(*) from auth.users where id in (
    '10c00000-0000-4000-8000-000000000001'::uuid,
    '10c00000-0000-4000-8000-000000000002'::uuid
  )) as fixture_users_after_rollback,
  (select count(*) from public.equipped_accessories where user_rock_id in (
    '10c00000-0000-4000-8000-000000000011'::uuid,
    '10c00000-0000-4000-8000-000000000012'::uuid
  )) as fixture_placements_after_rollback;
