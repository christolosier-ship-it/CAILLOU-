# CAILLOU™ - Cahier des charges produit V1

> **Statut : document de référence V1 courant, aligné après 10.75, PR #30 et PlacementSession PR #31**  
> **Produit : CAILLOU™**  
> **Nature : compagnon minéral numérique persistant, contemplatif et absurdement sérieux**  
> **Principe directeur : faire très peu de choses, mais les faire avec un niveau de finition disproportionné.**

---

## 1. Objet du document

Ce document définit le périmètre fonctionnel, les règles produit, les parcours utilisateurs, l'économie, les interactions et les critères d'acceptation de **CAILLOU™ V1**.

Il constitue la source de vérité fonctionnelle de la V1. L'architecture technique et la persistance Supabase sont décrites dans `ARCHITECTURE-TECHNIQUE.md`. L'identité visuelle, le rendu 3D, les interactions tactiles et le ton éditorial sont décrits dans `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`. Le pipeline des assets 3D est décrit dans `WORKFLOW-3D-BLENDER-GITHUB.md`.

Les fichiers de `docs/roadmap/` décrivent l'ordre d'exécution et conservent l'historique des étapes terminées. En cas d'évolution ultérieure, le présent document exprime la cible fonctionnelle courante sans réécrire cet historique.

---

## 2. Vision produit

### 2.1 Concept

CAILLOU™ est une application installable dans laquelle un utilisateur :

1. crée un compte avec un **pseudo** et un **mot de passe** ;
2. parcourt vingt véritables cailloux numérisés en 3D ;
3. consulte pour chacun une description traitée avec un sérieux volontairement disproportionné ;
4. choisit un spécimen ;
5. lui donne un nom ;
6. retrouve ensuite son caillou sur un écran principal extrêmement sobre ;
7. peut l'observer, le caresser, le nettoyer, acquérir des objets ou autorisations avec des Lithons, placer librement son caillou et ses accessoires, consulter son dossier et, s'il le souhaite, le jeter.

CAILLOU™ détourne les codes du compagnon virtuel. Le caillou ne possède aucun besoin vital et ne sanctionne jamais l'absence de l'utilisateur.

Il n'a :

- ni faim ;
- ni soif ;
- ni maladie ;
- ni fatigue ;
- ni humeur punitive ;
- ni jauge de bonheur ;
- ni série quotidienne ;
- ni obligation de connexion ;
- ni mort naturelle.

L'utilisateur peut cependant choisir d'interagir avec lui. Ces interactions construisent un historique, des statistiques et une petite économie volontairement sérieuse.

### 2.2 Promesse

> **Enfin un compagnon qui ne te demande absolument rien.**

### 2.3 Proposition de valeur

CAILLOU™ doit procurer simultanément :

1. un plaisir visuel grâce à un vrai scan 3D traité comme un objet de collection ;
2. une interaction tactile satisfaisante ;
3. un humour sec né du sérieux excessif accordé à un simple caillou ;
4. un attachement léger créé par le choix, le nom et l'historique ;
5. une progression simple et non anxiogène ;
6. une personnalisation cosmétique et quelques déblocages permanents en Lithons ;
7. une physique locale suffisamment crédible pour que le caillou et ses accessoires puissent tomber, glisser, rouler ou s'éjecter lorsque l'utilisateur les place de manière improbable ;
8. le plaisir de constater que le caillou reste remarquablement caillou.

---

## 3. Principes produit non négociables

### P1 - Le caillou n'a besoin de rien

Caresser et nettoyer sont des actions volontaires. Leur absence ne provoque jamais de sanction.

Le nettoyage est cosmétique. Un caillou poussiéreux n'est ni malade, ni triste, ni moins performant.

### P2 - L'absence n'est jamais punie

Aucun streak, aucune récompense quotidienne obligatoire, aucune perte de monnaie et aucun message culpabilisant.

### P3 - Le premium fait partie de la blague

Le rendu visuel doit être traité comme de la photographie produit ou une présentation muséale haut de gamme.

### P4 - L'humour reste sec

L'application ne cherche pas la punchline permanente. Le décalage entre le sujet et son traitement suffit.

### P5 - Une seule économie simple

La V1 contient une seule monnaie fictive : le **Lithon**.

- singulier : `1 Lithon` ;
- pluriel : `Lithons` ;
- aucune valeur monétaire réelle ;
- aucun achat de Lithons en euros ;
- aucun transfert entre utilisateurs ;
- aucune conversion ;
- aucun loot aléatoire ;
- aucune monnaie secondaire.

### P6 - Aucun dark pattern

Pas de publicité, pas de compte à rebours commercial, pas de gacha, pas de coffre, pas de rareté artificielle, pas de notification insistante.

### P7 - L'avancement est persistant

Le compte, le caillou actif, sa pose stabilisée, son historique, ses statistiques, les Lithons, les achats, les fonctionnalités débloquées, les accessoires possédés et les instances placées sont persistés côté serveur dans Supabase.

Le stockage local peut accélérer l'interface ou permettre une reprise temporaire, mais **Supabase reste la source de vérité**.

### P8 - Les vingt cailloux sont égaux

Aucun spécimen n'est rare, légendaire, supérieur ou recommandé par algorithme.

### P9 - Achat et placement sont deux responsabilités distinctes

La règle UX V1 est :

```text
Boutique = acquérir
Placement = manipuler
Rapier = arbitrer après validation
```

Une propriété commerciale ne doit pas être confondue avec une instance placée dans la scène.

### P10 - La main est libre, sauf face au sol

Pendant une manipulation explicite, l'utilisateur peut créer volontairement des intersections entre le caillou et les accessoires. Le système ne doit pas empêcher ce placement fin par un anti-chevauchement grossier.

La seule frontière infranchissable pendant le geste est le grand carré gris du Socle, qui constitue le sol physique de référence.

---

## 4. Plateformes cibles

Priorité V1 :

1. smartphone tactile ;
2. tablette tactile ;
3. ordinateur avec souris ou trackpad.

L'application est une PWA installable lorsque la plateforme le permet. Le mode portrait est prioritaire sur téléphone. Le paysage doit être réellement travaillé sur tablette.

---

## 5. Compte utilisateur

### 5.1 Inscription

Un nouvel utilisateur crée :

- un pseudo unique ;
- un mot de passe.

Aucune adresse email n'est demandée dans l'expérience V1.

### 5.2 Connexion

Un utilisateur existant peut se reconnecter avec son pseudo et son mot de passe. Une session valide peut être conservée.

### 5.3 Mot de passe perdu

La V1 n'impose pas de flux email puisqu'aucune adresse email n'est demandée. La stratégie de récupération devra être explicitement conçue avant publication publique si une récupération autonome devient obligatoire.

### 5.4 Après authentification

- compte sans caillou actif et sans historique : ouverture du showroom d'adoption ;
- compte avec caillou actif : ouverture directe du Socle ;
- compte dont le dernier caillou a été jeté : état vide avec proposition d'adopter un nouveau spécimen.

---

## 6. Catalogue des vingt spécimens

La V1 contient vingt véritables scans 3D : `rock-001` à `rock-020`.

Base validée :

- vingt meshes LOD2 ;
- environ 10 000 triangles par mesh ;
- UV présents ;
- texture couleur ;
- normal map ;
- textures source autour de 1024 x 1024 ;
- matériau web calibré individuellement.

Avant adoption, ils sont désignés `Spécimen 01` à `Spécimen 20`. Après adoption, le nom choisi par l'utilisateur devient l'identité principale.

Chaque spécimen possède une description sérieuse dédiée. Des attributs éditoriaux peuvent décrire régularité de surface, masse visuelle, stabilité apparente ou mobilité spontanée, sans inventer une classification géologique non vérifiée.

---

## 7. Premier parcours utilisateur

### Écran 1 - Authentification

Pseudo, mot de passe, création ou connexion. Aucun onboarding marketing en carrousel.

### Écran 2 - Showroom 3D

- un seul caillou 3D actif à la fois ;
- navigation séquentielle `01 / 20` à `20 / 20` ;
- flèches gauche/droite ;
- rotation du spécimen au doigt ou à la souris ;
- zoom borné si retenu ;
- même lumière et même fond pour les vingt candidats ;
- description sérieuse ;
- CTA **Adopter ce caillou** ;
- aucun score ou indice de rareté.

### Écran 3 - Nommage

Nom obligatoire, longueur raisonnable, validation explicite et création dans Supabase.

### Écran 4 - Entrée dans le jeu

Le caillou apparaît sur le Socle.

> « Votre caillou est prêt à ne rien faire à vos côtés. »

---

## 8. Écran principal - Le Socle

### 8.1 Rôle

Le Socle est l'écran principal et le cœur de CAILLOU™. Il reste extrêmement sobre.

### 8.2 Composition cible

```text
┌──────────────────────────────┐
│ [Bio / Stats]     [Placement]│
│                              │
│          CAILLOU 3D          │
│                              │
│                              │
│ Caresser Nettoyer Boutique   │
│             Jeter            │
└──────────────────────────────┘
```

Le responsive peut adapter la disposition sans modifier la hiérarchie fonctionnelle.

### 8.3 Observation normale

Hors mode spécifique :

- drag : rotation d'observation ;
- pinch / molette : zoom borné ;
- inertie légère ;
- aucune rotation automatique permanente ;
- aucune transformation persistante n'est produite par l'observation ;
- le caillou reste l'élément visuel dominant.

### 8.4 Bio / Stats

Le contrôle supérieur gauche ouvre le dossier institutionnel du caillou.

### 8.5 Placement

Le contrôle de Placement est l'unique entrée destinée à déplacer réellement le caillou ou ses accessoires.

Il ouvre un sélecteur de cible contenant :

- le caillou actif ;
- chaque instance accessoire déjà placée ;
- une entrée permettant d'ajouter une nouvelle instance d'un type d'accessoire déjà possédé.

Le caillou reste visible dans ce sélecteur sans permis, mais verrouillé avec accès vers la fiche du Permis de manutention minérale dans la Boutique.

---

## 9. Action - Caresser

Le bouton **Caresser** active un mode tactile dédié. Une rotation normale du caillou ne doit jamais être confondue avec une caresse.

Une caresse valide correspond à un mouvement continu sur la surface interactive avec des seuils techniques de durée et de déplacement. Un simple tap n'est pas une caresse.

**1 caresse valide = +1 Lithon.**

Chaque caresse validée incrémente côté serveur les compteurs pertinents et le portefeuille. L'attribution est idempotente.

Feedback : `+1 Lithon`, avec micro-variation visuelle ou haptique sobre.

---

## 10. Les Lithons

### 10.1 Définition

Le Lithon est la monnaie fictive interne de CAILLOU™. Il transforme l'attention volontaire en capacité d'acquisition cosmétique ou en déblocages permanents de fonctionnalités internes.

### 10.2 Acquisition

En V1, les Lithons sont obtenus uniquement par les caresses validées.

Aucun Lithon n'est vendu, gagné par publicité, offert pour une connexion quotidienne, retiré pour absence ou transférable entre comptes.

### 10.3 Dépense

Les Lithons peuvent servir à :

- acheter des accessoires du catalogue ;
- acheter des déblocages permanents inscrits dans le catalogue de fonctionnalités, comme le **Permis de manutention minérale à 1000 Lithons**.

Aucun produit acheté en Lithons ne doit créer un avantage compétitif ou un mécanisme de rétention anxiogène.

### 10.4 Source de vérité

Le solde autoritaire, les prix, les achats, les déblocages et le ledger sont gérés côté Supabase. Le client ne décide jamais du prix réellement débité.

---

## 11. Action - Nettoyer

Le bouton **Nettoyer** active un mode tactile dédié.

La poussière est purement cosmétique : aucune pénalité, aucune perte de Lithons, aucune baisse de statistique, aucun message culpabilisant et aucun Lithon gagné par nettoyage.

Lorsque le nettoyage est validé, l'application enregistre `last_cleaned_at` et le compteur de nettoyages.

---

## 12. Boutique unifiée

### 12.1 Principe

Le bouton **Boutique** ouvre la fenêtre commerciale unique de CAILLOU™.

La Boutique peut présenter plusieurs familles de produits tout en conservant leurs modèles backend spécialisés :

- **Accessoires** ;
- **Autorisations / services**.

La V1 ne duplique pas les parcours d'achat dans des fenêtres séparées par fonctionnalité.

### 12.2 Accessoires

Chaque accessoire possède :

- un identifiant stable ;
- un nom ;
- une description ;
- un prix serveur en Lithons ;
- un asset 3D et un aperçu ;
- un état actif/inactif ;
- des bornes d'échelle ;
- des paramètres physiques ;
- une provenance/licence.

L'achat débite atomiquement le portefeuille, enregistre la propriété permanente du type d'accessoire et écrit le ledger. Il est idempotent avec `event_key`.

### 12.3 Fonctionnalités payantes

Une fonctionnalité payante suit le même principe commercial sans être forcée dans la table des accessoires.

Le premier contrat V1 est :

```text
Permis de manutention minérale
Prix : 1000 Lithons
Achat : unique
Portée : permanente au compte
Effet : autorise le placement/manutention du caillou
```

L'achat passe par une opération serveur dédiée et apparaît comme `Acquis` après confirmation.

### 12.4 Propriété et placement

La Boutique confère une propriété ou un droit. Elle n'est pas le lieu principal de manipulation.

Un accessoire possédé peut ensuite créer plusieurs instances depuis **Placement**, dans la limite V1 de huit instances équipées par caillou.

Jeter un caillou ne détruit pas les accessoires possédés ni les déblocages permanents du compte.

---

## 13. Placement universel

### 13.1 Sélecteur de cible

Le mode Placement sélectionne d'abord une cible :

- le caillou ;
- une instance accessoire ;
- une nouvelle instance d'un accessoire déjà possédé.

Chaque instance doit être identifiable même lorsque plusieurs exemplaires d'un même type sont présents.

### 13.2 Grammaire commune

Une fois la cible choisie, le canvas entier sert de surface de manipulation.

**Position** :

- un doigt : translation dans le plan de vue ;
- deux doigts : profondeur.

**Orientation** :

- un doigt : orientation libre ;
- twist à deux doigts : rotation complémentaire autour de l'axe de vue.

**Taille** :

- disponible pour les accessoires via pinch dans les bornes du catalogue ;
- indisponible pour le caillou.

Les contrôles X/Y/Z peuvent exister comme réglage fin secondaire, jamais comme grammaire principale.

### 13.3 Liberté d'intersection

Pendant Placement :

- la cible est pilotée cinématiquement ;
- la gravité ne perturbe pas le geste ;
- les collisions avec le caillou et les autres accessoires ne bloquent pas le déplacement ;
- l'utilisateur peut volontairement créer des intersections profondes ;
- aucun snapping de surface ni anti-pénétration grossier ne doit retirer cette liberté.

### 13.4 Frontière infranchissable du carré gris

Le grand carré gris est le sol physique de référence et l'unique frontière spatiale dure pendant le placement manuel.

Ni le caillou ni un accessoire ne doivent pouvoir être déplacés à travers ou sous ce sol.

La contrainte est appliquée pendant le geste en tenant compte de l'enveloppe de la cible, et pas uniquement après coup par une collision Rapier.

### 13.5 Session multi-cibles, validation et physique

À l'ouverture de Placement, la composition est capturée en coordonnées monde dans un `PlacementSession`. Les accessoires persistés localement sont convertis local → monde une seule fois.

Pendant toute la session :

- chaque cible conserve son propre draft monde ;
- déplacer le caillou ne déplace pas les accessoires ;
- déplacer un accessoire ne modifie pas les autres objets ;
- changer de cible ne restaure jamais la pose persistée ;
- revenir sur une cible reprend exactement son dernier draft ;
- aucun mouvement ni changement de cible ne produit une écriture Supabase.

Au clic sur **Terminer**, c'est la session entière qui est validée :

- si le caillou a été modifié, Rapier stabilise globalement caillou + accessoires depuis leurs transforms monde de session, puis la composition est persistée atomiquement ;
- si seuls des accessoires ont été modifiés, le caillou et les accessoires non modifiés restent fixes, seuls les accessoires dirty sont stabilisés puis persistés ;
- si rien n'a été modifié, Placement se ferme sans écriture serveur ;
- gravité et collisions normales redeviennent actives uniquement pendant le settlement ;
- une intersection créée volontairement peut provoquer glissement, rotation ou éjection rapide.

La pose finale d'un accessoire est convertie monde → local uniquement à la frontière de persistance.

---

## 14. Action - Jeter

Le bouton **Jeter** permet de se séparer du caillou actif après confirmation explicite.

Après confirmation :

- disparition immédiate du rendu ;
- aucune animation de lancer ;
- `discarded_at` enregistré via l'opération serveur idempotente `discard_active_rock` ;
- aucun caillou actif ;
- portefeuille conservé ;
- accessoires possédés conservés ;
- déblocages permanents conservés ;
- caillou, progression et ledger conservés comme historique ;
- les instances `equipped_accessories` du caillou jeté sont déséquipées logiquement et retirées de la composition active ;
- cette suppression d'instances ne retire jamais la propriété `user_accessories` correspondante du compte.

Puis état vide : **Aucun caillou actuellement sous votre responsabilité.** et CTA **Adopter un nouveau caillou**.

---

## 15. Bio et statistiques

Le dossier Bio / Stats doit afficher des données fiables issues de Supabase et peut compléter celles-ci par des statistiques absurdes clairement éditoriales.

Informations minimales selon disponibilité :

- nom ;
- numéro de spécimen ;
- date d'adoption ;
- ancienneté ;
- caresses ;
- nettoyages ;
- Lithons générés par ce caillou ;
- solde actuel ;
- total de Lithons gagnés et dépensés au compte ;
- types d'accessoires possédés ;
- instances actuellement placées ;
- nombre de déblocages permanents ;
- Permis de manutention minérale acquis ou non ;
- temps d'observation uniquement s'il devient réellement instrumenté et fiable ;
- indicateurs éditoriaux absurdes clairement séparés des mesures métier.

À l'état actuel du backend, `observation_seconds` n'est alimenté par aucune mutation autoritaire : il est donc volontairement omis de l'interface.

Une donnée fantaisiste ne doit jamais être présentée comme une mesure scientifique réelle. Les indicateurs éditoriaux portent une mention explicite **non scientifiques**.

---

## 16. Progression

La progression V1 repose sur :

- historique de caresses ;
- Lithons gagnés et dépensés ;
- accessoires possédés ;
- fonctionnalités permanentes débloquées ;
- instances/accessoires actuellement placés ;
- nettoyages ;
- ancienneté du caillou ;
- statistiques d'usage non anxiogènes.

Interdits : streak quotidien, énergie, faim, bonheur, dette d'entretien, expiration des Lithons ou perte de monnaie à l'absence.

---

## 17. Données persistantes minimales

### Compte

- identifiant utilisateur ;
- pseudo unique ;
- dates de création/mise à jour.

### Cailloux utilisateur

- identifiant ;
- propriétaire ;
- spécimen ;
- nom ;
- adoption ;
- jet éventuel ;
- dernier nettoyage ;
- pose position ;
- pose rotation ;
- date de stabilisation de pose.

### Progression

- caresses ;
- nettoyages ;
- interactions ;
- temps d'observation uniquement si une instrumentation autoritaire est ajoutée ;
- Lithons générés ;
- compteurs Bio utiles.

### Économie

- solde ;
- total gagné ;
- total dépensé ;
- journal transactionnel ;
- motif et produit concerné lorsqu'il existe.

### Accessoires

- catalogue ;
- prix et métadonnées physiques ;
- propriété utilisateur ;
- instances équipées ;
- position locale ;
- rotation locale ;
- échelle ;
- état/date de stabilisation.

### Fonctionnalités payantes

- catalogue ;
- prix ;
- état actif ;
- déblocages permanents par compte ;
- prix payé et date de déblocage.

---

## 18. PWA et continuité

L'application doit être installable lorsque la plateforme le permet, mettre en cache le shell et les ressources essentielles, charger les modèles 3D à la demande et conserver un cache local non autoritaire pour une reprise rapide.

Les mutations économiques, les stabilisations physiques et Jeter ne doivent jamais être déclarés confirmés localement sans confirmation serveur. L'étape 12 formalise la réconciliation offline/reconnexion.

---

## 19. Hors périmètre V1

Sont exclus : réseau social, amis, messagerie, classement, échanges d'accessoires, transfert de Lithons, argent réel, paiement, publicité, NFT/blockchain, gacha, loot boxes, combats, mini-jeux obligatoires, IA générative, chatbot, géolocalisation, réalité augmentée, besoins vitaux, mort naturelle, quêtes quotidiennes et notifications culpabilisantes.

---

## 20. Critères de réussite V1

La V1 est considérée comme fonctionnellement réussie si :

1. un utilisateur crée un compte avec pseudo et mot de passe ;
2. il parcourt les vingt cailloux en 3D ;
3. chaque caillou possède une description sérieuse dédiée ;
4. il choisit un spécimen et le nomme ;
5. l'état est retrouvé après reconnexion ;
6. le Socle garde le caillou comme sujet principal ;
7. observation, caresse, nettoyage et placement ne se confondent pas ;
8. une caresse valide attribue exactement 1 Lithon côté serveur ;
9. le portefeuille ne peut devenir négatif ;
10. le nettoyage reste cosmétique ;
11. la Boutique centralise les achats d'accessoires et de fonctionnalités ;
12. l'achat d'un accessoire est atomique, persistant et distinct de ses instances ;
13. le Permis de manutention minérale coûte exactement 1000 Lithons et reste permanent au compte ;
14. un bouton Placement unique permet de choisir caillou ou accessoire ;
15. caillou et accessoires partagent une grammaire tactile Position / Orientation ;
16. la Taille n'est disponible que pour les accessoires ;
17. les intersections entre objets restent possibles pendant Placement ;
18. le carré gris ne peut jamais être franchi pendant la manipulation ;
19. Rapier reprend gravité et collisions à Terminer ;
20. les résultats stabilisés sont persistés et restaurés ;
21. Bio / Stats reflète la source Supabase ;
22. Jeter fait disparaître le caillou après confirmation tout en conservant portefeuille, propriétés et historique ;
23. aucune absence n'entraîne de sanction ;
24. les vingt modèles de cailloux ne sont jamais simultanément actifs en mémoire GPU.

---

## 21. Définition de terminé pour V1.0

### Authentification

- [ ] création pseudo + mot de passe ;
- [ ] connexion ;
- [ ] persistance de session ;
- [ ] pseudo unique ;
- [ ] stratégie de récupération explicitement décidée avant publication publique.

### Adoption

- [ ] showroom 20 spécimens ;
- [ ] descriptions dédiées ;
- [ ] navigation et rotation 3D ;
- [ ] un seul modèle actif ;
- [ ] adoption et nommage persistants.

### Socle

- [ ] observation 3D ;
- [ ] Caresser ;
- [ ] Nettoyer ;
- [ ] Boutique unifiée ;
- [ ] Placement unique ;
- [ ] sélection caillou / instances ;
- [ ] manipulation tactile commune ;
- [ ] sol gris infranchissable ;
- [ ] reprise Rapier après Terminer ;
- [ ] Jeter ;
- [ ] Bio / Stats.

### Économie

- [ ] Lithons ;
- [ ] 1 caresse valide = 1 Lithon ;
- [ ] portefeuille serveur ;
- [ ] ledger ;
- [ ] achats atomiques/idempotents ;
- [ ] accessoires persistants au compte ;
- [ ] fonctionnalités persistantes au compte ;
- [ ] permis 1000 Lithons ;
- [ ] aucune monnaie réelle.

### Backend

- [ ] Supabase Auth ;
- [ ] schéma Postgres versionné ;
- [ ] RLS ;
- [ ] fonctions transactionnelles ;
- [ ] pose du caillou persistante ;
- [ ] instances accessoires persistantes ;
- [ ] stabilisation atomique de composition ;
- [ ] tests de sécurité ;
- [ ] reprise multi-session.

### Qualité

- [ ] responsive téléphone/tablette/desktop ;
- [ ] tests tactiles réels ;
- [ ] reduced motion ;
- [ ] qualité graphique adaptative ;
- [ ] cache PWA ;
- [ ] aucun conflit Orbit/Caresser/Nettoyer/Placement ;
- [ ] intersections volontaires testées ;
- [ ] frontière du sol testée ;
- [ ] aucune fuite GPU après navigation répétée.

---

## 22. Règle finale

> **CAILLOU™ peut récompenser l'attention, mais ne doit jamais réclamer l'attention.**

Et son utilisateur doit toujours pouvoir constater, avec satisfaction, que la situation reste profondément minérale.
