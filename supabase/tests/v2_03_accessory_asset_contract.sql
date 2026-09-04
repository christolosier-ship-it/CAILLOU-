-- CAILLOU™ V2-03 Lot B acceptance test. All mutations are transactional and rolled back.

begin;

DO $$
declare
  v_missing integer;
begin
  select count(*) into v_missing
  from public.accessories
  where active
    and (
      collision is null
      or budget is null
      or not (budget ? 'runtimeModelBytes')
    );

  if v_missing <> 0 then
    raise exception 'active accessory contract is incomplete for % row(s)', v_missing;
  end if;

  if (select collision->>'strategy' from public.accessories where id = 'monocle') is distinct from 'hull' then
    raise exception 'monocle V1 collision backfill is not hull';
  end if;

  if (select collision->>'strategy' from public.accessories where id = 'pedestal-gallery') is distinct from 'cuboid' then
    raise exception 'pedestal V1 collision backfill is not cuboid';
  end if;

  if (select (budget->>'runtimeModelBytes')::bigint from public.accessories where id = 'bow-tie') <> 264280 then
    raise exception 'bow-tie runtime byte budget drifted';
  end if;
end
$$;

DO $$
begin
  begin
    update public.accessories
    set collision = '{"strategy":"mesh","geometrySource":"render"}'::jsonb
    where id = 'monocle';
    raise exception 'invalid collision strategy unexpectedly accepted';
  exception when check_violation then null;
  end;

  begin
    update public.accessories
    set collision = '{"strategy":"proxy","geometrySource":"proxy"}'::jsonb
    where id = 'monocle';
    raise exception 'proxy collision without proxyPath unexpectedly accepted';
  exception when check_violation then null;
  end;

  begin
    update public.accessories
    set budget = '{"runtimeModelBytes":0}'::jsonb
    where id = 'monocle';
    raise exception 'zero runtime byte budget unexpectedly accepted';
  exception when check_violation then null;
  end;

  begin
    update public.accessories
    set budget = '{}'::jsonb
    where id = 'monocle';
    raise exception 'active accessory without runtimeModelBytes unexpectedly accepted';
  exception when check_violation then null;
  end;
end
$$;

-- Owner decision: provenance is legacy information only and must not gate an active V2-03 asset.
update public.accessories set provenance = null where id = 'monocle';

DO $$
begin
  if (select provenance from public.accessories where id = 'monocle') is not null then
    raise exception 'legacy provenance could not be cleared from an active accessory';
  end if;
end
$$;

rollback;

select
  (select count(*) from public.accessories where active and collision is not null and budget ? 'runtimeModelBytes') as active_contract_rows,
  (select count(*) from public.accessories where id in ('monocle', 'bow-tie', 'round-glasses', 'pedestal-gallery')) as v1_rows_after_rollback;
