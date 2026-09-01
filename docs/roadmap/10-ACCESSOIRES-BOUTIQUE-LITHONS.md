# Étape 10 — Accessoires et boutique Lithons

> Cette étape historique est désormais scindée en quatre sous-étapes exécutables :
> `10A-PIPELINE-ACCESSOIRES-3D-CATALOGUE.md`, `10B-BOUTIQUE-LITHONS-PROPRIETE.md`,
> `10C-MULTI-EQUIPEMENT-PLACEMENT-LIBRE.md` et `10D-PHYSIQUE-COLLISIONS-GRAVITE-PERSISTANCE.md`.

## Objectif initial

Permettre à l'utilisateur d'acquérir des accessoires avec ses Lithons puis de les placer librement sur son caillou, avec plusieurs accessoires simultanés, collisions, gravité optionnelle et persistance.

## Résultat cible du jalon 10

À la fin du jalon complet :

- un catalogue d'accessoires 3D web optimisés et tracés existe ;
- les accessoires sont achetables avec des Lithons via une transaction serveur autoritaire ;
- la propriété d'un type d'accessoire est permanente au compte ;
- plusieurs accessoires peuvent être placés simultanément sur un caillou ;
- chaque instance peut être déplacée, tournée et redimensionnée manuellement ;
- les accessoires ne traversent pas visiblement le caillou ;
- la gravité peut être activée sur les accessoires compatibles ;
- les placements stabilisés sont persistés dans Supabase et restaurés après reconnexion/reload.

## Découpage retenu

### 10A — Pipeline accessoires 3D et catalogue

- Audit des ressources source.
- Provenance et licences.
- Conversion Blender vers GLB web autonome.
- PBR, textures, normalisation, pivots, budgets.
- Preview et validation Three.js/WebGL.
- Métadonnées utiles au placement et à la physique future.

### 10B — Boutique Lithons et propriété

- Catalogue commercial côté Supabase.
- Prix fixes en Lithons.
- Achat atomique et idempotent côté serveur.
- Ledger cohérent.
- Propriété permanente dans `user_accessories`.
- UI Boutique/Accessoires.
- Aucun placement libre 3D dans cette sous-étape.

### 10C — Multi-équipement et placement libre

- Plusieurs accessoires simultanés sur un même caillou.
- Création d'instances équipées distinctes de la propriété du type.
- Translation, rotation et échelle manuelles.
- UX tactile téléphone/tablette.
- Sélection, suppression du placement et réédition.
- Pas encore de simulation physique complète ni persistance finale.

### 10D — Physique, collisions, gravité et persistance

- Colliders caillou/accessoires.
- Anti-traversée visible.
- Gravité client pour les accessoires compatibles.
- Stabilisation et reprise de contrôle manuel.
- Persistance Supabase des transforms finaux relatifs au caillou.
- Restauration exacte après reload/reconnexion.
- Validation performance et mémoire GPU sur appareils cibles.

## Règles structurelles

- La possession d'un type d'accessoire est une donnée de compte, distincte d'une instance équipée.
- Un utilisateur peut conserver ses accessoires même s'il jette son caillou.
- Plusieurs instances peuvent coexister sur un même caillou ; ne pas imposer une exclusivité artificielle par `slot`.
- Les transformations persistées sont relatives au caillou, jamais en coordonnées monde.
- La physique est calculée côté client. Supabase stocke l'état final stabilisé mais ne simule rien.
- Les Lithons n'ont aucune valeur réelle, ne sont ni achetables ni transférables.
- Aucun achat ne peut être autorisé uniquement par le navigateur.

## Périmètre exclu du jalon 10

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
- État 10A : Terminée — PR #19, monocle CC BY 4.0 publié ; trois sources non vérifiées mises en quarantaine à cette date
- État 10B : Terminée — PR #20, boutique Lithons et propriété permanente validées sous RLS ; catalogue commercial final à quatre accessoires, dont les trois ressources de 10A réintégrées après confirmation CC0
- État 10C : À faire
- État 10D : À faire
- Étape suivante après jalon complet : 11
