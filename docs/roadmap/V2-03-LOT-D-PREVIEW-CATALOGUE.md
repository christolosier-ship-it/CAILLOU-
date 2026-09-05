# V2-03 — Lot D — Pipeline preview / catalogue

> **Statut : TERMINÉ — 5 septembre 2026.**
>
> Ce checkpoint prépare les 11 nouvelles références V2 sans les activer commercialement. Le Lot E n'est pas démarré.

## 1. Chaîne de production retenue

Le Lot D complète le pipeline du Lot C avec une production déterministe du render runtime et des previews :

```text
Ressource/
  -> Blender 4.5.13 LTS épinglé + checksum
  -> normalisation source commune (centre X/Y, base Z=0, dimension max=1)
  -> simplification du render seulement
  -> textures bornées
  -> model.glb autonome
  -> collider.glb du Lot C
  -> preview PNG 512x512
  -> mesures/budgets
  -> publication GitHub uniquement après validation
```

Fichiers principaux :

- `scripts/3d/accessory-runtime-plan.json` : budgets et cibles de triangles ;
- `scripts/3d/build_accessory_runtime.py` : conversion/normalisation/export/preview ;
- `scripts/3d/accessory-catalog-metadata.json` : noms, descriptions, prix, catégories, scales et physique ;
- `.github/workflows/v2-03-runtime-assets.yml` : build reproductible et promotion des sorties validées ;
- `public/assets/accessories/catalog.json` : manifeste technique schemaVersion 2 ;
- `scripts/release/validate-v1-release.mjs` : validation release étendue aux 15 accessoires.

## 2. Publication runtime

Le workflow `V2-03 runtime asset pipeline` #4 a terminé avec succès et a publié automatiquement :

- 11 `model.glb` ;
- 11 `collider.glb` ;
- 11 previews PNG 512x512.

Commit de promotion automatique : `9fe21babfe13bd7e0e0fe6d4a0a158d192060d79`.

Les GLB exportés sont autonomes : aucune dépendance externe n'est autorisée par le pipeline.

## 3. Mesures render finales

| ID | Triangles runtime | model.glb | Texture max | Stratégie collision |
| --- | ---: | ---: | ---: | --- |
| `mask-scan` | 4 998 | 4 146 248 o | 1024 | hull / proxy |
| `mouse-ears` | 2 500 | 3 325 904 o | 1024 | compound / proxy |
| `traffic-cone` | 11 999 | 328 692 o | n/a | compound / proxy |
| `bebe-assets` | 10 500 | 257 436 o | n/a | compound / proxy |
| `chicken` | 12 000 | 313 952 o | 1024 | simplified / proxy |
| `crocodile-dog-toy` | 9 158 | 2 569 464 o | 512 | compound / proxy |
| `garden-gnome` | 7 999 | 4 169 300 o | 1024 | compound / proxy |
| `model` | 12 000 | 664 392 o | 1024 | simplified / proxy |
| `poo-scan` | 11 999 | 2 457 028 o | 1024 | simplified / proxy |
| `skull` | 11 999 | 4 584 892 o | 1024 | hull / proxy |
| `worn-flip-flop` | 11 999 | 4 252 084 o | 1024 | hull / proxy |

Total des 11 renders : **107 151 triangles** et **27 069 392 octets**. Le plus gros GLB est `skull` à 4 584 892 octets, donc sous le garde-fou de 5 MiB.

Les 11 previews pèsent ensemble environ 1,45 MiB. Le lot de colliders reste celui validé au Lot C : 1 124 040 octets au total.

Le crocodile dépassait initialement 5 MiB avec sa texture à 1024 px. Le pipeline a donc conservé sa géométrie mais ramené uniquement sa texture runtime à 512 px ; son GLB final passe à 2 569 464 octets.

## 4. Cadrage preview

Les previews utilisent un cadrage orthographique commun, fond transparent, éclairage key/fill/rim et une résolution 512x512. Elles ont été inspectées à partir de l'artefact GitHub avant publication. L'inspection a confirmé l'identité visuelle des 11 objets, notamment `model` comme appareil photo vintage et `bebe-assets` comme tétine.

## 5. Manifeste et validations automatiques

`public/assets/accessories/catalog.json` passe en `schemaVersion: 2` et contient les 4 V1 historiques plus les 11 V2 préparés.

Pour chaque référence, le validateur contrôle notamment :

- ID unique et chemins canoniques ;
- présence de `model.glb` et de la preview ;
- présence du `collider.glb` lorsque `geometrySource = proxy` ;
- taille du modèle <= 5 MiB ;
- `budget.runtimeModelBytes` égal à la taille exacte du fichier ;
- texture runtime <= 1024 px ;
- preview non vide et <= 2 MiB ;
- collider non vide et <= 1 MiB ;
- triangles, dimensions, scales, physique et stratégie collision valides ;
- exactement 11 références V2 à proxy.

Le validateur V2 ne crée aucune nouvelle exigence de provenance/licence. Les champs historiques des quatre V1 restent présents dans leur manifeste existant, sans devenir un contrat des nouveaux objets.

## 6. Supabase

Migration appliquée : `20260904225708_v2_03_stage_accessory_catalogue.sql`.

Les 11 lignes V2 sont enregistrées avec leurs metadata finales mais **`active = false`**. Vérification après migration :

- catalogue actif : 4 références V1 ;
- V2 staged : 11 ;
- V2 actives : 0 ;
- possessions V2 : 0 ;
- placements V2 : 0 ;
- RLS catalogue inchangée : `accessories_select_active`, `SELECT`, rôles `anon/authenticated`, condition `active`.

Cette séparation est volontaire : Lot D prépare le catalogue technique ; l'activation commerciale et les scénarios Boutique/Placement restent au Lot G.

## 7. Vercel

Aucune Preview manuelle n'est nécessaire à ce checkpoint. Les previews ont été inspectées directement depuis l'artefact de build et les chemins publics sont validés dans GitHub/CI. La branche V2-03 reste en dehors des branches de Preview autorisées par `vercel.json`, ce qui évite de consommer le quota Vercel sans bénéfice supplémentaire.

## 8. Frontière du lot

Le Lot D est terminé lorsque le checkpoint CI + Browser de la PR est vert. Les assets sont présents dans la branche et les metadata Supabase sont staged, mais aucune nouvelle référence n'est encore visible pour les utilisateurs.

Ne pas démarrer le Lot E dans ce checkpoint. Ne pas merger la PR #45.
