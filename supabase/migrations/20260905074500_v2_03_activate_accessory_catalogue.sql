begin;

-- Lot G publication gate. This migration must only be applied once the PR
-- carrying the V2 binaries is merged and the production deployment serves
-- the referenced model/preview/collider paths.
do $$
declare
  v_expected constant text[] := array[
    'mask-scan',
    'mouse-ears',
    'traffic-cone',
    'bebe-assets',
    'chicken',
    'crocodile-dog-toy',
    'garden-gnome',
    'model',
    'poo-scan',
    'skull',
    'worn-flip-flop'
  ];
  v_count integer;
begin
  select count(*) into v_count
  from public.accessories a
  where a.id = any(v_expected)
    and a.asset_path = '/assets/accessories/' || a.id || '/model.glb'
    and a.preview_path = '/assets/accessory-previews/' || a.id || '.png'
    and a.triangle_count is not null
    and a.dimensions is not null
    and jsonb_typeof(a.physics) = 'object'
    and jsonb_typeof(a.collision) = 'object'
    and jsonb_typeof(a.budget) = 'object'
    and a.budget ? 'runtimeModelBytes';

  if v_count <> cardinality(v_expected) then
    raise exception 'v2_03_activation_precondition_failed: %/% catalogue rows ready', v_count, cardinality(v_expected);
  end if;
end
$$;

update public.accessories
set active = true
where id in (
  'mask-scan',
  'mouse-ears',
  'traffic-cone',
  'bebe-assets',
  'chicken',
  'crocodile-dog-toy',
  'garden-gnome',
  'model',
  'poo-scan',
  'skull',
  'worn-flip-flop'
);

do $$
declare
  v_active integer;
begin
  select count(*) into v_active
  from public.accessories
  where active
    and id in (
      'mask-scan', 'mouse-ears', 'traffic-cone', 'bebe-assets', 'chicken',
      'crocodile-dog-toy', 'garden-gnome', 'model', 'poo-scan', 'skull', 'worn-flip-flop'
    );

  if v_active <> 11 then
    raise exception 'v2_03_activation_failed: %/11 V2 rows active', v_active;
  end if;
end
$$;

commit;
