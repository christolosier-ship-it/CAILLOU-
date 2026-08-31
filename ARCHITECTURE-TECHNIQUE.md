# CAILLOU™ - Architecture technique et stack V1

> **Statut : architecture cible V1**  
> **Objectif : PWA 3D tactile avec compte, progression persistante, économie simple et backend Supabase**  
> **Principe : la complexité serveur protège l'état du joueur ; la complexité graphique sert le caillou. Rien d'autre.**

---

## 1. Objet du document

Ce document décrit l'architecture full stack de **CAILLOU™ V1** : frontend, 3D, authentification, base de données, économie en Lithons, accessoires, sécurité, cache, tests et déploiement Vercel.

Le périmètre fonctionnel est défini dans `CAHIER-DES-CHARGES-V1.md`. Les règles visuelles et artistiques sont définies dans `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`. Le pipeline 3D est décrit dans `WORKFLOW-3D-BLENDER-GITHUB.md`.

---

## 2. Décision d'architecture

CAILLOU™ V1 devient une application **full stack**.

Supabase est la source de vérité de l'avancement utilisateur.

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
                    │        1 GLB actif
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

Vercel distribue l'application et les assets statiques. Supabase gère l'identité, la progression et l'économie.

---

## 3. Stack recommandée

| Couche | Choix V1 | Rôle |
|---|---|---|
| UI | React 19 | interface |
| Typage | TypeScript 6 | contrats stricts |
| Build | Vite 8 | développement et build |
| 3D | Three.js | moteur WebGL |
| Binding 3D | `@react-three/fiber` 9 | scène React |
| Helpers 3D | `@react-three/drei` | GLTF, contrôles et helpers ciblés |
| Backend | Supabase | Auth + Postgres + fonctions serveur |
| Client backend | `@supabase/supabase-js` | sessions et accès API |
| PWA | `vite-plugin-pwa` | manifest, service worker, cache |
| Cache local | IndexedDB | cache non autoritaire uniquement |
| Déploiement | Vercel | previews et production |
| Tests unitaires | Vitest | domaine et économie |
| Tests composants | Testing Library | interactions UI |
| Tests navigateur | Playwright | parcours critiques |
| Tests base/RLS | Supabase CLI / tests SQL | sécurité des données |

À éviter sans besoin démontré : Redux, ORM frontend, moteur physique, backend Vercel parallèle à Supabase, deuxième monnaie ou framework de jeu complet.

---

## 4. Responsabilités par couche

### Frontend

Le frontend est responsable de :

- l'interface ;
- la scène 3D ;
- la reconnaissance des gestes ;
- les transitions ;
- la présentation du catalogue ;
- le cache des assets ;
- les appels aux opérations serveur.

Le frontend **n'est jamais autoritaire** pour :

- le solde de Lithons ;
- un achat ;
- l'inventaire ;
- la propriété d'un caillou ;
- les statistiques persistantes.

### Supabase

Supabase est responsable de :

- l'identité ;
- le pseudo unique ;
- la session ;
- les cailloux adoptés et jetés ;
- la progression ;
- le portefeuille de Lithons ;
- le journal des gains et dépenses ;
- le catalogue d'accessoires ;
- l'inventaire ;
- l'équipement ;
- les opérations transactionnelles ;
- la sécurité RLS.

### Vercel

Vercel est responsable de :

- la distribution du frontend ;
- le CDN des assets statiques ;
- les Preview Deployments ;
- la production depuis `main`.

Aucune Function Vercel n'est requise en V1.

---

## 5. Authentification pseudo + mot de passe

### 5.1 Contrainte

L'expérience utilisateur exige uniquement :

```text
pseudo
mot de passe
```

Supabase Auth natif associe l'authentification par mot de passe à un email ou un téléphone. La V1 masque donc ce détail derrière une petite couche serveur.

### 5.2 Auth broker

Deux Edge Functions Supabase sont prévues :

```text
auth-register

auth-login
```

Elles exposent une API centrée sur le pseudo.

### 5.3 Identifiant Auth interne

Le pseudo normalisé produit un identifiant Auth interne non visible par l'utilisateur. Une adresse technique déterministe peut être utilisée comme identifiant Supabase Auth, par exemple à partir d'un hash du pseudo normalisé sur un domaine réservé à l'application.

L'utilisateur ne voit, ne saisit et ne manipule jamais cet identifiant technique.

### 5.4 Inscription

```text
pseudo + mot de passe
        ↓
auth-register
        ↓
normalisation du pseudo
        ↓
vérification unicité
        ↓
création Supabase Auth
        ↓
création profile
        ↓
session
```

Le secret/service role nécessaire à l'administration Auth reste exclusivement dans l'Edge Function.

### 5.5 Connexion

```text
pseudo + mot de passe
        ↓
auth-login
        ↓
reconstruction de l'identifiant interne
        ↓
Supabase Auth password sign-in
        ↓
session JWT
```

### 5.6 Pseudo

En V1, le pseudo de connexion est unique et considéré comme immuable afin de garder le mécanisme d'authentification simple.

Un changement de pseudo futur devra distinguer identifiant de connexion et nom d'affichage.

### 5.7 Récupération

Sans email ou téléphone utilisateur, le flux standard de récupération par email n'est pas disponible. Aucune récupération improvisée ne doit être ajoutée. Une stratégie dédiée devra être conçue avant une publication où la récupération autonome devient obligatoire.

---

## 6. Modèle de données cible

Le schéma exact est versionné par migrations SQL.

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
```

Le catalogue possède exactement vingt entrées actives pour la V1.

### 6.3 `user_rocks`

```text
id uuid primary key
user_id uuid -> profiles.id
specimen_id text -> rock_catalog.id
name text
adopted_at timestamptz
discarded_at timestamptz null
last_cleaned_at timestamptz
created_at timestamptz
updated_at timestamptz
```

Un utilisateur ne possède qu'un seul caillou actif à la fois.

Cette règle doit être protégée par une contrainte/index partiel côté Postgres, pas uniquement par le frontend.

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
event_key uuid null
accessory_id text null
created_at timestamptz
```

Objectifs :

- audit du portefeuille ;
- idempotence ;
- diagnostic des erreurs ;
- reconstruction éventuelle du solde.

`event_key` possède une contrainte d'unicité adaptée afin qu'une caresse réémise après un timeout réseau ne soit pas créditée deux fois.

### 6.7 `accessories`

```text
id text primary key
name text
description text
price_lithons bigint check (price_lithons >= 0)
asset_path text
slot text
active boolean
sort_order int
```

### 6.8 `user_accessories`

```text
user_id uuid -> profiles.id
accessory_id text -> accessories.id
purchased_at timestamptz
primary key (user_id, accessory_id)
```

Un accessoire V1 est acheté une fois et rejoint définitivement l'inventaire du compte.

### 6.9 `equipped_accessories`

```text
user_rock_id uuid -> user_rocks.id
accessory_id text -> accessories.id
slot text
equipped_at timestamptz
primary key (user_rock_id, slot)
```

L'équipement est lié au caillou actif, mais la propriété reste liée au compte.

---

## 7. Économie Lithon

### 7.1 Règle

```text
1 caresse valide = +1 Lithon
```

Le Lithon n'a aucune valeur réelle.

### 7.2 Une caresse n'est pas une écriture directe

Le frontend détecte une caresse valide puis appelle une fonction transactionnelle :

```text
register_caress(user_rock_id, event_key)
```

La fonction :

1. identifie l'utilisateur via `auth.uid()` ;
2. vérifie que le caillou lui appartient et est actif ;
3. vérifie que `event_key` n'a pas déjà été consommé ;
4. incrémente `caress_count` ;
5. incrémente `lithons_generated` ;
6. crédite `wallets.balance` de 1 ;
7. incrémente `lifetime_earned` ;
8. écrit `+1` dans `lithon_ledger` ;
9. renvoie le nouveau solde.

Tout se produit dans une seule transaction Postgres.

### 7.3 Validation gestuelle

Le client distingue :

- rotation normale ;
- mode caresse ;
- mode nettoyage.

Une caresse demande un mouvement continu dépassant des seuils minimaux de distance et de durée. Un tap ou un simple maintien n'est pas récompensé.

Il n'existe aucune limite quotidienne. Des garde-fous techniques peuvent empêcher un même événement ou des événements manifestement dupliqués d'être comptés plusieurs fois.

### 7.4 Achat atomique

L'achat passe par :

```text
purchase_accessory(accessory_id)
```

La fonction :

1. vérifie l'utilisateur ;
2. charge le prix serveur ;
3. vérifie que l'accessoire est actif ;
4. vérifie qu'il n'est pas déjà possédé ;
5. verrouille/vérifie le portefeuille ;
6. refuse si le solde est insuffisant ;
7. débite exactement le prix ;
8. incrémente `lifetime_spent` ;
9. crée `user_accessories` ;
10. écrit le mouvement négatif dans `lithon_ledger` ;
11. renvoie l'inventaire et le nouveau solde.

Le prix envoyé par le client n'est jamais utilisé comme autorité.

---

## 8. Nettoyage

La poussière est dérivée de `last_cleaned_at`.

```text
last_cleaned_at
      ↓
temps écoulé
      ↓
niveau visuel de poussière borné
```

Aucune table de « saleté » n'est nécessaire si une fonction déterministe suffit.

La fin d'un nettoyage validé appelle une opération serveur qui :

- met à jour `last_cleaned_at` ;
- incrémente `cleaning_count` ;
- n'accorde aucun Lithon.

La poussière n'a aucune conséquence sur l'économie ou l'état du caillou.

---

## 9. Jeter un caillou

Opération serveur :

```text
discard_active_rock(user_rock_id)
```

Elle :

1. vérifie propriété et statut actif ;
2. renseigne `discarded_at` ;
3. retire les équipements du caillou si nécessaire ;
4. conserve le portefeuille ;
5. conserve `user_accessories` ;
6. conserve `rock_progress` ;
7. conserve l'historique.

Le frontend retire immédiatement le modèle après succès. Aucune animation de lancer n'est prévue.

---

## 10. Sécurité et RLS

Toutes les tables exposées via la Data API doivent avoir RLS activé et des grants minimaux.

### Lecture utilisateur

Un utilisateur peut lire :

- son profil ;
- ses cailloux ;
- ses progressions ;
- son portefeuille ;
- son ledger ;
- son inventaire ;
- ses équipements ;
- le catalogue des cailloux ;
- le catalogue des accessoires actifs.

### Écritures directes interdites

Le client ne doit pas pouvoir directement :

- modifier `wallets.balance` ;
- insérer un mouvement de ledger ;
- changer le prix d'un accessoire ;
- créer une propriété d'accessoire ;
- augmenter ses statistiques économiques.

Ces opérations passent par des fonctions SQL ou Edge Functions contrôlées.

### Fonctions sensibles

Pour chaque fonction `security definer` :

- `search_path` explicite et minimal ;
- `auth.uid()` vérifié ;
- droits `EXECUTE` limités à `authenticated` ;
- aucune confiance dans un `user_id` fourni par le client ;
- validations de propriété dans la fonction ;
- tests allow/deny automatisés.

### Service role

La clé service role n'est jamais présente dans le bundle Vite ou dans une variable `VITE_*`.

Elle reste uniquement dans les environnements serveur Supabase nécessaires aux opérations d'administration Auth.

---

## 11. Catalogue 3D et mémoire GPU

Le catalogue contient vingt spécimens, mais **un seul modèle 3D est actif dans la scène**.

```text
metadata 20 roches
        ↓
rock-007 sélectionné
        ↓
chargement model.glb
        ↓
1 instance Three.js
```

Au changement :

```text
fade court
→ disposal du modèle courant
→ chargement du suivant
→ apparition
```

À libérer :

- géométries ;
- matériaux ;
- textures non partagées ;
- render targets ;
- références au modèle précédent.

La navigation `01 -> 20 -> 01` ne doit pas produire une croissance continue de la mémoire GPU.

---

## 12. Assets et distribution

Arborescence cible :

```text
CAILLOU-/
├── Ressource/
│   ├── rock_001.blend
│   └── textures sources
│
├── public/
│   ├── assets/
│   │   ├── rocks/
│   │   │   ├── rock-001/model.glb
│   │   │   └── ... rock-020/model.glb
│   │   ├── rock-previews/
│   │   ├── accessories/
│   │   ├── audio/
│   │   └── branding/
│   └── icons/
│
├── scripts/
│   └── blender/
│       ├── audit_rocks.py
│       └── export_rocks.py
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── auth-register/
│   │   └── auth-login/
│   └── tests/
│
├── src/
│   ├── app/
│   ├── domain/
│   ├── backend/
│   │   └── supabase/
│   ├── content/
│   ├── scene/
│   ├── features/
│   │   ├── auth/
│   │   ├── showroom/
│   │   ├── naming/
│   │   ├── pedestal/
│   │   ├── caress/
│   │   ├── cleaning/
│   │   ├── accessories/
│   │   ├── bio/
│   │   └── discard/
│   ├── pwa/
│   ├── cache/
│   ├── styles/
│   └── utils/
│
└── tests/
```

Les noms précis peuvent évoluer. La séparation `assets sources / assets web / domaine / scène / backend` doit rester nette.

---

## 13. État frontend

L'application distingue trois catégories :

### État serveur

- session ;
- profil ;
- caillou actif ;
- progression ;
- portefeuille ;
- inventaire ;
- équipement.

### État UI temporaire

- modal ouverte ;
- index showroom ;
- mode actuel `normal | caress | cleaning` ;
- transition ;
- erreurs ;
- loading.

### État 3D

- modèle actif ;
- rotation ;
- caméra ;
- textures ;
- niveau visuel de poussière ;
- accessoires équipés.

Aucune instance Three.js n'est stockée dans Supabase ou dans le domaine métier.

---

## 14. PWA et cache

### Précache

Précacher :

- shell HTML/CSS/JS ;
- branding ;
- icônes ;
- petites ressources nécessaires au login et au showroom.

Ne pas précacher les vingt GLB.

### Runtime cache

Les GLB visités peuvent être conservés dans un cache runtime versionné.

### IndexedDB

IndexedDB peut conserver :

- métadonnées de cache ;
- dernier état serveur lu pour affichage de secours ;
- préférences locales non sensibles.

IndexedDB n'est pas la source de vérité du portefeuille ou de l'inventaire.

### Mode hors ligne V1

La V1 privilégie la cohérence serveur :

- un caillou déjà mis en cache peut rester visible et manipulable hors ligne ;
- authentification initiale, gains de Lithons, achats, nettoyage persistant et abandon nécessitent une connexion ;
- aucune monnaie spéculative n'est créée hors ligne ;
- l'UI signale calmement l'indisponibilité de la synchronisation.

Cette règle pourra évoluer vers une outbox idempotente plus tard si le besoin est démontré.

---

## 15. Déploiement Vercel

Architecture cible :

```text
GitHub
  │
  ├─ Pull Request -> Vercel Preview
  │
  └─ main -> Vercel Production
```

Variables frontend :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Aucun secret administrateur Supabase n'est exposé à Vercel côté client.

Les secrets des Edge Functions restent configurés dans Supabase.

### Environnements

À terme :

- environnement de développement/prévisualisation ;
- environnement de production.

Une Preview Vercel ne doit pas modifier silencieusement une base de production lorsqu'un environnement de test séparé existe.

---

## 16. Performance 3D

Cible actuelle par spécimen :

- environ 10 000 triangles ;
- base color 1K ;
- normal 1K ;
- roughness calibrée si nécessaire ;
- GLB individuel ;
- un seul actif à la fois.

Mesurer :

- délai avant premier caillou visible ;
- temps de changement de spécimen ;
- frame time pendant rotation ;
- mémoire GPU après cycles complets ;
- taille du cache ;
- chauffe sur mobile ;
- coût des accessoires équipés.

Le LOD2 est conservé tant que les mesures ne démontrent pas un problème réel.

---

## 17. Qualité adaptative

Trois profils :

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

Le rendu utilise `frameloop="demand"` autant que possible.

---

## 18. Tests prioritaires

### Domaine

- caresse valide ;
- caresse invalide ;
- poussière calculée ;
- règles de prix ;
- états du caillou actif/jeté.

### Base de données

- un seul caillou actif par utilisateur ;
- portefeuille jamais négatif ;
- caresse idempotente ;
- achat atomique ;
- refus d'achat sans solde ;
- impossibilité d'acheter deux fois un accessoire unique ;
- abandon conserve portefeuille et inventaire.

### RLS

Pour chaque table utilisateur :

- propriétaire autorisé ;
- autre utilisateur refusé ;
- anonyme refusé ;
- mutations économiques directes refusées.

### E2E

```text
création compte
→ showroom
→ navigation entre plusieurs spécimens
→ adoption
→ nommage
→ Socle
→ caresse
→ +1 Lithon
→ achat accessoire
→ équipement
→ Bio / Stats
→ reload
→ état conservé
```

Deuxième scénario :

```text
connexion
→ Jeter
→ confirmation
→ disparition immédiate
→ aucun caillou actif
→ Lithons conservés
→ accessoires conservés
→ nouvelle adoption possible
```

### 3D

- les vingt GLB chargent ;
- aucun asset manquant ;
- disposal effectif ;
- accessoires n'explosent pas le budget GPU ;
- aucune croissance mémoire après plusieurs tours de showroom.

---

## 19. Git et CI

```text
main
└─ feature/* ou docs/*
   └─ Pull Request
```

`main` doit rester déployable.

Contrôles cibles :

- lint ;
- TypeScript ;
- tests unitaires ;
- tests base/RLS lorsque le schéma existe ;
- build Vite ;
- validation des assets lorsque concernés ;
- Preview Vercel.

Le pipeline Blender reste séparé des contrôles frontend ordinaires pour ne pas lancer un traitement lourd à chaque changement UI.

---

## 20. Phases de livraison

### Phase 0 - Fondation full stack

- Vite/React/TS ;
- client Supabase ;
- schéma initial ;
- Auth pseudo + mot de passe ;
- PWA shell ;
- Vercel.

### Phase 1 - Vertical slice

```text
compte
→ Rock 001 / Rock 002
→ adoption
→ nommage
→ Socle
→ reload
```

Objectif : valider Auth, persistance et disposal 3D.

### Phase 2 - Boucle de jeu

- Caresser ;
- Lithons ;
- portefeuille ;
- ledger ;
- Nettoyer ;
- Bio / Stats ;
- Jeter.

### Phase 3 - Accessoires

- catalogue ;
- achat atomique ;
- inventaire ;
- équipement ;
- assets 3D/cosmétiques.

### Phase 4 - Catalogue complet

- export des 20 GLB ;
- descriptions ;
- showroom 01/20 ;
- optimisation cache et mémoire.

### Phase 5 - Finition V1

- accessibilité ;
- responsive ;
- tests appareils physiques ;
- hardening RLS ;
- audit performance ;
- crédits/licences ;
- release.

---

## 21. Risques principaux

### R1 - Économie modifiée depuis le client

Réponse : portefeuille non modifiable directement, fonctions transactionnelles serveur et ledger.

### R2 - Double crédit réseau

Réponse : `event_key` unique et fonctions idempotentes.

### R3 - Achat concurrent

Réponse : transaction Postgres, contrôle du solde et contrainte `balance >= 0`.

### R4 - Pseudo-only avec Supabase Auth

Réponse : couche Auth serveur qui masque l'identifiant technique Supabase et garde le pseudo comme seule identité UX.

### R5 - Fuite RLS

Réponse : grants minimaux, RLS partout, tests allow/deny, aucune service role côté client.

### R6 - Fuite GPU

Réponse : un seul GLB actif, disposal explicite, tests 01 -> 20 -> 01.

### R7 - Surarchitecture

Réponse : React + Supabase + Vercel. Aucun quatrième backend.

---

## 22. Décisions reportées après V1

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

## 23. Règle d'architecture finale

> **Le client peut demander un Lithon. Seul le serveur peut décider qu'il existe.**

Et la règle 3D reste inchangée :

> **Vingt cailloux dans le catalogue ne doivent jamais devenir vingt cailloux dans la mémoire.**
