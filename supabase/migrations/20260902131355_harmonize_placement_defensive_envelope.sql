-- CAILLOU™ placement harmonization: PostgreSQL validates transport integrity;
-- Three/Rapier remains the only authority for the finite pedestal geometry.

create or replace function private.placement_position_valid(p_value jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select private.jsonb_numeric_array_valid(p_value, 3, -32, 32);
$$;

create or replace function private.jsonb_numeric_array_valid(
  p_value jsonb,
  p_length integer,
  p_min numeric,
  p_max numeric
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_item jsonb;
  v_number numeric;
  v_effective_min numeric := p_min;
  v_effective_max numeric := p_max;
begin
  if p_length = 3 and p_min = -4 and p_max = 4 then
    v_effective_min := -32;
    v_effective_max := 32;
  end if;

  if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) <> p_length then
    return false;
  end if;

  for v_item in select value from jsonb_array_elements(p_value)
  loop
    if jsonb_typeof(v_item) <> 'number' then
      return false;
    end if;
    v_number := (v_item #>> '{}')::numeric;
    if v_number < v_effective_min or v_number > v_effective_max then
      return false;
    end if;
  end loop;

  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.rock_position_valid(p_value jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select private.placement_position_valid(p_value);
$$;

alter table public.user_rocks
  drop constraint if exists user_rocks_pose_position_valid;

alter table public.user_rocks
  add constraint user_rocks_pose_position_valid
  check (private.rock_position_valid(pose_position));

alter table public.equipped_accessories
  drop constraint if exists equipped_accessories_local_position_valid;

alter table public.equipped_accessories
  add constraint equipped_accessories_local_position_valid
  check (private.placement_position_valid(local_position));

revoke all on function private.placement_position_valid(jsonb) from public, anon, authenticated;
grant execute on function private.placement_position_valid(jsonb) to service_role;
