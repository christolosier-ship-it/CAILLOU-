# Inventaire des ressources accessoires

Cet inventaire est le registre de provenance de l'étape 10A. Le manifeste exécutable est
`scripts/blender/accessory_sources.json`. Une ressource inconnue peut être auditée et convertie
localement, mais elle ne peut entrer dans `public/assets/accessories/catalog.json` que si sa
provenance et sa licence sont vérifiées.

| ID stable | Source | Audit géométrique | Textures | Provenance / licence | Décision |
|---|---|---:|---|---|---|
| `monocle` | `model.dae` | 395 triangles, 560 sommets importés (205 sommets publiés avant séparation des boucles) | Base Color, Metallic, Roughness, Normal, Opacity | Una.K.Carlstrøm, [Monocle](https://sketchfab.com/3d-models/monocle-4f04956ecea24108869f5cbd785fd854), CC BY 4.0 | Publié |
| `bow-tie` | `BowTie.rar` → `model/BowTie.fbx` | Archive RAR 5, mesh et textures identifiés | Base Color, Metallic, Roughness | Auteur, page source et licence non retrouvés de manière fiable | Quarantaine |
| `unidentified-circle` | `model 2.dae` | Mesh `Circle`, 7 386 triangles, unité source 1 cm | Jeu PBR complet avec AO/Opacity | Objet, auteur, source et licence inconnus | Quarantaine |
| `pedestal-gallery` | `pedestal gallery v2.fbx` | Mesh `pedestal low poly`, 352 triangles | BaseMap, MaskMap, Normal | Licence inconnue ; socle de présentation, pas un accessoire | Quarantaine |

## Production publiée

- Blender : version LTS épinglée `4.5.13`, archive officielle vérifiée par SHA-256.
- Runtime : un GLB autonome par accessoire, textures PBR ramenées à 1K et intégrées.
- Pivot : centre de la bounding box, afin de garder une rotation et un corps physique stables.
- Échelle : plus grande dimension du monocle normalisée à `0.72`, avec plage utilisateur
  `[0.65, 1.35]`.
- Collider 10D : convex hull dynamique simplifié ; masse `0.18`, friction `0.68`, faible rebond.
- Validation : structure GLB, absence de dépendance externe, budget, attributs, matériaux,
  preview puis chargement réel Three.js/WebGL en CI.

## Règle de promotion

Pour sortir une ressource de quarantaine, compléter dans le manifeste l'auteur, la page source,
la licence, le lien de licence et une preuve vérifiable, puis passer `status` à `published`.
Le pipeline refuse une entrée publiée dont `provenance.verified` n'est pas vrai.
