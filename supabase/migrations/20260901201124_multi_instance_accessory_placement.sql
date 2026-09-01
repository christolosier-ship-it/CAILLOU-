-- CAILLOU™ step 10C: multi-instance accessory equipment and persistent local transforms.

create or replace function private.jsonb_numeric_array_valid(
  p_value jsonb,
  p_length integer,
  p_min numeric,
  p_max numeric
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_item jsonb;
  v_number numeric;
begin
  if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) <> p_length then
    return false;
  end if;

  for v_item in select value from jsonb_array_elements(p_value)
  loop
    if jsonb_typeof(v_item) <> 'number' then
      return false;
    end if;
    v_number := (v_item #>> '{}')::numeric;
    if v_number < p_min or v_number > p_max then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function private.accessory_quaternion_valid(p_value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_x numeric;
  v_y numeric;
  v_z numeric;
  v_w numeric;
  v_norm numeric;
begin
  if not private.jsonb_numeric_array_valid(p_value, 4, -1, 1) then
    return false;
  end if;

  v_x := (p_value->>0)::numeric;
  v_y := (p_value->>1)::numeric;
  v_z := (p_value->>2)::numeric;
  v_w := (p_value->>3)::numeric;
  v_norm := sqrt(v_x*v_x + v_y*v_y + v_z*v_z + v_w*v_w);
  return v_norm between 0.98 and 1.02;
end;
$$;

drop function if exists public.equip_accessory(uuid, text, uuid);
drop function if exists private.equip_accessory_impl(uuid, text, uuid);

alter table public.equipped_accessories
  drop constraint if exists equipped_accessories_pkey;

alter table public.equipped_accessories
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists local_position jsonb not null default '[0,0,0]'::jsonb,
  add column if not exists local_rotation jsonb not null default '[0,0,0,1]'::jsonb,
  add column if not exists uniform_scale numeric not null default 1,
  add column if not exists updated_at timestamptz not null default now();

update public.equipped_accessories
set id = gen_random_uuid()
where id is null;

alter table public.equipped_accessories
  alter column id set not null,
  alter column slot drop not null;

alter table public.equipped_accessories
  add constraint equipped_accessories_pkey primary key (id),
  add constraint equipped_accessories_local_position_valid
    check (private.jsonb_numeric_array_valid(local_position, 3, -4, 4)),
  add constraint equipped_accessories_local_rotation_valid
    check (private.accessory_quaternion_valid(local_rotation)),
  add constraint equipped_accessories_uniform_scale_sane
    check (uniform_scale > 0 and uniform_scale <= 4);

create index if not exists equipped_accessories_user_rock_idx
  on public.equipped_accessories(user_rock_id, equipped_at, id);
create index if not exists equipped_accessories_accessory_idx
  on public.equipped_accessories(accessory_id);

revoke insert, update, delete on public.equipped_accessories from anon, authenticated;
grant select on public.equipped_accessories to authenticated;

create or replace function private.create_equipped_accessory_impl(
  p_user_rock_id uuid,
  p_accessory_id text,
  p_event_key uuid,
  p_local_position jsonb,
  p_local_rotation jsonb,
  p_uniform_scale numeric
)
returns table(
  instance_id uuid,
  user_rock_id uuid,
  accessory_id text,
  category text,
  local_position jsonb,
  local_rotation jsonb,
  uniform_scale numeric,
  equipped_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_category text;
  v_scale_min numeric;
  v_scale_max numeric;
  v_instance_id uuid;
  v_equipped_at timestamptz;
  v_updated_at timestamptz;
  v_result jsonb;
begin
  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'create_equipped_accessory');
  if v_receipt is not null then
    return query select
      (v_receipt->>'instance_id')::uuid,
      (v_receipt->>'user_rock_id')::uuid,
      v_receipt->>'accessory_id',
      v_receipt->>'category',
      v_receipt->'local_position',
      v_receipt->'local_rotation',
      (v_receipt->>'uniform_scale')::numeric,
      (v_receipt->>'equipped_at')::timestamptz,
      (v_receipt->>'updated_at')::timestamptz;
    return;
  end if;

  perform 1
  from public.user_rocks ur
  where ur.id = p_user_rock_id
    and ur.user_id = v_user_id
    and ur.discarded_at is null
  for update;
  if not found then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;

  if (select count(*) from public.equipped_accessories ea where ea.user_rock_id = p_user_rock_id) >= 8 then
    raise exception 'accessory_instance_limit_reached' using errcode = '54000';
  end if;

  select a.slot, a.scale_min, a.scale_max
    into v_category, v_scale_min, v_scale_max
  from public.accessories a
  where a.id = p_accessory_id and a.active is true;
  if not found then
    raise exception 'accessory_unavailable' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.user_accessories ua
    where ua.user_id = v_user_id and ua.accessory_id = p_accessory_id
  ) then
    raise exception 'accessory_not_owned' using errcode = '42501';
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

  insert into public.equipped_accessories(
    user_rock_id, accessory_id, slot, local_position, local_rotation, uniform_scale
  )
  values (
    p_user_rock_id, p_accessory_id, v_category, p_local_position, p_local_rotation, p_uniform_scale
  )
  returning id, equipped_accessories.equipped_at, equipped_accessories.updated_at
    into v_instance_id, v_equipped_at, v_updated_at;

  v_result := jsonb_build_object(
    'instance_id', v_instance_id,
    'user_rock_id', p_user_rock_id,
    'accessory_id', p_accessory_id,
    'category', v_category,
    'local_position', p_local_position,
    'local_rotation', p_local_rotation,
    'uniform_scale', p_uniform_scale,
    'equipped_at', v_equipped_at,
    'updated_at', v_updated_at
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'create_equipped_accessory', v_result);

  return query select
    v_instance_id, p_user_rock_id, p_accessory_id, v_category,
    p_local_position, p_local_rotation, p_uniform_scale, v_equipped_at, v_updated_at;
end;
$$;

create or replace function private.update_equipped_accessory_impl(
  p_instance_id uuid,
  p_local_position jsonb,
  p_local_rotation jsonb,
  p_uniform_scale numeric
)
returns table(
  instance_id uuid,
  local_position jsonb,
  local_rotation jsonb,
  uniform_scale numeric,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_accessory_id text;
  v_scale_min numeric;
  v_scale_max numeric;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
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
      updated_at = now()
  where ea.id = p_instance_id
  returning ea.updated_at into v_updated_at;

  return query select p_instance_id, p_local_position, p_local_rotation, p_uniform_scale, v_updated_at;
end;
$$;

create or replace function private.remove_equipped_accessory_impl(
  p_instance_id uuid,
  p_event_key uuid
)
returns table(instance_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_result jsonb;
begin
  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'remove_equipped_accessory');
  if v_receipt is not null then
    return query select (v_receipt->>'instance_id')::uuid;
    return;
  end if;

  perform 1
  from public.equipped_accessories ea
  join public.user_rocks ur on ur.id = ea.user_rock_id
  where ea.id = p_instance_id
    and ur.user_id = v_user_id
    and ur.discarded_at is null
  for update of ea;
  if not found then
    raise exception 'active_owned_accessory_instance_required' using errcode = '42501';
  end if;

  delete from public.equipped_accessories ea where ea.id = p_instance_id;

  v_result := jsonb_build_object('instance_id', p_instance_id);
  perform private.finish_mutation(v_user_id, p_event_key, 'remove_equipped_accessory', v_result);
  return query select p_instance_id;
end;
$$;

create or replace function public.create_equipped_accessory(
  p_user_rock_id uuid,
  p_accessory_id text,
  p_event_key uuid,
  p_local_position jsonb,
  p_local_rotation jsonb,
  p_uniform_scale numeric
)
returns table(
  instance_id uuid,
  user_rock_id uuid,
  accessory_id text,
  category text,
  local_position jsonb,
  local_rotation jsonb,
  uniform_scale numeric,
  equipped_at timestamptz,
  updated_at timestamptz
)
language sql
set search_path = ''
as $$
  select * from private.create_equipped_accessory_impl(
    p_user_rock_id, p_accessory_id, p_event_key,
    p_local_position, p_local_rotation, p_uniform_scale
  );
$$;

create or replace function public.update_equipped_accessory(
  p_instance_id uuid,
  p_local_position jsonb,
  p_local_rotation jsonb,
  p_uniform_scale numeric
)
returns table(
  instance_id uuid,
  local_position jsonb,
  local_rotation jsonb,
  uniform_scale numeric,
  updated_at timestamptz
)
language sql
set search_path = ''
as $$
  select * from private.update_equipped_accessory_impl(
    p_instance_id, p_local_position, p_local_rotation, p_uniform_scale
  );
$$;

create or replace function public.remove_equipped_accessory(
  p_instance_id uuid,
  p_event_key uuid
)
returns table(instance_id uuid)
language sql
set search_path = ''
as $$
  select * from private.remove_equipped_accessory_impl(p_instance_id, p_event_key);
$$;

revoke all on function public.create_equipped_accessory(uuid, text, uuid, jsonb, jsonb, numeric) from public, anon;
revoke all on function public.update_equipped_accessory(uuid, jsonb, jsonb, numeric) from public, anon;
revoke all on function public.remove_equipped_accessory(uuid, uuid) from public, anon;
grant execute on function public.create_equipped_accessory(uuid, text, uuid, jsonb, jsonb, numeric) to authenticated;
grant execute on function public.update_equipped_accessory(uuid, jsonb, jsonb, numeric) to authenticated;
grant execute on function public.remove_equipped_accessory(uuid, uuid) to authenticated;
grant execute on function public.create_equipped_accessory(uuid, text, uuid, jsonb, jsonb, numeric) to service_role;
grant execute on function public.update_equipped_accessory(uuid, jsonb, jsonb, numeric) to service_role;
grant execute on function public.remove_equipped_accessory(uuid, uuid) to service_role;
