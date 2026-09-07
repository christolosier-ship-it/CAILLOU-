-- Real RLS/RPC contracts; all fixtures and economic writes roll back.
begin;
insert into auth.users(id) values ('20500000-0000-4000-8000-000000000001'),('20500000-0000-4000-8000-000000000002');
insert into public.profiles(id,username,username_normalized) values
('20500000-0000-4000-8000-000000000001','PaintTestA','painttesta'),('20500000-0000-4000-8000-000000000002','PaintTestB','painttestb');
insert into public.user_rocks(id,user_id,specimen_id,name) values
('20500000-0000-4000-8000-000000000011','20500000-0000-4000-8000-000000000001','rock-016','PaintA'),
('20500000-0000-4000-8000-000000000012','20500000-0000-4000-8000-000000000002','rock-001','PaintB');
update public.wallets set balance=1000,lifetime_earned=1000 where user_id='20500000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','20500000-0000-4000-8000-000000000001',true);
do $$
declare purchased record; replay record; saved record; again record; bad text;
begin
  if (select count(*) from public.rock_appearance)<>1 then raise exception 'appearance RLS leakage'; end if;
  if not exists(select 1 from public.rock_appearance where paint_mode='natural' and paint_color is null and paint_finish='natural' and version=1) then raise exception 'natural default absent'; end if;
  if exists(select 1 from public.rock_feature_unlocks where feature_id='rock_paint') then raise exception 'free paint entitlement created'; end if;
  begin
    update public.rock_appearance set paint_color='#ffffff',paint_mode='solid',paint_finish='matte';
    raise exception 'direct appearance update allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.rock_feature_unlocks(user_rock_id,feature_id,acquisition_source,price_paid) values
    ('20500000-0000-4000-8000-000000000011','rock_paint','purchase',1);
    raise exception 'forged entitlement allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.feature_catalog set price_lithons=1 where id='rock_paint';
    raise exception 'forged price allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_rock_appearance('20500000-0000-4000-8000-000000000011','solid','#ffffff','matte',gen_random_uuid());
    raise exception 'paint without entitlement allowed';
  exception when insufficient_privilege then null; end;
  select * into purchased from public.purchase_rock_feature_unlock('20500000-0000-4000-8000-000000000011','rock_paint','20500000-1000-4000-8000-000000000001');
  select * into replay from public.purchase_rock_feature_unlock('20500000-0000-4000-8000-000000000011','rock_paint','20500000-1000-4000-8000-000000000001');
  if purchased is distinct from replay or purchased.balance<>750 or purchased.price_paid<>250 then raise exception 'purchase server price/replay invalid'; end if;
  if (select count(*) from public.lithon_ledger where feature_id='rock_paint')<>1 then raise exception 'duplicate ledger'; end if;
  begin
    perform public.purchase_rock_feature_unlock('20500000-0000-4000-8000-000000000011','rock_paint',gen_random_uuid());
    raise exception 'duplicate purchase allowed';
  exception when unique_violation then null; end;
  select * into saved from public.set_rock_appearance('20500000-0000-4000-8000-000000000011','solid','#ABCDEF','satin','20500000-1000-4000-8000-000000000002');
  select * into again from public.set_rock_appearance('20500000-0000-4000-8000-000000000011','solid','#abcdef','satin','20500000-1000-4000-8000-000000000002');
  if saved is distinct from again or saved.paint_color<>'#abcdef' then raise exception 'save normalization/replay invalid'; end if;
  begin
    perform public.set_rock_appearance('20500000-0000-4000-8000-000000000011','solid','#ffffff','matte','20500000-1000-4000-8000-000000000002');
    raise exception 'mismatched event payload allowed';
  exception when invalid_parameter_value then null; end;
  foreach bad in array array['red','#fff','#gg0000',' #abcdef','#abcdef00','url(x)',null] loop
    begin
      perform public.set_rock_appearance('20500000-0000-4000-8000-000000000011','solid',bad,'matte',gen_random_uuid());
      raise exception 'invalid color allowed: %',bad;
    exception when invalid_parameter_value then null; end;
  end loop;
  foreach bad in array array['natural','metallic','',null] loop
    begin
      perform public.set_rock_appearance('20500000-0000-4000-8000-000000000011','solid','#abcdef',bad,gen_random_uuid());
      raise exception 'invalid finish allowed';
    exception when invalid_parameter_value then null; end;
  end loop;
  begin
    perform public.set_rock_appearance('20500000-0000-4000-8000-000000000011','natural','#abcdef','natural',gen_random_uuid());
    raise exception 'invalid natural shape allowed';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.set_rock_appearance('20500000-0000-4000-8000-000000000012','solid','#abcdef','glossy',gen_random_uuid());
    raise exception 'other rock changed';
  exception when insufficient_privilege then null; end;
  perform public.set_rock_appearance('20500000-0000-4000-8000-000000000011','natural',null,'natural','20500000-1000-4000-8000-000000000003');
  select * into again from public.set_rock_appearance('20500000-0000-4000-8000-000000000011','solid','#abcdef','satin','20500000-1000-4000-8000-000000000002');
  if again.paint_mode<>'natural' or again.paint_color is not null then raise exception 'stale replay restored old paint'; end if;
end;
$$;
select set_config('request.jwt.claim.sub','20500000-0000-4000-8000-000000000002',true);
do $$ begin
  begin
    perform public.purchase_rock_feature_unlock('20500000-0000-4000-8000-000000000012','rock_paint',gen_random_uuid());
    raise exception 'insufficient balance accepted';
  exception when numeric_value_out_of_range then null; end;
end; $$;
reset role;
-- A future grant is valid without inventing a paid ledger row.
insert into public.rock_feature_unlocks(user_rock_id,feature_id,acquisition_source,price_paid)
values('20500000-0000-4000-8000-000000000012','rock_paint','grant',null);
set local role authenticated;
select * from public.set_rock_appearance('20500000-0000-4000-8000-000000000012','solid','#abcdef','glossy',gen_random_uuid());
do $$ begin
  if exists(select 1 from public.lithon_ledger where feature_id='rock_paint') then raise exception 'grant fabricated paid ledger'; end if;
end; $$;
reset role;
update public.user_rocks set discarded_at=now() where id='20500000-0000-4000-8000-000000000011';
insert into public.user_rocks(id,user_id,specimen_id,name) values
('20500000-0000-4000-8000-000000000013','20500000-0000-4000-8000-000000000001','rock-020','PaintNext');
set local role authenticated;
select set_config('request.jwt.claim.sub','20500000-0000-4000-8000-000000000001',true);
do $$ begin
  if not exists(select 1 from public.rock_appearance where user_rock_id='20500000-0000-4000-8000-000000000013' and paint_mode='natural') then raise exception 'new rock not natural'; end if;
  if exists(select 1 from public.rock_feature_unlocks where user_rock_id='20500000-0000-4000-8000-000000000013') then raise exception 'entitlement transferred'; end if;
  begin
    perform public.set_rock_appearance('20500000-0000-4000-8000-000000000013','solid','#abcdef','matte',gen_random_uuid());
    raise exception 'new rock inherited painting';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_rock_appearance('20500000-0000-4000-8000-000000000011','natural',null,'natural','20500000-1000-4000-8000-000000000003');
    raise exception 'discarded rock replay allowed';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role anon;
do $$ begin
  begin perform * from public.rock_appearance; raise exception 'anon read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.set_rock_appearance('20500000-0000-4000-8000-000000000011','natural',null,'natural',gen_random_uuid()); raise exception 'anon save allowed'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
rollback;
select 'PASS V2-05 appearance, ownership, entitlement, purchase, replay, validation, grant, discard and ACL' as result;
