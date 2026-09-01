-- CAILLOU™ step 10.5 acceptance test. Fixtures are transactional and rolled back.
begin;

insert into auth.users(id) values
  ('10500000-0000-4000-8000-000000000001'::uuid),
  ('10500000-0000-4000-8000-000000000002'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('10500000-0000-4000-8000-000000000001'::uuid, 'Step105A', 'step105a'),
  ('10500000-0000-4000-8000-000000000002'::uuid, 'Step105B', 'step105b');

insert into public.user_rocks(id, user_id, specimen_id, name, adopted_at) values
  ('10500000-0000-4000-8000-000000000011'::uuid, '10500000-0000-4000-8000-000000000001'::uuid, 'rock-014', 'ManutentionA', now() - interval '1 day'),
  ('10500000-0000-4000-8000-000000000012'::uuid, '10500000-0000-4000-8000-000000000002'::uuid, 'rock-015', 'ManutentionB', now() - interval '1 day');

update public.wallets set balance = 1200, lifetime_earned = 1200
where user_id = '10500000-0000-4000-8000-000000000001'::uuid;
update public.wallets set balance = 999, lifetime_earned = 999
where user_id = '10500000-0000-4000-8000-000000000002'::uuid;

insert into public.user_accessories(user_id, accessory_id) values
  ('10500000-0000-4000-8000-000000000001'::uuid, 'monocle');

DO $$
begin
  if (select price_lithons from public.feature_catalog where id = 'rock_movement') <> 1000 then
    raise exception 'rock movement permit price must be exactly 1000 Lithons';
  end if;
end
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10500000-0000-4000-8000-000000000001', true);

DO $$
declare
  v_balance bigint;
  v_unlocked_at timestamptz;
  v_replay_at timestamptz;
  v_instance uuid;
  v_before_position jsonb;
  v_after_position jsonb;
  v_stabilized_at timestamptz;
  v_replay_stabilized_at timestamptz;
begin
  select balance, unlocked_at into v_balance, v_unlocked_at
  from public.purchase_feature_unlock(
    'rock_movement',
    '10500000-1000-4000-8000-000000000001'::uuid
  );

  if v_balance <> 200 then
    raise exception 'permit purchase did not debit exactly 1000 Lithons';
  end if;

  select unlocked_at into v_replay_at
  from public.purchase_feature_unlock(
    'rock_movement',
    '10500000-1000-4000-8000-000000000001'::uuid
  );

  if v_replay_at is distinct from v_unlocked_at then
    raise exception 'permit replay did not return original receipt';
  end if;

  if (select count(*) from public.lithon_ledger where user_id = '10500000-0000-4000-8000-000000000001'::uuid and reason = 'feature_unlock') <> 1 then
    raise exception 'permit replay duplicated ledger debit';
  end if;

  begin
    perform * from public.purchase_feature_unlock(
      'rock_movement',
      '10500000-1000-4000-8000-000000000002'::uuid
    );
    raise exception 'second distinct permit purchase unexpectedly accepted';
  exception when unique_violation then null;
  end;

  select instance_id into v_instance from public.create_equipped_accessory(
    '10500000-0000-4000-8000-000000000011'::uuid,
    'monocle',
    '10500000-2000-4000-8000-000000000001'::uuid,
    '[0,0.45,0.78]'::jsonb,
    '[0,0,0,1]'::jsonb,
    1
  );

  select pose_position into v_before_position
  from public.user_rocks where id = '10500000-0000-4000-8000-000000000011'::uuid;

  begin
    perform * from public.stabilize_rock_composition(
      '10500000-0000-4000-8000-000000000011'::uuid,
      '10500000-3000-4000-8000-000000000001'::uuid,
      '[0.30,0.20,-0.20]'::jsonb,
      '[0,0.258819,0,0.965926]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'instance_id', v_instance,
        'local_position', '[0.05,0.15,0.70]'::jsonb,
        'local_rotation', '[0,0,0,1]'::jsonb,
        'uniform_scale', 2.0
      ))
    );
    raise exception 'invalid accessory scale unexpectedly accepted in atomic composition';
  exception when sqlstate '22023' then null;
  end;

  select pose_position into v_after_position
  from public.user_rocks where id = '10500000-0000-4000-8000-000000000011'::uuid;
  if v_after_position is distinct from v_before_position then
    raise exception 'failed composition partially updated rock pose';
  end if;

  select stabilized_at into v_stabilized_at
  from public.stabilize_rock_composition(
    '10500000-0000-4000-8000-000000000011'::uuid,
    '10500000-3000-4000-8000-000000000002'::uuid,
    '[0.30,0.20,-0.20]'::jsonb,
    '[0,0.258819,0,0.965926]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'instance_id', v_instance,
      'local_position', '[0.05,0.15,0.70]'::jsonb,
      'local_rotation', '[0,0,0,1]'::jsonb,
      'uniform_scale', 1.0
    ))
  );

  if v_stabilized_at is null then
    raise exception 'composition did not receive stabilized timestamp';
  end if;
  if (select pose_position from public.user_rocks where id = '10500000-0000-4000-8000-000000000011'::uuid) is distinct from '[0.30,0.20,-0.20]'::jsonb then
    raise exception 'rock final pose was not persisted';
  end if;
  if (select stabilized_at from public.equipped_accessories where id = v_instance) is distinct from v_stabilized_at then
    raise exception 'accessory and rock were not stabilized atomically';
  end if;

  select stabilized_at into v_replay_stabilized_at
  from public.stabilize_rock_composition(
    '10500000-0000-4000-8000-000000000011'::uuid,
    '10500000-3000-4000-8000-000000000002'::uuid,
    '[0.30,0.20,-0.20]'::jsonb,
    '[0,0.258819,0,0.965926]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'instance_id', v_instance,
      'local_position', '[0.05,0.15,0.70]'::jsonb,
      'local_rotation', '[0,0,0,1]'::jsonb,
      'uniform_scale', 1.0
    ))
  );
  if v_replay_stabilized_at is distinct from v_stabilized_at then
    raise exception 'composition replay did not return original receipt';
  end if;

  begin
    update public.user_rocks
    set pose_position = '[1,1,1]'::jsonb
    where id = '10500000-0000-4000-8000-000000000011'::uuid;
    raise exception 'direct authenticated rock pose update unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10500000-0000-4000-8000-000000000002', true);

DO $$
begin
  begin
    perform * from public.purchase_feature_unlock(
      'rock_movement',
      '10500000-4000-4000-8000-000000000001'::uuid
    );
    raise exception 'insufficient wallet unexpectedly bought permit';
  exception when numeric_value_out_of_range then null;
  end;

  begin
    perform * from public.stabilize_rock_composition(
      '10500000-0000-4000-8000-000000000012'::uuid,
      '10500000-4000-4000-8000-000000000002'::uuid,
      '[0,0.3,0]'::jsonb,
      '[0,0,0,1]'::jsonb,
      '[]'::jsonb
    );
    raise exception 'rock movement without permit unexpectedly accepted';
  exception when insufficient_privilege then null;
  end;

  if (select count(*) from public.user_feature_unlocks where user_id = '10500000-0000-4000-8000-000000000001'::uuid) <> 0 then
    raise exception 'RLS leaked user A feature unlock to user B';
  end if;
end
$$;

reset role;
set local role anon;
DO $$
begin
  begin
    perform * from public.purchase_feature_unlock('rock_movement', '10500000-5000-4000-8000-000000000001'::uuid);
    raise exception 'anon unexpectedly executed purchase_feature_unlock';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.stabilize_rock_composition(
      '10500000-0000-4000-8000-000000000011'::uuid,
      '10500000-5000-4000-8000-000000000002'::uuid,
      '[0,0,0]'::jsonb,
      '[0,0,0,1]'::jsonb,
      '[]'::jsonb
    );
    raise exception 'anon unexpectedly executed stabilize_rock_composition';
  exception when insufficient_privilege then null;
  end;
end
$$;

reset role;
rollback;

select
  (select count(*) from auth.users where id in (
    '10500000-0000-4000-8000-000000000001'::uuid,
    '10500000-0000-4000-8000-000000000002'::uuid
  )) as fixture_users_after_rollback,
  (select count(*) from public.user_feature_unlocks where user_id in (
    '10500000-0000-4000-8000-000000000001'::uuid,
    '10500000-0000-4000-8000-000000000002'::uuid
  )) as fixture_unlocks_after_rollback;