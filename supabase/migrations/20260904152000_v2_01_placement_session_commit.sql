-- CAILLOU™ V2-01 Lot E: atomic Placement session commit.
begin;

alter table private.mutation_receipts
  drop constraint if exists mutation_receipts_operation;

alter table private.mutation_receipts
  add constraint mutation_receipts_operation check (
    operation = any(array[
      'adopt_rock'::text,
      'register_caress'::text,
      'register_cleaning'::text,
      'purchase_accessory'::text,
      'discard_active_rock'::text,
      'equip_accessory'::text,
      'create_equipped_accessory'::text,
      'remove_equipped_accessory'::text,
      'stabilize_equipped_accessory'::text,
      'purchase_feature_unlock'::text,
      'stabilize_rock_composition'::text,
      'commit_placement_session'::text
    ])
  );

create or replace function private.commit_placement_session_impl(
  p_user_rock_id uuid,
  p_event_key uuid,
  p_move_rock boolean,
  p_rock_position jsonb,
  p_rock_rotation jsonb,
  p_accessories jsonb
)
returns table(
  user_rock_id uuid,
  rock_position jsonb,
  rock_rotation jsonb,
  stabilized_at timestamptz,
  accessories jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_item jsonb;
  v_instance_id uuid;
  v_accessory_id text;
  v_existing_accessory_id text;
  v_category text;
  v_scale_min numeric;
  v_scale_max numeric;
  v_seen_ids uuid[] := array[]::uuid[];
  v_current_rock_position jsonb;
  v_current_rock_rotation jsonb;
  v_final_rock_position jsonb;
  v_final_rock_rotation jsonb;
  v_stabilized_at timestamptz := clock_timestamp();
  v_accessories_result jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'commit_placement_session');
  if v_receipt is not null then
    return query select
      (v_receipt->>'user_rock_id')::uuid,
      v_receipt->'rock_position',
      v_receipt->'rock_rotation',
      (v_receipt->>'stabilized_at')::timestamptz,
      v_receipt->'accessories';
    return;
  end if;

  select ur.pose_position, ur.pose_rotation
    into v_current_rock_position, v_current_rock_rotation
  from public.user_rocks ur
  where ur.id = p_user_rock_id
    and ur.user_id = v_user_id
    and ur.discarded_at is null
  for update;
  if not found then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;

  if p_accessories is null or jsonb_typeof(p_accessories) <> 'array' then
    raise exception 'placement_accessories_invalid' using errcode = '22023';
  end if;
  if jsonb_array_length(p_accessories) > 8 then
    raise exception 'accessory_instance_limit_reached' using errcode = '54000';
  end if;

  if coalesce(p_move_rock, false) then
    if not exists (
      select 1
      from public.user_feature_unlocks ufu
      where ufu.user_id = v_user_id and ufu.feature_id = 'rock_movement'
    ) then
      raise exception 'rock_movement_permit_required' using errcode = '42501';
    end if;
    if not private.rock_position_valid(p_rock_position) then
      raise exception 'rock_position_invalid' using errcode = '22023';
    end if;
    if not private.accessory_quaternion_valid(p_rock_rotation) then
      raise exception 'rock_rotation_invalid' using errcode = '22023';
    end if;
    v_final_rock_position := p_rock_position;
    v_final_rock_rotation := p_rock_rotation;
  else
    v_final_rock_position := v_current_rock_position;
    v_final_rock_rotation := v_current_rock_rotation;
  end if;

  for v_item in select value from jsonb_array_elements(p_accessories)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'placement_accessory_invalid' using errcode = '22023';
    end if;

    begin
      v_instance_id := (v_item->>'instance_id')::uuid;
    exception when others then
      raise exception 'placement_accessory_instance_invalid' using errcode = '22023';
    end;
    v_accessory_id := nullif(btrim(v_item->>'accessory_id'), '');
    if v_accessory_id is null then
      raise exception 'placement_accessory_catalog_invalid' using errcode = '22023';
    end if;
    if v_instance_id = any(v_seen_ids) then
      raise exception 'placement_accessory_duplicate' using errcode = '22023';
    end if;
    v_seen_ids := array_append(v_seen_ids, v_instance_id);

    select a.slot, a.scale_min, a.scale_max
      into v_category, v_scale_min, v_scale_max
    from public.accessories a
    where a.id = v_accessory_id and a.active is true;
    if not found then
      raise exception 'accessory_unavailable' using errcode = '22023';
    end if;

    if not private.jsonb_numeric_array_valid(v_item->'local_position', 3, -4, 4) then
      raise exception 'accessory_position_invalid' using errcode = '22023';
    end if;
    if not private.accessory_quaternion_valid(v_item->'local_rotation') then
      raise exception 'accessory_rotation_invalid' using errcode = '22023';
    end if;
    if (v_item->>'uniform_scale') is null
      or (v_item->>'uniform_scale')::numeric < v_scale_min
      or (v_item->>'uniform_scale')::numeric > v_scale_max then
      raise exception 'accessory_scale_out_of_bounds' using errcode = '22023';
    end if;

    v_existing_accessory_id := null;
    select ea.accessory_id
      into v_existing_accessory_id
    from public.equipped_accessories ea
    where ea.id = v_instance_id
      and ea.user_rock_id = p_user_rock_id
    for update;

    if found then
      if v_existing_accessory_id <> v_accessory_id then
        raise exception 'placement_accessory_identity_mismatch' using errcode = '22023';
      end if;
    else
      if exists (
        select 1 from public.equipped_accessories ea where ea.id = v_instance_id
      ) then
        raise exception 'active_owned_accessory_instance_required' using errcode = '42501';
      end if;
      if not exists (
        select 1
        from public.user_accessories ua
        where ua.user_id = v_user_id and ua.accessory_id = v_accessory_id
      ) then
        raise exception 'accessory_not_owned' using errcode = '42501';
      end if;
    end if;
  end loop;

  delete from public.equipped_accessories ea
  where ea.user_rock_id = p_user_rock_id
    and not (ea.id = any(v_seen_ids));

  if coalesce(p_move_rock, false) then
    update public.user_rocks ur
    set pose_position = v_final_rock_position,
        pose_rotation = v_final_rock_rotation,
        pose_stabilized_at = v_stabilized_at,
        updated_at = now()
    where ur.id = p_user_rock_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_accessories)
  loop
    v_instance_id := (v_item->>'instance_id')::uuid;
    v_accessory_id := v_item->>'accessory_id';

    select a.slot into v_category
    from public.accessories a
    where a.id = v_accessory_id;

    if exists (
      select 1
      from public.equipped_accessories ea
      where ea.id = v_instance_id and ea.user_rock_id = p_user_rock_id
    ) then
      update public.equipped_accessories ea
      set local_position = v_item->'local_position',
          local_rotation = v_item->'local_rotation',
          uniform_scale = (v_item->>'uniform_scale')::numeric,
          stabilized_at = v_stabilized_at,
          updated_at = now()
      where ea.id = v_instance_id and ea.user_rock_id = p_user_rock_id;
    else
      insert into public.equipped_accessories(
        id,
        user_rock_id,
        accessory_id,
        slot,
        local_position,
        local_rotation,
        uniform_scale,
        equipped_at,
        updated_at,
        stabilized_at
      ) values (
        v_instance_id,
        p_user_rock_id,
        v_accessory_id,
        v_category,
        v_item->'local_position',
        v_item->'local_rotation',
        (v_item->>'uniform_scale')::numeric,
        v_stabilized_at,
        v_stabilized_at,
        v_stabilized_at
      );
    end if;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'instance_id', ea.id,
    'accessory_id', ea.accessory_id,
    'local_position', ea.local_position,
    'local_rotation', ea.local_rotation,
    'uniform_scale', ea.uniform_scale,
    'equipped_at', ea.equipped_at,
    'updated_at', ea.updated_at,
    'stabilized_at', ea.stabilized_at
  ) order by ea.equipped_at, ea.id), '[]'::jsonb)
    into v_accessories_result
  from public.equipped_accessories ea
  where ea.user_rock_id = p_user_rock_id;

  v_result := jsonb_build_object(
    'user_rock_id', p_user_rock_id,
    'rock_position', v_final_rock_position,
    'rock_rotation', v_final_rock_rotation,
    'stabilized_at', v_stabilized_at,
    'accessories', v_accessories_result
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'commit_placement_session', v_result);

  return query select
    p_user_rock_id,
    v_final_rock_position,
    v_final_rock_rotation,
    v_stabilized_at,
    v_accessories_result;
end;
$$;

create or replace function public.commit_placement_session(
  p_user_rock_id uuid,
  p_event_key uuid,
  p_move_rock boolean,
  p_rock_position jsonb,
  p_rock_rotation jsonb,
  p_accessories jsonb
)
returns table(
  user_rock_id uuid,
  rock_position jsonb,
  rock_rotation jsonb,
  stabilized_at timestamptz,
  accessories jsonb
)
language sql
set search_path = ''
as $$
  select * from private.commit_placement_session_impl(
    p_user_rock_id,
    p_event_key,
    p_move_rock,
    p_rock_position,
    p_rock_rotation,
    p_accessories
  );
$$;

revoke all on function private.commit_placement_session_impl(uuid, uuid, boolean, jsonb, jsonb, jsonb) from public, anon;
grant execute on function private.commit_placement_session_impl(uuid, uuid, boolean, jsonb, jsonb, jsonb) to authenticated, service_role;
revoke all on function public.commit_placement_session(uuid, uuid, boolean, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.commit_placement_session(uuid, uuid, boolean, jsonb, jsonb, jsonb) to authenticated, service_role;

commit;
