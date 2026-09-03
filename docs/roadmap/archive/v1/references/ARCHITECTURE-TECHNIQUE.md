# CAILLOU™ - Architecture technique et stack V1

> **Statut : architecture V1 courante après 10.75, PR #30 et PlacementSession PR #31**  
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

### Boutique actuelle : UI agrégée, backend spécialisé

La Boutique frontend charge et présente `accessories` et `feature_catalog` dans une seule fenêtre, sans fusion de schéma.

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

## 10. Moteur de Placement actuel : contrôleur universel + PlacementSession

Le caillou et les accessoires utilisent la même grammaire de manipulation et le même cycle editing → settling. La cible ne change que ses capabilities, notamment la Taille disponible uniquement pour les accessoires.

Depuis la PR #31, une session de Placement conserve **toute la composition en coordonnées monde** :

```text
PlacementSessionState
  rock: PlacementTransform
  accessories: Record<instanceId, PlacementTransform>
  dirtyRock: boolean
  dirtyAccessoryIds: string[]
```

À l'ouverture de Placement, la pose monde du caillou est capturée et chaque accessoire persistant est converti local → monde une seule fois. Pendant l'édition :

- déplacer le caillou modifie uniquement `session.rock` ;
- déplacer un accessoire modifie uniquement son draft ;
- changer de cible ne détruit aucun draft ;
- aucune RPC Supabase n'est déclenchée par un mouvement ou un changement de cible ;
- le Socle gris reste l'unique frontière dure ;
- les intersections objet/objet restent autorisées.

`Terminer` construit un plan de settlement : global si le caillou est dirty, limité aux accessoires dirty sinon, aucune écriture si rien n'a changé. Les accessoires ne sont convertis monde → local qu'à la frontière de persistance.

---

## 11. État frontend

### État serveur canonique

- session/profil ;
- caillou actif ou historique jeté ;
- progression ;
- wallet/ledger indirect ;
- pose caillou ;
- inventaire accessoires ;
- déblocages fonctionnalités ;
- instances équipées ;
- transforms locaux et `stabilized_at`.

### État UI courant

```text
mode: orbit | caress | cleaning | placement | settling
placementTarget: rock | accessory-instance | null
placementTool: position | orientation | size
placementSession: snapshot monde multi-cibles | null
settlementPlan: rock + accessoryIds | null
```

Le `PlacementSession` garde tous les drafts jusqu'à la fin de la session ; `placementTarget` ne choisit que la cible active.

### État 3D temporaire

- objets Three.js ;
- corps Rapier ;
- caméra ;
- poussière ;
- drafts de session ;
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

### 12.1 Bio / Stats — sources fiables de l'étape 11

La Bio lit sous RLS les sources métier existantes : `user_rocks`, `rock_progress`, `wallets`, `user_accessories`, `equipped_accessories` et `user_feature_unlocks`.

`observation_seconds` existe dans le schéma historique mais aucun contrat serveur courant ne l'alimente. Il ne doit donc pas être présenté comme une statistique fiable tant qu'une instrumentation autoritaire n'existe pas.

### 12.2 Jeter — contrat serveur existant

L'opération `discard_active_rock(user_rock_id, event_key)` existe déjà dans Supabase. Elle est transactionnelle, vérifie le propriétaire et utilise les reçus de mutation idempotents.

Lors du premier discard :

1. `user_rocks.discarded_at` est renseigné ;
2. les lignes `equipped_accessories` liées à ce caillou sont supprimées comme déséquipement logique ;
3. le caillou, `rock_progress` et le ledger restent conservés comme historique ;
4. `wallets`, `user_accessories` et `user_feature_unlocks` restent intacts.

Aucune migration Supabase supplémentaire n'est requise pour l'étape 11.

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

Après perte réseau, le client ne doit pas inventer un achat, un déblocage, un discard ou une stabilisation réussie. Les opérations idempotentes rejouent le même `event_key` lorsque nécessaire.

L'étape 12 formalise cette réconciliation.

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

Le moteur de Placement ne doit pas créer une boucle de rendu permanente au repos.

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
- contrainte de sol ;
- routing état vide après discard ;
- formatage Bio sans statistique non fiable.

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
- discard idempotent ;
- discard conserve wallet, propriétés et déblocages ;
- discard déséquipe les instances ;
- writes directs sensibles refusés.

Les validations historiques showroom/adoption/caresse/nettoyage/10C/10D/10.5/10.75 et PlacementSession restent des non-régressions.

---

## 17. Git, CI et Vercel

`main` doit rester déployable.

Une étape runtime passe par branche + PR + CI + tests ciblés. Les previews Vercel restent limitées aux candidats qui apportent une validation réelle. Les changements purement documentaires sont destinés à être ignorés par le garde-fou Vercel.

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
- 10.75 : Boutique unifiée, Placement unique et contrôleur tactile commun ;
- PR #30 : harmonisation du Socle et du moteur de Placement ;
- PR #31 : `PlacementSession` multi-cibles et drafts monde indépendants.

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
Réponse : transforms persistés localement au caillou, mais snapshot monde indépendant pendant `PlacementSession` ; conversions local/monde limitées aux frontières d'ouverture et de persistance.

### R6 - Placement tactile trop contraint
Réponse : supprimer l'anti-pénétration objet/objet pendant le geste ; seule la frontière du sol reste dure.

### R7 - Traversée du sol par un corps cinématique
Réponse : contrainte géométrique avant application de la pose, calculée avec l'enveloppe de la cible.

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

> **Pendant Placement, chaque cible garde son propre draft monde jusqu'à la validation de la session entière.**
