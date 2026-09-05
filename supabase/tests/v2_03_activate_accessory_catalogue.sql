begin;

-- Validate Lot G activation without leaving production catalogue rows active.
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
  v_invalid integer;
begin
  select count(*) into v_active
  from public.accessories
  where active
    and id in (
      'mask-scan', 'mouse-ears', 'traffic-cone', 'bebe-assets', 'chicken',
      'crocodile-dog-toy', 'garden-gnome', 'model', 'poo-scan', 'skull', 'worn-flip-flop'
    );
  if v_active <> 11 then
    raise exception 'expected 11 active V2 catalogue rows, got %', v_active;
  end if;

  select count(*) into v_invalid
  from public.accessories
  where id in (
      'mask-scan', 'mouse-ears', 'traffic-cone', 'bebe-assets', 'chicken',
      'crocodile-dog-toy', 'garden-gnome', 'model', 'poo-scan', 'skull', 'worn-flip-flop'
    )
    and (
      asset_path is null
      or preview_path is null
      or triangle_count is null
      or dimensions is null
      or jsonb_typeof(physics) <> 'object'
      or jsonb_typeof(collision) <> 'object'
      or jsonb_typeof(budget) <> 'object'
      or not (budget ? 'runtimeModelBytes')
    );
  if v_invalid <> 0 then
    raise exception 'invalid V2 activation rows: %', v_invalid;
  end if;
end
$$;

set local role anon;
select count(*) as visible_active_catalogue_rows
from public.accessories;
reset role;

rollback;
