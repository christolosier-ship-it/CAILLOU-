begin;

alter table public.accessories
  add column if not exists collision jsonb,
  add column if not exists budget jsonb;

-- V1 backfill: preserve the current runtime behaviour while separating
-- physical tuning from collision geometry strategy.
update public.accessories
set collision = jsonb_build_object(
  'strategy',
  case lower(coalesce(physics->>'collider', 'convexhull'))
    when 'cuboid' then 'cuboid'
    when 'box' then 'cuboid'
    when 'ball' then 'ball'
    when 'sphere' then 'ball'
    else 'hull'
  end,
  'geometrySource', 'render'
)
where collision is null;

update public.accessories
set budget = case id
  when 'monocle' then '{"runtimeModelBytes":2586068}'::jsonb
  when 'bow-tie' then '{"runtimeModelBytes":264280}'::jsonb
  when 'round-glasses' then '{"runtimeModelBytes":1757336}'::jsonb
  when 'pedestal-gallery' then '{"runtimeModelBytes":1242500}'::jsonb
  else '{}'::jsonb
end
where budget is null;

alter table public.accessories
  alter column collision set not null,
  alter column budget set not null;

alter table public.accessories
  drop constraint if exists accessories_runtime_contract,
  drop constraint if exists accessories_collision_contract,
  drop constraint if exists accessories_budget_contract;

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
      collision->>'strategy' <> 'proxy'
      or (
        collision ? 'proxyPath'
        and collision->>'geometrySource' = 'proxy'
      )
    )
  ),
  add constraint accessories_budget_contract check (
    jsonb_typeof(budget) = 'object'
    and (
      not (budget ? 'runtimeModelBytes')
      or (
        jsonb_typeof(budget->'runtimeModelBytes') = 'number'
        and (budget->>'runtimeModelBytes')::bigint > 0
      )
    )
    and (
      not (budget ? 'maxTextureDimension')
      or (
        jsonb_typeof(budget->'maxTextureDimension') = 'number'
        and (budget->>'maxTextureDimension')::integer > 0
      )
    )
    and (
      not (budget ? 'largestTextureBytes')
      or (
        jsonb_typeof(budget->'largestTextureBytes') = 'number'
        and (budget->>'largestTextureBytes')::bigint > 0
      )
    )
  ),
  add constraint accessories_runtime_contract check (
    not active or (
      char_length(btrim(coalesce(description, ''))) > 0
      and asset_path is not null
      and asset_path ~ '^/assets/accessories/[a-z0-9-]+/model[.]glb$'
      and preview_path is not null
      and preview_path ~ '^/assets/accessory-previews/[a-z0-9-]+[.]png$'
      and triangle_count is not null
      and dimensions is not null
      and physics is not null
      and jsonb_typeof(physics) = 'object'
      and jsonb_typeof(collision) = 'object'
      and jsonb_typeof(budget) = 'object'
      and budget ? 'runtimeModelBytes'
    )
  );

comment on column public.accessories.collision is
  'V2-03 collision geometry contract. Strategy/proxy metadata only; Rapier tuning remains in physics.';
comment on column public.accessories.budget is
  'V2-03 measured runtime asset budget metadata. runtimeModelBytes is mandatory for active catalogue entries.';
comment on column public.accessories.provenance is
  'Legacy informational field retained for V1 compatibility; no longer required by the active catalogue contract.';

commit;
