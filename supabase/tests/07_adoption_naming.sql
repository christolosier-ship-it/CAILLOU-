-- CAILLOU™ step 07 adoption contract acceptance test.
-- Safe on the target project: all fixtures are wrapped in a transaction and rolled back.

begin;

insert into auth.users(id) values
  ('77777777-7777-4777-8777-777777777771'::uuid),
  ('77777777-7777-4777-8777-777777777772'::uuid);

insert into public.profiles(id, username, username_normalized) values
  ('77777777-7777-4777-8777-777777777771'::uuid, 'Step07A', 'step07a'),
  ('77777777-7777-4777-8777-777777777772'::uuid, 'Step07B', 'step07b');

set local role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777771', true);

select * from public.adopt_rock(
  'rock-007',
  'Bernard',
  '70707070-7070-4707-8707-707070707071'::uuid
);

-- Exact network replay: must return the same adoption and create nothing else.
select * from public.adopt_rock(
  'rock-007',
  'Bernard',
  '70707070-7070-4707-8707-707070707071'::uuid
);

DO $$
begin
  if (select count(*) from public.user_rocks) <> 1 then
    raise exception 'adoption replay created a duplicate rock';
  end if;
  if (select count(*) from public.rock_progress) <> 1 then
    raise exception 'adoption replay created duplicate progress';
  end if;
  if not exists (
    select 1 from public.user_rocks
    where specimen_id = 'rock-007' and name = 'Bernard' and discarded_at is null
  ) then
    raise exception 'active adopted rock cannot be restored under RLS';
  end if;

  begin
    perform * from public.adopt_rock(
      'rock-008',
      'Deuxieme',
      '70707070-7070-4707-8707-707070707072'::uuid
    );
    raise exception 'second active rock unexpectedly allowed';
  exception when unique_violation then
    null;
  end;

  begin
    perform * from public.adopt_rock(
      'rock-009',
      E'Mauvais\nNom',
      '70707070-7070-4707-8707-707070707073'::uuid
    );
    raise exception 'control character unexpectedly accepted in rock name';
  exception when check_violation then
    null;
  end;
end
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777772', true);

DO $$
begin
  if exists (select 1 from public.user_rocks) then
    raise exception 'another user can read the adopted rock';
  end if;
end
$$;

reset role;
rollback;

select
  (select count(*) from public.user_rocks) as user_rocks_after_rollback,
  (select count(*) from public.rock_progress) as progress_after_rollback;
