# CAILLOU™ — Architecture technique et stack recommandée

> **Statut : architecture cible V1**  
> **Objectif : PWA 3D locale, légère, tactile et durable**  
> **Principe : la complexité doit servir le rendu du caillou, jamais créer une usine à gaz autour de lui.**

---

## 1. Objet du document

Ce document décrit l’architecture technique recommandée pour **CAILLOU™ V1**, la stack, l’organisation du dépôt, les responsabilités des modules, la stratégie 3D, la persistance locale, la PWA, les performances, les tests et les règles de qualité.

Le périmètre fonctionnel est défini dans `CAHIER-DES-CHARGES-V1.md`. Les règles visuelles et artistiques sont définies dans `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`.

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
GLB + textures + lumières + ambiances
```

Aucun serveur n’est requis pour :

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
| PWA | `vite-plugin-pwa` | manifest, service worker, précache et mises à jour |
| Persistance | IndexedDB native derrière un adapter typé | données locales |
| Tests unitaires | Vitest | domaine, persistance et règles produit |
| Tests composants | Testing Library | interactions UI importantes |
| Tests navigateur | Playwright | parcours critiques et PWA |
| Icônes UI | Lucide React ou SVG locaux | pictogrammes sobres |

### 3.2 Versions de référence au démarrage du projet

Au 31 août 2026 :

- React stable : branche 19, documentation courante 19.2 ;
- TypeScript 6.0 est publié ;
- Vite 8 est stable ;
- React Three Fiber 9 correspond à React 19.

Les versions patch exactes doivent être verrouillées par le lockfile au bootstrap du projet, sans maintenir manuellement des versions dans cette documentation.

### 3.3 Prérequis Node

Vite 8 requiert Node.js `20.19+` ou `22.12+`.

Pour CAILLOU™, recommandation : **Node 22 LTS ou version LTS compatible plus récente**, fixée dans le projet afin d’obtenir des builds reproductibles.

### 3.4 Références techniques officielles

- React : https://react.dev/versions
- TypeScript : https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- Vite : https://vite.dev/
- React Three Fiber : https://r3f.docs.pmnd.rs/
- Three.js : https://threejs.org/docs/
- Vite PWA : https://vite-pwa-org.netlify.app/

---

## 4. Pourquoi React Three Fiber

Le produit est dominé par une scène 3D interactive, mais son interface, ses écrans, sa persistance et son contenu restent une application React classique.

React Three Fiber permet de conserver une seule architecture mentale :

```text
React
├─ Interface 2D
├─ État produit
└─ Canvas 3D
   └─ Three.js
```

La V1 évite ainsi :

- une couche impérative Three.js géante ;
- deux systèmes d’état concurrents ;
- un pont complexe entre DOM et moteur 3D.

React Three Fiber 9 est conçu pour React 19 et reste directement compatible avec les capacités de Three.js.

---

## 5. Pourquoi ne pas utiliser un moteur de jeu

Unity, Godot ou un moteur Web exporté ne sont pas recommandés pour la V1.

CAILLOU™ n’a pas besoin de :

- physique avancée ;
- monde ouvert ;
- animation squelettique complexe ;
- système de scènes de jeu ;
- moteur réseau ;
- gameplay temps réel lourd.

Le coût en poids, intégration PWA, pipeline et maintenance serait disproportionné.

Three.js offre le niveau de contrôle nécessaire pour obtenir un rendu produit premium tout en restant une application web légère.

---

## 6. Arborescence cible du dépôt

L’arborescence recommandée lorsque l’implémentation commencera est la suivante :

```text
CAILLOU-/
├── public/
│   ├── assets/
│   │   ├── rocks/
│   │   │   ├── river-pebble/
│   │   │   ├── volcanic-stone/
│   │   │   ├── pale-quartz/
│   │   │   ├── granite-stone/
│   │   │   ├── ochre-stone/
│   │   │   └── black-pebble/
│   │   ├── ambiences/
│   │   ├── audio/
│   │   └── branding/
│   └── icons/
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── AppProvider.tsx
│   │   └── app-state.ts
│   │
│   ├── domain/
│   │   ├── rock.ts
│   │   ├── adoption.ts
│   │   ├── progression.ts
│   │   ├── stats.ts
│   │   ├── events.ts
│   │   └── backup.ts
│   │
│   ├── content/
│   │   ├── rocks.ts
│   │   ├── ambiences.ts
│   │   ├── statuses.ts
│   │   ├── reactions.ts
│   │   ├── titles.ts
│   │   └── rare-events.ts
│   │
│   ├── scene/
│   │   ├── RockCanvas.tsx
│   │   ├── RockScene.tsx
│   │   ├── RockModel.tsx
│   │   ├── camera/
│   │   ├── lighting/
│   │   ├── controls/
│   │   ├── ambiences/
│   │   ├── effects/
│   │   ├── quality/
│   │   └── capture/
│   │
│   ├── features/
│   │   ├── onboarding/
│   │   ├── pedestal/
│   │   ├── profile/
│   │   ├── collection/
│   │   ├── ambiences/
│   │   ├── snapshot/
│   │   ├── observation/
│   │   └── settings/
│   │
│   ├── components/
│   │   ├── Button/
│   │   ├── Sheet/
│   │   ├── Dialog/
│   │   ├── IconButton/
│   │   └── Typography/
│   │
│   ├── persistence/
│   │   ├── db.ts
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   ├── repository.ts
│   │   └── backup.ts
│   │
│   ├── pwa/
│   │   ├── update.ts
│   │   └── install.ts
│   │
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── reset.css
│   │   ├── globals.css
│   │   └── utilities.css
│   │
│   ├── utils/
│   │   ├── dates.ts
│   │   ├── random.ts
│   │   ├── format.ts
│   │   └── capabilities.ts
│   │
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── les 3 documents de référence Markdown
```

Les noms exacts pourront évoluer pendant l’implémentation, mais la séparation des responsabilités doit rester.

---

## 7. Règles de dépendances entre couches

### 7.1 Sens autorisé

```text
features / components
        │
        ▼
       app
        │
        ▼
      domain
        ▲
        │
persistence / scene adapters
```

Le domaine ne dépend jamais de React, Three.js, IndexedDB ou du navigateur.

### 7.2 Domaine pur

`src/domain` doit contenir les règles comme :

- calcul du titre actuel ;
- progression douce ;
- sélection d’un statut ;
- éligibilité d’un micro-événement ;
- calcul des statistiques absurdes ;
- validation d’une sauvegarde ;
- migrations de données au niveau métier.

Ces fonctions doivent pouvoir être testées sans DOM.

### 7.3 La scène 3D n’est pas le domaine

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

Elle ne décide pas elle-même du titre, de la progression ou des règles produit.

---

## 8. Modèle de données V1

### 8.1 État principal

Structure conceptuelle :

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

### 8.2 Caillou adopté

```ts
type AdoptedRock = {
  id: string
  specimenId: RockSpecimenId
  name: string
  adoptedAt: string
  lastViewedAt?: string
}
```

La géométrie, les matériaux et les textes du spécimen ne sont pas dupliqués dans la sauvegarde : ils appartiennent au catalogue versionné de l’application.

### 8.3 Statistiques

Les statistiques persistées doivent rester minimales et déterministes :

```ts
type UsageStats = {
  appOpenCount: number
  rockTapCount: number
  observationMs: number
  ambienceUseCount: Record<string, number>
}
```

Les métriques humoristiques sont dérivées de ces données et non stockées séparément lorsque cela n’est pas nécessaire.

### 8.4 Réglages

```ts
type Settings = {
  soundEnabled: boolean
  hapticsEnabled: boolean
  graphicsMode: 'auto' | 'high' | 'economy'
  reduceEffects: boolean
  themeMode: 'system' | 'light' | 'dark'
}
```

---

## 9. Persistance IndexedDB

### 9.1 Choix

Utiliser **IndexedDB native derrière un adapter typé** plutôt qu’un accès direct dispersé dans l’application.

La V1 ne nécessite pas une bibliothèque de base de données supplémentaire.

### 9.2 Base recommandée

```text
caillou_db
```

Stores :

```text
state
meta
```

Un modèle volontairement simple suffit : le volume des données métier est très faible et les assets 3D ne doivent pas être recopiés dans IndexedDB.

### 9.3 Écriture

Stratégie :

- état chargé une fois au bootstrap ;
- mutations via actions applicatives ;
- sauvegarde locale debouncée ;
- sauvegarde immédiate après événements critiques : adoption, changement de nom, import, reset.

### 9.4 Migration

Chaque état possède `schemaVersion`.

Règles :

1. migrations séquentielles ;
2. jamais de destruction silencieuse ;
3. sauvegarde de secours avant import/migration risquée ;
4. tests unitaires pour chaque migration ;
5. catalogue de contenu séparé des données utilisateur.

---

## 10. Export et import

### 10.1 Export

Format JSON versionné :

```json
{
  "app": "CAILLOU",
  "schemaVersion": 1,
  "appVersion": "1.0.0",
  "exportedAt": "...",
  "state": {}
}
```

### 10.2 Import

L’import doit :

1. lire le fichier ;
2. vérifier signature logique et version ;
3. valider les types et limites ;
4. migrer si nécessaire ;
5. créer une pré-sauvegarde de l’état courant ;
6. remplacer l’état uniquement après validation complète ;
7. recharger proprement l’application.

Aucun code arbitraire ni chemin de fichier externe ne doit pouvoir être injecté via une sauvegarde.

---

## 11. Pipeline 3D

### 11.1 Format maître

Les fichiers de travail peuvent être conservés hors bundle dans l’outil de création 3D choisi, typiquement Blender.

Le format de livraison web recommandé est **glTF 2.0 binaire `.glb`**.

### 11.2 Pourquoi GLB

Three.js prend nativement en charge glTF via `GLTFLoader`, y compris les extensions de compression de géométrie et textures adaptées au web.

### 11.3 Contenu d’un spécimen

Chaque caillou peut contenir :

```text
model.glb
textures/
  albedo.ktx2
  normal.ktx2
  roughness.ktx2
  ao.ktx2        (si utile)
```

Selon le pipeline retenu, les textures peuvent aussi être intégrées au GLB.

### 11.4 Matériau

Base recommandée : matériau PBR de type `MeshStandardMaterial` ou `MeshPhysicalMaterial` uniquement lorsque les propriétés supplémentaires sont réellement visibles.

Textures utiles :

- albedo/base color ;
- normal ;
- roughness ;
- ambient occlusion si nécessaire ;
- éventuellement height/bump selon stratégie retenue.

Pas de texture 8K par principe. La qualité perçue doit venir du scan/sculpt, des normales, de la rugosité et de la lumière, pas d’une course au poids de fichier.

### 11.5 Compression

Pipeline recommandé :

- géométrie optimisée ;
- compression `EXT_meshopt_compression` ou Draco après comparaison réelle ;
- textures KTX2/Basis lorsque le gain est significatif ;
- dimensions de texture adaptées aux tiers de qualité.

Three.js `GLTFLoader` prend en charge notamment Meshopt, Draco et KTX2/Basis via les loaders/décodeurs associés.

### 11.6 Budget cible par caillou

Valeur initiale à valider visuellement :

- modèle livré : idéalement **< 3 Mo** ;
- ensemble modèle + textures haute qualité : idéalement **< 8 Mo** ;
- éviter de charger les six modèles au démarrage ;
- charger immédiatement uniquement le spécimen actif ;
- précharger les autres lorsque le navigateur est inactif et que le contexte le permet.

Le budget final doit être déterminé par mesure sur appareils physiques, pas par dogme.

---

## 12. Stratégie de rendu 3D

### 12.1 Renderer V1

WebGL via Three.js.

WebGPU n’est pas une exigence V1. Il pourra être évalué plus tard sans devenir une dépendance produit.

### 12.2 Canvas

La scène utilise un Canvas React Three Fiber dimensionné par son conteneur.

Principes :

- caméra perspective contrôlée ;
- limites de zoom ;
- pas de clipping visible ;
- fond et décor séparés du modèle ;
- DPR adaptatif.

### 12.3 Rendu à la demande

CAILLOU™ est majoritairement statique. Il est donc recommandé d’utiliser autant que possible un rendu de type :

```text
frameloop = demand
```

Le Canvas ne doit pas rendre 60 images par seconde lorsque le caillou reste immobile.

Un nouveau rendu est demandé lors :

- d’une rotation ;
- d’un zoom ;
- d’une transition ;
- d’un micro-événement animé ;
- d’une variation lumineuse ;
- d’une capture.

Bénéfices :

- autonomie ;
- température ;
- consommation GPU ;
- fluidité globale de la PWA.

### 12.4 Qualité adaptative

Trois tiers :

#### Economy

- DPR borné bas ;
- ombres simplifiées ;
- textures intermédiaires ;
- effets secondaires réduits.

#### Auto

- valeur par défaut ;
- adaptation au DPR, mémoire et comportement observé ;
- réduction si frame time mauvais.

#### High

- DPR supérieur borné ;
- ombres et textures maximales raisonnables ;
- effets complets.

Aucun tier ne doit dégrader la silhouette ou l’identité fondamentale du caillou.

---

## 13. Lumière et ombres

Le rendu premium dépend davantage de la lumière que du nombre de polygones.

Architecture conseillée par ambiance :

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

Chaque ambiance possède son preset typé.

Les presets sont données, pas logique codée en dur dans les composants.

Exemple conceptuel :

```ts
type LightingPreset = {
  key: LightSpec
  fill: LightSpec
  rim: LightSpec
  environmentIntensity: number
  shadowSoftness: number
  exposure: number
}
```

---

## 14. Contrôles 3D

### 14.1 Ne pas déléguer toute l’expérience à OrbitControls

Les helpers standards peuvent être utiles au prototype, mais la V1 finale doit fournir des contrôles adaptés au produit afin de distinguer proprement :

- rotation ;
- tap ;
- appui long ;
- pinch ;
- navigation UI.

### 14.2 Contraintes

- inertie légère ;
- rotation verticale limitée ;
- impossible de retourner le monde dans une position absurde ;
- zoom borné ;
- annulation correcte du long press en cas de drag ;
- événements Pointer unifiés souris/tactile quand possible.

### 14.3 Haptique

L’haptique est une amélioration optionnelle et non une dépendance fonctionnelle.

Si l’API n’est pas disponible, aucune erreur ni fonction manquante visible ne doit apparaître.

---

## 15. Mode Observation

Techniquement, ce mode ne crée pas une nouvelle scène.

Il modifie :

- visibilité de l’UI ;
- cadrage caméra léger ;
- intensité éventuelle de certains éléments ;
- mix audio ;
- état d’interaction.

Éviter de dupliquer le Canvas ou de recharger le modèle.

---

## 16. Micro-événements

### 16.1 Sélection déterministe

Les événements peuvent être pseudo-aléatoires à partir de :

- date ;
- identifiant du caillou ;
- nombre d’ouvertures ;
- historique des événements.

Objectif : éviter qu’un simple refresh répété permette de forcer un événement rare.

### 16.2 Architecture

```text
rare-events.ts
      │
      ▼
Eligibility engine
      │
      ▼
RareEvent | null
      │
      ▼
Scene effect renderer
```

Le moteur décide **quoi** afficher ; la scène décide **comment** le rendre.

---

## 17. Instantané

### 17.1 Source

La capture doit provenir du Canvas Three.js à une résolution contrôlée.

### 17.2 Pipeline

```text
état scène
   ↓
rendu dédié
   ↓
canvas/image blob
   ↓
composition branding optionnelle
   ↓
Web Share API ou téléchargement
```

### 17.3 Qualité

Ne pas capturer simplement une miniature de l’écran si un rendu dédié peut produire une image plus nette et sans contrôles UI.

La capture ne doit pas nécessiter de serveur.

---

## 18. Audio

Le sound design doit rester petit et local.

Recommandation :

- fichiers courts compressés ;
- chargement différé ;
- pas de lecture avant interaction utilisateur si le navigateur l’interdit ;
- volume général très modéré ;
- aucune boucle lourde obligatoire ;
- possibilité de couper totalement le son.

Le moteur audio peut rester basé sur `HTMLAudioElement` en V1. Web Audio API n’est nécessaire que si un besoin de spatialisation ou mixage dynamique réel apparaît.

---

## 19. PWA

### 19.1 Outil

Utiliser `vite-plugin-pwa`.

Il permet de générer le manifest et le service worker à partir de la configuration Vite.

### 19.2 Stratégie de mise à jour

CAILLOU™ ne doit pas forcer un reload pendant une interaction.

Recommandation : **mise à jour avec prompt discret** lorsque de nouveaux fichiers sont disponibles.

Parcours :

```text
nouvelle version détectée
       ↓
petite invitation non bloquante
       ↓
« Mettre à jour »
       ↓
sauvegarde locale
       ↓
activation + reload contrôlé
```

### 19.3 Précache

Précacher :

- shell HTML/CSS/JS essentiel ;
- branding ;
- icônes ;
- modèle et ressources du caillou initial si connus lors du build, ou stratégie runtime robuste sinon ;
- assets indispensables à l’écran hors ligne.

Ne pas précacher aveuglément tous les gros modèles et toutes les textures au premier chargement.

### 19.4 Cache runtime

Les autres cailloux et ambiances peuvent utiliser un cache runtime versionné avec limite et stratégie explicite.

---

## 20. Chargement initial

Objectif : montrer quelque chose de beau avant que tous les assets lourds soient disponibles.

Séquence recommandée :

```text
HTML shell
   ↓
UI minimale
   ↓
chargement état local
   ↓
placeholder/silhouette premium
   ↓
modèle actif + textures
   ↓
transition douce vers scène finale
```

Interdit : écran blanc prolongé.

Éviter également les fausses barres de chargement humoristiques qui ralentissent volontairement l’utilisateur.

---

## 21. Responsive

### Téléphone portrait

- Canvas dominant ;
- commandes basses accessibles au pouce ;
- fiches secondaires en sheet/modal ;
- safe areas iOS respectées.

### Tablette

- Canvas plus généreux ;
- possibilité de panneau latéral ;
- paysage réellement travaillé.

### Desktop

- interaction souris/trackpad ;
- largeur maximale de l’UI ;
- Canvas centré ;
- pas d’étirement type dashboard.

---

## 22. Accessibilité technique

- HTML sémantique hors Canvas ;
- boutons natifs quand possible ;
- focus visible ;
- `aria-label` pour commandes iconiques ;
- Escape ferme les overlays ;
- tab order stable ;
- `prefers-reduced-motion` lu par le système de scène ;
- alternative aux gestes de rotation/zoom si nécessaire ;
- l’absence de Canvas/WebGL doit afficher un fallback lisible plutôt qu’une erreur brute.

---

## 23. Gestion des capacités

Créer un module unique de détection :

```text
capabilities.ts
```

Il expose par exemple :

- WebGL disponible ;
- devicePixelRatio ;
- reduced motion ;
- vibration/haptique possible ;
- Web Share disponible ;
- PWA standalone ;
- stockage persistant disponible ;
- mémoire approximative si exposée.

Les composants ne doivent pas répéter chacun leur propre détection navigateur.

---

## 24. Tests

### 24.1 Unitaires

À couvrir prioritairement :

- progression ;
- titres ;
- statistiques ;
- moteur de micro-événements ;
- validation import/export ;
- migrations ;
- sélection de contenu ;
- règles anti-streak.

### 24.2 Intégration

- onboarding complet ;
- adoption ;
- changement d’ambiance ;
- sélection du compagnon principal ;
- reset ;
- import/export.

### 24.3 3D

Éviter de tester chaque détail Three.js en unit test.

Tester plutôt :

- chargement d’un catalogue d’assets valide ;
- absence d’asset manquant ;
- budgets de fichiers ;
- screenshot/smoke tests ciblés ;
- absence d’erreur console.

### 24.4 E2E

Playwright doit couvrir au minimum :

```text
premier lancement
→ choix d’un caillou
→ nommage
→ arrivée au Socle
→ interaction
→ changement d’ambiance
→ fiche
→ instantané
→ reload
→ état conservé
```

Un second scénario couvre import/export et un troisième le fonctionnement hors ligne.

---

## 25. Contrôles qualité automatisés

Commande cible unique :

```bash
npm run check
```

Elle doit exécuter dans un ordre raisonnable :

```text
typecheck
lint
tests unitaires
validation contenus/assets
build
smoke tests essentiels
```

Les tests navigateur lourds et audits complets peuvent être séparés si leur durée devient disproportionnée.

Philosophie : **assez de tests pour protéger le produit, pas une raffinerie CI pour surveiller un caillou**.

---

## 26. Validation des assets

Un script de build doit pouvoir vérifier :

- présence des 6 spécimens attendus ;
- présence des textures déclarées ;
- poids maximal configurable ;
- chemins valides ;
- IDs uniques ;
- absence de fichiers de travail lourds dans le bundle de production ;
- dimensions de textures compatibles ;
- licence/provenance documentée dans les métadonnées de catalogue si les assets ne sont pas entièrement originaux.

---

## 27. Sécurité et confidentialité

Surface d’attaque volontairement réduite :

- aucun compte ;
- aucun backend ;
- aucune donnée sensible requise ;
- aucun secret frontend ;
- aucun HTML utilisateur injecté ;
- noms affichés comme texte, jamais interprétés comme HTML ;
- import JSON validé strictement ;
- politique CSP compatible avec les besoins du build lorsque le déploiement le permet.

Les analytics distants ne sont pas nécessaires à la V1.

---

## 28. Déploiement recommandé

Vercel convient parfaitement à la V1 :

```text
GitHub
  │
  ├─ branche / PR → Preview
  │
  └─ main → Production
```

L’application étant statique, aucun service serveur Vercel n’est requis.

Alternative possible : GitHub Pages. Vercel est toutefois préférable si l’on souhaite des previews de PR immédiates et une gestion simple des headers/cache.

---

## 29. Stratégie Git

Recommandation :

```text
main
└─ feature/*
   └─ Pull Request
```

Règles :

- `main` toujours déployable ;
- une PR = un objectif cohérent ;
- assets lourds ajoutés consciemment ;
- aucun merge avec contrôles essentiels rouges ;
- migrations documentées dans le code ;
- les trois documents de référence ne doivent pas être multipliés par des documents concurrents inutiles.

---

## 30. Dépendances : politique de sobriété

Dépendances justifiées V1 :

```text
react
react-dom
three
@react-three/fiber
@react-three/drei
lucide-react (optionnel)
vite-plugin-pwa
```

Développement :

```text
typescript
vite
vitest
eslint
playwright
testing-library ciblé
```

À éviter sans besoin démontré :

- Redux ;
- Zustand uniquement pour éviter quelques props ;
- Tailwind si le design system CSS natif suffit ;
- bibliothèque de composants générique lourde ;
- moteur audio ;
- moteur physique ;
- framework backend ;
- ORM ;
- SDK analytics.

Le produit possède peu d’état métier. React + reducer/context + adapter IndexedDB suffisent en V1.

---

## 31. CSS et design tokens

Utiliser CSS natif avec variables :

```css
:root {
  --color-bg: ...;
  --color-surface: ...;
  --space-1: ...;
  --radius-card: ...;
  --duration-fast: ...;
}
```

Les tokens sont définis dans `src/styles/tokens.css` à partir de la direction artistique.

Pas de valeurs de couleurs éparpillées dans les composants sauf cas 3D explicitement documentés.

---

## 32. Découpage de livraison recommandé

### Phase 0 — Fondation

- Vite/React/TS ;
- lint/typecheck/tests ;
- PWA shell ;
- tokens ;
- état local minimal.

### Phase 1 — Vertical slice

Un seul caillou, une seule ambiance, rendu 3D finalisable :

```text
ouvrir
→ adopter
→ nommer
→ voir
→ tourner
→ fermer
→ revenir
```

Cette phase valide le cœur avant de produire six assets.

### Phase 2 — Produit V1

- 6 spécimens ;
- 5 ambiances ;
- fiche ;
- collection ;
- progression ;
- textes.

### Phase 3 — Finition

- instantané ;
- événements rares ;
- audio ;
- qualité adaptative ;
- offline complet ;
- accessibilité ;
- tests appareils physiques.

### Phase 4 — Release

- audit assets ;
- build production ;
- validation PWA ;
- import/export ;
- test mise à jour ;
- publication V1.0.

---

## 33. Risques techniques principaux

### R1 — Poids des assets 3D

**Risque :** chargement lent et PWA énorme.  
**Réponse :** budgets, lazy loading, compression géométrique, KTX2, pas de 8K inutile.

### R2 — Chauffe et batterie

**Risque :** Canvas permanent à 60 fps pour une scène immobile.  
**Réponse :** frameloop à la demande, DPR borné, qualité adaptative.

### R3 — Rendu différent entre appareils

**Risque :** lumière/matériau superbe sur desktop mais terne sur iPhone.  
**Réponse :** vraie matrice d’appareils physiques et presets robustes.

### R4 — Gestes tactiles conflictuels

**Risque :** tap, rotation, pinch et UI se déclenchent ensemble.  
**Réponse :** couche de contrôles dédiée avec seuils de mouvement et états explicites.

### R5 — Effet « démo Three.js »

**Risque :** techniquement 3D mais visuellement générique.  
**Réponse :** direction photo, lumière, matériau, caméra et ombres traités comme un shooting produit.

### R6 — Surarchitecture

**Risque :** multiplier stores, services, hooks et patterns pour une application simple.  
**Réponse :** domaine pur, reducer clair, une persistance, une scène, peu de dépendances.

---

## 34. Décisions explicitement reportées après V1

- WebGPU comme renderer principal ;
- backend et synchronisation ;
- multijoueur ;
- réalité augmentée ;
- scan 3D utilisateur ;
- génération procédurale de cailloux ;
- shaders complexes spécifiques par GPU ;
- physique avancée ;
- boutique ;
- compte ;
- notifications.

---

## 35. Règle d’architecture finale

> **Le code autour du caillou doit être plus simple que le caillou.**

Si une technologie ne rend pas directement la scène plus belle, l’expérience plus fiable ou le code réellement plus maintenable, elle ne mérite probablement pas d’entrer dans CAILLOU™ V1.
