# CAILLOU™ — Roadmap long terme V2.0 → V2.4

> **Statut : feuille de route long terme active — planification V2.0 révisée le 4 septembre 2026.**
>
> La V1 est publiée sous le tag `v1.0.0` sur le commit `e9d926be0f2f09f9f1464cf5b4360f82dbeae2ad`.
> La roadmap V1 et ses documents historiques sont gelés dans `docs/roadmap/archive/v1/`.
> V2-00 est terminée et gelée dans [`V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md`](V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md).
> Le présent document est la **source de vérité de planification active** pour V2.0 → V2.4 et supersède les hypothèses de planification antérieures lorsqu'elles ont été explicitement révisées après V2-00.
> La piste **R&D widget écran d'accueil** reste séparée de la roadmap séquentielle.

---

## 1. Principe directeur

La V1 a construit le socle : compte, adoption, économie Lithon, Boutique, accessoires, Placement, physique, Bio/Stats, PWA, sécurité, persistance et résilience.

V2-00 a ensuite assaini l'architecture du Socle : état React canonique, suppression du raccord DOM historique, séparation des responsabilités et cadrage des grandes familles V2.

À partir de V2-01, la roadmap entre dans la **vraie construction produit V2**.

La direction produit reste :

> **Ton caillou devient vraiment le tien.**

Trois axes structurent la trajectoire :

1. **Personnaliser le petit monde** : accessoires, sols, peinture, éclairage, décors et Studio Photo.
2. **Donner une existence au caillou** : personnalité, journal, traits évolutifs, réactions et événements.
3. **Faire du Socle un bac à sable physique crédible** : Placement 2.0, collisions fines, accessoires animés/interactifs, son et haptique.

Pour V2.0, la promesse devient :

> **Personnaliser, aménager, raconter.**

---

## 2. Règles d'orchestration V2

### 2.1 Historique et documents autonomes

- La V1 est historique : ne jamais réécrire ses étapes pour refléter une décision V2.
- V2-00 est historique : ne pas le réécrire pour masquer les décisions produit prises ensuite.
- Une étape V2 terminée devient elle aussi historique.
- Chaque étape V2 doit être préparée dans un **fichier Markdown autonome** qui sert à la fois de cahier des charges d'exécution et, après réalisation, de compte rendu historique.
- `00-INDEX-ROADMAP.md` reste l'index et la source de vérité d'ordonnancement ; les fichiers `V2-XX-....md` portent le détail exécutable.

### 2.2 Architecture et autorité

Règle normative héritée de V2-00 :

> **DOM = rendu. React = source de vérité UI. Supabase = source de vérité serveur et économique.**

En complément :

- le frontend peut manipuler un **draft local** mais ne fabrique jamais une possession, un achat, un solde ou un déblocage confirmé ;
- les opérations économiques sensibles restent transactionnelles, autoritaires et idempotentes côté Supabase ;
- les modèles SQL sont sécurisés dès l'étape qui les introduit : DDL, RLS, RPC/grants, tests négatifs et stratégie de migration appartiennent au même chantier ;
- V2-11 est une passe de hardening transversal, pas l'endroit où l'on sécurise tardivement les modèles créés précédemment.

### 2.3 Livraison

- `main` doit rester déployable ; travail par branche + PR ; fusion uniquement avec les contrôles essentiels verts.
- Réutiliser les workflows existants `CI` et `Browser regression` ; ne pas recréer une collection de workflows par feature.
- Vercel est utilisé parcimonieusement : aucune Preview réflexe ; une Preview seulement lorsqu'elle apporte une validation distante réelle.
- Les changements purement documentaires doivent continuer à être ignorés par le build Vercel lorsque le garde-fou existant le permet.
- Les migrations V1 → V2 doivent préserver comptes, cailloux, Lithons, ledger, achats et données historiques, sauf **changement de règle métier explicitement acté** dans cette roadmap.
- Toute fonction reste compatible téléphone, tablette et desktop, avec priorité au tactile.

---

## 3. Décisions produit V2.0 actées le 4 septembre 2026

Cette section est normative pour tous les futurs prompts V2.0.

### 3.1 Un seul petit monde, pas de compositions multiples

L'idée de plusieurs compositions sauvegardées est abandonnée pour V2.0.

Un caillou actif possède **un seul état persistant du Socle**.

Il n'existe donc pas de fonctionnalité utilisateur :

- Nouvelle composition ;
- Dupliquer une composition ;
- Changer de composition ;
- Supprimer une composition ;
- choisir une composition active.

Le mot `composition` peut rester utilisé techniquement pour désigner l'état cohérent caillou + objets + environnement, mais il ne représente plus une collection de sauvegardes ni une fonctionnalité achetable.

Le contrat multi-compositions évoqué dans V2-00 reste un cadrage historique supersédé par cette décision active.

### 3.2 Placement 2.0 : caillou et accessoires sont des objets manipulables identiques

Le Placement V2 ne doit pas maintenir deux moteurs UX séparés selon la nature de la cible.

Conceptuellement :

```text
ObjectTarget
├── rock
└── accessory
```

Chaque objet expose seulement ses capacités :

```text
Rock
- position : oui
- rotation : oui
- scale : non

Accessory
- position : oui
- rotation : oui
- scale : oui selon catalogue
```

Le moteur de sélection, de geste et de collision est commun.

### 3.3 Ergonomie hybride du Placement

Interaction cible :

1. tap direct sur un objet pour le sélectionner ;
2. fallback par sélecteur/listing lorsque le tap direct est difficile ou ambigu ;
3. une fois sélectionné, **tout le canvas** devient la surface de contrôle ;
4. une petite barre contextuelle expose les outils disponibles, par exemple Position / Rotation / Taille ;
5. la cible sélectionnée reste visuellement évidente.

### 3.4 Caméra contrôlable pendant une session Placement

La caméra devient une **cible de contrôle** accessible dans le Placement, sans être un objet physique.

Conceptuellement :

```text
PlacementControlTarget
├── camera
└── object
    ├── rock
    └── accessory
```

Quand `camera` est sélectionnée :

- le canvas contrôle l'orbite / orientation du point de vue ;
- le pinch contrôle le zoom ;
- la session Placement reste ouverte ;
- aucun draft objet n'est perdu ;
- aucune stabilisation/persistance n'est déclenchée ;
- le dernier objet manipulé peut être repris directement après orientation de la caméra.

### 3.5 Collisions réelles pendant la manipulation

La règle V1 qui autorisait volontairement les interpénétrations pendant Placement est supprimée en V2-01.

En V2 :

> **un objet manipulé ne peut pas traverser le caillou, un autre accessoire ni le sol.**

Les zones de collision doivent suivre la géométrie perceptible des objets suffisamment finement pour que deux objets en contact paraissent réellement se toucher.

Sont explicitement refusés :

- grosses sphères génériques produisant un espace visible ;
- boîtes de collision surdimensionnées ;
- distance de sécurité artificielle donnant l'impression que les objets flottent.

Le pipeline devra préférer, selon la géométrie et le coût :

- convex hull proche du mesh ;
- compound collider composé de plusieurs volumes convexes ;
- collision proxy dédié dérivé de la géométrie ;
- toute autre méthode mesurée offrant un contact crédible et des performances mobiles acceptables.

L'algorithme exact sera tranché par V2-01/V2-03 après tests concrets sur les roches et accessoires réels.

### 3.6 Chaque accessoire est un objet unique

Un item du catalogue accessoires représente **un objet unique achetable une seule fois**.

Règles :

- un accessoire ne peut être acheté qu'une fois par compte ;
- après achat, la Boutique affiche `Possédé` ;
- cet objet ne peut être placé qu'une seule fois simultanément ;
- il n'est plus possible de fabriquer plusieurs instances d'un même accessoire possédé ;
- si un doublon visuellement identique devait un jour exister, il devrait être une référence catalogue distincte ;
- la possession d'un accessoire appartient au compte et survit au changement de caillou ;
- jeter un caillou retire les placements de son Socle mais ne retire pas les accessoires possédés du compte.

Le plafond V1 de huit objets placés reste un garde-fou provisoire tant que V2-01/V2-03 n'ont pas mesuré le plafond réellement soutenable sur appareils cibles avec collisions fines et physique active.

Le plafond final sera décidé par des tests concrets, pas par un nombre arbitraire.

### 3.7 Deux familles commerciales dans la Boutique

La Boutique distingue clairement :

#### Biens permanents au compte

Exemples :

- accessoires ;
- sols ;
- futurs décors ;
- futurs arrière-plans ;
- futures ambiances ou autres biens décoratifs.

Une fois acquis, ces biens restent possédés même si le caillou actif est jeté.

#### Fonctionnalités liées au caillou

Exemples V2.0 :

- Permis de manutention minérale ;
- Peinture ;
- Personnalité ;
- Journal de vie ;
- Studio Photo.

Une fonctionnalité est acquise pour **un `user_rock` précis**.

Si ce caillou est jeté :

- son historique peut rester conservé côté serveur ;
- le nouveau caillou n'hérite d'aucune de ses fonctionnalités payantes ;
- les fonctionnalités doivent être acquises de nouveau pour le nouveau caillou.

Bio/Stats de base restent une fonction gratuite issue de la V1.

### 3.8 Migration particulière du Permis V1

Le Permis V1 est actuellement un déblocage lié au compte.

Décision V2 explicite :

> **le Permis V1 n'est pas converti gratuitement en Permis V2 sur le caillou actif.**

Lors de l'entrée dans le modèle V2 :

- l'achat historique V1 reste conservé dans le ledger/historique ;
- l'ancien entitlement compte ne devient pas un entitlement du caillou ;
- même le premier caillou V2 doit acheter son propre Permis V2 en Lithons ;
- jeter ce caillou fait perdre ce Permis pour le suivant.

Cette décision constitue une exception volontaire au principe général de conservation des déblocages V1.

### 3.9 Lithons, acquisitions et future option Succès

Les Lithons restent la monnaie de référence pour les biens et fonctionnalités achetables.

Certains produits peuvent avoir un prix nul.

Le modèle d'entitlement ne doit toutefois pas supposer qu'un droit provient obligatoirement d'un achat : la roadmap conserve l'option future d'accorder un accessoire ou une fonctionnalité via un système de succès/accomplissements.

Cette possibilité doit être **architecturalement compatible**, mais aucun moteur de succès n'est implémenté en V2.0 sauf décision ultérieure explicite.

Principe :

```text
possession / entitlement ≠ obligatoirement achat dans le ledger
```

### 3.10 Personnalité

Le caillou **est comme il est**.

V2-06 devra cadrer précisément cette feature, mais les règles suivantes sont déjà actées :

- personnalité attribuée/déterminée automatiquement ;
- persistée pour le caillou ;
- cohérente avec le spécimen, l'adoption et/ou son histoire selon les règles finales ;
- aucun reroll utilisateur ;
- aucun changement aléatoire à chaque ouverture ;
- fonctionnalité payante liée au caillou.

### 3.11 Journal de vie

Le Journal est une fonctionnalité payante liée au caillou.

V2-07 doit reconstruire autant que possible l'histoire V1 à partir d'événements **réellement prouvables** : adoption, opérations datées, achats/déblocages ou autres faits canoniques exploitables.

Aucun événement historique ne doit être inventé lorsqu'une date, un acteur ou un rattachement au caillou ne peut pas être établi de manière fiable.

Les événements V2 futurs doivent devenir traçables/idempotents dès leur création.

### 3.12 Studio Photo

Le Studio Photo est une fonctionnalité payante liée au caillou.

V2.0 couvre uniquement :

- cadrage/caméra Studio ;
- UI masquable ;
- capture locale ;
- téléchargement local ;
- partage natif via les capacités du navigateur/appareil lorsque disponible.

Sont exclus de V2.0 :

- galerie cloud ;
- stockage serveur de photos ;
- URL publique ;
- fiche publique.

Le partage public reste une piste V2.3.

---

## 4. Inventaire des idées et destination révisée

| # | Idée | Décision active | Destination |
|---:|---|---|---|
| 1 | Ajouter des accessoires | oui, objets uniques + pipeline collisions | **V2.0** |
| 2 | Peindre son caillou | oui, fonctionnalité payante par caillou | **V2.0** |
| 3 | Améliorer Placement caillou/accessoires | oui, fondation prioritaire | **V2.0 / fondation** |
| 4 | Vraie personnalité CAILLOU | oui, payante par caillou, sans reroll | **V2.0** |
| 5 | Accessoires animés | oui plus tard | **V2.3** |
| 6 | Widget écran d'accueil | R&D séparée | **R&D** |
| 7 | Sols en Boutique | oui, bien permanent au compte | **V2.0** |
| 8 | Éclairage / ambiance | oui plus tard | **V2.1** |
| 9 | Studio Photo | oui, payant par caillou, local uniquement en V2.0 | **V2.0** |
| 10 | Journal du caillou | oui, payant par caillou | **V2.0** |
| 11 | Traits évolutifs | oui plus tard | **V2.2** |
| 12 | Réactions contextuelles | oui plus tard | **V2.2** |
| 13 | Accessoires interactifs | oui plus tard | **V2.3** |
| 14 | Collections d'accessoires | oui plus tard | **V2.1** |
| 15 | Décors d'arrière-plan | oui plus tard, biens au compte | **V2.1** |
| 16 | Traces du temps / patine | oui plus tard | **V2.4** |
| 17 | Événements rares et absurdes | oui plus tard | **V2.2** |
| 18 | Accomplissements CAILLOU | oui plus tard ; récompenses d'entitlement restent une option | **V2.2** |
| 19 | Plusieurs compositions sauvegardées | **abandonné** ; un seul état canonique du Socle | **Supprimé** |
| 20 | Fiche publique / partage | oui plus tard | **V2.3** |
| 21 | Peinture avancée | oui plus tard | **V2.4** |
| 22 | Son et haptique | oui plus tard | **V2.1** |

---

## 5. Périmètre V2.0

### Promesse

> **Personnaliser, aménager, raconter.**

V2.0 comprend :

- Placement 2.0 et refonte ciblée de la scène interactive ;
- état canonique unique du Socle et nouvelle taxonomie économique ;
- accessoires uniques et catalogue/pipeline V2 ;
- sols personnalisables en Boutique ;
- peinture simple et robuste ;
- personnalité 2.0 ;
- journal de vie ;
- Studio Photo local ;
- harmonisation UX ;
- performance/PWA ;
- hardening sécurité/économie ;
- QA/migration V1 → V2 ;
- release V2.0.

Restent hors V2.0 :

- compositions multiples ;
- accessoires animés/interactifs ;
- éclairage/ambiances avancés ;
- décors d'arrière-plan ;
- peinture avancée ;
- personnalité évolutive avancée ;
- accomplissements opérationnels ;
- partage public ;
- traces du temps ;
- widget écran d'accueil.

---

## 6. Ordre d'exécution V2.0 et futurs prompts autonomes

| Étape | Futur fichier autonome | Sujet | Objectif principal | Dépendances | Statut |
|---|---|---|---|---|---|
| **[V2-00](V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md)** | existant | Architecture / cadrage | assainir la V1 et préparer V2 | V1 | **✅ Terminée — PR #38** |
| **V2-01** | `V2-01-PLACEMENT-2-0-SCENE-INTERACTIVE.md` | Placement 2.0 | moteur objets unifié, caméra contrôlable, collisions géométriques crédibles, tactile | V2-00 | **Prochaine à prompter** |
| **V2-02** | `V2-02-SOCLE-CANONIQUE-ECONOMIE-V2.md` | Socle canonique & économie V2 | état unique, accessoires unitaires, biens compte, fonctionnalités caillou, migration Permis | V2-01 | À prompter |
| **V2-03** | `V2-03-ACCESSOIRES-V2-PIPELINE-COLLISIONS.md` | Accessoires V2 | enrichir catalogue, industrialiser GLB/colliders/previews/licences, mesurer plafond d'objets | V2-01, V2-02 | À prompter |
| **V2-04** | `V2-04-SOLS-BOUTIQUE-DECORATIVE.md` | Sols | acheter, posséder au compte, sélectionner et rendre les sols | V2-02 | À prompter |
| **V2-05** | `V2-05-PEINTURE-CAILLOU.md` | Peinture | achat de la feature, preview, couleur/finition, persistance, retour naturel | V2-02 | À prompter |
| **V2-06** | `V2-06-PERSONNALITE-2-0.md` | Personnalité 2.0 | fonctionnalité payante, identité stable et déterministe du caillou | V2-02 | À prompter |
| **V2-07** | `V2-07-JOURNAL-DE-VIE.md` | Journal | fonctionnalité payante, mémoire canonique et backfill V1 prouvable | V2-02, V2-06 | À prompter |
| **V2-08** | `V2-08-STUDIO-PHOTO.md` | Studio Photo | fonctionnalité payante, caméra Studio, capture/download/share local | V2-01, V2-02, V2-04, V2-05 | À prompter |
| **V2-09** | `V2-09-HARMONISATION-UX-V2.md` | Harmonisation UX | rendre Placement, Boutique, Bio, personnalité, Journal et Studio cohérents | V2-01 à V2-08 | À prompter |
| **V2-10** | `V2-10-PERFORMANCE-PWA-V2.md` | Performance / PWA | GPU, colliders, textures, cache, lazy load, offline et appareils modestes | V2-03 à V2-09 | À prompter |
| **V2-11** | `V2-11-SECURITE-ECONOMIE-HARDENING.md` | Sécurité / économie | audit transversal RLS/RPC/ownership/entitlements/idempotence | V2-02 à V2-10 | À prompter |
| **V2-12** | `V2-12-QA-MIGRATION-V1-V2.md` | QA / migration | prouver migration réelle, vieux cache PWA, tactile et appareils physiques | V2-11 | À prompter |
| **V2-13** | `V2-13-RELEASE-V2-0.md` | Release | Preview finale utile, production, smoke tests, tag/release et archivage | V2-12 | À prompter |

Règle de création : un prompt autonome n'est créé que lorsque ses décisions métier essentielles sont suffisamment stables pour éviter d'inscrire des ambiguïtés structurantes dans le chantier.

---

## 7. V2-01 — Placement 2.0 & scène interactive

### Objectif produit

Faire du Placement un outil tactile naturel où caillou et accessoires se manipulent selon la même grammaire et où l'utilisateur peut réorienter la caméra sans quitter sa session.

### Axes d'implémentation à détailler dans le prompt autonome

#### A. Architecture de scène

- traiter la dette `ShowroomScene` identifiée par V2-00 ;
- séparer proprement rendu, caméra, contrôle Placement et physique quand cette séparation sert directement l'UX ;
- ne pas recréer un god-component ailleurs ;
- conserver `PedestalScreen` / état canonique Socle comme orchestration React.

#### B. Cible de contrôle

- `camera` ;
- `object:rock` ;
- `object:accessory` ;
- tap direct pour sélectionner un objet ;
- sélecteur secondaire pour les cas difficiles ;
- conservation du dernier objet actif quand on passe temporairement sur la caméra.

#### C. Grammaire tactile

- tout le canvas pilote la cible sélectionnée ;
- barre contextuelle minimale ;
- Position / Rotation communes ;
- Taille uniquement pour les accessoires autorisés ;
- caméra : orbite + zoom ;
- priorité au tactile téléphone/tablette, desktop conservé.

#### D. Collisions

- aucune interpénétration volontaire pendant Placement ;
- caillou, accessoires et sol sont des obstacles réels ;
- colliders au plus près du volume visible ;
- pas de marge donnant un effet flottant ;
- stratégie collider choisie par asset/forme et mesurée ;
- comportement stable pendant geste cinématique puis transition Rapier.

#### E. Session

- snapshot initial ;
- draft local ;
- changement caméra/objet sans perdre le draft ;
- Annuler restaure l'état initial ;
- Terminer lance la résolution/stabilisation puis persiste l'état confirmé ;
- aucun double-submit ou mutation fantôme.

#### F. Mesures

- coût CPU/GPU des colliders ;
- stabilité tactile ;
- latence de manipulation ;
- comportement avec plusieurs objets ;
- préparer les mesures qui permettront à V2-03 de fixer le plafond d'objets placés.

### Hors périmètre V2-01

- nouveaux accessoires de catalogue en masse ;
- nouvelle économie ;
- sols ;
- peinture ;
- personnalité ;
- Journal ;
- Studio Photo.

---

## 8. V2-02 — Socle canonique & économie V2

Cette étape remplace l'ancienne V2-02 « Compositions ».

### Objectif

Donner au petit monde un contrat serveur V2 unique et faire évoluer les règles de possession avant l'arrivée des nouvelles fonctions payantes.

### Travaux attendus

#### A. État canonique unique

- un caillou actif = un Socle persistant ;
- pas de collection de compositions ;
- définir où vivent proprement pose du caillou, placements accessoires et extensions futures sol/peinture/environnement ;
- conserver un schéma évolutif/versionnable si utile sans créer de table spéculative inutile.

#### B. Accessoires unitaires

- une possession catalogue = un objet unique ;
- achat une seule fois ;
- placement simultané au maximum une fois ;
- suppression de la création multi-instance V1 ;
- conservation de la possession au niveau du compte lors d'un changement de caillou ;
- migration sûre du contrat actuel.

#### C. Biens compte vs fonctionnalités caillou

- biens décoratifs durables au compte ;
- fonctionnalités attachées à `user_rock_id` ;
- évolution du catalogue / entitlement sans fusion artificielle de tous les métiers ;
- opérations économiques autoritaires et idempotentes.

#### D. Permis V1 → V2

- conserver l'historique de dépense V1 ;
- ne pas transférer le déblocage au caillou ;
- exiger un nouvel achat V2 pour le caillou actif ;
- nouveau caillou = aucun Permis hérité.

#### E. Compatibilité future Succès

- un entitlement doit pouvoir exister sans transaction Lithon future ;
- ne pas implémenter le moteur de succès ;
- ne pas coupler la possession à une ligne de dépense obligatoire.

### Sécurité

Toute migration SQL de V2-02 doit inclure immédiatement RLS, grants/RPC, idempotence, tests de propriété et stratégie de compatibilité avec la PWA V1 en cache.

---

## 9. V2-03 — Accessoires V2 & pipeline collisions

### Objectif

Passer des quatre accessoires V1 à un catalogue extensible sans dégrader le tactile ni la physique.

### Travaux attendus

- nouveaux assets GLB sélectionnés et licenciés/provenancés ;
- une référence catalogue = un objet unique ;
- preview dédiée ;
- dimensions et limites d'échelle ;
- métadonnées physiques ;
- collider/proxy de collision dédié ou dérivé ;
- budget triangles / poids / textures ;
- chargement paresseux ;
- contrôle de disposal GPU ;
- industrialisation du pipeline d'import ;
- validation visuelle des contacts physiques ;
- tests progressifs du nombre d'objets placés.

### Plafond d'objets

Le plafond V1 de 8 reste provisoire jusqu'aux tests.

V2-03 devra mesurer plusieurs paliers sur les appareils cibles et proposer un plafond final fondé sur :

- fluidité UI ;
- coût collision ;
- stabilité Rapier ;
- mémoire GPU ;
- temps de chargement ;
- qualité d'expérience tactile.

---

## 10. V2-04 — Sols & Boutique décorative

### Règle métier

Un sol est un **bien permanent au compte**.

### Travaux attendus

- catalogue serveur de sols ;
- prix Lithons éventuel, y compris items gratuits ;
- achat unique ;
- possession durable au compte ;
- sélection du sol utilisé par le Socle actif ;
- rendu matériau/texture ;
- preview Boutique ;
- provenance/licence ;
- budgets texture/cache/GPU ;
- interaction cohérente avec le sol physique du Placement ;
- préparation du futur contrat décors/arrière-plans sans les implémenter.

L'économie reste autoritaire côté Supabase dès cette étape.

---

## 11. V2-05 — Peinture du caillou

### Règle métier

Peinture est une **fonctionnalité payante liée au caillou**.

### Travaux attendus

- acquisition en Lithons depuis la Boutique ;
- état verrouillé clair si non acquise ;
- preview locale ;
- couleur principale ;
- finition simple ;
- persistance serveur ;
- matériau original du GLB toujours récupérable ;
- état `natural` explicite ;
- aucune peinture bitmap/UV avancée en V2.0 ;
- migration/format compatible avec V2.4.

---

## 12. V2-06 — Personnalité 2.0

### Règle métier

Personnalité est une **fonctionnalité payante liée au caillou**.

### Principe

> **Le caillou est comme il est.**

Le prompt autonome devra définir précisément :

- nombre et nature des traits ;
- part issue du spécimen ;
- part issue de l'adoption et de l'histoire ;
- méthode déterministe/assignée ;
- persistance ;
- contenu éditorial ;
- relation avec Bio/Stats gratuits ;
- comportement après changement de caillou.

Sont interdits en V2.0 : reroll utilisateur et personnalité recalculée aléatoirement à chaque affichage.

---

## 13. V2-07 — Journal de vie

### Règle métier

Journal est une **fonctionnalité payante liée au caillou**.

### Travaux attendus

- modèle événementiel canonique/append-only si nécessaire ;
- événements V2 déterministes et traçables ;
- `eventKey`/idempotence pour les écritures rejouables ;
- projection éditoriale distincte de l'événement source ;
- backfill V1 uniquement lorsque le fait est prouvable ;
- aucune attribution artificielle d'un achat ou événement à un caillou lorsque les données historiques ne permettent pas de l'établir ;
- base réutilisable par V2.2 pour traits évolutifs, réactions, événements rares et accomplissements.

L'historique d'un caillou jeté peut rester conservé côté serveur même si le nouveau caillou ne possède pas la fonctionnalité Journal.

---

## 14. V2-08 — Studio Photo

### Règle métier

Studio Photo est une **fonctionnalité payante liée au caillou**.

### Travaux attendus

- entrée Studio depuis le Socle ;
- caméra libre dédiée ;
- zoom/cadrage ;
- UI masquée pendant capture ;
- formats de sortie adaptés téléphone/tablette/desktop ;
- capture locale ;
- téléchargement ;
- Web Share API / partage système lorsque disponible ;
- aucun stockage cloud V2.0 ;
- aucun lien public V2.0.

Le Studio réutilise le petit monde réel : sol, peinture et accessoires actuellement présents.

---

## 15. V2-09 à V2-13 — Consolidation et release

### V2-09 — Harmonisation UX V2

Objectif : transformer l'ensemble des features en expérience cohérente.

À couvrir :

- hiérarchie des actions du Socle ;
- Boutique : séparation visuelle Biens / Fonctionnalités ;
- états verrouillés/acquis/possédés ;
- Placement et caméra ;
- Bio/Stats gratuits vs Personnalité payante ;
- Journal ;
- Studio ;
- responsive ;
- accessibilité ;
- messages offline/pending/error.

### V2-10 — Performance / PWA

Objectif : conserver une V2 fluide malgré l'enrichissement 3D.

À couvrir :

- bundle/lazy loading ;
- GLB ;
- colliders ;
- textures de sols ;
- mémoire GPU ;
- disposal ;
- caches PWA bornés ;
- reprise offline ;
- temps de chargement ;
- appareils modestes ;
- vérification du plafond d'objets retenu.

### V2-11 — Sécurité / économie / hardening

Objectif : audit transversal final, pas première sécurisation.

Scénarios minimum :

- acheter sans Lithons ;
- acheter deux fois le même accessoire ;
- placer un accessoire non possédé ;
- placer deux fois un objet unique ;
- lire/modifier le Socle d'un autre compte ;
- utiliser une fonctionnalité non débloquée sur ce caillou ;
- réutiliser un déblocage d'un caillou jeté ;
- acheter une fonctionnalité pour un caillou tiers ;
- rejouer les mutations ;
- contourner les prix client ;
- modifier des événements Journal hors contrat.

### V2-12 — QA / migration V1 → V2

Objectif : prouver une migration réelle et sûre.

À couvrir :

- compte V1 réel/fixture représentative ;
- caillou actif ;
- accessoires possédés ;
- placements V1 ;
- ledger et wallet ;
- ancien Permis conservé historiquement mais non transféré comme entitlement V2 ;
- achat du nouveau Permis par le caillou ;
- cache PWA V1 encore présent ;
- upgrade service worker ;
- offline/reconnexion ;
- téléphone, tablette et desktop ;
- smoke tests physiques réels.

### V2-13 — Release V2.0

Objectif : livrer, pas développer une nouvelle feature.

- contrôles essentiels verts ;
- une Preview finale seulement si elle apporte la validation distante nécessaire ;
- production ;
- HTTP/runtime ;
- smoke tests appareils ;
- vérification Supabase ;
- documentation finale ;
- tag/release V2.0 ;
- archivage de l'état terminé.

---

## 16. V2.1 — Décoration et sensation

Périmètre cible :

1. éclairage / ambiance ;
2. décors d'arrière-plan ;
3. collections d'accessoires ;
4. son et haptique ;
5. QA/performance/release V2.1.

Les nouveaux biens décoratifs restent des possessions permanentes au compte sauf décision contraire explicite.

Objectif : enrichir l'atmosphère visuelle et sensorielle sans remettre en cause le modèle de Socle V2.0.

---

## 17. V2.2 — Vie du caillou

Périmètre cible :

1. traits de personnalité évolutifs ;
2. réactions contextuelles ;
3. accomplissements CAILLOU ;
4. événements rares et absurdes ;
5. éventuelles récompenses par entitlement si cette option est confirmée ;
6. QA/release V2.2.

Principe : évolution compréhensible et déterministe à partir de l'histoire canonique, jamais système punitif de besoins quotidiens.

Le système de succès/accomplissements pourra éventuellement accorder des biens ou fonctionnalités sans dépense Lithon, mais cette mécanique reste une **option**, pas un engagement de V2.0.

---

## 18. V2.3 — Interaction et partage

Périmètre cible :

1. pipeline animation ;
2. accessoires animés ;
3. accessoires interactifs ;
4. états persistants liés aux interactions lorsque nécessaire ;
5. fiche publique / partage ;
6. QA/performance/sécurité/release V2.3.

Les animations doivent être maîtrisées en performance avant d'ajouter des interactions physiques/métier.

Le partage reste léger et optionnel, pas un réseau social complet.

---

## 19. V2.4 — Personnalisation avancée

Périmètre cible :

1. architecture peinture avancée ;
2. zones / motifs / masques / finitions ;
3. outils créatifs adaptés au tactile ;
4. traces du temps / patine optionnelles ;
5. QA GPU / migration / release V2.4.

La roche naturelle d'origine doit toujours rester récupérable.

---

## 20. R&D séparée — Widget écran d'accueil

L'idée Widget reste retenue mais n'est affectée à aucune version V2.x tant que la R&D n'a pas tranché :

- limites PWA iOS/Android ;
- WidgetKit et équivalent Android ;
- PWA pure vs couche native/hybride ;
- partage auth/session/données ;
- fréquence d'actualisation, offline et batterie ;
- distribution stores éventuelle ;
- bénéfice utilisateur réel par rapport au coût architectural.

Aucun choix V2 ne doit être dicté par le widget avant cette étude.

---

## 21. Carte des dépendances révisée

### Socle physique

```text
V2-00 Architecture
  → V2-01 Placement 2.0
  → V2-02 Socle canonique / économie V2
  → V2-03 Accessoires V2
```

### Personnalisation

```text
V2-02 Socle canonique
  → V2-04 Sols
  → V2-05 Peinture
  → V2-08 Studio Photo
  → V2.1 Éclairage / arrière-plans
  → V2.3 Partage
```

### Vie du caillou

```text
V2-02 Entitlements par caillou
  → V2-06 Personnalité
  → V2-07 Journal
  → V2.2 Traits évolutifs
  → Réactions / Accomplissements / Événements rares
```

### Bac à sable physique

```text
V2-01 Placement / collisions fines
  → V2-03 Pipeline colliders accessoires
  → V2.3 Accessoires animés
  → V2.3 Accessoires interactifs
```

### Création visuelle

```text
V2-05 Peinture simple
  → V2.4 Peinture avancée
  → V2.4 Patine / traces du temps
```

---

## 22. Format obligatoire des futurs prompts autonomes

Chaque fichier `V2-XX-....md` devra pouvoir être exécuté dans une nouvelle conversation sans dépendre de souvenirs implicites.

Structure minimale :

1. **Statut, date, position dans la roadmap et dépendances** ;
2. **Contexte réel du repo** au moment où le prompt est écrit ;
3. **Décisions métier déjà actées** et non négociables ;
4. **Objectif utilisateur** ;
5. **Périmètre précis** ;
6. **Hors périmètre explicite** ;
7. **Architecture cible** ;
8. **Contrats frontend / 3D / physique** concernés ;
9. **Contrats Supabase**, uniquement s'ils sont nécessaires ;
10. **Migration/backfill/compatibilité V1** ;
11. **RLS / grants / RPC / idempotence / sécurité** ;
12. **Offline / PWA / réconciliation** ;
13. **Performance et budgets** ;
14. **UX téléphone / tablette / desktop** ;
15. **Tests unitaires utiles** ;
16. **Browser regression à adapter/réutiliser** ;
17. **Discipline GitHub / Supabase / Vercel** ;
18. **Critères d'acceptation vérifiables** ;
19. **Interdictions anti-scope-creep** ;
20. **Compte rendu d'exécution à remplir en fin d'étape** : date, PR, SHA, migrations, tests, Preview éventuelle, production, dettes reportées.

Le prompt doit protéger le **comportement produit**, pas une implémentation provisoire.

---

## 23. Discipline plateformes pour les étapes futures

### GitHub

- une branche dédiée par étape ;
- idéalement une PR principale par étape ;
- commits ciblés lorsqu'un découpage interne en lots est utile ;
- `main` toujours déployable ;
- merge uniquement lorsque les contrôles réellement nécessaires sont verts.

### Supabase

- inspection du schéma réel avant toute migration ;
- aucune table/colonne/RPC spéculative ;
- `apply_migration` pour le DDL ;
- RLS et grants vérifiés dans la même étape ;
- advisors sécurité/performance après changement DDL significatif ;
- plan Free pris en compte ;
- pas de branche Supabase payante créée par réflexe.

### Vercel

- ne pas déclencher de Preview pour de la documentation ;
- limiter les Previews pendant le développement ;
- privilégier une Preview finale intentionnelle lorsqu'une validation tactile/visuelle distante est réellement utile ;
- vérifier production après les merges runtime significatifs ;
- conserver le garde-fou docs-only afin de ne pas gaspiller le quota de déploiements.

---

## 24. Archive V1 et historique V2

La roadmap V1 complète est conservée dans `docs/roadmap/archive/v1/` avec son index final et les étapes 01 à 13, y compris 10A, 10B, 10C, 10D, 10.5 et 10.75.

Ces documents sont gelés. Le tag Git `v1.0.0` reste le snapshot logiciel exact de la première release publique.

V2-00 reste également gelée comme photographie de l'architecture et des hypothèses au moment de son exécution. Les décisions actives prises le 4 septembre 2026, notamment l'abandon des compositions multiples et la nouvelle portée des entitlements, sont documentées dans le présent index au lieu de réécrire l'historique.

---

## 25. Prochaine action de planification

**V2-00 est terminée. La planification produit V2.0 est désormais révisée.**

Prochaine action : créer et finaliser, **un fichier à la fois**, les prompts autonomes de V2.0 dans l'ordre suivant :

1. `V2-01-PLACEMENT-2-0-SCENE-INTERACTIVE.md` ;
2. `V2-02-SOCLE-CANONIQUE-ECONOMIE-V2.md` ;
3. `V2-03-ACCESSOIRES-V2-PIPELINE-COLLISIONS.md` ;
4. `V2-04-SOLS-BOUTIQUE-DECORATIVE.md` ;
5. `V2-05-PEINTURE-CAILLOU.md` ;
6. `V2-06-PERSONNALITE-2-0.md` ;
7. `V2-07-JOURNAL-DE-VIE.md` ;
8. `V2-08-STUDIO-PHOTO.md` ;
9. `V2-09-HARMONISATION-UX-V2.md` ;
10. `V2-10-PERFORMANCE-PWA-V2.md` ;
11. `V2-11-SECURITE-ECONOMIE-HARDENING.md` ;
12. `V2-12-QA-MIGRATION-V1-V2.md` ;
13. `V2-13-RELEASE-V2-0.md`.

Chaque fichier sera d'abord **planifié et clarifié**, puis seulement ensuite utilisé comme prompt d'exécution. La création d'un prompt ne doit pas démarrer l'implémentation de l'étape correspondante.
