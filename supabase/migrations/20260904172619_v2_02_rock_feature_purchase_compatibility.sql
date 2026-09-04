begin;

-- Lots C/D: add the canonical per-rock purchase operation while preserving the
-- legacy operation name for old PWA retries.
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
      'purchase_rock_feature_unlock'::text,
      'stabilize_rock_composition'::text,
      'commit_placement_session'::text
    ])
  );

-- V1 feature purchases had no rock id. Keep those historical rows valid while
-- allowing V2 feature purchases to reference the precise rock they unlock.
alter table public.lithon_ledger
  drop constraint if exists lithon_ledger_reason_shape;

alter table public.lithon_ledger
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
    )
  );

create or replace function private.execute_rock_feature_purchase(
  p_user_id uuid,
  p_user_rock_id uuid,
  p_feature_id text,
  p_event_key uuid
)
returns table(
  user_rock_id uuid,
  balance bigint,
  feature_id text,
  unlocked_at timestamptz,
  price_paid bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price bigint;
  v_balance bigint;
  v_unlocked_at timestamptz;
begin
  if p_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_user_rock_id is null then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;
  if p_feature_id is null or btrim(p_feature_id) = '' then
    raise exception 'feature_required' using errcode = '22004';
  end if;

  perform 1
  from public.user_rocks ur
  where ur.id = p_user_rock_id
    and ur.user_id = p_user_id
    and ur.discarded_at is null
  for update;
  if not found then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;

  select fc.price_lithons
    into v_price
  from public.feature_catalog fc
  where fc.id = p_feature_id
    and fc.active is true
  for share;
  if not found then
    raise exception 'feature_unavailable' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.rock_feature_unlocks rfu
    where rfu.user_rock_id = p_user_rock_id
      and rfu.feature_id = p_feature_id
  ) then
    raise exception 'feature_already_unlocked' using errcode = '23505';
  end if;

  select w.balance
    into v_balance
  from public.wallets w
  where w.user_id = p_user_id
  for update;
  if not found then
    raise exception 'wallet_missing' using errcode = 'P0001';
  end if;

  if v_balance < v_price then
    raise exception 'insufficient_lithons' using errcode = '22003';
  end if;

  insert into public.rock_feature_unlocks(
    user_rock_id,
    feature_id,
    acquisition_source,
    price_paid
  ) values (
    p_user_rock_id,
    p_feature_id,
    'purchase',
    v_price
  )
  returning rock_feature_unlocks.acquired_at into v_unlocked_at;

  update public.wallets w
  set balance = w.balance - v_price,
      lifetime_spent = w.lifetime_spent + v_price
  where w.user_id = p_user_id
  returning w.balance into v_balance;

  if v_price > 0 then
    insert into public.lithon_ledger(
      user_id,
      user_rock_id,
      delta,
      reason,
      event_key,
      feature_id
    ) values (
      p_user_id,
      p_user_rock_id,
      -v_price,
      'feature_unlock',
      p_event_key,
      p_feature_id
    );
  end if;

  return query select p_user_rock_id, v_balance, p_feature_id, v_unlocked_at, v_price;
end;
$$;

revoke all on function private.execute_rock_feature_purchase(uuid, uuid, text, uuid)
  from public, anon, authenticated, service_role;

create or replace function private.purchase_rock_feature_unlock_impl(
  p_user_rock_id uuid,
  p_feature_id text,
  p_event_key uuid
)
returns table(
  user_rock_id uuid,
  balance bigint,
  feature_id text,
  unlocked_at timestamptz,
  price_paid bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_purchase record;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_user_rock_id is null then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;
  if p_feature_id is null or btrim(p_feature_id) = '' then
    raise exception 'feature_required' using errcode = '22004';
  end if;

  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'purchase_rock_feature_unlock');
  if v_receipt is not null then
    return query select
      (v_receipt->>'user_rock_id')::uuid,
      (v_receipt->>'balance')::bigint,
      v_receipt->>'feature_id',
      (v_receipt->>'unlocked_at')::timestamptz,
      (v_receipt->>'price_paid')::bigint;
    return;
  end if;

  select * into v_purchase
  from private.execute_rock_feature_purchase(
    v_user_id,
    p_user_rock_id,
    p_feature_id,
    p_event_key
  );

  v_result := jsonb_build_object(
    'user_rock_id', v_purchase.user_rock_id,
    'balance', v_purchase.balance,
    'feature_id', v_purchase.feature_id,
    'unlocked_at', v_purchase.unlocked_at,
    'price_paid', v_purchase.price_paid
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'purchase_rock_feature_unlock', v_result);

  return query select
    v_purchase.user_rock_id,
    v_purchase.balance,
    v_purchase.feature_id,
    v_purchase.unlocked_at,
    v_purchase.price_paid;
end;
$$;

create or replace function public.purchase_rock_feature_unlock(
  p_user_rock_id uuid,
  p_feature_id text,
  p_event_key uuid
)
returns table(
  user_rock_id uuid,
  balance bigint,
  feature_id text,
  unlocked_at timestamptz,
  price_paid bigint
)
language sql
set search_path = ''
as $$
  select *
  from private.purchase_rock_feature_unlock_impl(
    p_user_rock_id,
    p_feature_id,
    p_event_key
  );
$$;

revoke all on function private.purchase_rock_feature_unlock_impl(uuid, text, uuid)
  from public, anon;
grant execute on function private.purchase_rock_feature_unlock_impl(uuid, text, uuid)
  to authenticated, service_role;
revoke all on function public.purchase_rock_feature_unlock(uuid, text, uuid)
  from public, anon;
grant execute on function public.purchase_rock_feature_unlock(uuid, text, uuid)
  to authenticated, service_role;

-- Lot D: keep the exact V1 RPC signature/result, but claim the historical
-- operation name and derive the active rock before executing the V2 purchase.
-- Claiming first preserves safe replay of event keys created by old PWAs before
-- this upgrade.
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
  v_user_rock_id uuid;
  v_receipt jsonb;
  v_purchase record;
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

  select ur.id
    into v_user_rock_id
  from public.user_rocks ur
  where ur.user_id = v_user_id
    and ur.discarded_at is null;
  if not found then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;

  select * into v_purchase
  from private.execute_rock_feature_purchase(
    v_user_id,
    v_user_rock_id,
    p_feature_id,
    p_event_key
  );

  v_result := jsonb_build_object(
    'balance', v_purchase.balance,
    'feature_id', v_purchase.feature_id,
    'unlocked_at', v_purchase.unlocked_at,
    'price_paid', v_purchase.price_paid
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'purchase_feature_unlock', v_result);

  return query select
    v_purchase.balance,
    v_purchase.feature_id,
    v_purchase.unlocked_at,
    v_purchase.price_paid;
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

revoke all on function private.purchase_feature_unlock_impl(text, uuid)
  from public, anon;
grant execute on function private.purchase_feature_unlock_impl(text, uuid)
  to authenticated, service_role;
revoke all on function public.purchase_feature_unlock(text, uuid)
  from public, anon;
grant execute on function public.purchase_feature_unlock(text, uuid)
  to authenticated, service_role;

-- Lot E: preserve V1 account entitlements as a private archive. They are not
-- copied into rock_feature_unlocks, therefore they grant no V2 right.
alter table public.user_feature_unlocks set schema private;
alter table private.user_feature_unlocks rename to user_feature_unlocks_legacy;

comment on table private.user_feature_unlocks_legacy is
  'Read-only historical archive of V1 account-scoped feature purchases. These rows never grant V2 per-rock entitlements.';

revoke all on table private.user_feature_unlocks_legacy
  from public, anon, authenticated, service_role;

-- Old PWAs still query public.user_feature_unlocks. Preserve that read contract
-- as a projection of the current active rock only, not as an authority table.
create view public.user_feature_unlocks
with (security_invoker = true)
as
select
  ur.user_id,
  rfu.feature_id,
  rfu.acquired_at as unlocked_at,
  coalesce(rfu.price_paid, 0::bigint) as price_paid
from public.rock_feature_unlocks rfu
join public.user_rocks ur on ur.id = rfu.user_rock_id
where ur.discarded_at is null;

comment on view public.user_feature_unlocks is
  'V1 read-compatibility projection for the active rock. Canonical V2 authority is public.rock_feature_unlocks.';

revoke all on table public.user_feature_unlocks from public, anon, authenticated, service_role;
grant select on table public.user_feature_unlocks to authenticated, service_role;

-- Sensitive movement checks now read the canonical per-rock entitlement
-- directly, so no compatibility projection can become an authorization source.
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
    from public.rock_feature_unlocks rfu
    where rfu.user_rock_id = p_user_rock_id
      and rfu.feature_id = 'rock_movement'
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
      from public.rock_feature_unlocks rfu
      where rfu.user_rock_id = p_user_rock_id
        and rfu.feature_id = 'rock_movement'
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

commit;