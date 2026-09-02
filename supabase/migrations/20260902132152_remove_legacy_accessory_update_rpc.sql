-- Placement drafts are world-space client state. Only the final Rapier pose
-- may cross the persistence boundary, through stabilize_equipped_accessory.
drop function if exists public.update_equipped_accessory(uuid, jsonb, jsonb, numeric);
drop function if exists private.update_equipped_accessory_impl(uuid, jsonb, jsonb, numeric);
