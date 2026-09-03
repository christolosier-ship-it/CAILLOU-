# CAILLOU™ - Roadmap d'exécution V1

> **Rôle de ce dossier : mémoire opérationnelle du projet.**
>
> Chaque fichier d'étape est conçu pour être utilisé comme prompt autonome dans un nouveau fil de discussion. L'historique ChatGPT ne doit jamais être nécessaire pour reprendre le projet.

## Documents de référence permanents

Avant toute étape, lire et respecter :

1. `CAHIER-DES-CHARGES-V1.md` - vérité fonctionnelle ;
2. `ARCHITECTURE-TECHNIQUE.md` - vérité technique/full stack ;
3. `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md` - vérité UI/UX/3D ;
4. `WORKFLOW-3D-BLENDER-GITHUB.md` - vérité pipeline 3D.

En cas de contradiction, l'étape en cours doit signaler l'écart et mettre à jour les documents existants plutôt que créer une documentation concurrente.

## Règles d'orchestration

- Une étape = un objectif principal cohérent et testable.
- Utiliser GitHub, Supabase et Vercel via leurs plugins lorsque l'étape le nécessite.
- Travailler par branche + Pull Request ; `main` doit rester déployable.
- Ne pas fusionner avec des contrôles essentiels rouges.
- Ne pas élargir le périmètre d'une étape par opportunisme.
- Si une découverte modifie l'architecture ou le produit, mettre à jour le fichier d'étape concerné et les documents de référence.
- Les étapes terminées constituent un historique d'exécution : ne pas les réécrire pour refléter des décisions prises plus tard. Les évolutions sont documentées dans les étapes futures et dans les documents normatifs concernés.
- À la fin de chaque étape, compléter la section `État / compte rendu` du fichier d'étape avec : date, PR/commit, décisions, écarts, tests, dette restante et prochaine étape.
- Un nouveau fil peut commencer par : `@GitHub Exécute docs/roadmap/XX-....md`.

## Ordre d'exécution

| # | Étape | Statut | Dépendances |
|---:|---|---|---|
| 01 | Fondation frontend et PWA | Terminée - PR #4 fusionnée | aucune |
| 02 | Vercel, previews et garde-fous CI | Terminée - PR #5 fusionnée | 01 |
| 03 | Supabase : schéma, RLS et contrats | Terminée - PR #7 fusionnée | 01 |
| 04 | Auth pseudo + mot de passe | Terminée - PR #8 fusionnée | 03 |
| 05 | Pipeline 3D de production et catalogue | Terminée - PR #10 fusionnée, 20/20 cailloux actifs | pipeline audit existant |
| 06 | Showroom 3D des 20 cailloux | Terminée - PR #13 fusionnée, WebGL + téléphone/tablette validés | 01, 05 |
| 07 | Adoption, nommage et Socle | Terminée - PR #14, adoption idempotente + Socle + E2E validés | 04, 06 |
| 08 | Caresse et économie en Lithons | Terminée - PR #16, caresse 3D + économie autoritaire + E2E validés | 03, 07 |
| 09 | Nettoyage et poussière cosmétique | Terminée - PR #17, poussière UV + nettoyage persistant + E2E validés | 07 |
| 10A | Pipeline accessoires 3D et catalogue | Terminée - PR #19, catalogue GLB licencié et WebGL validé | 03, 05, 06 |
| 10B | Boutique Lithons et propriété des accessoires | Terminée - PR #20, achat atomique/RLS et UI catalogue | 08, 10A |
| 10C | Multi-équipement et placement libre | Terminée - PR #22, instances UUID + transforms locaux persistants + téléphone/tablette validés | 07, 10A, 10B |
| 10D | Physique, collisions, gravité et persistance | Terminée - PR #23, Rapier + collisions + stabilisation persistante + téléphone/tablette validés | 06, 10C |
| **10.5** | **UX tactile, sol physique et manutention du caillou** | **Terminée - PR #25 fusionnée, production Vercel validée** | **08, 10C, 10D** |
| **10.75** | **Boutique unifiée et manipulation universelle** | **Terminée - PR #27, 9/9 CI + Preview Vercel validés** | **10B, 10C, 10D, 10.5** |
| 11 | Bio, statistiques et action Jeter | Terminée - PR #32, 8/8 GitHub + Supabase + Preview Vercel validés | 03, 07, 08, 09, 10B, **10.75** |
| 12 | PWA, cache, reprise réseau et résilience | Terminée - PR #33, 9/9 GitHub + Supabase + Preview Vercel validés | 06 à 11, y compris 10A-10D, **10.5** et **10.75** |
| 13 | QA, sécurité, performance et release V1 | Terminée - PR #34, 4/4 GitHub + Supabase + Preview Vercel READY ; tag V1.0 différé aux smoke tests réels | 01 à 12, y compris 10A-10D, **10.5** et **10.75** |

## Découpage de l'étape 10

L'ancien périmètre unique `10 - Accessoires et boutique Lithons` a été exécuté en quatre sous-étapes autonomes afin de séparer les risques 3D, économiques, UX et physiques :

- **10A** : ingestion/conversion des ressources 3D, GLB web, PBR, optimisation, provenance/licences et colliders simplifiés ;
- **10B** : catalogue commercial, achat transactionnel en Lithons et propriété permanente au compte ;
- **10C** : plusieurs accessoires simultanés sur un même caillou, instances UUID, placement manuel, rotation, échelle, édition tactile et persistance des transforms manuels ;
- **10D** : collisions, gravité, stabilisation physique et persistance/reprise de l'état stabilisé.

**Le jalon fonctionnel historique 10 est terminé.** Les quatre sous-étapes 10A à 10D sont validées et restent inchangées comme historique d'exécution.

## Étape 10.5 - consolidation post-10 terminée

Document historique autonome :

`docs/roadmap/10.5-UX-TACTILE-PHYSIQUE-ET-MANUTENTION-DU-CAILLOU.md`

10.5 a livré notamment :

- le verrou explicite de l'édition des accessoires ;
- la manipulation tactile directe des accessoires ;
- la gravité gelée pendant la session d'édition ;
- le grand carré comme vrai sol physique Rapier ;
- le **Permis de manutention minérale** permanent à **1000 Lithons** ;
- la pose persistante du caillou ;
- la manutention 6D du caillou ;
- le collider dynamique `hull` du caillou ;
- la stabilisation globale caillou + accessoires ;
- la persistance atomique et idempotente de la composition.

Clôture opérationnelle :

- PR #25 fusionnée ;
- merge `8c0d234bb97a644bc1bc7e382b210099d02b041d` ;
- production Vercel correspondante validée `READY` ;
- étape 11 non démarrée pendant cette clôture.

Le fichier 10.5 reste un compte rendu historique de son exécution. Les décisions prises après sa clôture sont documentées dans 10.75 et dans les documents normatifs.

## Étape 10.75 - Boutique unifiée et manipulation universelle terminée

Document autonome :

`docs/roadmap/10.75-BOUTIQUE-UNIFIEE-ET-MANIPULATION-UNIVERSELLE.md`

10.75 a consolidé les retours UX post-10.5 sans modifier l'économie fondamentale.

Décisions livrées :

- **Boutique = acquérir. Placement = manipuler. Rapier = arbitrer après validation.**
- la boutique d'accessoires est devenue la Boutique générale du Socle ;
- accessoires et fonctionnalités payantes restent des modèles Supabase spécialisés mais sont présentés dans une même fenêtre commerciale ;
- le Permis de manutention minérale à 1000 Lithons est acheté dans cette Boutique, et non dans une fenêtre commerciale parallèle ;
- l'achat d'un accessoire donne une propriété permanente au compte ; la création d'instances déjà possédées se fait depuis Placement ;
- un seul bouton **Placement** mutualise la manipulation du caillou et des accessoires ;
- Placement commence par un sélecteur de cible : caillou, instances déjà placées et ajout d'un objet possédé ;
- le caillou reste visible mais verrouillé si le permis n'est pas acquis, avec accès à sa fiche Boutique ;
- caillou et accessoires partagent la même grammaire tactile Position / Orientation ;
- les accessoires ajoutent le contrôle de Taille ;
- après sélection, le canvas entier sert de surface de contrôle ;
- pendant Placement, aucune collision caillou/accessoire/accessoire ne contraint le geste ; les intersections volontaires sont autorisées ;
- **le carré gris est l'unique frontière infranchissable pendant la manipulation cinématique** ; la cible ne peut pas traverser ni passer sous ce sol ;
- cette frontière de sol est une contrainte dure pendant le geste et tient compte du volume orienté de la cible ;
- à `Terminer`, Rapier reprend la gravité et toutes les collisions normales ;
- la stabilisation individuelle des accessoires et la stabilisation atomique du caillou + accessoires conservent leurs contrats de persistance ;
- aucune migration Supabase n'a été nécessaire ;
- le nouveau E2E 10.75 et les huit scénarios de non-régression sont verts sur le candidat fonctionnel `65e17cb07c66b35f98f0ee6f308b6f1a0c19e8d8` ;
- une seule Preview volontaire a été utilisée : `dpl_4cHqGZvPAcYuCRSQorLDDJJWCiPP`, état `READY` ;
- l'étape 11 n'a pas été commencée pendant l'exécution de 10.75.

## Consolidation post-10.75 — Socle, PlacementSession et drafts multi-cibles

Deux corrections transversales ont été exécutées avant l'étape 11. Elles ne créent pas de nouvelles étapes de roadmap : elles consolident l'architecture déjà ciblée par 10.75.

### PR #30 — harmonisation du Socle et du Placement

- merge : `659d055f77f665c161f5be4b2e219f7c47dc6cc4` ;
- unification du Socle visuel/physique, des contraintes et du contrôleur de Placement ;
- suppression des chemins legacy devenus concurrents ;
- maintien du contrat 10.75 : Boutique = acquérir, Placement = manipuler, Rapier = arbitrer après validation.

### PR #31 — PlacementSession réellement multi-cibles

- merge : `d9372f4b7af8ceaa8a67dc35476cbf1398206465` ;
- `PlacementSession` devient la source de vérité de la composition pendant toute l'édition ;
- le caillou et chaque instance accessoire conservent un draft monde indépendant ;
- déplacer le caillou ne déplace plus les accessoires pendant l'édition ;
- changer de cible ne restaure plus la pose persistée et ne détruit aucun draft ;
- aucune RPC Supabase n'est exécutée lors d'un simple changement de cible ;
- `Terminer` valide la session entière : settlement global si le caillou est dirty, settlement limité aux accessoires dirty sinon, aucune écriture si rien n'a changé ;
- les accessoires démarrent le settlement depuis leurs transforms monde de session ;
- aucune migration Supabase n'a été nécessaire.

Validation de clôture : neuf workflows officiels verts sur le candidat de #31, CI post-merge `main` verte, production Vercel `READY` sur le SHA exact `d9372f4b7af8ceaa8a67dc35476cbf1398206465`, sans runtime error observée au contrôle de clôture.

**L'étape 11 démarre donc sur cette architecture consolidée.**

## Étape 11 - Bio, statistiques et action Jeter terminée

Document autonome :

`docs/roadmap/11-BIO-STATS-JETER.md`

Décisions livrées :

- Bio/Stats repose uniquement sur les sources Supabase fiables ; `observation_seconds` n'est pas affiché tant qu'il n'existe pas de mesure serveur autoritaire ;
- propriété des accessoires, instances placées et déblocages permanents sont comptés séparément ;
- le Permis de manutention minérale est affiché comme déblocage existant, sans nouveau parcours d'achat ;
- `Jeter` réutilise le RPC idempotent `discard_active_rock` et fait disparaître immédiatement le caillou après confirmation ;
- les instances équipées sont déséquipées logiquement lors du discard, tandis que portefeuille, acquisitions, déblocages permanents et progression restent au compte ;
- l'état post-discard est persistant et propose l'adoption d'un nouveau caillou ;
- `Step11Pedestal` isole Bio/Jeter du moteur de Placement et bloque ces actions pendant les modes exclusifs ;
- aucune migration Supabase supplémentaire n'a été nécessaire ;
- le candidat fonctionnel final `d8f409c1080f037e62fc29b023a8280227b8c95e` a obtenu 8/8 workflows GitHub verts ;
- le runtime validé reste celui de `9ba2b41f762309c366a76b78686a7949af92dfe6`, Preview Vercel `dpl_E2u2mvADfUHJrJ5rN7LRaRGqDV71` `READY`, les commits suivants ne modifiant que documentation et QA ;
- le test transactionnel Supabase de discard/replay a été exécuté avec `ROLLBACK` et a confirmé la conservation des données de compte ;
- l'incident d'allocation GitHub Actions a été levé après passage du dépôt en public, puis la matrice officielle a réellement exécuté ses étapes et terminé entièrement au vert.

**L'étape suivante est 12 — PWA, cache, reprise réseau et résilience.**

## Étape 12 - PWA, cache, reprise réseau et résilience terminée

Document autonome :

`docs/roadmap/12-PWA-CACHE-RESILIENCE.md`

Décisions livrées :

- Supabase reste la seule source de vérité pour Lithons, achats, déblocages, possessions et états persistés ; aucun succès métier n'est fabriqué localement ;
- le précache PWA est ramené au shell léger et aux ressources essentielles ; le build Vercel final ne précache que 6 entrées pour environ `443,69 KiB` ;
- les scènes 3D, Rapier, GLB et previews passent en chargement lazy/runtime avec caches versionnés, bornés et nettoyables ;
- le dernier état serveur connu du Socle est conservé localement pour une consultation dégradée explicitement non autoritaire ;
- le caillou actif, sa pose stabilisée et les accessoires équipés avec leurs transforms peuvent être restaurés depuis ce dernier snapshot connu ;
- les achats, déblocages et mutations sensibles restent bloqués tant que Supabase n'a pas réconcilié le registre ;
- les mutations Placement ambiguës conservent exactement leur `event_key` et leur payload dans une file persistante ; la reconnexion rejoue la même intention et ne crée pas de doublon d'instance ;
- `stabilize_rock_composition` reste atomique et aucune composition globale n'est présentée comme partiellement confirmée ;
- une version PWA disponible est signalée explicitement avant activation/rechargement ;
- le candidat fonctionnel `7d39483bb6a9d6cbd1b96de521d5f842ff5615c0` a obtenu 9/9 workflows GitHub verts, avec 24 fichiers / 83 tests unitaires verts ;
- aucune migration Supabase n'a été nécessaire ; le projet CAILLOU- reste `ACTIVE_HEALTHY` et les reçus de mutation sont indexés par `(user_id, event_key)` ;
- une seule Preview volontaire a été utilisée : `dpl_5G7DezKX9pFFckGr7h2Peg1oif5f`, état `READY`, manifeste HTTP 200 et service worker généré ;
- l'installation physique sur appareils réels reste un smoke test de la QA finale plutôt qu'une validation simulée.

**L'étape suivante est 13 — QA, sécurité, performance et release V1.**

## Étape 13 - QA, sécurité, performance et release V1 terminée

Document autonome :

`docs/roadmap/13-QA-SECURITE-PERFORMANCE-RELEASE.md`

Décisions et validations finales :

- le candidat runtime `6ae5bfda833042d1ad336d965eca99b4ec2a26d5` a obtenu 4/4 contrôles ciblés verts : CI complète, Boutique/Placement, physique/stabilisation accessoires et mouvement global ;
- la CI finale valide le nouveau garde-fou de release, lint, TypeScript strict, 24 fichiers / 83 tests unitaires et le build de production ;
- le validateur de release bloque désormais les écarts d'inventaire 3D, poids GLB, previews, licences/provenances, icônes PWA, règles Vercel, headers et secrets frontend ;
- les 20 GLB cailloux restent sous 5 MiB avec un maximum mesuré à `0,78 MiB` ; les 4 accessoires restent sous le même budget avec un maximum à `2,47 MiB` ;
- Supabase reste `ACTIVE_HEALTHY`, les invariants RLS/économie/idempotence sont conformes et l'inscription est désormais limitée côté serveur à 5 tentatives par 15 minutes et par IP pseudonymisée ;
- les migrations `harden_auth_registration_rate_limit` et `deny_client_auth_rate_limits` verrouillent ce garde-fou anti-abus ;
- le seul WARN sécurité Supabase restant est la protection des mots de passe compromis désactivée ; les seuls avis performance sont des index encore inutilisés, classés INFO ;
- `THIRD-PARTY-NOTICES.md` rend explicite l'attribution CC BY 4.0 du Monocle et le catalogue conserve les preuves de provenance des ressources CC0 ;
- Vercel applique désormais des headers de sécurité navigateur et conserve le déploiement parcimonieux par branche ;
- une seule Preview étape 13 a été déclenchée : `dpl_GDbBc6VihWvNYYaifzS8CPX8X2T3`, état `READY`, service worker généré, précache 6 entrées pour `443,69 KiB` et aucune erreur runtime observée ;
- le gros chunk 3D/physique reste environ `1,02 MiB` gzip, mais il est lazy/runtime et non précaché ; cette dette mesurée est acceptée pour éviter un refactor risqué en fin de V1 ;
- les contrôles tactiles compte/session respectent désormais le minimum 44 px ;
- aucun changement de règle produit, de direction artistique ou de pipeline de conversion 3D n'a été introduit pendant cette passe finale ; les documents normatifs existants restent applicables ;
- **décision : GO technique pour `main` et la production ; NO-GO volontaire pour créer le tag/release `V1.0` tant que les smoke tests physiques iOS/Android/tablette/desktop exigés par la roadmap n'ont pas été réalisés.**

**La roadmap technique V1 est exécutée jusqu'à son étape 13. La prochaine action de release est un smoke test matériel réel puis, uniquement s'il est vert, la création du tag/release `V1.0`.**

## Frontières importantes

- **Supabase est la source de vérité** pour compte, caillou adopté, progression, Lithons, achats, déblocages, possession d'accessoires, instances équipées, poses persistantes, état stabilisé et statistiques.
- **Vercel distribue le frontend** et fournit les previews/production ; pas de backend métier Vercel V1 sans justification explicite.
- **Le navigateur ne fait jamais autorité sur les Lithons** ni sur un achat ou un déblocage payant.
- **Un seul GLB de caillou actif à la fois** dans le showroom. Jusqu'à huit GLB d'accessoires peuvent être chargés simultanément autour de ce caillou dans le contrat V1 actuel.
- Les accessoires sont multi-instance côté équipement : le modèle ne limite pas artificiellement un caillou à un accessoire par zone ou `slot`.
- La propriété d'un type d'accessoire appartient au compte ; une instance équipée appartient à la composition d'un caillou.
- Les transforms d'accessoires persistants sont exprimés relativement au caillou, pas en coordonnées monde.
- 10D a introduit Rapier et la stabilisation persistante des accessoires ; 10.5 a ajouté le vrai sol, la pose persistante du caillou et la stabilisation atomique de composition.
- La physique est exécutée côté client ; Supabase persiste l'état stabilisé mais ne simule pas la physique.
- Une pose stabilisée est restaurée directement au reload ; une pose intermédiaire non stabilisée ne doit jamais être présentée comme confirmée.
- Pendant toute manipulation tactile explicite, la cible reste contrôlée cinématiquement ; Rapier reprend l'autorité après validation.
- À partir de #31, toute la composition est capturée en monde à l'ouverture de Placement et chaque cible garde son draft monde indépendant jusqu'à `Terminer`.
- Le grand carré gris du Socle est la seule frontière spatiale infranchissable pendant Placement.
- Les achats sont centralisés dans la Boutique ; le placement et la création d'instances possédées sont centralisés dans Placement.
- À partir de l'étape 12, le cache local n'est qu'une mémoire de présentation et de reprise : il peut restaurer le dernier état connu, mais ne devient jamais une source d'autorité métier.
- Les mutations réseau ambiguës doivent conserver leur clé d'idempotence d'origine jusqu'à réconciliation avec Supabase ; créer une nouvelle clé pour le même geste est interdit.
- Le caillou n'a aucun besoin vital et l'absence n'est jamais punie.
- Les Lithons n'ont aucune valeur réelle et ne sont ni achetables ni transférables.

## Comment reprendre dans un nouveau fil

1. Mentionner `@GitHub` et, si nécessaire, `@Supabase` / `@Vercel`.
2. Donner le chemin exact de l'étape concernée.
3. Demander de lire d'abord ce fichier et les quatre documents de référence.
4. L'assistant doit inspecter l'état réel du repo et des services avant d'agir.
5. Exécuter uniquement l'étape demandée, puis documenter le résultat dans son fichier.
