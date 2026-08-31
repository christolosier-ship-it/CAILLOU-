# Étape 10 — Accessoires et boutique Lithons

## Prompt d'exécution

Tu travailles sur CAILLOU™ après l'économie Lithons. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte le schéma Supabase, le portefeuille, le ledger, le renderer et les assets réels avant d'agir.

### Objectif

Livrer une boutique simple d'accessoires cosmétiques achetables uniquement avec des Lithons, avec acquisition et équipement persistants côté Supabase.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel recommandé pour Preview mobile.

### Règles métier

- Aucun achat en argent réel en V1.
- Aucun loot box, rareté agressive ou mécanique aléatoire.
- Prix fixe en Lithons.
- Les accessoires déjà achetés restent acquis au compte.
- Un achat est autoritaire et transactionnel côté serveur.

### À réaliser

- Définir un premier catalogue limité d'accessoires cohérents avec la direction artistique.
- Pour chaque accessoire : ID stable, nom, description, prix, type, asset, compatibilité et métadonnées utiles.
- Construire l'UI Boutique/Accessoires depuis la commande du Socle.
- Afficher solde, prix, état possédé et état équipé sans esthétique casino.
- Implémenter l'achat atomique : vérifier prix/solde côté serveur, débiter le portefeuille, écrire le ledger et créer la possession dans une seule transaction.
- Rendre l'achat idempotent et impossible à dupliquer par double tap/retry.
- Implémenter équiper/déséquiper.
- Intégrer les accessoires au renderer sans casser les 20 cailloux.
- Tester utilisateur A/B, solde insuffisant, achat déjà possédé et concurrence de requêtes.

### Hors périmètre

- Paiement réel.
- Marketplace entre utilisateurs.
- Cadeaux/transferts.
- Catalogue massif.

### Critères d'acceptation

- Achat impossible sans solde suffisant.
- Aucun débit sans possession correspondante et inversement.
- Ledger cohérent.
- Double achat impossible.
- Équipement persistant.
- Accessoires visuellement cohérents et performants.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Si le catalogue évolue en cours de route, documenter les choix sans surcharger la V1.

## État / compte rendu

**Statut : À faire**

- Date :
- PR / commit :
- Catalogue initial :
- Transaction achat :
- Équipement :
- Tests :
- Dette :
- Étape suivante recommandée : 11
