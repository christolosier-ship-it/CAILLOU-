-- CAILLOU™ step 10D: remove the duplicate accessory lookup index reported by the Supabase advisor.
-- Keep equipped_accessories_accessory_id_idx from the foundation schema.

drop index if exists public.equipped_accessories_accessory_idx;
