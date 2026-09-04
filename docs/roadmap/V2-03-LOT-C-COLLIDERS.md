# V2-03 — Lot C — Pipeline colliders

> **Checkpoint : terminé le 4 septembre 2026.**
>
> Ce lot prépare et raccorde les colliders V2. Il ne publie encore aucun nouvel accessoire dans le catalogue : modèles render, previews et promotion des `collider.glb` vers les chemins publics restent au Lot D.

## 1. Architecture retenue

La V1 conserve son comportement actuel :

- `hull` automatique pour `monocle`, `bow-tie` et `round-glasses` ;
- `cuboid` automatique pour `pedestal-gallery`.

Les nouvelles sources utilisent des colliders préparés hors ligne. Le runtime ne décompose donc jamais un mesh haute définition à chaque session.

Flux V2 :

```text
Ressource/<source>
  -> Blender 4.5.13 LTS headless
  -> normalisation déterministe
  -> 1..N convex hulls
  -> collider.glb
  -> validation parts / vertices / triangles / bytes
  -> metadata collision
  -> AccessoryModel
  -> ConvexHullCollider Rapier par partie
```

`AccessoryModel` conserve la géométrie render pour l'affichage, la sélection et la géométrie de Placement. La collision physique peut être fournie par un proxy distinct.

## 2. Garde-fous runtime

Le chemin manuel refuse un proxy si :

- il ne contient aucune partie exploitable ;
- il dépasse 12 meshes/parties convexes ;
- une partie dépasse 4096 sommets uniques.

Chaque mesh du `collider.glb` devient une seule `ConvexHullCollider`. Les ressources Three.js du GLB proxy sont libérées après extraction des positions : Rapier garde ses données physiques, pas une copie GPU visible du proxy.

Un descripteur invalide reste compatible V1 en retombant sur le collider défini dans `physics`. En revanche une entrée V2 publiée avec `geometrySource = proxy` doit fournir un `proxyPath` valide.

## 3. Normalisation commune

Le générateur de collider applique avant calcul :

1. lecture des vertices monde de la source ;
2. centrage X/Y sur la bounding box ;
3. translation de la base à `Z = 0` ;
4. scale uniforme pour ramener la plus grande dimension à `1`.

**Contrat de handoff Lot D : le GLB render final d'un nouvel objet doit recevoir exactement cette même normalisation avant publication.** Un proxy normalisé ne doit jamais être associé à un render conservé dans ses unités/pivot bruts.

## 4. Stratégies et mesures réelles

Workflow : `V2-03 collider pipeline` #1, Blender 4.5.13 LTS, succès.

| ID technique | Source | Stratégie | Parts | Vertices proxy | Triangles proxy | Poids |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `mask-scan` | `MaskScan.fbx` | hull / proxy | 1 | 594 | 1 184 | 93 004 o |
| `mouse-ears` | `MouseEars.fbx` | compound / proxy | 3 | 267 | 522 | 34 492 o |
| `traffic-cone` | `Traffic_Cone.obj` | compound / proxy | 2 | 468 | 928 | 73 844 o |
| `bebe-assets` | `bebe assets.obj` | compound / proxy | 3 | 811 | 1 610 | 124 608 o |
| `chicken` | `chicken_1.fbx` | simplified / proxy | 4 | 910 | 1 804 | 143 452 o |
| `crocodile-dog-toy` | `crocodile_dog_toy_3d_scan.glb` | compound / proxy | 3 | 674 | 1 336 | 106 308 o |
| `garden-gnome` | `garden_gnome_4k.blend` | compound / proxy | 3 | 626 | 1 240 | 98 656 o |
| `model` | `model.fbx` | simplified / proxy | 4 | 587 | 1 158 | 92 960 o |
| `poo-scan` | `poo_scan.glb` | simplified / proxy | 3 | 1 149 | 2 286 | 180 480 o |
| `skull` | `skull.glb` | hull / proxy | 1 | 804 | 1 604 | 125 908 o |
| `worn-flip-flop` | `worn_flip_flop.glb` | hull / proxy | 1 | 320 | 636 | 50 328 o |

Total de la génération : **14 308 triangles**, **7 210 vertices de proxy** et **1 124 040 octets**. Le plus lourd est `poo-scan`, à 2 286 triangles et 180 480 octets, donc sous les plafonds définis par le plan.

Les fichiers produits sont conservés comme artefact GitHub du workflow pendant le checkpoint. Ils ne sont pas encore promus dans `public/assets/accessories/<id>/collider.glb` : cette promotion doit être atomique avec le render normalisé et les metadata catalogue au Lot D.

## 5. Runtime frontend

Le Lot C ajoute :

- `accessoryCollisionRuntime.ts` : résolution du mode auto/manual ;
- `placementColliderGeometry.ts` : extraction des parties convexes et budgets runtime ;
- support `colliders={false}` dans `PlacementBody` ;
- chargement optionnel du `proxyPath` dans `AccessoryModel` ;
- création explicite des `ConvexHullCollider` ;
- propagation de `collision` et `budget` depuis le catalogue vers les `EquippedAccessoryInstance`.

Cela corrige aussi le trou de raccordement identifié après Lot B : les metadata existaient dans la Boutique mais n'arrivaient pas jusqu'aux instances placées.

## 6. Pipeline Blender

Fichiers :

- `scripts/3d/accessory-collider-plan.json` ;
- `scripts/3d/build_accessory_colliders.py` ;
- `.github/workflows/v2-03-collider-pipeline.yml`.

Le workflow :

- télécharge Blender 4.5.13 LTS depuis la distribution officielle ;
- vérifie le SHA256 ;
- importe les formats `.blend`, `.fbx`, `.glb/.gltf` et `.obj` ;
- génère les hulls déterministes ;
- applique les budgets par asset ;
- échoue si un seul proxy n'est pas générable ;
- produit un rapport JSON/Markdown et les `collider.glb`.

L'audit `V2-03 resource audit` #5 reste vert en parallèle.

## 7. Supabase

Migration appliquée réellement :

`20260904220112_v2_03_proxy_collision_contract`

Elle durcit le champ `collision` :

- `geometrySource = proxy` exige `proxyPath` ;
- `proxyPath` exige `geometrySource = proxy` ;
- le format reste `/assets/accessories/<id>/collider.glb`.

Test transactionnel :

- descriptor compound/proxy sans chemin : rejeté ;
- descriptor compound/proxy valide : accepté ;
- fixtures après rollback : 0 ;
- catalogue actif : toujours 4 accessoires V1.

Aucune possession, aucun prix, aucun placement et aucun RPC d'achat/placement n'a été modifié.

Les advisors ne remontent aucune nouvelle anomalie causée par ce lot. Restent uniquement le warning Auth préexistant sur la protection contre les mots de passe compromis et des index encore non observés en usage.

## 8. GitHub / Browser / Vercel

Le pipeline collider #1 est vert et a généré 11/11 proxies. L'audit source #5 est vert.

Le runtime a été validé par CI après deux corrections de forme révélées par les contrôles stricts : un import type ESLint puis une vérification `noUncheckedIndexedAccess` dans un test. Aucun défaut fonctionnel du pipeline Blender n'a été trouvé.

Browser regression couvre la non-régression des scénarios V1 à ce checkpoint. Les scénarios spécifiques aux nouveaux objets ne peuvent être ajoutés qu'après publication des modèles/previews/catalogue au Lot D/G.

Vercel : aucun déploiement ni Preview consommé pour le Lot C.

## 9. Frontière

**Lot C terminé. Lot D non démarré.**

Le Lot D devra :

- préparer les render GLB avec la même normalisation que les proxies ;
- promouvoir `model.glb` + `collider.glb` + preview dans les chemins publics ;
- renseigner les metadata catalogue et budgets définitifs ;
- valider automatiquement l'existence/cohérence des chemins avant activation.
