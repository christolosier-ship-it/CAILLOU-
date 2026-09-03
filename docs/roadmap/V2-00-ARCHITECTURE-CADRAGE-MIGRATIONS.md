# V2-00 — Architecture, cadrage et migrations

> **Statut : implémentation terminée — validation finale avant merge.**
>
> Ce document constitue à la fois le cahier des charges historique et le compte rendu d'exécution de V2-00.
> La branche de chantier est `refactor/v2-00`, portée par la PR #38.
> La V1 de référence reste le tag `v1.0.0` sur `e9d926be0f2f09f9f1464cf5b4360f82dbeae2ad`.

## 1. Finalité

V2-00 ne livre pas une nouvelle fonctionnalité produit majeure. Elle prépare CAILLOU™ à accueillir Placement 2.0, compositions, nouveaux accessoires, sols, peinture, personnalité, journal et Studio Photo sans réintroduire la dette structurelle accumulée en V1.

Règle d'architecture désormais normative :

> **DOM = rendu. React = source de vérité UI. Supabase = source de vérité serveur et économique.**

Les invariants V1 restent obligatoires : authentification, adoption, Socle, caresses/Lithons, nettoyage, Boutique, accessoires multi-instance, Permis, Placement, Rapier, persistance, Bio/Stats, Jeter, offline/réconciliation, PWA, RLS et économie autoritaire.

## 2. Architecture Socle retenue

Architecture finale :

```text
AuthenticatedHome
       │
       ▼
 PedestalScreen
       │
       ├── pedestalState / pedestalReducer
       │      ├── interactionMode
       │      ├── overlay
       │      ├── network
       │      └── shopFocus
       │
       ├── Bio / Jeter / réseau / réconciliation
       │
       ▼
    Pedestal
       │
       ├── usePedestalCare
       │      ├── caresse
       │      ├── nettoyage
       │      ├── poussière
       │      ├── économie locale affichée
       │      ├── retries
       │      └── feedback / haptique
       │
       ├── usePedestalPlacement
       │      ├── accessoires placés
       │      ├── Permis
       │      ├── session/cible/outils
       │      ├── pose du caillou
       │      ├── settlement Rapier
       │      ├── persistance
       │      └── rollback canonique
       │
       └── ShowroomScene
              └── dette scène/Placement reportée à V2-01
```

L'état canonique distingue :

- `interactionMode`: `orbit`, `caress`, `cleaning`, `placement`, `settling` ;
- `overlay`: `none`, `shop`, `bio`, `discard` ;
- `network`: `online`, `reconnecting`, `offline` ;
- `shopFocus`: focus Boutique explicite.

Les capacités sont dérivées par des fonctions pures testables, notamment `canCaress`, `canClean`, `canOpenShop`, `canOpenBio`, `canDiscard`, `canEnterPlacement`, `canExitPlacement`, `canPurchase` et `canPersist`.

## 3. Exécution des lots

### Lot A — état canonique du Socle

**Terminé.**

- création de `pedestalState.ts` et tests ciblés ;
- `useReducer` React sans dépendance de state management externe ;
- transitions explicites entre modes/overlays/réseau ;
- capacités pures ;
- branchement réel dans `Pedestal` ;
- hooks métier accessoires/permis conservés.

SHA de validation du Lot A : `08d7c7b6cdc78438581be009d30bc84240596888`.

### Lot B — suppression du pont DOM Step11

**Terminé.**

- création de `PedestalScreen` comme orchestrateur explicite ;
- `AuthenticatedHome` pointe sur le Socle unifié ;
- réseau `online / reconnecting / offline` relié au reducer ;
- Bio unique via `BioDialog` ;
- Jeter unique via `DiscardRockDialog` ;
- retry Jeter conservant le même `eventKey` ;
- suppression de `Step11Pedestal.tsx` ;
- suppression de `step11ControlRules.ts` et du test de raccord historique ;
- suppression du rôle métier de `querySelector`, `MutationObserver`, mutation directe de `disabled`, `stopImmediatePropagation` et classes CSS ;
- Boutique ouverte rendue explicitement non mutante offline tout en restant fermable ;
- tests E2E adaptés aux invariants produit au lieu de protéger le hack historique.

SHA de validation du Lot B : `844f8d402bcf1306ed844762d531cc6b2583ba59`.

### Lot C — réduction du god-component Pedestal

**Terminé.**

- extraction de `usePedestalCare` ;
- extraction de `usePedestalPlacement` ;
- `Pedestal` devient principalement une composition de vue et un coordinateur de transitions ;
- `Pedestal.tsx` passe d'environ 37,9 kB à 15,9 kB ;
- diff Lot B → Lot C dans `Pedestal.tsx` : 163 ajouts / 679 suppressions ;
- aucune nouvelle dépendance ;
- aucun changement volontaire de grammaire tactile ;
- `ShowroomScene` non refactoré en profondeur.

SHA de validation du Lot C : `9bdf3fdde39994ef7c507d18becd51674da28f47`.

## 4. Contrat V2 — composition canonique

V2-02 matérialisera le stockage serveur. V2-00 fige uniquement le contrat de haut niveau.

Une composition représente une **photographie persistante du petit monde**, jamais un conteneur d'assets binaires.

Elle doit pouvoir référencer :

```text
Composition
- id stable
- userRockId
- name
- schemaVersion
- active
- rockPose
  - position
  - rotation
- accessories[]
  - instanceId
  - accessoryId
  - position
  - rotation
  - scale
- paint
  - mode natural | solid
  - color éventuelle
  - finish éventuelle
- floorId éventuel
- environment futur
  - lightingId éventuel
  - backgroundId éventuel
- createdAt / updatedAt
```

Décisions :

1. `schemaVersion` est obligatoire dès la première version persistée afin de permettre V2.1+ sans migration destructrice de snapshots.
2. Les assets restent dans leurs catalogues. Une composition ne stocke que des identifiants et paramètres/transforms.
3. L'état manipulé côté client est un **draft de session**. Il ne devient canonique qu'après confirmation serveur.
4. La V1 actuelle constitue implicitement une composition unique : pose de `user_rocks` + instances `equipped_accessories`.
5. V2-02 devra transformer cette composition implicite en première composition explicite **sans déplacer ni perdre le Socle actuel**.
6. Pendant une migration transitoire, l'ancien modèle reste lisible tant que la nouvelle composition n'est pas confirmée.
7. Création, duplication, activation et suppression devront être atomiques/idempotentes lorsque leur répétition réseau peut produire un doublon.
8. La décision SQL exacte, y compris la manière de représenter la composition active, appartient à V2-02 après audit de son besoin réel.

Aucune table `compositions` n'est créée pendant V2-00.

## 5. Contrat V2 — peinture

V2-05 doit rester non destructif.

Décisions :

- le matériau naturel issu du GLB reste toujours récupérable ;
- `natural` est un état de peinture valide, pas une absence ambiguë de données ;
- V2.0 privilégie des paramètres persistants simples plutôt qu'une texture bitmap générée côté client ;
- couleur principale stockée comme valeur normalisée indépendante du renderer ;
- finition stockée comme choix sémantique (`natural`, `matte`, `satin`, `glossy` ou ensemble final équivalent), puis traduite en paramètres Three.js ;
- la prévisualisation peut être locale, mais la validation persistante suit le même principe draft → confirmation serveur ;
- aucun écrasement du matériau source du GLB ;
- V2.4 pourra ajouter zones, masques, motifs ou couches en faisant évoluer `schemaVersion`, sans casser `solid` V2.0.

Aucune colonne/table de peinture n'est créée pendant V2-00.

## 6. Contrat V2 — sols et décors

V2-04 utilisera un catalogue serveur analogue dans son principe au catalogue accessoires.

Contrat minimal attendu d'un sol :

```text
FloorCatalogItem
- id stable
- label
- description éventuelle
- previewPath
- material/asset descriptor
- priceLithons éventuel
- active
- sortOrder
- provenance/licence
- budget metadata
```

Décisions :

- propriété d'un sol et sélection active sont deux concepts distincts ;
- le prix et l'acquisition restent autoritaires côté Supabase ;
- un sol gratuit reste un item de catalogue explicite ;
- textures/GLB ne sont jamais stockés dans une composition ;
- provenance/licence reste obligatoire pour toute ressource tierce ;
- l'éclairage et les arrière-plans V2.1 pourront suivre la même famille de contrats sans être ajoutés maintenant.

Aucun catalogue de sols n'est créé pendant V2-00.

## 7. Contrat V2 — personnalité et journal

Les responsabilités sont séparées :

### Identité stable

Données factuelles : spécimen, nom, date d'adoption, ancienneté et autres attributs intrinsèques. Elles ne changent pas aléatoirement à l'affichage.

### Statistiques calculées

Elles continuent à dériver des données canoniques existantes : caresses, nettoyages, Lithons, acquisitions, etc.

### Traits de personnalité

V2-06 pourra persister un petit ensemble de traits stables et éditoriaux. Ils doivent être déterministes ou explicitement assignés, jamais rerollés à chaque rendu.

### Événements historiques

V2-07 introduira si nécessaire un journal d'événements métier append-only : adoption, renommage, nettoyage marquant, première peinture, achat, première pose, changement de sol, création de composition, anniversaire, record pertinent.

Chaque événement doit disposer au minimum d'un type stable, d'une date canonique et d'une référence au caillou/utilisateur concerné. Un `eventKey` idempotent est requis pour tout événement pouvant être rejoué par le réseau.

### Journal éditorial

Le journal visible est une projection des événements et statistiques canoniques. Le texte présenté peut évoluer, mais l'événement source reste traçable.

### V2.2

Traits évolutifs, réactions contextuelles, événements rares et accomplissements devront consommer cette histoire canonique plutôt que créer une seconde mémoire parallèle.

Aucune table personnalité/journal n'est créée pendant V2-00.

## 8. Supabase et migration V1 → V2

Audit final du 3 septembre 2026 :

- projet `zibhzhpvtiplbkhioqco` : `ACTIVE_HEALTHY` ;
- 11 tables publiques ;
- RLS activée sur les 11 tables ;
- 20 entrées `rock_catalog` ;
- 4 accessoires V1 ;
- données actuelles de pose dans `user_rocks` ;
- instances/transforms dans `equipped_accessories` ;
- wallet/ledger et déblocages permanents distincts ;
- Edge Functions Auth actives ;
- aucune migration V2-00 nécessaire.

### Stratégie additive

Chaque étape fonctionnelle possède sa propre migration lorsqu'elle utilise réellement le nouveau contrat :

- V2-02 : compositions ;
- V2-04 : sols/propriétés/sélection ;
- V2-05 : peinture ;
- V2-06/V2-07 : personnalité et événements/journal.

Règles de migration :

1. ne jamais supprimer les données V1 avant validation du nouveau modèle ;
2. backfill déterministe depuis les tables V1 existantes ;
3. conserver `user_rocks.id` comme identité du caillou utilisateur ;
4. conserver wallet, ledger, accessoires possédés, instances, transforms et déblocages ;
5. RLS propriétaire obligatoire sur tout nouveau stockage utilisateur ;
6. catalogues publics seulement en lecture cliente ;
7. mutations économiques et sensibles via RPC/serveur autoritaire ;
8. idempotence obligatoire pour toute création/activation répétable ;
9. types TypeScript régénérés après chaque DDL réel ;
10. advisors sécurité/performance exécutés après chaque migration réelle.

### Advisors actuels

Sécurité : un warning connu `auth_leaked_password_protection` reste ouvert. Il préexistait à V2-00 et n'est pas causé par ce refactor.

Performance : uniquement des informations `unused_index` sur plusieurs index V1. Elles sont conservées, car un faible volume actuel ne justifie pas une suppression prématurée d'index utiles aux futurs volumes/jointures.

## 9. Budgets et garde-fous V2

Les budgets suivants deviennent la baseline jusqu'à mesure plus précise dans V2-10 :

### Assets 3D

- plafond dur conservé : **5 MiB par GLB** ;
- cible recommandée pour les nouveaux accessoires : rester nettement sous ce plafond et éviter toute hausse sans bénéfice visuel mesuré ;
- ne jamais précharger le catalogue complet ;
- résidence normale : caillou actif + accessoires réellement présents, plafond V1 actuel de 8 instances.

### Textures futures

- préférer des textures compressées et des dimensions adaptées au rendu mobile ;
- **2048 × 2048 maximum par défaut** ; 4096 uniquement après justification visuelle/performance ;
- viser **≤ 1 MiB par texture distribuée** lorsque le format et la qualité le permettent ;
- sols/peinture ne doivent pas embarquer de bitmap dans les snapshots de composition.

### Runtime JS/3D

Baseline V1/V2-00 : gros chunk 3D/physique d'environ **1,02 MiB gzip**, chargé à la demande.

Règle : pas d'augmentation durable supérieure à environ 10 % sans mesure et justification. Le runtime 3D reste hors précache initial.

### PWA/cache

Politique actuelle conservée :

- code runtime : 24 entrées / 30 jours ;
- modèles : 12 entrées / 30 jours ;
- previews : 48 entrées / 14 jours ;
- companion assets bornés à 9 ;
- shell de navigation seulement en précache ;
- purge sur quota.

Les futurs sols/textures devront intégrer une politique bornée dédiée ou une extension mesurée de ces caches, jamais un cache illimité.

### GPU

L'acceptation n'est pas fondée sur un chiffre mémoire navigateur peu fiable mais sur l'absence de croissance linéaire : le validateur Showroom doit continuer à libérer les géométries/textures après cycles. Baseline actuelle : après trois cycles complets, résidu observé `geometries=0`, `textures=1`.

### Physique

Rapier ne doit pas devenir une simulation coûteuse permanente au repos. La physique active doit rester liée aux interactions/settling qui la nécessitent.

### Compositions

Une composition ne contient que métadonnées, identifiants et transforms. Aucun GLB, image, texture ou base64 n'est sérialisé dans son payload.

## 10. Tests et non-régression

Seulement deux workflows restent normatifs :

- `CI` ;
- `Browser regression`.

Le refactor V2-00 protège désormais les règles métier et non les raccords historiques.

Validations déjà obtenues sur le SHA Lot C `9bdf3fdde39994ef7c507d18becd51674da28f47` :

- CI `33807059086` : succès ;
- Browser regression `33807059119` : succès ;
- matrice navigateur V1 complète : showroom, adoption, caresse, nettoyage, accessoires, physique, mouvement du caillou, Placement, Bio/Jeter ;
- build production : succès.

Une dernière exécution sera exigée sur le SHA documentaire final de la PR avant merge.

## 11. Limite explicitement reportée à V2-01

`ShowroomScene.tsx` reste le principal nœud architectural connu après V2-00 : viewer Showroom, interactions Socle, Placement, accessoires et physique y cohabitent encore.

V2-01 devra traiter cette dette dans le contexte fonctionnel Placement 2.0, notamment la séparation éventuelle entre viewer générique, scène Socle, caméra/gestes et moteur de Placement.

V2-00 n'a volontairement pas :

- réécrit `ShowroomScene` ;
- modifié la caméra ;
- changé les contraintes du sol ;
- changé la grammaire tactile ;
- changé Rapier ;
- ajouté Peinture/Sols/Compositions/Personnalité/Journal/Studio ;
- créé de table Supabase spéculative.

## 12. Critères d'acceptation

### Architecture Socle

- [x] état React canonique modes/overlays/réseau ;
- [x] capacités dérivées de règles testables ;
- [x] aucune règle métier du Socle dépendante de classes CSS ;
- [x] aucune orchestration métier dépendante de `querySelector` ;
- [x] aucun `MutationObserver` entre composants du Socle ;
- [x] Bio unique ;
- [x] Jeter unique ;
- [x] réseau/offline explicite ;
- [x] `Step11Pedestal` supprimé ;
- [x] composant principal non propriétaire de toutes les responsabilités métier ;
- [x] `AuthenticatedHome` pointe vers le Socle unifié.

### Non-régression

- [x] caresse ;
- [x] nettoyage ;
- [x] Boutique ;
- [x] accessoires ;
- [x] Permis ;
- [x] Placement V1 ;
- [x] stabilisation/persistance ;
- [x] Bio ;
- [x] Jeter/retry/nouvelle adoption ;
- [x] offline/reconnexion ;
- [x] aucune régression RLS/économie connue ;
- [x] CI verte sur le dernier SHA runtime ;
- [x] Browser regression verte sur le dernier SHA runtime.

### Cadrage V2

- [x] modèle canonique de composition documenté ;
- [x] architecture Peinture documentée ;
- [x] contrat catalogue Sols/Décors documenté ;
- [x] frontières Personnalité/Journal documentées ;
- [x] stratégie V1 → V2 documentée ;
- [x] budgets V2 définis ;
- [x] aucune table/feature spéculative ajoutée.

### Plateformes

- [x] Supabase audité et sain ;
- [x] aucune Preview intermédiaire Vercel consommée ;
- [ ] Preview finale intentionnelle et/ou production finale contrôlée après validation du SHA de clôture ;
- [ ] déploiement production post-merge contrôlé.

## 13. Compte rendu de chantier

Date : **3 septembre 2026**.

PR : **#38 — V2-00 — refactor architectural du Socle**.

Commits structurants de fin de lots :

- Lot A : `08d7c7b6cdc78438581be009d30bc84240596888` ;
- Lot B : `844f8d402bcf1306ed844762d531cc6b2583ba59` ;
- Lot C : `9bdf3fdde39994ef7c507d18becd51674da28f47`.

Migrations Supabase V2-00 : **aucune**.

Dépendances ajoutées : **aucune**.

Preview Vercel intermédiaire : **aucune**.

Dette reportée : **refactor profond de `ShowroomScene` et amélioration Placement dans V2-01**.

État avant merge : Socle refactoré, lots A/B/C verts, contrats V2 et migration documentés. La clôture finale doit encore enregistrer le SHA final de PR, le résultat des deux workflows sur ce SHA, l'éventuelle Preview finale utile, le SHA de merge et l'état production post-merge.
