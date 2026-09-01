# CAILLOU™ - Cahier des charges produit V1

> **Statut : document de référence V1**  
> **Produit : CAILLOU™**  
> **Nature : compagnon minéral numérique persistant, contemplatif et absurdement sérieux**  
> **Principe directeur : faire très peu de choses, mais les faire avec un niveau de finition disproportionné.**

---

## 1. Objet du document

Ce document définit le périmètre fonctionnel, les règles produit, les parcours utilisateurs, l'économie, les interactions et les critères d'acceptation de **CAILLOU™ V1**.

Il constitue la source de vérité fonctionnelle de la V1. L'architecture technique et la persistance Supabase sont décrites dans `ARCHITECTURE-TECHNIQUE.md`. L'identité visuelle, le rendu 3D, les interactions tactiles et le ton éditorial sont décrits dans `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`. Le pipeline des assets 3D est décrit dans `WORKFLOW-3D-BLENDER-GITHUB.md`.

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
7. peut le manipuler, le caresser, le nettoyer, lui acheter des accessoires et, s'il le souhaite, le jeter.

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

L'utilisateur peut cependant choisir d'interagir avec lui. Ces interactions construisent un historique, des statistiques et une petite économie cosmétique.

### 2.2 Promesse

> **Enfin un compagnon qui ne te demande absolument rien.**

### 2.3 Proposition de valeur

CAILLOU™ doit procurer simultanément :

1. un plaisir visuel grâce à un vrai scan 3D traité comme un objet de collection ;
2. une interaction tactile satisfaisante ;
3. un humour sec né du sérieux excessif accordé à un simple caillou ;
4. un attachement léger créé par le choix, le nom et l'historique ;
5. une progression simple et non anxiogène ;
6. une personnalisation cosmétique par accessoires ;
7. le plaisir de constater que le caillou reste remarquablement caillou.

---

## 3. Principes produit non négociables

### P1 - Le caillou n'a besoin de rien

Caresser et nettoyer sont des actions volontaires de l'utilisateur. Leur absence ne provoque jamais de sanction.

Le nettoyage est cosmétique. Un caillou poussiéreux n'est ni malade, ni triste, ni moins performant.

### P2 - L'absence n'est jamais punie

Aucun streak, aucune récompense quotidienne obligatoire, aucune perte de monnaie et aucun message culpabilisant.

Formulation conforme :

> « Aucun changement préoccupant n'a été constaté durant votre absence. »

Formulation interdite :

> « Bernard vous a attendu pendant 34 jours. »

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

Le compte, le caillou actif, son historique, ses statistiques, les Lithons, les achats et les accessoires possédés sont persistés côté serveur dans Supabase.

Le stockage local peut accélérer l'interface ou permettre une reprise temporaire, mais **Supabase reste la source de vérité**.

### P8 - Les vingt cailloux sont égaux

Aucun spécimen n'est rare, légendaire, supérieur ou recommandé par algorithme.

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

Le pseudo est l'identité visible de l'utilisateur. Il n'existe pas de profil social public en V1.

### 5.2 Connexion

Un utilisateur existant peut se reconnecter avec :

- son pseudo ;
- son mot de passe.

Une session valide peut être conservée afin d'éviter une reconnexion à chaque ouverture.

### 5.3 Mot de passe perdu

La V1 n'impose pas de flux email puisqu'aucune adresse email n'est demandée. La stratégie de récupération devra être explicitement conçue avant publication publique si une récupération autonome devient obligatoire.

### 5.4 Après authentification

- compte sans caillou actif : ouverture du showroom d'adoption ;
- compte avec caillou actif : ouverture directe du Socle ;
- compte dont le dernier caillou a été jeté : écran vide avec proposition d'adopter un nouveau spécimen.

---

## 6. Catalogue des vingt spécimens

### 6.1 Catalogue V1

La V1 contient vingt véritables scans 3D :

```text
rock-001
rock-002
...
rock-020
```

Base validée :

- vingt meshes LOD2 ;
- environ 10 000 triangles par mesh ;
- UV présents ;
- texture couleur ;
- normal map ;
- textures source autour de 1024 x 1024 ;
- matériau web calibré individuellement.

### 6.2 Désignation avant adoption

Avant adoption :

```text
Spécimen 01
Spécimen 02
...
Spécimen 20
```

Après adoption, le nom choisi par l'utilisateur devient l'identité principale du caillou.

### 6.3 Description sérieuse obligatoire

Chaque spécimen possède une description dédiée, factuelle dans sa forme et absurdement institutionnelle dans son ton.

Exemple :

> « Masse minérale compacte présentant une silhouette asymétrique et une surface modérément irrégulière. Son centre de gravité relativement bas lui confère une aptitude particulièrement convaincante à rester exactement là où on le pose. »

Des attributs éditoriaux peuvent compléter la description :

- régularité de surface ;
- masse visuelle ;
- stabilité apparente ;
- orientation recommandée ;
- potentiel de déplacement spontané ;
- conformité générale.

Ces textes ne doivent pas inventer une classification géologique non vérifiée.

---

## 7. Premier parcours utilisateur

### Écran 1 - Authentification

Nouvel utilisateur :

```text
CAILLOU™

Pseudo
Mot de passe

Créer mon compte
```

Un accès « J'ai déjà un compte » permet la connexion.

### Écran 2 - Showroom 3D

Après création du compte, l'utilisateur arrive directement dans le showroom.

Règles :

- un seul caillou 3D actif à la fois ;
- navigation séquentielle `01 / 20` à `20 / 20` ;
- flèches gauche et droite toujours disponibles ;
- rotation du spécimen au doigt ou à la souris ;
- zoom borné si retenu ;
- même lumière et même fond pour les vingt candidats ;
- description sérieuse du spécimen visible ;
- CTA : **Adopter ce caillou** ;
- aucun score ou indice de rareté.

Le drag commencé sur le modèle sert à la rotation. La navigation par flèches reste la référence afin d'éviter les conflits gestuels.

### Écran 3 - Nommage

Après sélection :

- nom obligatoire ;
- longueur raisonnable ;
- validation explicite ;
- création du caillou utilisateur dans Supabase.

### Écran 4 - Entrée dans le jeu

Le caillou apparaît sur le Socle.

> « Votre caillou est prêt à ne rien faire à vos côtés. »

---

## 8. Écran principal - Le Socle

### 8.1 Rôle

Le Socle est l'écran principal et le cœur de CAILLOU™.

Il doit rester extrêmement sobre.

### 8.2 Composition

```text
┌──────────────────────────────┐
│ [Bio / Stats]           [ · ]│
│                              │
│                              │
│          CAILLOU 3D          │
│                              │
│                              │
│                              │
│ Caresser Nettoyer Accessoire │
│             Jeter            │
└──────────────────────────────┘
```

Le placement final des quatre commandes peut être adapté au responsive, mais elles constituent la barre d'action principale.

### 8.3 Manipulation libre

Hors mode spécifique :

- drag : rotation horizontale et verticale bornée ;
- pinch / molette : zoom borné ;
- inertie légère ;
- aucune rotation automatique permanente ;
- le caillou reste l'élément visuel dominant.

### 8.4 Bouton supérieur gauche

Ouvre **Bio / Stats**.

### 8.5 Bouton supérieur droit

Un emplacement visuel est réservé à une fonctionnalité future.

En V1 :

- il ne modifie aucun état produit ;
- aucune fonctionnalité métier n'y est attachée ;
- il doit rester graphiquement discret ;
- son implémentation ne doit pas bloquer l'évolution future de la navigation.

---

## 9. Action 1 - Caresser

### 9.1 Principe

Le bouton **Caresser** active un mode tactile dédié.

Une rotation normale du caillou ne doit jamais être confondue avec une caresse.

### 9.2 Caresse valide

Une caresse valide correspond à un mouvement continu réellement effectué sur la surface interactive du caillou, avec des seuils minimaux de durée et de déplacement définis techniquement.

Un simple tap ne constitue pas une caresse.

### 9.3 Récompense

**1 caresse valide = +1 Lithon.**

Aucun multiplicateur quotidien, aucune série et aucun bonus conditionné à une heure précise.

### 9.4 Persistance

Chaque caresse validée incrémente côté serveur :

- le nombre total de caresses du caillou ;
- le nombre total de Lithons gagnés ;
- le solde courant de Lithons ;
- les statistiques nécessaires à la bio.

L'attribution est idempotente afin qu'un même événement ne puisse pas être compté plusieurs fois par accident réseau.

### 9.5 Feedback

Feedback court et sobre :

> `+1 Lithon`

Une micro-variation lumineuse ou haptique peut accompagner la validation, sans animation arcade.

---

## 10. Les Lithons

### 10.1 Définition

Le **Lithon** est la monnaie fictive interne de CAILLOU™.

Il existe uniquement pour transformer les caresses en possibilité de personnalisation cosmétique.

### 10.2 Acquisition

En V1, les Lithons sont obtenus uniquement par les caresses validées.

Aucun Lithon n'est :

- vendu contre de l'argent réel ;
- gagné par publicité ;
- offert pour une connexion quotidienne ;
- retiré pour absence ;
- transférable entre comptes.

### 10.3 Dépense

Les Lithons servent uniquement à acheter des accessoires dans le catalogue CAILLOU™.

### 10.4 Source de vérité

Le solde affiché peut être optimiste pendant une interaction, mais le solde autoritaire est stocké dans Supabase.

Chaque gain et chaque dépense doit être traçable dans un historique transactionnel interne.

---

## 11. Action 2 - Nettoyer

### 11.1 Principe

Le bouton **Nettoyer** active un mode de nettoyage tactile.

La poussière est une couche visuelle progressive calculée à partir du dernier nettoyage connu.

### 11.2 Règles

- la poussière est purement cosmétique ;
- aucune pénalité ;
- aucune perte de Lithons ;
- aucune baisse de statistique ;
- aucun message culpabilisant ;
- le nettoyage ne rapporte aucun Lithon.

### 11.3 Interaction

Le doigt ou la souris retire progressivement la poussière sur les zones parcourues.

Lorsque le nettoyage est considéré comme terminé, l'application enregistre :

- `last_cleaned_at` ;
- le nombre total de nettoyages.

### 11.4 Ton

Exemples :

> « Surface remise dans un état réglementaire. »

> « Opération d'entretien minéral terminée. »

---

## 12. Action 3 - Accessoires

### 12.1 Principe

Le bouton **Accessoire** ouvre le catalogue d'accessoires.

### 12.2 Achat

Chaque accessoire possède :

- un identifiant stable ;
- un nom ;
- une description ;
- un prix en Lithons ;
- un asset visuel ;
- un état actif/inactif dans le catalogue.

L'achat :

1. reçoit uniquement l'identifiant stable et une clé d'événement, jamais un prix client ;
2. vérifie l'accessoire actif, son prix serveur et le solde autoritaire ;
3. sérialise les doubles taps concurrents sur le portefeuille ;
4. débite les Lithons ;
5. ajoute l'accessoire à l'inventaire permanent ;
6. écrit le mouvement dans le ledger ;
7. renvoie le nouveau solde et permet ensuite d'entrer dans le mode d'équipement.

La transaction est atomique et idempotente côté Supabase : un retry avec la même clé retourne le
même reçu sans second débit, et le contournement de l'UI ne permet ni achat sans solde ni double
propriété.

### 12.3 Propriété

Les accessoires achetés appartiennent au compte utilisateur, pas définitivement à un caillou particulier.

Ils peuvent être équipés sur le caillou actif. Jeter un caillou ne détruit donc pas les accessoires déjà achetés.

### 12.4 Direction produit

Les accessoires sont cosmétiques. Ils ne donnent :

- aucun bonus de gain ;
- aucun multiplicateur ;
- aucune statistique de puissance ;
- aucun avantage compétitif.

Le catalogue doit rester cohérent avec la direction CAILLOU™ : socles, coussins, plaques, vitrines, petits objets de présentation et absurdités sobres.

---

## 13. Action 4 - Jeter

### 13.1 Principe

Le bouton **Jeter** permet de se séparer du caillou actif.

### 13.2 Confirmation

Exemple :

> **Jeter Bernard ?**
>
> Cette opération mettra fin à une relation minérale jusque-là correctement documentée.

Actions :

- **Conserver Bernard** ;
- **Jeter Bernard**.

### 13.3 Résultat

Après confirmation :

- le caillou disparaît immédiatement ;
- aucune animation de lancer n'est jouée ;
- aucun effet dramatique ;
- `discarded_at` est enregistré ;
- le compte n'a plus de caillou actif ;
- les Lithons du compte sont conservés ;
- les accessoires possédés sont conservés ;
- l'historique du caillou est conservé.

Écran suivant :

> **Aucun caillou actuellement sous votre responsabilité.**

CTA : **Adopter un nouveau caillou**.

---

## 14. Bio et statistiques

### 14.1 Rôle

Le bouton en haut à gauche ouvre une fiche traitée comme un dossier institutionnel.

### 14.2 Informations minimales

- nom du caillou ;
- numéro de spécimen ;
- date d'adoption ;
- ancienneté ;
- nombre de caresses ;
- nombre de nettoyages ;
- Lithons générés par ce caillou ;
- temps cumulé de présence/observation si fiable ;
- accessoires actuellement équipés ;
- nombre d'interactions ;
- statut éditorial.

### 14.3 Statistiques absurdes

Exemples :

- déplacement spontané : `0 m` ;
- incidents diplomatiques : `0` ;
- aptitude à rester posé : `excellente` ;
- comportement rocheux : `99,8 %` ;
- initiatives recensées : `aucune`.

Ces données fantaisistes restent clairement humoristiques et ne prétendent pas constituer des mesures scientifiques.

---

## 15. Progression

La progression V1 repose exclusivement sur :

- historique de caresses ;
- Lithons gagnés ;
- Lithons dépensés ;
- accessoires possédés ;
- nettoyages ;
- ancienneté du caillou ;
- statistiques d'usage non anxiogènes.

Interdits :

- streak quotidien ;
- énergie ;
- faim ;
- niveau de bonheur ;
- dette d'entretien ;
- expiration des Lithons ;
- perte de monnaie à l'absence.

---

## 16. Données persistantes

Supabase doit conserver au minimum :

### Compte

- identifiant utilisateur ;
- pseudo unique ;
- dates de création et mise à jour.

### Cailloux utilisateur

- identifiant ;
- utilisateur propriétaire ;
- spécimen ;
- nom ;
- date d'adoption ;
- date de jet éventuelle ;
- statut actif ;
- dernier nettoyage.

### Progression

- caresses ;
- nettoyages ;
- interactions ;
- temps d'observation si retenu ;
- Lithons générés ;
- autres compteurs utiles à la bio.

### Économie

- solde de Lithons ;
- total gagné ;
- total dépensé ;
- journal transactionnel.

### Accessoires

- catalogue ;
- prix ;
- inventaire utilisateur ;
- équipement actuel.

---

## 17. PWA et continuité

L'application doit :

- être installable ;
- mettre en cache le shell et les ressources statiques essentielles ;
- charger les modèles 3D à la demande ;
- ne jamais précacher les vingt GLB au premier lancement ;
- conserver localement un cache non autoritaire pour une reprise rapide ;
- resynchroniser les mutations avec Supabase lorsque nécessaire.

Supabase reste l'état canonique pour toute progression et toute économie.

---

## 18. Hors périmètre V1

Sont exclus :

- réseau social ;
- amis ;
- messagerie ;
- classement ;
- échanges d'accessoires ;
- transfert de Lithons ;
- argent réel ;
- paiement ;
- publicité ;
- achat in-app ;
- NFT ou blockchain ;
- gacha ;
- loot boxes ;
- combats ;
- mini-jeux obligatoires ;
- IA générative ;
- chatbot ;
- géolocalisation ;
- réalité augmentée ;
- besoins vitaux ;
- mort ou maladie ;
- quêtes quotidiennes ;
- notifications culpabilisantes.

---

## 19. Critères de réussite V1

La V1 est considérée comme fonctionnellement réussie si :

1. un nouvel utilisateur crée un compte uniquement avec pseudo et mot de passe ;
2. il peut parcourir les vingt cailloux en 3D ;
3. chaque caillou possède une description sérieuse dédiée ;
4. il choisit un spécimen et lui donne un nom ;
5. cet état est retrouvé sur un autre lancement après authentification ;
6. le Socle affiche le caillou comme élément dominant ;
7. le caillou peut être tourné et zoomé sans conflit gestuel ;
8. le mode Caresser attribue exactement les Lithons attendus ;
9. le solde serveur ne peut pas devenir négatif ;
10. le nettoyage reste cosmétique ;
11. l'achat d'un accessoire est atomique et persistant ;
12. les accessoires achetés peuvent être équipés et retirés ;
13. Bio / Stats reflète les données Supabase ;
14. Jeter fait disparaître immédiatement le caillou après confirmation, sans animation ;
15. jeter conserve Lithons, inventaire et historique ;
16. aucune absence n'entraîne de sanction ;
17. les vingt modèles ne sont jamais simultanément actifs en mémoire GPU.

---

## 20. Définition de terminé pour V1.0

### Authentification

- [ ] création pseudo + mot de passe ;
- [ ] connexion ;
- [ ] persistance de session ;
- [ ] pseudo unique ;
- [ ] stratégie de récupération explicitement décidée avant publication publique.

### Adoption

- [ ] showroom 20 spécimens ;
- [ ] description dédiée des 20 ;
- [ ] rotation 3D ;
- [ ] navigation précédent/suivant ;
- [ ] un seul modèle actif ;
- [ ] adoption ;
- [ ] nommage ;
- [ ] persistance Supabase.

### Socle

- [ ] manipulation 3D ;
- [ ] Caresser ;
- [ ] Nettoyer ;
- [ ] Accessoires ;
- [ ] Jeter ;
- [ ] Bio / Stats ;
- [ ] emplacement supérieur droit réservé.

### Économie

- [ ] Lithons ;
- [ ] 1 caresse valide = 1 Lithon ;
- [ ] portefeuille serveur ;
- [ ] historique des mouvements ;
- [ ] achat atomique ;
- [ ] impossibilité de solde négatif ;
- [ ] aucune monnaie réelle.

### Backend

- [ ] Supabase Auth ;
- [ ] schéma Postgres versionné ;
- [ ] RLS ;
- [ ] fonctions transactionnelles ;
- [ ] tests de sécurité ;
- [ ] sauvegarde et reprise multi-session.

### Qualité

- [ ] responsive téléphone/tablette/desktop ;
- [ ] tests tactiles physiques ;
- [ ] reduced motion ;
- [ ] qualité graphique adaptative ;
- [ ] cache PWA ;
- [ ] aucun conflit rotation/caresse/nettoyage ;
- [ ] aucune fuite GPU après navigation répétée.

---

## 21. Règle finale

> **CAILLOU™ peut récompenser l'attention, mais ne doit jamais réclamer l'attention.**

Et son utilisateur doit toujours pouvoir constater, avec satisfaction, que la situation reste profondément minérale.
