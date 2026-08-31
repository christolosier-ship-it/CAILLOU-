# Étape 05 — Pipeline 3D de production et catalogue

## Prompt d'exécution

Tu travailles sur CAILLOU™ avec le pipeline d'audit Blender déjà existant. Lis l'index roadmap, ce fichier, `WORKFLOW-3D-BLENDER-GITHUB.md` et les trois autres documents normatifs. Inspecte les workflows et artifacts réels avant de modifier quoi que ce soit.

### Objectif

Passer du pipeline d'audit/casting au pipeline de production web : exporter, valider et publier les 20 cailloux LOD2 en GLB autonomes avec métadonnées exploitables par l'application.

### Plugins

- GitHub obligatoire.
- Supabase uniquement si le catalogue final doit y être seedé selon la décision de l'étape 03.
- Vercel pour vérifier la distribution réelle des assets si utile.

### Stratégie imposée

Commencer par une **vertical slice Rock 001 + Rock 002**. Ne lancer l'industrialisation des 20 qu'après validation en vrai renderer web.

### À réaliser

- Figer la version de Blender utilisée pour les exports de production.
- Créer/compléter les scripts d'isolation, normalisation, matériaux et export GLB.
- Préserver UV, base color et normal map des LOD2 ~10k triangles.
- Calibrer roughness sans aspect plastique.
- Produire `rock-001` et `rock-002`, les intégrer au frontend et vérifier rendu/poids/cadrage.
- Après validation, produire les 20 assets finaux avec IDs stables `rock-001` à `rock-020`.
- Générer previews, métadonnées, provenance/licence, triangle count et poids.
- Vérifier qu'aucune source lourde `.blend` n'entre dans le bundle public.
- Créer le catalogue typé consommé par l'application ou les seeds Supabase selon architecture retenue.
- Maintenir un workflow reproductible et déterministe.

### Hors périmètre

- UX finale du showroom.
- Adoption.
- Accessoires 3D complets.

### Critères d'acceptation

- Rock 001/002 validés visuellement dans R3F avant batch complet.
- 20 GLB autonomes, ouvrables et cohérents.
- IDs uniques et stables.
- Textures présentes, aucun lien externe cassé.
- Poids mesuré et acceptable.
- Attribution/licence traçables.
- Workflow reproductible sur GitHub Actions.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Joindre les résultats de validation et signaler tout spécimen nécessitant un traitement exceptionnel.

## État / compte rendu

**Statut : Terminée**

- Date de clôture : 2026-09-01
- PR : #10 fusionnée dans `main`
- Commit de fusion production : `b46cb5bad67cbb1ec35bbd015d8660a43049d79f`
- Blender figé : 4.5.13 LTS, archive officielle vérifiée par SHA-256
- Source 3D : `Rocks - Pack 5` de Loïc Norgeot, licence CC BY 4.0, attribution et provenance conservées dans le rapport de production
- Vertical slice : Rock 001 et Rock 002 validés par contrôle structurel glTF puis par rendu Three.js/WebGL réel avant lancement du batch complet
- Batch production : 20/20 GLB autonomes exportés et validés, IDs stables `rock-001` à `rock-020`
- Géométrie : 10 000 triangles pour chacun des 20 spécimens
- Matériaux : base color + normal map embarquées, roughness calibrée pour conserver un rendu minéral sec sans aspect plastique
- Poids GLB mesuré : moyenne 0,555 MiB, maximum 0,780 MiB
- Previews : 20/20 générées et publiées avec les modèles
- Validation web : chargement réel Three.js/WebGL validé sur les 20 modèles avant publication
- Vercel : déploiement de production `dpl_EZqxcTVh1jwHhkhQY3HPdcaY4BGL` en état `READY`, associé au commit de fusion de la PR #10
- Supabase : `rock_catalog` publié et activé après disponibilité des assets en production ; contrôle final = 20 actifs / 20 prêts, de `rock-001` à `rock-020`, avec `model_path`, `preview_path`, `source_mesh` et `triangle_count` renseignés
- Spécimens nécessitant un traitement exceptionnel : aucun
- Dette bloquante restante sur l'étape 05 : aucune
- Étape suivante recommandée : 06 — Showroom 3D des 20 cailloux
