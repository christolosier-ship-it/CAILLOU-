-- Step 10B: publish the licensed accessory catalogue and harden server-authoritative purchases.
begin;

alter table public.accessories
  add column if not exists preview_path text,
  add column if not exists triangle_count integer,
  add column if not exists dimensions jsonb,
  add column if not exists scale_min numeric(6, 3) not null default 0.500,
  add column if not exists scale_max numeric(6, 3) not null default 2.000,
  add column if not exists physics jsonb,
  add column if not exists provenance jsonb;

alter table public.accessories
  drop constraint if exists accessories_runtime_contract,
  drop constraint if exists accessories_triangle_count_positive,
  drop constraint if exists accessories_dimensions_shape,
  drop constraint if exists accessories_scale_range;

alter table public.accessories
  add constraint accessories_runtime_contract check (
    not active or (
      asset_path is not null
      and asset_path ~ '^/assets/accessories/[a-z0-9-]+/model[.]glb$'
      and preview_path is not null
      and preview_path ~ '^/assets/accessory-previews/[a-z0-9-]+[.]png$'
      and physics is not null
      and jsonb_typeof(physics) = 'object'
      and provenance is not null
      and jsonb_typeof(provenance) = 'object'
      and provenance @> '{"verified": true}'::jsonb
    )
  ),
  add constraint accessories_triangle_count_positive check (
    triangle_count is null or triangle_count > 0
  ),
  add constraint accessories_dimensions_shape check (
    dimensions is null or (
      jsonb_typeof(dimensions) = 'array'
      and jsonb_array_length(dimensions) = 3
    )
  ),
  add constraint accessories_scale_range check (
    scale_min > 0 and scale_max >= scale_min and scale_max <= 4
  );

insert into public.accessories (
  id,
  name,
  description,
  price_lithons,
  asset_path,
  preview_path,
  slot,
  active,
  sort_order,
  triangle_count,
  dimensions,
  scale_min,
  scale_max,
  physics,
  provenance
)
values (
  'monocle',
  'Monocle',
  'Un monocle en métal patiné, parfaitement sérieux sur un caillou.',
  90,
  '/assets/accessories/monocle/model.glb',
  '/assets/accessory-previews/monocle.png',
  'visage',
  true,
  10,
  665,
  '[0.440386, 0.626706, 0.725703]'::jsonb,
  0.650,
  1.350,
  '{
    "enabled": true,
    "collider": "convexHull",
    "mass": 0.18,
    "friction": 0.68,
    "restitution": 0.06,
    "linearDamping": 1.6,
    "angularDamping": 2.1
  }'::jsonb,
  '{
    "title": "Monocle",
    "author": "Una.K.Carlstrøm",
    "url": "https://sketchfab.com/3d-models/monocle-4f04956ecea24108869f5cbd785fd854",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "verified": true
  }'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_lithons = excluded.price_lithons,
  asset_path = excluded.asset_path,
  preview_path = excluded.preview_path,
  slot = excluded.slot,
  active = excluded.active,
  sort_order = excluded.sort_order,
  triangle_count = excluded.triangle_count,
  dimensions = excluded.dimensions,
  scale_min = excluded.scale_min,
  scale_max = excluded.scale_max,
  physics = excluded.physics,
  provenance = excluded.provenance;

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

  -- A per-user wallet lock serializes distinct double taps. Ownership is
  -- checked after the lock so a concurrent committed purchase is observed.
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
    insert into public.lithon_ledger(user_id, delta, reason, event_key, accessory_id)
    values (v_user_id, -v_price, 'accessory_purchase', p_event_key, p_accessory_id);
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

revoke all on function private.purchase_accessory_impl(text, uuid) from public, anon;
grant execute on function private.purchase_accessory_impl(text, uuid) to authenticated;
revoke all on function public.purchase_accessory(text, uuid) from public, anon;
grant execute on function public.purchase_accessory(text, uuid) to authenticated;

-- Existing SELECT grants remain explicit; direct wallet/ledger/ownership writes
-- stay revoked from browser roles.
grant select on public.accessories to anon, authenticated;
grant select on public.user_accessories to authenticated;

commit;
