-- CAILLOU™ step 10.5: tactile physics, premium rock movement and atomic composition persistence.
begin;

create or replace function private.rock_position_valid(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if not private.jsonb_numeric_array_valid(p_value, 3, -4, 4) then
    return false;
  end if;

  return (p_value->>0)::numeric between -2.40 and 2.40
    and (p_value->>1)::numeric between -0.25 and 3.40
    and (p_value->>2)::numeric between -2.40 and 2.40;
exception when others then
  return false;
end;
$$;

alter table public.user_rocks
  add column if not exists pose_position jsonb not null default '[0,0,0]'::jsonb,
  add column if not exists pose_rotation jsonb not null default '[0,0,0,1]'::jsonb,
  add column if not exists pose_stabilized_at timestamptz default now();

alter table public.user_rocks
  drop constraint if exists user_rocks_pose_position_valid,
  drop constraint if exists user_rocks_pose_rotation_valid;

alter table public.user_rocks
  add constraint user_rocks_pose_position_valid check (private.rock_position_valid(pose_position)),
  add constraint user_rocks_pose_rotation_valid check (private.accessory_quaternion_valid(pose_rotation));

create table if not exists public.feature_catalog (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_]{0,63}$'),
  name text not null check (char_length(btrim(name)) > 0),
  description text,
  price_lithons bigint not null check (price_lithons >= 0),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_feature_unlocks (
  user_id uuid not null references public.profiles(id),
  feature_id text not null references public.feature_catalog(id),
  unlocked_at timestamptz not null default now(),
  price_paid bigint not null check (price_paid >= 0),
  primary key (user_id, feature_id)
);

alter table public.feature_catalog enable row level security;
alter table public.user_feature_unlocks enable row level security;

drop policy if exists feature_catalog_select_active on public.feature_catalog;
create policy feature_catalog_select_active
  on public.feature_catalog for select
  to anon, authenticated
  using (active);

drop policy if exists user_feature_unlocks_select_own on public.user_feature_unlocks;
create policy user_feature_unlocks_select_own
  on public.user_feature_unlocks for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke all on public.feature_catalog from anon, authenticated;
revoke all on public.user_feature_unlocks from anon, authenticated;
grant select on public.feature_catalog to anon, authenticated;
grant select on public.user_feature_unlocks to authenticated;

insert into public.feature_catalog(id, name, description, price_lithons, active)
values (
  'rock_movement',
  'Permis de manutention minérale',
  'Autorise la manutention réglementaire du caillou dans les six degrés de liberté.',
  1000,
  true
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_lithons = excluded.price_lithons,
  active = excluded.active,
  updated_at = now();

alter table public.lithon_ledger
  add column if not exists feature_id text references public.feature_catalog(id);

alter table public.lithon_ledger
  drop constraint if exists lithon_ledger_reason,
  drop constraint if exists lithon_ledger_reason_shape;

alter table public.lithon_ledger
  add constraint lithon_ledger_reason check (
    reason = any(array['caress'::text, 'accessory_purchase'::text, 'feature_unlock'::text])
  ),
  add constraint lithon_ledger_reason_shape check (
    (
      reason = 'caress'
      and delta = 1
      and accessory_id is null
      and feature_id is null
      and user_rock_id is not null
    ) or (
      reason = 'accessory_purchase'
      and delta < 0
      and accessory_id is not null
      and feature_id is null
    ) or (
      reason = 'feature_unlock'
      and delta < 0
      and accessory_id is null
      and feature_id is not null
      and user_rock_id is null
    )
  );

create or replace function private.purchase_feature_unlock_impl(
  p_feature_id text,
  p_event_key uuid
)
returns table(balance bigint, feature_id text, unlocked_at timestamptz, price_paid bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_price bigint;
  v_balance bigint;
  v_unlocked_at timestamptz;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_feature_id is null or btrim(p_feature_id) = '' then
    raise exception 'feature_required' using errcode = '22004';
  end if;

  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'purchase_feature_unlock');
  if v_receipt is not null then
    return query select
      (v_receipt->>'balance')::bigint,
      v_receipt->>'feature_id',
      (v_receipt->>'unlocked_at')::timestamptz,
      (v_receipt->>'price_paid')::bigint;
    return;
  end if;

  select fc.price_lithons into v_price
  from public.feature_catalog fc
  where fc.id = p_feature_id and fc.active
  for share;
  if not found then
    raise exception 'feature_unavailable' using errcode = '22023';
  end if;

  select w.balance into v_balance
  from public.wallets w
  where w.user_id = v_user_id
  for update;
  if not found then
    raise exception 'wallet_missing' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.user_feature_unlocks ufu
    where ufu.user_id = v_user_id and ufu.feature_id = p_feature_id
  ) then
    raise exception 'feature_already_unlocked' using errcode = '23505';
  end if;

  if v_balance < v_price then
    raise exception 'insufficient_lithons' using errcode = '22003';
  end if;

  insert into public.user_feature_unlocks(user_id, feature_id, price_paid)
  values (v_user_id, p_feature_id, v_price)
  returning user_feature_unlocks.unlocked_at into v_unlocked_at;

  update public.wallets w
  set balance = w.balance - v_price,
      lifetime_spent = w.lifetime_spent + v_price
  where w.user_id = v_user_id
  returning w.balance into v_balance;

  if v_price > 0 then
    insert into public.lithon_ledger(user_id, delta, reason, event_key, feature_id)
    values (v_user_id, -v_price, 'feature_unlock', p_event_key, p_feature_id);
  end if;

  v_result := jsonb_build_object(
    'balance', v_balance,
    'feature_id', p_feature_id,
    'unlocked_at', v_unlocked_at,
    'price_paid', v_price
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'purchase_feature_unlock', v_result);

  return query select v_balance, p_feature_id, v_unlocked_at, v_price;
end;
$$;

create or replace function public.purchase_feature_unlock(
  p_feature_id text,
  p_event_key uuid
)
returns table(balance bigint, feature_id text, unlocked_at timestamptz, price_paid bigint)
language sql
set search_path = ''
as $$
  select * from private.purchase_feature_unlock_impl(p_feature_id, p_event_key);
$$;

revoke all on function private.purchase_feature_unlock_impl(text, uuid) from public, anon;
grant execute on function private.purchase_feature_unlock_impl(text, uuid) to authenticated, service_role;
revoke all on function public.purchase_feature_unlock(text, uuid) from public, anon;
grant execute on function public.purchase_feature_unlock(text, uuid) to authenticated, service_role;

create or replace function private.stabilize_rock_composition_impl(
  p_user_rock_id uuid,
  p_event_key uuid,
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
  v_seen_ids uuid[] := array[]::uuid[];
  v_expected_count integer;
  v_scale_min numeric;
  v_scale_max numeric;
  v_stabilized_at timestamptz := clock_timestamp();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'stabilize_rock_composition');
  if v_receipt is not null then
    return query select
      (v_receipt->>'user_rock_id')::uuid,
      v_receipt->'rock_position',
      v_receipt->'rock_rotation',
      (v_receipt->>'stabilized_at')::timestamptz,
      v_receipt->'accessories';
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
  if p_accessories is null or jsonb_typeof(p_accessories) <> 'array' then
    raise exception 'composition_accessories_invalid' using errcode = '22023';
  end if;

  select count(*)::integer into v_expected_count
  from public.equipped_accessories ea
  where ea.user_rock_id = p_user_rock_id;

  if jsonb_array_length(p_accessories) <> v_expected_count then
    raise exception 'composition_accessory_set_mismatch' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_accessories)
  loop
    begin
      v_instance_id := (v_item->>'instance_id')::uuid;
    exception when others then
      raise exception 'composition_accessory_instance_invalid' using errcode = '22023';
    end;

    if v_instance_id = any(v_seen_ids) then
      raise exception 'composition_accessory_duplicate' using errcode = '22023';
    end if;
    v_seen_ids := array_append(v_seen_ids, v_instance_id);

    select a.scale_min, a.scale_max
      into v_scale_min, v_scale_max
    from public.equipped_accessories ea
    join public.accessories a on a.id = ea.accessory_id and a.active
    where ea.id = v_instance_id
      and ea.user_rock_id = p_user_rock_id
    for update of ea;
    if not found then
      raise exception 'composition_accessory_set_mismatch' using errcode = '22023';
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
  end loop;

  update public.user_rocks ur
  set pose_position = p_rock_position,
      pose_rotation = p_rock_rotation,
      pose_stabilized_at = v_stabilized_at,
      updated_at = now()
  where ur.id = p_user_rock_id;

  for v_item in select value from jsonb_array_elements(p_accessories)
  loop
    v_instance_id := (v_item->>'instance_id')::uuid;
    update public.equipped_accessories ea
    set local_position = v_item->'local_position',
        local_rotation = v_item->'local_rotation',
        uniform_scale = (v_item->>'uniform_scale')::numeric,
        stabilized_at = v_stabilized_at,
        updated_at = now()
    where ea.id = v_instance_id and ea.user_rock_id = p_user_rock_id;
  end loop;

  v_result := jsonb_build_object(
    'user_rock_id', p_user_rock_id,
    'rock_position', p_rock_position,
    'rock_rotation', p_rock_rotation,
    'stabilized_at', v_stabilized_at,
    'accessories', p_accessories
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'stabilize_rock_composition', v_result);

  return query select p_user_rock_id, p_rock_position, p_rock_rotation, v_stabilized_at, p_accessories;
end;
$$;

create or replace function public.stabilize_rock_composition(
  p_user_rock_id uuid,
  p_event_key uuid,
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
  select * from private.stabilize_rock_composition_impl(
    p_user_rock_id,
    p_event_key,
    p_rock_position,
    p_rock_rotation,
    p_accessories
  );
$$;

revoke all on function private.stabilize_rock_composition_impl(uuid, uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function private.stabilize_rock_composition_impl(uuid, uuid, jsonb, jsonb, jsonb) to authenticated, service_role;
revoke all on function public.stabilize_rock_composition(uuid, uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.stabilize_rock_composition(uuid, uuid, jsonb, jsonb, jsonb) to authenticated, service_role;

commit;
