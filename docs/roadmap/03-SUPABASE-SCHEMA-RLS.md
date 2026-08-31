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

**Statut : Terminée — PR #7 fusionnée**

- Date : 31 août 2026.
- Projet Supabase : `CAILLOU-` — ref `zibhzhpvtiplbkhioqco`, région `eu-west-1`, PostgreSQL 17, projet sain.
- PR / commit : PR #7 `feat: poser le backend autoritaire Supabase` — branche `feature/03-supabase-schema-rls`; socle fonctionnel validé au commit `d837cebfd75d30cbb6f7451335a07d97a7db4c9c` avant clôture documentaire.
- Migrations : `20260831200423_foundation_schema_rls_contracts`, `20260831200434_seed_rock_catalog`, puis correction additive `20260831200602_fix_equip_accessory_conflict_target`. Les trois migrations réellement appliquées sont versionnées dans `supabase/migrations/`.
- Schéma : neuf tables publiques avec RLS (`profiles`, `rock_catalog`, `user_rocks`, `rock_progress`, `wallets`, `accessories`, `user_accessories`, `equipped_accessories`, `lithon_ledger`) plus `private.mutation_receipts` pour l'idempotence. Contraintes côté Postgres sur les compteurs, la comptabilité du wallet, le format des IDs, les FK et l'unicité d'un seul caillou actif par utilisateur.
- Contrats autoritaires : RPC `adopt_rock`, `register_caress`, `register_cleaning`, `purchase_accessory`, `discard_active_rock` et `equip_accessory`. Les implémentations privilégiées sont dans le schéma privé, en `security definer` avec `search_path` vide; les fonctions publiques sont des wrappers `security invoker`. Chaque mutation sensible exige un `event_key` et rejoue le résultat déjà enregistré en cas de retry.
- RLS / tests : scénario transactionnel reproductible dans `supabase/tests/03_rls_contracts.sql` avec utilisateur A, utilisateur B et anonyme. Isolation A/B validée; accès anonyme limité aux catalogues actifs; second caillou actif refusé; caresse et nettoyage idempotents; achat, équipement et jet validés; modification directe du wallet et insertion directe dans le ledger refusées. Le test termine par `ROLLBACK` et a laissé 0 profil, 0 caillou utilisateur, 0 accessoire de test et 0 spécimen actif de test.
- Types : types Supabase générés et versionnés dans `src/lib/supabase/database.types.ts`; lint et typecheck passent avec ces types.
- Advisors : sécurité = 0 lint. Performance = uniquement des `INFO` `unused_index`, attendues sur une base sans trafic; les index sont conservés car ils couvrent les futures FK, RLS, catalogues et historiques.
- Catalogue : les vingt IDs stables `rock-001` à `rock-020` sont créés avec `active = false`. Ils ne seront activés qu'après publication et validation des vrais GLB à l'étape 05, afin qu'aucune adoption ne pointe vers un asset inexistant.
- Vercel : aucun secret ni variable runtime ajouté. Les déploiements Git automatiques sont désormais désactivés par défaut; seuls `main` et les branches explicitement nommées `preview/**` sont autorisés à créer un déploiement. Un `Ignored Build Step` reste en complément pour éviter un build lorsqu'un commit non-runtime arrive sur une branche autorisée. Pendant la mise au point, une première valeur `ignoreCommand` trop longue a créé deux objets `ERROR` avant build; après correction, le Preview `dpl_3whkff8C2DVWArwNWYFgtWAzUpVT` a été validé `READY`. Un commit documentaire de contrôle a ensuite été correctement interrompu avant `vercel build`, mais créait encore un objet `CANCELED`, ce qui a motivé le filtrage Git plus strict afin de protéger la limite Hobby de 100 déploiements créés par 24 h.
- Validation GitHub : CI PR #7 verte sur install, lint, typecheck, tests unitaires et build de production. Preview Vercel fonctionnel vert; warning de chunk 3D déjà connu et inchangé.
- Décisions : le navigateur reste non autoritaire sur l'économie; aucune écriture directe n'est accordée aux rôles client sur wallet, ledger, progression économique, inventaire ou équipement. Le schéma cible des documents d'architecture est respecté; aucun changement de `ARCHITECTURE-TECHNIQUE.md` n'est requis. Pour Vercel, une Preview n'est désormais demandée que lorsqu'elle apporte une valeur réelle, via une branche `preview/**` préparée à cet effet.
- Dette : contenu final du catalogue de roches et activation à l'étape 05; catalogue réel des accessoires à l'étape 10; broker Auth pseudo/mot de passe à l'étape 04. La dette `package-lock.json` de l'étape 02 reste indépendante de cette étape.
- Étape suivante recommandée : 04.
