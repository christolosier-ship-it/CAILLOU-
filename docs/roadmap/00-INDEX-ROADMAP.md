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
| 07 | Adoption, nommage et Socle | À faire | 04, 06 |
| 08 | Caresse et économie en Lithons | À faire | 03, 07 |
| 09 | Nettoyage et poussière cosmétique | À faire | 07 |
| 10 | Accessoires et boutique Lithons | À faire | 03, 05, 08 |
| 11 | Bio, statistiques et action Jeter | À faire | 03, 07, 08, 09, 10 |
| 12 | PWA, cache, reprise réseau et résilience | À faire | 06 à 11 |
| 13 | QA, sécurité, performance et release V1 | À faire | 01 à 12 |

## Frontières importantes

- **Supabase est la source de vérité** pour compte, caillou adopté, progression, Lithons, achats et statistiques.
- **Vercel distribue le frontend** et fournit les previews/production ; pas de backend métier Vercel V1 sans justification explicite.
- **Le navigateur ne fait jamais autorité sur les Lithons** ni sur un achat.
- **Un seul GLB 3D actif à la fois** dans le showroom.
- Le caillou n'a aucun besoin vital et l'absence n'est jamais punie.
- Les Lithons n'ont aucune valeur réelle et ne sont ni achetables ni transférables.

## Comment reprendre dans un nouveau fil

1. Mentionner `@GitHub` et, si nécessaire, `@Supabase` / `@Vercel`.
2. Donner le chemin exact de l'étape.
3. Demander de lire d'abord ce fichier et les quatre documents de référence.
4. L'assistant doit inspecter l'état réel du repo et des services avant d'agir.
5. Exécuter uniquement l'étape demandée, puis documenter le résultat dans son fichier.
