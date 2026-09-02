-- CAILLOU™ post-10.75 correction: the pedestal ground is a hard invariant.
begin;

create or replace function private.rock_position_valid(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if not private.jsonb_numeric_array_valid(p_value, 3, -4, 4) then
    return false;
  end if;

  return (p_value->>0)::numeric between -2.40 and 2.40
    and (p_value->>1)::numeric between -0.02 and 3.40
    and (p_value->>2)::numeric between -2.40 and 2.40;
exception when others then
  return false;
end;
$$;

-- Legacy 10.75 states could have persisted a rock origin below the visible
-- pedestal plane. Bring only those invalid origins back to the plane and mark
-- them as requiring a fresh physical stabilization. The client computes the
-- exact volume-aware correction from the loaded GLB bounds.
update public.user_rocks
set pose_position = jsonb_build_array(
      (pose_position->>0)::numeric,
      greatest((pose_position->>1)::numeric, -0.02::numeric),
      (pose_position->>2)::numeric
    ),
    pose_stabilized_at = null,
    updated_at = now()
where (pose_position->>1)::numeric < -0.02;

alter table public.user_rocks
  drop constraint if exists user_rocks_pose_position_valid;

alter table public.user_rocks
  add constraint user_rocks_pose_position_valid
  check (private.rock_position_valid(pose_position));

commit;
