# CAILLOU™ - Design system et direction artistique V1

> **Statut : référence visuelle V1**  
> **Intention : traiter un simple caillou avec le sérieux d'un objet de collection haut de gamme.**  
> **Règle d'or : si l'interface devient plus intéressante que le caillou, le design a échoué.**

---

## 1. Objet du document

Ce document définit l'identité visuelle et sensorielle de CAILLOU™ V1 :

- marque ;
- palette ;
- typographie ;
- inscription ;
- showroom des vingt spécimens ;
- descriptions ;
- Socle ;
- Bio / Stats ;
- modes Caresser et Nettoyer ;
- boutique d'accessoires ;
- Lithons ;
- abandon d'un caillou ;
- rendu 3D ;
- mouvement ;
- haptique ;
- accessibilité ;
- ton éditorial.

---

## 2. Idée directrice

CAILLOU™ repose sur un contraste :

```text
un simple caillou          x  une présentation premium
une activité minime        x  des statistiques très sérieuses
une caresse                x  une économie parfaitement documentée
un peu de poussière        x  un protocole d'entretien impeccable
un accessoire inutile      x  une boutique institutionnelle
un abandon instantané      x  un historique conservé avec rigueur
```

Le design lui-même porte l'humour. Aucun besoin d'ajouter des yeux, une bouche ou une avalanche de blagues.

---

## 3. Personnalité de marque

| Trait | Intensité |
|---|---:|
| Calme | 10/10 |
| Premium | 9/10 |
| Absurde | 7/10 |
| Institutionnel | 7/10 |
| Chaleureux | 5/10 |
| Technologique | 3/10 |
| Enfantin | 0/10 |
| Frénétique | 0/10 |

Nom officiel : **CAILLOU™**

Signature :

> **Une présence minérale de qualité.**

Alternative :

> **Enfin un compagnon qui ne demande absolument rien.**

---

## 4. Palette maîtresse

| Token | Valeur | Usage |
|---|---|---|
| `mineral-ivory` | `#F2EFE9` | fond clair |
| `limestone` | `#D8D2C8` | surfaces secondaires |
| `warm-stone` | `#B9B1A5` | séparateurs |
| `graphite` | `#343330` | texte secondaire |
| `basalt` | `#181817` | texte/fond sombre |
| `carbon` | `#0E0E0D` | profondeur |
| `aged-bronze` | `#9A784D` | accent premium |
| `ochre` | `#A66F3F` | accent chaud |
| `moss` | `#66705C` | ambiance végétale |
| `quartz` | `#E5E1D8` | reflets |

Dosage :

```text
80-90 % neutres
10-15 % contrastes fonctionnels
0-5 % accent
```

Le caillou fournit l'essentiel de la couleur.

---

## 5. Typographie

Direction : contemporaine, nette, éditoriale sans effet luxe caricatural.

Candidats :

- Instrument Sans ;
- Inter ;
- Manrope ;
- Geist Sans.

Option secondaire limitée : Instrument Serif.

Échelle mobile indicative :

| Style | Taille |
|---|---:|
| Display | 40-52 px |
| H1 | 28-34 px |
| H2 | 20-24 px |
| Body | 16-18 px |
| Small | 13-14 px |
| Micro | 11-12 px |

Limiter les graisses à 400, 500 et 600.

---

## 6. Écran d'inscription

L'inscription doit sembler faire partie du même univers que le Socle.

```text
        CAILLOU™

 Une présence minérale de qualité.

        Pseudo
      Mot de passe

    Créer mon compte

   J'ai déjà un compte
```

Règles :

- beaucoup d'espace négatif ;
- deux champs maximum ;
- aucun onboarding marketing en carrousel ;
- aucun avatar ;
- aucune demande d'âge, sexe, localisation ou biographie ;
- erreurs formulées clairement et sans humour gênant.

Exemple d'erreur conforme :

> « Ce pseudo est déjà attribué. »

---

## 7. Les vingt spécimens

La V1 présente vingt cailloux réels et différents.

Avant adoption :

```text
Spécimen 01
...
Spécimen 20
```

Aucune pierre ne possède :

- rareté ;
- étoile ;
- niveau ;
- recommandation ;
- prix ;
- badge « meilleur choix ».

Les vingt bénéficient du même studio de sélection, du même cadrage relatif et du même niveau de finition.

---

## 8. Showroom 3D

### 8.1 Composition

```text
┌─────────────────────────────┐
│           CAILLOU™          │
│                             │
│  ‹        [ROCHE]        ›  │
│             3D              │
│                             │
│          07 / 20            │
│        Spécimen 07          │
│                             │
│   Description institution.  │
│                             │
│     Adopter ce caillou      │
└─────────────────────────────┘
```

Le caillou occupe environ 50 à 65 % de la hauteur utile de la zone 3D.

### 8.2 Navigation

- flèches tactiles discrètes mais généreuses ;
- touches gauche/droite sur desktop ;
- swipe facultatif hors objet ;
- drag sur le caillou = rotation ;
- flèches = changement de spécimen.

### 8.3 Changement de spécimen

Séquence :

1. baisse légère de présence du spécimen courant ;
2. disparition ;
3. placeholder ou image figée si nécessaire ;
4. chargement du suivant ;
5. apparition douce.

Jamais deux GLB complets simultanément pour fabriquer un crossfade.

---

## 9. Descriptions des spécimens

Chaque caillou doit posséder une description sérieuse, spécifique et suffisamment détaillée pour donner l'impression qu'une commission a réellement étudié la question.

Exemple :

> « Masse minérale compacte à géométrie asymétrique, présentant une surface relativement homogène sur sa face principale. Sa base large lui confère une stabilité statique très satisfaisante. Aucun déplacement spontané n'a été documenté. »

Sous la description, quelques attributs courts peuvent apparaître :

```text
Stabilité apparente        Élevée
Régularité de surface      Modérée
Mobilité spontanée         Non observée
Conformité minérale        Excellente
```

Ne jamais inventer une espèce géologique précise sans preuve.

---

## 10. Nommage

Après adoption :

```text
Spécimen 07
      ↓
   BERNARD
```

Le changement d'identité doit être ressenti comme important sans modifier physiquement le caillou.

Écran très simple : champ unique, caillou encore visible, validation claire.

---

## 11. Le Socle

### 11.1 Composition de référence

```text
┌─────────────────────────────┐
│ [Bio / Stats]          [ · ]│
│                             │
│                             │
│        [ BERNARD ]          │
│            3D               │
│                             │
│                             │
│                             │
│ Caresser Nettoyer Accessoire│
│             Jeter           │
└─────────────────────────────┘
```

L'écran principal n'est pas un dashboard.

### 11.2 Priorité visuelle

Ordre de dominance :

1. caillou ;
2. espace et lumière ;
3. commandes ;
4. texte.

Le solde de Lithons n'a pas besoin d'être affiché en permanence sur le Socle.

---

## 12. Barre des quatre commandes

Les quatre actions sont la seule barre fonctionnelle principale :

1. **Caresser** ;
2. **Nettoyer** ;
3. **Accessoire** ;
4. **Jeter**.

### Mobile

Les boutons doivent rester confortables au pouce, minimum 44 x 44 px pour les zones tactiles.

Selon la largeur, le layout peut être :

```text
Caresser | Nettoyer | Accessoire | Jeter
```

ou :

```text
Caresser     Nettoyer
Accessoire   Jeter
```

La deuxième solution est acceptable si elle améliore la lisibilité sur petits écrans.

`Jeter` est fonctionnellement destructif mais ne doit pas devenir un gros bouton rouge alarmiste permanent. Le danger est signalé dans la confirmation.

---

## 13. Mode normal

En mode normal :

- drag = rotation ;
- pinch/molette = zoom ;
- aucune récompense ;
- aucune poussière retirée par accident ;
- aucune caresse comptée.

Les modes doivent être explicites afin qu'un même geste n'ait jamais trois significations.

---

## 14. Mode Caresser

### Activation

Tap sur **Caresser**.

Le bouton devient actif avec un changement visuel minimal. Aucun écran séparé n'est nécessaire.

### Geste

Le doigt parcourt la surface du caillou. Une caresse reconnue produit :

- micro-feedback visuel ;
- haptique très légère si activée ;
- éventuellement un son discret ;
- affichage temporaire `+1 Lithon`.

### Feedback Lithon

Le feedback doit ressembler à une confirmation, pas à une explosion de récompense.

Conforme :

```text
+1 Lithon
```

Interdit :

```text
SUPER CARESSE !!! +1 💎 COMBO x12
```

---

## 15. Le Lithon

### 15.1 Identité

Nom : **Lithon**.

Il doit être traité comme une unité officielle parfaitement sérieuse, bien qu'elle n'existe que pour acheter des accessoires à un caillou.

### 15.2 Présentation

Préférer :

```text
84 Lithons
```

avec éventuellement un petit pictogramme minéral dédié.

Éviter les symboles monétaires réels.

### 15.3 Où afficher le solde

Le solde apparaît surtout :

- dans la boutique ;
- après un gain ;
- dans Bio / Stats si retenu ;
- lors d'un achat insuffisant.

Il n'a pas besoin d'occuper le haut de l'écran principal en permanence.

---

## 16. Mode Nettoyer

### Activation

Tap sur **Nettoyer**.

### Poussière

La poussière doit être :

- subtile ;
- réaliste ;
- visible sous la lumière ;
- jamais dégoûtante ;
- jamais associée à une jauge de santé.

### Geste

Le doigt nettoie les zones parcourues avec une réponse visuelle locale.

L'utilisateur doit sentir qu'il retire réellement la poussière, sans mini-jeu, score ou chronomètre.

### Fin

Texte court possible :

> « Surface remise dans un état réglementaire. »

Aucun Lithon n'est accordé.

---

## 17. Boutique d'accessoires

### 17.1 Direction

La boutique ressemble davantage à un catalogue de musée ou de design qu'à un magasin de jeu mobile.

Chaque accessoire affiche :

- aperçu ;
- nom ;
- description sèche ;
- prix en Lithons ;
- état `Possédé` le cas échéant.

### 17.2 Exemple

```text
COUSSIN DE PRÉSENTATION N°02

Support textile destiné à améliorer
la qualité générale de la station immobile.

120 Lithons

Acheter
```

### 17.3 Accessoires compatibles

Familles recommandées :

- socles ;
- coussins ;
- plaques nominatives ;
- vitrines ;
- petites lampes de présentation ;
- mini-barrières de musée ;
- supports ;
- objets absurdes mais visuellement sobres.

Un petit chapeau peut exister si son exécution reste premium et rare dans la direction artistique. CAILLOU™ ne doit pas dériver vers une garde-robe cartoon.

### 17.4 Après achat

Feedback :

> « Acquisition enregistrée. »

Puis option **Équiper**.

Pas de confettis.

---

## 18. Bio / Stats

Le bouton supérieur gauche ouvre une fiche institutionnelle.

```text
BERNARD
Spécimen 07

Adopté le 31 août 2026

Caresses                     731
Nettoyages                    18
Lithons générés              731
Accessoires possédés           4
Déplacement spontané           0 m
Incidents diplomatiques         0
Conformité minérale          99,8 %
```

L'objectif n'est pas l'optimisation statistique. L'objectif est de documenter avec beaucoup trop de sérieux une relation avec un caillou.

---

## 19. Bouton supérieur droit

Un bouton/emplacement est réservé à une idée future.

En V1 :

- présence graphique discrète ;
- aucune mutation produit ;
- aucune notification rouge ;
- aucune promesse commerciale ;
- symbole neutre comme `·`, `…` ou une icône dédiée à définir.

Il constitue un emplacement d'architecture UI, pas une fonctionnalité cachée.

---

## 20. Jeter

### Confirmation

La confirmation peut occuper une sheet ou une modale sobre.

> **Jeter Bernard ?**
>
> Cette opération mettra fin à une relation minérale jusque-là correctement documentée.

Boutons :

- **Conserver Bernard** ;
- **Jeter Bernard**.

### Après confirmation

Le caillou **disparaît immédiatement**.

Aucune animation de lancer, chute, rebond, explosion ou bruit dramatique.

Écran vide :

> **Aucun caillou actuellement sous votre responsabilité.**

CTA : **Adopter un nouveau caillou**.

La brutalité calme de la disparition fait partie du ton.

---

## 21. Caméra et lumière

### Caméra showroom

- FOV initial 28° à 35° ;
- distance auto-ajustée selon bounding box ;
- aucun grand-angle ;
- même proportion visuelle pour les vingt pierres.

### Studio de sélection

```text
        Rim discret
            ↘
Fill -> CAILLOU <- Key large

       Contact shadow
```

### Socle

Le Socle peut conserver le Studio comme ambiance de base. La V1 ne nécessite pas cinq ambiances si celles-ci retardent la boucle principale. La priorité est désormais : caillou, interactions, accessoires, Bio / Stats.

Des décors supplémentaires peuvent arriver après la boucle essentielle.

---

## 22. Matière du caillou

Maps prioritaires :

- base color ;
- normal ;
- roughness calibrée ;
- AO seulement si utile.

La pierre ne doit jamais ressembler à du plastique.

Trois niveaux de lecture :

```text
silhouette     immédiate
macro-texture  visible en rotation
micro-texture  visible au zoom
```

Base V1 : LOD2 autour de 10 000 triangles, textures source autour de 1K.

---

## 23. Accessoires 3D

Un accessoire doit respecter un budget plus faible que le caillou lui-même.

Principes :

- géométrie simple ;
- textures sobres ;
- pas d'animation lourde ;
- points d'ancrage déterministes ;
- pas de physique nécessaire ;
- possibilité d'afficher plusieurs accessoires uniquement si le budget GPU reste stable.

Le caillou reste visuellement dominant même équipé.

---

## 24. Mouvement

Un caillou :

- ne bondit pas ;
- ne danse pas ;
- ne respire pas ;
- ne cligne pas des yeux ;
- ne flotte pas gratuitement.

Durées indicatives :

| Type | Durée |
|---|---:|
| feedback bouton | 120-180 ms |
| sheet | 220-320 ms |
| changement de spécimen | 250-500 ms hors réseau |
| feedback Lithon | 300-600 ms |
| équipement accessoire | 200-400 ms |

Pas de bounce cartoon.

---

## 25. Reduced motion

Avec `prefers-reduced-motion: reduce` :

- inertie réduite ;
- fades courts ;
- aucun mouvement caméra automatique ;
- feedback Lithon statique ou très bref ;
- changement de spécimen fonctionnel sans animation élaborée.

---

## 26. Son et haptique

### Son

Familles :

- petit frottement minéral ;
- bruit de nettoyage très discret ;
- contact d'un accessoire ;
- ambiance quasi silencieuse.

### Haptique

Quand disponible : impulsion courte et faible, désactivable.

Pas de vibration continue pendant la caresse.

---

## 27. Ton éditorial

Voix : conservateur de musée ayant consacré beaucoup trop de moyens à l'étude d'un caillou.

Lexique :

- spécimen ;
- présence ;
- état ;
- stabilité ;
- observation ;
- surface ;
- conformité ;
- acquisition ;
- entretien ;
- activité ;
- Lithon ;
- inventaire.

Exemples conformes :

- « Présence stable. »
- « Orientation révisée. »
- « Acquisition enregistrée. »
- « Surface remise dans un état réglementaire. »
- « Aucun déplacement spontané n'a été observé. »
- « La situation reste minérale. »

Éviter :

- memes ;
- emojis dans l'interface ;
- humour enfantin ;
- caillou bavard ;
- reproches ;
- termes de casino ;
- slogans de vente agressifs.

---

## 28. États réseau

Comme la progression est persistée dans Supabase, l'interface doit traiter les états réseau avec calme.

Exemple hors ligne :

> « Synchronisation indisponible. Le spécimen reste observable. »

Les actions économiques sont désactivées proprement plutôt que simulées localement.

Pas de toast rouge agressif si le réseau disparaît.

---

## 29. Accessibilité

- boutons tactiles minimum 44 x 44 px ;
- focus visible ;
- HTML sémantique hors Canvas ;
- descriptions et compteurs lisibles par lecteur d'écran ;
- navigation showroom au clavier ;
- aucune action essentielle exclusivement gestuelle ;
- modes Caresser/Nettoyer identifiables autrement que par la couleur ;
- contraste suffisant indépendamment de la scène 3D ;
- adoption possible sans rotation ;
- reduced motion respecté.

---

## 30. Tokens CSS initiaux

```css
:root {
  --color-mineral-ivory: #f2efe9;
  --color-limestone: #d8d2c8;
  --color-warm-stone: #b9b1a5;
  --color-graphite: #343330;
  --color-basalt: #181817;
  --color-carbon: #0e0e0d;
  --color-aged-bronze: #9a784d;
  --color-ochre: #a66f3f;
  --color-moss: #66705c;
  --color-quartz: #e5e1d8;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  --radius-control: 12px;
  --radius-card: 18px;
  --radius-sheet: 26px;

  --duration-fast: 140ms;
  --duration-ui: 260ms;
  --duration-rock-switch: 380ms;
}
```

---

## 31. Anti-patterns

### Visuel

- yeux ;
- bouche ;
- arc-en-ciel ;
- particules permanentes ;
- barre XP ;
- étoiles de rareté ;
- confettis ;
- néon arcade.

### Économie

- deuxième monnaie ;
- packs de Lithons ;
- prix barrés ;
- offre limitée ;
- bonus x2 quotidien ;
- compteur de combo ;
- récompense publicitaire ;
- loot box.

### UX

- popup quotidienne ;
- streak ;
- jauge de saleté anxiogène ;
- notification « Bernard a besoin de vous » ;
- menu complexe ;
- dashboard statistique envahissant.

---

## 32. Checklist visuelle V1

### Auth

- [ ] inscription pseudo + mot de passe ;
- [ ] connexion ;
- [ ] erreurs propres ;
- [ ] cohérence clair/sombre.

### Showroom

- [ ] 20 spécimens ;
- [ ] 20 descriptions ;
- [ ] un seul GLB visible ;
- [ ] flèches ;
- [ ] compteur ;
- [ ] rotation ;
- [ ] CTA adoption ;
- [ ] chargement premium.

### Socle

- [ ] Bio / Stats en haut à gauche ;
- [ ] slot futur en haut à droite ;
- [ ] caillou central dominant ;
- [ ] quatre commandes en bas ;
- [ ] manipulation normale ;
- [ ] mode Caresser ;
- [ ] mode Nettoyer ;
- [ ] boutique ;
- [ ] confirmation Jeter ;
- [ ] disparition sans animation.

### Économie

- [ ] feedback `+1 Lithon` ;
- [ ] solde discret ;
- [ ] prix boutique lisibles ;
- [ ] achat sans effets casino ;
- [ ] état Possédé ;
- [ ] équipement clair.

### 3D

- [ ] LOD2 validés ;
- [ ] matériaux non plastiques ;
- [ ] caméra auto-fit ;
- [ ] contact shadow ;
- [ ] poussière crédible ;
- [ ] accessoires légers ;
- [ ] performance mobile.

---

## 33. Règle finale de direction artistique

Avant de valider un écran, poser quatre questions :

1. Le caillou reste-t-il le sujet principal ?
2. Le traitement paraît-il légèrement trop sérieux pour ce qu'il représente ?
3. L'interaction est-elle compréhensible en quelques secondes ?
4. Peut-on supprimer encore quelque chose ?

Si les réponses sont oui, oui, oui et oui, la situation reste probablement conforme.
