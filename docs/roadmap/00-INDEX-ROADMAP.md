# CAILLOU™ — Roadmap long terme V2.0 → V2.4

> **Statut : feuille de route long terme active. V2-00 terminée le 3 septembre 2026.**
>
> La V1 est publiée sous le tag `v1.0.0` sur le commit `e9d926be0f2f09f9f1464cf5b4360f82dbeae2ad`.
> La roadmap V1 et ses documents historiques sont gelés dans `docs/roadmap/archive/v1/`.
> Ce document est la source de vérité de planification pour **V2.0 → V2.4**. La piste **R&D widgets écran d'accueil** reste séparée de la roadmap séquentielle.

## 1. Principe directeur

La V1 a construit le socle : compte, adoption, économie Lithon, Boutique, accessoires, Placement, physique, Bio/Stats, PWA, sécurité, persistance et résilience.

La direction produit V2 est :

> **Ton caillou devient vraiment le tien.**

Trois axes structurent la trajectoire :

1. **Personnaliser le petit monde** : peinture, sols, éclairage, décors, compositions, Studio Photo.
2. **Donner une existence au caillou** : personnalité, journal, traits évolutifs, réactions et événements.
3. **Faire du Socle un bac à sable physique** : Placement 2.0, accessoires animés et interactifs, son et haptique.

## 2. Règles d'orchestration V2

- La V1 est historique : ne jamais réécrire ses étapes pour refléter une décision V2.
- Une étape V2 terminée devient elle aussi historique.
- Les documents normatifs racine restent la baseline tant qu'une étape V2 ne les remplace ou ne les fait évoluer explicitement.
- Supabase reste la source de vérité métier et économique ; le frontend reste non autoritaire pour achats, possessions, soldes et états persistants.
- `main` doit rester déployable ; travail par branche + PR ; fusion uniquement avec les contrôles essentiels verts.
- Vercel est utilisé parcimonieusement : Preview uniquement lorsqu'elle apporte une validation réelle.
- Réutiliser `CI` et `Browser regression` au lieu de recréer des workflows d'étape.
- Les migrations V1 → V2 doivent préserver utilisateurs, cailloux, Lithons, achats, déblocages et placements existants.
- Toute fonction reste compatible téléphone, tablette et desktop, avec priorité au tactile.

## 3. Inventaire des idées et destination

| # | Idée | Intérêt | Difficulté | Dépendances | Destination |
|---:|---|---|---|---|---|
| 1 | Ajouter des accessoires | ★★★★☆ | ★★☆☆☆ | pipeline GLB, catalogue, licences, Boutique | **V2.0** |
| 2 | Peindre son caillou | ★★★★★ | ★★★★☆ | matériaux Three.js, persistance | **V2.0** |
| 3 | Améliorer le Placement caillou/accessoires | ★★★★★ | ★★★★☆ | PlacementSession, tactile, Rapier, caméra | **V2.0 / fondation** |
| 4 | Vraie personnalité / Bio CAILLOU | ★★★★★ | ★★★☆☆ | Bio, historique, traits persistants | **V2.0** |
| 5 | Accessoires animés | ★★★★☆ | ★★★★☆ | animation GLB, runtime 3D, performance | **V2.3** |
| 6 | Widget écran d'accueil | ★★★★★ | ★★★★★ | OS, PWA/native, synchronisation | **R&D séparée** |
| 7 | Sols en Boutique | ★★★★★ | ★★★☆☆ | catalogue décor, matériaux/textures, Boutique | **V2.0** |
| 8 | Éclairage / ambiance | ★★★★☆ | ★★★☆☆ | Three.js, environnements, persistance | **V2.1** |
| 9 | Mode Photo / Studio | ★★★★★ | ★★★☆☆ | caméra, capture, compositions | **V2.0** |
| 10 | Journal du caillou | ★★★★☆ | ★★★☆☆ | événements persistants, Bio/Stats | **V2.0** |
| 11 | Traits de personnalité évolutifs | ★★★★★ | ★★★★☆ | #4, #10, règles déterministes | **V2.2** |
| 12 | Réactions contextuelles | ★★★★☆ | ★★★☆☆ | #4, #11, metadata | **V2.2** |
| 13 | Accessoires interactifs | ★★★★★ | ★★★★★ | #3, #5, Rapier, états persistants | **V2.3** |
| 14 | Collections d'accessoires | ★★★★☆ | ★★☆☆☆ | #1, catégories, Boutique | **V2.1** |
| 15 | Décors d'arrière-plan | ★★★★☆ | ★★★☆☆ | #7, environnement, assets | **V2.1** |
| 16 | Traces du temps / patine | ★★★☆☆ | ★★★☆☆ | #2, ancienneté, #10 | **V2.4** |
| 17 | Événements rares et absurdes | ★★★★☆ | ★★★☆☆ | #4, #10, #11/#12 | **V2.2** |
| 18 | Accomplissements CAILLOU | ★★★★☆ | ★★★☆☆ | Stats, #10, conditions | **V2.2** |
| 19 | Plusieurs compositions sauvegardées | ★★★★★ | ★★★★☆ | #3, snapshots, Supabase, décors | **V2.0** |
| 20 | Fiche publique / partage | ★★★★☆ | ★★★★☆ | #9, confidentialité/RLS | **V2.3** |
| 21 | Peinture avancée | ★★★★★ | ★★★★★ | #2, UV/masques, GPU | **V2.4** |
| 22 | Son et haptique | ★★★★☆ | ★★★☆☆ | Rapier, audio, appareil | **V2.1** |

## 4. Périmètre V2.0

### Promesse

> **Personnaliser, composer, raconter.**

V2.0 comprend :

- Placement 2.0 ;
- plusieurs compositions sauvegardées ;
- nouveaux accessoires ;
- sols personnalisables en Boutique ;
- peinture simple et robuste ;
- Bio/personnalité 2.0 ;
- journal de vie ;
- Studio Photo.

Restent hors V2.0 : accessoires animés/interactifs, peinture avancée, personnalité évolutive avancée, partage public, traces du temps et widget.

## 5. Ordre d'exécution V2.0

| Étape | Sujet | Objectif principal | Dépendances | Statut |
|---|---|---|---|---|
| **[V2-00](V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md)** | Architecture, cadrage et migrations | assainir le Socle, figer contrats/budgets/migration | V1 | **✅ Terminée — PR #38** |
| **V2-01** | Placement 2.0 | améliorer manipulation, caméra, sélection, précision et stabilisation | V2-00 | **Prochaine** |
| **V2-02** | Compositions | créer/sauvegarder/charger/dupliquer/supprimer une composition | V2-01 | À venir |
| **V2-03** | Nouveaux accessoires | industrialiser le pipeline et enrichir la Boutique | V2-00, V2-01 | À venir |
| **V2-04** | Sols | acheter, posséder, sélectionner et persister les sols | V2-02 | À venir |
| **V2-05** | Peinture | palette, preview, finition, persistance, roche naturelle | V2-00, V2-02 | À venir |
| **V2-06** | Bio / personnalité 2.0 | identité CAILLOU cohérente | V2-00 | À venir |
| **V2-07** | Journal de vie | événements significatifs et mémoire canonique | V2-06 | À venir |
| **V2-08** | Studio Photo | cadrage, UI masquée, capture propre | V2-02, V2-04, V2-05 | À venir |
| **V2-09** | Harmonisation UX V2 | consolider navigation et responsive | V2-01 à V2-08 | À venir |
| **V2-10** | Performance / PWA | caches, GPU, textures, offline | V2-03 à V2-09 | À venir |
| **V2-11** | Sécurité / économie | RLS, RPC, achats, inventaire et nouveaux modèles | V2-02 à V2-10 | À venir |
| **V2-12** | QA / migration V1→V2 | tests ciblés, tactile, matériel, migration réelle | V2-11 | À venir |
| **V2-13** | Release V2.0 | Preview finale, production, smoke tests, tag/release | V2-12 | À venir |

## 6. V2-00 — Architecture, cadrage et migrations

**Terminée le 3 septembre 2026.**

Prompt et compte rendu historique : [`V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md`](V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md).

Résultat principal :

- état React canonique du Socle ;
- suppression du raccord DOM historique Step11 ;
- Bio/Jeter/réseau explicites ;
- extraction `usePedestalCare` et `usePedestalPlacement` ;
- `Pedestal` ramené à une responsabilité de composition ;
- contrats V2 pour compositions, peinture, sols, personnalité/journal ;
- stratégie de migration additive sans table spéculative ;
- budgets GLB/textures/runtime/PWA/GPU figés ;
- Supabase inchangé et sain ;
- CI + Browser regression vertes ;
- Preview finale et production Vercel validées.

PR #38, squash merge : `cec15e6ce33421c1aed5476dafb057628b1368f1`.

Dette explicitement transmise à V2-01 : refactor profond de `ShowroomScene` dans le contexte de Placement 2.0.

## 7. V2-01 — Placement 2.0

Fondation prioritaire suivante :

- sélection de cible plus lisible ;
- translation/rotation/échelle plus précises ;
- caméra et gestes tactiles harmonisés ;
- contraintes de sol cohérentes ;
- feedback de sélection/manipulation ;
- meilleur contrôle téléphone/tablette ;
- annulation/restauration de session si pertinente ;
- stabilisation Rapier et persistance sans régression V1 ;
- traiter la dette `ShowroomScene` uniquement lorsqu'elle sert ces objectifs.

Aucun fichier de prompt V2-01 n'est créé par anticipation tant que son cahier des charges détaillé n'est pas validé.

## 8. V2-02 à V2-08 — Fonctions V2.0

### V2-02 — Compositions

Une composition est un snapshot versionné contenant références et paramètres : pose du caillou, accessoires/transforms, peinture, sol, puis éventuellement éclairage/arrière-plan. La composition implicite V1 devra devenir la première composition explicite sans déplacement ni perte.

### V2-03 — Nouveaux accessoires

Augmenter le catalogue, maintenir provenance/licences et budgets mobiles, améliorer l'industrialisation du pipeline et conserver la distinction propriété d'un type / instances placées.

### V2-04 — Sols

Catalogue, prix éventuel, propriété permanente et sélection active. Exemples : parquet, moquette, béton, carrelage. Le serveur reste autoritaire pour l'économie.

### V2-05 — Peinture

Couleur principale, prévisualisation, finition simple, validation/persistance et retour garanti à la roche naturelle. Peinture avancée réservée à V2.4.

### V2-06 — Bio / personnalité 2.0

Traits fondamentaux stables, ton CAILLOU, préférences/caractéristiques absurdes cohérentes et informations issues de l'histoire réelle. Pas de reroll aléatoire à chaque affichage.

### V2-07 — Journal de vie

Mémoire canonique d'événements déterministes : adoption, renommage, nettoyage, peinture, achats, accessoires, sol, compositions, anniversaires et records pertinents.

### V2-08 — Studio Photo

UI masquable, caméra libre, zoom/cadrage, formats de capture et export propre d'une composition.

## 9. V2-09 à V2-13 — Consolidation et release

La fin de cycle reprend la discipline éprouvée de V1 : harmonisation UX, performance/PWA, audit sécurité/économie, QA réelle de migration, puis release uniquement lorsque contrôles essentiels et appareils physiques sont verts.

## 10. V2.1 — Décoration et sensation

Périmètre cible :

- #8 Éclairage / ambiance ;
- #15 Décors d'arrière-plan ;
- #14 Collections d'accessoires ;
- #22 Son et haptique.

Objectif : enrichir l'atmosphère visuelle et sensorielle du petit monde sans modifier ses fondations.

## 11. V2.2 — Vie du caillou

Périmètre cible :

- #11 Traits évolutifs ;
- #12 Réactions contextuelles ;
- #17 Événements rares et absurdes ;
- #18 Accomplissements CAILLOU.

Principe : évolution compréhensible et déterministe à partir de l'histoire du compte, jamais système punitif de besoins quotidiens.

## 12. V2.3 — Interaction et partage

Périmètre cible :

- #5 Accessoires animés ;
- #13 Accessoires interactifs ;
- #20 Fiche publique / partage.

Les animations doivent stabiliser le pipeline/performance avant les interactions physiques/métier. Le partage reste léger et optionnel, pas un réseau social complet.

## 13. V2.4 — Personnalisation avancée

Périmètre cible :

- #16 Traces du temps / patine ;
- #21 Peinture avancée : motifs, zones, finitions et outils créatifs compatibles mobile.

La roche naturelle d'origine doit toujours rester récupérable. Les traces du temps restent cosmétiques et idéalement optionnelles.

## 14. R&D séparée — Widget écran d'accueil

L'idée #6 reste retenue mais n'est affectée à aucune version V2.x tant que la R&D n'a pas tranché :

- limites PWA iOS/Android ;
- WidgetKit et équivalent Android ;
- PWA pure vs couche native/hybride ;
- partage auth/session/données ;
- fréquence d'actualisation, offline et batterie ;
- distribution stores éventuelle ;
- bénéfice utilisateur réel par rapport au coût architectural.

Aucun choix V2 ne doit être dicté par le widget avant cette étude.

## 15. Carte des dépendances

### Personnalisation

`Placement 2.0 → Compositions → Sols / Peinture → Studio Photo → Éclairage / Arrière-plans → Partage`

### Vie du caillou

`Bio 2.0 → Journal → Traits évolutifs → Réactions contextuelles → Événements rares / Accomplissements`

### Bac à sable physique

`Placement 2.0 → Accessoires supplémentaires → Accessoires animés → Accessoires interactifs`

### Création visuelle

`Peinture V2.0 → Peinture avancée V2.4 → Traces du temps optionnelles`

## 16. Archive V1

La roadmap V1 complète est conservée dans `docs/roadmap/archive/v1/` avec son index final et les étapes 01 à 13, y compris 10A, 10B, 10C, 10D, 10.5 et 10.75.

Ces documents sont gelés. Le tag Git `v1.0.0` reste le snapshot logiciel exact de la première release publique.

## 17. Prochaine action

**V2-00 est terminée.**

Prochaine action : **cadrer puis créer le prompt autonome V2-01 — Placement 2.0** en intégrant la dette `ShowroomScene` identifiée par V2-00. Une fois ce cahier des charges validé, V2-01 pourra être exécutée.

Les autres fichiers détaillés `V2-XX-....md` seront créés uniquement lorsque leur périmètre est suffisamment défini pour servir de prompt autonome d'exécution.
