# V2-03 — Accessoires V2 & pipeline collisions

> **Statut : ✅ TERMINÉE, fusionnée et vérifiée en production le 5 septembre 2026.**
>
> **Dépendances : V2-01 Placement 2.0, V2-02 économie/possessions V2.**
>
> **Décision propriétaire : licences, notices et historisation de provenance des objets sont hors périmètre de V2-03.**

Ce fichier est le compte rendu historique canonique de V2-03.

> **Consolidation documentaire du 9 septembre 2026 :** les anciens rapports séparés des Lots A à G ont été condensés ici afin de conserver un seul fichier V2-03 dans la roadmap active. Leurs versions détaillées restent accessibles dans l'historique Git antérieur à cette consolidation.

## 1. Objectif et résultat

V2-03 devait enrichir le catalogue Accessoires avec les assets disponibles dans `Ressource/`, établir un pipeline reproductible render/preview/collision, respecter l'économie V2-02 et valider le Placement V2-01 sans dégrader le mobile.

La V1 disposait de quatre accessoires. V2-03 ajoute onze références V2 et conserve les quatre références V1, soit **15 accessoires actifs en production** à la clôture.

Décisions finales :

- une référence catalogue = un objet unique ;
- pas de clonage multi-instance ;
- possession durable au compte ;
- un objet placé est indisponible jusqu'à retrait ;
- retrait = objet immédiatement réutilisable ;
- plafond V2.0 = **8 accessoires simultanés** ;
- colliders suffisamment proches de la géométrie visible ;
- animations/interactions métier hors V2.0 ;
- licences, notices et provenance V2 hors périmètre de l'étape.

## 2. Lots exécutés

### Lot A — Audit pipeline ✅

- audit automatisé sous Blender 4.5.13 LTS ;
- 11 sources 3D importables retenues ;
- pivots, textures, matériaux, poids, triangles et familles de colliders identifiés ;
- sources inutiles ou corrompues écartées ;
- aucun changement commercial ni Supabase à ce stade.

### Lot B — Contrat asset V2 ✅

Le catalogue conserve les champs historiques et ajoute :

- `collision` : stratégie de collision et proxy éventuel ;
- `budget` : mesures runtime, dont `runtimeModelBytes` obligatoire pour une entrée active.

Migration : `20260904213106_v2_03_accessory_asset_contract.sql`.

### Lot C — Pipeline collider ✅

Les 11 nouvelles sources utilisent des proxies préparés hors ligne, de type hull, compound ou simplified selon la forme. Le runtime transforme chaque mesh proxy en partie convexe Rapier sans décomposition coûteuse en session.

Garde-fous : **12 parties convexes maximum** et **4096 sommets dédupliqués maximum par partie**.

Total des proxies V2 : **14 308 triangles de collision** pour **1 124 040 octets**.

Migration : `20260904220112_v2_03_proxy_collision_contract.sql`.

### Lot D — Preview et catalogue ✅

- normalisation commune render/collider ;
- simplification render mesurée ;
- textures bornées ;
- GLB autonomes ;
- previews 512×512 ;
- publication dans `public/assets` ;
- manifeste `public/assets/accessories/catalog.json` en `schemaVersion: 2` ;
- 11 références V2 staged dans Supabase avant activation finale.

Sorties : **11 `model.glb` + 11 `collider.glb` + 11 previews**, pour **107 151 triangles render** et **27 069 392 octets de GLB**.

Migration : `20260904225708_v2_03_stage_accessory_catalogue.sql`.

### Lot E — Chargement et disposal ✅

- `AccessoryModel` charge uniquement les instances montées ;
- aucun cache global de scènes GLTF décodées en RAM/GPU ;
- renders libérés à l'unmount/reload via `disposeRockObject` ;
- proxies libérés après extraction des parties convexes ;
- previews Boutique conservées en images DOM ;
- caches Workbox bornés : **24 code / 12 renders / 10 colliders / 48 previews**.

Le scénario Browser `accessory-resources` parcourt les 11 renders et 11 proxies deux fois avec mémoire résiduelle stable.

Validation : **CI #432** et **Browser #104** verts.

### Lot F — Plafond d'objets ✅

Le banc `v2-03-capacity` utilise les vrais `model.glb`, `collider.glb`, `AccessoryModel`, Rapier et les huit V2 les plus lourds.

Palier 8 :

- 72 652 triangles render ;
- 26 169 312 octets de GLB ;
- soak GPU stable à 9 géométries / 27 textures ;
- téléphone/tablette sans croissance mémoire après stabilisation.

Décision : **plafond V2.0 fixé à 8 accessoires simultanés**. Le frontend et `private.create_equipped_accessory_impl` défendent tous deux cette limite. Aucun relèvement vers 10+ sans mesures ultérieures sur appareil réel.

Validation : **CI #434**, **Browser #106** et **Browser #109** verts.

### Lot G — Boutique et Placement ✅

Onze accessoires V2 publiés :

`mask-scan`, `mouse-ears`, `traffic-cone`, `bebe-assets`, `chicken`, `crocodile-dog-toy`, `garden-gnome`, `model`, `poo-scan`, `skull`, `worn-flip-flop`.

Validé : achat unique, état `Possédé`, indisponibilité d'un objet déjà placé, retrait/réutilisation et sélection d'un vrai V2 via `AccessoryModel`.

Le Browser #110 a détecté un défaut du probe de test recouvert par le panneau Placement sur téléphone ; le probe a été corrigé sans modifier la règle métier.

Validation finale : **CI #440** et **Browser regression #112** verts.

## 3. Architecture et contrats livrés

```text
source
  -> préparation asset
  -> GLB runtime
  -> preview
  -> collider/proxy
  -> metadata catalogue
  -> validation budgets
  -> publication statique
  -> activation commerciale Supabase
```

Contrats principaux :

- `AccessoryModel` consomme le GLB sans mutation destructive partagée ;
- proxies V2 utilisés lorsque `geometrySource = proxy` ;
- chaque mesh proxy devient une partie `ConvexHullCollider` ;
- ressources Three.js disposées au retrait/reload ;
- maximum 8 accessoires simultanés ;
- limites d'échelle catalogue/serveur conservées ;
- sélection visuelle indépendante de la simplification collision.

## 4. Supabase et compatibilité V1

`public.accessories` reste la source de vérité commerciale.

À la clôture :

- `collision jsonb not null` et `budget jsonb not null` actifs ;
- `runtimeModelBytes` contrôlé pour les entrées actives ;
- chemins proxy V2 validés ;
- champ legacy `provenance` conservé pour compatibilité V1 ;
- **11 V2 actifs** et **15 accessoires actifs au total** ;
- les quatre accessoires V1 gardent leurs IDs et anciens placements compatibles ;
- RLS/RPC d'achat, possession et placement de V2-02 inchangés.

Migrations repo V2-03 :

1. `20260904213106_v2_03_accessory_asset_contract.sql` ;
2. `20260904220112_v2_03_proxy_collision_contract.sql` ;
3. `20260904225708_v2_03_stage_accessory_catalogue.sql` ;
4. `20260905074500_v2_03_activate_accessory_catalogue.sql`.

Règles de sécurité conservées : prix calculé côté serveur, achat unique, placement uniquement si possédé, impossibilité de placer deux fois une même référence, plafond de huit défendu côté serveur et aucun chemin asset arbitraire fourni par le client.

## 5. PWA et budgets

Politique runtime :

- aucun GLB lourd dans le précache shell ;
- `model.glb` : CacheFirst, 12 entrées max, 30 jours ;
- `collider.glb` : CacheFirst, 10 entrées max, 30 jours ;
- previews : StaleWhileRevalidate, 48 entrées max, 14 jours ;
- code lazy : StaleWhileRevalidate, 24 entrées max, 30 jours ;
- `purgeOnQuotaError` sur les caches runtime ;
- achat jamais simulé offline.

Budgets pipeline :

- `model.glb` <= 5 MiB ;
- texture runtime <= 1024 px par défaut ;
- preview PNG 512×512 <= 2 MiB ;
- `collider.glb` <= 1 MiB ;
- runtime 3D lazy ;
- disposal systématique.

## 6. Tests et validation finale

Couverture V2-03 : parsing `collision` / `budget`, limites d'échelle, disponibilité possédé/placé, construction des colliders, politiques de cache, invariants catalogue/fichiers publics et `MAX_EQUIPPED_ACCESSORIES = 8`.

Browser regression :

- `accessory-resources` : 11 V2 × 2 cycles, disposal + mémoire GPU ;
- `v2-03-capacity` : paliers 1/4/8 + téléphone 8 ;
- `v2-03-commerce` : 11 V2 + achat unique + Possédé + placé indisponible + retrait/réutilisation + tap V2.

Validation finale : **Browser #112 vert** avec toute la suite historique Placement, physique, mémoire, économie, showroom et Bio.

## 7. GitHub / Vercel / production

### GitHub

- PR principale : **#45**, mergée ;
- merge V2-03 : `511b635a0bfb6746444c3494e05b4bc66e3798bb` ;
- CI finale : **#440 verte** ;
- Browser final : **#112 vert**.

### Vercel

Le premier déploiement `main` après la PR #45 a échoué avant build car `scripts/vercel-ignore-build.sh` tentait un `git diff` contre un SHA absent du checkout shallow Vercel.

Correctif isolé dans la **PR #46**, mergée au commit `69eef12d2d049d6443c956c0cfce4f28159513ec`.

Le déploiement production V2-03 a ensuite été vérifié `READY` avant activation commerciale Supabase.

## 8. État final historique

**V2-03 est terminée et en production.**

- 11 ressources V2 publiées ;
- 11 références V2 activées ;
- 15 accessoires actifs au total ;
- plafond V2.0 fixé à 8 ;
- CI et Browser regression verts ;
- incident Vercel shallow Git corrigé ;
- aucune animation, interaction métier, sol, peinture, collection, succès ou duplication d'accessoire ajoutée dans cette étape.

À la clôture historique de V2-03, **V2-04 — Sols & Boutique décorative** était l'étape suivante autorisée.