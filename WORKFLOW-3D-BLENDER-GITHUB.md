# CAILLOU™ — Workflow 3D Blender + GitHub

> **Statut : transition post-V1.**  
> **V1 figée : `v1.0.0`.**  
> **Prochaine évolution du pipeline : étape `V2-03 — Nouveaux accessoires`.**

## 1. Rôle de ce document

Ce document décrit la situation active du pipeline 3D après clôture de CAILLOU™ V1 et fixe les garde-fous à respecter lors de sa reconstruction pour V2.

Le pipeline de production V1 complet est volontairement retiré du `HEAD` après publication de `v1.0.0` afin de ne plus conserver dans la branche active les sources Blender, DAE, FBX, archives et textures lourdes déjà converties.

L'état exact permettant d'auditer l'historique V1 reste disponible dans :

- le tag Git `v1.0.0` ;
- `docs/roadmap/archive/v1/` ;
- `docs/roadmap/archive/v1/references/WORKFLOW-3D-BLENDER-GITHUB.md` ;
- `docs/roadmap/archive/v1/references/ACCESSORY-ASSET-INVENTORY.md`.

La suppression des sources du `HEAD` ne réécrit pas l'historique Git et ne modifie pas la release V1.

## 2. État runtime actuel

Les assets réellement distribués par l'application restent versionnés sous :

```text
public/assets/rocks/
public/assets/rock-previews/
public/assets/accessories/
public/assets/accessory-previews/
```

Ils sont autonomes et ne dépendent pas des anciens fichiers contenus dans `Ressource/` au runtime.

Les catalogues publiés restent les sources de vérité techniques pour les assets livrés :

```text
public/assets/rocks/catalog.json
public/assets/accessories/catalog.json
```

Les obligations d'attribution et de licence restent consignées dans `THIRD-PARTY-NOTICES.md`.

## 3. Dossier `Ressource/`

Le dépôt conserve :

```text
Ressource/.gitkeep
```

Le dossier est donc volontairement vide entre deux opérations d'ingestion.

Il ne doit plus servir de stockage permanent de sources 3D lourdes après leur conversion et leur validation.

## 4. Pipelines V1 retirés du HEAD

Les anciens workflows batch V1 dépendaient directement des sources présentes dans `Ressource/` :

- audit Blender des vingt cailloux ;
- reproduction des vingt GLB cailloux ;
- reproduction des quatre accessoires V1.

Ils sont retirés de la branche active avec leurs scripts source-dépendants afin de ne pas conserver de workflows qui échoueraient systématiquement après vidage de `Ressource/`.

Leur version exacte reste accessible dans le tag `v1.0.0`.

## 5. Principe cible V2

L'étape `V2-03` devra définir un pipeline **incrémental** pour l'ajout de nouveaux accessoires, plutôt qu'un pipeline qui exige de reconstruire tout le catalogue historique depuis toutes les sources V1.

Le flux cible à étudier est :

```text
nouvelle source temporaire dans Ressource/
        ↓
contrôle provenance + licence
        ↓
Blender headless épinglé
        ↓
normalisation / optimisation
        ↓
export GLB autonome
        ↓
validation structure + budget
        ↓
validation réelle Three.js / WebGL
        ↓
preview
        ↓
publication catalogue + asset runtime
        ↓
retrait de la source temporaire de Ressource/
```

Cette cible n'est pas encore implémentée. Elle devra être cadrée et testée pendant V2-03.

## 6. Garde-fous obligatoires pour V2

Le futur pipeline devra conserver au minimum les règles suivantes :

- version Blender explicitement épinglée ;
- provenance et licence vérifiées avant publication ;
- identifiant d'asset stable ;
- GLB autonome sans texture ni buffer externe ;
- matériaux compatibles glTF / Three.js ;
- géométrie et textures adaptées aux appareils mobiles ;
- budget de poids explicite ;
- preview de production ;
- validation dans un vrai renderer Three.js/WebGL ;
- métadonnées catalogue versionnées ;
- aucune source lourde conservée durablement dans `Ressource/` après publication ;
- diagnostics de build privilégiés sous forme d'artifacts GitHub temporaires plutôt que de rapports générés commités dans `build/`.

## 7. Ce qui ne doit pas être supprimé

Le nettoyage des sources V1 ne concerne pas les assets runtime actuels.

Ne pas supprimer sans migration fonctionnelle explicite :

- `public/assets/rocks/**` ;
- `public/assets/rock-previews/**` ;
- `public/assets/accessories/**` ;
- `public/assets/accessory-previews/**` ;
- les métadonnées de provenance/licence distribuées ;
- les migrations Supabase historiques.

## 8. Historique et reproductibilité

CAILLOU™ privilégie ici deux objectifs distincts :

1. **branche active légère et non trompeuse** pour préparer V2 ;
2. **reproductibilité historique V1** conservée par Git et le tag `v1.0.0`.

Aucune réécriture d'historique Git n'est requise ni souhaitée pour ce ménage : les anciens blobs restent présents dans l'histoire du dépôt et garantissent la traçabilité de la V1.
