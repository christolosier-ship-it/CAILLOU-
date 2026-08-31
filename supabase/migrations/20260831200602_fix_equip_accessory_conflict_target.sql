-- Keep the migration history additive: the foundation migration exposed a PL/pgSQL
-- ambiguity on the ON CONFLICT target. The named PK constraint removes it.

create or replace function private.equip_accessory_impl(p_user_rock_id uuid, p_accessory_id text, p_event_key uuid)
returns table(user_rock_id uuid, slot text, accessory_id text, equipped_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_slot text;
  v_equipped_at timestamptz;
  v_result jsonb;
begin
  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'equip_accessory');
  if v_receipt is not null then
    return query select
      (v_receipt->>'user_rock_id')::uuid,
      v_receipt->>'slot',
      v_receipt->>'accessory_id',
      (v_receipt->>'equipped_at')::timestamptz;
    return;
  end if;

  perform 1 from public.user_rocks ur
  where ur.id = p_user_rock_id and ur.user_id = v_user_id and ur.discarded_at is null
  for update;
  if not found then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;

  select a.slot into v_slot from public.accessories a where a.id = p_accessory_id;
  if not found then
    raise exception 'accessory_unknown' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.user_accessories ua
    where ua.user_id = v_user_id and ua.accessory_id = p_accessory_id
  ) then
    raise exception 'accessory_not_owned' using errcode = '42501';
  end if;

  insert into public.equipped_accessories(user_rock_id, accessory_id, slot)
  values (p_user_rock_id, p_accessory_id, v_slot)
  on conflict on constraint equipped_accessories_pkey
  do update set accessory_id = excluded.accessory_id, equipped_at = now()
  returning equipped_accessories.equipped_at into v_equipped_at;

  v_result := jsonb_build_object(
    'user_rock_id', p_user_rock_id,
    'slot', v_slot,
    'accessory_id', p_accessory_id,
    'equipped_at', v_equipped_at
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'equip_accessory', v_result);
  return query select p_user_rock_id, v_slot, p_accessory_id, v_equipped_at;
end;
$$;
