# Étape 08 — Caresse et économie en Lithons

## Prompt d'exécution

Tu travailles sur CAILLOU™ après adoption/Socle et fondations Supabase. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte le schéma, les RPC/Edge Functions et le Socle réel avant d'agir.

### Objectif

Implémenter la première boucle de jeu complète : l'utilisateur active le mode Caresser, effectue une vraie caresse tactile sur le caillou, et reçoit des **Lithons** persistés de manière autoritaire côté Supabase.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel recommandé pour tests tactiles réels.

### Règles métier

- Monnaie officielle : **Lithon / Lithons**.
- Les Lithons n'ont aucune valeur réelle.
- Ils ne s'achètent pas, ne se transfèrent pas, ne se convertissent pas.
- Une caresse valide crédite la récompense définie dans la doc V1, initialement `+1 Lithon`.
- Aucun bonus quotidien, streak ou sanction d'absence.

### À réaliser

- Définir précisément ce qu'est une caresse valide : geste continu intentionnel, seuils tactiles raisonnables, prévention du spam/clic automatique trivial.
- Le frontend détecte le geste mais ne modifie jamais directement le solde.
- Appeler une mutation serveur idempotente qui vérifie propriétaire, crédite le portefeuille, incrémente les stats et écrit le ledger dans une seule transaction.
- Afficher un feedback discret `+1 Lithon` sans esthétique arcade/casino.
- Afficher le solde à l'endroit prévu par l'UX sans voler la vedette au caillou.
- Gérer retries réseau sans double crédit.
- Tester multi-tap, double requête, session expirée, utilisateur A tentant de créditer le caillou B.
- Prévoir instrumentation minimale de debug sans analytics externe obligatoire.

### Hors périmètre

- Achat d'accessoires.
- Nettoyage.
- Jeter.

### Critères d'acceptation

- Une vraie caresse reconnue crédite exactement la récompense attendue.
- Double requête ne double pas le crédit.
- Le client ne peut pas forger son solde.
- Ledger et solde restent cohérents.
- Stats de caresse mises à jour.
- UX tactile fluide sur mobile/tablette.

### Fin d'étape

PR dédiée. Compléter compte rendu + index et documenter les seuils de détection retenus afin qu'ils soient modifiables plus tard.

## État / compte rendu

**Statut : Terminée**

- Date de clôture : 2026-09-01
- PR / commit de validation : PR #16 ; candidat runtime `cd56f619ecae022c36e80d22f9d09a75f20dd31c`
- Règle de caresse : mode Caresser explicite ; événements captés sur le mesh 3D du caillou ; durée minimale 220 ms ; trajet cumulé minimal 56 px ; déplacement net minimal 28 px ; au moins 4 échantillons ; tap simple rejeté ; rotation OrbitControls suspendue pendant la caresse
- Anti-spam : cooldown technique de 550 ms entre deux événements distincts côté client et côté serveur ; aucun quota quotidien, streak, bonus temporel ou sanction d'absence
- Récompense : exactement `+1 Lithon` par caresse valide ; le frontend n'incrémente jamais le solde de manière optimiste et affiche uniquement le résultat confirmé par Supabase
- Transaction serveur : réutilisation de `public.register_caress(p_user_rock_id, p_event_key)` ; contrôle `auth.uid()`, propriété et caillou actif ; mise à jour atomique de `rock_progress.caress_count`, `interaction_count`, `lithons_generated`, `wallets.balance`, `wallets.lifetime_earned`, écriture `lithon_ledger` et reçu d'idempotence
- Migration Supabase : `20260901085005_harden_caress_rate_guard` ; ajout du garde-fou temporel serveur et de l'index ciblé sur les caresses récentes
- Idempotence / réseau : un retry après réponse réseau perdue réutilise le même `event_key` et retourne le reçu existant sans second crédit
- Tests sécurité/idempotence : test SQL transactionnel réel avec rollback validé ; `+1` exact ; replay identique sans double crédit ; second événement immédiat rejeté ; utilisateur B refusé sur le caillou A ; rôle `anon` sans droit d'exécution ; 0 fixture et 0 ledger de test après rollback
- Tests tactiles : Chrome 151 sur vrai modèle 3D, téléphone 390 × 844 et tablette 1024 × 768 ; tap rejeté ; vraie trajectoire acceptée ; réponse serveur simulée perdue ; retry idempotent ; solde final exactement à 1 Lithon
- Validation automatique : CI #69 verte (lint, typecheck, tests unitaires, build production), adoption E2E #10 verte, caresse/Lithon E2E #4 verte, showroom WebGL + téléphone/tablette #20 vert
- Vercel Preview : une seule Preview volontairement déclenchée après stabilisation ; déploiement `dpl_EoBgQUYuZvms3ywdWGfz4mHLUL7y` en état `READY` sur `preview/08-caress-lithons` ; commit Preview `ee54d3717bd3fa7dceab4ac380607452f8619b66` avec arbre strictement identique au candidat runtime
- UX : solde Lithon compact avec icône `Gem`, feedback sobre `+1 Lithon`, Bio / Stats alimentée par les valeurs Supabase ; Nettoyer, Accessoire et Jeter restent hors périmètre et désactivés
- Advisors Supabase : aucune nouvelle alerte de sécurité introduite par l'étape ; avertissement Auth préexistant sur la protection contre les mots de passe compromis ; informations d'index inutilisés non bloquantes
- Dette : aucune dette bloquante pour l'étape 08 ; les seuils de geste sont centralisés et modifiables ; nettoyage, boutique/accessoires et action Jeter restent volontairement aux étapes suivantes
- Étape suivante recommandée : 09 — Nettoyage et poussière cosmétique
