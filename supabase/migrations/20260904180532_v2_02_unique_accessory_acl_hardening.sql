-- CAILLOU™ V2-02 Lot F: remove the legacy anonymous EXECUTE privilege from the private placement helper.
begin;

revoke all on function private.create_equipped_accessory_impl(uuid, text, uuid, jsonb, jsonb, numeric) from public, anon;
grant execute on function private.create_equipped_accessory_impl(uuid, text, uuid, jsonb, jsonb, numeric) to authenticated, service_role;

commit;
