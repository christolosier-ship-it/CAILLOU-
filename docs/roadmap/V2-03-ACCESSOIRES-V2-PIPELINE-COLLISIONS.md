# V2-03 — Accessoires V2 & pipeline collisions

> **Statut : en cours — Lots A à F terminés le 5 septembre 2026.**
>
> **Date : 5 septembre 2026.**
>
> **Dépendances : V2-01 Placement 2.0, V2-02 économie/possessions V2.**
>
> **Décision propriétaire : licences, notices et historisation de provenance des objets sont hors périmètre de V2-03.**

Ce fichier est le prompt autonome d'exécution de V2-03 et devient son historique au fil des lots.

## 1. Prompt d'exécution

Lis l'index, ce fichier, les comptes rendus finaux V2-01/V2-02, `WORKFLOW-3D-BLENDER-GITHUB.md`, le catalogue accessoires réel, `AccessoryModel`, le moteur Placement/colliders et les scripts/pipelines 3D encore actifs.

Inspecte aussi `Ressource/` : utiliser uniquement des assets réellement présents ou fournis. Ne pas inventer de nouveaux binaires. Les sources manifestement hors catégorie, corrompues ou non traitables peuvent être supprimées.

GitHub obligatoire. Supabase obligatoire pour le catalogue et les contrats de possession. Vercel utile uniquement pour une validation finale distante lorsque des fichiers runtime le justifient.

## 2. Contexte réel

La V1 a quatre accessoires. Le schéma `accessories` contient déjà identité, nom, prix, asset/preview, catégorie/slot, triangle count, dimensions, scale min/max, physique et un ancien champ de provenance qui n'est plus un contrat de V2-03.

V2-01 a établi une manipulation commune et une stratégie de collision crédible. V2-02 impose qu'une référence catalogue représente **un objet unique**, achetable une seule fois et plaçable une seule fois simultanément.

## 3. Décisions métier actées

- une référence catalogue = un objet unique ;
- pas de clonage multi-instance ;
- possession durable au compte ;
- un objet placé est indisponible jusqu'à retrait ;
- le plafond V2.0 est fixé à huit objets simultanés après mesures du Lot F ;
- la collision doit suivre la géométrie visible, sans effet flottant ;
- licences/notices/provenance hors périmètre ;
- accessoires animés/interactifs hors V2.0.

## 4. Objectif utilisateur

Enrichir la Boutique avec un catalogue d'objets plus intéressant, tout en garantissant que chaque nouvel objet :

- se charge vite ;
- possède une preview propre ;
- se sélectionne/manipule correctement ;
- entre réellement en contact avec caillou/objets/sol ;
- ne dégrade pas la fluidité mobile ;
- reste techniquement reproductible par le pipeline 3D.

## 5. Périmètre précis

### Lot A — Audit pipeline ✅ TERMINÉ

Inventorier :

- assets disponibles ;
- formats ;
- poids ;
- triangles ;
- textures ;
- dimensions ;
- origine/pivot ;
- matériau ;
- collider actuel/proxy possible.

Rejeter ou supprimer les assets manifestement corrompus, hors catégorie ou non traitables. Les assets lourds mais optimisables restent candidats et doivent être classés avec leur dette de préparation.

Compte rendu détaillé : `docs/roadmap/V2-03-LOT-A-AUDIT.md`.

### Lot B — Contrat d'un asset accessoire V2 ✅ TERMINÉ

Chaque entrée doit disposer au minimum de :

```text
id stable
name/description
price_lithons
asset_path
preview_path
active/sort_order
triangle_count
dimensions
scale_min / scale_max
physics metadata
collision metadata ou stratégie dérivable
budget metadata utile
```

Réutiliser les colonnes existantes lorsqu'elles suffisent. Une migration n'est ajoutée que pour un besoin immédiat démontré.

Le Lot B a démontré le besoin immédiat de deux champs dédiés, `collision` et `budget`, afin de ne pas mélanger la géométrie de collision avec les réglages physiques Rapier et de stocker des mesures runtime non dérivables du catalogue V1.

Compte rendu détaillé : `docs/roadmap/V2-03-LOT-B-CONTRAT-ASSET.md`.

### Lot C — Pipeline collider ✅ TERMINÉ

Pour chaque accessoire, choisir une stratégie adaptée :

- convex hull ;
- compound convex ;
- collision proxy dédié ;
- géométrie simplifiée ;
- autre solution mesurée compatible Rapier.

Le collider ne doit pas :

- englober de grands espaces vides visibles ;
- provoquer un contact à distance ;
- multiplier inutilement les primitives ;
- conserver la géométrie render haute définition comme collider si cela pénalise le mobile.

Le Lot C retient des proxies convexes préparés hors ligne pour les 11 nouvelles sources. Les accessoires V1 conservent leur génération automatique actuelle (`hull` / `cuboid`) pour compatibilité. Les nouveaux proxies sont générés de manière reproductible, mesurés et bornés avant publication catalogue.

Compte rendu détaillé : `docs/roadmap/V2-03-LOT-C-COLLIDERS.md`.

### Lot D — Pipeline preview/catalogue ✅ TERMINÉ

Standardiser :

- cadrage preview ;
- fond et lumière cohérents ;
- nommage fichiers ;
- chemins publics ;
- catalog update ;
- validation automatique des chemins et budgets.

Le Lot D applique au render la normalisation source définie au Lot C, simplifie uniquement le render, borne les textures, génère des previews 512x512, publie automatiquement les sorties validées et passe le manifeste technique accessoires en schemaVersion 2. Les 11 nouvelles entrées sont staged dans Supabase avec `active=false` afin de réserver l'activation commerciale au Lot G.

Compte rendu détaillé : `docs/roadmap/V2-03-LOT-D-PREVIEW-CATALOGUE.md`.

### Lot E — Chargement et disposal ✅ TERMINÉ

- lazy-load ;
- ne pas précharger le catalogue complet ;
- cache runtime borné ;
- libération géométrie/matériaux/textures après retrait/changement ;
- pas de duplication GPU inutile entre preview et scène.

Le Lot E conserve le chargement à la demande de `AccessoryModel` et l'absence volontaire de cache global de scènes GLTF décodées. Les renders sont disposés lors d'un retrait/reload, les proxies sont disposés immédiatement après extraction des parties convexes, les previews restent des images DOM et les caches Workbox sont bornés séparément pour code, renders, colliders et previews.

Compte rendu détaillé : `docs/roadmap/V2-03-LOT-E-CHARGEMENT-DISPOSAL.md`.

### Lot F — Mesure du plafond d'objets ✅ TERMINÉ

Tester progressivement plusieurs paliers réalistes en commençant par le garde-fou 8.

Mesurer :

- frame time au repos ;
- frame time pendant Placement ;
- coût collision ;
- stabilisation Rapier ;
- mémoire GPU ;
- temps de chargement ;
- chauffe/session prolongée si test matériel disponible ;
- qualité tactile.

Le Lot F ajoute un banc V2 réel qui charge les nouveaux `model.glb` et `collider.glb` les plus lourds aux paliers 1/4/8, mesure chargement froid, cadence WebGL, stabilisation Rapier et mémoire GPU, puis conserve **8 accessoires simultanés** comme plafond final V2.0. Les données CI valident ce plafond mais ne justifient pas un relèvement au-delà de huit sans test matériel thermique et tactile.

Compte rendu détaillé : `docs/roadmap/V2-03-LOT-F-PLAFOND-OBJETS.md`.

### Lot G — Boutique/Placement

- les nouveaux objets apparaissent comme biens Accessoires ;
- achat unique ;
- état `Possédé` ;
- objet déjà placé non ajoutable ;
- objet retiré réutilisable ;
- sélection/tap V2-01 fonctionnels.

## 6. Hors périmètre

- animations GLB ;
- interactions métier ;
- sols ;
- peinture ;
- collections V2.1 ;
- succès ;
- duplication d'un accessoire ;
- changement du modèle d'entitlement V2-02 ;
- licences, notices tierces et historisation de provenance.

## 7. Architecture cible

Le pipeline sépare :

```text
source
  -> préparation asset
  -> GLB runtime
  -> preview
  -> collider/proxy
  -> metadata catalogue
  -> validation budgets
```

Le runtime ne doit pas recalculer à chaque session une décomposition coûteuse pouvant être préparée hors ligne.

Le Lot E complète cette séparation au runtime : seules les instances réellement montées sont décodées en Three.js. Le cache persistant lourd reste dans le Service Worker et non dans un cache de scènes GPU.

Le Lot F conserve cette architecture et fixe le plafond V2.0 à huit instances simultanées. Aucun cache de scènes décodées n'est ajouté pour améliorer artificiellement le benchmark.

## 8. Contrats frontend / 3D / physique

- `AccessoryModel` consomme le GLB sans mutation destructive partagée ;
- Placement consomme une géométrie/collider stable ;
- `AccessoryModel` sait désactiver les colliders automatiques Rapier et charger un `collider.glb` préparé ;
- chaque mesh du proxy devient une partie `ConvexHullCollider`, sans décomposition coûteuse au runtime ;
- garde-fou runtime : maximum 12 parties convexes et 4096 sommets par partie ;
- les ressources render sont libérées à l'unmount/reload ;
- la scène Three.js d'un proxy est libérée immédiatement après extraction des tableaux de sommets ;
- maximum **8 accessoires simultanés** en V2.0 ;
- scale limits serveur/catalogue conservées ;
- contact physique crédible ;
- CCD/sleep/friction/restitution ajustés seulement si mesurés ;
- l'objet reste sélectionnable même si son collider est simplifié.

## 9. Contrats Supabase

Le catalogue `accessories` reste la source commerciale serveur.

Le Lot B ajoute deux colonnes JSONB non nulles :

- `collision` pour la stratégie et, si nécessaire, le chemin d'un proxy préparé hors ligne ;
- `budget` pour les mesures runtime, avec `runtimeModelBytes` obligatoire sur toute entrée active.

Les chemins de proxy sont validés côté base et aucun binaire n'est stocké dans Postgres. Le champ legacy `provenance` reste présent pour compatibilité V1 mais ne conditionne plus l'activation d'un accessoire.

Le Lot C durcit le contrat : toute `geometrySource = proxy` impose désormais un `proxyPath` valide, et un `proxyPath` ne peut pas être associé à une source render.

Le Lot D stage les 11 entrées V2 en `active=false` avec leurs chemins, triangles, dimensions, scales, physique, collision et budgets finaux. Les possessions restent celles de V2-02 et aucune référence V2 n'est activée avant le Lot G.

Le Lot E ne nécessite aucune migration : il ne change ni catalogue commercial, ni prix, ni possession, ni placement, ni RLS/RPC.

Le Lot F ne nécessite aucune migration : `private.create_equipped_accessory_impl` imposait déjà le plafond serveur à huit placements, aligné avec `MAX_EQUIPPED_ACCESSORIES = 8` côté frontend.

## 10. Migration / backfill / compatibilité V1

- les quatre accessoires V1 restent valides ;
- leurs metadata collision et poids runtime sont backfillées ;
- ne pas changer leurs IDs ;
- aucune perte de possession ;
- anciens placements doivent continuer à charger.

Migration Lot B : `20260904213106_v2_03_accessory_asset_contract.sql`.

Migration Lot C : `20260904220112_v2_03_proxy_collision_contract.sql`.

Migration Lot D : `20260904225708_v2_03_stage_accessory_catalogue.sql`.

Lot E : aucune migration nécessaire.

Lot F : aucune migration nécessaire.

## 11. RLS / RPC / idempotence / sécurité

- catalogue lecture contrôlée ;
- prix serveur ;
- achat unique ;
- placement uniquement si possédé ;
- impossible de placer deux fois ;
- maximum huit placements simultanés défendu aussi côté serveur ;
- aucun chemin asset arbitraire injecté par client ;
- les 11 références V2 restent invisibles aux clients tant que `active=false`.

## 12. Offline / PWA / réconciliation

- aucun GLB lourd n'est ajouté au précache du shell ;
- cache render `model.glb` : CacheFirst, 12 entrées max, 30 jours ;
- cache proxy `collider.glb` : CacheFirst, 10 entrées max, 30 jours ;
- cache previews : StaleWhileRevalidate, 48 entrées max, 14 jours ;
- cache code lazy : StaleWhileRevalidate, 24 entrées max, 30 jours ;
- tous les caches runtime utilisent `purgeOnQuotaError` ;
- priorité aux objets réellement demandés par le Socle ;
- catalogue stale acceptable en lecture dégradée avec indication appropriée ;
- achat jamais simulé offline.

Le catalogue complet n'est pas préchargé en 3D : les caches runtime apprennent les ressources à leur première requête.

## 13. Performance et budgets

Budgets du pipeline Lot D :

- `model.glb` <= 5 MiB ;
- texture runtime <= 1024 px par défaut ;
- crocodile ramené à 512 px après mesure pour rester sous le budget GLB ;
- preview PNG 512x512 et <= 2 MiB ;
- `collider.glb` <= 1 MiB au validateur release ;
- runtime 3D lazy ;
- pas de croissance GPU linéaire ;
- collider aussi simple que possible sans sacrifier le contact visuel.

Le validateur release compare `runtimeModelBytes` à la taille exacte du fichier, vérifie les chemins render/preview/proxy et impose les metadata minimales du manifeste schemaVersion 2.

Le Lot E ne conserve pas de scènes GLTF décodées après leur retrait. Le cache persistant des binaires est borné côté Service Worker ; les géométries, matériaux et textures Three.js restent liés au cycle de vie des objets réellement montés.

Le Lot F mesure les huit V2 les plus lourds à **72 652 triangles render et 26 169 312 octets de GLB**. Sur le runner SwiftShader, le palier tablette 8 charge en 3 919 ms et se stabilise en 4 529 ms. La croissance relative tablette 1→8 est de 2,63× en idle, 2,48× pendant settlement et 2,25× au chargement froid. Le soak reste strictement stable à 9 géométries / 27 textures.

Ces valeurs valident le plafond 8 mais ne sont pas assimilées à des FPS matériels. Un relèvement futur exige des mesures sur téléphone/tablette réels, notamment chauffe et qualité tactile.

## 14. UX téléphone / tablette / desktop

Tester les objets petits, fins, concaves, proches les uns des autres et le sélecteur fallback. Une preview jolie ne compense pas un objet impossible à attraper ou à poser.

Le Lot F couvre automatiquement le palier 8 sur téléphone et tablette, mais un runner headless ne certifie pas la sensation tactile ni le throttling thermique. Ces deux critères restent une condition préalable à tout relèvement futur du plafond.

## 15. Tests unitaires utiles

- validation metadata catalogue ;
- scale limits ;
- parsing collision descriptor ;
- règles disponibilité possédé/placé ;
- budgets ;
- politiques de cache render/collider/preview bornées et non chevauchantes ;
- plafond V2.0 verrouillé à huit accessoires.

Le Lot B couvre le parsing collision/budget côté TypeScript et les contraintes catalogue côté SQL. Le Lot C couvre la résolution runtime auto/manual, l'extraction de parties convexes, les garde-fous de complexité et le chargement des proxies préparés. Le Lot D étend les invariants de release aux 15 manifestes techniques, chemins publics et budgets render/proxy/preview. Le Lot E étend les tests de cache au `collider.glb` et valide le bornage 24/12/10/48. Le Lot F ajoute un test explicite de `MAX_EQUIPPED_ACCESSORIES = 8`.

## 16. Browser regression

Ajouter aux scénarios existants : chargement nouveaux objets, achat unique, placement, contact réel, retrait/replacement, reload, plusieurs objets jusqu'au plafond retenu, cycles ajout/retrait sans fuite visible.

Le scénario historique `accessory-placement` vérifie déjà que reload et retrait provoquent un disposal GPU. Le Lot E ajoute `accessory-resources`, qui parcourt deux fois les 11 renders et 11 proxies V2 réels, mesure `renderer.info.memory`, appelle le vrai `disposeRockObject` et vérifie les proxies via le vrai `createConvexColliderParts` et les constantes 12/4096 du runtime.

Browser #101 a révélé un faux positif utile : le premier banc comptait les entrées brutes de l'attribut `position` du crâne au lieu des sommets dédupliqués par le runtime. Le rapport montrait néanmoins une mémoire stable à 0 géométrie / 1 texture après 22 cycles, avec tous les renders et proxies disposés. Le banc a été corrigé pour mesurer exactement la couche runtime, sans relever aucun seuil ni exempter d'asset.

Le Lot F ajoute `v2-03-capacity` : paliers tablette 1/4/8 puis téléphone 8 avec les V2 les plus lourds, chargement froid, WebGL, vrais proxies, stabilisation Rapier et soak GPU. Browser regression #106 valide ce scénario ainsi que toute la suite historique.

Les nouveaux objets restent inactifs commercialement ; les scénarios d'achat/placement V2 seront activés au Lot G.

## 17. Discipline plateformes

Une branche/PR principale. Supabase uniquement si metadata réellement nécessaire. Une Preview Vercel finale peut être utile pour inspecter visuellement les nouveaux contacts 3D, jamais une Preview par asset.

Les Lots E et F n'imposent aucune Preview Vercel : cache, disposal et capacité sont mesurés sur GitHub Actions avec les assets runtime exacts. Le quota Vercel est préservé.

## 18. Critères d'acceptation

- [ ] catalogue enrichi avec uniquement des assets techniquement validés ;
- [ ] chaque asset possède preview et collider crédible ;
- [ ] pas d'effet flottant perceptible ;
- [ ] objets uniques respectés ;
- [ ] anciens accessoires non cassés ;
- [x] budgets mesurés ;
- [x] plafond d'objets mesuré et fixé ou explicitement maintenu à 8 ;
- [x] cache/disposal bornés ;
- [x] CI + Browser regression verts ;
- [ ] production vérifiée après merge.

## 19. Interdictions anti-scope-creep

Ne pas ajouter d'animation, interaction, sols, peinture, collection thématique, loot/succès ou boutique parallèle. Ne pas sacrifier la précision de contact pour « faire passer » un asset mal préparé.

## 20. État / compte rendu d'exécution

**Statut global : en cours. Lots A à F terminés. Lot G non démarré.**

### Lot A — checkpoint du 4 septembre 2026

- audit Blender 4.5.13 LTS automatisé et reproductible ;
- 11 modèles 3D importables conservés ;
- `chicken_1.fbx`, `model.fbx` et `poo_scan.glb` classés optimisation obligatoire ;
- pivots, textures, matériaux et familles de collider identifiés ;
- `sketchfab.zbrush` supprimé car vide/inutilisable ;
- `tex_u1_v1_diffuse.jpeg` supprimé car doublon exact de la variante `.jpg` effectivement référencée ;
- `public.accessories` et le catalogue runtime V1 audités sans mutation ;
- aucune migration Supabase ;
- aucun fichier runtime modifié ;
- aucune Preview Vercel requise ;
- licences/notices/provenance explicitement exclues de V2-03 ;
- rapport complet : `docs/roadmap/V2-03-LOT-A-AUDIT.md`.

### Lot B — checkpoint du 4 septembre 2026

- migration Supabase additive `20260904213106_v2_03_accessory_asset_contract` appliquée ;
- colonnes `collision jsonb not null` et `budget jsonb not null` ajoutées ;
- contraintes de stratégie collision, chemin proxy et budgets ajoutées ;
- `runtimeModelBytes` obligatoire pour toute entrée active ;
- quatre accessoires V1 backfillés sans changer leurs IDs, prix, possessions, placements, échelles ou physique ;
- ancien champ `provenance` conservé mais retiré du contrat d'activation ;
- types Supabase régénérés ;
- Boutique raccordée à `collision` et `budget` sans modifier encore le comportement Rapier ;
- parseurs TypeScript collision/budget et tests unitaires ajoutés ;
- test SQL transactionnel des contraintes et du backfill ajouté ;
- aucun nouvel objet de `Ressource/` publié ;
- aucune Preview Vercel manuelle déclenchée ;
- rapport complet : `docs/roadmap/V2-03-LOT-B-CONTRAT-ASSET.md`.

### Lot C — checkpoint du 4 septembre 2026

- pipeline Blender 4.5.13 LTS déterministe ajouté pour fabriquer les proxies depuis `Ressource/` ;
- 11/11 proxies générés avec succès, tous sous leurs budgets de triangles et de poids ;
- stratégies figées : hull proxy pour `mask-scan`, `skull`, `worn-flip-flop` ; compound proxy pour `mouse-ears`, `traffic-cone`, `bebe-assets`, `crocodile-dog-toy`, `garden-gnome` ; simplified proxy pour `chicken`, `model`, `poo-scan` ;
- total généré : 14 308 triangles de collision et 1 124 040 octets ; plus gros proxy `poo-scan` à 2 286 triangles / 180 480 octets ;
- normalisation proxy fixée : centrage X/Y, base Z=0 et plus grande dimension ramenée à 1 ;
- runtime raccordé aux metadata `collision` des instances placées ;
- colliders automatiques V1 conservés ; nouveaux proxies chargés en parties `ConvexHullCollider` ;
- garde-fou runtime : 12 parties convexes maximum et 4096 sommets maximum par partie ;
- migration Supabase `20260904220112_v2_03_proxy_collision_contract` appliquée ; catalogue actif resté à 4 entrées ;
- aucun déploiement Vercel consommé ;
- rapport complet : `docs/roadmap/V2-03-LOT-C-COLLIDERS.md`.

### Lot D — checkpoint du 5 septembre 2026

- pipeline runtime Blender 4.5.13 LTS ajouté : normalisation commune render/collider, décimation render, textures bornées, GLB autonome et preview 512x512 ;
- workflow `V2-03 runtime asset pipeline` #4 vert et promotion automatique des 11 `model.glb`, 11 `collider.glb` et 11 previews dans `public/assets` ;
- 107 151 triangles render V2 pour 27 069 392 octets de GLB ; plus gros modèle `skull` à 4 584 892 octets ;
- textures V2 plafonnées à 1024 px, crocodile mesuré puis ramené à 512 px pour respecter le budget de 5 MiB ;
- manifeste `public/assets/accessories/catalog.json` passé à schemaVersion 2, 15 références techniques au total ;
- validateur release étendu aux chemins canoniques, tailles exactes, previews, colliders, dimensions, scales et budgets ;
- metadata commerciales minimales centralisées dans `scripts/3d/accessory-catalog-metadata.json` ;
- migration Supabase `20260904225708_v2_03_stage_accessory_catalogue` appliquée ; 11 références V2 staged avec `active=false` ;
- vérification serveur : 4 actifs V1, 11 V2 inactifs, 0 possession V2, 0 placement V2, RLS catalogue inchangée ;
- aucune nouvelle exigence licences/notices/provenance pour les V2 ;
- aucune Preview Vercel manuelle consommée ;
- CI #428 et Browser regression #100 verts ;
- rapport complet : `docs/roadmap/V2-03-LOT-D-PREVIEW-CATALOGUE.md`.

### Lot E — checkpoint du 5 septembre 2026

- audit confirmé : `AccessoryModel` charge uniquement les instances montées, sans cache global de scènes GLTF décodées ;
- renders disposés à l'unmount/reload via `disposeRockObject` ; proxies disposés immédiatement après extraction des sommets ;
- previews Boutique conservées comme images DOM, donc sans duplication WebGL avec la scène ;
- nouveau cache Workbox `collider.glb` CacheFirst borné à 10 entrées / 30 jours / purge sur erreur de quota ;
- caches runtime désormais bornés à 24 code lazy / 12 renders / 10 colliders / 48 previews ;
- tests unitaires de politique cache étendus aux proxies et au non-chevauchement render/collider ;
- nouveau scénario Browser `accessory-resources` : 11 V2 × 2 tours, render WebGL, disposal réel, extraction runtime des colliders et mesure `renderer.info.memory` ;
- premier passage #101 : mémoire stable et disposal complet, faux positif sur comptage brut des sommets du crâne ; test corrigé pour utiliser `createConvexColliderParts` sans modifier les limites runtime ;
- CI #432 et Browser regression #104 verts ;
- aucune migration Supabase : état maintenu à 4 actifs V1 / 11 V2 staged / 0 V2 actif ;
- aucun déploiement Vercel consommé ;
- rapport complet : `docs/roadmap/V2-03-LOT-E-CHARGEMENT-DISPOSAL.md`.

### Lot F — checkpoint du 5 septembre 2026

- nouveau banc `v2-03-capacity` branché à Browser regression avec les vrais `model.glb`, `collider.glb`, `AccessoryModel` et `PlacementPhysicsWorld` ;
- paliers V2 réels : tablette 1/4/8 et téléphone 8 ;
- sélection conservatrice par poids GLB : le palier 8 concentre les huit V2 les plus lourds, soit 72 652 triangles render et 26 169 312 octets ;
- tablette 8 : chargement froid 3 919 ms, idle moyen 211,2 ms / p95 260,4 ms sous SwiftShader, settlement 4 529 ms ;
- téléphone 8 : chargement froid 2 445 ms, idle moyen 99,6 ms / p95 104,9 ms, settlement 3 975 ms ;
- croissance tablette 1→8 : idle 2,63×, settlement 2,48×, chargement 2,25× ;
- soak GPU tablette et téléphone à 8 : 9 géométries / 27 textures avant et après, stable ;
- benchmark Placement historique toujours vert à 1/4/8 avec téléphone/tablette/desktop ;
- `MAX_EQUIPPED_ACCESSORIES = 8` verrouillé par test unitaire ;
- plafond serveur déjà aligné : le neuvième placement est refusé par `private.create_equipped_accessory_impl` ;
- décision finale : **plafond V2.0 = 8**, sans relèvement faute de preuve matérielle thermique/tactile pour 10+ ;
- CI #434 et Browser regression #106 verts ;
- aucune migration Supabase et aucune activation V2 ;
- aucun déploiement Vercel consommé ;
- rapport complet : `docs/roadmap/V2-03-LOT-F-PLAFOND-OBJETS.md`.

À compléter au Lot G : activation Boutique/Placement, achat unique, état Possédé, retrait/réutilisation, sélection/tap des V2, validation finale distante si réellement nécessaire, puis production après merge et dettes vers V2-10/V2.3.

**Ne pas démarrer V2-04 dans cette PR.**
