-- CAILLOU™ step 08: keep caress rewards authoritative and damp trivial RPC spam.

create index if not exists lithon_ledger_caress_guard_idx
  on public.lithon_ledger(user_id, user_rock_id, created_at desc)
  where reason = 'caress';

create or replace function private.register_caress_impl(p_user_rock_id uuid, p_event_key uuid)
returns table(balance bigint, caress_count bigint, lithons_generated bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_balance bigint;
  v_caress_count bigint;
  v_lithons_generated bigint;
  v_result jsonb;
begin
  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'register_caress');
  if v_receipt is not null then
    return query select
      (v_receipt->>'balance')::bigint,
      (v_receipt->>'caress_count')::bigint,
      (v_receipt->>'lithons_generated')::bigint;
    return;
  end if;

  perform 1
  from public.user_rocks ur
  where ur.id = p_user_rock_id
    and ur.user_id = v_user_id
    and ur.discarded_at is null
  for update;

  if not found then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.lithon_ledger ll
    where ll.user_id = v_user_id
      and ll.user_rock_id = p_user_rock_id
      and ll.reason = 'caress'
      and ll.created_at > clock_timestamp() - interval '550 milliseconds'
  ) then
    raise exception 'caress_rate_limited' using errcode = 'P0001';
  end if;

  update public.rock_progress rp
  set caress_count = rp.caress_count + 1,
      interaction_count = rp.interaction_count + 1,
      lithons_generated = rp.lithons_generated + 1
  where rp.user_rock_id = p_user_rock_id
  returning rp.caress_count, rp.lithons_generated
  into v_caress_count, v_lithons_generated;

  if not found then
    raise exception 'rock_progress_missing' using errcode = 'P0001';
  end if;

  update public.wallets w
  set balance = w.balance + 1,
      lifetime_earned = w.lifetime_earned + 1
  where w.user_id = v_user_id
  returning w.balance into v_balance;

  if not found then
    raise exception 'wallet_missing' using errcode = 'P0001';
  end if;

  insert into public.lithon_ledger(user_id, user_rock_id, delta, reason, event_key)
  values (v_user_id, p_user_rock_id, 1, 'caress', p_event_key);

  v_result := jsonb_build_object(
    'balance', v_balance,
    'caress_count', v_caress_count,
    'lithons_generated', v_lithons_generated
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'register_caress', v_result);

  return query select v_balance, v_caress_count, v_lithons_generated;
end;
$$;
