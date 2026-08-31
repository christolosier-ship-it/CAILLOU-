# Étape 07 — Adoption, nommage et Socle

## Prompt d'exécution

Tu travailles sur CAILLOU™ après les étapes Auth et Showroom. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte GitHub, Supabase et la Preview réelle avant toute modification.

### Objectif

Relier le premier parcours complet : utilisateur connecté → choix d'un spécimen → nommage → adoption persistée dans Supabase → arrivée sur le Socle principal.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel recommandé pour E2E mobile.

### À réaliser

- Implémenter la mutation d'adoption côté serveur selon les contrats de l'étape 03.
- Empêcher les doublons/états incohérents en cas de double tap ou retry réseau.
- Écran de nommage simple, premium, accessible.
- Validation raisonnable du nom du caillou.
- Enregistrer spécimen, nom, date d'adoption et état actif dans Supabase.
- Après adoption, router vers le Socle.
- Construire le Socle sobre : caillou central 3D manipulable, Bio/Stats en haut à gauche, slot futur en haut à droite, quatre commandes en bas : Caresser, Nettoyer, Accessoire, Jeter.
- Les quatre commandes peuvent être partiellement inactives tant que leurs étapes dédiées ne sont pas réalisées, mais leur état doit paraître volontaire.
- Au reload/reconnexion, retrouver le bon caillou et son nom depuis Supabase.
- Prévoir le cas utilisateur connecté sans caillou actif.

### Hors périmètre

- Crédit Lithon réel.
- Nettoyage fonctionnel.
- Boutique fonctionnelle.
- Jeter fonctionnel.

### Critères d'acceptation

- Parcours inscription/connexion → showroom → choix → nom → Socle fonctionnel.
- Adoption persistée serveur et idempotente.
- Reload conserve le bon état.
- Socle conforme à l'architecture UI cible.
- Aucune donnée métier essentielle uniquement en local.

### Fin d'étape

PR dédiée, compte rendu + index. Ajouter un E2E du premier parcours critique.

## État / compte rendu

**Statut : À faire**

- Date :
- PR / commit :
- Mutation adoption :
- E2E :
- Socle :
- Dette :
- Étape suivante recommandée : 08
