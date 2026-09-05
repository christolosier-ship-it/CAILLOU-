# V2-03 — Lot E — Chargement et disposal

> **Statut : implémenté — validation finale CI/Browser sur la tête de Lot E.**
>
> **Date : 5 septembre 2026.**
>
> Le Lot F n'est pas démarré.

## 1. Objectif

Le Lot E borne le coût du chargement runtime des accessoires et vérifie que les ressources Three.js sont libérées après retrait, reload ou changement d'objet, sans précharger le catalogue complet ni conserver un cache de scènes GLTF décodées en RAM/GPU.

## 2. Audit du runtime existant

`AccessoryModel` possédait déjà les bonnes propriétés de base :

- un `model.glb` n'est téléchargé que lorsque l'instance correspondante est réellement montée dans la scène ;
- aucun `useGLTF` ou cache global de scènes Three.js décodées n'est utilisé ;
- le render chargé est libéré à l'unmount/reload via `disposeRockObject` ;
- un `collider.glb` V2 n'est chargé que lorsque la stratégie de collision demande un proxy ;
- le proxy est converti en tableaux de sommets puis sa scène Three.js est immédiatement disposée ;
- `disposeRockObject` déduplique géométries, matériaux et textures avant de les disposer ;
- les previews Boutique restent des images DOM `<img>`, pas des textures WebGL, donc elles ne dupliquent pas inutilement les ressources GPU du modèle 3D.

Le Lot E ne remplace donc pas cette architecture par un LRU de scènes GLTF décodées. Sur mobile/tablette, conserver plusieurs scènes 3D de plusieurs MiB après retrait aurait précisément créé la pression mémoire que ce lot cherche à éviter.

## 3. Cache PWA borné

Le manque identifié était le traitement des `collider.glb` : les renders et previews avaient déjà des caches Workbox bornés, mais les proxies V2 n'étaient couverts par aucune règle dédiée.

La politique runtime devient :

| Famille | Stratégie | Entrées max | Âge max |
| --- | --- | ---: | ---: |
| code lazy | StaleWhileRevalidate | 24 | 30 jours |
| `model.glb` | CacheFirst | 12 | 30 jours |
| `collider.glb` | CacheFirst | 10 | 30 jours |
| previews | StaleWhileRevalidate | 48 | 14 jours |

Toutes ces règles utilisent `purgeOnQuotaError`.

Les 12 renders correspondent au caillou actif, jusqu'à huit accessoires équipés et une petite marge récente. Les 10 proxies couvrent le garde-fou actuel de huit accessoires plus une marge de deux. Le plafond fonctionnel reste provisoire et sera mesuré au Lot F ; le Lot E ne le modifie pas.

Le précache PWA reste limité au shell/navigation. Les GLB et previews sont appris à la première requête. Le catalogue complet n'est donc jamais préchargé en 3D.

## 4. Tests unitaires

`src/pwa/cachePolicy.test.ts` vérifie désormais :

- les quatre caches restent bornés ;
- la règle render reconnaît `model.glb` sans capturer `collider.glb` ;
- la règle collider reconnaît uniquement `/assets/accessories/<id>/collider.glb` ;
- previews et assets 3D restent séparés ;
- le warmup compagnon reste plafonné à neuf URLs.

## 5. Validation navigateur des ressources V2

Un nouveau banc est intégré à Browser regression :

- `scripts/web/accessory-resource-validation.html` ;
- `scripts/web/validate-accessory-resource-memory.mjs` ;
- scénario `accessory-resources` dans `.github/workflows/browser-regression.yml`.

Il parcourt les **11 accessoires V2 sur deux tours**, soit 22 cycles, et pour chaque référence :

1. charge le `model.glb` réel ;
2. le rend dans WebGL ;
3. mesure `renderer.info.memory` ;
4. dispose géométries, matériaux et textures avec le vrai `disposeRockObject` ;
5. charge le `collider.glb` réel ;
6. passe le proxy dans le vrai `createConvexColliderParts` du runtime ;
7. contrôle les garde-fous 12 parties / 4096 sommets dédupliqués par partie ;
8. dispose immédiatement la scène proxy.

Le scénario historique `accessory-placement` reste également actif et vérifie déjà que reload et retrait d'un accessoire provoquent effectivement un disposal de géométrie.

## 6. Diagnostic du premier passage

Browser regression #101 a échoué uniquement sur la première version du nouveau banc. Le rapport a montré en même temps que la mémoire était stable :

- `allModelsDisposed = true` ;
- `allCollidersDisposed = true` ;
- mémoire finale : **0 géométrie / 1 texture** ;
- maximum résiduel : **0 géométrie / 1 texture**.

L'échec venait de la mesure de complexité du crâne : le banc comptait les entrées brutes de l'attribut `position` du GLB (`4810`) alors que le runtime passe par `createConvexColliderParts`, qui transforme et déduplique les sommets avant d'appliquer la limite de 4096.

Le test a été corrigé pour appeler directement la fonction runtime et ses constantes exportées. Aucun seuil n'a été relevé et aucun collider n'a été exempté.

## 7. Supabase

Aucune migration n'est nécessaire au Lot E.

État vérifié pendant l'exécution :

- 4 accessoires V1 actifs ;
- 11 références V2 staged ;
- 0 référence V2 active.

Le Lot E ne touche ni prix, ni possession, ni placement, ni RLS/RPC.

## 8. Vercel

Aucune Preview n'est nécessaire pour cette validation de cache/disposal. Les contrôles sont exécutables de manière déterministe dans GitHub Actions avec WebGL headless.

**0 déploiement Vercel supplémentaire** a été consommé pendant le Lot E.

## 9. Frontière de scope

Le Lot E ne mesure pas encore le plafond final d'objets. Les tests de performance 1/4/8 déjà présents dans la suite restent des garde-fous historiques, mais leur existence ne constitue pas l'exécution du Lot F.

**Lot F et Lot G restent non démarrés. La PR #45 reste draft, ouverte et non mergée.**
