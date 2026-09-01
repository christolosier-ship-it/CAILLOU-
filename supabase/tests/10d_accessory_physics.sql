-- CAILLOU™ step 10D acceptance test. Fixtures are transactional and rolled back.

begin;

insert into auth.users(id) values
  ('10d00000-0000-4000-8000-000000000001'::uuid),
  ('10d00000-0000-4000-8000-000000000002'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('10d00000-0000-4000-8000-000000000001'::uuid, 'Step10DA', 'step10da'),
  ('10d00000-0000-4000-8000-000000000002'::uuid, 'Step10DB', 'step10db');

insert into public.user_rocks(id, user_id, specimen_id, name, adopted_at) values
  ('10d00000-0000-4000-8000-000000000011'::uuid, '10d00000-0000-4000-8000-000000000001'::uuid, 'rock-012', 'PhysicsA', now() - interval '1 day'),
  ('10d00000-0000-4000-8000-000000000012'::uuid, '10d00000-0000-4000-8000-000000000002'::uuid, 'rock-013', 'PhysicsB', now() - interval '1 day');

insert into public.user_accessories(user_id, accessory_id) values
  ('10d00000-0000-4000-8000-000000000001'::uuid, 'monocle'),
  ('10d00000-0000-4000-8000-000000000001'::uuid, 'pedestal-gallery'),
  ('10d00000-0000-4000-8000-000000000002'::uuid, 'monocle');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10d00000-0000-4000-8000-000000000001', true);

DO $$
declare
  v_instance uuid;
  v_stabilized_at timestamptz;
  v_replay_at timestamptz;
  v_position jsonb;
begin
  select instance_id into v_instance from public.create_equipped_accessory(
    '10d00000-0000-4000-8000-000000000011'::uuid,
    'monocle',
    '10d00000-1000-4000-8000-000000000001'::uuid,
    '[0,0.45,0.78]'::jsonb,
    '[0,0,0,1]'::jsonb,
    1
  );

  if (select stabilized_at from public.equipped_accessories where id = v_instance) is not null then
    raise exception 'new placement unexpectedly marked stabilized';
  end if;

  select local_position, stabilized_at
    into v_position, v_stabilized_at
  from public.stabilize_equipped_accessory(
    v_instance,
    '10d00000-2000-4000-8000-000000000001'::uuid,
    '[0.02,0.18,0.73]'::jsonb,
    '[0,0,0.13052619,0.99144486]'::jsonb,
    1
  );

  if v_position is distinct from '[0.02,0.18,0.73]'::jsonb or v_stabilized_at is null then
    raise exception 'stabilized pose was not persisted';
  end if;

  select stabilized_at into v_replay_at
  from public.stabilize_equipped_accessory(
    v_instance,
    '10d00000-2000-4000-8000-000000000001'::uuid,
    '[0.02,0.18,0.73]'::jsonb,
    '[0,0,0.13052619,0.99144486]'::jsonb,
    1
  );

  if v_replay_at is distinct from v_stabilized_at then
    raise exception 'stabilization replay did not return the original receipt';
  end if;

  perform * from public.update_equipped_accessory(
    v_instance,
    '[0.04,0.20,0.70]'::jsonb,
    '[0,0,0,1]'::jsonb,
    1
  );

  if (select stabilized_at from public.equipped_accessories where id = v_instance) is not null then
    raise exception 'manual transform did not clear stabilized_at';
  end if;

  begin
    perform * from public.stabilize_equipped_accessory(
      v_instance,
      '10d00000-2000-4000-8000-000000000002'::uuid,
      '[0,0,0]'::jsonb,
      '[0,0,0,1]'::jsonb,
      2.0
    );
    raise exception 'out-of-catalog settled scale unexpectedly accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    update public.equipped_accessories set stabilized_at = now() where id = v_instance;
    raise exception 'direct authenticated stabilized_at update unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end
$$;

DO $$
begin
  if (select physics->>'dynamic' from public.accessories where id = 'monocle') is distinct from 'true' then
    raise exception 'monocle must remain dynamic';
  end if;
  if (select physics->>'dynamic' from public.accessories where id = 'pedestal-gallery') is distinct from 'false' then
    raise exception 'pedestal-gallery must remain non-dynamic';
  end if;
  if (select physics->>'collider' from public.accessories where id = 'pedestal-gallery') is distinct from 'cuboid' then
    raise exception 'pedestal-gallery must use the simplified cuboid collider';
  end if;
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10d00000-0000-4000-8000-000000000002', true);

DO $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.equipped_accessories
  where user_rock_id = '10d00000-0000-4000-8000-000000000011'::uuid;

  if v_count <> 0 then
    raise exception 'RLS leaked user A accessory instance to user B';
  end if;

  begin
    perform * from public.stabilize_equipped_accessory(
      '10d00000-0000-4000-8000-000000000099'::uuid,
      '10d00000-3000-4000-8000-000000000001'::uuid,
      '[0,0,0]'::jsonb,
      '[0,0,0,1]'::jsonb,
      1
    );
    raise exception 'another user unexpectedly stabilized an instance';
  exception when insufficient_privilege then null;
  end;
end
$$;

reset role;
set local role anon;
DO $$
begin
  begin
    perform * from public.stabilize_equipped_accessory(
      '10d00000-0000-4000-8000-000000000099'::uuid,
      '10d00000-4000-4000-8000-000000000001'::uuid,
      '[0,0,0]'::jsonb,
      '[0,0,0,1]'::jsonb,
      1
    );
    raise exception 'anon unexpectedly executed stabilize_equipped_accessory';
  exception when insufficient_privilege then null;
  end;
end
$$;

reset role;
rollback;

select
  (select count(*) from auth.users where id in (
    '10d00000-0000-4000-8000-000000000001'::uuid,
    '10d00000-0000-4000-8000-000000000002'::uuid
  )) as fixture_users_after_rollback,
  (select count(*) from public.equipped_accessories where user_rock_id in (
    '10d00000-0000-4000-8000-000000000011'::uuid,
    '10d00000-0000-4000-8000-000000000012'::uuid
  )) as fixture_placements_after_rollback;
