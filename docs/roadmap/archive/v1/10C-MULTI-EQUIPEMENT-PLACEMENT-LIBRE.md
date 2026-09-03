# Étape 10C — Multi-équipement et placement libre

## Prompt d'exécution

Tu travailles sur CAILLOU™ après 10A et 10B. Lis `docs/roadmap/00-INDEX-ROADMAP.md`, le jalon 10, les sous-étapes 10A/10B, ce fichier et les quatre documents normatifs. Inspecte le renderer R3F réel, les interactions tactiles existantes, le schéma Supabase et les assets accessoires avant d'agir.

### Objectif

Permettre à l'utilisateur d'équiper plusieurs accessoires simultanément sur son caillou et de les placer manuellement de façon précise, intuitive et persistante, sans encore dépendre de la simulation physique complète de 10D.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel recommandé pour validation tactile/mobile réelle après stabilisation.

### Principe de données

Le modèle actuel `equipped_accessories` basé sur `(user_rock_id, slot)` doit évoluer vers un modèle d'**instances équipées**. Chaque instance possède son propre identifiant et référence :

- `user_rock_id` ;
- `accessory_id` ;
- position locale au caillou ;
- rotation quaternion locale ;
- échelle uniforme ou explicitement bornée ;
- timestamps utiles.

La notion de `slot` ne doit plus empêcher plusieurs accessoires simultanés. Elle peut rester comme catégorie facultative si utile à l'UI.

### À réaliser

- Faire évoluer le schéma Supabase sans casser la propriété `user_accessories`.
- Autoriser plusieurs instances simultanées sur un même caillou.
- Définir une limite V1 raisonnable de nombre d'instances simultanées si les mesures mobile le nécessitent.
- Charger plusieurs GLB accessoires tout en conservant un seul GLB de caillou actif.
- Sélectionner précisément un accessoire par tap/clic.
- Passer clairement entre navigation de scène et édition d'accessoire.
- Pendant la manipulation, suspendre les contrôles caméra conflictuels.
- Implémenter translation manuelle 3D avec retour visuel clair.
- Implémenter rotation fine.
- Implémenter agrandissement/rétrécissement avec bornes `scale_min/scale_max` définies par asset ou catalogue.
- Prioriser une UX tactile fiable plutôt qu'une accumulation de gestes ambigus ; des commandes dédiées rotation/taille sont acceptables si elles améliorent téléphone/tablette.
- Enregistrer les transforms **dans l'espace local du caillou**, jamais en coordonnées monde.
- Restaurer exactement les transforms après reload/reconnexion.
- Permettre reprendre/modifier/supprimer une instance déjà placée.
- Vérifier qu'une transformation de caméra, auto-fit ou orientation de scène ne désolidarise jamais l'accessoire du caillou.

### Placement avant physique

10C doit fournir un placement robuste même sans gravité. Une stratégie de contrainte/raycast de surface peut être utilisée pour éviter les placements manifestement absurdes, mais l'anti-traversée physique autoritaire et la stabilisation au lâcher appartiennent à 10D.

Le contrat produit de 10C doit être compatible avec 10D : une instance peut être manipulée en mode cinématique, puis remise au moteur physique sans changer d'identité ou de modèle de données.

### Sécurité / RLS

- Un utilisateur ne peut lire/modifier/supprimer que les instances de ses propres cailloux actifs ou historiques selon les règles métier retenues.
- Impossible d'équiper un `accessory_id` non possédé par le compte.
- Le client ne peut pas associer une instance à un `user_rock_id` appartenant à un autre utilisateur.
- Les contraintes serveur doivent rester valides même si l'UI est contournée.

### Hors périmètre

- Gravité.
- Simulation dynamique.
- Friction/rebond.
- Déformation textile.
- Collisions accessoires entre eux complexes.

### Critères d'acceptation

- Plusieurs accessoires simultanés visibles et éditables.
- Aucun verrou artificiel « un accessoire par slot ».
- Translation, rotation et échelle fonctionnent sur tactile et desktop.
- Transforms locaux persistants et restaurés au reload.
- Un utilisateur ne peut équiper que ce qu'il possède.
- L'édition ne casse ni caresse, ni nettoyage, ni OrbitControls hors mode accessoire.
- Mémoire GPU correctement libérée lors ajout/retrait/navigation.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Faire une validation mobile réelle du placement avant de passer à la physique.

## État / compte rendu

**Statut : Terminée — PR #22, candidat final validé**

- Date : 2026-09-01.
- PR / candidat final : PR #22 `feat(accessories): livrer le placement libre multi-instance (10C)` ; candidat runtime et tests `76b038f9cfcbf3ca88252dfae8c8f9abbebde63a`.
- Migration multi-instance : `20260901201124_multi_instance_accessory_placement` remplace l'unicité historique `(user_rock_id, slot)` par des instances UUID dans `equipped_accessories`, avec `local_position`, `local_rotation`, `uniform_scale`, `equipped_at` et `updated_at`. `slot` reste une catégorie facultative et ne porte plus d'exclusivité.
- Idempotence : `20260901201220_extend_accessory_placement_mutation_receipts` étend le registre des mutations aux créations/retraits d'instances. `create_equipped_accessory` et `remove_equipped_accessory` sont rejouables sans duplication ; `update_equipped_accessory` met à jour le transform de l'instance possédée.
- Garde-fous serveur : caillou actif appartenant à `auth.uid()`, accessoire possédé dans `user_accessories`, position locale bornée, quaternion valide, échelle comprise entre `scale_min`/`scale_max`, plafond V1 de **8 instances simultanées**. Les écritures directes restent révoquées et la RLS isole les comptes.
- UX placement : mode Accessoire distinct de l'achat ; plusieurs GLB sont visibles simultanément autour d'un seul GLB de caillou. Tap/clic pour sélectionner, glisser dans le plan de vue pour déplacer, commandes dédiées X/Y/Z pour la précision et la profondeur, rotation fine et agrandissement/rétrécissement. `OrbitControls` est suspendu pendant l'édition afin d'éviter les gestes concurrents.
- Transform local : position `[x,y,z]`, rotation quaternion `[x,y,z,w]` et échelle uniforme sont toujours exprimées relativement au caillou. Les changements de caméra et l'auto-fit ne modifient donc pas la composition.
- Persistance : les transforms manuels de 10C sont autoritaires dans Supabase et sont restaurés exactement lors d'une réhydratation/reconnexion. 10D réutilisera le même modèle d'instance pour persister l'état **stabilisé par la physique**, sans migration d'identité.
- Mémoire GPU : chaque GLB accessoire possède son cycle explicite chargement/disposal ; géométries, matériaux et textures sont libérés lors d'un retrait ou d'une réhydratation. Le test navigateur final observe effectivement le disposal.
- Test SQL : contrat transactionnel réel validé puis rollback complet ; multi-instance de même catégorie, transform, 8e instance acceptée / 9e refusée, accessoire non possédé refusé, isolation utilisateur A/B, anon refusé, writes directs refusés et retries idempotents.
- GitHub final : les six workflows sont verts sur `76b038f9…` : CI #108 (`33557972723`), Multi-accessory placement #7 (`33557972685`), Adoption #38 (`33557972690`), Caresse/Lithon #32 (`33557972785`), Showroom WebGL #33 (`33557972688`) et Nettoyage #27 (`33557972696`). Lint, TypeScript strict, tests unitaires et build production passent.
- Validation téléphone/tablette : artifact `9820141281`, scénario PASS avec 2 GLB simultanés, translation/rotation/échelle tactiles sur 390 × 844, restauration exacte, déplacement en profondeur sur 1024 × 768, retrait d'une instance et disposal GPU. Rapport final : 5 sauvegardes, 3 disposals, 3 géométries libérées.
- Vercel Preview unique : branche `preview/10c-final`, commit de déclenchement sans différence de fichiers `127bfc2ac0cb1445421dca72c042f199ea9e6cfd`, même arbre que le candidat `76b038f9…`. Déploiement `dpl_DWbf8L2nhQ3gayJgLLX9wfA33ftm`, alias `caillou-git-preview-10c-final-christo5.vercel.app`, état `READY`, HTTP 200, aucune erreur/fatal runtime observée. Avertissements non bloquants déjà connus : Node 22 imposé par `package.json` et chunk Vite > 500 kB.
- Supabase Advisors : aucune nouvelle alerte sécurité liée à 10C ; seul avertissement Auth préexistant sur la protection contre les mots de passe compromis.
- Dette : collisions caillou/accessoires, anti-traversée, gravité, friction/rebond, stabilisation physique et reprise de contrôle cinématique restent exclusivement dans 10D.
- Étape suivante recommandée : **10D — Physique, collisions, gravité et persistance de l'état stabilisé**.
