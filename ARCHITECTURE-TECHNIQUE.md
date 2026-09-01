# CAILLOU™ - Architecture technique et stack V1

> **Statut : architecture cible V1, mise à jour après l'étape 10D**  
> **Objectif : PWA 3D tactile avec compte, progression persistante, économie simple, accessoires physiques et backend Supabase**  
> **Principe : la complexité serveur protège l'état du joueur ; la complexité graphique sert le caillou. Rien d'autre.**

---

## 1. Objet du document

Ce document décrit l'architecture full stack de **CAILLOU™ V1** : frontend, 3D, physique, authentification, base de données, économie en Lithons, accessoires, sécurité, cache, tests et déploiement Vercel.

Le périmètre fonctionnel est défini dans `CAHIER-DES-CHARGES-V1.md`. Les règles visuelles et artistiques sont définies dans `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`. Le pipeline 3D est décrit dans `WORKFLOW-3D-BLENDER-GITHUB.md`.

---

## 2. Décision d'architecture

CAILLOU™ V1 est une application **full stack**. Supabase est la source de vérité de l'état utilisateur ; Vercel distribue la PWA ; React Three Fiber / Three.js assurent la scène 3D et Rapier simule localement la physique des accessoires.

```text
                         GitHub
                           │
                           ▼
                        Vercel
                           │
                           ▼
                    React / Vite PWA
                    ┌──────┴───────────────┐
                    │                      │
                    ▼                      ▼
             React UI              React Three Fiber
                                           │
                                  ┌────────┴────────┐
                                  ▼                 ▼
                              Three.js            Rapier
                                  │                 │
                                  └────────┬────────┘
                                           ▼
                                  1 GLB de caillou
                                  + 0..8 accessoires
                                           │
                                           ▼
                                        Supabase
                                 ┌─────────┼──────────┐
                                 ▼         ▼          ▼
                               Auth     Postgres   Edge Functions
                                 │         │          │
                                 └─────────┴──────────┘
                                           │
                                           ▼
                               état canonique du joueur
```

Un seul GLB de **caillou** est actif à la fois. Le Socle peut charger jusqu'à **huit instances GLB d'accessoires** simultanément. La simulation physique reste exclusivement cliente ; Supabase ne simule aucun corps et persiste seulement les données métier et les transforms finaux.

---

## 3. Stack V1

| Couche | Choix V1 | Rôle |
|---|---|---|
| UI | React 19 | interface |
| Typage | TypeScript 6 | contrats stricts |
| Build | Vite 8 | développement et build |
| 3D | Three.js | moteur WebGL |
| Binding 3D | `@react-three/fiber` 9 | scène React |
| Helpers 3D | `@react-three/drei` | contrôles et helpers ciblés |
| Physique | `@react-three/rapier` 2.2.0 / Rapier | collisions, gravité, CCD, sommeil côté client |
| Backend | Supabase | Auth + Postgres + fonctions serveur |
| Client backend | `@supabase/supabase-js` | sessions et Data API/RPC |
| PWA | `vite-plugin-pwa` | manifest, service worker, cache |
| Cache local | IndexedDB / Cache Storage | cache non autoritaire |
| Déploiement | Vercel | previews et production |
| Tests unitaires | Vitest | domaine et règles |
| Tests navigateur | Chrome + Puppeteer en CI | parcours tactiles/WebGL/physique critiques |
| Tests base/RLS | SQL transactionnel | sécurité des données |

À éviter sans besoin démontré : Redux, ORM frontend, backend Vercel parallèle à Supabase, deuxième monnaie, moteur de jeu généraliste ou simulation physique serveur.

---

## 4. Responsabilités par couche

### Frontend

Le frontend est responsable de :

- l'interface ;
- la scène 3D ;
- la reconnaissance des gestes ;
- les transitions ;
- le rendu de la poussière ;
- la manipulation cinématique des accessoires ;
- la simulation Rapier locale après relâchement ;
- les collisions, la gravité et la détection de stabilisation ;
- la conversion du transform physique final en transform local au caillou ;
- le cache des assets ;
- les appels aux opérations serveur.

Le frontend **n'est jamais autoritaire** pour :

- le solde de Lithons ;
- un achat ;
- la propriété d'un accessoire ;
- la propriété d'un caillou ;
- les statistiques persistantes ;
- l'identité canonique d'une instance équipée ;
- le transform persistant validé d'une instance ;
- l'état `stabilized_at` confirmé par Supabase.

### Supabase

Supabase est responsable de :

- l'identité ;
- le pseudo unique ;
- la session ;
- les cailloux adoptés et jetés ;
- la progression ;
- le portefeuille et le ledger ;
- le catalogue d'accessoires et leurs métadonnées physiques ;
- l'inventaire permanent ;
- les instances équipées, leurs transforms locaux et leur état de stabilisation ;
- les opérations transactionnelles/idempotentes ;
- la sécurité RLS.

### Vercel

Vercel est responsable de :

- la distribution du frontend ;
- le CDN des assets statiques ;
- les Preview Deployments volontaires ;
- la production depuis `main`.

Aucune Function Vercel métier n'est requise en V1.

---

## 5. Authentification pseudo + mot de passe

L'utilisateur manipule uniquement un pseudo et un mot de passe. Supabase Auth utilise un email technique interne masqué par les Edge Functions `auth-register` et `auth-login`.

Normalisation du pseudo V1 : trim, espaces regroupés, casse d'affichage conservée, forme normalisée en minuscules, 3 à 24 caractères, caractères autorisés définis par les règles du domaine. Le mot de passe contient 10 à 128 caractères.

Le client Supabase persiste et rafraîchit la session. Au démarrage, la session est validée puis le profil, le caillou actif et l'économie sont relus. Un cache local peut fournir un affichage de secours mais ne crée jamais d'état économique, d'inventaire ou de transform canonique hors ligne.

---

## 6. Modèle de données

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

```text
id text primary key             -- rock-001 ... rock-020
catalog_index int unique
label text
short_description text
description text
model_path text
preview_path text
source_mesh text
triangle_count int
active boolean
created_at timestamptz
updated_at timestamptz
```

Le catalogue V1 contient vingt spécimens actifs.

### 6.3 `user_rocks`

```text
id uuid primary key
user_id uuid -> profiles.id
specimen_id text -> rock_catalog.id
name text
adopted_at timestamptz
discarded_at timestamptz null
last_cleaned_at timestamptz null
created_at timestamptz
updated_at timestamptz
```

Un utilisateur ne possède qu'un seul caillou actif à la fois. La règle est protégée côté Postgres.

### 6.4 `rock_progress`

```text
user_rock_id uuid primary key -> user_rocks.id
caress_count bigint default 0
cleaning_count bigint default 0
interaction_count bigint default 0
observation_seconds bigint default 0
lithons_generated bigint default 0
updated_at timestamptz
```

### 6.5 `wallets`

```text
user_id uuid primary key -> profiles.id
balance bigint not null default 0 check (balance >= 0)
lifetime_earned bigint not null default 0
lifetime_spent bigint not null default 0
updated_at timestamptz
```

### 6.6 `lithon_ledger`

```text
id uuid primary key
user_id uuid -> profiles.id
user_rock_id uuid null -> user_rocks.id
delta bigint not null
reason text not null
event_key uuid not null
accessory_id text null
created_at timestamptz
```

Le ledger assure audit et idempotence des opérations économiques.

### 6.7 `accessories`

```text
id text primary key
name text
description text
price_lithons bigint check (price_lithons >= 0)
asset_path text
preview_path text
slot text                 -- catégorie, pas une exclusivité d'équipement
active boolean
sort_order int
triangle_count int null
dimensions jsonb null
scale_min numeric
scale_max numeric
physics jsonb
provenance jsonb
created_at timestamptz
updated_at timestamptz
```

Le champ `physics` est produit depuis le manifest Blender et contient selon l'accessoire : `enabled`, `dynamic`, `collider`, `mass`, `friction`, `restitution`, `linearDamping`, `angularDamping`, `gravityScale` et `ccd`.

### 6.8 `user_accessories`

```text
user_id uuid -> profiles.id
accessory_id text -> accessories.id
purchased_at timestamptz
primary key (user_id, accessory_id)
```

La propriété d'un **type** d'accessoire est permanente au compte et indépendante des placements.

### 6.9 `equipped_accessories` — contrat 10D

```text
id uuid primary key
user_rock_id uuid -> user_rocks.id
accessory_id text -> accessories.id
slot text null                 -- catégorie informative uniquement
local_position jsonb           -- [x, y, z]
local_rotation jsonb           -- quaternion [x, y, z, w]
uniform_scale numeric
equipped_at timestamptz
updated_at timestamptz
stabilized_at timestamptz null
```

Principes :

- une ligne représente une **instance équipée**, pas la propriété d'un type ;
- plusieurs instances du même accessoire ou de la même catégorie peuvent coexister ;
- aucune clé `(user_rock_id, slot)` ne limite artificiellement la composition ;
- les transforms sont exprimés dans l'espace local du caillou ;
- le plafond V1 est de **8 instances par caillou** ;
- `scale_min` et `scale_max` du catalogue sont imposés côté serveur ;
- position, quaternion et propriété sont revalidés par les RPC ;
- les écritures directes client restent interdites ;
- `stabilized_at IS NULL` signifie qu'une pose est en édition ou doit encore être résolue physiquement ;
- `stabilized_at IS NOT NULL` signifie que le transform persisté est une pose finale confirmée.

Opérations :

```text
create_equipped_accessory(..., event_key)
update_equipped_accessory(...)
stabilize_equipped_accessory(..., event_key)
remove_equipped_accessory(..., event_key)
```

Création, stabilisation finale et retrait utilisent le registre de mutations lorsque l'effet doit être rejouable sans duplication. `update_equipped_accessory` sert à enregistrer une pose cinématique intermédiaire et remet `stabilized_at` à `NULL` lorsque le transform change.

Les placements historiques 10C existants au déploiement 10D ont été backfillés comme stabilisés afin de conserver leur pose au premier reload 10D.

---

## 7. Économie Lithon

```text
1 caresse valide = +1 Lithon
```

Le Lithon n'a aucune valeur réelle, n'est ni achetable ni transférable. Une caresse valide appelle `register_caress(user_rock_id, event_key)`. L'achat appelle `purchase_accessory(accessory_id, event_key)`. Le serveur reste l'unique autorité sur le prix, le solde, la possession et le ledger.

---

## 8. Nettoyage

La poussière est visuelle et dérivée du temps depuis `last_cleaned_at` ou l'adoption : surface propre pendant 1 heure, apparition progressive ensuite, plafond visuel à 12 heures. `register_cleaning` met à jour `last_cleaned_at` et `cleaning_count` sans accorder de Lithon.

---

## 9. Jeter un caillou

L'opération cible `discard_active_rock(user_rock_id)`. Elle vérifie propriété et statut, renseigne `discarded_at`, retire les placements liés selon la règle métier, conserve portefeuille/inventaire/historique et renvoie vers le parcours sans caillou actif. La propriété `user_accessories` ne dépend jamais de la durée de vie d'un caillou.

---

## 10. Sécurité et RLS

Toutes les tables exposées via la Data API ont RLS activée et des grants minimaux. Le navigateur ne peut pas directement modifier wallet, ledger, propriété, statistiques ou instances équipées.

Pour chaque fonction sensible `security definer` :

- `search_path` verrouillé ;
- `auth.uid()` vérifié ;
- droits `EXECUTE` minimaux ;
- aucune confiance dans un `user_id` client ;
- validation de propriété et des bornes métier ;
- tests allow/deny A/B/anon.

La clé service role n'est jamais présente dans le bundle Vite.

Le RPC de stabilisation final est idempotent : en cas d'incertitude réseau, le client rejoue le même `event_key` et ne fabrique jamais une seconde instance.

---

## 11. Scène 3D, physique et mémoire GPU

### Showroom

Le catalogue contient vingt cailloux, mais **un seul GLB de caillou** est instancié à la fois. Le changement de spécimen libère explicitement géométries, matériaux et textures de l'ancien objet.

### Socle et accessoires

```text
1 caillou
  ├─ collider statique trimesh
  ├─ accessoire instance A + collider simplifié
  ├─ accessoire instance B + collider simplifié
  └─ ... jusqu'à 8
```

Chaque `AccessoryModel` possède son cycle chargement / affichage / disposal. Les ressources GPU inutilisées sont libérées lors du retrait ou d'une réhydratation.

### Physique 10D

- gravité monde : `[0, -3.4, 0]` ;
- caillou : corps fixe, collider `trimesh` ;
- Monocle, Nœud papillon, Lunettes rondes : corps dynamiques, colliders convexes simplifiés, CCD actif ;
- Socle galerie : non dynamique, collider `cuboid`, gravité désactivée ;
- drag/réglages fins : corps cinématique contrôlé ;
- lâcher : reprise dynamique pour les accessoires compatibles ;
- friction, restitution, masse et dampings issus du catalogue ;
- sommeil Rapier utilisé comme signal principal de stabilisation ;
- timeout de sécurité : 3,5 s ;
- anti-traversée manuelle avec clearance avant résolution Rapier ;
- une pose déjà stabilisée est restaurée directement au reload, sans chute systématique.

Le monde physique est commun aux accessoires présents. Les collisions accessoires ↔ caillou sont obligatoires et validées. La limite de huit instances borne le coût V1.

---

## 12. Assets et distribution

Les sources restent dans `Ressource/`, les assets runtime dans `public/assets/`, les scripts reproductibles dans `scripts/blender/` et `scripts/web/`, et les migrations/tests dans `supabase/`.

Le manifest `scripts/blender/accessory_sources.json` est l'autorité de production pour les métadonnées physiques. Une régénération Blender doit reproduire `public/assets/accessories/catalog.json` et `build/accessory-production/report.json` sans diff.

---

## 13. État frontend

### État serveur canonique

- session ;
- profil ;
- caillou actif ;
- progression ;
- portefeuille ;
- inventaire ;
- instances équipées ;
- transforms locaux ;
- `stabilized_at`.

### État UI temporaire

- modale ouverte ;
- index showroom ;
- mode `orbit | caress | cleaning | accessory` ;
- accessoire sélectionné ;
- feedbacks, erreurs et pending ;
- transitions.

### État 3D temporaire

- objets Three.js ;
- corps/colliders Rapier ;
- caméra ;
- poussière ;
- drag cinématique ;
- vitesses pendant la résolution ;
- représentation visuelle de la sélection.

Aucune instance Three.js ou Rapier n'est sérialisée dans Supabase. Seuls les identifiants métier, transforms numériques et l'état de stabilisation le sont.

---

## 14. Contrat d'interaction accessoire

Le mode Accessoire est explicitement séparé d'Orbit, Caresser et Nettoyer.

- sélectionner : tap/clic sur l'accessoire ou son entrée dans l'éditeur ;
- translater : drag dans le plan de vue ;
- précision/profondeur : boutons X/Y/Z ;
- rotation : commandes fines dédiées ;
- échelle : agrandir/rétrécir dans les bornes catalogue ;
- supprimer : retire uniquement l'instance équipée, jamais la propriété du type ;
- quitter : rend le contrôle à la caméra.

Les cibles tactiles critiques font au moins 44 px. Le panneau est scrollable sur téléphone/tablette.

Une édition est enregistrée comme pose non stabilisée, puis Rapier résout la pose finale. Seul le transform final marqué `physicsSettled` côté renderer est envoyé au RPC de stabilisation. Cette séparation évite la course entre une écriture cinématique et la sauvegarde finale.

---

## 15. Persistance et reprise réseau des accessoires

Règle de réconciliation :

1. Supabase fournit le dernier transform canonique et `stabilized_at` ;
2. une pose stabilisée est restaurée telle quelle, sans relancer la gravité ;
3. une nouvelle édition confirme d'abord le transform cinématique avec `stabilized_at = NULL` ;
4. Rapier résout ensuite le corps ;
5. la pose finale est envoyée à `stabilize_equipped_accessory` avec un nouvel `event_key` ;
6. une erreur retryable est rejouée une fois avec le même `event_key` ;
7. si la confirmation reste impossible, l'UI revient au dernier état serveur connu au lieu de prétendre que la pose a été sauvegardée.

Le futur mécanisme offline de l'étape 12 devra conserver cette distinction entre dernier état connu et mutation effectivement confirmée.

---

## 16. PWA et cache

Le shell, le branding, les icônes et les ressources essentielles sont précachés. Les gros GLB restent des candidats au cache runtime versionné.

L'intégration Rapier porte le bundle principal 10D à environ **3,68 MB brut / 1,24 MB gzip**. Le plafond Workbox est donc explicitement fixé à **4 MiB** afin de conserver le contrat de précache V1.

Cette valeur n'est pas une cible de taille. L'étape 12 doit étudier le code-splitting/lazy-loading de Rapier et du renderer afin de réduire le chunk principal sans modifier le modèle physique ou la persistance.

---

## 17. Déploiement Vercel

```text
GitHub
  │
  ├─ PR / branche de validation -> Vercel Preview volontaire
  │
  └─ main -> Vercel Production
```

Variables frontend :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Aucun secret administrateur n'est exposé au client. Les previews sont déclenchées uniquement lorsqu'elles apportent une validation utile afin de préserver le quota du plan gratuit.

---

## 18. Performance 3D

### Caillou

- un seul GLB actif ;
- DPR borné ;
- `frameloop="demand"` autant que possible ;
- disposal explicite au changement ;
- collider statique, sans simulation de rigid-body du caillou.

### Accessoires

- jusqu'à 8 instances simultanées ;
- assets selon budgets de production 10A ;
- colliders dynamiques simplifiés ;
- CCD seulement sur les accessoires dynamiques ;
- corps endormis lorsqu'ils sont stabilisés ;
- invalidation du rendu uniquement lorsque nécessaire ;
- disposal lors du retrait.

Le plafond 8 est un contrat V1 conservateur, pas une invitation à remplir systématiquement la scène.

---

## 19. Qualité adaptative

Les profils Économie / Auto / Élevée restent possibles. La physique doit pouvoir réduire ses coûts de présentation sans modifier le transform métier final ni changer l'identité des instances.

---

## 20. Tests prioritaires

### Domaine

- caresse valide/invalide ;
- poussière ;
- prix ;
- bornes de transform accessoire ;
- quaternion valide ;
- échelle min/max ;
- limite 8 instances ;
- parsing des paramètres physiques ;
- bornes de sécurité physique.

### Base de données

- un seul caillou actif ;
- portefeuille jamais négatif ;
- caresse idempotente ;
- achat atomique ;
- propriété unique d'un type ;
- plusieurs instances d'un type autorisées ;
- 8e instance acceptée, 9e refusée ;
- transform persistant ;
- création/retrait idempotents ;
- stabilisation finale idempotente ;
- édition manuelle remettant `stabilized_at` à `NULL`.

### RLS

- propriétaire autorisé ;
- autre utilisateur refusé ;
- anonyme refusé ;
- writes directs sensibles refusés ;
- accessoire non possédé impossible à équiper ;
- impossible de stabiliser une instance d'un autre compte.

### E2E physique 10D

```text
Rapier initialisé
→ chute sous gravité
→ collision avec corps fixe
→ sommeil/stabilisation
→ 2 GLB simultanés
→ téléphone 390×844
→ édition tactile
→ sauvegarde stabilisée
→ tablette 1024×768
→ édition tactile
→ sauvegarde stabilisée
```

Les scénarios historiques adoption, caresse, nettoyage, multi-placement et showroom restent exécutés pour prévenir les régressions de modes.

---

## 21. Git et CI

`main` doit rester déployable. Une étape runtime importante passe par branche, Pull Request, CI, tests ciblés, validation WebGL/appareil et une Preview Vercel volontaire avant fusion.

Contrôles 10D : lint, TypeScript strict, 43 tests unitaires, build Vite/PWA, SQL/RLS, showroom, adoption, caresse, nettoyage, multi-accessoires, pipeline Blender reproductible et workflow Rapier téléphone/tablette.

---

## 22. Phases de livraison

### Phase 0 — Fondation

Vite/React/TS, Supabase, Auth, PWA shell, Vercel.

### Phase 1 — Vertical slice

Compte → showroom → adoption → nommage → Socle → reload.

### Phase 2 — Boucle de jeu

Caresser, Lithons, nettoyage, Bio/Stats et Jeter.

### Phase 3 — Accessoires — terminée

- 10A : pipeline GLB/catalogue ;
- 10B : achat/inventaire ;
- 10C : multi-instance et placement manuel persistant ;
- 10D : physique/collisions/gravité/stabilisation persistante.

### Phase 4 — Résilience

Cache, reprise réseau, PWA et optimisation mémoire/performance.

### Phase 5 — Finition V1

Accessibilité, sécurité, QA appareil, crédits/licences et release.

---

## 23. Risques principaux

### R1 — Économie modifiée depuis le client
Réponse : wallet non modifiable directement, RPC transactionnelles et ledger.

### R2 — Double mutation réseau
Réponse : `event_key` et registre de reçus pour les effets non répétables, y compris la stabilisation finale.

### R3 — Achat concurrent
Réponse : verrou wallet, contrôle du solde et transaction Postgres.

### R4 — Fuite RLS
Réponse : grants minimaux, `auth.uid()`, tests A/B/anon, aucune service role côté client.

### R5 — Fuite GPU
Réponse : un seul GLB de caillou, plafond accessoires, disposal explicite et tests navigateur.

### R6 — Accessoire désolidarisé du caillou
Réponse : transforms persistés en espace local du caillou et rendu dans le même référentiel de scène.

### R7 — Traversée de la pierre
Réponse : résolue en 10D par garde anti-pénétration, collider statique du caillou et résolution Rapier.

### R8 — Jitter/tunneling physique
Réponse : colliders simplifiés, damping, restitution faible, CCD sur corps dynamiques, sommeil et timeout borné.

### R9 — Bundle Rapier trop volumineux
Réponse : plafond Workbox 4 MiB en V1 ; code-splitting/lazy-loading reporté à l'étape 12.

### R10 — Surarchitecture
Réponse : React + Supabase + Vercel restent les briques principales ; Rapier demeure une bibliothèque cliente ciblée et ne crée aucun backend physique.

---

## 24. Décisions reportées après V1

- social ;
- amis ;
- classement ;
- échanges ;
- boutique en argent réel ;
- notifications de rétention ;
- WebGPU principal ;
- réalité augmentée ;
- scan utilisateur ;
- multijoueur ;
- marketplace ;
- récupération de compte avancée tant que son UX n'est pas décidée.

---

## 25. Règles d'architecture finales

> **Le client peut demander un Lithon. Seul le serveur peut décider qu'il existe.**

> **Vingt cailloux dans le catalogue ne doivent jamais devenir vingt cailloux dans la mémoire.**

> **Un accessoire possédé appartient au compte ; une instance équipée appartient à la composition du caillou.**

> **Rapier peut déplacer une instance ; il ne change jamais son identité métier. Supabase conserve le dernier transform final confirmé.**
