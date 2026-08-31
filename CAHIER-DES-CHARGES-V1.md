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

CAILLOU™ est une application installable dans laquelle l’utilisateur adopte un magnifique caillou numérique en 3D, lui donne un nom, le contemple, le manipule légèrement, change son environnement et consulte des informations volontairement disproportionnées sur sa remarquable stabilité minérale.

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

1. **un plaisir visuel** grâce à un objet 3D premium ;
2. **une respiration** grâce à une expérience calme et sans enjeu ;
3. **un humour de décalage** né du sérieux avec lequel l’application traite un caillou ;
4. **un attachement léger** créé par la permanence, le nom et les micro-événements ;
5. **une expérience tactile** satisfaisante sur téléphone et tablette.

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

### 6.1 Cailloux disponibles

La V1 contient **6 spécimens**. Chaque spécimen possède une géométrie, une texture, un matériau et une identité éditoriale propres.

| ID | Nom produit | Intention visuelle | Caractère éditorial |
|---|---|---|---|
| `river-pebble` | Galet de rivière | gris doux, lisse, arrondi | rassurant, constant |
| `volcanic-stone` | Pierre volcanique | sombre, poreuse, irrégulière | brute, réservée |
| `pale-quartz` | Quartz pâle | clair, légèrement translucide | noble, distant |
| `granite-stone` | Caillou granitique | moucheté, dense, minéral | robuste, administratif |
| `ochre-stone` | Pierre ocre | chaude, mate, solaire | placide, chaleureuse |
| `black-pebble` | Galet noir premium | sombre, satiné, très épuré | sobre, prétentieux juste ce qu’il faut |

Les six variantes doivent être visuellement désirables. Aucun modèle ne doit être présenté comme « commun » ou inférieur.

### 6.2 Ambiances V1

La V1 contient **5 ambiances principales** :

1. **Studio minéral** — fond clair ou anthracite, lumière produit haut de gamme ;
2. **Jardin zen** — sable fin, quelques éléments sobres, lumière naturelle douce ;
3. **Mousse** — tapis végétal humide et profondeur de champ délicate ;
4. **Bois noble** — plateau en bois sombre ou chaud, ambiance galerie domestique ;
5. **Vitrine muséale** — socle minéral ou textile, lumière de galerie, présentation quasi institutionnelle.

Les ambiances ne sont pas des mini-jeux. Elles servent uniquement à modifier la mise en scène et la lumière.

### 6.3 Corpus éditorial minimal

La V1 doit contenir au minimum :

- **60 statuts courts** ;
- **20 observations contextuelles** liées aux interactions ;
- **12 distinctions/titres** ;
- **10 micro-événements rares** ;
- **6 descriptions de spécimens** ;
- **5 descriptions d’ambiances**.

Le contenu doit être suffisamment varié pour éviter une impression de boucle après quelques ouvertures.

---

## 7. Parcours de premier lancement

### 7.1 Objectif

Faire adopter un caillou en moins de deux minutes, tout en installant immédiatement le ton premium et absurde du produit.

### 7.2 Étapes

#### Écran 1 — Introduction

Titre : **CAILLOU™**

Promesse courte :

> « Une présence minérale de qualité. »

Action principale : **Commencer l’adoption**.

#### Écran 2 — Sélection du spécimen

Présentation des six cailloux dans une galerie haut de gamme.

Pour chaque caillou :

- aperçu 3D manipulable ;
- nom de variété ;
- trois attributs absurdes très courts.

Exemple :

- Tempérament : stable
- Ambition : contenue
- Mobilité naturelle : faible

Aucun système de rareté.

#### Écran 3 — Nom

L’utilisateur saisit librement un nom.

Contraintes :

- champ obligatoire ;
- longueur raisonnable ;
- aucun besoin de filtrage complexe en V1 puisque les données restent locales ;
- quelques suggestions peuvent être proposées à titre humoristique.

#### Écran 4 — Confirmation

Le caillou apparaît seul sur son socle.

Message :

> « Votre caillou est prêt à ne rien faire à vos côtés. »

Action : **Rencontrer [nom]**.

### 7.3 Critères d’acceptation

- l’onboarding n’est affiché que tant qu’aucun caillou principal n’a été adopté ;
- un abandon du parcours ne crée pas d’état incohérent ;
- la sélection et le nom sont persistés localement après validation ;
- le chargement du premier modèle 3D est suffisamment rapide pour ne pas casser l’effet de découverte.

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
- variété ;
- date d’adoption ;
- ancienneté ;
- nombre d’ouvertures de l’application ;
- temps cumulé d’observation si techniquement fiable ;
- nombre de contacts/taps ;
- ambiance favorite selon l’usage local ;
- titre actuel ;
- statistiques absurdes dérivées.

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

Deux options sont acceptables en V1 :

**Option recommandée :** toutes les ambiances sont disponibles dès le départ.

**Option alternative :** deux ambiances sont disponibles immédiatement et les autres se débloquent automatiquement avec l’ancienneté générale, sans action quotidienne exigée.

Aucune monnaie et aucun achat.

---

## 11. Collection

### 11.1 Rôle

Permettre à l’utilisateur de posséder plusieurs spécimens sans transformer CAILLOU™ en jeu de collection.

### 11.2 Règles V1

- un caillou est désigné comme **compagnon principal** ;
- les autres spécimens peuvent être consultés dans une galerie ;
- chaque spécimen peut recevoir un nom propre ;
- changer de compagnon principal est libre ;
- aucun niveau de rareté ;
- aucun doublon aléatoire ;
- aucune mécanique de coffre ou tirage.

### 11.3 Acquisition

Le premier caillou est choisi librement. Les autres peuvent être :

- disponibles dès le départ ; ou
- révélés progressivement via ancienneté / nombre total de visites.

La V1 privilégie la simplicité et la transparence.

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
- petites variations visuelles ;
- accès transparent à d’autres spécimens si l’option de déblocage progressif est retenue.

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

Une sauvegarde exportable permet de transférer ou restaurer les données.

Aucune télémétrie n’est requise pour le fonctionnement du produit.

---

## 17. PWA et hors ligne

La V1 doit :

- être installable lorsque la plateforme le permet ;
- fonctionner après le premier chargement sans connexion réseau pour le parcours principal ;
- mettre en cache le shell, les modèles 3D et les ressources essentielles ;
- gérer proprement une mise à jour de version ;
- ne pas casser une session en cours par un rechargement forcé.

Les assets 3D doivent être optimisés pour rendre ce fonctionnement réaliste.

---

## 18. Accessibilité

Le caractère visuel de CAILLOU™ ne dispense pas d’une interface accessible.

Exigences V1 :

- contrastes suffisants ;
- tailles tactiles confortables ;
- navigation clavier pour les contrôles d’interface ;
- libellés accessibles ;
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
3. absence de saut visuel brutal ;
4. interaction tactile fluide ;
5. adaptation automatique de la qualité 3D ;
6. poids d’assets maîtrisé ;
7. absence de spinner agressif ou de faux temps d’attente humoristique.

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
Le Socle
 ├─ Fiche minérale
 ├─ Ambiances
 ├─ Collection
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
2. l’adoption prend moins de deux minutes ;
3. le caillou 3D constitue clairement le centre de l’expérience ;
4. les gestes de rotation et zoom sont agréables sur téléphone ;
5. le produit reste amusant sans transformer le caillou en personnage bavard ;
6. aucune absence n’entraîne de sanction ;
7. toutes les fonctions principales sont disponibles hors ligne après installation/chargement initial ;
8. la sauvegarde locale résiste aux mises à jour normales de l’application ;
9. une capture partagée reste identifiable comme issue de CAILLOU™ sans branding envahissant ;
10. le périmètre reste suffisamment petit pour que chaque écran atteigne un niveau de finition élevé.

---

## 24. Définition de « terminé » pour V1.0

La version 1.0 peut être déclarée terminée lorsque les éléments suivants sont présents et validés :

### Produit

- [ ] onboarding complet ;
- [ ] adoption et nommage ;
- [ ] 6 cailloux finalisés ;
- [ ] Socle 3D ;
- [ ] rotation, zoom, tap et Mode Observation ;
- [ ] fiche minérale ;
- [ ] statistiques absurdes ;
- [ ] 12 titres ;
- [ ] 5 ambiances ;
- [ ] collection ;
- [ ] Instantané et export/partage ;
- [ ] 10 micro-événements ;
- [ ] réglages ;
- [ ] export/import de sauvegarde ;
- [ ] PWA hors ligne.

### Contenu

- [ ] minimum 60 statuts ;
- [ ] minimum 20 réactions contextuelles ;
- [ ] textes des 6 spécimens ;
- [ ] textes des 5 ambiances ;
- [ ] cohérence éditoriale vérifiée.

### Qualité

- [ ] responsive téléphone/tablette/desktop ;
- [ ] test tactile réel iPhone/iPad/Android si disponibles ;
- [ ] navigation clavier essentielle ;
- [ ] reduced motion ;
- [ ] qualité graphique adaptative ;
- [ ] fonctionnement hors ligne ;
- [ ] migration/persistance testée ;
- [ ] aucun blocage réseau requis ;
- [ ] aucune fonctionnalité hors périmètre introduite par opportunisme.

---

## 25. Principe final

Lorsqu’un choix produit est difficile, utiliser cette règle :

> **Si la fonctionnalité rend CAILLOU™ plus compliqué à posséder que le caillou lui-même, elle est probablement mauvaise.**
