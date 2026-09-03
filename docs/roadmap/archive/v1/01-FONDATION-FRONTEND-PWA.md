# Étape 01 — Fondation frontend et PWA

## Prompt d'exécution

Tu travailles sur `christolosier-ship-it/CAILLOU-`.

Avant toute modification, lis intégralement :
- `docs/roadmap/00-INDEX-ROADMAP.md` ;
- `CAHIER-DES-CHARGES-V1.md` ;
- `ARCHITECTURE-TECHNIQUE.md` ;
- `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md` ;
- `WORKFLOW-3D-BLENDER-GITHUB.md`.

Inspecte ensuite l'état réel du dépôt. N'utilise pas l'historique d'une autre conversation comme source de vérité.

### Objectif

Créer le socle applicatif CAILLOU™ sans encore implémenter les fonctions métier finales : React, TypeScript, Vite, React Three Fiber, PWA, structure de dossiers, design tokens, qualité de code et tests minimaux.

### Plugins

- GitHub obligatoire.
- Vercel et Supabase non requis pour cette étape sauf vérification ponctuelle explicitement utile.

### À réaliser

- Bootstrap React + TypeScript + Vite selon les versions de référence du document d'architecture.
- Installer uniquement les dépendances prévues et justifiées.
- Créer l'arborescence `src/app`, `src/domain`, `src/scene`, `src/features`, `src/persistence`, `src/pwa`, `src/styles`, `src/utils` et `public/assets` selon besoin réel.
- Installer/configurer `@react-three/fiber`, `three`, `@react-three/drei`, `vite-plugin-pwa`.
- Intégrer les tokens visuels initiaux du design system.
- Créer un shell responsive téléphone/tablette/desktop très sobre, sans faux dashboard.
- Créer un Canvas 3D minimal de validation sans inventer l'UX finale du showroom.
- Mettre en place lint, typecheck, Vitest et scripts npm cohérents.
- Ajouter les bases du manifest PWA et icônes temporaires uniquement si nécessaires, clairement marquées comme provisoires.
- Vérifier build production et absence d'erreurs console bloquantes.

### Hors périmètre

- Authentification.
- Schéma Supabase.
- Showroom complet.
- Lithons.
- Accessoires.
- Bio/stats.
- Export des 20 GLB.

### Critères d'acceptation

- `npm install` puis build fonctionnent.
- Typecheck et tests de base sont verts.
- L'application démarre sur mobile et desktop.
- Le Canvas 3D minimal s'affiche sans erreur.
- Le manifest PWA est valide.
- L'arborescence respecte la séparation domaine/UI/3D.
- Aucun backend inutile n'est introduit.

### Fin d'étape

Travailler par PR. Après validation, compléter `État / compte rendu` ci-dessous et mettre le statut de l'étape à jour dans `00-INDEX-ROADMAP.md`.

## État / compte rendu

**Statut : Prête à fusionner**

- Date : 31 août 2026.
- PR / commit : PR #4 `feat: poser la fondation frontend PWA CAILLOU` ; socle applicatif validé au commit `acb1b47f285bfc3c4f36dfefe8abb23bfa2e8ca7` avant retrait du workflow de validation temporaire.
- Réalisé : bootstrap React 19 + TypeScript 6 + Vite 8 ; React Three Fiber 9, Three.js et Drei ; PWA via `vite-plugin-pwa` ; manifest et service worker ; icônes provisoires 192/512 ; arborescence app/domaine/scène/features/persistence/PWA/styles/utils ; design tokens ; shell responsive sobre ; Canvas 3D procédural minimal ; ESLint, typecheck strict, Vitest et script `npm run check`.
- Décisions prises : aucune fonctionnalité métier anticipée ; aucun client Supabase ni schéma ajouté ; aucun projet Vercel créé ; objet 3D de validation explicitement provisoire ; `frameloop="demand"` utilisé ; aucun GLB de production précaché ; TypeScript maintenu sur la majeure 6 conformément à l'architecture malgré l'existence de TypeScript 7.
- Tests : validation temporaire GitHub Actions sous Node 22, ensuite retirée du diff afin de réserver la CI définitive à l'étape 02. `npm install --no-audit --no-fund` OK ; lint OK ; typecheck OK ; Vitest 2 fichiers / 4 tests verts ; build Vite 8.2.2 OK ; `manifest.webmanifest`, `sw.js` et Workbox générés par PWA 1.3.0.
- Écarts / dette : l'avertissement Vite sur la configuration a été corrigé. Le bundle 3D reste volontairement non optimisé à ce stade : environ 1,10 Mo minifié / 301,5 ko gzip et avertissement de chunk > 500 ko ; à mesurer puis découper avec le showroom réel plutôt que masquer le seuil. Les icônes PWA restent provisoires. La validation visuelle via Preview Vercel et sur appareils physiques est reportée à l'étape 02. `npm install` signale une dépréciation transitive `glob@11.1.0`, non bloquante, à réévaluer lors du verrouillage de la chaîne d'installation. Aucun `package-lock.json` n'est encore versionné ; l'étape 02 devra trancher ce point avant de retenir `npm ci` pour la CI définitive.
- Étape suivante recommandée : 02, après fusion de la PR #4.
