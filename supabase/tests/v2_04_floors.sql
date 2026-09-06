-- Run on the migrated schema. Every fixture and wallet/ledger mutation rolls back.
begin;
insert into auth.users(id) values ('20400000-0000-4000-8000-000000000001'),('20400000-0000-4000-8000-000000000002');
insert into public.profiles(id,username,username_normalized) values
('20400000-0000-4000-8000-000000000001','FloorTestA','floortesta'),('20400000-0000-4000-8000-000000000002','FloorTestB','floortestb');
insert into public.user_rocks(id,user_id,specimen_id,name) values
('20400000-0000-4000-8000-000000000011','20400000-0000-4000-8000-000000000001','rock-016','SolA'),
('20400000-0000-4000-8000-000000000012','20400000-0000-4000-8000-000000000002','rock-016','SolB');
insert into public.floors(id,name,description,price_lithons,material,active) values
('test-free','Free','Fixture',0,'{}',true),('test-inactive','Inactive','Fixture',10,'{}',false);
update public.wallets set balance=1000,lifetime_earned=1000 where user_id='20400000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','20400000-0000-4000-8000-000000000001',true);
do $$
declare receipt record; replay record;
begin
  if (select count(*) from public.floors where id not like 'test-%') <> 9 then raise exception 'catalog missing floors'; end if;
  if not exists(select 1 from public.user_floors where floor_id='base') then raise exception 'new account base missing'; end if;
  if exists(select 1 from public.user_floors where user_id='20400000-0000-4000-8000-000000000002') then raise exception 'ownership leaked'; end if;
  begin
    insert into public.user_floors(user_id,floor_id,acquisition_source,price_paid) values
    ('20400000-0000-4000-8000-000000000001','marbre','purchase',1);
    raise exception 'forged ownership allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.floors set price_lithons=1 where id='marbre';
    raise exception 'forged price allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.user_rocks set floor_id='marbre' where id='20400000-0000-4000-8000-000000000011';
    raise exception 'direct selection allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.select_floor('20400000-0000-4000-8000-000000000011','marbre','20400000-1000-4000-8000-000000000001');
    raise exception 'unowned selection allowed';
  exception when insufficient_privilege then null; end;
  select * into receipt from public.purchase_floor('parquet-chene','20400000-1000-4000-8000-000000000002');
  if receipt.balance<>860 or receipt.price_paid<>140 then raise exception 'server price incorrect'; end if;
  select * into replay from public.purchase_floor('parquet-chene','20400000-1000-4000-8000-000000000002');
  if replay is distinct from receipt then raise exception 'replay differs'; end if;
  begin
    perform public.purchase_floor('marbre','20400000-1000-4000-8000-000000000002');
    raise exception 'event payload reuse allowed';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.purchase_floor('parquet-chene','20400000-1000-4000-8000-000000000003');
    raise exception 'double purchase allowed';
  exception when unique_violation then null; end;
  perform public.purchase_floor('test-free','20400000-1000-4000-8000-000000000004');
  if (select count(*) from public.lithon_ledger where item_kind='floor')<>1 then raise exception 'ledger incorrect/free purchase charged'; end if;
  if (select balance from public.wallets)<>860 then raise exception 'wallet charged twice'; end if;
  if not exists(select 1 from public.user_floors where floor_id='test-free' and acquisition_source='free' and price_paid=0) then raise exception 'free provenance missing'; end if;
  begin
    perform public.purchase_floor('test-inactive','20400000-1000-4000-8000-000000000005');
    raise exception 'inactive item sold';
  exception when invalid_parameter_value then null; end;
  perform public.select_floor('20400000-0000-4000-8000-000000000011','parquet-chene','20400000-1000-4000-8000-000000000006');
  if (select floor_id from public.user_rocks)<>'parquet-chene' then raise exception 'selection not persisted'; end if;
  perform public.select_floor('20400000-0000-4000-8000-000000000011','base','20400000-1000-4000-8000-000000000007');
  perform public.select_floor('20400000-0000-4000-8000-000000000011','parquet-chene','20400000-1000-4000-8000-000000000006');
  if (select floor_id from public.user_rocks)<>'base' then raise exception 'old replay overwrote new selection'; end if;
  begin
    perform public.select_floor('20400000-0000-4000-8000-000000000012','parquet-chene','20400000-1000-4000-8000-000000000008');
    raise exception 'other rock changed';
  exception when insufficient_privilege then null; end;
end;
$$;
select set_config('request.jwt.claim.sub','20400000-0000-4000-8000-000000000002',true);
do $$
begin
  begin
    perform public.purchase_floor('marbre','20400000-1000-4000-8000-000000000009');
    raise exception 'purchase without balance allowed';
  exception when numeric_value_out_of_range then null; end;
end;
$$;
reset role;
-- A future server grant requires no fabricated purchase and no ledger entry.
insert into public.user_floors(user_id,floor_id,acquisition_source,price_paid)
values('20400000-0000-4000-8000-000000000001','marbre','grant',null);
update public.floors set active=false where id='parquet-chene';
set local role authenticated;
select set_config('request.jwt.claim.sub','20400000-0000-4000-8000-000000000001',true);
do $$
begin
  if not exists(select 1 from public.floors where id='parquet-chene') then raise exception 'retired owned floor hidden'; end if;
  perform public.discard_active_rock('20400000-0000-4000-8000-000000000011','20400000-1000-4000-8000-000000000010');
  if not exists(select 1 from public.user_floors where floor_id='parquet-chene') then raise exception 'discard removed possession'; end if;
end;
$$;
reset role;
insert into public.user_rocks(id,user_id,specimen_id,name) values
('20400000-0000-4000-8000-000000000013','20400000-0000-4000-8000-000000000001','rock-016','SolSuivant');
set local role authenticated;
select set_config('request.jwt.claim.sub','20400000-0000-4000-8000-000000000001',true);
do $$
begin
  perform public.select_floor('20400000-0000-4000-8000-000000000013','parquet-chene','20400000-1000-4000-8000-000000000011');
  if not exists(select 1 from public.user_rocks where id='20400000-0000-4000-8000-000000000013' and floor_id='parquet-chene') then raise exception 'possession not reusable'; end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin perform public.purchase_floor('marbre','20400000-1000-4000-8000-000000000012');
    raise exception 'anon purchase allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.user_floors;
    raise exception 'anon ownership readable'; exception when insufficient_privilege then null; end;
end;
$$;
reset role;
rollback;
select 'PASS: V2-04 catalogue, ACL/RLS, purchases, replay, selections, free/grant, discard and reuse' as result,
(select count(*) from auth.users where id in ('20400000-0000-4000-8000-000000000001','20400000-0000-4000-8000-000000000002')) as fixtures_remaining;
