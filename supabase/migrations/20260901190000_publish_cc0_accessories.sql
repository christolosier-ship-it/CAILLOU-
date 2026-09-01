-- Step 10B follow-up: publish the three CC0 resources previously held in quarantine.
begin;

insert into public.accessories (
  id,
  name,
  description,
  price_lithons,
  asset_path,
  preview_path,
  slot,
  active,
  sort_order,
  triangle_count,
  dimensions,
  scale_min,
  scale_max,
  physics,
  provenance
)
values
  (
    'bow-tie',
    'Nœud papillon',
    'Un nœud papillon net et graphique pour donner au caillou une allure très cérémonie.',
    70,
    '/assets/accessories/bow-tie/model.glb',
    '/assets/accessory-previews/bow-tie.png',
    'tenue',
    true,
    20,
    1036,
    '[0.72, 0.245974, 0.504354]'::jsonb,
    0.650,
    1.350,
    '{
      "enabled": true,
      "collider": "convexHull",
      "mass": 0.16,
      "friction": 0.72,
      "restitution": 0.04,
      "linearDamping": 1.7,
      "angularDamping": 2.2
    }'::jsonb,
    '{
      "title": "Bow Tie",
      "author": "Auteur non identifié",
      "license": "CC0 1.0",
      "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
      "verified": true,
      "evidence": "Licence CC0 confirmée par le propriétaire du dépôt le 2026-09-01 pour la ressource fournie."
    }'::jsonb
  ),
  (
    'round-glasses',
    'Lunettes rondes',
    'De fines lunettes rondes dorées avec branches brunes, pour un caillou à l’allure délicieusement studieuse.',
    80,
    '/assets/accessories/round-glasses/model.glb',
    '/assets/accessory-previews/round-glasses.png',
    'visage',
    true,
    30,
    7386,
    '[0.78, 0.656022, 0.307408]'::jsonb,
    0.600,
    1.500,
    '{
      "enabled": true,
      "collider": "convexHull",
      "mass": 0.22,
      "friction": 0.66,
      "restitution": 0.05,
      "linearDamping": 1.6,
      "angularDamping": 2.0
    }'::jsonb,
    '{
      "title": "Round glasses / model 2",
      "author": "Auteur non identifié",
      "license": "CC0 1.0",
      "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
      "verified": true,
      "evidence": "Licence CC0 confirmée par le propriétaire du dépôt le 2026-09-01 pour la ressource fournie ; le rendu de production identifie sans ambiguïté une paire de lunettes rondes."
    }'::jsonb
  ),
  (
    'pedestal-gallery',
    'Socle galerie',
    'Un petit socle d’exposition en pierre claire qui transforme le caillou en pièce de galerie.',
    120,
    '/assets/accessories/pedestal-gallery/model.glb',
    '/assets/accessory-previews/pedestal-gallery.png',
    'socle',
    true,
    40,
    712,
    '[0.587645, 0.589615, 1.35]'::jsonb,
    0.700,
    1.500,
    '{
      "enabled": true,
      "collider": "convexHull",
      "mass": 1.8,
      "friction": 0.82,
      "restitution": 0.02,
      "linearDamping": 2.2,
      "angularDamping": 2.6
    }'::jsonb,
    '{
      "title": "Pedestal Gallery v2",
      "author": "Auteur non identifié",
      "license": "CC0 1.0",
      "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
      "verified": true,
      "evidence": "Licence CC0 confirmée par le propriétaire du dépôt le 2026-09-01 pour la ressource fournie."
    }'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_lithons = excluded.price_lithons,
  asset_path = excluded.asset_path,
  preview_path = excluded.preview_path,
  slot = excluded.slot,
  active = excluded.active,
  sort_order = excluded.sort_order,
  triangle_count = excluded.triangle_count,
  dimensions = excluded.dimensions,
  scale_min = excluded.scale_min,
  scale_max = excluded.scale_max,
  physics = excluded.physics,
  provenance = excluded.provenance;

commit;
