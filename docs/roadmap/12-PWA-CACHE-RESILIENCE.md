# Étape 12 — PWA, cache, reprise réseau et résilience

## Prompt d'exécution

Tu travailles sur CAILLOU™ après implémentation des fonctions principales, y compris 10A–10D, 10.5, 10.75 et l'étape 11. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte le comportement réel de l'app, Supabase et Vercel avant toute modification.

### Objectif

Rendre CAILLOU™ robuste comme PWA : démarrage rapide, cache maîtrisé, compagnon affichable malgré un réseau médiocre, mutations sensibles cohérentes et reprise propre après reconnexion.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel obligatoire pour tester les déploiements réels lorsque nécessaire.

### Principes

- Supabase reste la source de vérité métier.
- Le cache local améliore l'expérience mais ne peut pas fabriquer de Lithons, achats, déblocages ou états serveur.
- Les assets 3D sont chargés à la demande ; ne pas précacher les 20 GLB au premier démarrage.
- Le caillou actif, sa pose stabilisée, les accessoires équipés et leurs transforms persistants font partie de l'état de présentation du compagnon.
- Les possessions d'accessoires et déblocages de fonctionnalités restent des données serveur distinctes des instances placées.
- Le cache peut restaurer le dernier état connu, mais ne doit jamais prétendre qu'un achat, un déblocage ou une sauvegarde de placement a réussi si ce n'est pas confirmé par Supabase.
- La Boutique unifiée et Placement restent deux responsabilités UX distinctes après reconnexion.

### À réaliser

- Finaliser manifest, service worker et stratégie de mise à jour PWA.
- Précacher shell, branding et ressources légères essentielles.
- Runtime cache versionné pour GLB/previews, avec limites et nettoyage.
- Prioriser en cache le caillou actif et **tous les GLB d'accessoires actuellement équipés nécessaires au rendu**, dans un budget borné.
- Restaurer en mode dégradé le dernier jeu connu d'instances équipées, leurs transforms locaux et la pose du caillou, clairement marqués comme dernier état connu si Supabase n'est pas joignable.
- Définir les états réseau : online, offline, reprise.
- Permettre une consultation raisonnable du Socle en mode dégradé avec dernière donnée connue, clairement non autoritaire.
- Pour les mutations sensibles (caresse créditée, achat d'accessoire, achat de fonctionnalité, jeter), gérer échec/retry/idempotence sans inventer de succès local.
- Pour la Boutique unifiée, réconcilier proprement solde, propriété d'accessoires et `user_feature_unlocks` après reconnexion.
- Pour Placement, distinguer brouillon local, cible cinématique, résultat physique stabilisé et état effectivement persisté côté Supabase.
- En cas de perte réseau pendant une manipulation/une stabilisation, ne pas créer de doublon d'instance et définir une stratégie de retry/reconciliation explicite.
- Pour la manutention du caillou, préserver le contrat atomique de `stabilize_rock_composition` et ne pas persister partiellement caillou/accessoires.
- Au retour réseau, réconcilier les transforms sans relancer inutilement une simulation physique complète lorsque le dernier état serveur est déjà stabilisé.
- Préserver la règle 10.75 : les intersections volontaires ne sont pas des erreurs à corriger, tandis que le carré gris reste la frontière de placement.
- Tester mise à jour d'application, cache ancien, session expirée, coupure pendant mutation, coupure pendant achat/déblocage, coupure pendant Placement/stabilisation et reconnexion.
- Vérifier comportement d'installation iOS/Android/desktop selon capacités réelles.

### Hors périmètre

- Mode offline complet autorisant des crédits Lithons non vérifiés.
- Achat ou déblocage simulé hors ligne.
- Synchronisation maison concurrente à Supabase.
- Simulation physique persistante en arrière-plan hors ligne.
- Redesign de la Boutique ou du moteur Placement 10.75.

### Critères d'acceptation

- PWA installable lorsque la plateforme le permet.
- Shell démarre rapidement.
- Caillou actif revisitable depuis le cache lorsque possible.
- Pose du caillou, accessoires équipés et transforms du dernier état connu restaurables en mode dégradé.
- Aucun double crédit, achat ou déblocage après reconnexion.
- Aucun doublon d'instance d'accessoire après retry réseau.
- Une sauvegarde de placement non confirmée par Supabase n'est jamais présentée comme acquise silencieusement.
- Une composition globale n'est jamais partiellement présentée comme confirmée.
- Boutique et Placement retrouvent un état cohérent après reprise réseau.
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
- Reprise Boutique/déblocages :
- Reprise Placement/composition :
- Tests reconnexion :
- Tests installation :
- Dette :
- Étape suivante recommandée : 13
