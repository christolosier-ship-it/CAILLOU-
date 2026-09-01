-- CAILLOU™ step 09 post-close recalibration: align visible dust and server cleaning cadence.
-- Dust starts after one hour and the client enables cleaning as soon as dust is non-zero.
-- Distinct cleaning events therefore become valid after the same one-hour interval.
-- Exact event-key replays still return their stored receipt before this guard is evaluated.

create or replace function private.register_cleaning_impl(p_user_rock_id uuid, p_event_key uuid)
returns table(last_cleaned_at timestamptz, cleaning_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_adopted_at timestamptz;
  v_previous_cleaned_at timestamptz;
  v_cleaned_at timestamptz;
  v_cleaning_count bigint;
  v_result jsonb;
begin
  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'register_cleaning');
  if v_receipt is not null then
    return query select
      (v_receipt->>'last_cleaned_at')::timestamptz,
      (v_receipt->>'cleaning_count')::bigint;
    return;
  end if;

  select ur.adopted_at, ur.last_cleaned_at
    into v_adopted_at, v_previous_cleaned_at
  from public.user_rocks ur
  where ur.id = p_user_rock_id
    and ur.user_id = v_user_id
    and ur.discarded_at is null
  for update;

  if not found then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;

  if now() - coalesce(v_previous_cleaned_at, v_adopted_at) < interval '1 hour' then
    raise exception 'surface_already_clean' using errcode = '55000';
  end if;

  update public.user_rocks ur
  set last_cleaned_at = now()
  where ur.id = p_user_rock_id
  returning ur.last_cleaned_at into v_cleaned_at;

  update public.rock_progress rp
  set cleaning_count = rp.cleaning_count + 1,
      interaction_count = rp.interaction_count + 1
  where rp.user_rock_id = p_user_rock_id
  returning rp.cleaning_count into v_cleaning_count;

  if not found then
    raise exception 'rock_progress_missing' using errcode = 'P0001';
  end if;

  v_result := jsonb_build_object(
    'last_cleaned_at', v_cleaned_at,
    'cleaning_count', v_cleaning_count
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'register_cleaning', v_result);

  return query select v_cleaned_at, v_cleaning_count;
end;
$$;
