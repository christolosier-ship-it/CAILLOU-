# Étape 11 — Bio, statistiques et action Jeter

## Prompt d'exécution

Tu travailles sur CAILLOU™ **après clôture de l'étape 10.75**, donc après adoption, Lithons, nettoyage, accessoires 10A–10D, manutention 10.5, Boutique unifiée et Placement universel. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte Supabase, le Socle réel et les contrats de 10.75 avant d'agir.

### Objectif

Finaliser les fonctions de gestion du compagnon : Bio/Stats accessible en haut à gauche et action Jeter avec confirmation, disparition immédiate et conservation historique côté Supabase.

Cette étape ne doit pas redessiner la Boutique ou Placement livrés par 10.75.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel recommandé pour validation UX lorsqu'une Preview apporte une preuve utile.

### Bio / Stats

Afficher des informations fiables et des statistiques absurdes clairement humoristiques : nom, spécimen, date d'adoption, ancienneté, caresses, nettoyages, Lithons gagnés/dépensés si pertinent, accessoires possédés, accessoires actuellement équipés, Permis de manutention minérale acquis ou non, temps d'observation si fiable, et indicateurs éditoriaux CAILLOU™.

Pour les données de composition, distinguer clairement :

- la **propriété au compte** (`user_accessories`) ;
- les **déblocages permanents au compte** (`user_feature_unlocks`) ;
- les **instances placées sur ce caillou** ;
- la pose persistante/stabilisée du caillou et des instances lorsque cette information a une utilité réelle pour la Bio.

Ne jamais présenter une donnée fantaisiste comme une mesure scientifique réelle.

### Action Jeter

- Bouton en bas du Socle.
- Confirmation explicite avec ton sec et sérieux.
- Après confirmation, le caillou **disparaît immédiatement**. Pas d'animation de lancer, chute ou drame.
- Côté Supabase, marquer le compagnon comme jeté via `discarded_at` ou équivalent ; ne pas effacer l'historique utile.
- Le compte, les Lithons, les accessoires appartenant au compte et les déblocages permanents sont conservés.
- Les instances d'accessoires équipées sur le caillou jeté ne doivent pas devenir des orphelins métier. Définir et appliquer une règle explicite : conservation historique liée au `user_rock_id` jeté ou déséquipement logique, sans perdre la propriété au compte.
- Après l'action, afficher un état vide sobre avec CTA pour adopter un nouveau caillou.
- La mutation doit être idempotente et protégée par RLS/transaction.

### Placement et Boutique hérités de 10.75

Ne pas réintroduire l'ancien slot supérieur droit ni deux parcours de manipulation séparés.

L'étape 11 doit préserver :

- le bouton **Placement** unique ;
- le sélecteur caillou / instances ;
- la Boutique unifiée ;
- le Permis de manutention minérale acheté dans la Boutique ;
- la distinction Boutique = acquérir / Placement = manipuler ;
- la liberté d'intersection pendant Placement ;
- le carré gris infranchissable ;
- la reprise Rapier à `Terminer`.

Bio et Jeter ne doivent pas créer de conflit de mode avec Placement, Caresser ou Nettoyer.

### Critères d'acceptation

- Bio/Stats cohérentes avec la source Supabase.
- Statistiques correctement mises à jour par les étapes précédentes.
- Propriétés, déblocages et instances sont comptés sans confusion.
- Le statut du Permis peut être affiché sans créer un nouveau parcours d'achat.
- Jeter demande confirmation puis fait disparaître le caillou sans animation.
- Historique conservé, aucun orphelin métier y compris côté accessoires équipés.
- Accessoires achetés et déblocages permanents restent acquis au compte après Jeter.
- Reload après jeter ne ressuscite pas le caillou.
- CTA nouvelle adoption fonctionnel.
- Boutique et Placement 10.75 ne régressent pas.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Toute statistique non fiable doit être retirée plutôt que simulée silencieusement.

## État / compte rendu

**Statut : À faire**

- Date :
- PR / commit :
- Bio/Stats :
- Accessoires possédés/équipés :
- Déblocages permanents :
- Mutation Jeter :
- Règle instances du caillou jeté :
- État vide :
- Non-régression 10.75 :
- Tests :
- Dette :
- Étape suivante recommandée : 12
