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

**Statut : Terminée — PR #32, candidat final validé 8/8 sur GitHub, Supabase validé et Preview Vercel validée**

- Date : 2026-09-03.
- PR : #32 `feat: Bio, Stats et Jeter — étape 11`.
- Candidat runtime : `9ba2b41f762309c366a76b78686a7949af92dfe6`.
- Candidat fonctionnel final avant documentation : `d8f409c1080f037e62fc29b023a8280227b8c95e`. Les deux commits placés après le candidat runtime ne modifient que ce compte rendu Markdown et le validateur Adoption ; aucun fichier runtime n'a changé après `9ba2b41f762309c366a76b78686a7949af92dfe6`.
- Bio/Stats : lecture des sources Supabase fiables `wallets`, `rock_progress`, `user_accessories`, `equipped_accessories` et `user_feature_unlocks`; `observation_seconds` volontairement absent tant qu'il n'est pas alimenté de manière autoritaire.
- Accessoires possédés/équipés : propriété au compte et instances placées comptées séparément.
- Déblocages permanents : lus indépendamment et Permis de manutention minérale affiché sans nouveau parcours d'achat.
- Mutation Jeter : réutilisation de `discard_active_rock`; confirmation explicite, disparition visuelle immédiate et retry idempotent avec le même `event_key` lorsque la réponse réseau est incertaine.
- Règle instances du caillou jeté : déséquipement logique des `equipped_accessories`; les propriétés `user_accessories`, le portefeuille, les déblocages et `rock_progress` sont conservés.
- État vide : écran sobre post-discard avec CTA `Adopter un nouveau caillou`; le routing distingue jamais adopté, historique sans caillou actif et caillou actif.
- Non-régression 10.75 : l'intégration est isolée dans `Step11Pedestal`; `Pedestal.tsx`, PlacementSession, Boutique et Rapier ne sont pas refactorés par cette étape.
- Tests Supabase : transaction réelle avec `ROLLBACK`; deux appels avec le même `event_key` ont retourné le même `discarded_at`; après discard transactionnel l'instance équipée était retirée, tandis que solde, quatre acquisitions, déblocage et progression restaient inchangés; rollback confirmé.
- Supabase final : projet `ACTIVE_HEALTHY`; aucun nouveau lint sécurité lié à l'étape 11. Seul l'avertissement Auth historique `Leaked Password Protection Disabled` reste présent. Les avis performance restants sont uniquement des `unused_index` de niveau INFO.
- Validation GitHub finale sur `d8f409c1080f037e62fc29b023a8280227b8c95e` : **8/8 workflows verts** — CI #283, Adoption #188, Caresse/Lithons #182, Nettoyage #177, Mouvement/physique #134, Multi-accessoires #157, Boutique/Placement #114 et Bio/Stats/Jeter #4.
- Correction QA finale : le validateur Adoption historique attendait encore Jeter désactivé selon le contrat 10.75. Il a été réaligné sur le contrat post-étape-11 : Caresser, Boutique et Jeter actifs après adoption, Nettoyer encore inactif, Placement et Bio toujours validés.
- Incident GitHub Actions : les premiers runs ne recevaient aucun runner (`steps: []`, `runner_id: 0`). Après passage du dépôt en public, les runners standards `ubuntu-latest` ont été alloués normalement et la matrice officielle a terminé 8/8 au vert. Aucun contournement des contrôles n'a été utilisé.
- Validation Vercel : Preview `dpl_E2u2mvADfUHJrJ5rN7LRaRGqDV71` sur le SHA runtime `9ba2b41f762309c366a76b78686a7949af92dfe6`, état `READY`, build `tsc -b && vite build` réussi et aucune runtime error observée au contrôle final. Les commits suivants étant uniquement documentation/QA, aucun second déploiement runtime n'était nécessaire.
- Migration Supabase : aucune migration supplémentaire requise pour l'étape 11 ; le RPC existant `discard_active_rock` fournit déjà le contrat autoritaire attendu.
- Dette : `observation_seconds` reste volontairement non affiché tant qu'une instrumentation serveur fiable n'existe pas. L'avertissement Auth sur la protection des mots de passe compromis reste une dette sécurité globale hors périmètre de cette étape.
- Étape suivante : 12 — PWA, cache, reprise réseau et résilience.
