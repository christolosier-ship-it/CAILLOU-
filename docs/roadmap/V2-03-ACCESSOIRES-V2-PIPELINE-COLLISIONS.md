# V2-03 — Accessoires V2 & pipeline collisions

> **Statut : en cours — Lot A terminé le 4 septembre 2026.**
>
> **Date : 4 septembre 2026.**
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
- le plafond de huit objets est provisoire ;
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

### Lot B — Contrat d'un asset accessoire V2

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

### Lot C — Pipeline collider

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

Documenter le choix par asset ou famille.

### Lot D — Pipeline preview/catalogue

Standardiser :

- cadrage preview ;
- fond et lumière cohérents ;
- nommage fichiers ;
- chemins publics ;
- catalog update ;
- validation automatique des chemins et budgets.

### Lot E — Chargement et disposal

- lazy-load ;
- ne pas précharger le catalogue complet ;
- cache runtime borné ;
- libération géométrie/matériaux/textures après retrait/changement ;
- pas de duplication GPU inutile entre preview et scène.

### Lot F — Mesure du plafond d'objets

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

Fixer un plafond final uniquement si les données permettent de le justifier. Sinon conserver 8 et documenter pourquoi.

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

Le pipeline doit séparer :

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

## 8. Contrats frontend / 3D / physique

- `AccessoryModel` consomme le GLB sans mutation destructive partagée ;
- Placement consomme une géométrie/collider stable ;
- scale limits serveur/catalogue conservées ;
- contact physique crédible ;
- CCD/sleep/friction/restitution ajustés seulement si mesurés ;
- l'objet reste sélectionnable même si son collider est simplifié.

## 9. Contrats Supabase

Le catalogue `accessories` reste la source commerciale serveur.

Si une colonne collision/proxy est nécessaire, migration additive + validation JSON/format raisonnable. Ne pas mettre de binaire dans Postgres.

Les possessions restent celles de V2-02.

## 10. Migration / backfill / compatibilité V1

- les quatre accessoires V1 restent valides ;
- compléter leurs metadata collision si nécessaire ;
- ne pas changer leurs IDs ;
- aucune perte de possession ;
- anciens placements doivent continuer à charger.

## 11. RLS / RPC / idempotence / sécurité

- catalogue lecture contrôlée ;
- prix serveur ;
- achat unique ;
- placement uniquement si possédé ;
- impossible de placer deux fois ;
- aucun chemin asset arbitraire injecté par client.

## 12. Offline / PWA / réconciliation

- cache GLB/previews borné ;
- priorité aux objets placés/possédés nécessaires au Socle ;
- catalogue stale acceptable en lecture dégradée avec indication appropriée ;
- achat jamais simulé offline.

## 13. Performance et budgets

Conserver les budgets V2-00 :

- GLB sous les garde-fous existants sauf justification mesurée ;
- textures 2048 max par défaut et viser ≤ 1 MiB ;
- runtime 3D lazy ;
- pas de croissance GPU linéaire ;
- collider aussi simple que possible sans sacrifier le contact visuel.

Ajouter un validateur automatisé pour les budgets si la chaîne actuelle n'en couvre pas les nouveaux assets.

## 14. UX téléphone / tablette / desktop

Tester les objets petits, fins, concaves, proches les uns des autres et le sélecteur fallback. Une preview jolie ne compense pas un objet impossible à attraper ou à poser.

## 15. Tests unitaires utiles

- validation metadata catalogue ;
- scale limits ;
- parsing collision descriptor ;
- règles disponibilité possédé/placé ;
- budgets.

## 16. Browser regression

Ajouter aux scénarios existants : chargement nouveaux objets, achat unique, placement, contact réel, retrait/replacement, reload, plusieurs objets jusqu'au plafond retenu, cycles ajout/retrait sans fuite visible.

## 17. Discipline plateformes

Une branche/PR principale. Supabase uniquement si metadata réellement nécessaire. Une Preview Vercel finale peut être utile pour inspecter visuellement les nouveaux contacts 3D, jamais une Preview par asset.

## 18. Critères d'acceptation

- [ ] catalogue enrichi avec uniquement des assets techniquement validés ;
- [ ] chaque asset possède preview et collider crédible ;
- [ ] pas d'effet flottant perceptible ;
- [ ] objets uniques respectés ;
- [ ] anciens accessoires non cassés ;
- [ ] budgets mesurés ;
- [ ] plafond d'objets mesuré et fixé ou explicitement maintenu à 8 ;
- [ ] cache/disposal bornés ;
- [ ] CI + Browser regression verts ;
- [ ] production vérifiée après merge.

## 19. Interdictions anti-scope-creep

Ne pas ajouter d'animation, interaction, sols, peinture, collection thématique, loot/succès ou boutique parallèle. Ne pas sacrifier la précision de contact pour « faire passer » un asset mal préparé.

## 20. État / compte rendu d'exécution

**Statut global : en cours. Lot A terminé. Lots B à G non démarrés.**

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

À compléter dans les lots suivants : assets intégrés, poids/triangles/textures finaux, stratégie collider finale par asset, migrations éventuelles, plafond retenu et mesures, tests, Preview finale si nécessaire, production, dettes vers V2-10/V2.3.

**Ne pas démarrer V2-04 dans cette PR.**
