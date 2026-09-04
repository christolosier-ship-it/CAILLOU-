begin;

alter table public.accessories
  drop constraint if exists accessories_collision_contract;

alter table public.accessories
  add constraint accessories_collision_contract check (
    jsonb_typeof(collision) = 'object'
    and collision ? 'strategy'
    and collision->>'strategy' in ('hull', 'cuboid', 'ball', 'compound', 'proxy', 'simplified')
    and (
      not (collision ? 'geometrySource')
      or (
        jsonb_typeof(collision->'geometrySource') = 'string'
        and collision->>'geometrySource' in ('render', 'proxy')
      )
    )
    and (
      not (collision ? 'proxyPath')
      or (
        jsonb_typeof(collision->'proxyPath') = 'string'
        and collision->>'proxyPath' ~ '^/assets/accessories/[a-z0-9-]+/collider[.]glb$'
      )
    )
    and (
      coalesce(collision->>'geometrySource', case when collision->>'strategy' = 'proxy' then 'proxy' else 'render' end) <> 'proxy'
      or collision ? 'proxyPath'
    )
    and (
      not (collision ? 'proxyPath')
      or coalesce(collision->>'geometrySource', 'render') = 'proxy'
    )
    and (
      collision->>'strategy' <> 'proxy'
      or coalesce(collision->>'geometrySource', 'proxy') = 'proxy'
    )
  );

comment on column public.accessories.collision is
  'V2-03 collision geometry contract. Any proxy geometry source requires a validated collider.glb path; Rapier tuning remains in physics.';

commit;
