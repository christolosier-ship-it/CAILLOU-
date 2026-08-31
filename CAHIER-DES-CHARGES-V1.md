# CAILLOU™ — Cahier des charges produit V1

> **Statut : document de référence V1**  
> **Produit : CAILLOU™**  
> **Nature : compagnon minéral numérique contemplatif**  
> **Principe directeur : faire très peu de choses, mais les faire avec un niveau de finition disproportionné.**

---

## 1. Objet du document

Ce document définit le périmètre fonctionnel, les règles produit, les parcours utilisateurs, les contenus et les critères d’acceptation de **CAILLOU™ V1**.

Il constitue la référence pour toute décision fonctionnelle concernant la V1. Lorsqu’une idée, une fonctionnalité ou une optimisation entre en conflit avec ce document, la priorité va au principe fondateur du produit : **CAILLOU™ est un compagnon numérique sans besoins, sans pression et sans objectif obligatoire**.

L’architecture technique est décrite dans `ARCHITECTURE-TECHNIQUE.md`. L’identité visuelle, le rendu 3D, le mouvement, le son et le ton éditorial sont décrits dans `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`.

---

## 2. Vision produit

### 2.1 Concept

CAILLOU™ est une application installable dans laquelle l’utilisateur choisit puis adopte un véritable caillou numérisé en 3D, lui donne un nom, le contemple, le manipule légèrement, change son environnement et consulte des informations volontairement disproportionnées sur sa remarquable stabilité minérale.

Le produit détourne les codes du compagnon virtuel en supprimant précisément ce qui crée de la contrainte :

- aucun besoin vital ;
- aucune faim ;
- aucune maladie ;
- aucune fatigue ;
- aucune mort ;
- aucun abandon ;
- aucune punition liée à l’absence ;
- aucune série à maintenir ;
- aucune obligation quotidienne.

Le caillou reste parfaitement caillou, que l’utilisateur revienne cinq minutes ou six mois plus tard.

### 2.2 Promesse

> **Enfin un compagnon qui ne te demande absolument rien.**

### 2.3 Proposition de valeur

CAILLOU™ doit simultanément procurer :

1. **un plaisir visuel** grâce à un objet 3D premium issu d’un vrai scan ;
2. **une respiration** grâce à une expérience calme et sans enjeu ;
3. **un humour de décalage** né du sérieux avec lequel l’application traite un caillou ;
4. **un attachement léger** créé par le choix, le nom, la permanence et les micro-événements ;
5. **une expérience tactile** satisfaisante sur téléphone et tablette ;
6. **le plaisir du choix** face à vingt pierres ordinaires présentées avec un sérieux déraisonnable.

### 2.4 Positionnement

CAILLOU™ n’est pas :

- un Tamagotchi ;
- un idle game ;
- un jeu de collection agressif ;
- un simulateur géologique ;
- une application de méditation ;
- un chatbot ;
- un réseau social ;
- un gestionnaire de tâches ;
- une application de bien-être qui mesure l’utilisateur.

CAILLOU™ est un **objet numérique de compagnie contemplatif et absurde**.

---

## 3. Principes produit non négociables

### P1 — Le caillou n’a besoin de rien

Aucune mécanique ne doit créer de dette envers le caillou.

Interdits : faim, soif, hygiène, santé, sommeil, humeur négative causée par l’absence, entretien obligatoire.

### P2 — L’absence n’est jamais punie

Revenir après une longue période doit provoquer une sensation de continuité, jamais de culpabilité.

Formulation correcte :

> « Bernard poursuit une période de stabilité remarquable. »

Formulation interdite :

> « Bernard vous a attendu pendant 34 jours. »

### P3 — Le premium fait partie de la blague

Le rendu visuel ne doit jamais être volontairement médiocre sous prétexte que le concept est absurde. Le caillou doit être traité comme une sculpture, une montre ou un objet de design haut de gamme.

### P4 — L’humour reste sec

Le produit ne doit pas enchaîner les blagues. Une phrase très sérieuse au sujet d’un caillou suffit souvent.

### P5 — La V1 reste petite

Toute fonctionnalité doit répondre à au moins une question :

- rend-elle le caillou plus beau ?
- renforce-t-elle l’attachement ?
- renforce-t-elle l’absurde ?
- améliore-t-elle la contemplation ?

Si la réponse est non aux quatre questions, elle n’appartient probablement pas à CAILLOU™ V1.

### P6 — Aucun dark pattern

Pas de monnaie premium, pas de publicité, pas de compteur anxiogène, pas de notification insistante, pas de récompense conditionnée à une présence quotidienne.

### P7 — Le produit fonctionne sans compte

La V1 est locale, installable et utilisable sans inscription ni backend applicatif.

### P8 — Les vingt cailloux sont égaux

Les vingt spécimens V1 sont des cailloux quelconques issus de scans réels. Aucun n’est présenté comme supérieur, rare, légendaire ou premium par rapport aux autres.

Le choix doit reposer sur une préférence personnelle de forme, matière et présence, pas sur une hiérarchie artificielle.

---

## 4. Public cible

La V1 ne cherche pas un segment démographique précis. Elle cible surtout des comportements :

- personnes sensibles aux objets numériques singuliers ;
- amateurs d’humour absurde et discret ;
- utilisateurs appréciant les expériences contemplatives ;
- personnes qui aiment personnaliser un petit objet sans devoir l’entretenir ;
- utilisateurs souhaitant une application amusante à montrer ou partager en quelques secondes.

Le produit doit être immédiatement compréhensible sans connaissance préalable des jeux de compagnie virtuelle.

---

## 5. Plateformes cibles

Priorité V1 :

1. smartphone tactile ;
2. tablette tactile ;
3. ordinateur avec souris ou trackpad.

L’application doit être installable en PWA lorsque le navigateur le permet et rester utilisable dans un navigateur classique.

Le mode portrait est prioritaire sur téléphone. Le paysage doit rester fonctionnel et peut devenir particulièrement intéressant sur tablette.

---

## 6. Contenu V1

### 6.1 Catalogue des cailloux

La V1 contient **20 spécimens 3D** issus du pack de scans retenu et du pipeline Blender CAILLOU™.

Le catalogue V1 est volontairement non thématique : il ne cherche plus à représenter six archétypes comme « quartz », « volcanique » ou « galet noir premium ». Il présente **vingt pierres réelles différentes**, avec leurs silhouettes, couleurs et imperfections naturelles.

Identifiants de référence :

```text
rock-001
rock-002
rock-003
...
rock-020
```

Les identifiants techniques ne constituent pas nécessairement les noms visibles après adoption. Avant adoption, l’interface peut utiliser une désignation sobre du type **Spécimen 01**, **Spécimen 02**, etc.

Chaque spécimen doit posséder :

- une géométrie 3D indépendante ;
- ses UV ;
- sa texture couleur ;
- sa normal map lorsque disponible ;
- un matériau web calibré ;
- des métadonnées de provenance et licence ;
- un identifiant stable ;
- une présentation visuelle équivalente aux dix-neuf autres.

### 6.2 Source V1

La base de production validée est constituée de vingt meshes LOD2 détectés dans le fichier Blender source, chacun autour de **10 000 triangles**, avec textures associées d’environ **1024 × 1024**.

Le LOD2 est considéré comme une cible V1 légitime tant que les tests sur appareils physiques confirment :

- silhouette suffisamment détaillée ;
- zoom satisfaisant ;
- normal map lisible ;
- fluidité tactile ;
- poids de fichier compatible avec la PWA.

Aucune montée systématique vers un LOD plus lourd n’est requise si le résultat est déjà convaincant.

### 6.3 Ambiances V1

La V1 contient **5 ambiances principales** :

1. **Studio minéral** — fond clair ou anthracite, lumière produit haut de gamme ;
2. **Jardin zen** — sable fin, quelques éléments sobres, lumière naturelle douce ;
3. **Mousse** — tapis végétal humide et profondeur de champ délicate ;
4. **Bois noble** — plateau en bois sombre ou chaud, ambiance galerie domestique ;
5. **Vitrine muséale** — socle minéral ou textile, lumière de galerie, présentation quasi institutionnelle.

Les ambiances ne sont pas des mini-jeux. Elles servent uniquement à modifier la mise en scène et la lumière.

### 6.4 Corpus éditorial minimal

La V1 doit contenir au minimum :

- **60 statuts courts** ;
- **20 observations contextuelles** liées aux interactions ;
- **12 distinctions/titres** ;
- **10 micro-événements rares** ;
- **20 descriptions courtes de spécimens**, facultativement très sobres ;
- **5 descriptions d’ambiances**.

Les descriptions des vingt spécimens ne doivent pas inventer de rareté ou de valeur géologique. Elles peuvent simplement décrire une forme, une surface ou une impression avec le ton CAILLOU™.

---

## 7. Parcours de premier lancement

### 7.1 Objectif

Faire adopter un caillou en quelques minutes tout en transformant le choix lui-même en première expérience premium de CAILLOU™.

Le choix ne doit pas ressembler à une liste de produits. L’utilisateur doit avoir le temps de **regarder chaque pierre en trois dimensions**.

### 7.2 Étapes

#### Écran 1 — Introduction

Titre : **CAILLOU™**

Promesse courte :

> « Une présence minérale de qualité. »

Action principale : **Commencer l’adoption**.

#### Écran 2 — Showroom 3D de sélection

La sélection des vingt spécimens se fait dans un **showroom 3D plein écran**.

Règles :

- un seul caillou 3D est visible à la fois ;
- un seul modèle 3D est chargé et vivant en mémoire GPU à la fois ;
- navigation séquentielle de `01 / 20` à `20 / 20` ;
- boutons gauche et droite visibles, discrets et accessibles ;
- navigation tactile horizontale possible lorsqu’elle ne concurrence pas la manipulation du modèle ;
- le caillou visible peut être tourné au doigt ou à la souris ;
- le zoom peut être proposé s’il ne complexifie pas les gestes ;
- le fond et l’éclairage restent identiques entre les candidats afin de comparer honnêtement leur matière ;
- aucun système de rareté, score ou recommandation algorithmique.

Composition indicative :

```text
┌──────────────────────────────┐
│           CAILLOU™           │
│                              │
│    ‹      [ROCHE 3D]      ›  │
│                              │
│          07 / 20             │
│        Spécimen 07           │
│                              │
│   Une stabilité prometteuse. │
│                              │
│     Adopter ce caillou       │
└──────────────────────────────┘
```

#### Gestes de sélection

Pour éviter le conflit entre rotation et changement de spécimen :

- un drag qui commence **sur le modèle 3D** sert à faire tourner le caillou ;
- les boutons gauche/droite constituent la navigation de référence ;
- un swipe de navigation peut être accepté dans des zones hors modèle si les tests tactiles montrent qu’il reste clair ;
- aucune navigation ne doit être déclenchée accidentellement pendant une rotation.

#### Changement de spécimen

Lorsque l’utilisateur demande le précédent ou le suivant :

1. le spécimen courant se retire visuellement avec une transition courte ;
2. ses géométries, matériaux et textures GPU sont libérés ;
3. le nouveau GLB est chargé ;
4. une représentation 2D ou silhouette premium peut occuper brièvement la scène ;
5. le nouveau spécimen apparaît en douceur ;
6. la scène ne conserve jamais deux cailloux 3D complets simultanément en mémoire pour produire la transition.

Le cache HTTP/PWA peut conserver un fichier déjà téléchargé sur disque. La règle « un seul caillou chargé » concerne le modèle actif en mémoire et dans la scène 3D.

#### Écran 3 — Nom

L’utilisateur saisit librement un nom.

Contraintes :

- champ obligatoire ;
- longueur raisonnable ;
- aucun besoin de filtrage complexe en V1 puisque les données restent locales ;
- quelques suggestions peuvent être proposées à titre humoristique ;
- le spécimen choisi reste visible si cela ne provoque aucun rechargement inutile.

#### Écran 4 — Confirmation

Le caillou apparaît seul sur son socle.

Message :

> « Votre caillou est prêt à ne rien faire à vos côtés. »

Action : **Rencontrer [nom]**.

### 7.3 Critères d’acceptation

- l’onboarding n’est affiché que tant qu’aucun caillou principal n’a été adopté ;
- les 20 spécimens sont accessibles depuis le showroom ;
- un seul modèle 3D est actif à la fois ;
- la navigation précédent/suivant fonctionne au tactile, à la souris et au clavier ;
- rotation et navigation ne se déclenchent pas simultanément ;
- un abandon du parcours ne crée pas d’état incohérent ;
- la sélection et le nom sont persistés localement après validation ;
- un asset lent ou indisponible n’empêche pas de revenir au candidat précédent ;
- le chargement est masqué par une transition visuelle sobre, jamais par un faux délai humoristique.

---

## 8. Écran principal — Le Socle

### 8.1 Rôle

Le Socle est le produit. Tout le reste est secondaire.

À l’ouverture après onboarding, l’utilisateur doit retrouver immédiatement son caillou en grand, sans dashboard préalable.

### 8.2 Composition

L’écran comprend :

- le caillou 3D au centre ;
- le décor actif ;
- le nom du caillou ;
- un statut court ;
- une interface minimale et discrète ;
- accès aux quatre zones secondaires : **Fiche**, **Ambiances**, **Collection**, **Instantané** ;
- accès secondaire aux réglages.

### 8.3 Interactions 3D

#### Rotation

Glissement horizontal et vertical pour faire tourner le caillou.

Comportement attendu :

- inertie légère ;
- freinage doux ;
- aucun mouvement brusque ;
- retour automatique facultatif vers une pose naturelle après une longue inactivité, sans annuler immédiatement la manipulation.

#### Zoom

Pincement tactile ou molette/trackpad.

Le zoom est borné afin d’éviter de traverser la géométrie ou de perdre totalement le caillou.

#### Tap / clic court

Déclenche une micro-réaction :

- léger son minéral ;
- éventuellement une vibration courte si supportée et autorisée ;
- micro-mouvement ou variation lumineuse ;
- petite observation éditoriale occasionnelle.

Exemples :

> « Contact enregistré. »

> « Stabilité maintenue. »

> « Réaction mesurée. »

#### Appui long

Déclenche le **Mode Observation**.

### 8.4 Mode Observation

Le Mode Observation masque la majorité de l’interface et laisse uniquement :

- le caillou ;
- l’ambiance ;
- le son environnemental éventuel ;
- une action discrète pour quitter le mode.

Il ne contient ni minuterie ni exercice guidé. Ce n’est pas un mode méditation.

### 8.5 Critères d’acceptation

- le caillou reste interactif à 60 fps lorsque le matériel le permet ;
- une stratégie de qualité dégradée maintient une expérience fluide sur appareils modestes ;
- aucune navigation involontaire n’est déclenchée pendant une rotation ;
- l’interface reste utilisable au clavier sur ordinateur pour les fonctions non gestuelles essentielles ;
- `prefers-reduced-motion` est respecté.

---

## 9. Fiche minérale

### 9.1 Rôle

Donner au caillou une identité et matérialiser l’absurde avec un vocabulaire pseudo-institutionnel.

### 9.2 Informations V1

La fiche affiche notamment :

- nom personnalisé ;
- identifiant de spécimen ;
- date d’adoption ;
- ancienneté ;
- nombre d’ouvertures de l’application ;
- temps cumulé d’observation si techniquement fiable ;
- nombre de contacts/taps ;
- ambiance favorite selon l’usage local ;
- titre actuel ;
- statistiques absurdes dérivées.

La V1 n’a pas besoin d’attribuer une espèce géologique fictive à chaque pierre.

### 9.3 Statistiques absurdes

Exemples :

- mobilité moyenne : `0,00 m/jour` ;
- niveau d’ambition : `stable` ;
- indice de présence : `excellent` ;
- taux de comportement rocheux : `99,8 %` ;
- incidents diplomatiques : `0` ;
- capacité de fuite : `non observée`.

Les statistiques fantaisistes doivent être clairement humoristiques et ne pas prétendre mesurer une réalité scientifique.

### 9.4 Titres

Exemples de progression éditoriale :

1. Caillou nouvellement reconnu
2. Galet approuvé
3. Roche familière
4. Minéral confirmé
5. Pierre de confiance
6. Masse noble
7. Objet lithique distingué
8. Entité minérale senior
9. Monument de poche
10. Référence minérale
11. Présence géologique majeure
12. Grand Caillou™

Les titres peuvent se débloquer par ancienneté et usage cumulés, mais jamais par série quotidienne.

---

## 10. Ambiances

### 10.1 Fonction

Changer l’univers visuel sans modifier le comportement fondamental du caillou.

### 10.2 Fonctionnalités

- aperçu des cinq ambiances ;
- sélection immédiate ;
- persistance du choix ;
- adaptation de la lumière, du fond, du sol et du sound design ;
- aucune modification de la personnalité du caillou nécessaire.

### 10.3 Déblocage

Option V1 recommandée : **toutes les ambiances sont disponibles dès le départ**.

Une progression ultérieure peut éventuellement révéler des présentations alternatives, mais aucune monnaie et aucun achat ne sont nécessaires.

---

## 11. Collection et changement de compagnon

### 11.1 Rôle

Permettre de revoir les vingt spécimens sans transformer CAILLOU™ en jeu de collection.

### 11.2 Règles V1

- les 20 spécimens sont connus et accessibles ;
- un caillou est désigné comme **compagnon principal** ;
- l’interface de consultation réutilise autant que possible le showroom 3D séquentiel ;
- un seul modèle 3D est chargé à la fois ;
- changer de compagnon principal est libre ;
- aucun niveau de rareté ;
- aucun doublon aléatoire ;
- aucune mécanique de coffre ou tirage ;
- aucune grille obligatoire de vingt modèles 3D simultanés.

### 11.3 Adoption multiple

La V1 peut conserver le nom et la date d’adoption des spécimens déjà adoptés afin que l’utilisateur puisse revenir vers eux plus tard.

Un spécimen non adopté reste simplement consultable dans le showroom.

Aucune mécanique ne pousse à « tous les collectionner ».

---

## 12. Instantané

### 12.1 Objectif

Permettre de partager ou conserver une belle image du caillou sans intégrer de réseau social.

### 12.2 Fonctionnalités

- cadrage propre de la scène 3D ;
- capture du rendu ;
- option d’inclure ou masquer le nom ;
- option d’ajouter une légende CAILLOU™ parmi une courte sélection ;
- téléchargement local de l’image ;
- partage via l’API native du navigateur lorsque disponible.

Exemples de légendes :

- « Présence minérale de haute tenue. »
- « [Nom], dans son état naturel. »
- « Activité faible. Dignité intacte. »

### 12.3 Confidentialité

Aucune image n’est envoyée vers un serveur CAILLOU™ en V1.

---

## 13. Micro-événements rares

### 13.1 But

Créer une impression de monde vivant sans donner de besoins au caillou.

### 13.2 Règles

- événements non essentiels ;
- aucun événement ne peut être « raté » au sens punitif ;
- aucune récompense exclusive conditionnée à une heure précise ;
- fréquence suffisamment faible pour conserver l’effet de surprise ;
- déclenchement local déterministe ou pseudo-aléatoire ;
- pas de serveur nécessaire.

### 13.3 Catalogue V1 proposé

1. une feuille tombe doucement dans la scène ;
2. un insecte traverse brièvement l’arrière-plan ;
3. un rayon lumineux se déplace ;
4. une poussière minérale apparaît dans la lumière ;
5. le caillou démarre la session orienté de quelques degrés différemment ;
6. une goutte d’eau glisse sur le galet dans l’ambiance mousse ;
7. un minuscule grain de sable roule à proximité ;
8. la vitrine muséale passe exceptionnellement en éclairage nocturne ;
9. le statut annonce : « Aujourd’hui, [nom] semble particulièrement caillou. » ;
10. une plaque muséale spéciale apparaît : « Aucun événement notable. »

---

## 14. Progression douce

### 14.1 Principe

La progression récompense la durée de la relation sans jamais transformer l’usage en devoir.

### 14.2 Signaux utilisables

- date d’adoption ;
- nombre total d’ouvertures ;
- durée totale d’observation ;
- nombre total d’interactions ;
- nombre d’ambiances explorées.

### 14.3 Signaux interdits

- nombre de jours consécutifs ;
- absence sanctionnée ;
- compte à rebours anxiogène ;
- obligation de connexion ;
- énergie à régénérer.

### 14.4 Récompenses autorisées

- titres ;
- textes supplémentaires ;
- présentation alternative de socle ;
- petites variations visuelles.

Les vingt spécimens eux-mêmes ne sont pas des récompenses : ils sont disponibles pour être regardés et choisis.

---

## 15. Réglages

La V1 contient uniquement les réglages utiles :

- son activé/désactivé ;
- haptique activé/désactivé lorsque disponible ;
- qualité graphique `Auto / Élevée / Économie` ;
- réduction des effets, en complément du réglage système ;
- thème d’interface `Système / Clair / Sombre` si pertinent avec la direction artistique ;
- export de sauvegarde ;
- import de sauvegarde ;
- réinitialisation complète avec confirmation forte ;
- informations de version et crédits.

Les crédits doivent conserver la provenance et l’attribution des assets tiers conformément à leur licence.

Pas de compte, profil social ni paramètres de notification en V1.

---

## 16. Données et persistance

Les données personnelles restent locales.

La V1 doit conserver :

- spécimens adoptés ;
- noms ;
- compagnon principal ;
- ambiance active ;
- préférences ;
- statistiques locales ;
- dates et compteurs nécessaires aux titres ;
- micro-événements déjà montrés si nécessaire pour éviter les répétitions ;
- version de schéma.

Le catalogue des vingt spécimens appartient à l’application et n’est pas dupliqué dans la sauvegarde utilisateur.

Une sauvegarde exportable permet de transférer ou restaurer les données.

Aucune télémétrie n’est requise pour le fonctionnement du produit.

---

## 17. PWA et hors ligne

La V1 doit :

- être installable lorsque la plateforme le permet ;
- fonctionner après le premier chargement sans connexion réseau pour le compagnon adopté et le parcours principal ;
- mettre en cache le shell et les ressources essentielles ;
- mettre en cache durablement le modèle du compagnon principal ;
- utiliser un cache runtime pour les autres spécimens lorsqu’ils sont visités ;
- ne pas précacher aveuglément les vingt GLB au premier lancement ;
- gérer proprement une mise à jour de version ;
- ne pas casser une session en cours par un rechargement forcé.

La présence de vingt spécimens ne doit pas transformer l’installation initiale en téléchargement massif.

---

## 18. Accessibilité

Le caractère visuel de CAILLOU™ ne dispense pas d’une interface accessible.

Exigences V1 :

- contrastes suffisants ;
- tailles tactiles confortables ;
- navigation clavier pour les contrôles d’interface ;
- boutons précédent/suivant accessibles et libellés ;
- compteur de position compréhensible hors Canvas ;
- pas d’information transmise uniquement par la couleur ;
- respect de `prefers-reduced-motion` ;
- solution alternative aux gestes essentiels ;
- sons non nécessaires à la compréhension ;
- textes lisibles sans dépendre du décor 3D.

La manipulation fine du modèle 3D peut rester une expérience enrichie et non une condition d’accès aux fonctions principales.

---

## 19. Performance et qualité perçue

CAILLOU™ doit sembler instantané et calme.

Priorités :

1. affichage rapide du shell ;
2. chargement progressif élégant du caillou ;
3. **un seul spécimen 3D actif en mémoire à la fois dans le showroom** ;
4. libération explicite des ressources GPU lors d’un changement ;
5. absence de saut visuel brutal ;
6. interaction tactile fluide ;
7. adaptation automatique de la qualité 3D ;
8. poids d’assets maîtrisé ;
9. absence de spinner agressif ou de faux temps d’attente humoristique.

Si un arbitrage est nécessaire, une texture légèrement moins détaillée sur appareil modeste vaut mieux qu’un rendu premium à 15 fps.

---

## 20. Ton éditorial

Le ton de CAILLOU™ est :

- sérieux ;
- calme ;
- sec ;
- précis ;
- légèrement institutionnel ;
- jamais hystérique.

### Exemples conformes

> « Aucun changement significatif. »

> « Votre spécimen conserve un excellent niveau de roche. »

> « Activité mesurée : négligeable. »

> « [Nom] poursuit une carrière exemplaire dans l’immobilité. »

> « Présence stable. Dignité intacte. »

### Exemples non conformes

- avalanche d’emojis dans l’application ;
- blagues à chaque bouton ;
- voix enfantine ;
- discours pseudo-thérapeutique ;
- insultes ou sarcasme agressif ;
- personnification permanente du caillou comme s’il parlait réellement.

Le caillou peut être anthropomorphisé par le texte, mais il ne devient pas un personnage bavard.

---

## 21. Navigation V1

La navigation doit rester courte.

Structure recommandée :

```text
Onboarding
   ↓
Showroom 3D des 20 spécimens
   ↓
Nommage
   ↓
Le Socle
 ├─ Fiche minérale
 ├─ Ambiances
 ├─ Collection / Showroom
 ├─ Instantané
 └─ Réglages
```

Aucun écran « Dashboard » n’est nécessaire.

Le retour au Socle doit toujours être immédiat.

---

## 22. Hors périmètre V1

Sont explicitement exclus :

- compte utilisateur ;
- backend Supabase ou autre ;
- synchronisation cloud ;
- réseau social ;
- commentaires ;
- messagerie ;
- classement ;
- marketplace ;
- monnaie virtuelle ;
- rareté artificielle ;
- loot boxes ;
- achat in-app ;
- publicité ;
- IA générative ;
- chatbot ;
- géolocalisation ;
- réalité augmentée ;
- besoins du caillou ;
- mort ou maladie ;
- élevage / reproduction ;
- combats ;
- mini-jeux obligatoires ;
- notifications de rappel ;
- streaks ;
- quêtes quotidiennes ;
- NFT, blockchain ou propriété spéculative.

Toute réintroduction future de l’un de ces éléments doit être évaluée contre les principes non négociables de la section 3.

---

## 23. Critères de réussite de la V1

La V1 est considérée comme réussie si :

1. un nouvel utilisateur comprend le concept sans tutoriel long ;
2. les vingt cailloux peuvent être parcourus naturellement en 3D ;
3. l’utilisateur peut inspecter un spécimen avant de l’adopter ;
4. un seul GLB actif est conservé en mémoire pendant le showroom ;
5. le caillou 3D constitue clairement le centre de l’expérience ;
6. les gestes de rotation et zoom sont agréables sur téléphone ;
7. navigation et rotation ne se confondent pas ;
8. le produit reste amusant sans transformer le caillou en personnage bavard ;
9. aucune absence n’entraîne de sanction ;
10. le compagnon adopté reste disponible hors ligne après mise en cache ;
11. la sauvegarde locale résiste aux mises à jour normales de l’application ;
12. une capture partagée reste identifiable comme issue de CAILLOU™ sans branding envahissant ;
13. le périmètre reste suffisamment petit pour que chaque écran atteigne un niveau de finition élevé.

---

## 24. Définition de « terminé » pour V1.0

La version 1.0 peut être déclarée terminée lorsque les éléments suivants sont présents et validés :

### Produit

- [ ] onboarding complet ;
- [ ] showroom 3D précédent/suivant ;
- [ ] navigation des 20 spécimens ;
- [ ] rotation 3D pendant la sélection ;
- [ ] un seul modèle actif en mémoire ;
- [ ] adoption et nommage ;
- [ ] 20 cailloux finalisés ;
- [ ] Socle 3D ;
- [ ] rotation, zoom, tap et Mode Observation ;
- [ ] fiche minérale ;
- [ ] statistiques absurdes ;
- [ ] 12 titres ;
- [ ] 5 ambiances ;
- [ ] collection / retour au showroom ;
- [ ] Instantané et export/partage ;
- [ ] 10 micro-événements ;
- [ ] réglages ;
- [ ] crédits et attribution des assets ;
- [ ] export/import de sauvegarde ;
- [ ] PWA hors ligne pour le parcours principal.

### Contenu

- [ ] minimum 60 statuts ;
- [ ] minimum 20 réactions contextuelles ;
- [ ] métadonnées des 20 spécimens ;
- [ ] textes courts des 20 spécimens si retenus ;
- [ ] textes des 5 ambiances ;
- [ ] cohérence éditoriale vérifiée.

### Qualité

- [ ] responsive téléphone/tablette/desktop ;
- [ ] test tactile réel iPhone/iPad/Android si disponibles ;
- [ ] navigation clavier essentielle ;
- [ ] contrôle des conflits swipe/rotation ;
- [ ] reduced motion ;
- [ ] qualité graphique adaptative ;
- [ ] fonctionnement hors ligne du compagnon adopté ;
- [ ] migration/persistance testée ;
- [ ] aucun blocage réseau requis pour le parcours principal après cache ;
- [ ] aucune fuite GPU lors de la navigation répétée entre les 20 spécimens ;
- [ ] aucune fonctionnalité hors périmètre introduite par opportunisme.

---

## 25. Principe final

Lorsqu’un choix produit est difficile, utiliser cette règle :

> **Si la fonctionnalité rend CAILLOU™ plus compliqué à posséder que le caillou lui-même, elle est probablement mauvaise.**