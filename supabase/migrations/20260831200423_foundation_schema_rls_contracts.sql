-- CAILLOU™ backend foundation: authoritative data, RLS and transactional contracts.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  username_normalized text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_trimmed check (username = btrim(username)),
  constraint profiles_username_length check (char_length(username) between 3 and 32),
  constraint profiles_username_normalized_trimmed check (username_normalized = btrim(username_normalized)),
  constraint profiles_username_normalized_lower check (username_normalized = lower(username_normalized)),
  constraint profiles_username_normalized_length check (char_length(username_normalized) between 3 and 32)
);

create table public.rock_catalog (
  id text primary key,
  catalog_index integer not null unique,
  label text not null,
  short_description text,
  description text,
  model_path text,
  preview_path text,
  source_mesh text,
  triangle_count integer,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rock_catalog_id_format check (id ~ '^rock-(00[1-9]|01[0-9]|020)$'),
  constraint rock_catalog_index_range check (catalog_index between 1 and 20),
  constraint rock_catalog_label_not_blank check (char_length(btrim(label)) > 0),
  constraint rock_catalog_triangle_count_positive check (triangle_count is null or triangle_count > 0)
);

create table public.user_rocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  specimen_id text not null references public.rock_catalog(id) on delete restrict,
  name text not null,
  adopted_at timestamptz not null default now(),
  discarded_at timestamptz,
  last_cleaned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_rocks_name_trimmed check (name = btrim(name)),
  constraint user_rocks_name_length check (char_length(name) between 1 and 32),
  constraint user_rocks_discard_after_adoption check (discarded_at is null or discarded_at >= adopted_at),
  constraint user_rocks_clean_after_adoption check (last_cleaned_at is null or last_cleaned_at >= adopted_at)
);

create unique index user_rocks_one_active_per_user
  on public.user_rocks(user_id)
  where discarded_at is null;
create index user_rocks_user_id_idx on public.user_rocks(user_id);
create index user_rocks_specimen_id_idx on public.user_rocks(specimen_id);
create index user_rocks_user_history_idx on public.user_rocks(user_id, adopted_at desc);

create table public.rock_progress (
  user_rock_id uuid primary key references public.user_rocks(id) on delete cascade,
  caress_count bigint not null default 0,
  cleaning_count bigint not null default 0,
  interaction_count bigint not null default 0,
  observation_seconds bigint not null default 0,
  lithons_generated bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint rock_progress_counts_nonnegative check (
    caress_count >= 0 and cleaning_count >= 0 and interaction_count >= 0 and observation_seconds >= 0 and lithons_generated >= 0
  ),
  constraint rock_progress_v1_lithons_match_caresses check (lithons_generated = caress_count),
  constraint rock_progress_interactions_cover_actions check (interaction_count >= caress_count + cleaning_count)
);

create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance bigint not null default 0,
  lifetime_earned bigint not null default 0,
  lifetime_spent bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint wallets_nonnegative check (balance >= 0 and lifetime_earned >= 0 and lifetime_spent >= 0),
  constraint wallets_accounting_identity check (balance = lifetime_earned - lifetime_spent)
);

create table public.accessories (
  id text primary key,
  name text not null,
  description text,
  price_lithons bigint not null,
  asset_path text,
  slot text not null,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accessories_id_format check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  constraint accessories_name_not_blank check (char_length(btrim(name)) > 0),
  constraint accessories_price_nonnegative check (price_lithons >= 0),
  constraint accessories_slot_format check (slot ~ '^[a-z0-9][a-z0-9_-]{0,31}$')
);

create index accessories_active_sort_idx on public.accessories(active, sort_order, id);

create table public.user_accessories (
  user_id uuid not null references public.profiles(id) on delete cascade,
  accessory_id text not null references public.accessories(id) on delete restrict,
  purchased_at timestamptz not null default now(),
  primary key (user_id, accessory_id)
);

create index user_accessories_accessory_id_idx on public.user_accessories(accessory_id);

create table public.equipped_accessories (
  user_rock_id uuid not null references public.user_rocks(id) on delete cascade,
  accessory_id text not null references public.accessories(id) on delete restrict,
  slot text not null,
  equipped_at timestamptz not null default now(),
  primary key (user_rock_id, slot),
  constraint equipped_accessories_slot_format check (slot ~ '^[a-z0-9][a-z0-9_-]{0,31}$')
);

create index equipped_accessories_accessory_id_idx on public.equipped_accessories(accessory_id);

create table public.lithon_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_rock_id uuid references public.user_rocks(id) on delete set null,
  delta bigint not null,
  reason text not null,
  event_key uuid not null,
  accessory_id text references public.accessories(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint lithon_ledger_delta_nonzero check (delta <> 0),
  constraint lithon_ledger_reason check (reason in ('caress', 'accessory_purchase')),
  constraint lithon_ledger_reason_shape check (
    (reason = 'caress' and delta = 1 and accessory_id is null and user_rock_id is not null)
    or
    (reason = 'accessory_purchase' and delta < 0 and accessory_id is not null)
  ),
  unique (user_id, event_key)
);

create index lithon_ledger_user_created_idx on public.lithon_ledger(user_id, created_at desc);
create index lithon_ledger_user_rock_idx on public.lithon_ledger(user_rock_id) where user_rock_id is not null;
create index lithon_ledger_accessory_idx on public.lithon_ledger(accessory_id) where accessory_id is not null;

create table private.mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key uuid not null,
  operation text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, event_key),
  constraint mutation_receipts_operation check (operation in ('adopt_rock', 'register_caress', 'register_cleaning', 'purchase_accessory', 'discard_active_rock', 'equip_accessory'))
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger rock_catalog_set_updated_at before update on public.rock_catalog
for each row execute function private.set_updated_at();
create trigger user_rocks_set_updated_at before update on public.user_rocks
for each row execute function private.set_updated_at();
create trigger rock_progress_set_updated_at before update on public.rock_progress
for each row execute function private.set_updated_at();
create trigger wallets_set_updated_at before update on public.wallets
for each row execute function private.set_updated_at();
create trigger accessories_set_updated_at before update on public.accessories
for each row execute function private.set_updated_at();

create or replace function private.create_wallet_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wallets(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_wallet after insert on public.profiles
for each row execute function private.create_wallet_for_profile();

create or replace function private.claim_mutation(p_user_id uuid, p_event_key uuid, p_operation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operation text;
  v_result jsonb;
begin
  if p_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_event_key is null then
    raise exception 'event_key_required' using errcode = '22004';
  end if;

  insert into private.mutation_receipts(user_id, event_key, operation, result)
  values (p_user_id, p_event_key, p_operation, null)
  on conflict (user_id, event_key) do nothing;

  if found then
    return null;
  end if;

  select mr.operation, mr.result
    into v_operation, v_result
  from private.mutation_receipts mr
  where mr.user_id = p_user_id and mr.event_key = p_event_key;

  if v_operation is distinct from p_operation then
    raise exception 'event_key_reused_for_different_operation' using errcode = '22023';
  end if;
  if v_result is null then
    raise exception 'mutation_in_progress' using errcode = '40001';
  end if;

  return v_result;
end;
$$;

create or replace function private.finish_mutation(p_user_id uuid, p_event_key uuid, p_operation text, p_result jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.mutation_receipts mr
  set result = p_result
  where mr.user_id = p_user_id
    and mr.event_key = p_event_key
    and mr.operation = p_operation;

  if not found then
    raise exception 'mutation_receipt_missing' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function private.adopt_rock_impl(p_specimen_id text, p_name text, p_event_key uuid)
returns table(user_rock_id uuid, specimen_id text, rock_name text, adopted_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_user_rock public.user_rocks%rowtype;
  v_result jsonb;
begin
  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'adopt_rock');
  if v_receipt is not null then
    return query select
      (v_receipt->>'user_rock_id')::uuid,
      v_receipt->>'specimen_id',
      v_receipt->>'rock_name',
      (v_receipt->>'adopted_at')::timestamptz;
    return;
  end if;

  if p_name is null or p_name <> btrim(p_name) or char_length(p_name) not between 1 and 32 then
    raise exception 'invalid_rock_name' using errcode = '22023';
  end if;

  perform 1 from public.profiles p where p.id = v_user_id for update;
  if not found then
    raise exception 'profile_required' using errcode = '23503';
  end if;

  perform 1 from public.rock_catalog rc where rc.id = p_specimen_id and rc.active;
  if not found then
    raise exception 'specimen_unavailable' using errcode = '22023';
  end if;

  select ur.* into v_user_rock
  from public.user_rocks ur
  where ur.user_id = v_user_id and ur.discarded_at is null
  for update;

  if found then
    if v_user_rock.specimen_id = p_specimen_id and v_user_rock.name = p_name then
      v_result := jsonb_build_object(
        'user_rock_id', v_user_rock.id,
        'specimen_id', v_user_rock.specimen_id,
        'rock_name', v_user_rock.name,
        'adopted_at', v_user_rock.adopted_at
      );
      perform private.finish_mutation(v_user_id, p_event_key, 'adopt_rock', v_result);
      return query select v_user_rock.id, v_user_rock.specimen_id, v_user_rock.name, v_user_rock.adopted_at;
      return;
    end if;
    raise exception 'active_rock_exists' using errcode = '23505';
  end if;

  insert into public.user_rocks(user_id, specimen_id, name)
  values (v_user_id, p_specimen_id, p_name)
  returning * into v_user_rock;

  insert into public.rock_progress(user_rock_id) values (v_user_rock.id);
  insert into public.wallets(user_id) values (v_user_id) on conflict (user_id) do nothing;

  v_result := jsonb_build_object(
    'user_rock_id', v_user_rock.id,
    'specimen_id', v_user_rock.specimen_id,
    'rock_name', v_user_rock.name,
    'adopted_at', v_user_rock.adopted_at
  );
  perform private.finish_mutation(v_user_id, p_event_key, 'adopt_rock', v_result);

  return query select v_user_rock.id, v_user_rock.specimen_id, v_user_rock.name, v_user_rock.adopted_at;
end;
$$;

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

  perform 1 from public.user_rocks ur
  where ur.id = p_user_rock_id and ur.user_id = v_user_id and ur.discarded_at is null
  for update;
  if not found then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;

  update public.rock_progress rp
  set caress_count = rp.caress_count + 1,
      interaction_count = rp.interaction_count + 1,
      lithons_generated = rp.lithons_generated + 1
  where rp.user_rock_id = p_user_rock_id
  returning rp.caress_count, rp.lithons_generated into v_caress_count, v_lithons_generated;
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

  v_result := jsonb_build_object('balance', v_balance, 'caress_count', v_caress_count, 'lithons_generated', v_lithons_generated);
  perform private.finish_mutation(v_user_id, p_event_key, 'register_caress', v_result);
  return query select v_balance, v_caress_count, v_lithons_generated;
end;
$$;

create or replace function private.register_cleaning_impl(p_user_rock_id uuid, p_event_key uuid)
returns table(last_cleaned_at timestamptz, cleaning_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
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

  update public.user_rocks ur
  set last_cleaned_at = now()
  where ur.id = p_user_rock_id and ur.user_id = v_user_id and ur.discarded_at is null
  returning ur.last_cleaned_at into v_cleaned_at;
  if not found then
    raise exception 'active_owned_rock_required' using errcode = '42501';
  end if;

  update public.rock_progress rp
  set cleaning_count = rp.cleaning_count + 1,
      interaction_count = rp.interaction_count + 1
  where rp.user_rock_id = p_user_rock_id
  returning rp.cleaning_count into v_cleaning_count;
  if not found then
    raise exception 'rock_progress_missing' using errcode = 'P0001';
  end if;

  v_result := jsonb_build_object('last_cleaned_at', v_cleaned_at, 'cleaning_count', v_cleaning_count);
  perform private.finish_mutation(v_user_id, p_event_key, 'register_cleaning', v_result);
  return query select v_cleaned_at, v_cleaning_count;
end;
$$;

create or replace function private.purchase_accessory_impl(p_accessory_id text, p_event_key uuid)
returns table(balance bigint, accessory_id text, purchased_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_price bigint;
  v_balance bigint;
  v_purchased_at timestamptz;
  v_result jsonb;
begin
  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'purchase_accessory');
  if v_receipt is not null then
    return query select
      (v_receipt->>'balance')::bigint,
      v_receipt->>'accessory_id',
      (v_receipt->>'purchased_at')::timestamptz;
    return;
  end if;

  select a.price_lithons into v_price
  from public.accessories a
  where a.id = p_accessory_id and a.active;
  if not found then
    raise exception 'accessory_unavailable' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.user_accessories ua
    where ua.user_id = v_user_id and ua.accessory_id = p_accessory_id
  ) then
    raise exception 'accessory_already_owned' using errcode = '23505';
  end if;

  select w.balance into v_balance
  from public.wallets w
  where w.user_id = v_user_id
  for update;
  if not found then
    raise exception 'wallet_missing' using errcode = 'P0001';
  end if;
  if v_balance < v_price then
    raise exception 'insufficient_lithons' using errcode = '22003';
  end if;

  insert into public.user_accessories(user_id, accessory_id)
  values (v_user_id, p_accessory_id)
  returning user_accessories.purchased_at into v_purchased_at;

  update public.wallets w
  set balance = w.balance - v_price,
      lifetime_spent = w.lifetime_spent + v_price
  where w.user_id = v_user_id
  returning w.balance into v_balance;

  if v_price > 0 then
    insert into public.lithon_ledger(user_id, delta, reason, event_key, accessory_id)
    values (v_user_id, -v_price, 'accessory_purchase', p_event_key, p_accessory_id);
  end if;

  v_result := jsonb_build_object('balance', v_balance, 'accessory_id', p_accessory_id, 'purchased_at', v_purchased_at);
  perform private.finish_mutation(v_user_id, p_event_key, 'purchase_accessory', v_result);
  return query select v_balance, p_accessory_id, v_purchased_at;
end;
$$;

create or replace function private.discard_active_rock_impl(p_user_rock_id uuid, p_event_key uuid)
returns table(user_rock_id uuid, discarded_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt jsonb;
  v_discarded_at timestamptz;
  v_result jsonb;
begin
  v_receipt := private.claim_mutation(v_user_id, p_event_key, 'discard_active_rock');
  if v_receipt is not null then
    return query select
      (v_receipt->>'user_rock_id')::uuid,
      (v_receipt->>'discarded_at')::timestamptz;
    return;
  end if;

  select ur.discarded_at into v_discarded_at
  from public.user_rocks ur
  where ur.id = p_user_rock_id and ur.user_id = v_user_id
  for update;
  if not found then
    raise exception 'owned_rock_required' using errcode = '42501';
  end if;

  if v_discarded_at is null then
    update public.user_rocks ur
    set discarded_at = now()
    where ur.id = p_user_rock_id
    returning ur.discarded_at into v_discarded_at;

    delete from public.equipped_accessories ea where ea.user_rock_id = p_user_rock_id;
  end if;

  v_result := jsonb_build_object('user_rock_id', p_user_rock_id, 'discarded_at', v_discarded_at);
  perform private.finish_mutation(v_user_id, p_event_key, 'discard_active_rock', v_result);
  return query select p_user_rock_id, v_discarded_at;
end;
$$;

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
  on conflict (user_rock_id, slot)
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

create or replace function public.adopt_rock(p_specimen_id text, p_name text, p_event_key uuid)
returns table(user_rock_id uuid, specimen_id text, rock_name text, adopted_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from private.adopt_rock_impl(p_specimen_id, p_name, p_event_key); $$;

create or replace function public.register_caress(p_user_rock_id uuid, p_event_key uuid)
returns table(balance bigint, caress_count bigint, lithons_generated bigint)
language sql
security invoker
set search_path = ''
as $$ select * from private.register_caress_impl(p_user_rock_id, p_event_key); $$;

create or replace function public.register_cleaning(p_user_rock_id uuid, p_event_key uuid)
returns table(last_cleaned_at timestamptz, cleaning_count bigint)
language sql
security invoker
set search_path = ''
as $$ select * from private.register_cleaning_impl(p_user_rock_id, p_event_key); $$;

create or replace function public.purchase_accessory(p_accessory_id text, p_event_key uuid)
returns table(balance bigint, accessory_id text, purchased_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from private.purchase_accessory_impl(p_accessory_id, p_event_key); $$;

create or replace function public.discard_active_rock(p_user_rock_id uuid, p_event_key uuid)
returns table(user_rock_id uuid, discarded_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from private.discard_active_rock_impl(p_user_rock_id, p_event_key); $$;

create or replace function public.equip_accessory(p_user_rock_id uuid, p_accessory_id text, p_event_key uuid)
returns table(user_rock_id uuid, slot text, accessory_id text, equipped_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from private.equip_accessory_impl(p_user_rock_id, p_accessory_id, p_event_key); $$;

alter table public.profiles enable row level security;
alter table public.rock_catalog enable row level security;
alter table public.user_rocks enable row level security;
alter table public.rock_progress enable row level security;
alter table public.wallets enable row level security;
alter table public.lithon_ledger enable row level security;
alter table public.accessories enable row level security;
alter table public.user_accessories enable row level security;
alter table public.equipped_accessories enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy rock_catalog_select_active on public.rock_catalog
for select to anon, authenticated
using (active);

create policy user_rocks_select_own on public.user_rocks
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy rock_progress_select_own on public.rock_progress
for select to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.user_rocks ur
    where ur.id = rock_progress.user_rock_id and ur.user_id = (select auth.uid())
  )
);

create policy wallets_select_own on public.wallets
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy lithon_ledger_select_own on public.lithon_ledger
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy accessories_select_active on public.accessories
for select to anon, authenticated
using (active);

create policy user_accessories_select_own on public.user_accessories
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy equipped_accessories_select_own on public.equipped_accessories
for select to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.user_rocks ur
    where ur.id = equipped_accessories.user_rock_id and ur.user_id = (select auth.uid())
  )
);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.user_rocks, public.rock_progress, public.wallets, public.lithon_ledger, public.user_accessories, public.equipped_accessories to authenticated;
grant select on public.rock_catalog, public.accessories to anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.adopt_rock_impl(text, text, uuid) to authenticated;
grant execute on function private.register_caress_impl(uuid, uuid) to authenticated;
grant execute on function private.register_cleaning_impl(uuid, uuid) to authenticated;
grant execute on function private.purchase_accessory_impl(text, uuid) to authenticated;
grant execute on function private.discard_active_rock_impl(uuid, uuid) to authenticated;
grant execute on function private.equip_accessory_impl(uuid, text, uuid) to authenticated;

grant execute on function public.adopt_rock(text, text, uuid) to authenticated;
grant execute on function public.register_caress(uuid, uuid) to authenticated;
grant execute on function public.register_cleaning(uuid, uuid) to authenticated;
grant execute on function public.purchase_accessory(text, uuid) to authenticated;
grant execute on function public.discard_active_rock(uuid, uuid) to authenticated;
grant execute on function public.equip_accessory(uuid, text, uuid) to authenticated;
