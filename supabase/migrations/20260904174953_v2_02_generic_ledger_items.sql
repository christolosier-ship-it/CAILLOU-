-- CAILLOU™ V2-02 Lot G: additive generic ledger identity for future item families.
begin;

alter table public.lithon_ledger
  add column item_kind text,
  add column item_id text;

alter table public.lithon_ledger
  add constraint lithon_ledger_item_pair check (
    (item_kind is null and item_id is null)
    or (item_kind is not null and item_id is not null)
  ),
  add constraint lithon_ledger_item_kind_format check (
    item_kind is null or item_kind ~ '^[a-z][a-z0-9_]{0,63}$'
  ),
  add constraint lithon_ledger_item_id_format check (
    item_id is null or (char_length(btrim(item_id)) between 1 and 128)
  ),
  add constraint lithon_ledger_item_consistency check (
    item_kind is null
    or (item_kind = 'accessory' and accessory_id is not null and item_id = accessory_id and feature_id is null)
    or (item_kind = 'rock_feature' and feature_id is not null and item_id = feature_id and accessory_id is null)
    or item_kind not in ('accessory', 'rock_feature')
  );

alter table public.lithon_ledger
  drop constraint lithon_ledger_reason,
  drop constraint lithon_ledger_reason_shape;

alter table public.lithon_ledger
  add constraint lithon_ledger_reason check (
    reason = any(array[
      'caress'::text,
      'accessory_purchase'::text,
      'feature_unlock'::text,
      'item_purchase'::text
    ])
  ),
  add constraint lithon_ledger_reason_shape check (
    (
      reason = 'caress'
      and delta = 1
      and accessory_id is null
      and feature_id is null
      and user_rock_id is not null
      and item_kind is null
      and item_id is null
    ) or (
      reason = 'accessory_purchase'
      and delta < 0
      and accessory_id is not null
      and feature_id is null
      and (
        (item_kind is null and item_id is null)
        or (item_kind = 'accessory' and item_id = accessory_id)
      )
    ) or (
      reason = 'feature_unlock'
      and delta < 0
      and accessory_id is null
      and feature_id is not null
      and (
        (item_kind is null and item_id is null)
        or (item_kind = 'rock_feature' and item_id = feature_id)
      )
    ) or (
      reason = 'item_purchase'
      and delta < 0
      and accessory_id is null
      and feature_id is null
      and item_kind is not null
      and item_id is not null
    )
  );

create or replace function private.purchase_accessory_impl(
  p_accessory_id text,
  p_event_key uuid
)
returns table(balance bigint, accessory_id text, purchased_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_price bigint;
  v_balance bigint;
  v_purchased_at timestamptz;
  v_result jsonb;
begin
  if p_accessory_id is null or btrim(p_accessory_id) = '' then
    raise exception 'accessory_required' using errcode = '22004';
  end if;

  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'purchase_accessory');
  if v_receipt is not null then
    return query select
      (v_receipt->>'balance')::bigint,
      v_receipt->>'accessory_id',
      (v_receipt->>'purchased_at')::timestamptz;
    return;
  end if;

  select a.price_lithons into v_price
  from public.accessories a
  where a.id = p_accessory_id and a.active
  for share;
  if not found then
    raise exception 'accessory_unavailable' using errcode = '22023';
  end if;

  select w.balance into v_balance
  from public.wallets w
  where w.user_id = v_user_id
  for update;
  if not found then
    raise exception 'wallet_missing' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.user_accessories ua
    where ua.user_id = v_user_id and ua.accessory_id = p_accessory_id
  ) then
    raise exception 'accessory_already_owned' using errcode = '23505';
  end if;
  if v_balance < v_price then
    raise exception 'insufficient_lithons' using errcode = '22003';
  end if;

  insert into public.user_accessories(user_id, accessory_id)
  values (v_user_id, p_accessory_id)
  returning user_accessories.purchased_at into v_purchased_at;

  update public.wallets w
  set balance = w.balance - v_price,
      lifetime_spent = w.lifetime_spent + v_price
  where w.user_id = v_user_id
  returning w.balance into v_balance;

  if v_price > 0 then
    insert into public.lithon_ledger(
      user_id, delta, reason, event_key, accessory_id, item_kind, item_id
    ) values (
      v_user_id, -v_price, 'accessory_purchase', p_event_key,
      p_accessory_id, 'accessory', p_accessory_id
    );
  end if;

  v_result := jsonb_build_object(
    'balance', v_balance,
    'accessory_id', p_accessory_id,
    'purchased_at', v_purchased_at
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'purchase_accessory', v_result);
  return query select v_balance, p_accessory_id, v_purchased_at;
end;
$$;

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

  select fc.price_lithons into v_price
  from public.feature_catalog fc
  where fc.id = p_feature_id and fc.active is true
  for share;
  if not found then
    raise exception 'feature_unavailable' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.rock_feature_unlocks rfu
    where rfu.user_rock_id = p_user_rock_id and rfu.feature_id = p_feature_id
  ) then
    raise exception 'feature_already_unlocked' using errcode = '23505';
  end if;

  select w.balance into v_balance
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
    user_rock_id, feature_id, acquisition_source, price_paid
  ) values (
    p_user_rock_id, p_feature_id, 'purchase', v_price
  )
  returning rock_feature_unlocks.acquired_at into v_unlocked_at;

  update public.wallets w
  set balance = w.balance - v_price,
      lifetime_spent = w.lifetime_spent + v_price
  where w.user_id = p_user_id
  returning w.balance into v_balance;

  if v_price > 0 then
    insert into public.lithon_ledger(
      user_id, user_rock_id, delta, reason, event_key,
      feature_id, item_kind, item_id
    ) values (
      p_user_id, p_user_rock_id, -v_price, 'feature_unlock', p_event_key,
      p_feature_id, 'rock_feature', p_feature_id
    );
  end if;

  return query select p_user_rock_id, v_balance, p_feature_id, v_unlocked_at, v_price;
end;
$$;

commit;
