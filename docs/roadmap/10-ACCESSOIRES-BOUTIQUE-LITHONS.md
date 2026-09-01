# Étape 10 — Accessoires : jalon global

## Statut de ce fichier

Ce fichier reste le point d'entrée historique du jalon `10 — Accessoires et boutique Lithons`, mais son exécution est désormais **scindée en quatre sous-étapes** pour séparer les risques 3D, économiques, UX et physiques.

Ne pas exécuter ce fichier comme une étape monolithique. Exécuter dans l'ordre :

1. `10A` — Pipeline accessoires 3D et catalogue ;
2. `10B` — Boutique Lithons et propriété ;
3. `10C` — Multi-équipement et placement libre ;
4. `10D` — Physique, collisions, gravité et persistance.

Les étapes 01 à 09 sont historiques et ne doivent pas être réécrites pour refléter cette évolution.

## Vision fonctionnelle consolidée

Les accessoires sont des objets cosmétiques réalistes ou quasi photoréalistes, cohérents avec les vingt cailloux et la direction artistique premium. Ils sont achetés en Lithons, restent acquis au compte et peuvent être placés librement sur ou autour du caillou adopté.

Le système final doit permettre :

- plusieurs accessoires simultanément sur un même caillou ;
- déplacement manuel ;
- rotation ;
- agrandissement/rétrécissement dans des bornes raisonnables ;
- collisions empêchant le passage à travers la pierre ;
- gravité et stabilisation physique lorsque cela reste performant ;
- persistance exacte du placement stabilisé ;
- restauration au reload et après reconnexion ;
- fonctionnement tactile téléphone/tablette et desktop ;
- absence de limitation artificielle à un unique accessoire par `slot`.

## Contrat de données à faire évoluer

Le schéma actuel possède déjà `accessories`, `user_accessories` et `equipped_accessories`, mais `equipped_accessories` est actuellement indexée par `(user_rock_id, slot)`. Ce modèle ne correspond plus au besoin multi-instance.

La cible est un modèle d'**instances d'accessoires équipés** avec un identifiant propre, reliées à :

- un `user_rock_id` ;
- un `accessory_id` possédé par l'utilisateur ;
- un transform local au caillou : position, rotation quaternion, échelle ;
- les métadonnées de placement utiles ;
- timestamps de création/mise à jour.

La notion de `slot` peut rester une métadonnée de catégorie/présentation si utile, mais ne doit plus être une contrainte d'unicité empêchant plusieurs accessoires simultanés.

## Règles métier globales

- Aucun achat en argent réel en V1.
- Aucun loot box, rareté agressive ou mécanique aléatoire.
- Prix fixe en Lithons.
- Les accessoires achetés restent acquis au compte même si un caillou est jeté.
- Un achat est autoritaire, transactionnel et idempotent côté Supabase.
- La physique reste côté client ; Supabase persiste l'état stabilisé, il ne simule pas Rapier.
- Les transforms persistants sont enregistrés relativement au caillou, jamais en coordonnées monde.
- Un accessoire ne doit pas pouvoir traverser visiblement le caillou pendant ou après le placement.
- Les assets sources lourds et formats de travail restent hors du bundle public ; le runtime consomme des GLB web autonomes.

## Sous-étapes

### 10A — Pipeline accessoires 3D et catalogue

Objectif : transformer les ressources réelles disponibles (`.blend`, `.fbx`, `.dae`, `.obj`, `.gltf/.glb`, archives et textures PBR) en assets web homogènes et auditables.

À couvrir :

- inventaire des ressources ;
- conversion vers GLB autonome ;
- reconstruction PBR si nécessaire ;
- normalisation orientation, échelle, pivot ;
- optimisation géométrie/textures ;
- collider simplifié ou métadonnées nécessaires à sa génération ;
- preview standardisée ;
- provenance, auteur, source et licence ;
- catalogue technique exploitable par l'application.

### 10B — Boutique Lithons et propriété

Objectif : livrer le catalogue commercial et l'achat robuste sans encore dépendre de la physique.

À couvrir :

- UI Boutique/Accessoires ;
- solde, prix, possédé/non possédé ;
- achat atomique côté Supabase ;
- débit wallet + ledger + possession en une transaction ;
- idempotence et concurrence ;
- tests utilisateur A/B et solde insuffisant ;
- catalogue initial limité mais réel.

### 10C — Multi-équipement et placement libre

Objectif : permettre plusieurs accessoires simultanément et leur édition manuelle.

À couvrir :

- évolution du modèle `equipped_accessories` vers des instances ;
- chargement simultané de plusieurs GLB accessoires avec un seul GLB de caillou actif ;
- sélection d'un accessoire ;
- translation ;
- rotation ;
- échelle bornée ;
- UX tactile claire ;
- désactivation temporaire des contrôles caméra pendant manipulation ;
- transforms exprimés dans l'espace local du caillou ;
- sauvegarde provisoire/explicite sans dépendre encore de la gravité complète.

### 10D — Physique, collisions, gravité et persistance

Objectif : donner une matérialité crédible aux accessoires sans sacrifier la performance mobile.

À couvrir :

- intégrer un moteur physique adapté à React Three Fiber, cible recommandée : Rapier ;
- collider statique du caillou ;
- colliders simplifiés pour accessoires dynamiques ;
- corps kinematic pendant manipulation ;
- corps dynamic au lâcher lorsque pertinent ;
- gravité, friction, damping et restitution calibrés ;
- anti-traversée ;
- stabilisation/sleep ;
- capture du transform final ;
- persistance Supabase ;
- restauration sans refaire tomber les objets à chaque ouverture ;
- budget CPU/GPU/batterie compatible avec `frameloop="demand"` autant que possible ;
- tests avec plusieurs accessoires simultanés sur plusieurs morphologies de cailloux.

## Hors périmètre global V1

- Paiement réel.
- Marketplace entre utilisateurs.
- Cadeaux/transferts.
- Simulation physique serveur.
- Déformation molle réaliste des textiles.
- Catalogue massif.
- Destruction ou casse des accessoires.

## Critères d'acceptation du jalon 10

Le jalon 10 est terminé lorsque :

- les accessoires retenus disposent de GLB web autonomes et tracés ;
- l'achat est transactionnel et idempotent ;
- plusieurs accessoires peuvent être équipés simultanément ;
- chacun peut être déplacé, tourné et redimensionné ;
- les collisions empêchent les pénétrations visibles avec la pierre ;
- la gravité fonctionne sur les accessoires compatibles sans compromettre le mobile ;
- le placement final est persistant côté Supabase ;
- reload/reconnexion restaurent exactement la composition ;
- jeter un caillou ne détruit pas les possessions du compte ;
- performances, mémoire GPU et interactions sont validées sur téléphone/tablette cibles.

## État / compte rendu

**Statut : À faire — scindée en 10A, 10B, 10C et 10D**

- Décision de découpage : 2026-09-01
- Motif : ressources 3D hétérogènes + multi-équipement + placement libre + physique + persistance dépassent un objectif unique cohérent
- État 10A : Terminée — PR #19, monocle CC BY 4.0 publié ; trois sources non vérifiées en quarantaine
- État 10B : À faire
- État 10C : À faire
- État 10D : À faire
- Étape suivante après jalon complet : 11
