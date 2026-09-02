# CAILLOU™ - Architecture technique et stack V1

> **Statut : architecture V1 après 10.5, cible d'exécution 10.75**  
> **Objectif : PWA 3D tactile avec compte, progression persistante, économie Lithon, boutique unifiée, manipulation universelle et physique cliente**  
> **Principe : Supabase protège la vérité métier ; Three.js et Rapier donnent corps au caillou ; l'UI n'expose qu'une grammaire simple.**

---

## 1. Objet du document

Ce document décrit l'architecture full stack de **CAILLOU™ V1** : frontend, 3D, physique, authentification, base de données, économie en Lithons, achats, déblocages, accessoires, manipulation, sécurité, cache, tests et déploiement Vercel.

Le périmètre fonctionnel est défini dans `CAHIER-DES-CHARGES-V1.md`. Les règles visuelles et d'interaction sont définies dans `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`. Le pipeline 3D est décrit dans `WORKFLOW-3D-BLENDER-GITHUB.md`.

Les fichiers de roadmap conservent l'historique des étapes. Le présent document décrit la vérité technique courante et la cible immédiatement planifiée.

---

## 2. Décision d'architecture

CAILLOU™ V1 est une application **full stack** :

- **Supabase** est la source de vérité de l'état utilisateur et de l'économie ;
- **Vercel** distribue la PWA ;
- **React / Vite** portent l'interface ;
- **React Three Fiber / Three.js** portent la scène 3D ;
- **Rapier** simule localement le caillou et les accessoires lorsqu'ils sont libérés ;
- aucune simulation physique serveur n'est nécessaire.

```text
                         GitHub
                           │
                           ▼
                        Vercel
                           │
                           ▼
                    React / Vite PWA
                    ┌──────┴──────────────┐
                    │                     │
                    ▼                     ▼
                 React UI          React Three Fiber
                                          │
                                  ┌───────┴────────┐
                                  ▼                ▼
                              Three.js           Rapier
                                  │                │
                                  └───────┬────────┘
                                          ▼
                                 composition 3D
                              1 caillou + 0..8 objets
                                          │
                                          ▼
                                       Supabase
                              Auth + Postgres + RPC
                                          │
                                          ▼
                              état canonique du compte
```

Un seul GLB de **caillou** est actif à la fois. Jusqu'à **huit instances GLB d'accessoires** peuvent être présentes sur le Socle.

---

## 3. Stack V1

| Couche | Choix | Rôle |
|---|---|---|
| UI | React 19 | interface |
| Typage | TypeScript 6 | contrats stricts |
| Build | Vite 8 | développement/build |
| 3D | Three.js | moteur WebGL |
| Binding 3D | `@react-three/fiber` 9 | scène React |
| Helpers | `@react-three/drei` | contrôles/helpers ciblés |
| Physique | `@react-three/rapier` 2.2.0 / Rapier | collisions, gravité, CCD, sommeil |
| Backend | Supabase | Auth, Postgres, RPC, RLS |
| Client backend | `@supabase/supabase-js` | sessions, Data API, RPC |
| PWA | `vite-plugin-pwa` | manifest, service worker, cache |
| Cache local | Cache Storage / IndexedDB | reprise non autoritaire |
| Déploiement | Vercel | previews et production |
| Tests unitaires | Vitest | règles de domaine |
| Tests navigateur | Puppeteer/Chrome | WebGL, tactile, physique |
| Tests DB | SQL transactionnel | RLS, économie, idempotence |

À éviter sans besoin démontré : Redux global, ORM frontend, backend Vercel métier parallèle, seconde monnaie, simulation physique serveur ou moteur de jeu généraliste.

---

## 4. Responsabilités par couche

### 4.1 Frontend

Le frontend est responsable de :

- l'interface et les modes ;
- la scène Three.js ;
- la reconnaissance des gestes ;
- le sélecteur de cible Placement ;
- la manipulation cinématique du caillou et des accessoires ;
- la contrainte dure du sol gris pendant la manipulation ;
- la poussière ;
- la simulation Rapier locale après validation ;
- la collecte d'une pose stabilisée ;
- la conversion monde/local des accessoires ;
- le cache des assets ;
- les appels RPC.

Le frontend n'est jamais autoritaire pour :

- le solde Lithon ;
- un prix ;
- un achat ;
- un déblocage de fonctionnalité ;
- la propriété d'un accessoire ;
- la propriété d'un caillou ;
- l'identité d'une instance équipée ;
- les statistiques persistantes ;
- une pose déclarée canonique sans confirmation Supabase.

### 4.2 Supabase

Supabase est responsable de :

- l'identité/session ;
- le pseudo unique ;
- les cailloux adoptés/jetés ;
- la pose persistante du caillou ;
- la progression ;
- wallet et ledger ;
- le catalogue d'accessoires ;
- la propriété des types d'accessoires ;
- les instances équipées et leurs transforms ;
- le catalogue de fonctionnalités payantes ;
- les déblocages permanents ;
- les opérations transactionnelles/idempotentes ;
- la sécurité RLS.

### 4.3 Vercel

Vercel distribue le frontend, le CDN statique, les Preview Deployments utiles et la production depuis `main`.

Aucune Function Vercel métier n'est requise en V1.

Le quota de déploiements est traité comme une ressource : les previews ne sont déclenchées que lorsqu'elles apportent une validation réelle. Le script `scripts/vercel-ignore-build.sh` ignore les changements purement documentaires.

---

## 5. Authentification pseudo + mot de passe

L'utilisateur voit uniquement pseudo + mot de passe. Supabase Auth utilise un identifiant technique interne masqué par les Edge Functions d'authentification.

Normalisation V1 : trim, espaces regroupés, casse d'affichage conservée, forme normalisée en minuscules, 3 à 24 caractères selon règles de domaine. Mot de passe 10 à 128 caractères.

Au démarrage : session → profil → caillou actif → progression/économie → pose → possessions/déblocages → instances équipées.

Le cache local peut afficher le dernier état connu mais ne fabrique jamais un succès économique ou une stabilisation serveur.

---

## 6. Modèle de données canonique

Le schéma exact est versionné dans `supabase/migrations/`.

### 6.1 `profiles`

```text
id uuid primary key -> auth.users.id
username text unique not null
username_normalized text unique not null
created_at timestamptz
updated_at timestamptz
```

### 6.2 `rock_catalog`

Catalogue des vingt spécimens avec identifiant `rock-001` à `rock-020`, index, descriptions, chemins modèle/preview, métriques et état actif.

### 6.3 `user_rocks`

```text
id uuid primary key
user_id uuid -> profiles.id
specimen_id text -> rock_catalog.id
name text
adopted_at timestamptz
discarded_at timestamptz null
last_cleaned_at timestamptz null
pose_position jsonb not null       -- [x,y,z]
pose_rotation jsonb not null       -- quaternion [x,y,z,w]
pose_stabilized_at timestamptz
created_at timestamptz
updated_at timestamptz
```

Un utilisateur ne possède qu'un seul caillou actif à la fois. Position et quaternion sont validés côté serveur.

### 6.4 `rock_progress`

Compteurs de caresses, nettoyages, interactions, observation éventuelle et Lithons générés.

### 6.5 `wallets`

```text
user_id uuid primary key
balance bigint >= 0
lifetime_earned bigint
lifetime_spent bigint
updated_at timestamptz
```

Invariant attendu : les opérations économiques serveur conservent la cohérence entre balance, earned et spent.

### 6.6 `lithon_ledger`

```text
id uuid primary key
user_id uuid
user_rock_id uuid null
delta bigint
reason text
event_key uuid
accessory_id text null
feature_id text null
created_at timestamptz
```

Motifs V1 incluent notamment gains de caresse, achat d'accessoire et `feature_unlock`.

### 6.7 `accessories`

Catalogue commercial des types d'accessoires : identité, description, prix, assets, catégorie, bornes d'échelle, physique, provenance/licence.

### 6.8 `user_accessories`

```text
user_id uuid
accessory_id text
purchased_at timestamptz
primary key (user_id, accessory_id)
```

La propriété d'un type appartient au compte.

### 6.9 `equipped_accessories`

```text
id uuid primary key
user_rock_id uuid
accessory_id text
slot text null
local_position jsonb
local_rotation jsonb
uniform_scale numeric
equipped_at timestamptz
updated_at timestamptz
stabilized_at timestamptz null
```

Une ligne = une instance. Plusieurs instances du même type sont autorisées. Les transforms sont stockés relativement au caillou. Plafond V1 : huit instances.

### 6.10 `feature_catalog`

```text
id text primary key
name text
description text
price_lithons bigint
active boolean
created_at / updated_at
```

Entrée V1 actuelle :

```text
id = rock_movement
name = Permis de manutention minérale
price_lithons = 1000
```

### 6.11 `user_feature_unlocks`

```text
user_id uuid
feature_id text
unlocked_at timestamptz
price_paid bigint
```

Un déblocage appartient au compte, indépendamment du caillou actif.

---

## 7. Économie Lithon et Boutique

```text
1 caresse valide = +1 Lithon
```

Les Lithons n'ont aucune valeur réelle et ne sont ni achetables ni transférables.

### Achat d'accessoire

```text
purchase_accessory(accessory_id, event_key)
```

Le serveur vérifie disponibilité, prix, solde, propriété, écrit wallet + ledger + ownership dans une transaction et garantit l'idempotence.

### Achat de fonctionnalité

```text
purchase_feature_unlock(feature_id, event_key)
```

Même contrat d'autorité serveur. Le Permis de manutention minérale est permanent et coûte 1000 Lithons.

### Cible 10.75 : Shop UI agrégé, backend spécialisé

La Boutique frontend doit pouvoir charger et présenter `accessories` et `feature_catalog` dans une seule fenêtre, sans fusion de schéma.

Le type de produit détermine le RPC appelé. L'UI partage présentation, solde, état acheté et gestion d'erreur, mais conserve les contrats backend spécialisés.

---

## 8. Nettoyage

La poussière est visuelle et dérivée du temps depuis `last_cleaned_at` ou l'adoption. `register_cleaning` met à jour la date et le compteur sans accorder de Lithon.

---

## 9. Physique et composition 3D

### 9.1 Monde physique

Le Socle contient :

```text
sol gris fixe Rapier
caillou visuel + corps physique
0..8 AccessoryModel + corps physiques
```

La gravité monde est cliente. Le grand carré gris est la surface de sol canonique du rendu et de Rapier.

### 9.2 Caillou

Après 10.5 :

- pose position + quaternion persistants ;
- corps fixe hors manipulation/simulation ;
- corps `kinematicPosition` pendant manutention ;
- corps dynamique pendant stabilisation globale ;
- collider dynamique `hull` issu du modèle ;
- masse, friction, damping et CCD adaptés ;
- sommeil ou timeout comme fin de stabilisation.

### 9.3 Accessoires

- corps fixe lorsqu'une pose stabilisée est simplement affichée ;
- corps cinématique pendant édition ;
- corps dynamique après validation lorsqu'ils sont physiquement dynamiques ;
- colliders/paramètres issus du catalogue ;
- transform final converti monde → local caillou avant persistance.

### 9.4 Persistance individuelle

```text
stabilize_equipped_accessory(instance_id, event_key, local_position, local_rotation, uniform_scale)
```

Le serveur vérifie propriété, bornes numériques, quaternion, échelle et identité.

### 9.5 Persistance globale

```text
stabilize_rock_composition(
  user_rock_id,
  event_key,
  rock_position,
  rock_rotation,
  accessories
)
```

Contrat : pose du caillou + toutes les instances attendues persistées atomiquement avec un même instant de stabilisation. L'opération est idempotente.

---

## 10. Cible 10.75 : moteur de manipulation universel

### 10.1 Motivation

Le contrôleur de manutention du caillou est retenu comme référence ergonomique. La logique tactile des accessoires doit converger vers la même abstraction.

### 10.2 Modèle cible

Conceptuellement :

```text
ManipulationController
  targetId
  targetKind: rock | accessory
  capabilities:
    position: true
    rotation: true
    scale: boolean
```

Le contrôleur agit sur une cible sélectionnée et utilise le canvas entier comme surface de geste.

### 10.3 Gestes

**Position** : 1 doigt = plan de vue, 2 doigts = profondeur.

**Orientation** : 1 doigt = orientation libre par axes caméra, twist = rotation autour de l'axe de vue.

**Taille** : pinch uniquement pour les accessoires, borné par le catalogue.

### 10.4 Sélection

Le bouton Placement ouvre un sélecteur contenant :

- caillou ;
- instances accessoires existantes ;
- création d'une nouvelle instance depuis les types possédés.

Le caillou sans `rock_movement` reste listé mais verrouillé. L'action commerciale mène vers le Permis dans la Boutique.

### 10.5 Liberté de collision pendant le geste

Pendant Placement, la cible est cinématique et le contrôleur **ne doit pas** appliquer d'anti-pénétration avec :

- le caillou ;
- les accessoires ;
- les autres instances.

Les intersections sont une entrée utilisateur valide. Les anciens mécanismes de projection/snap vers la surface ne doivent pas être conservés comme contrainte principale.

### 10.6 Sol gris : contrainte dure

Exception unique : le carré gris est infranchissable.

La géométrie manipulée ne peut pas passer à travers ou sous le plan du sol. Cette protection doit être appliquée directement lors du calcul de pose cinématique, en utilisant l'enveloppe/bounding volume de la cible.

Ne pas dépendre uniquement d'une résolution Rapier ultérieure, car un corps cinématique piloté directement peut autrement franchir une frontière entre deux frames.

### 10.7 `Terminer`

À la validation :

- fin du contrôle cinématique ;
- gravité normale ;
- collisions normales caillou/accessoires/sol ;
- Rapier résout les pénétrations éventuelles ;
- une éjection rapide issue d'une forte superposition est acceptable ;
- la pose stabilisée est ensuite persistée.

---

## 11. État frontend

### État serveur canonique

- session/profil ;
- caillou actif ;
- progression ;
- wallet/ledger indirect ;
- pose caillou ;
- inventaire accessoires ;
- déblocages fonctionnalités ;
- instances équipées ;
- transforms locaux et `stabilized_at`.

### État UI temporaire actuel

10.5 possède notamment des modes `orbit`, `caress`, `cleaning`, `accessory`, `rock-position`, `rock-orientation`, `composition-settle`.

### État UI cible 10.75

La représentation interne peut être simplifiée autour de :

```text
mode: orbit | caress | cleaning | placement | settling
placementTarget: rock | accessory-instance | null
placementSubmode: position | orientation
```

La capacité `scale` est liée à la cible plutôt qu'à un mode produit séparé.

La Boutique est un état UI commercial distinct de Placement.

### État 3D temporaire

- objets Three.js ;
- corps Rapier ;
- caméra ;
- poussière ;
- brouillon de pose ;
- cible sélectionnée ;
- vitesses pendant résolution.

Aucune instance Three.js/Rapier n'est sérialisée. Seuls identifiants et nombres métier le sont.

---

## 12. Contrats d'interaction et modes exclusifs

Orbit, Caresser, Nettoyer et Placement sont mutuellement exclusifs.

Pendant Placement :

- OrbitControls désactivé ;
- la cible reste sélectionnée explicitement ;
- gestes routés vers le contrôleur universel ;
- mutation économique impossible depuis le canvas ;
- gravité gelée pour la cible manipulée ;
- intersections objet/objet permises ;
- franchissement du sol interdit.

Les cibles tactiles UI font au moins 44 px. Les réglages fins restent accessibles hors Canvas et au clavier lorsque pertinent.

---

## 13. RLS et sécurité

Toutes les tables exposées ont RLS et grants minimaux.

Pour chaque fonction sensible `security definer` :

- `search_path` verrouillé ;
- `auth.uid()` vérifié ;
- aucun `user_id` client digne de confiance ;
- propriété vérifiée ;
- prix et solde relus côté serveur ;
- bornes numériques validées ;
- tests utilisateur A / utilisateur B / anon.

La clé service role n'est jamais incluse dans Vite.

Les validations de transform protègent l'intégrité, mais **ne doivent pas transformer une intersection volontaire entre objets en règle métier interdite**.

---

## 14. PWA, cache et reprise réseau

Le shell, le branding et les ressources essentielles sont précachés. Les GLB restent chargés à la demande et peuvent être mis en cache par stratégie runtime bornée.

Une reprise locale distingue toujours :

- dernier état serveur connu ;
- brouillon local ;
- simulation physique en cours ;
- pose stabilisée non encore confirmée ;
- pose canonique confirmée.

Après perte réseau, le client ne doit pas inventer un achat, un déblocage ou une stabilisation réussie. Les opérations idempotentes rejouent le même `event_key` lorsque nécessaire.

L'étape 12 formalise cette réconciliation pour la Boutique unifiée et Placement.

---

## 15. Performance 3D

### Caillou

- un seul GLB actif ;
- DPR borné ;
- `frameloop="demand"` autant que possible ;
- disposal explicite ;
- corps dynamique uniquement lors des cycles qui le nécessitent.

### Accessoires

- jusqu'à huit instances ;
- assets sous budgets de production ;
- colliders adaptés ;
- CCD selon besoin ;
- corps endormis lorsqu'ils sont stabilisés ;
- disposal lors du retrait.

La factorisation du contrôleur 10.75 ne doit pas créer une boucle de rendu permanente au repos.

---

## 16. Tests prioritaires

### Domaine

- caresse ;
- poussière ;
- prix ;
- permit 1000 ;
- bornes position/rotation/scale ;
- quaternions ;
- limite huit instances ;
- transformations monde/local ;
- contrainte de sol.

### Base

- wallet jamais négatif ;
- achats accessoires idempotents ;
- feature unlock idempotent ;
- second achat du permis refusé ;
- possession unique d'un type ;
- plusieurs instances autorisées ;
- pose caillou persistante ;
- stabilisation accessoire idempotente ;
- stabilisation composition atomique/idempotente ;
- writes directs sensibles refusés.

### E2E 10.75

```text
ouvrir Placement
→ sélectionner caillou/accessoire
→ manipuler depuis n'importe quelle zone du canvas
→ Position X/Y + profondeur
→ Orientation
→ Scale accessoire
→ créer intersection volontaire
→ vérifier sol infranchissable
→ Terminer
→ Rapier résout la composition
→ persister
→ reload
→ retrouver la pose confirmée
```

Ajouter : caillou verrouillé sans permis, navigation vers Boutique, achat du permis, nouvelle instance d'un accessoire possédé, plusieurs instances identifiables, téléphone et tablette.

Les validations historiques showroom/adoption/caresse/nettoyage/10C/10D/10.5 restent des non-régressions.

---

## 17. Git, CI et Vercel

`main` doit rester déployable.

Une étape runtime passe par branche + PR + CI + tests ciblés. Pour 10.75 :

- itérer d'abord avec les tests GitHub et navigateur ;
- éviter les previews inutiles ;
- déclencher au plus une validation Vercel volontaire sur le candidat final si elle apporte une preuve utile ;
- après merge, vérifier le déploiement Production du SHA fusionné.

Les changements purement documentaires sont destinés à être ignorés par le garde-fou Vercel.

---

## 18. Phases de livraison

### Phase 0 - Fondation

Vite/React/TS, Supabase, Auth, PWA shell, Vercel.

### Phase 1 - Vertical slice

Compte → showroom → adoption → nommage → Socle → reload.

### Phase 2 - Boucle de jeu

Caresser, Lithons, nettoyage, Bio/Stats et Jeter.

### Phase 3 - Accessoires et physique

- 10A : pipeline GLB/catalogue ;
- 10B : achat/inventaire ;
- 10C : multi-instance et placement manuel ;
- 10D : physique/collisions/stabilisation ;
- 10.5 : sol physique, permis, pose/manutention du caillou, composition atomique ;
- 10.75 : Boutique unifiée, Placement unique et contrôleur tactile commun.

### Phase 4 - Résilience

Cache, reprise réseau, PWA, optimisation mémoire/performance.

### Phase 5 - Finition V1

Accessibilité, sécurité, QA appareil, crédits/licences et release.

---

## 19. Risques principaux

### R1 - Économie modifiée depuis le client
Réponse : wallet non modifiable directement, RPC transactionnels, prix serveur et ledger.

### R2 - Double mutation réseau
Réponse : `event_key` et reçus idempotents.

### R3 - Fuite RLS
Réponse : grants minimaux, `auth.uid()`, tests A/B/anon.

### R4 - Fuite GPU
Réponse : un GLB de caillou, plafond accessoires, disposal et tests navigateur.

### R5 - Désolidarisation des accessoires
Réponse : transforms persistés localement au caillou et conversions monde/local centralisées.

### R6 - Placement tactile trop contraint
Réponse 10.75 : supprimer l'anti-pénétration objet/objet pendant le geste ; seule la frontière du sol reste dure.

### R7 - Traversée du sol par un corps cinématique
Réponse : clamp/contrainte géométrique avant application de la pose, calculée avec l'enveloppe de la cible.

### R8 - Résolution Rapier énergique après intersection
Réponse : comportement accepté par le produit ; borner seulement les valeurs non finies, les pertes hors scène et les instabilités bloquantes.

### R9 - Jitter/tunneling bloquant
Réponse : colliders adaptés, damping, CCD ciblé, sommeil et timeouts bornés.

### R10 - Bundle 3D/physique lourd
Réponse : cache maîtrisé et code-splitting/lazy-loading à traiter en étape 12.

### R11 - Surarchitecture commerciale
Réponse : une UI de Boutique agrège deux catalogues existants sans créer une table universelle artificielle.

---

## 20. Décisions reportées après V1

Social, amis, classement, échanges, argent réel, notifications de rétention, WebGPU principal, AR, scan utilisateur, multijoueur, marketplace et récupération avancée tant que son UX n'est pas décidée.

---

## 21. Règles d'architecture finales

> **Le client peut demander un Lithon. Seul le serveur peut décider qu'il existe.**

> **Boutique agrège l'offre ; les modèles backend restent spécialisés.**

> **Un accessoire possédé appartient au compte ; une instance placée appartient à la composition.**

> **Pendant Placement, la main gagne contre les autres objets, mais jamais contre le sol.**

> **Après Terminer, Rapier reprend l'arbitrage et Supabase conserve le dernier résultat confirmé.**
