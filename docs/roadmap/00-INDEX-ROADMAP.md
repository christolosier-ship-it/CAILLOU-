# CAILLOU™ — Roadmap long terme V2.0 → V2.4

> **Statut : vision produit et feuille de route long terme validées le 3 septembre 2026.**
>
> La V1 est publiée sous le tag `v1.0.0` sur le commit `e9d926be0f2f09f9f1464cf5b4360f82dbeae2ad`.
> La roadmap V1 et tous ses fichiers d'étapes sont archivés à l'identique dans `docs/roadmap/archive/v1/` et ne doivent plus être réécrits.
>
> Ce document devient la source de vérité de planification pour la trajectoire **V2.0 → V2.4**. La piste **R&D widgets écran d'accueil** reste volontairement séparée de la roadmap séquentielle tant que son architecture n'est pas décidée.

## 1. Principe directeur

La V1 a construit le socle : compte, adoption, économie Lithon, Boutique, accessoires, Placement, physique, Bio/Stats, PWA, sécurité, persistance et résilience.

La V2 ne doit pas devenir une accumulation de nouveaux écrans. Sa direction produit est :

> **Ton caillou devient vraiment le tien.**

La trajectoire V2 s'organise autour de trois axes :

1. **Personnaliser le petit monde** : peinture, sols, éclairage, décors, compositions, Studio Photo.
2. **Donner une existence au caillou** : personnalité, journal, traits évolutifs, réactions et événements.
3. **Faire du Socle un bac à sable physique** : Placement 2.0, accessoires animés et interactifs, son et haptique.

## 2. Règles d'orchestration V2

- La V1 est une archive historique : ne jamais réécrire ses étapes pour refléter une décision V2.
- Une étape V2 terminée devient elle aussi historique.
- Les documents normatifs racine restent la baseline tant qu'une étape V2 ne les remplace ou ne les fait évoluer explicitement.
- Supabase reste la source de vérité métier et économique ; le frontend reste non autoritaire pour les achats, possessions, soldes et états persistants.
- `main` doit rester déployable ; travail par branche + Pull Request ; fusion uniquement avec les contrôles essentiels verts.
- Vercel est utilisé parcimonieusement : aucune Preview pour un changement purement documentaire et une Preview fonctionnelle seulement lorsqu'elle apporte une validation réelle.
- Éviter la prolifération de workflows/tests redondants : réutiliser les garde-fous existants et ajouter un test uniquement lorsqu'il protège un nouveau risque réel.
- Les migrations V1 → V2 doivent préserver les utilisateurs, leurs cailloux, Lithons, achats, déblocages et compositions existantes.
- Les nouvelles fonctions doivent rester compatibles téléphone, tablette et desktop ; la qualité tactile reste prioritaire.

## 3. Inventaire des idées et destination

| # | Idée | Intérêt utilisateur | Difficulté | Dépendances principales | Destination |
|---:|---|---|---|---|---|
| 1 | Ajouter des accessoires | ★★★★☆ | ★★☆☆☆ | pipeline GLB, catalogue, licences, Boutique | **V2.0** |
| 2 | Peindre son caillou | ★★★★★ | ★★★★☆ | matériaux Three.js, UV/masques, persistance | **V2.0** |
| 3 | Améliorer le Placement caillou/accessoires | ★★★★★ | ★★★★☆ | PlacementSession, tactile, Rapier, caméra | **V2.0 / fondation** |
| 4 | Vraie personnalité / Bio version CAILLOU | ★★★★★ | ★★★☆☆ | Bio, historique, traits persistants | **V2.0** |
| 5 | Accessoires animés | ★★★★☆ | ★★★★☆ | pipeline animation GLB, runtime 3D, performance | **V2.3** |
| 6 | Widget écran d'accueil | ★★★★★ | ★★★★★ | capacités OS, PWA/native, synchronisation | **R&D séparée** |
| 7 | Sols en Boutique : parquet, moquette, etc. | ★★★★★ | ★★★☆☆ | catalogue décor, matériaux/textures, Boutique | **V2.0** |
| 8 | Éclairage / ambiance du Socle | ★★★★☆ | ★★★☆☆ | Three.js, environnements, persistance | **V2.1** |
| 9 | Mode Photo / Studio | ★★★★★ | ★★★☆☆ | caméra, capture, compositions, éclairage | **V2.0** |
| 10 | Journal du caillou | ★★★★☆ | ★★★☆☆ | événements persistants, Bio/Stats | **V2.0** |
| 11 | Traits de personnalité évolutifs | ★★★★★ | ★★★★☆ | #4, #10, règles déterministes | **V2.2** |
| 12 | Réactions contextuelles | ★★★★☆ | ★★★☆☆ | #4, #11, metadata accessoires/décors | **V2.2** |
| 13 | Accessoires interactifs | ★★★★★ | ★★★★★ | #3, #5, Rapier, états persistants | **V2.3** |
| 14 | Collections / ensembles d'accessoires | ★★★★☆ | ★★☆☆☆ | #1, catégories, Boutique | **V2.1** |
| 15 | Décors d'arrière-plan | ★★★★☆ | ★★★☆☆ | #7, environnement, textures/GLB | **V2.1** |
| 16 | Traces du temps / patine | ★★★☆☆ | ★★★☆☆ | #2, ancienneté, #10 | **V2.4** |
| 17 | Événements rares et absurdes | ★★★★☆ | ★★★☆☆ | #4, #10, #11/#12 | **V2.2** |
| 18 | Accomplissements version CAILLOU | ★★★★☆ | ★★★☆☆ | Stats, #10, moteur de conditions | **V2.2** |
| 19 | Sauvegarder plusieurs compositions | ★★★★★ | ★★★★☆ | #3, snapshots, Supabase, décors | **V2.0** |
| 20 | Fiche publique / partage du caillou | ★★★★☆ | ★★★★☆ | #9, confidentialité/RLS, routes publiques | **V2.3** |
| 21 | Peinture avancée : motifs, zones, finitions, projections | ★★★★★ | ★★★★★ | #2, UV/masques, édition texture, GPU | **V2.4** |
| 22 | Son et haptique | ★★★★☆ | ★★★☆☆ | Rapier, audio, capacités appareil | **V2.1** |

## 4. Périmètre V2.0

La V2.0 constitue le prochain numéro majeur. Elle doit être suffisamment visible pour changer la perception de CAILLOU tout en restant finissable, testable et migrable proprement depuis la V1.

### Promesse V2.0

> **Personnaliser, composer, raconter.**

Le périmètre fonctionnel V2.0 comprend :

- Placement 2.0 ;
- plusieurs compositions sauvegardées ;
- nouveaux accessoires ;
- sols personnalisables en Boutique ;
- peinture simple mais robuste du caillou ;
- Bio/personnalité 2.0 ;
- journal de vie ;
- Studio Photo.

### Ce qui n'entre pas dans V2.0

- accessoires animés ou interactifs ;
- peinture complexe par zones/motifs ;
- personnalité évolutive avancée ;
- partage public ;
- traces du temps ;
- widget natif/PWA.

Ces sujets restent planifiés dans V2.x ou en R&D afin de ne pas mettre le chemin critique V2.0 en danger.

## 5. Ordre d'exécution V2.0

| Étape | Sujet | Objectif principal | Dépendances |
|---|---|---|---|
| **V2-00** | Architecture, cadrage et migrations | figer modèles de données, contrats, budgets et migration V1→V2 | V1 |
| **V2-01** | Placement 2.0 | rendre manipulation, caméra, sélection, précision et stabilisation excellentes | V2-00 |
| **V2-02** | Compositions | définir/sauvegarder/charger/dupliquer/supprimer une composition complète | V2-01 |
| **V2-03** | Nouveaux accessoires | industrialiser le pipeline et enrichir la Boutique | V2-00, V2-01 |
| **V2-04** | Sols | acheter, posséder, sélectionner et persister les sols | V2-02 |
| **V2-05** | Peinture | palette, preview, finition, persistance et retour roche naturelle | V2-00, V2-02 |
| **V2-06** | Bio / personnalité 2.0 | transformer la fiche descriptive en identité CAILLOU cohérente | V2-00 |
| **V2-07** | Journal de vie | mémoriser les événements significatifs et fournir la base des évolutions futures | V2-06 |
| **V2-08** | Studio Photo | cadrer, masquer l'UI et capturer les compositions personnalisées | V2-02, V2-04, V2-05 |
| **V2-09** | Harmonisation UX V2 | consolider navigation, Boutique, Placement, Bio, Journal, Studio et responsive | V2-01 à V2-08 |
| **V2-10** | Performance / PWA | recalibrer lazy loading, caches, mémoire GPU, textures et reprise offline | V2-03 à V2-09 |
| **V2-11** | Sécurité / économie | auditer RLS, RPC, achats, inventaire, compositions, peinture et journal | V2-02 à V2-10 |
| **V2-12** | QA / migration V1→V2 | automatisation ciblée + tests tactiles + tests matériels + migration réelle | V2-11 |
| **V2-13** | Release V2.0 | Preview finale utile, production, smoke tests, tag et release | V2-12 |

## 6. Détail des étapes V2.0

### V2-00 — Architecture, cadrage et migrations

Avant toute nouvelle UI :

- définir le modèle canonique d'une composition ;
- décider l'architecture de peinture ;
- définir les futurs catalogues de sols/décors ;
- définir le modèle personnalité + journal ;
- préciser les nouveaux contrats Supabase/RLS/RPC ;
- fixer budgets texture/GLB/mémoire/cache ;
- définir une migration sans perte depuis V1 ;
- identifier les anciennes structures à conserver, migrer ou déprécier.

### V2-01 — Placement 2.0

Fondation prioritaire :

- sélection de cible plus lisible ;
- translation/rotation/échelle plus précises ;
- caméra et gestes tactiles harmonisés ;
- contraintes de sol cohérentes ;
- feedback de sélection/manipulation ;
- meilleur contrôle sur téléphone et tablette ;
- annulation/restauration de session si pertinente ;
- stabilisation Rapier et persistance sans régression V1.

### V2-02 — Compositions

Une composition devient un objet produit explicite pouvant contenir :

- pose du caillou ;
- instances d'accessoires + transforms ;
- peinture ;
- sol ;
- ultérieurement éclairage et arrière-plan.

Fonctions : créer, nommer, charger, dupliquer, supprimer et définir la composition active.

### V2-03 — Nouveaux accessoires

- augmenter le catalogue ;
- maintenir provenance/licences ;
- garder des budgets mobiles stricts ;
- améliorer l'industrialisation du pipeline ;
- conserver la distinction propriété d'un type / instances placées.

### V2-04 — Sols

Premiers exemples : parquet, moquette, béton, carrelage et autres variations cohérentes avec la direction artistique.

Ils doivent fonctionner comme de vrais objets économiques : catalogue, prix éventuel, propriété permanente, sélection active et persistance.

### V2-05 — Peinture

V2.0 doit rester volontairement maîtrisée :

- couleur principale ;
- prévisualisation temps réel ;
- finition simple (par exemple mat/satiné/brillant si techniquement robuste) ;
- validation et persistance ;
- retour explicite à la roche naturelle.

La peinture avancée est réservée à V2.4.

### V2-06 — Bio / personnalité 2.0

- traits fondamentaux ;
- ton propre à CAILLOU ;
- préférences et caractéristiques absurdes mais cohérentes ;
- informations issues de l'histoire réelle du caillou ;
- aucune génération aléatoire incohérente qui change à chaque affichage.

### V2-07 — Journal de vie

Événements possibles : adoption, changement de nom, nettoyage, première peinture, achats marquants, premier accessoire, changement de sol, composition créée, anniversaires d'adoption et records pertinents.

Le journal devient la mémoire canonique utilisée ensuite par V2.2.

### V2-08 — Studio Photo

- UI masquable ;
- caméra plus libre ;
- zoom/cadrage ;
- formats de capture adaptés ;
- export d'une image propre du Socle.

### V2-09 à V2-13 — Consolidation et release

La fin de cycle V2.0 reprend la discipline éprouvée de V1 : harmonisation UX globale, performance/PWA, audit sécurité/économie, QA réelle de migration puis release uniquement lorsque les contrôles essentiels et les appareils physiques sont verts.

## 7. V2.1 — Décoration et sensation

Objectif : enrichir le petit monde construit en V2.0 sans modifier ses fondations.

Périmètre cible :

- **#8 Éclairage / ambiance du Socle** ;
- **#15 Décors d'arrière-plan** ;
- **#14 Collections / ensembles d'accessoires** ;
- **#22 Son et haptique**.

Résultat attendu : une composition ne change plus seulement par les objets qu'elle contient, mais également par son atmosphère visuelle et sensorielle.

## 8. V2.2 — Vie du caillou

Objectif : exploiter la personnalité et le journal V2.0 pour rendre le caillou réellement évolutif.

Périmètre cible :

- **#11 Traits de personnalité évolutifs** ;
- **#12 Réactions contextuelles** ;
- **#17 Événements rares et absurdes** ;
- **#18 Accomplissements version CAILLOU**.

Principe : l'évolution doit être compréhensible et déterministe à partir de l'histoire du compte. Elle ne doit pas devenir un système punitif de besoins quotidiens.

## 9. V2.3 — Interaction et partage

Objectif : rendre la scène plus vivante et commencer à faire sortir le caillou de son Socle privé.

Périmètre cible :

- **#5 Accessoires animés** ;
- **#13 Accessoires interactifs** ;
- **#20 Fiche publique / partage du caillou**.

Les accessoires animés doivent précéder ou accompagner les interactifs afin de stabiliser le pipeline animation/performance avant d'introduire des états physiques et métier supplémentaires.

Le partage public reste volontairement léger : exposition optionnelle d'une fiche/composition, pas de réseau social complet.

## 10. V2.4 — Personnalisation avancée et traces du temps

Objectif : pousser l'appropriation individuelle lorsque la peinture et le journal sont éprouvés.

Périmètre cible :

- **#16 Traces du temps / patine** ;
- **#21 Peinture avancée** : motifs, zones, finitions supplémentaires, projections ou outils créatifs compatibles avec les performances mobiles.

La roche naturelle d'origine doit toujours rester récupérable. Les traces du temps doivent être cosmétiques, explicables et idéalement optionnelles.

## 11. R&D séparée — Widget écran d'accueil

L'idée **#6 Widget écran d'accueil** reste retenue mais n'est affectée à aucune version V2.x tant que la R&D n'a pas tranché l'architecture.

Questions à résoudre séparément :

- jusqu'où peut aller une PWA installée sur iOS/Android sans composant natif ;
- faut-il envisager WidgetKit côté Apple et l'équivalent Android ;
- faut-il emballer CAILLOU dans une couche native/hybride ou conserver une PWA pure ;
- comment partager session/auth/données entre widget et application ;
- fréquence d'actualisation, fonctionnement offline et consommation batterie ;
- maintenance et distribution App Store/Play Store éventuelles ;
- bénéfice utilisateur réel par rapport au coût architectural.

Aucun changement d'architecture V2 ne doit être imposé par le widget avant cette étude.

## 12. Carte des dépendances produit

### Personnalisation

`Placement 2.0 → Compositions → Sols / Peinture → Studio Photo → Éclairage / Arrière-plans → Partage`

### Vie du caillou

`Bio 2.0 → Journal → Traits évolutifs → Réactions contextuelles → Événements rares / Accomplissements`

### Bac à sable physique

`Placement 2.0 → Accessoires supplémentaires → Accessoires animés → Accessoires interactifs`

### Création visuelle

`Peinture V2.0 → Peinture avancée V2.4 → Traces du temps optionnelles`

## 13. Discipline de version

### V2.0

Numéro majeur : personnalisation, compositions et identité du caillou changent nettement l'expérience.

### V2.1

Enrichissement du décor et de la sensation.

### V2.2

Évolution comportementale et narrative.

### V2.3

Interactions 3D avancées et partage.

### V2.4

Personnalisation visuelle avancée et histoire cosmétique.

Les numéros V2.x décrivent une intention produit, pas une obligation de livrer toutes les idées si une étude technique démontre qu'elles sont disproportionnées ou incompatibles avec la qualité mobile. Tout retrait ou déplacement doit être documenté ici avant exécution.

## 14. Archive V1

La roadmap V1 complète est conservée dans :

`docs/roadmap/archive/v1/`

Elle contient l'index final et les étapes 01 à 13, y compris les sous-étapes historiques 10A, 10B, 10C, 10D, 10.5 et 10.75.

Règle : **ces documents sont gelés**. Ils servent de mémoire d'exécution et de justification des décisions V1. Les corrections ou évolutions postérieures doivent être consignées dans les documents V2, jamais rétroécrites dans l'archive.

Le tag Git `v1.0.0` reste en parallèle le snapshot logiciel exact de la première release publique.

## 15. Prochaine action

Avant toute implémentation V2 : créer et exécuter **V2-00 — Architecture, cadrage et migrations** à partir de cette feuille de route.

Les fichiers détaillés `V2-XX-....md` seront créés au moment où leur périmètre est suffisamment défini pour servir de prompt autonome d'exécution. Ce document reste le niveau stratégique et l'ordre de référence.
