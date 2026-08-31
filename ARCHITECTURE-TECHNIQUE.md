# CAILLOU™ — Architecture technique et stack recommandée

> **Statut : architecture cible V1**  
> **Objectif : PWA 3D locale, légère, tactile et durable**  
> **Principe : la complexité doit servir le rendu du caillou, jamais créer une usine à gaz autour de lui.**

---

## 1. Objet du document

Ce document décrit l’architecture technique recommandée pour **CAILLOU™ V1**, la stack, l’organisation du dépôt, les responsabilités des modules, la stratégie 3D, la sélection des vingt spécimens, la persistance locale, la PWA, les performances, les tests et les règles de qualité.

Le périmètre fonctionnel est défini dans `CAHIER-DES-CHARGES-V1.md`. Les règles visuelles et artistiques sont définies dans `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`. Le pipeline d’assets est décrit dans `WORKFLOW-3D-BLENDER-GITHUB.md`.

---

## 2. Décision d’architecture

CAILLOU™ V1 est une **Single Page Application statique, local-first et sans backend**.

Architecture générale :

```text
Navigateur / PWA
      │
      ▼
React UI shell
      │
      ├──────────────► Domaine produit pur
      │                     │
      │                     ▼
      │                État applicatif
      │                     │
      │                     ▼
      │                IndexedDB locale
      │
      ▼
React Three Fiber
      │
      ▼
Three.js / WebGL
      │
      ▼
1 GLB actif + textures + lumières + ambiances
```

Le catalogue contient **20 spécimens**, mais la scène n’en instancie **qu’un seul à la fois**.

Aucun serveur applicatif n’est requis pour :

- parcourir le catalogue ;
- adopter un caillou ;
- le nommer ;
- afficher et manipuler la scène ;
- conserver la progression ;
- changer d’ambiance ;
- prendre un instantané ;
- afficher les statistiques ;
- déclencher les micro-événements ;
- exporter/importer une sauvegarde.

Le déploiement ne sert qu’à distribuer les fichiers statiques et les mises à jour.

---

## 3. Stack recommandée

### 3.1 Socle

| Couche | Choix V1 | Rôle |
|---|---|---|
| UI | React 19 | composition de l’interface |
| Typage | TypeScript 6 | contrats stricts et domaine typé |
| Build | Vite 8 | développement et bundle de production |
| 3D | Three.js | moteur de rendu WebGL |
| Binding 3D | `@react-three/fiber` 9 | scène Three.js déclarative dans React |
| Helpers 3D | `@react-three/drei` | chargement GLTF et helpers ciblés |
| PWA | `vite-plugin-pwa` | manifest, service worker, cache et mises à jour |
| Persistance | IndexedDB native derrière un adapter typé | données locales |
| Tests unitaires | Vitest | domaine, persistance et règles produit |
| Tests composants | Testing Library | interactions UI importantes |
| Tests navigateur | Playwright | parcours critiques et PWA |
| Icônes UI | Lucide React ou SVG locaux | pictogrammes sobres |

### 3.2 Versions de référence

Au 31 août 2026 :

- React stable : branche 19 ;
- TypeScript 6.0 publié ;
- Vite 8 stable ;
- React Three Fiber 9 adapté à React 19.

Les versions patch exactes sont verrouillées par le lockfile au bootstrap du projet.

### 3.3 Node

Recommandation : **Node 22 LTS ou version LTS compatible plus récente**.

---

## 4. Pourquoi React Three Fiber

Le produit est dominé par une scène 3D interactive, mais son interface, sa persistance et son contenu restent une application React classique.

```text
React
├─ Interface 2D
├─ État produit
└─ Canvas 3D
   └─ Three.js
```

Cette approche évite une couche impérative Three.js géante et permet de conserver un état applicatif unique.

---

## 5. Pourquoi ne pas utiliser un moteur de jeu

Unity, Godot ou un moteur Web exporté ne sont pas recommandés pour la V1.

CAILLOU™ n’a pas besoin de physique avancée, monde ouvert, animation squelettique, moteur réseau ou gameplay temps réel lourd.

Three.js offre le contrôle nécessaire pour obtenir un rendu produit premium avec un poids compatible PWA.

---

## 6. Arborescence cible du dépôt

```text
CAILLOU-/
├── Ressource/
│   ├── source .blend
│   └── textures sources
│
├── public/
│   ├── assets/
│   │   ├── rocks/
│   │   │   ├── rock-001/
│   │   │   │   └── model.glb
│   │   │   ├── rock-002/
│   │   │   │   └── model.glb
│   │   │   ├── ...
│   │   │   └── rock-020/
│   │   │       └── model.glb
│   │   ├── rock-previews/
│   │   ├── ambiences/
│   │   ├── audio/
│   │   └── branding/
│   └── icons/
│
├── scripts/
│   └── blender/
│       ├── audit_rocks.py
│       └── futurs scripts d’export
│
├── src/
│   ├── app/
│   ├── domain/
│   ├── content/
│   │   └── rocks.ts
│   ├── scene/
│   │   ├── RockCanvas.tsx
│   │   ├── RockScene.tsx
│   │   ├── RockModel.tsx
│   │   ├── RockLoader.tsx
│   │   ├── camera/
│   │   ├── lighting/
│   │   ├── controls/
│   │   ├── ambiences/
│   │   ├── effects/
│   │   ├── quality/
│   │   └── capture/
│   ├── features/
│   │   ├── onboarding/
│   │   ├── showroom/
│   │   ├── pedestal/
│   │   ├── profile/
│   │   ├── collection/
│   │   ├── ambiences/
│   │   ├── snapshot/
│   │   ├── observation/
│   │   └── settings/
│   ├── persistence/
│   ├── pwa/
│   ├── styles/
│   └── utils/
│
├── tests/
├── .github/workflows/
└── documents Markdown existants
```

Les noms exacts pourront évoluer, mais la séparation **source 3D / assets web / scène / domaine / UI** doit rester claire.

---

## 7. Règles de dépendances

### 7.1 Domaine pur

`src/domain` contient les règles métier :

- adoption ;
- progression ;
- titres ;
- statistiques ;
- micro-événements ;
- validation de sauvegarde.

Il ne dépend jamais de React, Three.js, IndexedDB ou du navigateur.

### 7.2 Scène 3D

La scène reçoit un état :

```ts
{
  rockId,
  ambienceId,
  qualityTier,
  observationMode,
  rareEvent
}
```

Elle produit des événements :

```ts
onRockTap()
onInteractionStart()
onInteractionEnd()
onSnapshotReady()
```

Le showroom ajoute des événements applicatifs :

```ts
onPreviousRock()
onNextRock()
onRockReady()
onRockLoadError()
onAdoptRock()
```

La scène ne décide pas des règles de progression ou d’adoption.

---

## 8. Catalogue des vingt spécimens

### 8.1 Identifiants

Le catalogue versionné utilise des IDs stables :

```text
rock-001
rock-002
...
rock-020
```

### 8.2 Structure de catalogue

Exemple conceptuel :

```ts
type RockSpecimen = {
  id: RockSpecimenId
  index: number
  label: string
  modelUrl: string
  previewUrl?: string
  sourceMesh: string
  triangleCount: number
  textureSize: number
  attribution: {
    author: string
    source: string
    license: string
  }
}
```

Le catalogue n’embarque pas les meshes. Il ne contient que les métadonnées et URLs.

### 8.3 État de sélection

```ts
type ShowroomState = {
  selectedIndex: number
  selectedRockId: RockSpecimenId
  loadState: 'idle' | 'loading' | 'ready' | 'error'
}
```

Aucune instance Three.js n’est stockée dans l’état React persistant.

---

## 9. Modèle de données utilisateur

```ts
type AppState = {
  schemaVersion: number
  appVersion: string
  adoptedRocks: AdoptedRock[]
  activeRockId: string
  activeAmbienceId: string
  progression: ProgressionState
  rareEvents: RareEventHistory
  settings: Settings
  stats: UsageStats
}
```

```ts
type AdoptedRock = {
  id: string
  specimenId: RockSpecimenId
  name: string
  adoptedAt: string
  lastViewedAt?: string
}
```

La géométrie, les matériaux, la licence et les textes du spécimen appartiennent au catalogue applicatif et ne sont pas dupliqués dans la sauvegarde.

---

## 10. Persistance IndexedDB

Utiliser IndexedDB derrière un adapter typé.

Stores recommandés :

```text
state
meta
```

Les assets 3D ne sont pas recopiés dans IndexedDB. Leur cache appartient au service worker / navigateur.

Sauvegarde immédiate après :

- adoption ;
- changement de nom ;
- changement de compagnon principal ;
- import ;
- reset.

---

## 11. Pipeline 3D V1

### 11.1 Source maître

Le fichier Blender placé dans `Ressource/` constitue la source de production des vingt spécimens.

L’audit automatisé a confirmé :

- 20 meshes distincts ;
- environ 10 000 triangles par mesh LOD2 ;
- UV disponibles ;
- matériau individuel ;
- texture couleur ;
- normal map ;
- rendu individuel automatisable.

### 11.2 Format web

Format de livraison : **glTF 2.0 binaire `.glb`**.

Chaque spécimen final doit pouvoir être distribué comme asset autonome.

### 11.3 Traitement cible

```text
.blend source
   ↓
isoler rock_XXX_LOD2
   ↓
reconnecter / vérifier textures
   ↓
centrer / orienter / normaliser
   ↓
matériau PBR CAILLOU™
   ↓
export GLB individuel
   ↓
validation poids / rendu / licence
```

### 11.4 LOD2

Le LOD2 à environ 10k triangles est accepté comme base V1.

Aucune décimation supplémentaire n’est imposée par défaut. On optimise seulement si les mesures réelles le justifient.

### 11.5 Textures

Base source : environ 1024 × 1024 couleur + normal.

Une roughness peut être calibrée ou générée si nécessaire. L’objectif n’est pas d’inventer du détail mais de restituer correctement la matière sous l’éclairage CAILLOU™.

---

## 12. Budget cible par spécimen

Valeurs initiales à mesurer :

- géométrie : ~10k triangles ;
- texture : 1K source, 1K ou 2K uniquement si une amélioration réelle est démontrée ;
- GLB final : viser **< 5 Mo** si possible ;
- tolérance supérieure ponctuelle si la qualité le justifie et si le chargement reste acceptable.

La présence de 20 assets ne signifie pas qu’ils doivent tous être transférés au démarrage.

---

## 13. Showroom 3D : règle fondamentale

### 13.1 Une seule roche active

Le showroom ne maintient **qu’un seul spécimen 3D instancié à la fois**.

Interdit :

```text
20 GLB chargés
20 scènes cachées
20 textures en GPU
```

Attendu :

```text
catalogue metadata
       ↓
rock-007 demandé
       ↓
1 GLB chargé
       ↓
1 scène active
```

### 13.2 Cycle de changement

```text
Rock A affiché
   ↓
transition de sortie
   ↓
dispose Rock A
   ↓
chargement Rock B
   ↓
transition d’entrée
   ↓
Rock B affiché
```

Le Canvas est réutilisé. Le modèle change, pas toute l’application.

### 13.3 Disposal obligatoire

Au changement de spécimen, libérer explicitement :

- géométries ;
- matériaux ;
- textures non partagées ;
- render targets éventuels ;
- références applicatives au modèle précédent.

La navigation répétée `01 → 20 → 01` ne doit pas produire une croissance continue de la mémoire GPU.

### 13.4 Loader annulable

Si l’utilisateur change rapidement de direction pendant un chargement :

- ignorer le résultat obsolète ;
- éviter d’insérer tardivement le mauvais modèle ;
- utiliser un token/version de requête ou un mécanisme d’annulation lorsque possible.

---

## 14. Cache réseau versus mémoire GPU

La règle « un seul caillou chargé » concerne la scène 3D et la mémoire GPU.

Le navigateur peut conserver les fichiers déjà visités dans son cache HTTP/PWA.

Ainsi :

```text
rock-003 déjà visité
→ GLB possiblement présent sur disque/cache
→ aucune instance Three.js active
→ retour ultérieur plus rapide
```

Cette distinction permet d’avoir une navigation efficace sans garder vingt modèles actifs.

---

## 15. Previews et placeholder

Les métadonnées des vingt spécimens sont légères et peuvent être chargées immédiatement.

Des previews 2D peuvent être utilisées :

- comme placeholder pendant le changement ;
- comme fallback si WebGL échoue ;
- éventuellement pour une vue secondaire de collection.

Le showroom principal reste **3D**.

Aucune preview 2D ne doit remplacer l’inspection du modèle lors de l’adoption normale.

---

## 16. Contrôles du showroom

### 16.1 Navigation

Les boutons précédent/suivant constituent la méthode de navigation de référence.

Ils doivent être :

- accessibles au tactile ;
- accessibles au clavier ;
- libellés ARIA ;
- utilisables indépendamment du Canvas.

### 16.2 Rotation

Un PointerDown démarré sur la zone interactive du modèle active la rotation.

La couche de contrôles doit distinguer :

```text
rotation du caillou
≠
navigation précédent/suivant
```

### 16.3 Swipe facultatif

Un swipe horizontal de navigation peut être accepté dans des zones hors objet si les essais mobiles prouvent qu’il n’entre pas en conflit avec la rotation.

Les flèches restent disponibles dans tous les cas.

### 16.4 Zoom

Pinch / molette autorisé avec bornes de distance. Il n’est jamais requis pour valider une adoption.

---

## 17. Stratégie de rendu 3D

Renderer V1 : WebGL via Three.js.

WebGPU n’est pas une exigence V1.

Principes :

- caméra perspective contrôlée ;
- limites de zoom ;
- pas de clipping visible ;
- DPR adaptatif ;
- fond et décor séparés du modèle ;
- `frameloop="demand"` autant que possible.

Un nouveau rendu est demandé lors :

- rotation ;
- zoom ;
- transition ;
- micro-événement ;
- variation lumineuse ;
- capture.

---

## 18. Qualité adaptative

### Economy

- DPR borné bas ;
- ombres simplifiées ;
- effets réduits.

### Auto

- tier par défaut ;
- adaptation au DPR, mémoire et frame time.

### High

- DPR supérieur borné ;
- ombres maximales raisonnables ;
- effets complets.

Le mesh LOD2 reste identique tant que le profilage ne démontre pas le besoin d’une géométrie alternative.

---

## 19. Lumière et ombres

Le rendu premium dépend davantage de la lumière que du nombre de polygones.

Architecture d’ambiance :

```text
Ambience
├─ background
├─ ground
├─ key light
├─ fill light
├─ rim light
├─ environment/reflections
└─ contact shadow
```

Le showroom utilise un preset **Studio de sélection** unique pour les vingt pierres afin de ne pas favoriser un candidat par son décor.

---

## 20. Socle et Mode Observation

Le Socle et le showroom peuvent réutiliser le même moteur de rendu et les mêmes composants de modèle, mais pas nécessairement la même composition UI.

Le Mode Observation ne crée pas une nouvelle scène. Il modifie visibilité de l’UI, cadrage, audio et effets.

---

## 21. Micro-événements

Les micro-événements restent calculés dans le domaine puis rendus par la scène.

```text
rare-events.ts
      ↓
Eligibility engine
      ↓
RareEvent | null
      ↓
Scene effect renderer
```

Le showroom d’adoption n’affiche pas de micro-événements susceptibles de distraire le choix.

---

## 22. Instantané

Pipeline :

```text
état scène
   ↓
rendu dédié
   ↓
canvas/image blob
   ↓
branding optionnel
   ↓
Web Share API ou téléchargement
```

Aucun serveur requis.

---

## 23. PWA et stratégie de cache

### 23.1 Précache

Précacher :

- shell HTML/CSS/JS ;
- branding ;
- icônes ;
- ressources légères nécessaires à l’onboarding ;
- previews légères si retenues.

**Ne pas précacher les vingt GLB au premier chargement.**

### 23.2 Runtime cache des roches

Chaque GLB visité peut entrer dans un cache runtime versionné.

Objectifs :

- revisite rapide ;
- réduire les téléchargements répétés ;
- permettre progressivement une consultation hors ligne des pierres déjà vues.

### 23.3 Compagnon principal

Après adoption, le modèle du compagnon principal devient un asset prioritaire du cache afin que le Socle fonctionne hors ligne.

### 23.4 Limites

Le cache doit posséder :

- nom/version explicite ;
- politique d’expiration ;
- nettoyage lors de changements incompatibles ;
- limite adaptée aux 20 assets.

---

## 24. Chargement et transition

Séquence du showroom :

```text
UI + Studio
   ↓
placeholder du spécimen N
   ↓
GLB N
   ↓
modèle prêt
   ↓
fade court
```

Lors du suivant :

```text
fade out
→ disposal
→ placeholder N+1
→ chargement
→ fade in
```

Ne jamais conserver Rock N et Rock N+1 uniquement pour fabriquer un crossfade 3D coûteux.

Une capture 2D du dernier frame peut être utilisée temporairement si elle améliore la transition sans complexité excessive.

---

## 25. Responsive

### Téléphone portrait

- Canvas dominant ;
- flèches gauche/droite dans les zones latérales ;
- compteur `N / 20` ;
- nom/label et CTA d’adoption en bas ;
- safe areas iOS respectées.

### Tablette

- Canvas plus généreux ;
- flèches éloignées du sujet ;
- paysage réellement travaillé.

### Desktop

- souris/trackpad ;
- touches gauche/droite ;
- Canvas centré ;
- pas de dashboard.

---

## 26. Accessibilité technique

- HTML sémantique hors Canvas ;
- boutons natifs ;
- focus visible ;
- flèches avec `aria-label` ;
- compteur textuel `7 sur 20` pour lecteur d’écran ;
- `prefers-reduced-motion` ;
- alternative aux gestes ;
- fallback 2D si WebGL indisponible ;
- adoption possible sans devoir effectuer une rotation 3D.

---

## 27. Tests prioritaires

### Unitaires

- adoption ;
- progression ;
- titres ;
- statistiques ;
- micro-événements ;
- validation import/export ;
- catalogue de 20 IDs uniques.

### Intégration

- navigation précédent/suivant ;
- wrap ou bornes `01/20` selon décision UX ;
- changement rapide de direction ;
- adoption du spécimen affiché ;
- retour au showroom ;
- changement de compagnon principal.

### 3D

- chargement de chacun des 20 GLB ;
- absence d’asset ou texture manquante ;
- aucun mesh supplémentaire involontaire ;
- disposal après changement ;
- absence de croissance mémoire après plusieurs cycles ;
- rendu sans erreur console.

### E2E

```text
premier lancement
→ showroom 3D
→ parcourir plusieurs cailloux
→ tourner le candidat
→ adopter
→ nommer
→ Socle
→ reload
→ état conservé
```

---

## 28. Validation automatisée des assets

Un contrôle doit vérifier :

- présence des **20 spécimens** attendus ;
- IDs `rock-001` à `rock-020` uniques ;
- GLB ouvrable ;
- mesh attendu ;
- UV présents ;
- texture couleur ;
- normal map ou matériau final valide ;
- poids maximal configurable ;
- provenance et licence documentées ;
- absence de fichier `.blend` ou texture source lourde dans le bundle public par erreur.

---

## 29. Performance

Les métriques critiques ne sont pas seulement les FPS.

Mesurer :

- délai avant premier spécimen visible ;
- délai moyen précédent/suivant ;
- pic mémoire GPU ;
- mémoire après 20 changements ;
- taille cache ;
- frame time pendant rotation ;
- chauffe sur session prolongée.

Critère important : après un tour complet des 20 spécimens, la mémoire doit revenir à un niveau proche de celui observé avec un seul spécimen chargé.

---

## 30. Déploiement

Vercel convient à la V1 :

```text
GitHub
  │
  ├─ branche / PR → Preview
  │
  └─ main → Production
```

L’application reste statique. Aucun service serveur Vercel n’est requis.

---

## 31. Stratégie Git

```text
main
└─ feature/*
   └─ Pull Request
```

Règles :

- `main` toujours déployable ;
- une PR = un objectif cohérent ;
- aucun merge avec contrôles essentiels rouges ;
- assets lourds ajoutés consciemment ;
- les documents de référence existants évoluent au lieu d’être doublonnés par de nouveaux documents concurrents.

---

## 32. Dépendances : politique de sobriété

Production :

```text
react
react-dom
three
@react-three/fiber
@react-three/drei
vite-plugin-pwa
lucide-react (optionnel)
```

À éviter sans besoin démontré :

- Redux ;
- store global supplémentaire uniquement pour le showroom ;
- moteur physique ;
- framework backend ;
- ORM ;
- SDK analytics ;
- bibliothèque de carrousel 3D générique.

Le showroom est assez simple pour être implémenté directement avec React et la scène existante.

---

## 33. Découpage de livraison recommandé

### Phase 0 — Fondation

- Vite/React/TS ;
- lint/typecheck/tests ;
- PWA shell ;
- tokens ;
- état local minimal.

### Phase 1 — Vertical slice

Un caillou exporté depuis le pipeline Blender, un showroom minimal et une ambiance Studio :

```text
ouvrir
→ voir Rock 001
→ tourner
→ suivant
→ charger Rock 002
→ revenir
→ adopter
→ nommer
→ Socle
```

Cette phase valide le chargement/disposal avant d’exporter les vingt modèles finaux.

### Phase 2 — Catalogue V1

- export des 20 GLB ;
- catalogue de métadonnées ;
- navigation 01/20 ;
- transitions ;
- cache runtime ;
- adoption.

### Phase 3 — Produit V1

- 5 ambiances ;
- fiche ;
- collection/showroom ;
- progression ;
- textes ;
- instantané ;
- événements rares ;
- audio ;
- offline du compagnon principal.

### Phase 4 — Finition et release

- accessibilité ;
- qualité adaptative ;
- tests appareils physiques ;
- audit mémoire ;
- validation PWA ;
- import/export ;
- crédits/licences ;
- publication V1.0.

---

## 34. Risques techniques principaux

### R1 — Poids cumulé des 20 assets

**Réponse :** chargement séquentiel, runtime cache, aucun précache massif.

### R2 — Fuite GPU lors du changement

**Réponse :** disposal explicite, tests de cycles complets, références nettoyées.

### R3 — Conflit rotation / swipe

**Réponse :** flèches comme navigation primaire, détection de zone et seuils gestuels.

### R4 — Rendu différent entre appareils

**Réponse :** matrice d’appareils physiques, preset Studio robuste, DPR adaptatif.

### R5 — Chauffe et batterie

**Réponse :** frameloop à la demande et absence de 20 scènes cachées.

### R6 — Effet « démo Three.js »

**Réponse :** lumière, matériau, caméra et transition traités comme un showroom de produit.

### R7 — Surarchitecture

**Réponse :** un Canvas, un loader, un catalogue, un modèle actif.

---

## 35. Décisions reportées après V1

- WebGPU comme renderer principal ;
- backend et synchronisation ;
- multijoueur ;
- réalité augmentée ;
- scan 3D utilisateur ;
- génération procédurale de cailloux ;
- physique avancée ;
- boutique ;
- compte ;
- notifications.

---

## 36. Règle d’architecture finale

> **Vingt cailloux dans le catalogue ne doivent jamais devenir vingt cailloux dans la mémoire.**

Et la règle historique reste valable :

> **Le code autour du caillou doit être plus simple que le caillou.**