-- CAILLOU™ step 10D: authoritative persistence for physically stabilized accessory poses.

alter table public.equipped_accessories
  add column if not exists stabilized_at timestamptz;

alter table private.mutation_receipts
  drop constraint if exists mutation_receipts_operation;

alter table private.mutation_receipts
  add constraint mutation_receipts_operation
  check (operation = any (array[
    'adopt_rock'::text,
    'register_caress'::text,
    'register_cleaning'::text,
    'purchase_accessory'::text,
    'discard_active_rock'::text,
    'equip_accessory'::text,
    'create_equipped_accessory'::text,
    'remove_equipped_accessory'::text,
    'stabilize_equipped_accessory'::text
  ]));

create or replace function private.mark_accessory_transform_unsettled()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.local_position is distinct from old.local_position
    or new.local_rotation is distinct from old.local_rotation
    or new.uniform_scale is distinct from old.uniform_scale
  ) and new.stabilized_at is not distinct from old.stabilized_at then
    new.stabilized_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists equipped_accessories_mark_unsettled on public.equipped_accessories;
create trigger equipped_accessories_mark_unsettled
before update of local_position, local_rotation, uniform_scale, stabilized_at
on public.equipped_accessories
for each row execute function private.mark_accessory_transform_unsettled();

create or replace function private.stabilize_equipped_accessory_impl(
  p_instance_id uuid,
  p_event_key uuid,
  p_local_position jsonb,
  p_local_rotation jsonb,
  p_uniform_scale numeric
)
returns table(
  instance_id uuid,
  local_position jsonb,
  local_rotation jsonb,
  uniform_scale numeric,
  updated_at timestamptz,
  stabilized_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_accessory_id text;
  v_scale_min numeric;
  v_scale_max numeric;
  v_updated_at timestamptz;
  v_stabilized_at timestamptz;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'stabilize_equipped_accessory');
  if v_receipt is not null then
    return query select
      (v_receipt->>'instance_id')::uuid,
      v_receipt->'local_position',
      v_receipt->'local_rotation',
      (v_receipt->>'uniform_scale')::numeric,
      (v_receipt->>'updated_at')::timestamptz,
      (v_receipt->>'stabilized_at')::timestamptz;
    return;
  end if;

  select ea.accessory_id
    into v_accessory_id
  from public.equipped_accessories ea
  join public.user_rocks ur on ur.id = ea.user_rock_id
  where ea.id = p_instance_id
    and ur.user_id = v_user_id
    and ur.discarded_at is null
  for update of ea;
  if not found then
    raise exception 'active_owned_accessory_instance_required' using errcode = '42501';
  end if;

  select a.scale_min, a.scale_max
    into v_scale_min, v_scale_max
  from public.accessories a
  where a.id = v_accessory_id and a.active is true;
  if not found then
    raise exception 'accessory_unavailable' using errcode = '22023';
  end if;

  if not private.jsonb_numeric_array_valid(p_local_position, 3, -4, 4) then
    raise exception 'accessory_position_invalid' using errcode = '22023';
  end if;
  if not private.accessory_quaternion_valid(p_local_rotation) then
    raise exception 'accessory_rotation_invalid' using errcode = '22023';
  end if;
  if p_uniform_scale is null or p_uniform_scale < v_scale_min or p_uniform_scale > v_scale_max then
    raise exception 'accessory_scale_out_of_bounds' using errcode = '22023';
  end if;

  update public.equipped_accessories ea
  set local_position = p_local_position,
      local_rotation = p_local_rotation,
      uniform_scale = p_uniform_scale,
      updated_at = now(),
      stabilized_at = now()
  where ea.id = p_instance_id
  returning ea.updated_at, ea.stabilized_at into v_updated_at, v_stabilized_at;

  v_result := jsonb_build_object(
    'instance_id', p_instance_id,
    'local_position', p_local_position,
    'local_rotation', p_local_rotation,
    'uniform_scale', p_uniform_scale,
    'updated_at', v_updated_at,
    'stabilized_at', v_stabilized_at
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'stabilize_equipped_accessory', v_result);

  return query select
    p_instance_id, p_local_position, p_local_rotation, p_uniform_scale, v_updated_at, v_stabilized_at;
end;
$$;

create or replace function public.stabilize_equipped_accessory(
  p_instance_id uuid,
  p_event_key uuid,
  p_local_position jsonb,
  p_local_rotation jsonb,
  p_uniform_scale numeric
)
returns table(
  instance_id uuid,
  local_position jsonb,
  local_rotation jsonb,
  uniform_scale numeric,
  updated_at timestamptz,
  stabilized_at timestamptz
)
language sql
set search_path = ''
as $$
  select * from private.stabilize_equipped_accessory_impl(
    p_instance_id, p_event_key, p_local_position, p_local_rotation, p_uniform_scale
  );
$$;

revoke all on function public.stabilize_equipped_accessory(uuid, uuid, jsonb, jsonb, numeric) from public, anon;
grant execute on function public.stabilize_equipped_accessory(uuid, uuid, jsonb, jsonb, numeric) to authenticated;
grant execute on function public.stabilize_equipped_accessory(uuid, uuid, jsonb, jsonb, numeric) to service_role;

update public.accessories
set physics = coalesce(physics, '{}'::jsonb) || jsonb_build_object(
  'dynamic', id <> 'pedestal-gallery',
  'gravityScale', case id
    when 'monocle' then 0.90
    when 'bow-tie' then 0.86
    when 'round-glasses' then 0.88
    else 0
  end,
  'ccd', id <> 'pedestal-gallery',
  'collider', case when id = 'pedestal-gallery' then 'cuboid' else 'convexHull' end
),
updated_at = now()
where id in ('monocle', 'bow-tie', 'round-glasses', 'pedestal-gallery');
