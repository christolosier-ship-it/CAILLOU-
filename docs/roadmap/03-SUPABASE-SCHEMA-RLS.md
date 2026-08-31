# Étape 03 — Supabase : schéma, RLS et contrats métier

## Prompt d'exécution

Tu travailles sur `christolosier-ship-it/CAILLOU-` après les fondations frontend. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte GitHub et Supabase avant toute modification.

### Objectif

Créer la fondation backend autoritaire de CAILLOU™ dans Supabase : projet, migrations, schéma de données, contraintes, RLS, RPC/transactions nécessaires et types TypeScript. Aucun écran métier complet n'est attendu ici.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel seulement si les variables d'environnement doivent être préparées.

### Modèle à couvrir

Au minimum :
- `profiles` ;
- catalogue de spécimens ou stratégie de catalogue explicitement tranchée ;
- `user_rocks` avec historique d'adoption et `discarded_at` ;
- statistiques du caillou ;
- portefeuille de Lithons ;
- ledger immuable des mouvements de Lithons ;
- catalogue d'accessoires ;
- possessions et équipement d'accessoires ;
- informations nécessaires au nettoyage cosmétique.

### À réaliser

- Créer le projet Supabase CAILLOU™ si nécessaire en respectant les contraintes de plan/coût du compte.
- Écrire les migrations versionnées dans le repo.
- Définir PK, FK, uniques, checks et index utiles.
- Activer RLS sur toutes les tables utilisateur.
- Les données d'un utilisateur ne doivent être accessibles qu'à lui, sauf catalogues publics en lecture.
- Le solde de Lithons ne doit jamais être modifiable directement par le client.
- Préparer les opérations transactionnelles autoritaires nécessaires aux futures étapes : adoption, crédit Lithon, achat, jeter, équipement.
- Prévoir idempotence sur les mutations sensibles.
- Générer/mettre à jour les types TypeScript Supabase.
- Exécuter les advisors sécurité/performance et corriger les alertes pertinentes.

### Hors périmètre

- UX d'inscription.
- Détection des caresses.
- Boutique visuelle.
- Showroom 3D.

### Critères d'acceptation

- Migrations reproductibles.
- RLS testée avec cas utilisateur A / utilisateur B / anonyme.
- Impossible de s'auto-créditer des Lithons depuis le client.
- Contraintes empêchent les états métier manifestement incohérents.
- Types TS générés.
- Advisors sans problème critique non expliqué.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Toute décision de schéma qui change l'architecture doit aussi mettre à jour `ARCHITECTURE-TECHNIQUE.md`.

## État / compte rendu

**Statut : À faire**

- Date :
- Projet Supabase :
- PR / commit :
- Migrations :
- RLS / tests :
- Advisors :
- Décisions :
- Dette :
- Étape suivante recommandée : 04
