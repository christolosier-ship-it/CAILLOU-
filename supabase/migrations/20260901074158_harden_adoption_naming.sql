-- Step 07: keep rock names human-readable at the authoritative database boundary.
-- The adoption RPC already owns the mutation and idempotency contract from step 03.

alter table public.user_rocks
  add constraint user_rocks_name_no_control_characters
  check (name !~ '[[:cntrl:]]');

comment on constraint user_rocks_name_no_control_characters on public.user_rocks is
  'Adopted rock names must not contain control characters. Whitespace normalization remains a client UX concern; trimming and length are already enforced server-side.';
