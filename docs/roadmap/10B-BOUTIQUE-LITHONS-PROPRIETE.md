# Étape 10B — Boutique Lithons et propriété des accessoires

## Prompt d'exécution

Tu travailles sur CAILLOU™ après 10A. Lis `docs/roadmap/00-INDEX-ROADMAP.md`, `docs/roadmap/10-ACCESSOIRES-BOUTIQUE-LITHONS.md`, `docs/roadmap/10A-PIPELINE-ACCESSOIRES-3D-CATALOGUE.md`, ce fichier et les quatre documents normatifs. Inspecte le schéma Supabase réel, le portefeuille, le ledger, le catalogue d'accessoires produit en 10A et l'UI du Socle avant d'agir.

### Objectif

Livrer une boutique sobre d'accessoires cosmétiques achetables uniquement avec des Lithons, avec acquisition permanente au compte et achat entièrement autoritaire côté Supabase.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel recommandé uniquement pour la validation UX finale de l'étape.

### Règles métier

- Aucun achat en argent réel en V1.
- Aucun loot box, rareté agressive ou mécanique aléatoire.
- Prix fixe en Lithons.
- Les accessoires déjà achetés restent acquis au compte.
- Jeter un caillou ne supprime pas les possessions du compte.
- Un achat est transactionnel, idempotent et autoritaire côté Supabase.
- Le client ne peut ni imposer le prix, ni fabriquer un achat réussi, ni débiter directement le wallet.

### À réaliser

- Aligner le catalogue commercial `accessories` sur les assets réels validés en 10A.
- Pour chaque accessoire : ID stable, nom, description, prix, asset path, preview, ordre et métadonnées utiles.
- Construire l'UI Boutique/Accessoires depuis la commande du Socle.
- Afficher solde, prix, possédé/non possédé et aperçu sans esthétique casino.
- Implémenter l'achat atomique côté Supabase : vérifier accessoire actif, prix serveur et solde ; débiter wallet ; écrire `lithon_ledger` ; créer `user_accessories` dans une seule transaction.
- Rendre l'achat idempotent via une clé d'événement et robuste au double tap/retry/concurrence.
- Refuser proprement solde insuffisant, asset inactif, achat déjà possédé et utilisateur non autorisé.
- Préparer l'entrée vers le mode d'équipement sans imposer encore les interactions 3D de 10C.
- Préserver les règles RLS utilisateur A/B.

### Contrat de propriété

`user_accessories` représente la propriété permanente d'un type d'accessoire par le compte. Cette table est distincte des futures **instances équipées** créées en 10C.

Le fait d'acheter une couronne signifie que l'utilisateur possède le type `crown`. Le placement de cette couronne sur un caillou est une autre donnée et ne doit pas être confondu avec la transaction d'achat.

### Hors périmètre

- Placement libre 3D.
- Plusieurs instances équipées.
- Collisions et gravité.
- Paiement réel.
- Marketplace, cadeaux, transferts.

### Critères d'acceptation

- Achat impossible sans solde suffisant.
- Prix impossible à falsifier côté client.
- Aucun débit sans possession correspondante et inversement.
- Ledger cohérent.
- Double achat impossible.
- Propriété persistante au compte.
- Jeter un caillou n'efface pas une possession.
- UI sobre et cohérente avec la direction artistique.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Une seule Preview Vercel volontaire après stabilisation si la validation UX réelle l'exige.

## État / compte rendu

**Statut : Terminée — PR #20**

- Date : 2026-09-01
- PR / commit : [PR #20](https://github.com/christolosier-ship-it/CAILLOU-/pull/20) — boutique et achat autoritaire
- Catalogue commercial : `monocle`, 90 Lithons, preview/GLB licenciés, métadonnées placement et physique alignées sur 10A
- Transaction achat : RPC `purchase_accessory(accessory_id, event_key)` ; prix serveur, verrou wallet, possession, débit et ledger atomiques
- RLS/idempotence : writes directs révoqués, anon refusé, isolation A/B, reçu exact au retry et propriété unique par compte/type
- UI Boutique : catalogue institutionnel responsive, solde/prix/acquis, feedback accessible, aucun argent réel ni mécanique casino
- Tests : migration live, contrat SQL rollback complet, Security Advisor sans nouvelle alerte, `npm run check` (35 tests), revue React
- Dette : validation tactile réelle sur la Preview finale ; le placement 3D appartient à 10C
- Étape suivante recommandée : 10C
