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

**Statut : À faire**

- Date :
- Projet Vercel :
- PR / commit :
- Réalisé :
- Tests / previews :
- Écarts / dette :
- Étape suivante recommandée : 03
