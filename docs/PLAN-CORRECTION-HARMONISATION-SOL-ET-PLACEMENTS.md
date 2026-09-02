# CAILLOU™ — Plan de correction et d’harmonisation du sol et des placements

> **Nature du document :** plan technique autonome, hors roadmap.
>
> **Statut :** validé comme cible d’architecture, non exécuté.
>
> **Date d’analyse :** 2 septembre 2026.
>
> **État de référence :** `main` après la correction post-10.75, SHA `c8e3c34fd96857f4a608acb0d5b4536dbad5901a`.
>
> Ce document ne crée pas une nouvelle étape de roadmap et ne démarre pas l’étape 11. Il décrit une correction transversale destinée à assainir le Socle, la manipulation 3D et la persistance avant toute poursuite fonctionnelle.

---

## 1. Objectif

Le fonctionnement actuel du Placement résulte de plusieurs générations successives de code : placement historique des accessoires, manutention du caillou, unification 10.75, puis correctifs du sol.

Les fonctions ont progressivement convergé visuellement, mais l’architecture conserve encore plusieurs chemins concurrents et plusieurs définitions implicites du même concept.

L’objectif de cette correction est donc double :

1. **corriger définitivement le comportement du sol et du Placement ;**
2. **réduire le code en supprimant les couches historiques devenues redondantes.**

### Critère directeur

À l’issue de la correction, il doit exister :

- **un seul Socle physique et visuel ;**
- **une seule représentation de transformation pendant une session de Placement ;**
- **un seul contrôleur tactile ;**
- **une seule logique de contraintes spatiales ;**
- **un seul cycle de stabilisation Rapier ;**
- **une seule sémantique pour `Terminer` ;**
- **une seule manière dans le code de placer un objet sur le Socle.**

Le caillou et les accessoires ne doivent plus être deux implémentations différentes qui tentent de produire la même UX. Ils doivent devenir deux configurations d’un même moteur.

---

## 2. Décisions fonctionnelles immuables

Les règles suivantes constituent le contrat produit de cette correction.

### 2.1 Placement libre

Pendant le Placement manuel :

- le caillou peut traverser les accessoires ;
- un accessoire peut traverser le caillou ;
- les accessoires peuvent se traverser entre eux ;
- les collisions objet/objet ne doivent pas perturber le geste utilisateur ;
- la cible sélectionnée est pilotée directement par la main de l’utilisateur.

### 2.2 Le Socle est la seule frontière dure

Le carré gris représente une surface physique finie.

Aucune partie de la cible manipulée ne doit pouvoir :

- passer sous sa face supérieure ;
- sortir par son bord gauche ;
- sortir par son bord droit ;
- sortir par son bord avant ;
- sortir par son bord arrière.

Cette règle doit s’appliquer de manière identique au caillou et aux accessoires.

### 2.3 Rapier reprend le contrôle après validation

Pendant le geste : cible cinématique et contrôle direct.

À `Terminer` :

- la session passe en stabilisation ;
- Rapier retrouve gravité et collisions normales ;
- les éventuelles intersections créées volontairement par l’utilisateur sont résolues physiquement ;
- une éjection violente mais physiquement cohérente est acceptable ;
- seule la pose finale stabilisée est persistée.

### 2.4 Même grammaire tactile

Pour le caillou et les accessoires :

- **Position, un doigt :** déplacement dans le plan de vue ;
- **Position, deux doigts :** profondeur ;
- **Orientation, un doigt :** inclinaison libre ;
- **Orientation, deux doigts :** rotation autour de l’axe de vue.

Pour les accessoires uniquement :

- **Taille :** redimensionnement uniforme dans les limites du catalogue.

La Taille est une capability supplémentaire, pas un moteur de manipulation différent.

---

## 3. Bilan de l’architecture actuelle

### 3.1 Le « sol » est aujourd’hui fragmenté

Le système actuel mélange plusieurs représentations :

- constantes du Socle dans les règles de manutention du caillou ;
- `CuboidCollider` Rapier invisible ;
- `ContactShadows` donnant visuellement l’impression d’un carré gris ;
- contraintes de position propres au caillou ;
- contraintes de position propres aux accessoires ;
- correction verticale par boîte englobante ;
- validation serveur différente de la géométrie réellement affichée.

Le résultat est qu’un objet peut être conforme à une règle numérique tout en paraissant visuellement trop haut, trop bas ou hors du carré.

### 3.2 Le hard-floor actuel protège une boîte, pas l’objet réel

La correction actuelle repose sur une `Box3` et sur ses huit coins après rotation.

Ce mécanisme est volontairement conservateur, mais il ne représente pas la vraie surface du GLB : un coin de boîte vide peut se retrouver plus bas que la géométrie visible et provoquer un flottement apparent.

Pour un caillou irrégulier, une boîte englobante ne constitue donc pas une géométrie de contact acceptable.

### 3.3 Plusieurs limites spatiales coexistent

Le système actuel possède notamment :

- un carré de Socle d’environ 5,5 unités ;
- une limite X/Z du caillou plus petite ;
- une limite locale d’accessoire plus grande et exprimée dans le repère du caillou.

Ces règles ne décrivent pas le même espace et ne peuvent pas produire une frontière unique compréhensible par l’utilisateur.

### 3.4 Deux moteurs tactiles du caillou subsistent

Le code contient encore :

- l’ancien `RockGestureController` ;
- le nouveau `ManipulationController`.

Même si le premier n’est plus le chemin UX principal, sa présence maintient une seconde manière de calculer Position et Orientation.

Cette duplication doit disparaître.

### 3.5 Le geste accessoire repasse encore par le repère local

Pendant un geste accessoire, le moteur produit actuellement une pose monde, puis :

1. applique une contrainte ;
2. convertit monde → local du caillou ;
3. applique le clamp local historique ;
4. pousse cette valeur dans l’état React ;
5. reconvertit local → monde pour le rendu et Rapier.

Le caillou, lui, est manipulé directement en coordonnées monde.

La formule tactile peut donc être identique tout en donnant une sensation différente.

### 3.6 Deux machines de stabilisation existent

Le caillou possède sa logique dédiée dans `RockPhysicsBody`.

L’accessoire possède une autre logique dans `AccessoryModel`, avec notamment ses propres états de simulation, timeout, `onSleep`, hard-floor et persistance.

Ces deux machines réalisent pourtant le même travail conceptuel :

> prendre une pose cinématique, passer en dynamique, laisser Rapier stabiliser, récupérer une pose finale et persister.

### 3.7 `Terminer` n’a pas encore une sémantique universelle

Pour le caillou, `Terminer` lance explicitement une phase de stabilisation de composition.

Pour un accessoire, le panneau quitte actuellement le Placement et la physique est ensuite déclenchée indirectement par l’état de l’instance.

Le résultat produit deux cycles de vie différents pour une même action utilisateur.

### 3.8 Le format de stockage influence encore le moteur de manipulation

Les accessoires sont correctement persistés relativement au caillou.

Ce choix doit être conservé.

En revanche, cette représentation locale ne doit pas piloter la manipulation en temps réel.

**Format de manipulation et format de persistance doivent être séparés.**

---

## 4. Architecture cible

Le moteur cible doit suivre ce flux unique :

```text
Utilisateur
   │
   ▼
PlacementController
   │
   ▼
WorldTransform
   │
   ▼
PlacementConstraints
   │
   ▼
PlacementBody
   │
   ├── editing  → kinematic
   └── settling → dynamic / Rapier
   │
   ▼
Final WorldTransform
   │
   ▼
PersistenceAdapter
   │
   ├── rock      → persistance monde + composition
   └── accessory → conversion world → rock-local UNE FOIS
```

### Principe central

**Pendant toute la session de Placement, la vérité est exprimée en coordonnées monde.**

La conversion locale des accessoires ne se produit qu’au bord du système, au moment de sauvegarder ou de recharger une pose canonique.

---

## 5. Chantier A — Unifier définitivement le Socle

Créer une seule abstraction `PedestalFloor` ou équivalent.

Elle devient propriétaire de :

- la largeur ;
- la profondeur ;
- la face supérieure ;
- l’épaisseur ;
- le mesh gris visible ;
- le matériau ;
- le collider Rapier ;
- la définition de la zone autorisée X/Z.

### Résultat attendu

```text
sol visible
=
sol physique
=
frontière utilisée par Placement
```

`ContactShadows` ne doit plus représenter le sol. Il doit uniquement produire des ombres sur ou légèrement au-dessus du vrai mesh du Socle.

### Nettoyage associé

Les constantes du Socle ne doivent plus être rangées dans un module spécifique à la manutention du caillou.

Elles doivent rejoindre un module dédié au Socle / Placement.

---

## 6. Chantier B — Créer une géométrie commune de Placement

Remplacer la simple boîte AABB utilisée comme pseudo-géométrie de contact.

Au chargement d’un GLB, calculer une structure commune, par exemple :

```ts
interface PlacementGeometry {
  supportPoints: Vector3Like[]
  colliderBounds: BoundsLike
}
```

La forme exacte pourra être adaptée à Three.js/Rapier, mais elle doit permettre de connaître correctement l’emprise réelle de l’objet après rotation et échelle.

### Stratégie recommandée

Pour le contrôle du Socle :

- utiliser les sommets pertinents du mesh transformé ; ou
- générer une enveloppe convexe simplifiée ;
- éviter l’AABB comme vérité de contact ;
- partager le même algorithme pour caillou et accessoire.

### Fonction unique de contrainte

Créer une règle centrale de type :

```ts
constrainTransformToPedestal(
  transform,
  geometry,
  pedestal,
): PlacementTransform
```

Cette fonction doit traiter simultanément :

- Y minimum ;
- bord X minimum ;
- bord X maximum ;
- bord Z minimum ;
- bord Z maximum.

Elle remplace les clamps spatiaux spécifiques à chaque catégorie.

---

## 7. Chantier C — Une représentation universelle de transformation

Créer un type partagé :

```ts
interface PlacementTransform {
  position: [number, number, number]
  rotation: [number, number, number, number]
  scale: number
}
```

### Caillou

- `scale = 1` ;
- capability `scaleAllowed = false`.

### Accessoire

- scale modifiable ;
- borné par `scaleMin` / `scaleMax`.

### Règle

Pendant `editing` et `settling`, toutes les cibles utilisent `PlacementTransform` en coordonnées monde.

Aucune conversion monde/local ne doit être exécutée à chaque mouvement de doigt.

---

## 8. Chantier D — Un seul `PlacementController`

Le contrôleur tactile devient entièrement générique.

Entrées :

- cible ;
- outil ;
- transformation courante ;
- capabilities ;
- caméra ;
- définition du Socle.

Sortie :

- nouveau `PlacementTransform` monde contraint au Socle.

### Modes à supprimer à terme

Après migration complète, supprimer les chemins historiques devenus inutiles :

- `rock-position` ;
- `rock-orientation` ;
- ancien mode `accessory` de placement ;
- `RockGestureController` ;
- variables et branches `legacy*` associées.

Les modes de scène devraient tendre vers :

```text
orbit
caress
cleaning
placement
settling
```

Le détail Position / Orientation / Taille appartient à la session de Placement, pas au mode global de la scène.

---

## 9. Chantier E — Unifier le corps physique

Créer une abstraction commune, nom indicatif `PlacementBody`.

Elle reçoit :

- objet 3D ;
- `PlacementTransform` ;
- géométrie de Placement ;
- configuration physique ;
- état `fixed | editing | settling` ;
- callback de pose stabilisée.

### Comportement

#### Fixed

Objet immobile à sa pose canonique.

#### Editing

`RigidBody` cinématique.

La pose visuelle doit suivre immédiatement la transformation monde fournie par `PlacementController`.

#### Settling

`RigidBody` dynamique.

Rapier gère :

- gravité ;
- collisions ;
- résolution des intersections ;
- amortissement ;
- sommeil.

### Différences de cible = configuration uniquement

Exemples :

```text
rock
mass: 6
scaleAllowed: false

accessory
mass: catalogue
scaleAllowed: true/false selon contrat
```

Le type d’objet ne doit plus déterminer quel moteur physique est utilisé.

---

## 10. Chantier F — Unifier `Terminer` et le settlement

Définir une seule machine d’état :

```text
idle
  ↓
editing
  ↓ Terminer
settling
  ↓ Rapier stable
persisting
  ↓
idle/orbit
```

### Pour une cible accessoire

```text
Final WorldTransform
→ conversion world → rock-local
→ stabilize_equipped_accessory()
```

### Pour le caillou

Le déplacement du caillou entraîne l’ensemble de la composition.

```text
Final rock WorldTransform
+ final WorldTransform de chaque accessoire
→ conversion accessoires world → rock-local relativement au rock final
→ stabilize_rock_composition()
```

### Invariant

`Terminer` doit produire la même perception utilisateur :

1. la main lâche le contrôle ;
2. la physique prend le relais ;
3. la scène se stabilise ;
4. la sauvegarde est confirmée ;
5. retour à Orbit.

Aucune cible ne doit quitter visuellement Placement alors que sa stabilisation se déroule encore discrètement dans un autre composant.

---

## 11. Chantier G — Réaligner Supabase sans lui confier la géométrie 3D

### 11.1 Principe de stockage à conserver

Le modèle actuel reste pertinent :

- pose du caillou persistée en coordonnées monde ;
- pose des accessoires persistée relativement au caillou.

Cette représentation permet aux accessoires de suivre naturellement le caillou.

### 11.2 Ce qui doit changer

Les limites serveur `±2.4` et `±4` ne doivent plus constituer la géométrie réelle du Socle.

PostgreSQL ne doit pas tenter de déterminer si un GLB tourné ou redimensionné déborde physiquement du carré.

### 11.3 Rôle serveur cible

Supabase doit continuer à refuser :

- tableaux mal formés ;
- valeurs non numériques ;
- `NaN` / infinis ;
- coordonnées manifestement absurdes ;
- quaternion invalide ;
- scale hors catalogue ;
- cible non possédée ;
- mutations non autorisées ;
- incohérence de composition.

Les bornes numériques serveur doivent devenir une **enveloppe défensive large**, compatible avec toutes les poses légalement obtenues dans le Socle.

La contrainte géométrique précise du carré appartient au moteur Three.js/Rapier.

### 11.4 Migration

Une migration Supabase ne doit être créée qu’après calcul de l’enveloppe maximale réellement nécessaire au nouveau moteur.

Ne pas remplacer arbitrairement `±4` par une nouvelle constante choisie au hasard.

---

## 12. Nettoyage attendu

Cette correction doit réduire la quantité de logique concurrente.

À la fin du refactor, examiner explicitement la suppression ou l’absorption de :

- `RockGestureController` ;
- `legacyRockManipulationMode` ;
- `legacyAccessoryMode` ;
- `rock-position` ;
- `rock-orientation` ;
- ancien mode `accessory` ;
- `clampRockPosition()` comme règle géométrique spécifique ;
- `clampAccessoryPosition()` comme règle de Placement monde ;
- `clampWorldPositionAboveGround()` sous sa forme AABB actuelle ;
- `enforceHardFloor()` propre à `RockPhysicsBody` ;
- `enforceHardFloor()` propre à `AccessoryModel` ;
- machine `simulating` accessoire si elle devient couverte par le settlement commun ;
- `commitAccessoryDrafts()` si son rôle n’est plus nécessaire ;
- callbacks legacy de `AccessoryModel` conservés uniquement pour compatibilité historique ;
- tout calcul du Socle situé dans un module métier spécifique au caillou.

### Critère de revue

Toute logique conservée en double doit être explicitement justifiée dans la PR.

« Pour compatibilité historique » n’est pas une justification suffisante si le chemin n’est plus utilisé.

---

## 13. Frontière des responsabilités cible

| Module conceptuel | Responsabilité unique |
|---|---|
| `PedestalFloor` | visuel, dimensions et collider du Socle |
| `PlacementGeometry` | représentation géométrique d’une cible |
| `PlacementController` | interprétation des gestes utilisateur |
| `PlacementConstraints` | maintien intégral de la cible dans le Socle |
| `PlacementBody` | pose Three/Rapier et transition fixed/kinematic/dynamic |
| `PlacementSession` | cible, outil et cycle editing/settling/persisting |
| `PersistenceAdapter` | conversion du format monde vers le format serveur |
| `RockModel` | chargement et affichage du GLB caillou |
| `AccessoryModel` | chargement et affichage du GLB accessoire |

Les modèles visuels ne doivent plus être responsables de la logique complète de manipulation ou de stabilisation.

---

## 14. Ordre d’exécution recommandé

L’ordre est important afin de ne pas ajouter une couche temporaire supplémentaire.

### Phase 1 — Socle unique

- créer le vrai mesh gris ;
- lui associer le collider Rapier ;
- centraliser ses dimensions ;
- retirer au `ContactShadows` le rôle visuel de « sol ».

### Phase 2 — Géométrie commune

- créer `PlacementGeometry` ;
- produire cette géométrie pour caillou et accessoires ;
- écrire les règles de contraintes du rectangle complet ;
- tests unitaires purs des rotations, scales et quatre bords.

### Phase 3 — Transform monde universel

- introduire `PlacementTransform` ;
- maintenir les drafts de toutes les cibles en monde ;
- supprimer les conversions local/world pendant le geste accessoire.

### Phase 4 — Contrôleur unique

- brancher caillou et accessoire sur le même `PlacementController` ;
- vérifier l’identité de la grammaire tactile ;
- supprimer `RockGestureController` et les anciens modes.

### Phase 5 — Corps et settlement communs

- introduire `PlacementBody` / moteur physique commun ;
- migrer le caillou ;
- migrer les accessoires ;
- unifier `Terminer` ;
- supprimer les machines de settlement spécifiques devenues inutiles.

### Phase 6 — Persistance

- conserver les drafts en monde jusqu’à la fin ;
- convertir les accessoires en local une seule fois après stabilisation ;
- préserver l’atomicité de la composition lorsqu’un caillou est déplacé ;
- adapter les validations Supabase si l’enveloppe locale doit évoluer.

### Phase 7 — Nettoyage final

- supprimer les branches legacy ;
- supprimer fonctions/clamps morts ;
- simplifier les types et props ;
- rechercher les duplications résiduelles ;
- vérifier que les commentaires historiques ne décrivent plus des chemins inexistants.

Ne pas commencer la phase suivante tant que la précédente n’a pas une API stable et des tests verts.

---

## 15. Stratégie de tests

### 15.1 Tests unitaires de géométrie

Tester sans navigateur :

- objet non tourné posé au centre ;
- rotation arbitraire ;
- scale accessoire min/max ;
- contact Y ;
- contact bord gauche ;
- bord droit ;
- bord avant ;
- bord arrière ;
- objet plus volumineux proche d’un coin ;
- correction minimale sans déplacement parasite sur les axes non concernés.

### 15.2 Scénario comparatif navigateur

Le même helper de test doit être capable de manipuler indifféremment un caillou ou un accessoire.

#### Caillou

1. ouvrir Placement ;
2. sélectionner `rock-018` ;
3. déplacement gauche/droite ;
4. déplacement vertical ;
5. profondeur ;
6. Orientation ;
7. contact avec les quatre bords ;
8. contact avec le sol ;
9. `Terminer` ;
10. laisser Rapier stabiliser ;
11. vérifier visuellement et numériquement la pose ;
12. reload ;
13. vérifier la persistance.

#### Accessoire

Rejouer exactement la même séquence avec un accessoire représentatif.

La seule branche supplémentaire autorisée dans le helper est la Taille.

### 15.3 Tests de perception utilisateur

Les tests doivent contrôler ce que voit l’utilisateur, pas uniquement des coordonnées abstraites.

Échecs obligatoires si :

- l’objet flotte visiblement au-dessus du carré ;
- une partie visible traverse le carré ;
- une partie visible sort des quatre bords ;
- l’objet saute lors de sa sélection ;
- le mouvement accessoire ne suit pas immédiatement le geste ;
- la pose change au passage world/local pendant l’édition ;
- le bouton `Terminer` rend la main avant la fin réelle du settlement ;
- reload produit une pose différente de celle validée.

### 15.4 Plusieurs accessoires

Tester au minimum :

- deux instances identiques ;
- plusieurs accessoires différents ;
- intersection volontaire pendant le geste ;
- résolution Rapier après `Terminer` ;
- déplacement du caillou avec accessoires gelés ;
- settlement global puis persistance atomique.

### 15.5 Téléphone et tablette

Valider au minimum les viewport téléphone et tablette utilisés par les workflows existants.

Les gestes multi-touch doivent conserver le même sens et une sensibilité comparable pour toutes les cibles.

---

## 16. Contrôles Supabase

Avant toute migration :

- relire les signatures RPC ;
- calculer la plage maximale de positions locales possible avec le nouveau Socle ;
- vérifier les contraintes CHECK et fonctions privées existantes ;
- définir une enveloppe défensive cohérente.

Après migration éventuelle :

- tests transactionnels avec rollback ;
- RLS inchangées sauf nécessité démontrée ;
- idempotence des mutations conservée ;
- advisor sécurité ;
- advisor performance ;
- cohérence des migrations repo / production.

Aucune baisse de sécurité ne doit être utilisée pour faciliter le refactor.

---

## 17. GitHub / CI / Vercel

### GitHub

Réaliser la correction sur une branche dédiée avec PR.

La PR doit rendre très visible :

- code ajouté ;
- code supprimé ;
- anciens moteurs éliminés ;
- modules devenus uniques ;
- couverture QA comparative caillou/accessoire.

### CI

Conserver les validations historiques pertinentes, mais éviter d’ajouter des workflows redondants.

Le scénario Placement existant doit évoluer pour devenir le test comparatif de référence.

### Vercel

Respecter la contrainte projet de limitation des déploiements.

- ne pas multiplier les Preview pendant le refactor ;
- utiliser GitHub Actions pour les itérations courantes ;
- déclencher une seule Preview volontaire lorsque le candidat est réellement prêt ;
- smoke test réel ;
- contrôle runtime errors ;
- merge uniquement vert ;
- vérifier ensuite une seule Production correspondant exactement au SHA fusionné.

---

## 18. Hors périmètre

Cette correction ne doit pas :

- démarrer l’étape 11 ;
- ajouter de nouveaux accessoires ;
- modifier les prix de la Boutique ;
- modifier le permis de manutention ;
- augmenter la limite de huit accessoires sauf nécessité technique explicitement validée ;
- refaire le design général du Socle hors corrections nécessaires à l’unification ;
- introduire de nouvelles mécaniques de gameplay ;
- réécrire les documents historiques de roadmap pendant l’implémentation.

Les addenda documentaires post-correction seront traités séparément.

---

## 19. Critères d’acceptation finaux

La correction n’est terminée que si toutes les affirmations suivantes sont vraies.

### Sol

- [ ] Le carré gris visible est le même objet conceptuel que le sol Rapier.
- [ ] Le dessus visible du carré correspond exactement à la frontière Y physique.
- [ ] Le caillou touche visuellement le Socle sans flotter ni pénétrer.
- [ ] Les accessoires touchent visuellement le Socle sans flotter ni pénétrer.
- [ ] Les quatre bords du carré sont infranchissables pendant Placement.
- [ ] Les contraintes utilisent la géométrie réelle / enveloppe pertinente et non une simple AABB grossière.

### Placement

- [ ] Le caillou et les accessoires utilisent le même `PlacementController`.
- [ ] Position a exactement le même comportement pour toutes les cibles.
- [ ] Orientation a exactement le même comportement pour toutes les cibles.
- [ ] Taille est uniquement une capability supplémentaire de l’accessoire.
- [ ] Toutes les cibles sont manipulées en coordonnées monde.
- [ ] Aucun clamp local d’accessoire ne s’exécute pendant le geste.
- [ ] Aucun moteur historique concurrent ne reste actif.

### Physique

- [ ] Un seul mécanisme de transition editing → settling existe.
- [ ] `Terminer` a la même sémantique pour toutes les cibles.
- [ ] Rapier reprend collisions et gravité uniquement après validation.
- [ ] Les intersections objet/objet restent possibles pendant le geste.
- [ ] Les intersections sont physiquement résolues après `Terminer`.

### Persistance

- [ ] Le caillou est persisté en monde.
- [ ] Les accessoires sont convertis world → local une seule fois à la frontière de persistance.
- [ ] Le déplacement du caillou conserve la persistance atomique de la composition.
- [ ] Reload restitue exactement la composition stabilisée.
- [ ] Les validations Supabase sont défensives mais ne recadrent pas une pose légalement obtenue sur le Socle.

### Qualité de code

- [ ] `RockGestureController` est supprimé.
- [ ] Les anciens modes de placement spécifiques sont supprimés.
- [ ] Les hard-floor spécifiques rock/accessory sont remplacés par une règle commune.
- [ ] Les responsabilités `RockModel` et `AccessoryModel` sont principalement visuelles.
- [ ] Le nombre de chemins de code de Placement a diminué.
- [ ] Toute duplication restante est explicitement justifiée.

### QA

- [ ] Tests unitaires géométriques verts.
- [ ] Scénario comparatif caillou/accessoire vert.
- [ ] Plusieurs accessoires simultanés verts.
- [ ] Téléphone vert.
- [ ] Tablette verte.
- [ ] Une Preview Vercel finale réellement utilisée comme test utilisateur.
- [ ] Production issue du SHA fusionné vérifiée.

---

## 20. Définition de Done

Cette correction ne doit pas être considérée comme terminée simplement parce que « le caillou ne traverse plus le sol » ou que « l’accessoire semble mieux bouger ».

Elle est terminée lorsque l’architecture permet d’énoncer honnêtement :

> **CAILLOU™ possède un seul moteur de Placement. Le caillou et les accessoires sont des cibles différentes du même système. Le carré gris visible est l’unique Socle physique. La main de l’utilisateur contrôle une transformation monde, Rapier arbitre après validation, puis la persistance adapte uniquement le format de stockage.**

Le résultat attendu est donc à la fois fonctionnel et structurel : **moins de code concurrent, moins de règles dispersées, plus de cohérence et une UX strictement harmonisée.**
