# Étape 12 — PWA, cache, reprise réseau et résilience

## Prompt d'exécution

Tu travailles sur CAILLOU™ après implémentation des fonctions principales. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte le comportement réel de l'app, Supabase et Vercel avant toute modification.

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

### À réaliser

- Finaliser manifest, service worker et stratégie de mise à jour PWA.
- Précacher shell, branding et ressources légères essentielles.
- Runtime cache versionné pour GLB/previews, avec limites et nettoyage.
- Prioriser en cache le caillou actif et les accessoires équipés nécessaires au rendu.
- Définir les états réseau : online, offline, reprise.
- Permettre une consultation raisonnable du Socle en mode dégradé avec dernière donnée connue, clairement non autoritaire.
- Pour les mutations sensibles (caresse créditée, achat, jeter), gérer échec/retry/idempotence sans inventer de succès local.
- Tester mise à jour d'application, cache ancien, session expirée, coupure pendant mutation et reconnexion.
- Vérifier comportement d'installation iOS/Android/desktop selon capacités réelles.

### Hors périmètre

- Mode offline complet autorisant des crédits Lithons non vérifiés.
- Synchronisation maison concurrente à Supabase.

### Critères d'acceptation

- PWA installable lorsque la plateforme le permet.
- Shell démarre rapidement.
- Caillou actif revisitable depuis le cache lorsque possible.
- Aucun double crédit/achat après reconnexion.
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
- Offline/degraded :
- Tests reconnexion :
- Tests installation :
- Dette :
- Étape suivante recommandée : 13
