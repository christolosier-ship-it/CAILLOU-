-- CAILLOU™ step 08 caress/Lithon acceptance test.
-- Safe on the target project: fixtures and rewards are rolled back.

begin;

insert into auth.users(id) values
  ('80808080-8080-4808-8808-808080808081'::uuid),
  ('80808080-8080-4808-8808-808080808082'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('80808080-8080-4808-8808-808080808081'::uuid, 'Step08A', 'step08a'),
  ('80808080-8080-4808-8808-808080808082'::uuid, 'Step08B', 'step08b');

insert into public.user_rocks(id, user_id, specimen_id, name) values (
  '81818181-8181-4818-8818-818181818181'::uuid,
  '80808080-8080-4808-8808-808080808081'::uuid,
  'rock-001',
  'Contrat08'
);
insert into public.rock_progress(user_rock_id)
values ('81818181-8181-4818-8818-818181818181'::uuid);

set local role authenticated;
select set_config('request.jwt.claim.sub', '80808080-8080-4808-8808-808080808081', true);

select * from public.register_caress(
  '81818181-8181-4818-8818-818181818181'::uuid,
  '82828282-8282-4828-8828-828282828281'::uuid
);

-- Exact network replay: same receipt, no second reward.
select * from public.register_caress(
  '81818181-8181-4818-8818-818181818181'::uuid,
  '82828282-8282-4828-8828-828282828281'::uuid
);

DO $$
begin
  begin
    perform * from public.register_caress(
      '81818181-8181-4818-8818-818181818181'::uuid,
      '82828282-8282-4828-8828-828282828282'::uuid
    );
    raise exception 'immediate distinct caress unexpectedly accepted';
  exception when others then
    if position('caress_rate_limited' in sqlerrm) = 0 then raise; end if;
  end;
end
$$;

select pg_sleep(0.56);
select * from public.register_caress(
  '81818181-8181-4818-8818-818181818181'::uuid,
  '82828282-8282-4828-8828-828282828284'::uuid
);

select set_config('request.jwt.claim.sub', '80808080-8080-4808-8808-808080808082', true);
DO $$
begin
  begin
    perform * from public.register_caress(
      '81818181-8181-4818-8818-818181818181'::uuid,
      '82828282-8282-4828-8828-828282828283'::uuid
    );
    raise exception 'user B unexpectedly credited user A rock';
  exception when others then
    if position('active_owned_rock_required' in sqlerrm) = 0 then raise; end if;
  end;
end
$$;

reset role;

DO $$
begin
  if (select balance from public.wallets where user_id = '80808080-8080-4808-8808-808080808081'::uuid) <> 2 then
    raise exception 'wallet balance does not match two accepted caresses';
  end if;
  if (select lifetime_earned from public.wallets where user_id = '80808080-8080-4808-8808-808080808081'::uuid) <> 2 then
    raise exception 'lifetime earned does not match two accepted caresses';
  end if;
  if (select caress_count from public.rock_progress where user_rock_id = '81818181-8181-4818-8818-818181818181'::uuid) <> 2 then
    raise exception 'caress stats do not match ledger';
  end if;
  if (select interaction_count from public.rock_progress where user_rock_id = '81818181-8181-4818-8818-818181818181'::uuid) <> 2 then
    raise exception 'interaction stats do not match caresses';
  end if;
  if (select lithons_generated from public.rock_progress where user_rock_id = '81818181-8181-4818-8818-818181818181'::uuid) <> 2 then
    raise exception 'generated Lithons do not match caresses';
  end if;
  if (select count(*) from public.lithon_ledger where user_id = '80808080-8080-4808-8808-808080808081'::uuid and reason = 'caress') <> 2 then
    raise exception 'ledger does not contain exactly two accepted caresses';
  end if;
  if has_function_privilege('anon', 'public.register_caress(uuid,uuid)', 'EXECUTE') then
    raise exception 'anonymous role can execute register_caress';
  end if;
end
$$;

rollback;
