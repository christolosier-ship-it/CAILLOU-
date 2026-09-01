# Étape 10A — Pipeline accessoires 3D et catalogue

## Prompt d'exécution

Tu travailles sur CAILLOU™ après les étapes 01 à 09. Lis `docs/roadmap/00-INDEX-ROADMAP.md`, `docs/roadmap/10-ACCESSOIRES-BOUTIQUE-LITHONS.md`, ce fichier et les quatre documents normatifs. Inspecte les ressources réelles dans `Ressource/`, le renderer, le pipeline Blender/GitHub Actions et le schéma Supabase avant d'agir.

### Objectif

Transformer les ressources d'accessoires hétérogènes déjà présentes dans le dépôt en un premier catalogue 3D web cohérent, traçable, performant et prêt pour les étapes boutique, placement et physique.

### Plugins

- GitHub obligatoire.
- Supabase recommandé pour vérifier le contrat `accessories`.
- Vercel non requis par défaut. Ne déclencher une Preview que si une validation web réelle apporte une valeur spécifique.

### Sources acceptées

Le pipeline doit pouvoir absorber selon disponibilité :

- `.blend` ;
- `.fbx` ;
- `.dae` ;
- `.obj` ;
- `.gltf/.glb` ;
- archives `.zip/.rar` si extractibles dans le pipeline ;
- textures PBR séparées.

Le format source n'est pas le format runtime. Le format runtime V1 reste le **GLB autonome**.

### Critères artistiques

- Rendu réaliste ou quasi photoréaliste cohérent avec les scans des cailloux.
- L'absurde vient de l'association avec le caillou, pas d'un style cartoon.
- Matériaux PBR physiquement crédibles.
- Éviter rendu plastique, couleurs mobile-game et géométrie volontairement facettée.
- Priorité à Base Color, Roughness et Normal ; Metallic/AO/Opacity selon matériau.

### À réaliser

- Inventorier tous les nouveaux assets et identifier mesh, textures, doublons et dépendances.
- Associer chaque groupe de fichiers à un accessoire stable.
- Vérifier provenance, auteur, source, licence et gratuité des ressources retenues.
- Importer/converter avec une version Blender de production explicitement maîtrisée.
- Reconstruire les matériaux compatibles glTF lorsque l'import ne les préserve pas correctement.
- Supprimer caméras, lumières, armatures ou meshes parasites non nécessaires.
- Vérifier UV, normales, orientation, dimensions et échelle relative.
- Définir un pivot utile pour manipulation/physique.
- Optimiser uniquement lorsque mesuré nécessaire : géométrie, textures, doublons.
- Cible texture runtime par défaut : 1K ; 2K seulement si le gain est visible.
- Produire des GLB autonomes dans `public/assets/accessories/`.
- Produire une preview standardisée par accessoire.
- Définir pour chaque asset une stratégie de collider simplifié : primitive, convex hull ou compound ; ne pas imposer le mesh visuel complexe comme collider dynamique.
- Alimenter/aligner le catalogue technique `accessories` sans encore implémenter l'achat.
- Prévoir des métadonnées utiles à 10C/10D : dimensions, scale min/max suggérée, masse/friction éventuelles, type de collider, compatibilité physique.

### Budgets de départ

- Favoriser quelques milliers à ~15k triangles par accessoire directement exploitable.
- Accepter plus lourd uniquement comme source si optimisation propre possible.
- GLB aussi léger que possible sans dégrader visiblement l'objet.
- Un matériau principal lorsque possible, sans en faire une règle destructrice.
- Aucun asset source lourd servi directement au navigateur.

### Validation

Pour chaque accessoire final :

- GLB ouvrable ;
- zéro dépendance externe cassée ;
- mesh attendu uniquement ;
- matériau glTF valide ;
- textures intégrées ou chemins autonomes maîtrisés ;
- bounding box cohérente ;
- pivot documenté ;
- poids connu ;
- triangles connus ;
- preview ;
- provenance/licence conservée ;
- collider prévu pour 10D.

### Hors périmètre

- Achat Lithons.
- UI Boutique complète.
- Placement utilisateur.
- Gravité runtime.
- Persistance d'équipement.

### Critères d'acceptation

- Un premier catalogue réel d'accessoires passe l'audit technique et artistique.
- Les formats hétérogènes sont convertis de manière reproductible.
- Chaque asset final peut être chargé individuellement dans Three.js/R3F.
- Aucun fichier source lourd n'est servi comme asset runtime.
- Provenance et licences sont documentées.
- Les informations nécessaires aux colliders de 10D sont connues.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Éviter les déploiements Vercel de convenance : privilégier CI/artifacts et ne faire une Preview que si nécessaire à la validation réelle.

## État / compte rendu

**Statut : À faire**

- Date :
- PR / commit :
- Assets retenus :
- Conversions :
- Optimisations :
- Licences/provenance :
- Colliders prévus :
- Tests :
- Dette :
- Étape suivante recommandée : 10B
