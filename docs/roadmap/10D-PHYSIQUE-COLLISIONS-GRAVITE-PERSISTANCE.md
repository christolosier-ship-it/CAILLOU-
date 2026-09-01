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

**Statut : Terminée — PR #23 validée avant fusion**

- Date : 2026-09-01.
- PR : #23 `feat(accessories): livrer la physique et stabilisation (10D)`.
- Commit fonctionnel intégralement validé : `f62c9636aa7512d8b0ad0adcfc8d64e9faf72d5b`.
- Moteur physique : `@react-three/rapier` 2.2.0 / Rapier côté client, compatible React 19 et React Three Fiber 9.
- Gravité monde : `[0, -3.4, 0]`. Timeout de stabilisation de sécurité : 3,5 s. Clearance anti-contact manuel : 0,018.
- Collider caillou : corps fixe avec collider statique `trimesh` dérivé du mesh du caillou actif.
- Colliders accessoires : formes simplifiées ; `convexHull` pour Monocle, Nœud papillon et Lunettes rondes ; `cuboid` fixe pour Socle galerie.
- Paramètres dynamiques : masses/frictions/restitutions/dampings issus du catalogue reproductible 10A/10D ; gravityScale 0,90 / 0,86 / 0,88 pour les trois accessoires dynamiques ; CCD actif sur eux.
- Accessoire non dynamique : `pedestal-gallery`, `dynamic=false`, `gravityScale=0`, `ccd=false`.
- Manipulation : l'instance passe en mode cinématique pendant le drag ou les réglages fins X/Y/Z, rotation et taille ; Rapier reprend la résolution au lâcher pour les accessoires dynamiques.
- Anti-traversée : les cibles manuelles manifestement internes à la pierre sont repoussées avant résolution physique, puis Rapier assure la collision statique.
- Stabilisation : sommeil Rapier observé ; une pose dynamique est persistée seulement après stabilisation ou timeout de sécurité borné.
- Persistance : colonne `equipped_accessories.stabilized_at` et RPC idempotent `stabilize_equipped_accessory(..., event_key)`. Une pose manuelle intermédiaire conserve `stabilized_at = NULL`; une pose physique finale reçoit son horodatage.
- Reprise réseau : le client retente une sauvegarde finale retryable une fois avec le **même** `event_key`; si la confirmation reste impossible, le dernier état serveur connu est restauré au lieu d'afficher une fausse réussite.
- Compatibilité 10C : migration `backfill_accessory_stabilized_at` appliquée ; les 2 placements historiques présents lors de la migration ont été conservés comme déjà stabilisés afin de ne pas retomber au premier chargement 10D.
- Supabase : migrations live `stabilize_accessory_physics`, `deduplicate_accessory_lookup_index`, `backfill_accessory_stabilized_at`. Test SQL transactionnel/RLS 10D PASS avec rollback complet (`fixture_users_after_rollback=0`, `fixture_placements_after_rollback=0`).
- Sécurité Supabase : aucun nouveau lint RLS/fonction ; seul l'avertissement Auth préexistant `auth_leaked_password_protection` reste présent. Le doublon d'index `equipped_accessories(accessory_id)` a été supprimé.
- Pipeline accessoires : manifest Blender rendu autoritaire pour `dynamic`, `gravityScale`, `ccd` et collider ; run `Produce CAILLOU accessories` #28 vert et sorties catalogue/rapport reproductibles.
- Tests unitaires : 43/43 verts dans CI #123, y compris le contrat physique.
- Validation physique dédiée : workflow `Validate accessory physics and stabilization` #9 vert sur le commit fonctionnel final. Artifact `caillou-accessory-physics-33563696204` : `status=pass`, gravité Rapier=true, collision statique=true, corps endormi=true, `finalProbeY=-0.1011`, 2 GLB simultanés, édition tactile téléphone=true, tablette=true, 2 sauvegardes.
- Tests téléphone/tablette : captures réelles Chrome/Puppeteer aux viewports 390×844 et 1024×768 contrôlées ; l'éditeur, les deux instances, les commandes tactiles et l'état `Physique stabilisée.` restent utilisables.
- Régressions historiques : adoption #52, caresse #46, nettoyage #41, multi-accessoires #21 et showroom WebGL/responsive #47 verts sur le même commit.
- Preview Vercel unique : `dpl_AurhtjqxWiviSkP79Q2KMAT8dyzB`, alias `caillou-git-preview-10d-final-christo5.vercel.app`, READY, HTTP 200, aucune erreur runtime détectée. Le commit `2277f91e1fd92815bb92cf8cd99c16577936ced7` est un commit vide de déclenchement sur `preview/10d-final` et possède le même arbre runtime que `f62c9636…`.
- Performance / PWA : l'ajout Rapier porte le bundle principal à environ 3,68 MB brut / 1,24 MB gzip. Le budget Workbox est relevé explicitement à 4 MiB afin de conserver le précache V1. Le warning Vite de chunk >500 kB reste non bloquant.
- Dette : étudier en étape 12 un code-splitting/lazy-loading de Rapier et du renderer pour réduire le chunk principal ; ne pas modifier le contrat physique métier pour une optimisation de bundle.
- Étape suivante recommandée : 11 — Bio, statistiques et action Jeter.
