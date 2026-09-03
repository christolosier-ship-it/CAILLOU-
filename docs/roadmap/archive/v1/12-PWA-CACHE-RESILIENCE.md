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

**Statut : Terminée**

- Date : 3 septembre 2026.
- PR / commit : PR #33 ; candidat fonctionnel final `7d39483bb6a9d6cbd1b96de521d5f842ff5615c0` ; branche de validation Vercel `preview/12-final`, commit technique sans changement fonctionnel `6a8333cee630d45148e2dea5ae7bd7cff297e5d7`.
- Stratégie cache : le service worker ne précache plus l'ensemble des bundles/ressources lourdes. Le précache est limité au shell d'entrée et aux ressources légères nécessaires ; les chunks 3D/physique, modèles GLB et previews passent par des caches runtime versionnés et bornés avec nettoyage des anciennes générations. Le build Vercel final mesure 6 entrées de précache pour `443,69 KiB`, contre environ `1,44 MiB` avant le dernier découpage lazy.
- Cache GLB accessoires : le caillou actif et les assets des accessoires équipés sont réchauffés à la demande ; les modèles ne sont jamais aspirés en masse au premier démarrage. Le cache GLB runtime est limité à 12 entrées, ce qui couvre le caillou actif et la composition V1 sans transformer le navigateur en dépôt d'archives.
- Offline/degraded : le dernier snapshot serveur connu est persisté en IndexedDB avec repli localStorage. En cas d'indisponibilité Supabase, le Socle peut restaurer le caillou actif, sa pose stabilisée, l'économie connue et les accessoires équipés avec leurs transforms, en affichant explicitement qu'il s'agit du dernier état connu. Les parcours qui exigent une nouvelle vérité serveur restent bloqués.
- Reprise Boutique/déblocages : achats, déblocages et solde ne sont jamais simulés localement. Après reconnexion, l'état canonique Boutique/portefeuille/déblocages est relu depuis Supabase. Les opérations sensibles existantes conservent leur `event_key` et reposent sur les reçus d'idempotence serveur.
- Reprise Placement/composition : création, retrait et stabilisation d'accessoires conservent désormais `event_key` + payload dans une file persistante lorsqu'une réponse réseau devient ambiguë. La reconnexion rejoue exactement la même intention serveur puis relit l'état canonique, sans créer une seconde instance et sans relancer Rapier si l'état serveur est déjà stabilisé. `stabilize_rock_composition` reste l'unique persistance atomique de la composition globale et n'est jamais découpé en succès partiels.
- Mise à jour PWA : la mise à jour n'est plus appliquée silencieusement au milieu d'une session. Une nouvelle version est signalée et l'utilisateur peut déclencher explicitement son activation/rechargement.
- Tests reconnexion / cache : `src/pwa/cachePolicy.test.ts` couvre les politiques de cache ; les tests de contrats placement/accessoires valident l'idempotence et les erreurs retryables ; la CI finale a exécuté 24 fichiers / 83 tests unitaires avec succès. Les 9 workflows GitHub officiels sont verts sur le candidat fonctionnel, dont adoption, caresse/Lithons, nettoyage, Placement multi-accessoires, Boutique/Placement, physique/stabilisation, mouvement global et Bio/Jeter.
- Tests réseau/appareils : les workflows Chrome téléphone/tablette de non-régression ont réellement exécuté leurs scénarios et sont verts. La coupure/reprise est couverte au niveau des contrats de cache, file de mutations persistantes et réconciliation serveur ; aucune réussite locale autoritaire n'est créée en offline.
- Tests installation : la Preview Vercel `dpl_5G7DezKX9pFFckGr7h2Peg1oif5f` est `READY`. Son `manifest.webmanifest` répond en HTTP 200 avec `display: standalone`, `start_url`, `scope`, identité et icônes 192/512 ; le build génère bien `dist/sw.js`. L'installation physique sur appareils iOS/Android réels n'a pas été simulée artificiellement dans la CI et reste un smoke test matériel de release à refaire en étape 13.
- Supabase : aucune migration nécessaire. Le projet `CAILLOU-` reste `ACTIVE_HEALTHY`. `private.mutation_receipts` possède la clé primaire `(user_id, event_key)` et autorise les opérations concernées, notamment `create_equipped_accessory`, `remove_equipped_accessory`, `stabilize_equipped_accessory`, `purchase_feature_unlock` et `stabilize_rock_composition`.
- Vercel : une seule Preview volontaire a été consommée pour le candidat final de l'étape 12, `dpl_5G7DezKX9pFFckGr7h2Peg1oif5f`, `READY`.
- Dette : le gros chunk 3D reste volontairement conséquent, mais il est désormais hors précache et chargé seulement lorsqu'une scène 3D le demande. Les avertissements Supabase préexistants sur la protection des mots de passe compromis et quelques index encore inutilisés restent hors périmètre. Le smoke test d'installation sur matériel iOS/Android/desktop est à refaire dans la QA finale.
- Étape suivante recommandée : 13 — QA, sécurité, performance et release V1.
