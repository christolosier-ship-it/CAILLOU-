# Étape 10D — Physique, collisions, gravité et persistance

## Prompt d'exécution

Tu travailles sur CAILLOU™ après 10A, 10B et 10C. Lis `docs/roadmap/00-INDEX-ROADMAP.md`, le jalon 10, les sous-étapes 10A à 10C, ce fichier et les quatre documents normatifs. Inspecte le renderer R3F, les colliders préparés en 10A, les instances persistantes créées en 10C et les performances réelles téléphone/tablette avant d'agir.

### Objectif

Ajouter une physique crédible aux accessoires : collisions avec le caillou, anti-traversée, gravité et stabilisation au lâcher, tout en conservant une expérience tactile précise et une persistance déterministe du placement final.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire pour la persistance finale.
- Vercel recommandé pour une validation mobile réelle après stabilisation.

### Moteur physique

La cible recommandée est Rapier via l'intégration React Three Fiber adaptée à la stack réelle du projet, sous réserve de compatibilité vérifiée au moment de l'exécution.

La physique s'exécute côté client. Supabase ne simule pas les corps : il stocke seulement l'état final stabilisé.

### Architecture physique

- Le caillou est un corps fixe/statique.
- Son collider peut utiliser une représentation fidèle adaptée à une géométrie statique, sous réserve de performance mobile mesurée.
- Les accessoires dynamiques utilisent des colliders simplifiés préparés en 10A : primitives, convex hulls ou compounds.
- Ne pas utiliser par défaut les meshes visuels complexes comme colliders dynamiques.
- Pendant manipulation, l'accessoire est cinématique/contrôlé par l'utilisateur.
- Au lâcher, il peut devenir dynamique afin que gravité, friction et rotation résolvent sa pose.

### À réaliser

- Intégrer le moteur physique sans casser le renderer existant.
- Construire ou charger le collider du caillou actif.
- Associer chaque instance d'accessoire à son collider simplifié.
- Empêcher les pénétrations visibles pendant la manipulation.
- Gérer le passage cinématique → dynamique au lâcher.
- Ajouter gravité.
- Calibrer masse, friction, restitution, linear damping et angular damping par famille d'accessoire lorsque nécessaire.
- Permettre à un accessoire de tomber, pivoter ou glisser de façon crédible sur la pierre.
- Éviter les comportements instables, tremblements, tunneling ou explosions numériques.
- Détecter l'endormissement/stabilisation du corps.
- Lire le transform final stabilisé puis le convertir dans l'espace local du caillou.
- Persister ce transform dans Supabase sur l'instance correspondante.
- Au reload, restaurer directement le transform enregistré ; ne pas refaire tomber systématiquement tous les accessoires.
- Lors d'une nouvelle édition, reprendre l'instance en mode cinématique puis recalculer/sauvegarder son nouvel état après relâchement.
- Définir un comportement explicite pour les accessoires qui ne doivent pas être dynamiques, par exemple plaque, socle ou certains éléments de présentation.
- Tester la coexistence de plusieurs accessoires simultanés.

### Performance

Le projet utilise `frameloop="demand"` pour limiter le coût de rendu. Préserver autant que possible cette philosophie :

- simulation active uniquement lorsqu'une interaction ou un mouvement l'exige ;
- corps endormis lorsque stabilisés ;
- invalidation du renderer seulement lorsque nécessaire ;
- limiter le nombre de corps dynamiques simultanés si les mesures mobile l'imposent ;
- pas de simulation serveur ;
- pas de calcul physique permanent inutile en arrière-plan.

### Collisions entre accessoires

Les collisions accessoires ↔ caillou sont obligatoires.

Les collisions accessoires ↔ accessoires sont souhaitables si elles restent stables et performantes. Si elles compromettent la V1 mobile, documenter une simplification explicite plutôt que dégrader tout le système.

### Persistance et reprise réseau

- Le transform final est la donnée persistante autoritaire de présentation.
- Les sauvegardes doivent être tolérantes aux retries et ne pas créer de nouvelles instances par accident.
- Une perte réseau pendant la stabilisation ne doit pas corrompre l'instance.
- À la reconnexion, le client doit réconcilier proprement l'état local et l'état Supabase selon une règle documentée.
- Le futur cache PWA de l'étape 12 doit pouvoir restaurer le dernier état connu sans prétendre qu'une sauvegarde serveur a réussi si ce n'est pas le cas.

### Hors périmètre

- Soft-body réaliste.
- Cloth simulation temps réel.
- Destruction/casse.
- Physique serveur/multijoueur.
- Simulation continue lorsque l'utilisateur n'observe pas la scène.

### Critères d'acceptation

- Un accessoire manipulé ne traverse pas visiblement le caillou.
- Au lâcher, les accessoires compatibles réagissent à la gravité de façon crédible.
- Les corps se stabilisent sans jitter persistant.
- Plusieurs accessoires peuvent cohabiter.
- Le transform final est persisté et restauré exactement.
- Reload/reconnexion ne relancent pas inutilement une chute complète.
- Les performances téléphone/tablette restent acceptables.
- Les interactions existantes du caillou restent fonctionnelles hors mode accessoire.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Faire au moins une validation réelle téléphone/tablette avec plusieurs accessoires avant de considérer le jalon 10 terminé.

## État / compte rendu

**Statut : À faire**

- Date :
- PR / commit :
- Moteur physique :
- Collider caillou :
- Colliders accessoires :
- Gravité / paramètres :
- Persistance stabilisée :
- Tests multi-accessoires :
- Tests téléphone/tablette :
- Performance :
- Dette :
- Étape suivante recommandée : 11
