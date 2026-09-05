-- V2-03 Lot C collision runtime contract. Fixtures are rolled back.
begin;

DO $$
begin
  begin
    insert into public.accessories (
      id, name, description, price_lithons, slot, active, collision, budget
    ) values (
      'lot-c-invalid-proxy', 'Invalid proxy', 'Fixture', 1, 'object', false,
      '{"strategy":"compound","geometrySource":"proxy"}'::jsonb,
      '{}'::jsonb
    );
    raise exception 'proxy geometry source without proxyPath unexpectedly accepted';
  exception when check_violation then null;
  end;
end
$$;

insert into public.accessories (
  id, name, description, price_lithons, slot, active, collision, budget
) values (
  'lot-c-valid-proxy', 'Valid proxy', 'Fixture', 1, 'object', false,
  '{"strategy":"compound","geometrySource":"proxy","proxyPath":"/assets/accessories/lot-c-valid-proxy/collider.glb"}'::jsonb,
  '{}'::jsonb
);

DO $$
begin
  if (select count(*) from public.accessories where id = 'lot-c-valid-proxy') <> 1 then
    raise exception 'valid compound proxy descriptor was not accepted';
  end if;
  if (select count(*) from public.accessories where active) <> 4 then
    raise exception 'Lot C changed the active catalogue before Lot D';
  end if;
end
$$;

rollback;

select
  (select count(*) from public.accessories where id like 'lot-c-%') as fixture_rows_after_rollback,
  (select count(*) from public.accessories where active) as active_catalogue_rows;
