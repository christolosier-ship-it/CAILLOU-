# Étape 11 — Bio, statistiques et action Jeter

## Prompt d'exécution

Tu travailles sur CAILLOU™ après adoption, Lithons, nettoyage et le jalon accessoires 10A–10D. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte Supabase et le Socle réel avant d'agir.

### Objectif

Finaliser les fonctions de gestion du compagnon : Bio/Stats accessible en haut à gauche et action Jeter avec confirmation, disparition immédiate et conservation historique côté Supabase.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel recommandé pour validation UX.

### Bio / Stats

Afficher des informations fiables et des statistiques absurdes clairement humoristiques : nom, spécimen, date d'adoption, ancienneté, caresses, nettoyages, Lithons gagnés/dépensés si pertinent, accessoires possédés, accessoires actuellement équipés, temps d'observation si fiable, et indicateurs éditoriaux CAILLOU™.

Pour les accessoires équipés, distinguer clairement :

- la **propriété au compte** (`user_accessories`) ;
- les **instances placées sur ce caillou** et leur état persistant issu du jalon 10C/10D.

Ne jamais présenter une donnée fantaisiste comme une mesure scientifique réelle.

### Action Jeter

- Bouton en bas du Socle.
- Confirmation explicite avec ton sec et sérieux.
- Après confirmation, le caillou **disparaît immédiatement**. Pas d'animation de lancer, chute ou drame.
- Côté Supabase, marquer le compagnon comme jeté via `discarded_at` ou équivalent ; ne pas effacer l'historique utile.
- Le compte, les Lithons et les accessoires appartenant au compte sont conservés.
- Les instances d'accessoires équipées sur le caillou jeté ne doivent pas devenir des orphelins métier. Définir et appliquer une règle explicite : conservation historique liée au `user_rock_id` jeté ou déséquipement logique, sans perdre la propriété au compte.
- Après l'action, afficher un état vide sobre avec CTA pour adopter un nouveau caillou.
- La mutation doit être idempotente et protégée par RLS/transaction.

### Slot haut droite

Conserver l'emplacement prévu pour une fonction future. S'il est interactif, il doit afficher un état volontaire du type `Fonction en réflexion` plutôt que sembler cassé.

### Critères d'acceptation

- Bio/Stats cohérentes avec la source Supabase.
- Statistiques correctement mises à jour par les étapes précédentes.
- Les possessions et instances d'accessoires sont comptées sans confusion.
- Jeter demande confirmation puis fait disparaître le caillou sans animation.
- Historique conservé, aucun orphelin métier y compris côté accessoires équipés.
- Les accessoires achetés restent acquis au compte après Jeter.
- Reload après jeter ne ressuscite pas le caillou.
- CTA nouvelle adoption fonctionnel.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Toute statistique non fiable doit être retirée plutôt que simulée silencieusement.

## État / compte rendu

**Statut : À faire**

- Date :
- PR / commit :
- Bio/Stats :
- Accessoires possédés/équipés :
- Mutation Jeter :
- Règle instances du caillou jeté :
- État vide :
- Tests :
- Dette :
- Étape suivante recommandée : 12
