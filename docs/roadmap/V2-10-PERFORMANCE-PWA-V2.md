# V2-10 — Performance & PWA V2

> **Statut : spécifiée — prête à exécuter après V2-03 à V2-09.**
>
> **Date : 4 septembre 2026.**
>
> **Nature : consolidation performance, mémoire, cache, offline et update path.**

Ce fichier est le prompt autonome d'exécution de V2-10 et deviendra son historique après réalisation.

## 1. Prompt d'exécution

Lis l'index, ce fichier, les comptes rendus V2-03 à V2-09, le compte rendu V2-00 sur les budgets, la configuration Vite/PWA, les politiques cache, les validateurs mémoire/GLB, les assets réellement distribués et le runtime 3D final de V2.0.

GitHub obligatoire. Supabase en audit pour les payloads/round-trips. Vercel obligatoire pour au moins une validation finale du build/runtime réel si le chantier modifie le runtime/PWA.

Mesure avant d'optimiser. N'introduis aucune optimisation spéculative dont le coût de maintenance dépasse le gain observé.

## 2. Contexte réel

Baseline V2-00 :

- gros chunk 3D/physique ≈ **1,02 MiB gzip**, lazy ;
- croissance durable > ~10 % à justifier ;
- textures futures 2048×2048 max par défaut, viser ≤ 1 MiB ;
- runtime cache code : 24 entrées / 30 jours ;
- modèles : 12 entrées / 30 jours ;
- previews : 48 entrées / 14 jours ;
- companion assets bornés ;
- précache réservé au shell ;
- baseline mémoire après cycles : pas de croissance géométrie/texture linéaire.

La V2 ajoute colliders fins, plus d'accessoires, sols/textures, peinture paramétrique, Personnalité/Journal et Studio Photo.

## 3. Décisions métier actées

- priorité au tactile téléphone/tablette ;
- pas de simulation Rapier permanente inutile ;
- pas de précache massif des assets 3D ;
- dernier état connu possible offline mais non autoritaire ;
- aucun achat/entitlement fabriqué offline ;
- plafond d'objets fixé sur données mesurées ;
- aucune dégradation visuelle/physique majeure masquée comme « optimisation ».

## 4. Objectif utilisateur

La V2 doit rester rapide à ouvrir, fluide à manipuler et stable sur une tablette/téléphone raisonnable, même après plusieurs sessions, changements de sols, captures Studio et cycles d'ajout/retrait d'objets.

## 5. Périmètre précis

### Lot A — Profiling baseline V2

Mesurer avant modification :

- taille JS initiale ;
- chunks lazy ;
- temps de chargement shell ;
- temps d'arrivée de la scène ;
- GLB/texture transfer ;
- frame time observation ;
- frame time Placement ;
- frame time collisions ;
- stabilisation Rapier ;
- mémoire GPU proxy via `renderer.info` et cycles ;
- caches et quota ;
- taille IndexedDB/localStorage ;
- capture Studio.

### Lot B — Bundles/lazy loading

Vérifier que :

- Three/R3F/Rapier restent hors shell initial si possible ;
- Journal/Studio/Personnalité sont chargés à la demande lorsqu'ils ne servent pas au boot ;
- aucun import d'asset catalogue ne force tout le catalogue dans le bundle ;
- les previews restent HTTP/runtime assets.

### Lot C — GLB et colliders

- valider tous les GLB distribués ;
- mesurer poids/triangles ;
- colliders préparés ou suffisamment cheap ;
- pas de recalcul de décomposition complexe à chaque ouverture ;
- mutualiser/dédupliquer sans partager des objets Three mutables dangereux ;
- disposal vérifié.

### Lot D — Textures sols

- dimensions adaptées ;
- compression ;
- mipmaps/anisotropy raisonnables ;
- cache dédié borné ;
- disposal au changement ;
- pas de 4096 par défaut.

### Lot E — Physique

- corps au repos en sleep ;
- simulation activée seulement lorsque nécessaire ;
- CCD réservé aux cas utiles ;
- colliders assez précis sans explosion du nombre de primitives ;
- vérifier jitter/tunneling et coût lorsque plusieurs objets sont présents.

### Lot F — Plafond d'objets final

Reprendre les mesures V2-03 et confirmer le plafond serveur/frontend final.

Le plafond retenu doit être le même dans :

- validations serveur ;
- frontend ;
- tests ;
- documentation.

Ne pas augmenter le plafond uniquement parce qu'un desktop haut de gamme le supporte.

### Lot G — PWA/cache V2

Auditer les caches actuels et les étendre seulement si nécessaire :

- shell ;
- code runtime ;
- rock actif ;
- accessoires placés ;
- previews ;
- textures du sol actif ;
- éventuels assets éditoriaux légers.

Conserver des limites de nombre/âge et purge quota.

### Lot H — Snapshot/offline

Vérifier que le snapshot dégradé inclut les données utiles V2 :

- caillou/pose ;
- accessoires uniques placés ;
- sol ;
- peinture ;
- personnalité déjà lue si utile ;
- résumé Journal déjà lu si cache prévu ;
- entitlements connus clairement marqués comme dernier état connu.

### Lot I — Update PWA

Tester :

- ancien service worker V1 ;
- cache V1 ;
- upgrade vers V2 ;
- activation d'une nouvelle version ;
- session active ;
- reload volontaire ;
- suppression des vieux caches ;
- compatibilité avec les migrations de schéma déjà livrées.

## 6. Hors périmètre

- redesign UX ;
- nouvelle feature ;
- réécriture moteur 3D ;
- migration DB de confort ;
- native app ;
- CDN externe non nécessaire ;
- compression expérimentale non supportée par les navigateurs cibles sans fallback.

## 7. Architecture cible

```text
shell léger
  -> features lazy
  -> scène 3D lazy
  -> assets runtime bornés
  -> cache dernier Socle utile
  -> Supabase reste canonique
```

## 8. Contrats frontend / 3D / physique

- pas de fuite de géométries/textures ;
- pas de `useFrame` coûteux permanent sans nécessité ;
- invalidate/render-on-demand lorsque compatible avec interactions ;
- Physique inactive/sleep au repos ;
- capture Studio libère ses ressources temporaires ;
- changement de sol libère l'ancien matériau/texture non partagé.

## 9. Contrats Supabase

Aucun DDL attendu. Optimiser requêtes seulement sur preuves : payloads, index réellement utilisés, appels redondants, N+1. Si un index est ajouté, migration + advisor et justification mesurée.

## 10. Migration / compatibilité V1

Cette étape doit tester le chemin d'upgrade, pas refaire les migrations métier. Tout correctif de compatibilité doit être additif et documenté pour V2-12.

## 11. RLS / sécurité

Les optimisations ne doivent jamais contourner RLS ou déplacer l'autorité économique dans le cache. Ne pas mettre de données sensibles supplémentaires dans les caches navigateur.

## 12. Offline / PWA / réconciliation

Scénarios minimum :

- boot offline avec cache ;
- asset manquant ;
- reconnexion ;
- mutation pending ;
- achat ;
- changement de sol ;
- peinture ;
- Journal ;
- Studio local ;
- vieux cache ;
- nouvelle version disponible.

## 13. Performance et budgets

Garde-fous cibles :

- maintenir le chunk 3D autour de la baseline, augmentation >10 % justifiée ;
- textures ≤2048 par défaut et viser ≤1 MiB ;
- pas de cache illimité ;
- GLB nouveaux sous budgets validés V2-03 ;
- aucune croissance linéaire GPU sur cycles ;
- aucun freeze tactile perceptible dû aux colliders ;
- aucun long task évitable au boot.

Documenter les écarts acceptés avec mesures avant/après.

## 14. UX téléphone / tablette / desktop

Valider au minimum des profils téléphone et tablette Chromium en CI, plus appareils physiques disponibles. Tester orientation, long session, retour arrière/avant, background/foreground PWA et mémoire sous pression lorsque possible.

## 15. Tests unitaires utiles

- cache policies ;
- eviction/versioning ;
- asset warmup selection ;
- snapshot V2 ;
- upgrade cache names ;
- ceiling constants ;
- aucun test artificiel de FPS en unit test.

## 16. Browser regression

Étendre la matrice existante avec : cycles de scène, sols successifs, peinture, plafond d'objets, Placement collisions, Studio capture, offline/reconnect, update service worker si testable, mémoire `renderer.info` avant/après cycles.

## 17. Discipline plateformes

Une branche/PR. Ne pas créer de nouveaux workflows si `Browser regression` peut porter les scénarios. Une seule Preview Vercel finale, nécessaire ici pour mesurer le vrai build/CDN/PWA. Vérifier logs/runtime après merge.

## 18. Critères d'acceptation

- [ ] shell léger et 3D lazy ;
- [ ] budgets documentés ;
- [ ] pas de fuite GPU linéaire ;
- [ ] plafond d'objets confirmé ;
- [ ] colliders fluides ;
- [ ] caches bornés/versionnés ;
- [ ] snapshot V2 cohérent ;
- [ ] update PWA V1→V2 testé ;
- [ ] aucune autorité métier déplacée offline ;
- [ ] CI + Browser regression verts ;
- [ ] Preview/build réel mesuré ;
- [ ] production sans erreur runtime nouvelle.

## 19. Interdictions anti-scope-creep

Ne pas refaire l'UI, réécrire Rapier/Three, ajouter une nouvelle librairie de cache, monter les plafonds sans mesure ou masquer une fuite par reload forcé.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : mesures avant/après, bundles, GLB/textures, plafond final, cache policy, mémoire GPU, profils appareils, CI, Preview, production, dégradations acceptées et dettes.

**Ne pas démarrer V2-11 dans cette PR.**