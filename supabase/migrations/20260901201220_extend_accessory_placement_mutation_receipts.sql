-- Extend the mutation receipt whitelist for the idempotent 10C create/remove operations.

alter table private.mutation_receipts
  drop constraint if exists mutation_receipts_operation;

alter table private.mutation_receipts
  add constraint mutation_receipts_operation
  check (operation = any (array[
    'adopt_rock'::text,
    'register_caress'::text,
    'register_cleaning'::text,
    'purchase_accessory'::text,
    'discard_active_rock'::text,
    'equip_accessory'::text,
    'create_equipped_accessory'::text,
    'remove_equipped_accessory'::text
  ]));
