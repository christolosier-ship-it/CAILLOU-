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

**Statut : À faire**

- Date :
- PR / commit :
- Migration multi-instance :
- UX placement :
- Transform local :
- Persistance :
- Tests tactile/desktop :
- Performance :
- Dette :
- Étape suivante recommandée : 10D
