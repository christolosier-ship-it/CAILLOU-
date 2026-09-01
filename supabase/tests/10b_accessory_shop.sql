-- CAILLOU™ step 10B shop/purchase acceptance contract.
-- Fixtures, wallet changes and purchases are always rolled back.

begin;

insert into auth.users(id) values
  ('10b00000-0000-4000-8000-000000000001'::uuid),
  ('10b00000-0000-4000-8000-000000000002'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('10b00000-0000-4000-8000-000000000001'::uuid, 'Shop10A', 'shop10a'),
  ('10b00000-0000-4000-8000-000000000002'::uuid, 'Shop10B', 'shop10b');

update public.wallets
set balance = case
      when user_id = '10b00000-0000-4000-8000-000000000001'::uuid then 200
      else 40
    end,
    lifetime_earned = case
      when user_id = '10b00000-0000-4000-8000-000000000001'::uuid then 200
      else 40
    end
where user_id in (
  '10b00000-0000-4000-8000-000000000001'::uuid,
  '10b00000-0000-4000-8000-000000000002'::uuid
);

insert into public.accessories(
  id, name, price_lithons, asset_path, preview_path, slot, active,
  triangle_count, dimensions, scale_min, scale_max, physics, provenance
) values
  (
    'step-10b-expensive', 'Test coûteux', 999,
    '/assets/accessories/step-10b-expensive/model.glb',
    '/assets/accessory-previews/step-10b-expensive.png',
    'test', true, 1, '[1,1,1]'::jsonb, 0.5, 1.5,
    '{"enabled":false}'::jsonb, '{"verified":true}'::jsonb
  ),
  (
    'step-10b-inactive', 'Test inactif', 1,
    '/assets/accessories/step-10b-inactive/model.glb',
    '/assets/accessory-previews/step-10b-inactive.png',
    'test', false, 1, '[1,1,1]'::jsonb, 0.5, 1.5,
    '{"enabled":false}'::jsonb, '{"verified":true}'::jsonb
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10b00000-0000-4000-8000-000000000001', true);

select * from public.purchase_accessory(
  'monocle',
  '10b10000-0000-4000-8000-000000000001'::uuid
);

-- Exact retry must return the receipt without a second debit or ledger row.
select * from public.purchase_accessory(
  'monocle',
  '10b10000-0000-4000-8000-000000000001'::uuid
);

do $$
begin
  begin
    perform * from public.purchase_accessory(
      'monocle',
      '10b10000-0000-4000-8000-000000000002'::uuid
    );
    raise exception 'distinct double purchase unexpectedly accepted';
  exception when others then
    if position('accessory_already_owned' in sqlerrm) = 0 then raise; end if;
  end;

  begin
    perform * from public.purchase_accessory(
      'step-10b-expensive',
      '10b10000-0000-4000-8000-000000000003'::uuid
    );
    raise exception 'insufficient purchase unexpectedly accepted';
  exception when others then
    if position('insufficient_lithons' in sqlerrm) = 0 then raise; end if;
  end;

  begin
    perform * from public.purchase_accessory(
      'step-10b-inactive',
      '10b10000-0000-4000-8000-000000000004'::uuid
    );
    raise exception 'inactive accessory unexpectedly purchased';
  exception when others then
    if position('accessory_unavailable' in sqlerrm) = 0 then raise; end if;
  end;

  begin
    insert into public.user_accessories(user_id, accessory_id)
    values ('10b00000-0000-4000-8000-000000000001'::uuid, 'step-10b-expensive');
    raise exception 'direct ownership write unexpectedly accepted';
  exception when insufficient_privilege then null;
  end;
end
$$;

select set_config('request.jwt.claim.sub', '10b00000-0000-4000-8000-000000000002', true);

do $$
begin
  if exists (
    select 1 from public.user_accessories
    where user_id = '10b00000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception 'user B can read user A possessions';
  end if;

  begin
    perform * from public.purchase_accessory(
      'monocle',
      '10b10000-0000-4000-8000-000000000005'::uuid
    );
    raise exception 'user B purchase without balance unexpectedly accepted';
  exception when others then
    if position('insufficient_lithons' in sqlerrm) = 0 then raise; end if;
  end;
end
$$;

reset role;

do $$
begin
  if (select balance from public.wallets where user_id = '10b00000-0000-4000-8000-000000000001'::uuid) <> 110 then
    raise exception 'wallet was not debited exactly once by the server price';
  end if;
  if (select lifetime_spent from public.wallets where user_id = '10b00000-0000-4000-8000-000000000001'::uuid) <> 90 then
    raise exception 'lifetime spent is inconsistent';
  end if;
  if (select count(*) from public.user_accessories where user_id = '10b00000-0000-4000-8000-000000000001'::uuid and accessory_id = 'monocle') <> 1 then
    raise exception 'permanent ownership was not created exactly once';
  end if;
  if (select count(*) from public.lithon_ledger where user_id = '10b00000-0000-4000-8000-000000000001'::uuid and accessory_id = 'monocle' and delta = -90) <> 1 then
    raise exception 'purchase ledger is not exactly-once';
  end if;
  if (select balance from public.wallets where user_id = '10b00000-0000-4000-8000-000000000002'::uuid) <> 40 then
    raise exception 'user B wallet changed after rejected purchase';
  end if;
  if has_function_privilege('anon', 'public.purchase_accessory(text,uuid)', 'EXECUTE') then
    raise exception 'anonymous role can purchase accessories';
  end if;
end
$$;

rollback;
