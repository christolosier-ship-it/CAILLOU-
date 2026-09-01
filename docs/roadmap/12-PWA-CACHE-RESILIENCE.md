# Étape 12 — PWA, cache, reprise réseau et résilience

## Prompt d'exécution

Tu travailles sur CAILLOU™ après implémentation des fonctions principales, y compris le jalon accessoires 10A–10D. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte le comportement réel de l'app, Supabase et Vercel avant toute modification.

### Objectif

Rendre CAILLOU™ robuste comme PWA : démarrage rapide, cache maîtrisé, compagnon affichable malgré un réseau médiocre, mutations sensibles cohérentes et reprise propre après reconnexion.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel obligatoire pour tester les déploiements réels.

### Principes

- Supabase reste la source de vérité métier.
- Le cache local améliore l'expérience mais ne peut pas fabriquer de Lithons, achats ou états serveur.
- Les assets 3D sont chargés à la demande ; ne pas précacher les 20 GLB au premier démarrage.
- Les accessoires équipés et leurs transforms persistants font partie de l'état de présentation du compagnon.
- Le cache peut restaurer le dernier état connu, mais ne doit jamais prétendre qu'une sauvegarde serveur de placement a réussi si ce n'est pas le cas.

### À réaliser

- Finaliser manifest, service worker et stratégie de mise à jour PWA.
- Précacher shell, branding et ressources légères essentielles.
- Runtime cache versionné pour GLB/previews, avec limites et nettoyage.
- Prioriser en cache le caillou actif et **tous les GLB d'accessoires actuellement équipés nécessaires au rendu**, dans un budget borné.
- Restaurer en mode dégradé le dernier jeu connu d'instances équipées et leurs transforms locaux, clairement marqué comme dernier état connu si Supabase n'est pas joignable.
- Définir les états réseau : online, offline, reprise.
- Permettre une consultation raisonnable du Socle en mode dégradé avec dernière donnée connue, clairement non autoritaire.
- Pour les mutations sensibles (caresse créditée, achat, jeter), gérer échec/retry/idempotence sans inventer de succès local.
- Pour les placements d'accessoires, distinguer état local édité, état physique stabilisé et état effectivement persisté côté Supabase.
- En cas de perte réseau pendant une manipulation/une stabilisation, ne pas créer de doublon d'instance et définir une stratégie de retry/reconciliation explicite.
- Au retour réseau, réconcilier proprement les transforms d'accessoires sans relancer inutilement la simulation physique complète.
- Tester mise à jour d'application, cache ancien, session expirée, coupure pendant mutation, coupure pendant placement et reconnexion.
- Vérifier comportement d'installation iOS/Android/desktop selon capacités réelles.

### Hors périmètre

- Mode offline complet autorisant des crédits Lithons non vérifiés.
- Synchronisation maison concurrente à Supabase.
- Simulation physique persistante en arrière-plan hors ligne.

### Critères d'acceptation

- PWA installable lorsque la plateforme le permet.
- Shell démarre rapidement.
- Caillou actif revisitable depuis le cache lorsque possible.
- Accessoires équipés et transforms du dernier état connu restaurables en mode dégradé.
- Aucun double crédit/achat après reconnexion.
- Aucun doublon d'instance d'accessoire après retry réseau.
- Une sauvegarde de placement non confirmée par Supabase n'est jamais présentée comme acquise silencieusement.
- Mise à jour de version propre.
- Cache borné et versionné.
- États offline compréhensibles.

### Fin d'étape

PR dédiée. Compléter compte rendu + index avec la matrice de tests réseau/appareils.

## État / compte rendu

**Statut : À faire**

- Date :
- PR / commit :
- Stratégie cache :
- Cache GLB accessoires :
- Offline/degraded :
- Reprise placements :
- Tests reconnexion :
- Tests installation :
- Dette :
- Étape suivante recommandée : 13
