# V2-03 — Accessoires V2 & pipeline collisions

> **Statut : ✅ TERMINÉE, fusionnée et vérifiée en production le 5 septembre 2026.**
>
> **Date : 5 septembre 2026.**
>
> **Dépendances : V2-01 Placement 2.0, V2-02 économie/possessions V2.**
>
> **Décision propriétaire : licences, notices et historisation de provenance des objets sont hors périmètre de V2-03.**

Ce fichier est le compte rendu historique de V2-03. Les Lots A à G sont terminés.

## 1. Prompt d'exécution

V2-03 devait enrichir le catalogue Accessoires avec les assets réellement disponibles dans `Ressource/`, établir un pipeline reproductible render/preview/collision, respecter l'économie V2-02 et valider le comportement Placement V2-01 sans dégrader le mobile.

GitHub était obligatoire. Supabase était la source de vérité commerciale et économique. Vercel ne devait être utilisé qu'au moment où une validation distante apportait une preuve réelle.

## 2. Contexte réel

La V1 disposait de quatre accessoires. Le schéma `accessories` portait déjà l'identité, le nom, le prix, les chemins asset/preview, la catégorie, les triangles, dimensions, limites d'échelle et paramètres physiques.

V2-01 avait établi une manipulation commune du caillou et des accessoires. V2-02 imposait qu'une référence catalogue représente un objet unique, achetable une seule fois et plaçable une seule fois simultanément.

V2-03 ajoute onze références V2 et conserve les quatre références V1, soit **15 accessoires actifs en production** à la clôture.

## 3. Décisions métier actées

- une référence catalogue = un objet unique ;
- pas de clonage multi-instance ;
- possession durable au compte ;
- un objet placé est indisponible jusqu'à retrait ;
- retirer l'objet le rend immédiatement réutilisable ;
- plafond final V2.0 = **8 accessoires simultanés** ;
- collision suffisamment proche de la géométrie visible pour éviter les contacts à distance ;
- licences, notices et provenance V2 hors périmètre ;
- accessoires animés/interactifs hors V2.0.

## 4. Objectif utilisateur

Enrichir la Boutique avec un catalogue d'objets plus intéressant tout en garantissant que chaque nouvel objet :

- possède un modèle runtime et une preview propres ;
- se charge uniquement lorsque nécessaire ;
- se sélectionne et se manipule correctement ;
- entre en contact avec le caillou, les autres objets et le sol via un collider crédible ;
- respecte des budgets mesurés ;
- ne provoque pas de fuite GPU lors des cycles ajout/retrait ;
- reste reproductible par le pipeline 3D.

## 5. Périmètre exécuté

### Lot A — Audit pipeline ✅ TERMINÉ

- audit Blender 4.5.13 LTS automatisé ;
- 11 sources 3D importables retenues ;
- pivots, textures, matériaux, poids, triangles et familles de colliders identifiés ;
- sources inutiles/corrompues écartées ;
- aucun changement commercial ni Supabase.

Rapport : `docs/roadmap/V2-03-LOT-A-AUDIT.md`.

### Lot B — Contrat d'un asset accessoire V2 ✅ TERMINÉ

Le contrat catalogue conserve les champs historiques et ajoute deux objets JSONB dédiés :

- `collision` : stratégie de collision et éventuel proxy ;
- `budget` : mesures runtime, dont `runtimeModelBytes` obligatoire pour une entrée active.

Migration : `20260904213106_v2_03_accessory_asset_contract.sql`.

Rapport : `docs/roadmap/V2-03-LOT-B-CONTRAT-ASSET.md`.

### Lot C — Pipeline collider ✅ TERMINÉ

Les 11 nouvelles sources utilisent des proxies préparés hors ligne : hull, compound ou simplified selon la forme. Le runtime transforme chaque mesh proxy en partie convexe Rapier sans décomposition coûteuse en session.

Garde-fous runtime :

- maximum 12 parties convexes ;
- maximum 4096 sommets dédupliqués par partie.

Les 11 proxies représentent 14 308 triangles de collision pour 1 124 040 octets au total.

Migration : `20260904220112_v2_03_proxy_collision_contract.sql`.

Rapport : `docs/roadmap/V2-03-LOT-C-COLLIDERS.md`.

### Lot D — Pipeline preview/catalogue ✅ TERMINÉ

- normalisation commune render/collider ;
- simplification render mesurée ;
- textures bornées ;
- GLB autonomes ;
- previews 512×512 ;
- publication automatique dans `public/assets` ;
- manifeste `public/assets/accessories/catalog.json` en `schemaVersion: 2` ;
- 11 références V2 staged dans Supabase avec `active=false` jusqu'à la publication du Lot G.

Sorties V2 : 11 `model.glb`, 11 `collider.glb`, 11 previews. Total render : 107 151 triangles et 27 069 392 octets de GLB.

Migration : `20260904225708_v2_03_stage_accessory_catalogue.sql`.

Rapport : `docs/roadmap/V2-03-LOT-D-PREVIEW-CATALOGUE.md`.

### Lot E — Chargement et disposal ✅ TERMINÉ

- `AccessoryModel` charge uniquement les instances montées ;
- aucun cache global de scènes GLTF décodées en RAM/GPU ;
- renders libérés à l'unmount/reload via `disposeRockObject` ;
- proxies libérés immédiatement après extraction des parties convexes ;
- previews Boutique conservées en images DOM ;
- caches Workbox bornés séparément : **24 code / 12 renders / 10 colliders / 48 previews**.

Browser `accessory-resources` parcourt les 11 renders et 11 proxies deux fois et termine avec mémoire résiduelle stable.

CI #432 et Browser #104 verts.

Rapport : `docs/roadmap/V2-03-LOT-E-CHARGEMENT-DISPOSAL.md`.

### Lot F — Mesure du plafond d'objets ✅ TERMINÉ

Le banc `v2-03-capacity` utilise les vrais `model.glb`, `collider.glb`, `AccessoryModel`, Rapier et les huit V2 les plus lourds.

Palier 8 :

- 72 652 triangles render ;
- 26 169 312 octets de GLB ;
- soak GPU stable à 9 géométries / 27 textures ;
- mesures téléphone/tablette sans croissance mémoire après stabilisation.

Décision : **plafond V2.0 maintenu et figé à 8 accessoires simultanés**. Aucun relèvement vers 10+ sans preuve ultérieure sur appareil réel, notamment chauffe et qualité tactile.

Le frontend et `private.create_equipped_accessory_impl` défendent tous deux cette limite.

CI #434, Browser #106 et tête documentaire Browser #109 verts.

Rapport : `docs/roadmap/V2-03-LOT-F-PLAFOND-OBJETS.md`.

### Lot G — Boutique/Placement ✅ TERMINÉ

Les onze V2 publiés sont :

`mask-scan`, `mouse-ears`, `traffic-cone`, `bebe-assets`, `chicken`, `crocodile-dog-toy`, `garden-gnome`, `model`, `poo-scan`, `skull`, `worn-flip-flop`.

Le Lot G valide :

- achat unique ;
- état `Possédé` ;
- objet déjà placé non ajoutable ;
- retrait = objet réutilisable ;
- tap/sélection d'un vrai V2 via `AccessoryModel` ;
- modèle économique V2-02 inchangé.

Le Browser #110 a détecté uniquement un défaut du probe de test, recouvert par le panneau Placement sur téléphone. Le probe a été corrigé sans assouplir le comportement métier.

**CI #440 et Browser regression #112 sont verts**, avec la preuve : `V2-03 Lot G commerce PASS: 11 V2 + achat unique + Possédé + placé indisponible + retrait réutilisable + tap V2`.

Rapport : `docs/roadmap/V2-03-LOT-G-BOUTIQUE-PLACEMENT.md`.

## 6. Hors périmètre

- animations GLB ;
- interactions métier ;
- sols ;
- peinture ;
- collections V2.1 ;
- succès ;
- duplication d'un accessoire ;
- changement du modèle d'entitlement V2-02 ;
- licences, notices tierces et historisation de provenance V2.

## 7. Architecture livrée

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

La préparation coûteuse est effectuée hors ligne. Le runtime ne décode que les instances réellement montées et ne conserve pas de cache global de scènes GPU.

## 8. Contrats frontend / 3D / physique

- `AccessoryModel` consomme le GLB sans mutation destructive partagée ;
- Placement consomme une géométrie/collider stable ;
- les V2 utilisent leurs proxies préparés lorsque `geometrySource = proxy` ;
- chaque mesh proxy devient une partie `ConvexHullCollider` ;
- garde-fou 12 parties / 4096 sommets dédupliqués par partie ;
- resources Three.js disposées au retrait/reload ;
- maximum 8 accessoires simultanés ;
- scale limits catalogue/serveur conservées ;
- sélection visuelle indépendante de la simplification collision.

## 9. Contrats Supabase

`public.accessories` reste la source de vérité commerciale.

À la clôture :

- `collision jsonb not null` et `budget jsonb not null` sont actifs ;
- `runtimeModelBytes` est contrôlé pour les entrées actives ;
- les chemins proxy V2 sont validés ;
- le champ legacy `provenance` reste uniquement pour compatibilité V1 ;
- les 11 V2 sont `active=true` ;
- le rôle `anon` voit **15 accessoires actifs dont 11 V2**.

Les RLS/RPC d'achat, possession et placement de V2-02 restent inchangés.

## 10. Migrations / compatibilité V1

Migrations V2-03 :

1. `20260904213106_v2_03_accessory_asset_contract.sql` ;
2. `20260904220112_v2_03_proxy_collision_contract.sql` ;
3. `20260904225708_v2_03_stage_accessory_catalogue.sql` ;
4. `20260905074500_v2_03_activate_accessory_catalogue.sql`.

La migration d'activation a été appliquée en production Supabase sous le nom `v2_03_activate_accessory_catalogue` après vérification Vercel.

Les quatre accessoires V1 restent actifs, leurs IDs sont inchangés et leurs anciens placements restent compatibles.

## 11. RLS / RPC / idempotence / sécurité

- prix déterminé côté serveur ;
- achat unique ;
- placement uniquement si possédé ;
- impossible de placer deux fois une même référence ;
- maximum huit placements défendu côté serveur ;
- aucun chemin asset arbitraire injecté par le client ;
- activation V2 effectuée uniquement après disponibilité des binaires production.

## 12. Offline / PWA / réconciliation

- aucun GLB lourd dans le précache shell ;
- render `model.glb` : CacheFirst, 12 entrées max, 30 jours ;
- proxy `collider.glb` : CacheFirst, 10 entrées max, 30 jours ;
- previews : StaleWhileRevalidate, 48 entrées max, 14 jours ;
- code lazy : StaleWhileRevalidate, 24 entrées max, 30 jours ;
- `purgeOnQuotaError` sur les caches runtime ;
- achat jamais simulé offline.

## 13. Performance et budgets

Budgets pipeline :

- `model.glb` <= 5 MiB ;
- texture runtime <= 1024 px par défaut ;
- preview PNG 512×512 <= 2 MiB ;
- `collider.glb` <= 1 MiB ;
- runtime 3D lazy ;
- disposal systématique ;
- collider simplifié sans sacrifier le contact crédible.

Le Lot F confirme que huit V2 lourds restent sous le plafond retenu et que la mémoire GPU ne croît pas pendant le soak.

## 14. UX téléphone / tablette / desktop

Les tests couvrent téléphone et tablette pour le plafond 8, ainsi que le parcours Placement et les gestes unifiés. Les mesures headless ne sont pas assimilées à une certification thermique matérielle ; cette réserve concerne uniquement un éventuel relèvement futur du plafond.

## 15. Tests unitaires

La couverture V2-03 comprend :

- parsing `collision` / `budget` ;
- scale limits ;
- règles de disponibilité possédé/placé ;
- construction et garde-fous colliders ;
- politiques de cache ;
- invariants catalogue et fichiers publics ;
- plafond `MAX_EQUIPPED_ACCESSORIES = 8`.

## 16. Browser regression

Scénarios ajoutés ou étendus :

- `accessory-resources` : 11 V2 × 2 cycles, disposal + mémoire GPU ;
- `v2-03-capacity` : paliers V2 1/4/8 + téléphone 8 ;
- `v2-03-commerce` : 11 V2 + achat unique + Possédé + indisponibilité placé + retrait/réutilisation + tap V2.

Validation finale V2-03 : **Browser #112 vert** en plus de toute la suite historique Placement, physique, mémoire, économie, showroom et Bio.

## 17. GitHub / Supabase / Vercel

### GitHub

- PR principale V2-03 : **#45**, mergée ;
- merge V2-03 : `511b635a0bfb6746444c3494e05b4bc66e3798bb` ;
- CI #440 verte ;
- Browser #112 vert.

### Vercel

Le premier déploiement `main` après la PR #45 a échoué avant build à cause de `scripts/vercel-ignore-build.sh`, qui tentait un `git diff` contre un SHA absent du checkout shallow Vercel.

Le correctif a été isolé dans la **PR #46**, puis mergé au commit `69eef12d2d049d6443c956c0cfce4f28159513ec`.

Le déploiement production final `dpl_DZjm8xWdR7Z9nAFvGpxnSf9TCfjz` est **READY**. Le manifeste V2, un `model.glb`, un `collider.glb` et une preview V2 ont été vérifiés depuis `caillou-sigma.vercel.app` avant activation Supabase.

### Supabase

La publication commerciale a été déclenchée seulement après le READY Vercel.

État vérifié après migration :

- **15 actifs au total** ;
- **11 V2 actifs** ;
- **0 V2 staged** ;
- `anon` voit **15 actifs / 11 V2**.

## 18. Critères d'acceptation

- [x] catalogue enrichi avec uniquement des assets techniquement validés ;
- [x] chaque V2 possède preview et collider préparé ;
- [x] contacts/collisions validés par le pipeline et Browser regression ;
- [x] objets uniques respectés ;
- [x] anciens accessoires conservés ;
- [x] budgets mesurés ;
- [x] plafond d'objets mesuré et fixé à 8 ;
- [x] cache/disposal bornés ;
- [x] CI + Browser regression verts ;
- [x] production Vercel vérifiée après merge ;
- [x] 11 V2 activés et visibles via Supabase.

## 19. Interdictions anti-scope-creep

V2-03 n'ajoute ni animation, interaction métier, sol, peinture, collection thématique, succès, duplication d'accessoire ni boutique parallèle.

## 20. État / compte rendu final

**Statut global : ✅ V2-03 TERMINÉE ET EN PRODUCTION.**

- Lots A à G terminés ;
- PR #45 mergée ;
- incident de déploiement shallow Git corrigé dans la PR #46 ;
- production Vercel READY ;
- 11 ressources V2 publiées ;
- 11 références V2 activées dans Supabase ;
- 15 accessoires actifs au total ;
- plafond V2.0 fixé à 8 ;
- CI et Browser regression verts ;
- rapports Lots A à G conservés comme historique.

**V2-04 — Sols & Boutique décorative est la prochaine étape autorisée, dans une nouvelle branche et une nouvelle PR.**