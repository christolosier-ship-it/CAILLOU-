-- Seed the twenty stable V1 specimen identifiers.
-- They remain inactive until the production GLB pipeline publishes verified assets in step 05.

insert into public.rock_catalog(id, catalog_index, label, active)
values
  ('rock-001', 1, 'Spécimen 01', false),
  ('rock-002', 2, 'Spécimen 02', false),
  ('rock-003', 3, 'Spécimen 03', false),
  ('rock-004', 4, 'Spécimen 04', false),
  ('rock-005', 5, 'Spécimen 05', false),
  ('rock-006', 6, 'Spécimen 06', false),
  ('rock-007', 7, 'Spécimen 07', false),
  ('rock-008', 8, 'Spécimen 08', false),
  ('rock-009', 9, 'Spécimen 09', false),
  ('rock-010', 10, 'Spécimen 10', false),
  ('rock-011', 11, 'Spécimen 11', false),
  ('rock-012', 12, 'Spécimen 12', false),
  ('rock-013', 13, 'Spécimen 13', false),
  ('rock-014', 14, 'Spécimen 14', false),
  ('rock-015', 15, 'Spécimen 15', false),
  ('rock-016', 16, 'Spécimen 16', false),
  ('rock-017', 17, 'Spécimen 17', false),
  ('rock-018', 18, 'Spécimen 18', false),
  ('rock-019', 19, 'Spécimen 19', false),
  ('rock-020', 20, 'Spécimen 20', false)
on conflict (id) do update
set catalog_index = excluded.catalog_index,
    label = excluded.label,
    active = false;
