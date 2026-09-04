create table public.rock_feature_unlocks (
  user_rock_id uuid not null references public.user_rocks(id) on delete cascade,
  feature_id text not null references public.feature_catalog(id) on delete restrict,
  acquired_at timestamptz not null default now(),
  acquisition_source text not null,
  price_paid bigint,
  primary key (user_rock_id, feature_id),
  constraint rock_feature_unlocks_acquisition_source_check
    check (acquisition_source in ('purchase', 'grant')),
  constraint rock_feature_unlocks_price_paid_nonnegative
    check (price_paid is null or price_paid >= 0),
  constraint rock_feature_unlocks_acquisition_shape_check
    check (
      (acquisition_source = 'purchase' and price_paid is not null)
      or
      (acquisition_source = 'grant' and price_paid is null)
    )
);

comment on table public.rock_feature_unlocks is
  'Canonical per-rock feature entitlements. Discarding a rock preserves these rows; account deletion may cascade through user_rocks.';
comment on column public.rock_feature_unlocks.acquisition_source is
  'Entitlement provenance: purchase now, grant reserved for a future achievement/grant system.';
comment on column public.rock_feature_unlocks.price_paid is
  'Authoritative server price for purchases; null for grant entitlements.';

create index rock_feature_unlocks_feature_id_idx
  on public.rock_feature_unlocks(feature_id);

alter table public.rock_feature_unlocks enable row level security;

create policy rock_feature_unlocks_select_own
on public.rock_feature_unlocks
for select
to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.user_rocks ur
    where ur.id = rock_feature_unlocks.user_rock_id
      and ur.user_id = (select auth.uid())
  )
);

revoke all on table public.rock_feature_unlocks from public, anon, authenticated, service_role;
grant select on table public.rock_feature_unlocks to authenticated;
grant select, insert, update, delete on table public.rock_feature_unlocks to service_role;
