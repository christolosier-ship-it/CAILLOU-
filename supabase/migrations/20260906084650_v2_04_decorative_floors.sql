-- V2-04: permanent account floors, authoritative commerce, rock-scoped selection.
begin;

create table public.floors (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{0,63}$'),
  name text not null,
  description text not null,
  price_lithons bigint not null check (price_lithons >= 0),
  preview_path text,
  material jsonb not null check (jsonb_typeof(material) = 'object'),
  active boolean not null default true,
  sort_order integer not null default 0,
  provenance jsonb not null default '{}'::jsonb,
  budget jsonb not null default '{}'::jsonb
);
alter table public.floors enable row level security;

create table public.user_floors (
  user_id uuid not null references public.profiles(id) on delete cascade,
  floor_id text not null references public.floors(id) on delete restrict,
  acquired_at timestamptz not null default now(),
  acquisition_source text not null check (acquisition_source in ('purchase', 'free', 'grant')),
  price_paid bigint,
  primary key (user_id, floor_id),
  constraint user_floors_acquisition_shape check (
    (acquisition_source = 'purchase' and price_paid is not null and price_paid > 0)
    or (acquisition_source = 'free' and price_paid is not null and price_paid = 0)
    or (acquisition_source = 'grant' and price_paid is null)
  )
);
alter table public.user_floors enable row level security;
create index user_floors_floor_id_idx on public.user_floors(floor_id);
create policy user_floors_select_own on public.user_floors for select to authenticated
using (user_id = (select auth.uid()));
-- A retired floor remains visible to its owner, so selection and rendering stay valid.
create policy floors_select_catalog on public.floors for select to authenticated
using (active or id in (select floor_id from public.user_floors where user_id = (select auth.uid())));
revoke all on public.floors, public.user_floors from public, anon, authenticated;
grant select on public.floors, public.user_floors to authenticated;
grant select, insert, update, delete on public.floors, public.user_floors to service_role;

-- FLOOR_CATALOG_SEED
insert into public.floors(id,name,description,price_lithons,material,sort_order,provenance,budget)
values ('base','Sol originel','La sobriété minérale des premiers jours.',0,
'{"version":1,"color":"#b9b1a5","roughness":0.96,"metalness":0.02,"repeat":[1,1],"normalScale":0}',0,
'{"source":"CAILLOU — matériau historique V1","license":"project"}', '{"textureCount":0,"bytes":0}');

insert into public.floors(id,name,description,price_lithons,preview_path,material,active,sort_order,provenance,budget) values
('moquette','Moquette','Un accueil feutré, sans obligation de retirer ses chaussures.',60,'/assets/floors/moquette/v1/preview.webp','{"version": 1, "color": "#ffffff", "roughness": 0.95, "metalness": 0, "repeat": [4, 4], "normalScale": 0.22, "colorMap": "/assets/floors/moquette/v1/color.webp", "normalMap": "/assets/floors/moquette/v1/normal.webp", "roughnessMap": "/assets/floors/moquette/v1/roughness.webp"}',true,10,'{"source": "ambientCG", "assetId": "Carpet004", "url": "https://ambientcg.com/view?id=Carpet004", "license": "CC0-1.0", "sourceSha256": "79c639e1096385e5327906c7be9eecab206a3efc45da6fb07993dbf03d77e33f"}','{"textureCount": 3, "bytes": 536744, "files": {"normal.webp": {"bytes": 101144, "sha256": "c9d2bb1c1c0d2e046b790fe9807ec7f6666c5dd613ce7292509a86d36fe9b747", "width": 512, "height": 512}, "preview.webp": {"bytes": 24876, "sha256": "13b7a1634ccc6cac9eb3b4bbfef9aa52a76b8040027db6f8be9ca510144ff9c8", "width": 256, "height": 256}, "color.webp": {"bytes": 399834, "sha256": "8319b65e4f914e3dbf38504ae047cebc9c588e5025f582b0eb27eeabd5410429", "width": 1024, "height": 1024}, "roughness.webp": {"bytes": 10890, "sha256": "64e8877420e94c9a010e8bc6c4760b0d653f585f6051486dd2badc8e4a18bfaf", "width": 512, "height": 512}}}'),
('parquet-chene','Parquet chêne','Des lames chaleureuses pour un résident immobile.',140,'/assets/floors/parquet-chene/v1/preview.webp','{"version": 1, "color": "#ffffff", "roughness": 0.62, "metalness": 0, "repeat": [3, 3], "normalScale": 0.35, "colorMap": "/assets/floors/parquet-chene/v1/color.webp", "normalMap": "/assets/floors/parquet-chene/v1/normal.webp", "roughnessMap": "/assets/floors/parquet-chene/v1/roughness.webp"}',true,20,'{"source": "ambientCG", "assetId": "WoodFloor051", "url": "https://ambientcg.com/view?id=WoodFloor051", "license": "CC0-1.0", "sourceSha256": "3f493484eab1ec5e1c466b90e515003b286fc6d7f84ff8ff6485900bfc26cef5"}','{"textureCount": 3, "bytes": 134022, "files": {"normal.webp": {"bytes": 4274, "sha256": "d318fd85c3ba55a670695c016ce16b6bc81ac60c14fe12b96883190918029d85", "width": 512, "height": 512}, "preview.webp": {"bytes": 6578, "sha256": "4c1bd5d21fef61ee39495551cbb22f51d80180444f52223ad2e673d8109e00e8", "width": 256, "height": 256}, "color.webp": {"bytes": 106092, "sha256": "c47918a76d9835939d7cbe8a87153ef3107230f6114ea0e1125896e5eb4f3ea0", "width": 1024, "height": 1024}, "roughness.webp": {"bytes": 17078, "sha256": "f5684ad410c97e49c27d7ff3fa07a7251a1adc733f1f0c71b370866d3ae6e5ae", "width": 512, "height": 512}}}'),
('beton-cire','Béton ciré','Une surface sobre, lissée avec application.',90,'/assets/floors/beton-cire/v1/preview.webp','{"version": 1, "color": "#ffffff", "roughness": 0.42, "metalness": 0, "repeat": [3, 3], "normalScale": 0.18, "colorMap": "/assets/floors/beton-cire/v1/color.webp", "normalMap": "/assets/floors/beton-cire/v1/normal.webp", "roughnessMap": "/assets/floors/beton-cire/v1/roughness.webp"}',true,30,'{"source": "ambientCG", "assetId": "Concrete033", "url": "https://ambientcg.com/view?id=Concrete033", "license": "CC0-1.0", "sourceSha256": "b1e8b2e6bd2ac02e44081b7351387dda9212d2b8734e0d3d1a30277d9dc0e96e"}','{"textureCount": 3, "bytes": 231008, "files": {"normal.webp": {"bytes": 63030, "sha256": "1a20513f3c5151cb9193240921a5a35e67c6731b7920fa1d9a59bc82937e2f75", "width": 512, "height": 512}, "preview.webp": {"bytes": 3028, "sha256": "bd8f0e3c1103197154e5a7ca16c188f03df096dc82f00f6bac520296bd4bf7a7", "width": 256, "height": 256}, "color.webp": {"bytes": 105874, "sha256": "25bbe5bd8f38382613e25e6ea31fd5ae9e31a67def4bda1466e718c3ec38c509", "width": 1024, "height": 1024}, "roughness.webp": {"bytes": 59076, "sha256": "5bc8ab16ea984fe0734f08819d74e702882bebe24aeca8825f65293abb26f908", "width": 512, "height": 512}}}'),
('terre','Terre','Le retour aux origines, en intérieur.',40,'/assets/floors/terre/v1/preview.webp','{"version": 1, "color": "#ffffff", "roughness": 1, "metalness": 0, "repeat": [4, 4], "normalScale": 0.5, "colorMap": "/assets/floors/terre/v1/color.webp", "normalMap": "/assets/floors/terre/v1/normal.webp", "roughnessMap": "/assets/floors/terre/v1/roughness.webp"}',true,40,'{"source": "ambientCG", "assetId": "Ground048", "url": "https://ambientcg.com/view?id=Ground048", "license": "CC0-1.0", "sourceSha256": "3decfdd20e6c8f8c1ff02840cbd336922fca678e23987111af4bebb0a7a89c96"}','{"textureCount": 3, "bytes": 701694, "files": {"normal.webp": {"bytes": 124766, "sha256": "f0b0c2064387788f9682842b52e139aef46f5ce7abbc99aa9868a84e5a0c79fb", "width": 512, "height": 512}, "preview.webp": {"bytes": 22118, "sha256": "fbcf189d62655cc7490e5a435d53acfb66b0efd6c057356348e042662dc6f1d4", "width": 256, "height": 256}, "color.webp": {"bytes": 500608, "sha256": "59633f07a3b75cf48d5e9a937ba9057d362085db9402f68d786d644c29688630", "width": 1024, "height": 1024}, "roughness.webp": {"bytes": 54202, "sha256": "fa0941ba22a0995c4a722e4658a15d2e6270e77e51110e37b4f95e9bdc3c71e9", "width": 512, "height": 512}}}'),
('carrelage','Carrelage','Des joints réguliers pour une vie sans imprévu.',100,'/assets/floors/carrelage/v1/preview.webp','{"version": 1, "color": "#ffffff", "roughness": 0.55, "metalness": 0, "repeat": [3, 3], "normalScale": 0.35, "colorMap": "/assets/floors/carrelage/v1/color.webp", "normalMap": "/assets/floors/carrelage/v1/normal.webp", "roughnessMap": "/assets/floors/carrelage/v1/roughness.webp"}',true,50,'{"source": "ambientCG", "assetId": "Tiles074", "url": "https://ambientcg.com/view?id=Tiles074", "license": "CC0-1.0", "sourceSha256": "28a40cb36d3c265f17c798c52aa3ea7cdcb8c949b80c49692b0a855e9637c677"}','{"textureCount": 3, "bytes": 175830, "files": {"normal.webp": {"bytes": 1294, "sha256": "cbf28f5f24592c6cfdd3ad189452f03a1328ac59e15d5dbe4a81410503a31143", "width": 512, "height": 512}, "preview.webp": {"bytes": 8908, "sha256": "0c315fb081bcadc9451670a9c72525af80839c4cc62f07eabe181d83df3e0626", "width": 256, "height": 256}, "color.webp": {"bytes": 151024, "sha256": "7cdd24df40adabbfaf219f9d8ba85509d82a2a4e40be79bde9ab825284d601a3", "width": 1024, "height": 1024}, "roughness.webp": {"bytes": 14604, "sha256": "fff8ae0af36551f607325413515c431ce05d63dc2047c37f36d07d321afe889e", "width": 512, "height": 512}}}'),
('herbe','Herbe','Un carré de verdure sans tonte à prévoir.',75,'/assets/floors/herbe/v1/preview.webp','{"version": 1, "color": "#ffffff", "roughness": 1, "metalness": 0, "repeat": [4, 4], "normalScale": 0.6, "colorMap": "/assets/floors/herbe/v1/color.webp", "normalMap": "/assets/floors/herbe/v1/normal.webp", "roughnessMap": "/assets/floors/herbe/v1/roughness.webp"}',true,60,'{"source": "ambientCG", "assetId": "Grass001", "url": "https://ambientcg.com/view?id=Grass001", "license": "CC0-1.0", "sourceSha256": "902f447a64171c8099589642d5bf2d1d6e52c40e94d957eb78eae722084b0cfb"}','{"textureCount": 3, "bytes": 513968, "files": {"normal.webp": {"bytes": 127292, "sha256": "3c7241ce340827998b6511deb328b6638dc6ed357924db6191af643e5d9549e3", "width": 512, "height": 512}, "preview.webp": {"bytes": 15846, "sha256": "e2091237aef88a20e9df4d79897c3dd9742af056d2811d3bf2797de1032eb66d", "width": 256, "height": 256}, "color.webp": {"bytes": 286672, "sha256": "57f201f74390760af7497e5468c787f7e17ba3167a03cd9e6ecb6b69e86e1d90", "width": 1024, "height": 1024}, "roughness.webp": {"bytes": 84158, "sha256": "59e94d179457da57fe97067560a23c043485dd08227938faea48167d5dd9748e", "width": 512, "height": 512}}}'),
('marbre','Marbre','Un standing auquel votre caillou ne s’attendait pas.',200,'/assets/floors/marbre/v1/preview.webp','{"version": 1, "color": "#ffffff", "roughness": 0.3, "metalness": 0, "repeat": [2, 2], "normalScale": 0.12, "colorMap": "/assets/floors/marbre/v1/color.webp", "normalMap": "/assets/floors/marbre/v1/normal.webp", "roughnessMap": "/assets/floors/marbre/v1/roughness.webp"}',true,70,'{"source": "ambientCG", "assetId": "Marble006", "url": "https://ambientcg.com/view?id=Marble006", "license": "CC0-1.0", "sourceSha256": "21328b7123f40fd49842d8f8934048033445ac248ec60fe75ccb5eae3b3ea774"}','{"textureCount": 3, "bytes": 312836, "files": {"normal.webp": {"bytes": 548, "sha256": "f7b568a3c1fd8300775bb782cd7b42e3c3346b15630d8013b7c5f95a7b0074e5", "width": 512, "height": 512}, "preview.webp": {"bytes": 13976, "sha256": "8b72e0d79f5d2d4ff71b99f14d669341c147dfd379dd3483faa4b7f5f885a684", "width": 256, "height": 256}, "color.webp": {"bytes": 278362, "sha256": "05b1f1cb9a7468eeabd1943301fb363cd01c9a248cf8691c37d6b1d59045a953", "width": 1024, "height": 1024}, "roughness.webp": {"bytes": 19950, "sha256": "89d79e5ad00cf721bd1431cca36ab7884508228c0be15189a2f915dca61c105d", "width": 512, "height": 512}}}'),
('neige','Neige','Un hiver permanent, sans baisse de température.',110,'/assets/floors/neige/v1/preview.webp','{"version": 1, "color": "#ffffff", "roughness": 0.95, "metalness": 0, "repeat": [3, 3], "normalScale": 0.35, "colorMap": "/assets/floors/neige/v1/color.webp", "normalMap": "/assets/floors/neige/v1/normal.webp", "roughnessMap": "/assets/floors/neige/v1/roughness.webp"}',true,80,'{"source": "ambientCG", "assetId": "Snow001", "url": "https://ambientcg.com/view?id=Snow001", "license": "CC0-1.0", "sourceSha256": "c07262d38fccf947ca24c960068667750b58aeff25398cacfd997bace7350830"}','{"textureCount": 3, "bytes": 92048, "files": {"normal.webp": {"bytes": 19788, "sha256": "30abe607f0dfaf0d77db88e72fdfe5d4b4f5165b9aa646649685a8253501c8b3", "width": 512, "height": 512}, "preview.webp": {"bytes": 1356, "sha256": "5a9772dfce8584cdf377bd19eac6ba0122a7d190ef4f81d7013a7e9acb86883b", "width": 256, "height": 256}, "color.webp": {"bytes": 20172, "sha256": "779e05a0c82c3d7b9322eb4ead302c0b2056f731cc30c9cdfae90439c66fb03e", "width": 1024, "height": 1024}, "roughness.webp": {"bytes": 50732, "sha256": "7667fe66dc88f8097ffee35f5992830de74ae0ec4b9ea3ab4a367326b1a7e889", "width": 512, "height": 512}}}');

insert into public.user_floors(user_id,floor_id,acquisition_source,price_paid)
select id,'base','free',0 from public.profiles;

create function private.grant_initial_floor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_floors(user_id,floor_id,acquisition_source,price_paid)
  values(new.id,'base','free',0) on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.grant_initial_floor() from public,anon,authenticated;
create trigger profiles_grant_initial_floor after insert on public.profiles
for each row execute function private.grant_initial_floor();

alter table public.user_rocks add column floor_id text not null default 'base';
alter table public.user_rocks add constraint user_rocks_owned_floor_fkey
foreign key (user_id,floor_id) references public.user_floors(user_id,floor_id);
create index user_rocks_owned_floor_idx on public.user_rocks(user_id,floor_id);

alter table private.mutation_receipts drop constraint mutation_receipts_operation;
alter table private.mutation_receipts add constraint mutation_receipts_operation check (operation in (
'adopt_rock','register_caress','register_cleaning','purchase_accessory','discard_active_rock','equip_accessory',
'create_equipped_accessory','remove_equipped_accessory','stabilize_equipped_accessory','purchase_feature_unlock',
'purchase_rock_feature_unlock','stabilize_rock_composition','commit_placement_session','purchase_floor','select_floor'));

create function private.purchase_floor_impl(p_floor_id text,p_event_key uuid)
returns table(balance bigint,floor_id text,acquired_at timestamptz,price_paid bigint)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_receipt jsonb; v_price bigint; v_balance bigint; v_acquired timestamptz;
begin
  if p_floor_id is null then raise exception 'floor_required' using errcode='22004'; end if;
  v_receipt := private.claim_mutation(v_user,p_event_key,'purchase_floor');
  if v_receipt is not null then
    if v_receipt->>'floor_id' is distinct from p_floor_id then
      raise exception 'event_key_payload_mismatch' using errcode='22023';
    end if;
    return query select (v_receipt->>'balance')::bigint,p_floor_id,
      (v_receipt->>'acquired_at')::timestamptz,(v_receipt->>'price_paid')::bigint;
    return;
  end if;
  select f.price_lithons into v_price from public.floors f where f.id=p_floor_id and f.active for share;
  if not found then raise exception 'floor_unavailable' using errcode='22023'; end if;
  select w.balance into v_balance from public.wallets w where w.user_id=v_user for update;
  if not found then raise exception 'wallet_missing'; end if;
  if exists(select 1 from public.user_floors uf where uf.user_id=v_user and uf.floor_id=p_floor_id) then
    raise exception 'floor_already_owned' using errcode='23505';
  end if;
  if v_balance < v_price then raise exception 'insufficient_lithons' using errcode='22003'; end if;
  insert into public.user_floors(user_id,floor_id,acquisition_source,price_paid)
  values(v_user,p_floor_id,case when v_price=0 then 'free' else 'purchase' end,v_price)
  returning user_floors.acquired_at into v_acquired;
  if v_price > 0 then
    update public.wallets w set balance=w.balance-v_price,lifetime_spent=w.lifetime_spent+v_price
    where w.user_id=v_user returning w.balance into v_balance;
    insert into public.lithon_ledger(user_id,delta,reason,event_key,item_kind,item_id)
    values(v_user,-v_price,'item_purchase',p_event_key,'floor',p_floor_id);
  end if;
  perform private.finish_mutation(v_user,p_event_key,'purchase_floor',jsonb_build_object(
    'balance',v_balance,'floor_id',p_floor_id,'acquired_at',v_acquired,'price_paid',v_price));
  return query select v_balance,p_floor_id,v_acquired,v_price;
end;
$$;

create function private.select_floor_impl(p_user_rock_id uuid,p_floor_id text,p_event_key uuid)
returns table(user_rock_id uuid,floor_id text)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_receipt jsonb; v_current text;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select ur.floor_id into v_current from public.user_rocks ur
  where ur.id=p_user_rock_id and ur.user_id=v_user and ur.discarded_at is null for update;
  if not found then raise exception 'active_owned_rock_required' using errcode='42501'; end if;
  v_receipt := private.claim_mutation(v_user,p_event_key,'select_floor');
  if v_receipt is not null then
    if v_receipt->>'floor_id' is distinct from p_floor_id
      or v_receipt->>'user_rock_id' is distinct from p_user_rock_id::text then
      raise exception 'event_key_payload_mismatch' using errcode='22023';
    end if;
    -- Replaying an older selection must not undo a later confirmed selection.
    return query select p_user_rock_id,v_current;
    return;
  end if;
  if not exists(select 1 from public.user_floors uf where uf.user_id=v_user and uf.floor_id=p_floor_id) then
    raise exception 'floor_not_owned' using errcode='42501';
  end if;
  update public.user_rocks ur set floor_id=p_floor_id where ur.id=p_user_rock_id;
  perform private.finish_mutation(v_user,p_event_key,'select_floor',jsonb_build_object(
    'user_rock_id',p_user_rock_id,'floor_id',p_floor_id));
  return query select p_user_rock_id,p_floor_id;
end;
$$;

create function public.purchase_floor(p_floor_id text,p_event_key uuid)
returns table(balance bigint,floor_id text,acquired_at timestamptz,price_paid bigint)
language sql security invoker set search_path = '' as $$
  select * from private.purchase_floor_impl(p_floor_id,p_event_key);
$$;
create function public.select_floor(p_user_rock_id uuid,p_floor_id text,p_event_key uuid)
returns table(user_rock_id uuid,floor_id text)
language sql security invoker set search_path = '' as $$
  select * from private.select_floor_impl(p_user_rock_id,p_floor_id,p_event_key);
$$;
revoke all on function private.purchase_floor_impl(text,uuid),private.select_floor_impl(uuid,text,uuid),
public.purchase_floor(text,uuid),public.select_floor(uuid,text,uuid) from public,anon,authenticated;
-- Invoker wrappers need EXECUTE on their private implementation; private is not an exposed API schema.
grant execute on function private.purchase_floor_impl(text,uuid),private.select_floor_impl(uuid,text,uuid),
public.purchase_floor(text,uuid),public.select_floor(uuid,text,uuid) to authenticated;
commit;
