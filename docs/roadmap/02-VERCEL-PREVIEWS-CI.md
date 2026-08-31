# Étape 02 — Vercel, previews et garde-fous CI

## Prompt d'exécution

Tu travailles sur `christolosier-ship-it/CAILLOU-` après validation de l'étape 01.

Lis d'abord `docs/roadmap/00-INDEX-ROADMAP.md`, le présent fichier et les quatre documents de référence de la racine. Inspecte l'état réel de GitHub et Vercel avant toute action.

### Objectif

Connecter proprement CAILLOU™ à Vercel pour obtenir une boucle courte et fiable : branche/PR → Preview, `main` → Production, avec contrôles de build simples et utiles.

### Plugins

- GitHub obligatoire.
- Vercel obligatoire.

### À réaliser

- Créer ou relier le projet Vercel CAILLOU™ au repo GitHub.
- Vérifier framework preset, build command, output directory et version Node.
- Configurer les environnements Preview et Production sans ajouter de secret inutile.
- Vérifier qu'une PR produit une Preview exploitable sur téléphone/tablette.
- Définir les contrôles GitHub essentiels : install, typecheck, tests rapides, build.
- Éviter les suites lourdes ou redondantes avec Vercel.
- Documenter les variables d'environnement attendues sans jamais committer de secret.
- Vérifier qu'un échec de build est lisible et actionnable.

### Hors périmètre

- Création du schéma Supabase.
- Authentification.
- Fonctions métier.
- Optimisation fine des assets 3D.

### Critères d'acceptation

- Projet Vercel lié au bon repo.
- Preview de PR fonctionnelle.
- Production issue de `main` fonctionnelle.
- Aucun secret exposé dans GitHub.
- Contrôles CI essentiels verts et non redondants.
- `main` reste déployable.

### Fin d'étape

Travailler par PR si des fichiers du repo changent. Compléter le compte rendu et l'index maître.

## État / compte rendu

**Statut : Terminée — PR #5 fusionnée**

- Date : 31 août 2026.
- Projet Vercel : `caillou` — `prj_s7mALANJeRy7DM7qq4umXnYobuz1`, lié à `christolosier-ship-it/CAILLOU-`, framework Vite.
- PR / commit : PR #5 fusionnée dans `main` — merge `8d5a91f61ab81e6d6bc8b660a491c8565c4f7c28`.
- Réalisé : Node fixé à `22.x` dans `package.json`; `vercel.json` explicite avec `npm run build` et sortie `dist`; CI GitHub minimale avec étapes séparées install/lint/typecheck/tests/build; variables frontend futures documentées dans `.env.example`; aucune variable requise ni aucun secret ajouté à Vercel pour cette étape.
- Tests / previews : CI GitHub verte sur PR #5 et verte sur le merge `main`; Vercel Preview Git générée automatiquement pour la PR, état `READY`, statut GitHub `Vercel: success`; build Vercel confirme Node 22 malgré le réglage projet 24.x, Vite 8.2.2, génération `manifest.webmanifest`, `sw.js` et Workbox; aucun runtime error Vercel observé. La protection SSO Vercel empêche le connecteur de réaliser une visite visuelle anonyme de la Preview, mais le build et le déploiement Git sont validés.
- Production : déploiement Git `dpl_4j2Gww3zeU7RcPRRSt2P8GoqXbm9` issu de `main` / merge `8d5a91f` validé `READY`; aliases actifs `caillou-sigma.vercel.app`, `caillou-christo5.vercel.app` et `caillou-git-main-christo5.vercel.app`.
- Écarts / dette : `package-lock.json` reste absent; un bootstrap de lockfile a été validé mais l'auto-commit par workflow a été refusé par le garde-fou de sécurité, sans contournement. Warning transitif npm `glob@11.1.0` et warning de chunk 3D ~301,5 kB gzip déjà connus; aucune optimisation forcée à cette étape.
- Supabase : projet `CAILLOU-` vérifié sain et volontairement inchangé.
- Étape suivante recommandée : 03.
