-- CAILLOU™ V2-02 Lot F acceptance: unique catalogue references, remove/re-place and discard persistence.
begin;

insert into auth.users(id) values ('20200000-0000-4000-8000-000000000001'::uuid);
insert into public.profiles(id, username, username_normalized)
values ('20200000-0000-4000-8000-000000000001'::uuid, 'V202F', 'v202f');
insert into public.user_rocks(id, user_id, specimen_id, name, adopted_at)
values ('20200000-0000-4000-8000-000000000011'::uuid, '20200000-0000-4000-8000-000000000001'::uuid, 'rock-014', 'UniqueA', now());
insert into public.user_accessories(user_id, accessory_id)
values ('20200000-0000-4000-8000-000000000001'::uuid, 'monocle');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20200000-0000-4000-8000-000000000001', true);

do $$
declare
  v_first uuid;
  v_second uuid;
begin
  select instance_id into v_first
  from public.create_equipped_accessory(
    '20200000-0000-4000-8000-000000000011'::uuid,
    'monocle',
    '20200000-1000-4000-8000-000000000001'::uuid,
    '[0,0.16,0.76]'::jsonb,
    '[0,0,0,1]'::jsonb,
    1
  );

  begin
    perform * from public.create_equipped_accessory(
      '20200000-0000-4000-8000-000000000011'::uuid,
      'monocle',
      '20200000-1000-4000-8000-000000000002'::uuid,
      '[0.2,0.16,0.76]'::jsonb,
      '[0,0,0,1]'::jsonb,
      1
    );
    raise exception 'second instance unexpectedly accepted';
  exception when unique_violation then null;
  end;

  if (select count(*) from public.equipped_accessories
      where user_rock_id = '20200000-0000-4000-8000-000000000011'::uuid
        and accessory_id = 'monocle') <> 1 then
    raise exception 'duplicate guard did not preserve one placement';
  end if;

  perform * from public.remove_equipped_accessory(
    v_first,
    '20200000-1000-4000-8000-000000000003'::uuid
  );

  select instance_id into v_second
  from public.create_equipped_accessory(
    '20200000-0000-4000-8000-000000000011'::uuid,
    'monocle',
    '20200000-1000-4000-8000-000000000004'::uuid,
    '[0.1,0.16,0.76]'::jsonb,
    '[0,0,0,1]'::jsonb,
    1
  );
  if v_second is null then
    raise exception 'removed accessory did not become placeable again';
  end if;

  begin
    perform * from public.commit_placement_session(
      '20200000-0000-4000-8000-000000000011'::uuid,
      '20200000-1000-4000-8000-000000000005'::uuid,
      false,
      '[0,0,0]'::jsonb,
      '[0,0,0,1]'::jsonb,
      jsonb_build_array(
        jsonb_build_object(
          'instance_id', v_second,
          'accessory_id', 'monocle',
          'local_position', '[0.1,0.16,0.76]'::jsonb,
          'local_rotation', '[0,0,0,1]'::jsonb,
          'uniform_scale', 1
        ),
        jsonb_build_object(
          'instance_id', '20200000-2000-4000-8000-000000000001'::uuid,
          'accessory_id', 'monocle',
          'local_position', '[-0.1,0.16,0.76]'::jsonb,
          'local_rotation', '[0,0,0,1]'::jsonb,
          'uniform_scale', 1
        )
      )
    );
    raise exception 'duplicate draft composition unexpectedly accepted';
  exception when unique_violation then null;
  end;

  if (select count(*) from public.equipped_accessories
      where user_rock_id = '20200000-0000-4000-8000-000000000011'::uuid) <> 1 then
    raise exception 'failed duplicate draft altered canonical placement set';
  end if;

  perform * from public.discard_active_rock(
    '20200000-0000-4000-8000-000000000011'::uuid,
    '20200000-1000-4000-8000-000000000006'::uuid
  );
end
$$;

reset role;

insert into public.user_rocks(id, user_id, specimen_id, name, adopted_at)
values ('20200000-0000-4000-8000-000000000012'::uuid, '20200000-0000-4000-8000-000000000001'::uuid, 'rock-015', 'UniqueB', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '20200000-0000-4000-8000-000000000001', true);

do $$
declare
  v_new uuid;
begin
  if (select count(*) from public.equipped_accessories
      where user_rock_id = '20200000-0000-4000-8000-000000000011'::uuid) <> 0 then
    raise exception 'discard did not unequip accessories';
  end if;
  if (select count(*) from public.user_accessories
      where user_id = '20200000-0000-4000-8000-000000000001'::uuid
        and accessory_id = 'monocle') <> 1 then
    raise exception 'discard incorrectly removed account ownership';
  end if;

  select instance_id into v_new
  from public.create_equipped_accessory(
    '20200000-0000-4000-8000-000000000012'::uuid,
    'monocle',
    '20200000-1000-4000-8000-000000000007'::uuid,
    '[0,0.16,0.76]'::jsonb,
    '[0,0,0,1]'::jsonb,
    1
  );
  if v_new is null then
    raise exception 'owned accessory could not be placed on replacement rock';
  end if;
end
$$;

reset role;
rollback;

select
  (select count(*) from auth.users where id = '20200000-0000-4000-8000-000000000001'::uuid) as fixture_users_after_rollback,
  (select count(*) from public.equipped_accessories where user_rock_id in (
    '20200000-0000-4000-8000-000000000011'::uuid,
    '20200000-0000-4000-8000-000000000012'::uuid
  )) as fixture_placements_after_rollback;
