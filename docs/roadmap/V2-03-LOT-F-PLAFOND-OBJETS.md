# V2-03 — Lot F — Mesure du plafond d'objets

> **Statut : TERMINÉ — 5 septembre 2026.**
>
> **Décision : plafond V2.0 maintenu et figé à 8 accessoires simultanés.**
>
> **Validation de référence : CI #434 et Browser regression #106.**

## 1. Objectif

Le Lot F transforme le garde-fou historique de huit accessoires en décision mesurée. L'objectif n'est pas de maximiser artificiellement le nombre d'objets, mais de vérifier que le plafond actuel reste crédible avec les nouveaux assets V2 réels, leurs textures et leurs proxies Rapier.

Le lot mesure donc deux couches complémentaires :

1. le benchmark Placement historique 1/4/8, qui couvre gestes, raycast, frame time et settlement sur téléphone/tablette/desktop ;
2. un nouveau benchmark `v2-03-capacity`, qui charge les V2 les plus lourds réellement publiés et les fait passer par `AccessoryModel`, les `collider.glb` et `PlacementPhysicsWorld`.

## 2. Méthode du banc V2 réel

Nouveaux fichiers :

- `scripts/web/v2-03-capacity-validation.html` ;
- `scripts/web/v2-03-capacity-validation.tsx` ;
- `scripts/web/validate-v2-03-capacity.mjs`.

Le scénario est intégré à `.github/workflows/browser-regression.yml`.

Pour éviter un benchmark trop favorable, les candidats V2 sont triés par `budget.runtimeModelBytes` décroissant. Les paliers utilisent donc les références les plus lourdes disponibles.

Le test :

- désactive le cache HTTP Puppeteer afin de mesurer un chargement froid ;
- monte les vrais `model.glb` ;
- charge les vrais `collider.glb` via le contrat collision d'`AccessoryModel` ;
- utilise le vrai `PlacementPhysicsWorld` et la gravité runtime ;
- mesure le temps jusqu'à ce que toutes les instances soient prêtes ;
- mesure la cadence WebGL au repos ;
- déclenche la stabilisation Rapier réelle ;
- mesure la cadence pendant stabilisation et le temps de settlement ;
- lit `renderer.info.memory` ;
- effectue un soak de 120 frames aux paliers 8 ;
- échoue sur perte de contexte WebGL, erreur navigateur, timeout de chargement/stabilisation ou croissance GPU pendant le soak.

Le renderer CI est Chrome headless avec ANGLE/SwiftShader. Ces temps absolus ne représentent donc pas les FPS d'un iPad ou téléphone réel ; les ratios entre paliers et la stabilité mémoire sont les informations les plus utiles.

## 3. Composition des paliers V2

### 1 objet

- `skull`
- 11 999 triangles render ;
- 4 584 892 octets de `model.glb`.

### 4 objets

- `skull` ;
- `worn-flip-flop` ;
- `garden-gnome` ;
- `mask-scan`.

Total : **36 995 triangles** et **17 152 524 octets** de GLB render.

### 8 objets

- `skull` ;
- `worn-flip-flop` ;
- `garden-gnome` ;
- `mask-scan` ;
- `mouse-ears` ;
- `crocodile-dog-toy` ;
- `poo-scan` ;
- `model`.

Total : **72 652 triangles** et **26 169 312 octets** de GLB render.

Ce palier n'est donc pas construit avec huit objets légers : il concentre les huit V2 les plus lourds par poids runtime.

## 4. Mesures V2 réelles — Browser #106

| Scénario | Chargement froid | Idle moyen | Idle p95 | Settlement | Settlement moyen | Settlement p95 | GPU stabilisé |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| tablette 1 V2 | 1 742 ms | 80,2 ms | 88,8 ms | 3 881 ms | 78,9 ms | 83,4 ms | 2 géom. / 5 tex. |
| tablette 4 V2 | 2 466 ms | 132,2 ms | 142,9 ms | 4 105 ms | 127,9 ms | 150,0 ms | 5 géom. / 14 tex. |
| tablette 8 V2 | 3 919 ms | 211,2 ms | 260,4 ms | 4 529 ms | 195,9 ms | 216,7 ms | 9 géom. / 27 tex. |
| téléphone 8 V2 | 2 445 ms | 99,6 ms | 104,9 ms | 3 975 ms | 123,8 ms | 133,4 ms | 9 géom. / 27 tex. |

Croissance tablette mesurée :

- idle 4 / 1 : **1,65×** ;
- idle 8 / 1 : **2,63×** ;
- stabilisation 8 / 1 : **2,48×** ;
- chargement froid 8 / 1 : **2,25×**.

Les garde-fous du banc sont respectés :

- chargement complet inférieur à 45 s ;
- settlement inférieur à 6,5 s ;
- croissance idle 4/1 inférieure à 2,5× ;
- croissance idle 8/1 inférieure à 3,5× ;
- croissance settlement 8/1 inférieure à 4,5×.

## 5. Soak GPU à 8 objets

### Tablette 8 V2

Avant soak :

- 9 géométries ;
- 27 textures ;
- 10 appels de rendu ;
- 84 663 triangles rendus.

Après 120 frames : **exactement les mêmes valeurs**.

### Téléphone 8 V2

Avant soak :

- 9 géométries ;
- 27 textures ;
- 10 appels de rendu ;
- 84 663 triangles rendus.

Après 120 frames : **exactement les mêmes valeurs**.

Le banc conclut `stable = true` sur les deux scénarios. Il n'y a pas de croissance GPU active au plafond retenu.

Le scénario Lot E `accessory-resources` reste également vert dans Browser #106 : deux passages des 11 V2 reviennent à **0 géométrie / 1 texture** après disposal.

## 6. Garde-fou Placement historique

La suite historique reste verte avec les scénarios 1/4/8 et téléphone/tablette/desktop :

- tablette 1 : raycast 19,2 ms, geste médian 168,0 ms, settlement 4 331 ms ;
- tablette 4 : raycast 21,6 ms, geste médian 216,0 ms, settlement 3 758 ms ;
- tablette 8 : raycast 20,7 ms, geste médian 355,2 ms, settlement 4 257 ms ;
- téléphone 8 : raycast 21,5 ms, geste médian 174,1 ms, settlement 4 065 ms ;
- desktop 8 : raycast 21,2 ms, geste médian 401,3 ms, settlement 4 944 ms.

Ratios historiques sur tablette :

- frame 4/1 : **1,33×** ;
- frame 8/1 : **1,78×** ;
- diagnostic geste 4/1 : **1,29×** ;
- diagnostic geste 8/1 : **2,11×**.

Les valeurs de frame SwiftShader sont uniquement diagnostiques ; les seuils de non-régression portent surtout sur la croissance relative, les gestes, le raycast et le settlement.

## 7. Collision et stabilisation

Le coût collision n'est pas isolé comme un micro-benchmark Rapier par step, car `PlacementPhysicsWorld` utilise la boucle physique indépendante du runtime. Le lot couvre néanmoins la collision par deux voies :

- le scénario historique `placement-collision` reste vert ;
- le nouveau banc charge les proxies V2 réels puis exige la stabilisation de 1, 4 et 8 corps via Rapier.

À huit V2 lourds, la stabilisation tablette reste à **4 529 ms**, sous le garde-fou de 6,5 s.

## 8. Décision de plafond

Le plafond final V2.0 est **8 accessoires simultanés**.

Cette valeur est désormais mesurée et non provisoire :

- le frontend conserve `MAX_EQUIPPED_ACCESSORIES = 8` ;
- un test unitaire verrouille cette valeur ;
- le RPC Supabase `private.create_equipped_accessory_impl` refuse déjà côté serveur tout neuvième placement avec `accessory_instance_limit_reached` ;
- huit V2 lourds passent les contrôles de chargement, Rapier et stabilité GPU.

Le plafond n'est pas relevé au-delà de huit. GitHub Actions ne peut pas certifier :

- la chauffe d'un téléphone ou iPad réel ;
- le throttling thermique après une session longue ;
- la qualité tactile réelle sur matériel ;
- les variations WebGL propres aux appareils mobiles.

La roadmap demandait de n'augmenter le plafond que si les données le justifiaient. Ces données justifient **8**, mais pas 10 ou 11. Un relèvement futur devra être précédé d'un essai matériel ciblé.

## 9. Supabase

Aucune migration n'est nécessaire au Lot F.

État vérifié :

- 4 accessoires V1 actifs ;
- 11 références V2 staged ;
- 0 référence V2 active.

Le garde-fou serveur `>= 8` est déjà présent dans `private.create_equipped_accessory_impl`.

## 10. Vercel

Aucune Preview n'est nécessaire pour fixer ce plafond. Les mesures sont réalisées sur GitHub Actions, sur les assets runtime exacts de la branche.

**0 déploiement Vercel supplémentaire** est consommé au Lot F.

## 11. Contrôles

Tête benchmark : `b2b39c50e2377572b90ab3733d161097ee3cef73`.

- CI #434 : **vert** ;
- Browser regression #106 : **vert** ;
- `v2-03-capacity` : **vert** ;
- `placement-performance` : **vert** ;
- `placement-collision` : **vert** ;
- `accessory-resources` : **vert**.

Artefact Browser #106 : `caillou-browser-regression-33951372724`, digest `sha256:42d22fcedbdf0db13e7d18d8af7d780ee35a82f28227f053b6730817957a5918`.

## 12. Frontière de scope

Le Lot F ne rend aucune référence V2 achetable et ne change aucune possession. Les 11 références restent staged et inactives jusqu'au Lot G.

**Lot F terminé. Lot G non démarré. PR #45 draft, ouverte et non mergée.**
