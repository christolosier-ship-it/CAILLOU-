# CAILLOU™ — Roadmap d'exécution V1

> **Rôle de ce dossier : mémoire opérationnelle du projet.**
>
> Chaque fichier d'étape est conçu pour être utilisé comme prompt autonome dans un nouveau fil de discussion. L'historique ChatGPT ne doit jamais être nécessaire pour reprendre le projet.

## Documents de référence permanents

Avant toute étape, lire et respecter :

1. `CAHIER-DES-CHARGES-V1.md` — vérité fonctionnelle ;
2. `ARCHITECTURE-TECHNIQUE.md` — vérité technique/full stack ;
3. `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md` — vérité UI/UX/3D ;
4. `WORKFLOW-3D-BLENDER-GITHUB.md` — vérité pipeline 3D.

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
| 01 | Fondation frontend et PWA | Terminée — PR #4 fusionnée | aucune |
| 02 | Vercel, previews et garde-fous CI | Terminée — PR #5 fusionnée | 01 |
| 03 | Supabase : schéma, RLS et contrats | Terminée — PR #7 fusionnée | 01 |
| 04 | Auth pseudo + mot de passe | Terminée — PR #8 fusionnée | 03 |
| 05 | Pipeline 3D de production et catalogue | Terminée — PR #10 fusionnée, 20/20 cailloux actifs | pipeline audit existant |
| 06 | Showroom 3D des 20 cailloux | Terminée — PR #13 fusionnée, WebGL + téléphone/tablette validés | 01, 05 |
| 07 | Adoption, nommage et Socle | Terminée — PR #14, adoption idempotente + Socle + E2E validés | 04, 06 |
| 08 | Caresse et économie en Lithons | Terminée — PR #16, caresse 3D + économie autoritaire + E2E validés | 03, 07 |
| 09 | Nettoyage et poussière cosmétique | Terminée — PR #17, poussière UV + nettoyage persistant + E2E validés | 07 |
| 10A | Pipeline accessoires 3D et catalogue | Terminée — PR #19, catalogue GLB licencié et WebGL validé | 03, 05, 06 |
| 10B | Boutique Lithons et propriété des accessoires | À faire | 08, 10A |
| 10C | Multi-équipement et placement libre | À faire | 07, 10A, 10B |
| 10D | Physique, collisions, gravité et persistance | À faire | 06, 10C |
| 11 | Bio, statistiques et action Jeter | À faire | 03, 07, 08, 09, 10B, 10D |
| 12 | PWA, cache, reprise réseau et résilience | À faire | 06 à 11, y compris 10A–10D |
| 13 | QA, sécurité, performance et release V1 | À faire | 01 à 12, y compris 10A–10D |

## Découpage de l'étape 10

L'ancien périmètre unique `10 — Accessoires et boutique Lithons` est désormais exécuté en quatre sous-étapes autonomes afin de séparer les risques 3D, économiques, UX et physiques :

- **10A** : ingestion/conversion des ressources 3D, GLB web, PBR, optimisation, provenance/licences et colliders simplifiés ;
- **10B** : catalogue commercial, achat transactionnel en Lithons et propriété permanente au compte ;
- **10C** : plusieurs accessoires simultanés sur un même caillou, placement manuel, rotation, échelle et édition tactile ;
- **10D** : collisions, anti-traversée, gravité, stabilisation physique et sauvegarde/restauration des transforms finaux.

Les quatre sous-étapes font partie du jalon fonctionnel « étape 10 ». L'étape 11 ne commence qu'une fois 10B et 10D validées.

## Frontières importantes

- **Supabase est la source de vérité** pour compte, caillou adopté, progression, Lithons, achats, possession d'accessoires, placements persistants et statistiques.
- **Vercel distribue le frontend** et fournit les previews/production ; pas de backend métier Vercel V1 sans justification explicite.
- **Le navigateur ne fait jamais autorité sur les Lithons** ni sur un achat.
- **Un seul GLB de caillou actif à la fois** dans le showroom. Plusieurs GLB d'accessoires peuvent être chargés simultanément autour de ce caillou, dans un budget mobile contrôlé.
- Les accessoires sont multi-instance côté équipement : le modèle final ne doit pas limiter artificiellement un caillou à un accessoire par zone ou `slot`.
- Les transforms d'accessoires persistants sont exprimés relativement au caillou, pas en coordonnées monde.
- La physique est exécutée côté client ; Supabase persiste l'état stabilisé mais ne simule pas la physique.
- Le caillou n'a aucun besoin vital et l'absence n'est jamais punie.
- Les Lithons n'ont aucune valeur réelle et ne sont ni achetables ni transférables.

## Comment reprendre dans un nouveau fil

1. Mentionner `@GitHub` et, si nécessaire, `@Supabase` / `@Vercel`.
2. Donner le chemin exact de l'étape ou la sous-étape 10 concernée.
3. Demander de lire d'abord ce fichier et les quatre documents de référence.
4. L'assistant doit inspecter l'état réel du repo et des services avant d'agir.
5. Exécuter uniquement l'étape demandée, puis documenter le résultat dans son fichier.
