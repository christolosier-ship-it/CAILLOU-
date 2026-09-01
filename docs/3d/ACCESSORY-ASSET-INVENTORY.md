# Inventaire des ressources accessoires

Cet inventaire est le registre de provenance des ressources accessoires. Le manifeste exécutable est
`scripts/blender/accessory_sources.json`. Une ressource inconnue peut être auditée et convertie
localement, mais elle ne peut entrer dans `public/assets/accessories/catalog.json` que si sa
provenance et sa licence sont vérifiées.

Les trois ressources placées en quarantaine pendant l'étape 10A faute de licence vérifiable ont été
réintégrées pendant 10B après confirmation par le propriétaire du dépôt qu'elles sont sous licence
CC0 1.0. L'état historique de 10A reste documenté dans sa roadmap ; le tableau ci-dessous représente
l'état courant du catalogue publié.

| ID stable | Source | Audit géométrique / runtime | Textures | Provenance / licence | Décision actuelle |
|---|---|---:|---|---|---|
| `monocle` | `model.dae` | 395 triangles source, 665 triangles runtime | Base Color, Metallic, Roughness, Normal, Opacity | Una.K.Carlstrøm, [Monocle](https://sketchfab.com/3d-models/monocle-4f04956ecea24108869f5cbd785fd854), CC BY 4.0 | Publié |
| `bow-tie` | `BowTie.rar` → `model/BowTie.fbx` | 1 036 triangles source/runtime | Base Color, Metallic, Roughness, normal neutre technique | CC0 1.0 confirmé le 2026-09-01 par le propriétaire du dépôt | Publié |
| `round-glasses` | `model 2.dae` | 7 386 triangles source/runtime ; rendu identifié comme lunettes rondes | Jeu PBR complet avec AO/Opacity | CC0 1.0 confirmé le 2026-09-01 par le propriétaire du dépôt | Publié |
| `pedestal-gallery` | `pedestal gallery v2.fbx` | 712 triangles source/runtime | BaseMap, Normal, roughness neutre technique ; MaskMap conservée comme ressource source | CC0 1.0 confirmé le 2026-09-01 par le propriétaire du dépôt | Publié |

## Production publiée

- Blender : version LTS épinglée `4.5.13`, archive officielle vérifiée par SHA-256.
- Runtime : quatre GLB autonomes, textures PBR ramenées à 1K et intégrées.
- Pivot : centre de la bounding box pour les quatre ressources, afin de préparer rotation et corps physique stables.
- Échelle : dimensions normalisées et plages utilisateur enregistrées dans le catalogue pour la future étape de placement.
- Métadonnées physique : convex hull, masse, friction, restitution et damping sont préparés pour 10D, sans activer la simulation pendant 10B.
- Validation : structure GLB, absence de dépendance externe, budgets, attributs, matériaux, previews puis chargement réel Three.js/WebGL en CI.
- Rapport de clôture 10B : `publishedCount = 4`, `quarantinedCount = 0`, `allStandalone = true`, GLB le plus lourd `2.466 MiB`.

## Règle de promotion

Une ressource ne peut être publiée que si le manifeste contient une provenance/licence considérée
vérifiée pour le projet et `provenance.verified = true`. Le pipeline refuse une entrée publiée qui ne
respecte pas ce contrat. Une mise en quarantaine historique n'empêche pas une promotion ultérieure
lorsque l'information de licence manquante est apportée et consignée.
