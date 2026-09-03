# Étape 10 — Accessoires et boutique Lithons

> Cette étape historique a été scindée puis exécutée en quatre sous-étapes :
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
- Création d'instances UUID équipées distinctes de la propriété du type.
- Translation, rotation et échelle manuelles.
- UX tactile téléphone/tablette.
- Sélection, suppression du placement et réédition.
- Persistance Supabase des transforms **manuels locaux au caillou** et restauration exacte.
- Pas encore de simulation physique complète, collisions ou gravité.

### 10D — Physique, collisions, gravité et persistance stabilisée

- Rapier client via `@react-three/rapier` 2.2.0.
- Collider statique `trimesh` du caillou.
- Colliders accessoires simplifiés : hulls dynamiques et cuboid fixe pour le Socle galerie.
- Anti-traversée visible pendant la manipulation.
- Gravité, friction, restitution, damping, CCD et sommeil pour les accessoires compatibles.
- Transition cinématique → dynamique après drag ou réglage fin.
- Réutilisation des instances UUID 10C pour enregistrer l'état final stabilisé.
- Colonne `stabilized_at` et RPC idempotent `stabilize_equipped_accessory(..., event_key)`.
- Restauration exacte après reload/reconnexion sans refaire tomber les poses déjà stabilisées.
- Validation multi-accessoires, téléphone/tablette, régressions historiques et Preview Vercel.

## Règles structurelles

- La possession d'un type d'accessoire est une donnée de compte, distincte d'une instance équipée.
- Un utilisateur peut conserver ses accessoires même s'il jette son caillou.
- Plusieurs instances peuvent coexister sur un même caillou ; ne pas imposer une exclusivité artificielle par `slot`.
- Les transformations persistées sont relatives au caillou, jamais en coordonnées monde.
- Le plafond V1 actuellement validé est de huit instances simultanées par caillou.
- La physique est calculée côté client. Supabase stocke l'état final stabilisé mais ne simule rien.
- Une pose intermédiaire `stabilized_at = NULL` n'est jamais présentée comme une pose finale confirmée.
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
- le placement final stabilisé est persistant côté Supabase ;
- reload/reconnexion restaurent exactement la composition ;
- jeter un caillou ne détruit pas les possessions du compte ;
- performances, mémoire GPU et interactions sont validées sur téléphone/tablette cibles.

Tous ces critères ont été couverts par les sous-étapes 10A à 10D.

## État / compte rendu

**Statut : Terminée — 10A, 10B, 10C et 10D validées**

- Décision de découpage : 2026-09-01.
- Motif : ressources 3D hétérogènes + multi-équipement + placement libre + physique + persistance dépassaient un objectif unique cohérent.
- État 10A : Terminée — PR #19, pipeline Blender/accessoires et catalogue GLB validés ; les trois ressources initialement mises en quarantaine ont ensuite été réintégrées en 10B après confirmation CC0.
- État 10B : Terminée — PR #20, boutique Lithons et propriété permanente validées sous RLS ; catalogue commercial final à quatre accessoires.
- État 10C : Terminée — PR #22, instances UUID multi-équipement, plafond 8, transforms locaux persistants, édition tactile et disposal GPU validés ; Preview Vercel unique `dpl_DWbf8L2nhQ3gayJgLLX9wfA33ftm` READY.
- État 10D : Terminée — PR #23, Rapier, collider statique du caillou, colliders simplifiés accessoires, gravité, anti-traversée, sommeil et persistance stabilisée idempotente. Workflow physique #9, CI #123, showroom #47, placement #21, adoption #52, caresse #46, nettoyage #41 et production accessoires #28 verts sur le commit fonctionnel `f62c9636aa7512d8b0ad0adcfc8d64e9faf72d5b`.
- Preview Vercel 10D unique : `dpl_AurhtjqxWiviSkP79Q2KMAT8dyzB`, READY, HTTP 200, aucune erreur runtime détectée. Le commit vide `2277f91e1fd92815bb92cf8cd99c16577936ced7` ne change pas l'arbre runtime validé.
- Validation physique téléphone/tablette : 390×844 et 1024×768, 2 GLB simultanés, gravité/collision/sommeil et sauvegarde finale PASS.
- Dette reportée en étape 12 : code-splitting/lazy-loading du moteur Rapier et réduction du chunk JS principal ; budget Workbox V1 porté explicitement à 4 MiB afin de conserver le précache.
- **Jalon 10 complet : terminé.**
- Étape suivante : 11 — Bio, statistiques et action Jeter.
