begin;

insert into public.feature_catalog(id,name,description,price_lithons,active)
values ('rock_paint','Peinture minérale','Couleur et finition réversibles. Autorisation valable pour ce caillou uniquement.',250,true);

create table public.rock_appearance (
  user_rock_id uuid primary key references public.user_rocks(id) on delete cascade,
  version integer not null default 1 check (version = 1),
  paint_mode text not null default 'natural',
  paint_color text,
  paint_finish text not null default 'natural',
  updated_at timestamptz not null default now(),
  constraint rock_appearance_shape check (
    (paint_mode = 'natural' and paint_color is null and paint_finish = 'natural')
    or (paint_mode = 'solid' and paint_color is not null
      and paint_color ~ '^#[0-9a-f]{6}$' and paint_finish in ('matte','satin','glossy'))
  )
);
alter table public.rock_appearance enable row level security;
create policy rock_appearance_select_own on public.rock_appearance
for select to authenticated using (exists (
  select 1 from public.user_rocks r
  where r.id = rock_appearance.user_rock_id and r.user_id = (select auth.uid())
));
revoke all on table public.rock_appearance from public,anon,authenticated,service_role;
grant select on table public.rock_appearance to authenticated;
grant select,insert,update,delete on table public.rock_appearance to service_role;
comment on table public.rock_appearance is 'Versioned non-destructive appearance; API writes only via set_rock_appearance. No source GLB or texture is modified.';

insert into public.rock_appearance(user_rock_id) select id from public.user_rocks;
create function private.initialize_rock_appearance() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.rock_appearance(user_rock_id) values(new.id);
  return new;
end;
$$;
revoke all on function private.initialize_rock_appearance() from public,anon,authenticated,service_role;
create trigger user_rocks_initialize_appearance after insert on public.user_rocks
for each row execute function private.initialize_rock_appearance();

alter table private.mutation_receipts drop constraint mutation_receipts_operation;
alter table private.mutation_receipts add constraint mutation_receipts_operation check (operation in (
'adopt_rock','register_caress','register_cleaning','purchase_accessory','discard_active_rock','equip_accessory',
'create_equipped_accessory','remove_equipped_accessory','stabilize_equipped_accessory','purchase_feature_unlock',
'purchase_rock_feature_unlock','stabilize_rock_composition','commit_placement_session','purchase_floor','select_floor',
'set_rock_appearance'));

create function private.set_rock_appearance_impl(
  p_user_rock_id uuid,p_paint_mode text,p_paint_color text,p_paint_finish text,p_event_key uuid
) returns table(user_rock_id uuid,version integer,paint_mode text,paint_color text,paint_finish text,updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_color text := lower(p_paint_color);
  v_request jsonb;
  v_receipt jsonb;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not coalesce(
    (p_paint_mode='natural' and p_paint_color is null and p_paint_finish='natural')
    or (p_paint_mode='solid' and v_color ~ '^#[0-9a-f]{6}$' and p_paint_finish in ('matte','satin','glossy')),
    false
  ) then raise exception 'paint_values_invalid' using errcode='22023'; end if;
  v_request := jsonb_build_object('rock',p_user_rock_id,'mode',p_paint_mode,'color',v_color,'finish',p_paint_finish);
  v_receipt := private.claim_mutation(v_user_id,p_event_key,'set_rock_appearance');

  perform 1 from public.user_rocks r
  where r.id=p_user_rock_id and r.user_id=v_user_id and r.discarded_at is null for update;
  if not found then raise exception 'active_owned_rock_required' using errcode='42501'; end if;
  perform 1 from public.rock_feature_unlocks u
  where u.user_rock_id=p_user_rock_id and u.feature_id='rock_paint' for share;
  if not found then raise exception 'paint_entitlement_required' using errcode='42501'; end if;

  if v_receipt is not null then
    if v_receipt->'request' is distinct from v_request then
      raise exception 'paint_event_payload_mismatch' using errcode='22023';
    end if;
  else
    update public.rock_appearance a set paint_mode=p_paint_mode,paint_color=v_color,
      paint_finish=p_paint_finish,updated_at=clock_timestamp() where a.user_rock_id=p_user_rock_id;
    if not found then raise exception 'appearance_missing' using errcode='P0001'; end if;
    perform private.finish_mutation(v_user_id,p_event_key,'set_rock_appearance',jsonb_build_object('request',v_request));
  end if;
  -- An old replay acknowledges the operation without reverting a more recent choice.
  return query select a.user_rock_id,a.version,a.paint_mode,a.paint_color,a.paint_finish,a.updated_at
  from public.rock_appearance a where a.user_rock_id=p_user_rock_id;
end;
$$;
create function public.set_rock_appearance(
  p_user_rock_id uuid,p_paint_mode text,p_paint_color text,p_paint_finish text,p_event_key uuid
) returns table(user_rock_id uuid,version integer,paint_mode text,paint_color text,paint_finish text,updated_at timestamptz)
language sql security invoker set search_path = '' as $$
select * from private.set_rock_appearance_impl(p_user_rock_id,p_paint_mode,p_paint_color,p_paint_finish,p_event_key);
$$;
revoke all on function private.set_rock_appearance_impl(uuid,text,text,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.set_rock_appearance(uuid,text,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function private.set_rock_appearance_impl(uuid,text,text,text,uuid) to authenticated;
grant execute on function public.set_rock_appearance(uuid,text,text,text,uuid) to authenticated;
commit;
