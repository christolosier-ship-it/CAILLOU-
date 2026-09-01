# CAILLOU™ - Architecture technique et stack V1

> **Statut : architecture cible V1, mise à jour après l'étape 10C**  
> **Objectif : PWA 3D tactile avec compte, progression persistante, économie simple et backend Supabase**  
> **Principe : la complexité serveur protège l'état du joueur ; la complexité graphique sert le caillou. Rien d'autre.**

---

## 1. Objet du document

Ce document décrit l'architecture full stack de **CAILLOU™ V1** : frontend, 3D, authentification, base de données, économie en Lithons, accessoires, sécurité, cache, tests et déploiement Vercel.

Le périmètre fonctionnel est défini dans `CAHIER-DES-CHARGES-V1.md`. Les règles visuelles et artistiques sont définies dans `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`. Le pipeline 3D est décrit dans `WORKFLOW-3D-BLENDER-GITHUB.md`.

---

## 2. Décision d'architecture

CAILLOU™ V1 est une application **full stack**. Supabase est la source de vérité de l'état utilisateur ; Vercel distribue la PWA ; React Three Fiber / Three.js assurent la scène 3D côté client.

```text
                         GitHub
                           │
                           ▼
                        Vercel
                           │
                           ▼
                    React / Vite PWA
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
             React UI        React Three Fiber
                    │             │
                    │             ▼
                    │          Three.js
                    │             │
                    │             ▼
                    │      1 GLB de caillou
                    │      + 0..8 accessoires
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

Un seul GLB de **caillou** est actif à la fois. Le Socle peut charger jusqu'à **huit instances GLB d'accessoires** simultanément selon le contrat V1 validé en 10C.

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
| Backend | Supabase | Auth + Postgres + fonctions serveur |
| Client backend | `@supabase/supabase-js` | sessions et Data API/RPC |
| PWA | `vite-plugin-pwa` | manifest, service worker, cache |
| Cache local | IndexedDB / Cache Storage | cache non autoritaire |
| Déploiement | Vercel | previews et production |
| Tests unitaires | Vitest | domaine et règles |
| Tests navigateur | Chrome + Puppeteer en CI | parcours tactiles/WebGL critiques |
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
- le cache des assets ;
- les appels aux opérations serveur.

Le frontend **n'est jamais autoritaire** pour :

- le solde de Lithons ;
- un achat ;
- la propriété d'un accessoire ;
- la propriété d'un caillou ;
- les statistiques persistantes ;
- l'identité canonique d'une instance équipée ;
- le transform persistant validé d'une instance.

### Supabase

Supabase est responsable de :

- l'identité ;
- le pseudo unique ;
- la session ;
- les cailloux adoptés et jetés ;
- la progression ;
- le portefeuille et le ledger ;
- le catalogue d'accessoires ;
- l'inventaire permanent ;
- les instances équipées et leurs transforms ;
- les opérations transactionnelles/idempotentes ;
- la sécurité RLS.

### Vercel

Vercel est responsable de :

- la distribution du frontend ;
- le CDN des assets statiques ;
- les Preview Deployments ;
- la production depuis `main`.

Aucune Function Vercel métier n'est requise en V1.

---

## 5. Authentification pseudo + mot de passe

### 5.1 UX publique

L'utilisateur manipule uniquement :

```text
pseudo
mot de passe
```

Supabase Auth nécessite techniquement un email ou téléphone pour le flux mot de passe. CAILLOU™ masque ce détail derrière deux Edge Functions :

```text
auth-register
auth-login
```

### 5.2 Identifiant technique

Lors de l'inscription, `auth-register` génère un email interne aléatoire de type :

```text
<uuid-aléatoire>@auth.caillou.invalid
```

Cet identifiant n'est jamais exposé au navigateur. Le pseudo reste l'identité UX.

```text
profiles.username_normalized
        ↓
profiles.id = auth.users.id
        ↓
auth.users.email technique
```

### 5.3 Pseudo

Normalisation V1 :

- trim ;
- suites d'espaces regroupées ;
- casse d'affichage conservée ;
- forme normalisée en minuscules ;
- 3 à 24 caractères ;
- lettres Unicode, chiffres, espace, point, tiret et underscore ;
- premier et dernier caractères alphanumériques.

Le mot de passe contient 10 à 128 caractères.

### 5.4 Session et reprise

Le client Supabase persiste et rafraîchit la session. Au démarrage :

```text
session locale
   ↓
validation serveur
   ↓
profil + caillou actif + économie
   ├─ aucun caillou → Showroom
   └─ caillou actif → Socle
```

Si le réseau est indisponible, l'application peut afficher un état local de secours, mais ne crée jamais d'état économique ou de possession canonique hors ligne.

Sans email/téléphone utilisateur, aucune récupération autonome improvisée n'est ajoutée à la V1.

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

Une entrée active doit référencer un GLB et une preview valides, disposer d'une provenance vérifiée et fournir les bornes nécessaires au placement/à la physique future.

### 6.8 `user_accessories`

```text
user_id uuid -> profiles.id
accessory_id text -> accessories.id
purchased_at timestamptz
primary key (user_id, accessory_id)
```

La propriété d'un **type** d'accessoire est permanente au compte et indépendante des placements.

### 6.9 `equipped_accessories` — contrat 10C

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
```

Principes :

- une ligne représente une **instance équipée**, pas la propriété d'un type ;
- plusieurs instances du même accessoire ou de la même catégorie peuvent coexister ;
- aucune clé `(user_rock_id, slot)` ne limite artificiellement la composition ;
- les transforms sont exprimés dans l'espace local du caillou ;
- le plafond V1 est de **8 instances par caillou** ;
- `scale_min` et `scale_max` du catalogue sont imposés côté serveur ;
- position, quaternion et propriété sont revalidés par les RPC ;
- les écritures directes client restent interdites.

Les opérations 10C sont :

```text
create_equipped_accessory(..., event_key)
update_equipped_accessory(...)
remove_equipped_accessory(..., event_key)
```

Création et retrait sont idempotents via le registre de mutations. 10D conserve la même identité d'instance et enrichit le comportement physique sans revenir à un modèle par slot.

---

## 7. Économie Lithon

### 7.1 Règle

```text
1 caresse valide = +1 Lithon
```

Le Lithon n'a aucune valeur réelle, n'est ni achetable ni transférable.

### 7.2 Caresse

Une caresse valide appelle :

```text
register_caress(user_rock_id, event_key)
```

La transaction vérifie utilisateur, caillou actif et idempotence, incrémente la progression, crédite le wallet et écrit le ledger.

### 7.3 Achat accessoire

L'achat appelle :

```text
purchase_accessory(accessory_id, event_key)
```

Le serveur charge le prix, verrouille le portefeuille, vérifie la possession, débite le montant, crée `user_accessories`, écrit le ledger et mémorise le reçu. Le client ne transmet jamais de prix autoritaire.

---

## 8. Nettoyage

La poussière est visuelle et dérivée du temps depuis `last_cleaned_at` ou l'adoption. Le calibrage courant :

- surface propre pendant 1 heure ;
- apparition progressive ensuite ;
- plafond visuel à 12 heures.

Un nettoyage valide appelle `register_cleaning`, met à jour `last_cleaned_at` et `cleaning_count`, et n'accorde aucun Lithon.

---

## 9. Jeter un caillou

L'opération cible `discard_active_rock(user_rock_id)` :

1. vérifie propriété et statut actif ;
2. renseigne `discarded_at` ;
3. retire les placements liés si la règle métier le demande ;
4. conserve portefeuille, inventaire et historique ;
5. renvoie l'utilisateur vers le parcours sans caillou actif.

La propriété `user_accessories` ne dépend jamais de la durée de vie d'un caillou.

---

## 10. Sécurité et RLS

Toutes les tables exposées via la Data API ont RLS activée et des grants minimaux.

### Lecture utilisateur

Un utilisateur peut lire :

- son profil ;
- ses cailloux ;
- ses progressions ;
- son portefeuille ;
- son ledger ;
- son inventaire ;
- les instances équipées de ses cailloux ;
- les catalogues publics autorisés.

### Écritures directes interdites

Le navigateur ne peut pas directement :

- modifier un wallet ;
- fabriquer un ledger ;
- acheter un accessoire ;
- fabriquer une propriété ;
- créer/modifier/supprimer arbitrairement une instance équipée ;
- augmenter ses statistiques.

Les mutations sensibles passent par des RPC contrôlées.

### Fonctions sensibles

Pour chaque fonction `security definer` :

- `search_path` verrouillé ;
- `auth.uid()` vérifié ;
- droits `EXECUTE` minimaux ;
- aucune confiance dans un `user_id` client ;
- validation de propriété ;
- validation des bornes métier ;
- tests allow/deny.

La clé service role n'est jamais présente dans le bundle Vite.

---

## 11. Scène 3D et mémoire GPU

### Showroom

Le catalogue contient vingt cailloux, mais **un seul GLB de caillou** est instancié à la fois.

```text
metadata 20 roches
        ↓
rock sélectionné
        ↓
1 GLB caillou
```

Le changement de spécimen libère explicitement géométries, matériaux et textures de l'ancien objet.

### Socle et accessoires

Le Socle conserve le GLB du caillou et peut ajouter jusqu'à huit GLB accessoires :

```text
1 caillou
  ├─ accessoire instance A
  ├─ accessoire instance B
  └─ ... jusqu'à 8
```

Chaque `AccessoryModel` possède son cycle chargement / affichage / disposal. Un retrait, une réhydratation ou un changement de composition libère les ressources GPU qui ne sont plus utilisées.

Le test 10C final vérifie réellement :

- 2 GLB accessoires simultanés ;
- édition tactile ;
- réhydratation exacte ;
- retrait ;
- callback de disposal avec géométries libérées.

---

## 12. Assets et distribution

Arborescence de référence :

```text
CAILLOU-/
├── Ressource/                    # sources 3D
├── public/
│   ├── assets/
│   │   ├── rocks/
│   │   ├── rock-previews/
│   │   ├── accessories/
│   │   └── branding/
│   └── icons/
├── scripts/
│   ├── blender/
│   └── web/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── tests/
├── src/
│   ├── app/
│   ├── content/
│   ├── domain/
│   ├── features/
│   │   ├── auth/
│   │   ├── adoption/
│   │   ├── pedestal/
│   │   ├── caress/
│   │   ├── cleaning/
│   │   └── accessories/
│   ├── scene/
│   ├── pwa/
│   ├── styles/
│   └── utils/
└── docs/
```

La séparation `sources / assets web / domaine / scène / backend` reste obligatoire.

---

## 13. État frontend

L'application distingue :

### État serveur canonique

- session ;
- profil ;
- caillou actif ;
- progression ;
- portefeuille ;
- inventaire ;
- instances équipées et transforms locaux.

### État UI temporaire

- modale ouverte ;
- index showroom ;
- mode `orbit | caress | cleaning | accessory` ;
- accessoire sélectionné ;
- feedbacks, erreurs et pending ;
- transitions.

### État 3D

- objet Three.js du caillou ;
- objets Three.js accessoires ;
- caméra ;
- poussière ;
- drag local en cours ;
- représentation visuelle de la sélection.

Aucune instance Three.js n'est sérialisée dans Supabase. Seuls les identifiants métier et transforms numériques le sont.

---

## 14. Contrat d'interaction accessoire 10C

Le mode Accessoire est explicitement séparé d'Orbit, Caresser et Nettoyer.

- sélectionner : tap/clic sur l'accessoire ou son entrée dans l'éditeur ;
- translater : drag dans le plan de vue ;
- précision/profondeur : boutons X/Y/Z ;
- rotation : commandes fines dédiées ;
- échelle : agrandir/rétrécir dans les bornes catalogue ;
- supprimer : retire uniquement l'instance équipée, jamais la propriété du type ;
- quitter : rend le contrôle à la caméra.

Les cibles tactiles critiques font au moins 44 px. Le panneau est scrollable sur téléphone/tablette afin que toutes les commandes restent accessibles.

Le drag modifie temporairement l'objet Three.js puis envoie un transform local numérique au serveur. Un reload/reconnexion repart toujours du transform canonique Supabase.

---

## 15. Frontière 10C / 10D

### Livré en 10C

- multi-instance ;
- identité UUID ;
- propriété séparée du placement ;
- translation/rotation/échelle ;
- transforms locaux persistants ;
- restauration exacte ;
- plafond 8 ;
- disposal GPU ;
- validation tactile téléphone/tablette.

### Réservé à 10D

- colliders runtime ;
- anti-traversée caillou/accessoire ;
- collisions accessoires ;
- gravité ;
- friction/rebond ;
- stabilisation après lâcher ;
- transition cinématique ↔ dynamique ;
- sauvegarde de l'état **stabilisé par la physique**.

10D doit réutiliser `equipped_accessories.id` et le contrat de transform 10C. Il ne doit pas recréer une seconde table de placements ni réintroduire les slots exclusifs.

---

## 16. PWA et cache

### Précache

Précacher le shell, le branding, les icônes et les petites ressources essentielles. Ne pas précacher les vingt GLB ni tout le catalogue d'accessoires.

### Runtime cache

Les GLB visités peuvent être conservés dans un cache runtime versionné. Le cache n'est jamais la source de vérité de la possession ou des transforms.

### Hors ligne

Un caillou déjà en cache peut rester visible, mais authentification initiale, économie, achat et mutations persistantes nécessitent une connexion. Une outbox idempotente ne sera ajoutée que si le besoin est démontré.

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

Aucun secret administrateur n'est exposé au client.

Pour préserver les quotas du plan gratuit, les previews sont déclenchées uniquement lorsqu'elles apportent une validation utile. Le script d'ignore-build exclut les modifications purement documentaires/contrats générés du runtime lorsque possible.

---

## 18. Performance 3D

### Caillou

- un seul GLB actif ;
- DPR borné ;
- `frameloop="demand"` autant que possible ;
- disposal explicite au changement.

### Accessoires

- jusqu'à 8 instances simultanées ;
- chaque asset respecte ses budgets de production 10A ;
- chargement autonome GLB ;
- disposal lors du retrait ;
- coût mesuré sur téléphone/tablette avant d'élargir la limite.

Le plafond 8 est un contrat V1 conservateur, pas une invitation à remplir systématiquement la scène.

---

## 19. Qualité adaptative

Trois profils restent possibles :

### Économie

- DPR limité ;
- ombres simplifiées ;
- effets réduits.

### Auto

- profil par défaut ;
- adaptation selon DPR et frame time.

### Élevée

- DPR supérieur mais borné ;
- ombres et effets complets raisonnables.

La physique future 10D devra respecter ces profils et pouvoir dégrader ses coûts sans changer l'état métier.

---

## 20. Tests prioritaires

### Domaine

- caresse valide/invalide ;
- poussière ;
- prix ;
- bornes de transform accessoire ;
- quaternion valide ;
- échelle min/max ;
- limite 8 instances.

### Base de données

- un seul caillou actif ;
- portefeuille jamais négatif ;
- caresse idempotente ;
- achat atomique ;
- propriété unique d'un type ;
- plusieurs **instances** d'un type autorisées ;
- 8e instance acceptée, 9e refusée ;
- transform persistant ;
- création/retrait idempotents.

### RLS

- propriétaire autorisé ;
- autre utilisateur refusé ;
- anonyme refusé ;
- writes directs sensibles refusés ;
- accessoire non possédé impossible à équiper ;
- impossible de rattacher une instance à un caillou d'un autre compte.

### E2E

Parcours principal :

```text
compte
→ showroom
→ adoption
→ Socle
→ caresse
→ Lithon
→ achat accessoire
→ placement
→ deuxième accessoire
→ translation / rotation / échelle
→ reload
→ composition restaurée
```

Validation 10C dédiée :

```text
2 GLB simultanés
→ téléphone 390×844
→ translation / rotation / scale tactile
→ réhydratation canonique
→ tablette 1024×768
→ déplacement profondeur
→ retrait
→ disposal GPU observé
```

Les scénarios historiques adoption, caresse, nettoyage et showroom restent exécutés pour prévenir les régressions de modes.

---

## 21. Git et CI

```text
main
└─ feature/* ou docs/*
   └─ Pull Request
```

`main` doit rester déployable.

Contrôles :

- lint ;
- TypeScript strict ;
- tests unitaires ;
- tests SQL/RLS quand le schéma évolue ;
- build Vite ;
- E2E navigateur ciblés ;
- validation WebGL/mémoire ;
- Preview Vercel volontaire avant fusion d'une étape runtime importante.

Le pipeline Blender reste séparé des contrôles frontend ordinaires.

---

## 22. Phases de livraison

### Phase 0 — Fondation

Vite/React/TS, Supabase, Auth, PWA shell, Vercel.

### Phase 1 — Vertical slice

Compte → showroom → adoption → nommage → Socle → reload.

### Phase 2 — Boucle de jeu

Caresser, Lithons, nettoyage, Bio/Stats et Jeter.

### Phase 3 — Accessoires

- 10A : pipeline GLB/catalogue ;
- 10B : achat/inventaire ;
- 10C : multi-instance et placement manuel persistant ;
- 10D : physique/collisions/gravité/stabilisation.

### Phase 4 — Résilience

Cache, reprise réseau, PWA et optimisation mémoire/performance.

### Phase 5 — Finition V1

Accessibilité, sécurité, QA appareil, crédits/licences et release.

---

## 23. Risques principaux

### R1 — Économie modifiée depuis le client

Réponse : wallet non modifiable directement, RPC transactionnelles et ledger.

### R2 — Double mutation réseau

Réponse : `event_key` et registre de reçus pour les opérations qui créent des effets non répétables.

### R3 — Achat concurrent

Réponse : verrou wallet, contrôle du solde et transaction Postgres.

### R4 — Fuite RLS

Réponse : grants minimaux, `auth.uid()`, tests A/B/anon, aucune service role côté client.

### R5 — Fuite GPU

Réponse : un seul GLB de caillou, plafond accessoires, disposal explicite et tests navigateur.

### R6 — Accessoire désolidarisé du caillou

Réponse : transforms persistés en espace local du caillou et accessoires rendus dans le même référentiel de scène.

### R7 — Traversée de la pierre

Réponse : acceptée comme dette connue de 10C ; résolue en 10D par colliders et stabilisation, sans changer l'identité des instances.

### R8 — Surarchitecture

Réponse : React + Supabase + Vercel restent les trois briques principales ; la physique demeure locale au client.

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

> **La physique future peut déplacer une instance, mais elle ne doit jamais changer son identité métier.**
