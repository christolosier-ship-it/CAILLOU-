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

**Statut : À faire**

- Date :
- PR / commit :
- Réalisé :
- Décisions prises :
- Tests :
- Écarts / dette :
- Étape suivante recommandée : 02
