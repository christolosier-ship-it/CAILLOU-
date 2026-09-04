# V2-01 — Placement 2.0 & scène interactive

> **Statut : spécifiée — prête à exécuter après V2-00.**
>
> **Date de spécification : 4 septembre 2026.**
>
> **Spécification enrichie : 4 septembre 2026 — extensibilité objets / collisions / futurs adhésifs.**
>
> **Position : première étape produit réelle de la V2.0.**
>
> **Dépendances : V2-00 terminée.**
>
> Ce fichier est le **prompt autonome d'exécution** de V2-01. Après réalisation, il devient le compte rendu historique de l'étape. Il doit pouvoir être utilisé dans une nouvelle conversation sans dépendre d'un contexte implicite.

## 1. Prompt d'exécution

Tu travailles sur CAILLOU™ après V2-00. Commence par lire intégralement :

- `docs/roadmap/00-INDEX-ROADMAP.md` ;
- ce fichier ;
- `docs/roadmap/V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md` ;
- `ARCHITECTURE-TECHNIQUE.md` ;
- `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md` ;
- `WORKFLOW-3D-BLENDER-GITHUB.md` ;
- les fichiers actifs de `src/features/pedestal/`, `src/features/placement/`, `src/scene/` et les tests navigateur correspondants.

Inspecte le **dernier `main` réel** avant toute modification. Ne force jamais un ancien SHA simplement parce qu'il est cité dans ce document.

Plugins :

- **GitHub obligatoire** ;
- **Supabase obligatoire en lecture/audit**, modification uniquement si un besoin démontré apparaît ;
- **Vercel uniquement lorsqu'une Preview apporte une vraie validation tactile/visuelle**.

Travaille sur une branche dédiée et une PR principale V2-01. Réutilise `CI` et `Browser regression`. N'ajoute pas de workflow spécifique à l'étape.

Compte tenu de la sensibilité de cette étape, travailler **dans une seule PR mais lot par lot**. À la fin de chaque lot :

1. vérifier le comportement concerné ;
2. passer les contrôles utiles ;
3. produire un compte rendu court ;
4. s'arrêter avant le lot suivant tant que le propriétaire du projet ne l'a pas explicitement lancé.

Ne pas merger entre les lots. Ne pas démarrer V2-02 dans la PR V2-01.

## 2. Contexte réel du repo au moment de la spécification

V2-00 a livré :

```text
AuthenticatedHome
  -> PedestalScreen
      -> pedestalReducer / capacités
      -> Bio / Jeter / réseau
      -> Pedestal
          -> usePedestalCare
          -> usePedestalPlacement
          -> ShowroomScene
```

`Pedestal` n'est plus le god-component V1, mais `src/scene/ShowroomScene.tsx` reste le principal nœud de dette : rendu, caméra, gestes Placement, contraintes, Rapier et scène interactive y cohabitent encore.

Le dossier `src/features/placement/` contient déjà des briques valides à préserver autant que possible : session, géométrie, contraintes, politiques de gestes, physique, persistance et tests.

Le modèle serveur V1 reste encore actif pendant V2-01 : pose du caillou dans `user_rocks`, instances/transforms dans `equipped_accessories`, Permis V1 encore attaché au compte. **V2-01 ne change pas encore cette économie.**

Le moteur actuel sait déjà lire quelques paramètres physiques différents par accessoire (`dynamic`, masse, friction, restitution, gravité, CCD, type de collider), mais il suppose encore largement qu'un accessoire est un **corps libre** posé dans le monde.

V2-01 doit supprimer cette hypothèse implicite au niveau de l'architecture sans pour autant implémenter maintenant toutes les catégories d'objets futures.

## 3. Décisions métier actées et non négociables

### 3.1 Caillou et accessoires sont des objets manipulables sous la même grammaire

Conceptuellement :

```text
PlacementObject
├── rock
└── accessory
```

La nature `rock` / `accessory` décrit l'identité métier de la cible, **pas son moteur d'interaction**.

Les différences de manipulation passent par des capacités déclarées :

```text
rock       position oui | rotation oui | scale non
accessory  position oui | rotation oui | scale selon capacités/catalogue
```

Il ne doit plus exister deux moteurs d'interaction concurrents selon la nature de la cible.

### 3.2 Les capacités ne doivent plus être déduites uniquement du type d'objet

Le moteur ne doit pas coder des règles du genre :

```text
si accessory -> scale autorisé
si rock -> scale interdit
```

Il doit consommer des capacités explicites, par exemple :

```text
PlacementCapabilities
- canPosition
- canRotate
- canScale
```

Le caillou et les accessoires actuels sont adaptés à ce contrat.

L'architecture doit permettre ultérieurement d'ajouter d'autres capacités sans réécrire tout le contrôleur.

### 3.3 Profil de comportement extensible

Chaque objet manipulable doit pouvoir être décrit conceptuellement par :

```text
PlacementObject
- id stable
- kind métier
- transform
- capabilities
- placementBehavior
- collisionProfile
- physicsProfile
```

V2-01 n'implémente réellement qu'un comportement de placement principal de type libre :

```text
placementBehavior = free
```

Mais aucune couche centrale ne doit supposer que **tous les objets futurs seront toujours des corps libres**.

L'architecture doit laisser entrer plus tard des comportements tels que :

```text
surfaceAttached
constrained
fixedToHost
```

sans exiger de réécrire la scène, la sélection, la session et toute l'UI.

### 3.4 Aucun comportement codé par identifiant catalogue

Interdiction de créer des branches du type :

```text
if accessory.id == "googly-eye" ...
if accessory.id == "round-glasses" ...
```

Les différences de comportement passent par :

- capabilities ;
- placementBehavior ;
- collisionProfile ;
- physicsProfile ;
- métadonnées typées réellement nécessaires.

Un nouvel objet appartenant à une famille déjà supportée doit pouvoir fonctionner sans ajouter une condition spécifique à son ID.

### 3.5 Ergonomie hybride

1. tap direct sur l'objet pour le sélectionner ;
2. fallback par sélecteur/listing lorsque le tap est difficile ou ambigu ;
3. une fois sélectionné, tout le canvas devient surface de contrôle ;
4. petite barre contextuelle avec seulement les outils réellement disponibles ;
5. sélection toujours visible et compréhensible.

### 3.6 Caméra comme cible de contrôle

Conceptuellement :

```text
PlacementControlTarget
├── camera
└── object
```

Quand `camera` est sélectionnée :

- glisser/orbite contrôle le point de vue ;
- pinch contrôle le zoom ;
- la session Placement reste ouverte ;
- aucun draft d'objet n'est perdu ;
- aucune stabilisation ni persistance n'est lancée ;
- le dernier objet manipulé peut être repris directement.

La caméra est une cible de contrôle UX, **pas un objet physique**.

### 3.7 Collisions réelles pendant la manipulation

La règle V1 autorisant les interpénétrations volontaires est supprimée.

En V2 :

> **un objet manipulé ne traverse ni le caillou, ni un autre accessoire, ni le sol.**

Les colliders doivent suivre suffisamment finement la géométrie visible pour éviter l'effet d'objets qui flottent à distance.

Sont refusés comme solution finale :

- grosse sphère générique ;
- AABB/boîte surdimensionnée ;
- marge invisible perceptible à l'œil ;
- aimantation automatique qui éloigne artificiellement les objets ;
- utilisation de la hitbox tactile élargie comme collider physique.

La stratégie peut varier par géométrie : convex hull, compound collider, collision proxy dédié, primitive simple réellement adaptée ou autre approche mesurée compatible mobile.

### 3.8 Séparer rendu, sélection et collision

Trois responsabilités doivent être distinguées :

```text
RenderGeometry
SelectionGeometry
CollisionGeometry
```

- **RenderGeometry** : géométrie réellement affichée.
- **SelectionGeometry** : zone de tap/raycast, éventuellement volontairement plus tolérante pour le tactile.
- **CollisionGeometry** : enveloppe physique suffisamment fidèle pour produire un contact visuel crédible.

La sélection d'un petit objet peut être facilitée sans agrandir son collider.

Cette séparation est obligatoire pour préparer les objets très petits, fins ou concaves.

Une quatrième notion future peut exister sans être implémentée en V2-01 :

```text
AttachmentSurface / AttachmentAnchor
```

### 3.9 Préparer les futurs objets adhésifs sans les implémenter

Il est explicitement prévu que CAILLOU™ puisse accueillir plus tard des objets adhésifs, par exemple des googly eyes.

V2-01 **ne les implémente pas**, mais l'architecture ne doit pas fermer cette porte.

Hypothèses futures actées pour la première génération d'objets adhésifs :

1. un objet adhésif pourra être décollé et replacé ;
2. une fois attaché, il suivra rigidement son support ;
3. la première génération visera le caillou comme support principal ;
4. l'architecture ne doit pas interdire plus tard `accessoire -> accessoire` ;
5. l'orientation initiale pourra s'aligner automatiquement sur la normale de la surface ;
6. l'utilisateur pourra ensuite faire tourner l'objet autour de cette normale.

Concept futur :

```text
Attachment
- hostObjectId
- local anchor / local transform
- attachment mode
```

**Aucune table Supabase `attachments` et aucune persistance d'attachement ne sont demandées en V2-01.**

### 3.10 Objets futurs aux propriétés physiques différentes

L'architecture doit rester compatible avec des objets futurs pouvant être :

- dynamiques ;
- statiques ;
- lourds ;
- légers ;
- soumis ou non à la gravité ;
- avec friction/restitution différentes ;
- libres ou attachés ;
- redimensionnables ou non.

Il ne faut pas créer maintenant un moteur de jeu généraliste. Il faut seulement éviter les hypothèses qui rendraient ces évolutions coûteuses ou incohérentes.

## 4. Objectif utilisateur

À la fin de V2-01, l'utilisateur doit pouvoir :

- entrer dans Placement ;
- taper un objet ou le choisir dans le sélecteur ;
- le déplacer et l'orienter avec la même logique qu'il s'agisse du caillou ou d'un accessoire ;
- ne voir que les outils réellement autorisés par les capabilities de l'objet ;
- redimensionner uniquement les objets qui l'autorisent ;
- sélectionner la caméra, tourner autour de la scène et zoomer sans quitter Placement ;
- reprendre immédiatement l'objet précédent ;
- faire venir un objet réellement au contact d'un autre sans espace artificiel ;
- ne pas pouvoir traverser un autre objet ou le sol ;
- annuler toute la session ;
- terminer la session, laisser Rapier arbitrer/stabiliser puis persister un état confirmé.

Le résultat doit rester naturel sur téléphone et tablette, sans gizmos 3D envahissants.

## 5. Périmètre précis et lots d'exécution

### Lot A — Contrat générique de manipulation

Construire d'abord les fondations typées du Placement 2.0 sans chercher immédiatement à refaire toute l'UI.

Introduire ou faire émerger des contrats cohérents pour :

```text
PlacementControlTarget
PlacementObject
PlacementCapabilities
PlacementBehavior
CollisionProfile
PhysicsProfile
```

Adapter le caillou et les accessoires V1 à ces contrats.

Objectifs :

- supprimer les capacités déduites directement de `kind` lorsque ce n'est pas une règle métier réelle ;
- ne plus décider d'un outil uniquement parce que la cible est un `accessory` ;
- conserver les identités stables ;
- préparer `free` aujourd'hui et des comportements futurs sans les implémenter ;
- ajouter seulement les tests unitaires utiles sur les règles pures.

**Checkpoint obligatoire avant Lot B.**

### Lot B — Architecture de scène et responsabilités

Refactorer `ShowroomScene` uniquement là où cela sert V2-01.

Cible conceptuelle possible, sans imposer les noms de fichiers :

```text
PedestalScene
├── SceneCameraController
├── PlacementInteractionController
├── PlacementCollisionWorld
├── PhysicsWorld
├── RockObject
└── AccessoryObject
```

Le résultat doit séparer clairement :

- rendu ;
- contrôle caméra ;
- interprétation des gestes ;
- sélection/raycast ;
- contraintes/collisions ;
- transition physique ;
- callbacks de session/persistance.

Ne pas déplacer un bloc de 500 lignes dans un nouveau fichier sans responsabilité autonome.

Préserver les briques saines existantes lorsque leur contrat reste pertinent.

**Checkpoint obligatoire avant Lot C.**

### Lot C — Sélection directe, fallback et caméra

Mettre en œuvre l'ergonomie hybride :

- tap/raycast direct du caillou ;
- tap/raycast direct d'un accessoire ;
- sélecteur secondaire lorsque le tap est difficile ;
- distinction claire lorsque plusieurs objets sont proches ;
- caméra visible dans la même logique de sélection UX ;
- conservation de `lastObjectTarget` ou mécanisme équivalent.

Quand `camera` est active :

- Orbit/zoom actifs ;
- manipulation objet inactive ;
- draft intact.

Quand un objet est actif :

- contrôleur caméra inactif pour éviter les conflits gestuels ;
- tout le canvas manipule la cible.

La géométrie de sélection peut être plus tolérante que le collider physique.

**Checkpoint tactile obligatoire avant Lot D.**

### Lot D — Collisions fines et solveur cinématique

Mettre en place une détection/résolution de collision **pendant** la manipulation.

Le pipeline du geste devient conceptuellement :

```text
geste utilisateur
  -> transform désiré
  -> contraintes du Socle
  -> requête collision / sweep
  -> transform maximal valide
  -> draft affiché
```

Ne pas déplacer d'abord l'objet dans un état invalide pour demander ensuite à Rapier de le repousser brutalement.

#### Translation

Pour une translation rapide, utiliser une stratégie de sweep / shape cast / continuous query ou équivalent permettant d'arrêter l'objet au premier contact crédible.

Le moteur doit éviter le tunneling lors d'un geste rapide.

#### Rotation

Une rotation doit aussi être empêchée si la géométrie balaie un obstacle.

Une résolution progressive/bornée est acceptable : tester la rotation demandée puis retrouver le plus grand angle valide par subdivision courte ou méthode équivalente.

#### Scale

Lorsqu'un objet autorise le redimensionnement, il ne doit pas grandir à travers un autre objet ou le sol.

Limiter au plus grand scale valide dans ses limites autorisées.

#### Colliders

La stratégie doit pouvoir différer par objet/famille :

- primitive adaptée ;
- convex hull pour objet compact ;
- compound collider pour forme concave/trouée ;
- proxy préparé lorsque nécessaire.

Une convex hull automatique reste un fallback utile, pas une obligation universelle.

#### Debug développeur

Prévoir un moyen de debug non production ou activable uniquement en développement pour visualiser temporairement :

- render geometry ;
- collision proxy ;
- éventuellement contacts / enveloppes utiles.

Ce debug ne doit pas être visible dans l'expérience normale.

**Checkpoint visuel/physique obligatoire avant Lot E.**

### Lot E — Session, annulation, finalisation et autorité Rapier

À l'entrée : snapshot canonique initial.

Pendant : draft local multi-cibles.

Le passage objet A -> caméra -> objet B -> objet A doit conserver intégralement la session.

`Annuler` : restauration intégrale du snapshot initial, y compris après plusieurs changements d'objet/caméra.

`Terminer` :

```text
draft cinématique
  -> passage physique
  -> résolution/stabilisation Rapier
  -> état stabilisé
  -> persistance serveur existante
  -> confirmation canonique
```

Pendant le geste :

```text
Utilisateur = autorité de mouvement
CollisionSolver / Rapier queries = garde-fou
```

À `Terminer` :

```text
Rapier = autorité physique de stabilisation
```

Aucun double-submit, aucun état « confirmé » sans réponse serveur.

Si la persistance échoue, restaurer le dernier état canonique connu selon les mécanismes existants.

**Checkpoint obligatoire avant Lot F.**

### Lot F — Mesures physiques, tactiles et clôture

Mesurer au minimum :

- fluidité avec le plafond V1 actuel ;
- coût CPU/physique ;
- mémoire GPU ;
- latence des gestes ;
- coût des requêtes de collision / shape casts ;
- qualité de contact ;
- comportement téléphone/tablette ;
- vitesse de sélection/raycast ;
- comportement rotation/scale près d'un obstacle ;
- stabilité de Rapier au relâchement ;
- absence de fuite ou croissance GPU linéaire.

Tester au minimum :

```text
1 objet
4 objets
8 objets
```

Des paliers supérieurs peuvent être testés localement uniquement pour mesure, sans changer ici la règle métier du plafond.

Ces mesures alimenteront V2-03 pour déterminer le plafond futur d'objets et industrialiser le pipeline de colliders/proxies.

Le Lot F inclut la validation finale de la PR, la Preview Vercel uniquement si elle apporte une preuve tactile/visuelle réelle, puis la vérification post-merge si la PR est fusionnée.

## 6. Hors périmètre explicite

V2-01 ne doit pas :

- changer la règle économique des accessoires ;
- transformer les fonctionnalités en entitlements par caillou ;
- migrer le Permis V1 ;
- ajouter un catalogue massif d'accessoires ;
- ajouter sols, peinture, personnalité, Journal ou Studio Photo ;
- ajouter des compositions multiples ;
- créer de nouvelle monnaie ;
- implémenter réellement les googly eyes ;
- persister des attachments ;
- ajouter une table `attachments` spéculative ;
- implémenter joints/contraintes génériques pour des objets futurs non encore présents ;
- introduire un moteur de jeu généraliste ;
- ajouter une librairie d'état globale sans besoin démontré.

## 7. Architecture cible

Le Socle React V2-00 reste la source de vérité UI.

`usePedestalPlacement` reste l'orchestrateur métier de session tant qu'un découpage plus propre est justifié par V2-01.

La scène reçoit des contrats explicites et ne doit pas reconstruire l'état métier depuis le DOM.

Le moteur de manipulation doit tendre vers :

```text
ManipulationController
- controlTarget
- objectTarget éventuel
- capabilities
- placementBehavior
- transform
- collisionProfile
- physicsProfile
- camera
- callbacks draft/end
```

Le contrôleur générique ne doit pas connaître le nom commercial de l'objet.

Les stratégies spécifiques doivent être injectables/composables à partir du profil de l'objet, sans branchement par ID catalogue.

### 7.1 Frontière future des attachments

Sans les implémenter, l'architecture doit accepter qu'un futur objet puisse dépendre d'un support :

```text
free object
  -> transform monde
  -> physique libre

attached object futur
  -> hostObjectId
  -> transform local / anchor
  -> suit son host
```

Aucun schéma serveur d'attachement n'est exigé maintenant.

## 8. Contrats frontend / 3D / physique

- React porte la cible sélectionnée et le mode de contrôle.
- React porte les capabilities/profils nécessaires à l'UX.
- Three.js/R3F portent rendu, raycast et caméra.
- Rapier porte collisions/contacts, queries physiques et stabilisation.
- Pendant un geste, l'utilisateur contrôle cinématiquement l'objet sans violer les obstacles.
- Les collisions sont vérifiées avant publication du transform invalide lorsque possible.
- Au `Terminer`, Rapier reprend l'autorité avant persistance.
- Les scale limits restent celles du catalogue ou du profil applicable.
- Le caillou ne change pas d'échelle dans V2-01.
- Les objets au repos ne doivent pas maintenir une simulation coûteuse inutile.
- `SelectionGeometry` ne doit jamais agrandir artificiellement `CollisionGeometry`.
- les futurs comportements `surfaceAttached` ne sont pas implémentés mais ne doivent pas nécessiter de refaire le contrat central.

## 9. Contrats Supabase

**Aucune migration n'est attendue par défaut en V2-01.**

Réutiliser les RPC et tables V1 existants pour la persistance finale.

Le catalogue actuel dispose déjà de métadonnées physiques extensibles. V2-01 peut adapter le frontend à un profil typé dérivé de ces données sans ajouter immédiatement de nouveau schéma.

Une migration n'est acceptable que si l'inspection réelle montre qu'une métadonnée minimale de collision est immédiatement indispensable. Si elle peut attendre V2-03, elle attend V2-03.

Ne pas créer de colonne ou table pour les futurs adhésifs tant qu'aucun objet adhésif n'est réellement intégré.

## 10. Migration / backfill / compatibilité V1

Aucune transformation des données V1 n'est attendue.

Les poses/transforms existants doivent charger exactement comme avant.

Les accessoires V1 sont considérés comme des objets `free` lors de l'adaptation au nouveau moteur.

Une session ouverte à partir d'un ancien placement doit permettre `Annuler` sans altérer l'état initial.

## 11. RLS / RPC / idempotence / sécurité

- aucune relaxation RLS ;
- aucune nouvelle autorité client ;
- conserver les `event_key` des mutations existantes ;
- aucune persistance partielle présentée comme confirmée ;
- le Permis V1 continue à être vérifié selon le contrat serveur courant pour la manutention du caillou pendant cette étape ;
- aucune donnée client ne peut inventer un droit d'objet ou un comportement serveur non autorisé.

## 12. Offline / PWA / réconciliation

- consultation dégradée conservée ;
- impossible d'entrer dans une nouvelle mutation nécessitant serveur si offline selon les capacités existantes ;
- si le réseau tombe pendant Placement, l'utilisateur doit pouvoir quitter/annuler sans être piégé ;
- une finalisation non confirmée ne devient jamais canonique localement ;
- la reprise réseau réutilise les mécanismes d'idempotence existants.

Le fonctionnement offline ne doit pas forcer de persistance intermédiaire du draft.

## 13. Performance et budgets

Conserver les garde-fous V2-00 :

- runtime 3D/physique lazy ;
- pas d'augmentation durable > environ 10 % du chunk 3D gzip sans mesure/justification ;
- absence de croissance GPU linéaire sur cycles ;
- pas de simulation Rapier permanente inutile au repos.

Pour les colliders, préférer la géométrie minimale qui donne un contact crédible. La précision parfaite n'est pas une excuse pour rendre l'application inutilisable sur tablette.

La fréquence des shape casts / requêtes de collision doit être maîtrisée et mesurée. Éviter toute décomposition géométrique coûteuse recalculée à chaque frame si elle peut être préparée ou mémorisée.

Une collision proxy plus simple est préférable au mesh de rendu haute définition lorsqu'elle conserve un contact visuel crédible.

## 14. UX téléphone / tablette / desktop

Priorité : tactile.

À tester :

- téléphone portrait ;
- tablette portrait/paysage ;
- desktop souris ;
- gestes multi-touch ;
- sélection d'objets petits/proches ;
- hitbox de sélection confortable sans effet physique flottant ;
- passage objet -> caméra -> objet ;
- zoom caméra ;
- changement d'outil selon capabilities ;
- rotation près d'un obstacle ;
- scale près d'un obstacle ;
- Annuler/Terminer accessibles sans masquer la scène.

La barre contextuelle doit rester compacte et ne pas recréer un panneau de cockpit.

La sélection d'un futur petit adhésif doit rester possible grâce à `SelectionGeometry`, sans nécessiter un collider artificiellement énorme.

## 15. Tests unitaires utiles

Ajouter uniquement les tests qui protègent des règles pures :

- capabilities indépendantes de l'identité catalogue ;
- profil `free` des objets actuels ;
- impossibilité d'autoriser un outil absent des capabilities ;
- transition camera/object ;
- conservation du dernier objet ;
- contraintes de transform ;
- logique d'annulation ;
- séparation sélection/collision si elle comporte des règles pures ;
- résolution bornée translation/rotation/scale lorsque testable sans WebGL ;
- parsing des profils physiques/collision réellement utilisés.

## 16. Browser regression

Adapter la matrice existante, sans nouveau workflow.

Scénarios minimum :

- sélection directe du caillou ;
- sélection directe accessoire ;
- fallback sélecteur ;
- même grammaire Position/Rotation ;
- outils affichés selon capabilities ;
- scale absent pour le caillou ;
- caméra sélectionnée pendant session ;
- caméra -> objet sans perte de draft ;
- collision objet/caillou ;
- collision objet/accessoire ;
- contact visuel sans marge flagrante ;
- sélection tactile tolérante sans changer le contact physique ;
- sol infranchissable ;
- geste rapide sans tunneling bloquant ;
- rotation empêchée avant pénétration ;
- scale empêché avant pénétration ;
- Annuler restaure ;
- Terminer stabilise/persiste ;
- reload conserve état ;
- non-régression caresse/nettoyage/Boutique/Bio/Jeter.

Ne pas ajouter de faux test « googly eye » tant que l'objet n'existe pas réellement. Tester l'extensibilité au niveau des contrats purs, pas en inventant un asset runtime.

## 17. Discipline GitHub / Supabase / Vercel

### GitHub

- branche dédiée ;
- une PR principale V2-01 ;
- six lots A -> F dans cette même PR ;
- pause et compte rendu après chaque lot ;
- `CI` + `Browser regression` seulement ;
- ne pas merger entre les lots ;
- merge seulement après Lot F et SHA final vert.

### Supabase

- audit au départ et à la fin ;
- aucun DDL réflexe ;
- aucune table d'attachment spéculative ;
- advisors seulement si DDL réellement appliqué.

### Vercel

- pas de Preview à chaque lot ;
- une Preview finale est **recommandée** pour valider tactile/collisions sur environnement distant si CI verte ;
- n'utiliser une Preview intermédiaire que si un problème visuel/tactile ne peut réellement pas être validé autrement ;
- après merge runtime, vérifier production/HTTP/runtime errors.

## 18. Critères d'acceptation

### Architecture / extensibilité

- [ ] caillou et accessoires utilisent un moteur de manipulation commun ;
- [ ] capabilities explicites indépendantes du simple `kind` ;
- [ ] profil de placement explicite pour les objets actuels ;
- [ ] aucun comportement codé par ID catalogue ;
- [ ] architecture compatible avec un futur `surfaceAttached` sans l'implémenter ;
- [ ] aucune table/colonne d'attachment spéculative créée ;
- [ ] RenderGeometry, SelectionGeometry et CollisionGeometry sont conceptuellement séparées ;
- [ ] la zone de sélection tactile n'agrandit pas le collider physique.

### UX

- [ ] sélection directe par tap ;
- [ ] sélecteur fallback fonctionnel ;
- [ ] caméra sélectionnable sans quitter Placement ;
- [ ] retour vers le dernier objet sans perte de draft ;
- [ ] Position/Rotation communes ;
- [ ] outils affichés selon capabilities ;
- [ ] Taille uniquement pour les objets autorisés.

### Physique

- [ ] collisions actives pendant manipulation ;
- [ ] translation bornée avant pénétration ;
- [ ] rotation bornée avant pénétration ;
- [ ] scale borné avant pénétration lorsque applicable ;
- [ ] aucun effet flottant visible dû à des colliders surdimensionnés ;
- [ ] sol infranchissable ;
- [ ] gestes rapides sans tunneling bloquant ;
- [ ] stratégie collider adaptée aux formes actuelles ;
- [ ] debug collider disponible en développement si utile et absent de l'UX normale.

### Session / persistance

- [ ] Annuler restaure tout le snapshot ;
- [ ] objet -> caméra -> autre objet ne perd aucun draft ;
- [ ] Terminer stabilise puis persiste ;
- [ ] anciens placements chargent sans perte ;
- [ ] offline/reconnexion cohérents.

### Qualité

- [ ] `ShowroomScene` n'est plus le même nœud de responsabilités ;
- [ ] coûts physiques/queries mesurés ;
- [ ] mesures 1 / 4 / 8 objets réalisées ;
- [ ] CI verte ;
- [ ] Browser regression verte ;
- [ ] Preview finale validée si utilisée ;
- [ ] production vérifiée après merge.

## 19. Interdictions anti-scope-creep

Ne pas :

- traiter V2-02 ;
- modifier l'économie ;
- ajouter de nouveaux biens payants ;
- inventer un nouveau format de composition ;
- implémenter réellement les googly eyes ;
- créer une table `attachments` ;
- construire un système générique de joints/contraintes pour des besoins hypothétiques ;
- implémenter undo multi-niveaux complexe ;
- ajouter snapping/grille automatique non demandé ;
- ajouter gizmos 3D permanents encombrants si la barre contextuelle suffit ;
- exiger une précision de collision qui détruit les performances mobiles ;
- utiliser la zone tactile comme collider ;
- coder un comportement par nom ou ID d'accessoire ;
- protéger les anciennes abstractions si elles empêchent le nouveau comportement produit.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

### Discipline de compte rendu par lot

Après chaque lot, compléter temporairement ou commenter dans la PR :

- lot terminé ;
- fichiers/contrats principaux touchés ;
- comportement validé ;
- tests/CI pertinents ;
- dette ou risque reporté ;
- confirmation explicite que le lot suivant n'a pas commencé.

### Compte rendu final à compléter en fin d'étape

- date ;
- branche / PR ;
- SHA candidat et SHA merge ;
- architecture finale de scène ;
- contrats `PlacementObject` / capabilities / behavior retenus ;
- fichiers créés/supprimés/remplacés ;
- stratégie de sélection ;
- stratégie collider retenue par famille d'objet ;
- stratégie de résolution translation/rotation/scale ;
- préparation réelle laissée pour les futurs objets adhésifs ;
- mesures téléphone/tablette/desktop ;
- mesures 1 / 4 / 8 objets ;
- migrations Supabase éventuelles et justification ;
- résultats `CI` / `Browser regression` ;
- Preview Vercel éventuelle et raison ;
- état production ;
- dettes reportées vers V2-02/V2-03.

**Ne pas démarrer V2-02 dans cette PR.**