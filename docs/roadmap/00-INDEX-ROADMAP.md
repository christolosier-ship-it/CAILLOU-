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
| 11 | Bio, statistiques et action Jeter | À faire | 03, 07, 08, 09, 10B, **10.75** |
| 12 | PWA, cache, reprise réseau et résilience | À faire | 06 à 11, y compris 10A-10D, **10.5** et **10.75** |
| 13 | QA, sécurité, performance et release V1 | À faire | 01 à 12, y compris 10A-10D, **10.5** et **10.75** |

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

**La prochaine étape à exécuter est donc 11.**

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
- À partir de 10.75, les intersections entre objets sont un choix utilisateur autorisé pendant Placement. Aucune règle d'anti-pénétration ne doit empêcher le placement fin.
- Le grand carré gris du Socle est la seule frontière spatiale infranchissable pendant Placement.
- Les achats sont centralisés dans la Boutique ; le placement et la création d'instances possédées sont centralisés dans Placement.
- Le caillou n'a aucun besoin vital et l'absence n'est jamais punie.
- Les Lithons n'ont aucune valeur réelle et ne sont ni achetables ni transférables.

## Comment reprendre dans un nouveau fil

1. Mentionner `@GitHub` et, si nécessaire, `@Supabase` / `@Vercel`.
2. Donner le chemin exact de l'étape concernée.
3. Demander de lire d'abord ce fichier et les quatre documents de référence.
4. L'assistant doit inspecter l'état réel du repo et des services avant d'agir.
5. Exécuter uniquement l'étape demandée, puis documenter le résultat dans son fichier.
