# V2-01 — Placement 2.0 & scène interactive

> **Statut : spécifiée — prête à exécuter après V2-00.**
>
> **Date de spécification : 4 septembre 2026.**
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

## 3. Décisions métier actées et non négociables

### 3.1 Caillou et accessoires sont des objets manipulables sous la même grammaire

Conceptuellement :

```text
ObjectTarget
├── rock
└── accessory
```

Les seules différences passent par des capacités :

```text
rock       position oui | rotation oui | scale non
accessory  position oui | rotation oui | scale oui selon catalogue
```

Il ne doit plus exister deux moteurs d'interaction concurrents selon la nature de la cible.

### 3.2 Ergonomie hybride

1. tap direct sur l'objet pour le sélectionner ;
2. fallback par sélecteur/listing lorsque le tap est difficile ou ambigu ;
3. une fois sélectionné, tout le canvas devient surface de contrôle ;
4. petite barre contextuelle avec seulement les outils réellement disponibles ;
5. sélection toujours visible et compréhensible.

### 3.3 Caméra comme cible de contrôle

Conceptuellement :

```text
PlacementControlTarget
├── camera
└── object
    ├── rock
    └── accessory
```

Quand `camera` est sélectionnée :

- glisser/orbite contrôle le point de vue ;
- pinch contrôle le zoom ;
- la session Placement reste ouverte ;
- aucun draft d'objet n'est perdu ;
- aucune stabilisation ni persistance n'est lancée ;
- le dernier objet manipulé peut être repris directement.

### 3.4 Collisions réelles pendant la manipulation

La règle V1 autorisant les interpénétrations volontaires est supprimée.

En V2 :

> **un objet manipulé ne traverse ni le caillou, ni un autre accessoire, ni le sol.**

Les colliders doivent suivre suffisamment finement la géométrie visible pour éviter l'effet d'objets qui flottent à distance.

Sont refusés comme solution finale :

- grosse sphère générique ;
- AABB/boîte surdimensionnée ;
- marge invisible perceptible à l'œil ;
- aimantation automatique qui éloigne artificiellement les objets.

La stratégie peut varier par géométrie : convex hull, compound collider, collision proxy dédié ou autre approche mesurée compatible mobile.

## 4. Objectif utilisateur

À la fin de V2-01, l'utilisateur doit pouvoir :

- entrer dans Placement ;
- taper un objet ou le choisir dans le sélecteur ;
- le déplacer et l'orienter avec la même logique qu'il s'agisse du caillou ou d'un accessoire ;
- redimensionner uniquement les accessoires qui l'autorisent ;
- sélectionner la caméra, tourner autour de la scène et zoomer sans quitter Placement ;
- reprendre immédiatement l'objet précédent ;
- faire venir un objet réellement au contact d'un autre sans espace artificiel ;
- ne pas pouvoir traverser un autre objet ou le sol ;
- annuler toute la session ;
- terminer la session, laisser Rapier arbitrer/stabiliser puis persister un état confirmé.

## 5. Périmètre précis

### Lot A — Architecture de scène

Refactorer `ShowroomScene` uniquement là où cela sert V2-01.

Cible conceptuelle possible, sans imposer les noms de fichiers :

```text
PedestalScene
├── CameraController
├── PlacementController
├── PhysicsWorld
├── RockModel
└── AccessoryModel
```

Le résultat doit séparer clairement :

- rendu ;
- contrôle caméra ;
- interprétation des gestes ;
- contraintes/collisions ;
- transition physique ;
- callbacks de persistance.

Ne pas déplacer un bloc de 500 lignes dans un nouveau fichier sans responsabilité autonome.

### Lot B — Modèle de cible unifié

Créer un contrat typé commun pour les objets manipulables et leurs capacités.

La sélection doit fonctionner par :

- tap/raycast direct ;
- sélecteur secondaire ;
- identité stable des accessoires ;
- distinction claire lorsque plusieurs objets sont proches.

### Lot C — Contrôle caméra en Placement

Rendre `camera` sélectionnable dans la même surface UX que les objets.

Exigences :

- caméra non physique ;
- aucun changement de draft lors du passage caméra ;
- conservation de `lastObjectTarget` ou mécanisme équivalent ;
- retour simple vers l'objet précédent ;
- aucune sortie de session implicite.

### Lot D — Collisions fines pendant le geste

Mettre en place une détection/résolution de collision pendant la manipulation cinématique.

Le contact doit être crédible visuellement. Le contrôle utilisateur ne doit pas provoquer :

- jitter bloquant ;
- téléportation ;
- gros recul invisible ;
- perte de cible ;
- tunnel à travers un objet lors d'un geste rapide.

Les contacts avec le sol restent durs et doivent tenir compte de l'enveloppe réelle de l'objet.

### Lot E — Session, annulation et finalisation

À l'entrée : snapshot canonique initial.

Pendant : draft local.

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

Aucun double-submit, aucun état « confirmé » sans réponse serveur.

### Lot F — Mesures physiques et tactiles

Mesurer au minimum :

- fluidité avec le plafond V1 actuel ;
- coût CPU/physique ;
- mémoire GPU ;
- latence des gestes ;
- qualité de contact ;
- comportement téléphone/tablette ;
- vitesse de sélection/raycast ;
- stabilité de Rapier au relâchement.

Ces mesures alimenteront V2-03 pour déterminer le plafond futur d'objets.

## 6. Hors périmètre explicite

V2-01 ne doit pas :

- changer la règle économique des accessoires ;
- transformer les fonctionnalités en entitlements par caillou ;
- migrer le Permis V1 ;
- ajouter un catalogue massif d'accessoires ;
- ajouter sols, peinture, personnalité, Journal ou Studio Photo ;
- ajouter des compositions multiples ;
- créer de nouvelle monnaie ;
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
- transform
- geometry/collider
- camera
- callbacks draft/end
```

## 8. Contrats frontend / 3D / physique

- React porte la cible sélectionnée et le mode de contrôle.
- Three.js/R3F portent rendu, raycast et caméra.
- Rapier porte les collisions/contacts et la stabilisation physique.
- Pendant un geste, l'utilisateur contrôle cinématiquement l'objet sans violer les obstacles.
- Au `Terminer`, Rapier reprend l'autorité avant persistance.
- Les scale limits accessoires restent celles du catalogue.
- Le caillou ne change pas d'échelle.
- Les objets au repos ne doivent pas maintenir une simulation coûteuse inutile.

## 9. Contrats Supabase

**Aucune migration n'est attendue par défaut en V2-01.**

Réutiliser les RPC et tables V1 existants pour la persistance finale.

Une migration n'est acceptable que si l'inspection réelle montre qu'une métadonnée minimale de collision est immédiatement indispensable. Si elle peut attendre V2-03, elle attend V2-03.

## 10. Migration / backfill / compatibilité V1

Aucune transformation des données V1 n'est attendue.

Les poses/transforms existants doivent charger exactement comme avant.

Une session ouverte à partir d'un ancien placement doit permettre `Annuler` sans altérer l'état initial.

## 11. RLS / RPC / idempotence / sécurité

- aucune relaxation RLS ;
- aucune nouvelle autorité client ;
- conserver les `event_key` des mutations existantes ;
- aucune persistance partielle présentée comme confirmée ;
- le Permis V1 continue à être vérifié selon le contrat serveur courant pour la manutention du caillou pendant cette étape.

## 12. Offline / PWA / réconciliation

- consultation dégradée conservée ;
- impossible d'entrer dans une nouvelle mutation nécessitant serveur si offline selon les capacités existantes ;
- si le réseau tombe pendant Placement, l'utilisateur doit pouvoir quitter/annuler sans être piégé ;
- une finalisation non confirmée ne devient jamais canonique localement ;
- la reprise réseau réutilise les mécanismes d'idempotence existants.

## 13. Performance et budgets

Conserver les garde-fous V2-00 :

- runtime 3D/physique lazy ;
- pas d'augmentation durable > environ 10 % du chunk 3D gzip sans mesure/justification ;
- absence de croissance GPU linéaire sur cycles ;
- pas de simulation Rapier permanente inutile au repos.

Pour les colliders, préférer la géométrie minimale qui donne un contact crédible. La précision parfaite n'est pas une excuse pour rendre l'application inutilisable sur tablette.

## 14. UX téléphone / tablette / desktop

Priorité : tactile.

À tester :

- téléphone portrait ;
- tablette portrait/paysage ;
- desktop souris ;
- gestes multi-touch ;
- sélection d'objets petits/proches ;
- passage objet → caméra → objet ;
- zoom caméra ;
- changement d'outil ;
- Annuler/Terminer accessibles sans masquer la scène.

La barre contextuelle doit rester compacte et ne pas recréer un panneau de cockpit.

## 15. Tests unitaires utiles

Ajouter uniquement les tests qui protègent des règles pures :

- capacités par type de cible ;
- transition camera/object ;
- conservation du dernier objet ;
- contraintes de transform ;
- logique d'annulation ;
- calculs de collision/proxy s'ils sont déterministes et testables sans WebGL.

## 16. Browser regression

Adapter la matrice existante, sans nouveau workflow.

Scénarios minimum :

- sélection directe du caillou ;
- sélection directe accessoire ;
- fallback sélecteur ;
- même grammaire Position/Rotation ;
- scale uniquement accessoire ;
- caméra sélectionnée pendant session ;
- caméra → objet sans perte de draft ;
- collision objet/caillou ;
- collision objet/accessoire ;
- contact visuel sans marge flagrante ;
- sol infranchissable ;
- geste rapide sans tunneling bloquant ;
- Annuler restaure ;
- Terminer stabilise/persiste ;
- reload conserve état ;
- non-régression caresse/nettoyage/Boutique/Bio/Jeter.

## 17. Discipline GitHub / Supabase / Vercel

### GitHub

- branche dédiée ;
- une PR principale ;
- commits par lots si utile ;
- `CI` + `Browser regression` seulement ;
- merge quand le SHA final est vert.

### Supabase

- audit au départ et à la fin ;
- aucun DDL réflexe ;
- advisors seulement si DDL réellement appliqué.

### Vercel

- pas de Preview à chaque commit ;
- une Preview finale est **recommandée** pour valider tactile/collisions sur environnement distant si CI verte ;
- après merge runtime, vérifier production/HTTP/runtime errors.

## 18. Critères d'acceptation

- [ ] caillou et accessoires utilisent un moteur de manipulation commun ;
- [ ] sélection directe par tap ;
- [ ] sélecteur fallback fonctionnel ;
- [ ] caméra sélectionnable sans quitter Placement ;
- [ ] retour vers le dernier objet sans perte de draft ;
- [ ] Position/Rotation communes ;
- [ ] Taille uniquement pour les accessoires autorisés ;
- [ ] collisions actives pendant manipulation ;
- [ ] aucun effet flottant visible dû à des colliders surdimensionnés ;
- [ ] sol infranchissable ;
- [ ] Annuler restaure tout le snapshot ;
- [ ] Terminer stabilise puis persiste ;
- [ ] anciens placements chargent sans perte ;
- [ ] offline/reconnexion cohérents ;
- [ ] `ShowroomScene` n'est plus le même nœud de responsabilités ;
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
- implémenter undo multi-niveaux complexe ;
- ajouter snapping/grille automatique non demandé ;
- ajouter gizmos 3D permanents encombrants si la barre contextuelle suffit ;
- exiger une précision de collision qui détruit les performances mobiles ;
- protéger les anciennes abstractions si elles empêchent le nouveau comportement produit.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter en fin d'étape :

- date ;
- branche / PR ;
- SHA candidat et SHA merge ;
- architecture finale de scène ;
- fichiers créés/supprimés/remplacés ;
- stratégie de sélection ;
- stratégie collider retenue par famille d'objet ;
- mesures téléphone/tablette/desktop ;
- migrations Supabase éventuelles et justification ;
- résultats `CI` / `Browser regression` ;
- Preview Vercel éventuelle et raison ;
- état production ;
- dettes reportées vers V2-02/V2-03.

**Ne pas démarrer V2-02 dans cette PR.**