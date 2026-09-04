-- CAILLOU™ V2-02 lots A/B acceptance test.
-- Run against a disposable/local database or inside a transaction on the target project.
-- The final ROLLBACK must remain in place: no fixture survives this script.

begin;

insert into auth.users(id) values
  ('33333333-3333-4333-8333-333333333333'::uuid),
  ('44444444-4444-4444-8444-444444444444'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('33333333-3333-4333-8333-333333333333'::uuid, 'V2AUser', 'v2auser'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'V2BUser', 'v2buser');

insert into public.user_rocks(id, user_id, specimen_id, name, discarded_at) values
  ('33333333-aaaa-4333-8333-333333333333'::uuid, '33333333-3333-4333-8333-333333333333'::uuid, 'rock-001', 'AuditA', null),
  ('44444444-bbbb-4444-8444-444444444444'::uuid, '44444444-4444-4444-8444-444444444444'::uuid, 'rock-002', 'AuditB', null);

insert into public.rock_feature_unlocks(user_rock_id, feature_id, acquisition_source, price_paid) values
  ('33333333-aaaa-4333-8333-333333333333'::uuid, 'rock_movement', 'purchase', 1000),
  ('44444444-bbbb-4444-8444-444444444444'::uuid, 'rock_movement', 'grant', null);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

do $$
begin
  if (select count(*) from public.rock_feature_unlocks) <> 1 then
    raise exception 'rock_feature_unlocks RLS isolation failed for user A';
  end if;

  if not exists (
    select 1
    from public.rock_feature_unlocks
    where user_rock_id = '33333333-aaaa-4333-8333-333333333333'::uuid
      and acquisition_source = 'purchase'
      and price_paid = 1000
  ) then
    raise exception 'purchase entitlement shape missing';
  end if;

  begin
    insert into public.rock_feature_unlocks(user_rock_id, feature_id, acquisition_source, price_paid)
    values ('33333333-aaaa-4333-8333-333333333333'::uuid, 'rock_movement', 'purchase', 1000);
    raise exception 'authenticated direct insert unexpectedly allowed';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

reset role;

-- Discard is a state transition, not a row deletion: entitlement history must remain.
update public.user_rocks
set discarded_at = now()
where id = '33333333-aaaa-4333-8333-333333333333'::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

do $$
begin
  if (select count(*) from public.rock_feature_unlocks) <> 1 then
    raise exception 'discard should preserve rock feature entitlement history';
  end if;
end
$$;

reset role;
rollback;

select count(*) as rock_feature_unlocks_after_rollback
from public.rock_feature_unlocks;
