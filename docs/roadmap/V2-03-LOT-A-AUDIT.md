# V2-03 — Lot A — Audit pipeline accessoires

> **Statut : terminé le 4 septembre 2026.**
>
> Audit exécuté sur la branche `feat/v2-03-accessories-v2` avec Blender **4.5.13 LTS** headless, épinglé et vérifié par checksum dans GitHub Actions.
>
> Les licences, notices et l'historisation de provenance sont volontairement hors périmètre sur décision du propriétaire du projet.

## 1. État de départ

Le runtime V1 publie quatre accessoires : `monocle`, `bow-tie`, `round-glasses` et `pedestal-gallery`.

Leur catalogue runtime se situe dans `public/assets/accessories/catalog.json`. Supabase contient les mêmes quatre références dans `public.accessories`.

Le système de collision actuel construit une géométrie de placement depuis les sommets du mesh de rendu puis utilise Rapier avec `hull`, `cuboid` ou `ball`. Cette stratégie reste acceptable pour les petits assets V1, mais ne doit pas être appliquée aveuglément aux nouveaux scans ou modèles très détaillés.

## 2. Inventaire des sources 3D

| Source | Format | Poids source | Triangles | Dimensions source | Pivot | Matériaux | Stratégie collider pressentie | Décision Lot A |
|---|---:|---:|---:|---|---|---:|---|---|
| `MaskScan.fbx` | FBX | 0,39 MiB | 4 934 | 0,182 × 0,093 × 0,210 | décalé | 1 | convex hull candidat | conserver |
| `MouseEars.fbx` | FBX | 0,46 MiB | 2 260 | 0,455 × 0,192 × 0,530 | décalé | 1 | convex hull candidat | conserver |
| `Traffic_Cone.obj` | OBJ | 1,79 MiB | 30 760 | 0,755 × 0,755 × 1,188 | base-centre | 0 | compound convex candidat | conserver |
| `bebe assets.obj` | OBJ | 0,88 MiB | 10 108 | 50,583 × 50,583 × 120,649 | décalé | 0 | compound convex candidat | conserver, normaliser fortement |
| `chicken_1.fbx` | FBX | 16,13 MiB | 131 706 | 1,806 × 2,807 × 3,583 | décalé | 1 | proxy simplifié | conserver, optimiser |
| `crocodile_dog_toy_3d_scan.glb` | GLB | 5,00 MiB | 32 684 | 0,168 × 0,548 × 0,160 | décalé | 1 | convex hull candidat | conserver |
| `garden_gnome_4k.blend` | BLEND | 0,95 MiB | 7 869 | 1,110 × 0,683 × 1,953 | base-centre | 1 | convex hull candidat | conserver |
| `model.fbx` | FBX | 5,79 MiB | 177 112 | 0,913 × 2,099 × 0,963 | décalé | 1 | proxy simplifié | conserver, optimiser |
| `poo_scan.glb` | GLB | 2,70 MiB | 65 476 | 1,482 × 1,554 × 0,992 | décalé | 1 | proxy simplifié | conserver, optimiser |
| `skull.glb` | GLB | 12,07 MiB | 18 646 | 0,173 × 0,196 × 0,185 | décalé | 4 | convex hull candidat | conserver |
| `worn_flip_flop.glb` | GLB | 3,37 MiB | 18 276 | 0,260 × 0,709 × 0,098 | décalé | 1 | convex hull candidat | conserver |

Aucun des onze modèles n'est corrompu ni intrinsèquement hors pipeline. Les modèles lourds restent traitables par optimisation hors ligne et collider dédié, donc ils ne sont pas supprimés.

## 3. Textures et matériaux

Points à traiter au Lot B :

- `MouseEars.fbx` référence une albedo 2048² et trois maps jusqu'à 4096² : réduire les maps 4K pour respecter le budget mobile par défaut ;
- `garden_gnome_4k.blend` référence trois textures 4096² mais les cherche sous `Ressource/textures/`, alors que les fichiers sont actuellement à la racine de `Ressource/` : relier/repacker avant export ;
- `MaskScan.fbx` référence `low_n.png` 2048² ; `low_t.png` est une texture 8192² de 24,04 MiB et devra être redimensionnée/reliée seulement si elle est réellement utile au rendu final ;
- `chicken_1.fbx` référence `Image001.jpg`, absent du dépôt. `LowPolyChicken1_1.png` est présent mais n'est pas lié dans le FBX : association à confirmer avant préparation ;
- `model.fbx` référence `tex_u1_v1_diffuse.jpg` et `tex_u1_v1_normal.jpg`, tous deux en 2048² ;
- `Traffic_Cone.obj` et `bebe assets.obj` n'importent aucun matériau exploitable dans Blender : leur rendu devra être contrôlé avant publication.

## 4. Origine, échelle et géométrie

Seuls `Traffic_Cone.obj` et `garden_gnome_4k.blend` arrivent déjà avec un pivot proche de la base-centre.

Les neuf autres modèles ont un pivot décalé. Le Lot B devra appliquer transforms, échelle et pivot de manière déterministe avant export GLB.

`bebe assets.obj` utilise des unités source très grandes. C'est un problème de normalisation, pas un motif de rejet.

## 5. Collision pressentie

Le Lot A ne publie aucun collider, mais fixe les familles à tester :

- **convex hull candidats** : MaskScan, MouseEars, crocodile dog toy, garden gnome, skull, worn flip-flop ;
- **compound convex candidats** : Traffic Cone, `bebe assets.obj` ;
- **proxy simplifié obligatoire à évaluer** : chicken, `model.fbx`, poo scan.

Les meshes de rendu haute définition ne devront pas servir directement de collider si un proxy plus simple donne un contact visuel équivalent.

## 6. Nettoyage effectué

Deux fichiers ont été supprimés de `Ressource/` :

- `sketchfab.zbrush` : fichier vide, 0 octet, inutilisable ;
- `tex_u1_v1_diffuse.jpeg` : doublon binaire exact de `tex_u1_v1_diffuse.jpg`. La variante `.jpg` est conservée car c'est celle référencée par `model.fbx`.

Les fichiers non reliés de façon certaine à un modèle n'ont pas été supprimés lorsqu'ils pouvaient encore servir pendant la préparation du Lot B.

## 7. Automatisation ajoutée

- `scripts/3d/audit_accessory_sources.py` inspecte les formats BLEND/FBX/GLB/GLTF/OBJ, triangles, sommets, dimensions, pivot, matériaux, textures, armatures/actions, doublons et stratégie collider indicative ;
- `.github/workflows/v2-03-resource-audit.yml` exécute cet audit avec Blender 4.5.13 LTS et publie un artefact JSON/Markdown ;
- le workflow est limité à la branche V2-03 et aux changements `Ressource/**`, `scripts/3d/**` ou au workflow lui-même.

Cette automatisation constitue le garde-fou d'ingestion pour les lots suivants sans transformer le Lot A en pipeline de production complet.

## 8. Plateformes

### Supabase

Projet contrôlé : `zibhzhpvtiplbkhioqco`, état `ACTIVE_HEALTHY`.

`public.accessories` possède déjà les champs nécessaires au catalogue V1 : identité, textes, prix, chemins asset/preview, slot, activation/tri, triangle count, dimensions, limites de scale et physique. Le Lot A n'a besoin d'aucune migration et n'effectue aucune écriture en base.

### Vercel

Le Lot A ne modifie aucun fichier runtime. `scripts/vercel-ignore-build.sh` ne déclenche un build que pour les chemins runtime explicitement listés ; `Ressource/`, `docs/`, `.github/` et `scripts/3d/` restent hors déclenchement. Aucune Preview Vercel n'est nécessaire pour ce lot.

## 9. Sortie Lot A

- 11 modèles 3D exploitables conservés ;
- 3 modèles classés « optimisation obligatoire » pour le budget géométrique ;
- 2 fichiers inutiles supprimés ;
- pivots, textures, matériaux et risques collider identifiés ;
- pipeline d'audit Blender reproductible installé ;
- Supabase audité sans migration ;
- aucun changement runtime/catalogue ;
- **Lot B non démarré**.
