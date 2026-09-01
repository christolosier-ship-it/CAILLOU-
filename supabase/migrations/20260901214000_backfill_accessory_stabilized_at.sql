-- CAILLOU™ step 10D compatibility backfill.
-- Placements created before the physics frontend existed are accepted as their current stable presentation pose.
-- Future create_equipped_accessory calls still leave stabilized_at NULL until Rapier settles them.

update public.equipped_accessories
set stabilized_at = updated_at
where stabilized_at is null;
