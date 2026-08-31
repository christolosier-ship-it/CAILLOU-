# CAILLOU™ — Design system et direction artistique

> **Statut : référence visuelle V1**  
> **Intention : traiter un caillou numérique avec le sérieux d’un objet de collection haut de gamme.**  
> **Règle d’or : si l’interface devient plus intéressante que le caillou, le design a échoué.**

---

## 1. Objet du document

Ce document définit l’identité visuelle et sensorielle de **CAILLOU™ V1** :

- direction artistique ;
- marque ;
- palettes ;
- typographie ;
- hiérarchie ;
- composants ;
- rendu 3D ;
- matériaux ;
- lumière ;
- caméra ;
- mouvement ;
- ambiances ;
- son ;
- haptique ;
- ton éditorial ;
- accessibilité ;
- règles anti-dérive.

Il doit être utilisé comme cahier des charges lors de la création des assets 3D et de l’interface.

Le périmètre produit est défini dans `CAHIER-DES-CHARGES-V1.md`. Les contraintes techniques sont définies dans `ARCHITECTURE-TECHNIQUE.md`.

---

# PARTIE I — IDENTITÉ

## 2. Idée directrice

CAILLOU™ repose sur un contraste :

```text
Sujet                  Traitement
────────────────────────────────────────────
un simple caillou   ×  mise en scène premium
quasi-immobilité    ×  précision de produit luxe
fonction minimale   ×  finition obsessionnelle
humour absurde      ×  ton institutionnel
objet banal          ×  statut de pièce de collection
```

La blague ne doit jamais être ajoutée par-dessus le design. **Le design lui-même est la blague.**

Un caillou éclairé comme une montre de prestige est plus drôle qu’un caillou avec des yeux et un chapeau.

---

## 3. Mots-clés visuels

### À rechercher

- minéral ;
- tactile ;
- silencieux ;
- dense ;
- sculptural ;
- naturel ;
- galerie ;
- musée contemporain ;
- photographie produit ;
- précision ;
- matière ;
- calme ;
- permanence ;
- luxe discret ;
- absurdité sèche.

### À éviter

- kawaii ;
- cartoon ;
- jouet mobile ;
- casino ;
- gamification visible ;
- interface néon ;
- science-fiction gratuite ;
- skeuomorphisme lourd ;
- géologie scolaire ;
- application de méditation stéréotypée ;
- mascotte à visage humain ;
- esthétique crypto/NFT.

---

## 4. Personnalité de marque

CAILLOU™ parle et se présente comme une institution excessivement sérieuse consacrée à la présence minérale.

### Traits

| Trait | Intensité |
|---|---:|
| Calme | 10/10 |
| Premium | 9/10 |
| Absurde | 7/10 |
| Chaleureux | 5/10 |
| Technologique | 3/10 |
| Enfantin | 0/10 |
| Frénétique | 0/10 |

L’expérience doit pouvoir faire sourire sans demander une seule animation comique explicite.

---

## 5. Nom et usage de la marque

Nom officiel :

# **CAILLOU™**

### Règles

- le nom de marque s’écrit en capitales dans les éléments de branding ;
- le symbole `™` est utilisé dans la marque, les écrans institutionnels et certaines captures, mais pas répété dans chaque phrase ;
- dans le corps éditorial, `CAILLOU™` ou `CAILLOU` sont acceptables selon le contexte ;
- le nom du spécimen utilisateur conserve la casse choisie par l’utilisateur.

### Signature principale

> **Une présence minérale de qualité.**

### Signature produit alternative

> **Enfin un compagnon qui ne demande absolument rien.**

La première est préférable dans l’interface. La seconde convient mieux à la présentation du concept.

---

## 6. Logo

### 6.1 Direction

Le logo V1 doit rester extrêmement simple :

```text
CAILLOU™
```

Le mot-symbole est l’identité principale.

Un pictogramme peut être développé pour l’icône PWA : silhouette de galet très simple, asymétrique, dense, sans visage ni détail illustratif.

### 6.2 Pictogramme

Caractéristiques :

- silhouette reconnaissable à 32 px ;
- forme organique asymétrique ;
- aucune fissure cliché ;
- pas d’yeux ;
- pas de sourire ;
- pas de bras ;
- pas de contour cartoon ;
- volume suggéré par une variation minérale subtile plutôt que par un emoji.

### 6.3 Zone de respiration

Autour du mot-symbole ou du pictogramme, conserver au minimum l’équivalent de la hauteur du `C` comme zone libre dans les compositions principales.

---

# PARTIE II — COULEUR ET TYPOGRAPHIE

## 7. Palette maîtresse

La palette doit évoquer pierre, papier, musée, charbon et métal patiné.

### 7.1 Neutres

| Token | Valeur | Usage |
|---|---|---|
| `mineral-ivory` | `#F2EFE9` | fond clair principal |
| `limestone` | `#D8D2C8` | surfaces secondaires |
| `warm-stone` | `#B9B1A5` | séparateurs, éléments désactivés |
| `graphite` | `#343330` | texte secondaire sombre |
| `basalt` | `#181817` | fond sombre / texte principal |
| `carbon` | `#0E0E0D` | scènes nocturnes, profondeur |

### 7.2 Accents

| Token | Valeur | Usage |
|---|---|---|
| `aged-bronze` | `#9A784D` | accent premium très parcimonieux |
| `ochre` | `#A66F3F` | pierre chaude / détails ponctuels |
| `moss` | `#66705C` | ambiance végétale |
| `quartz` | `#E5E1D8` | reflets et surfaces claires |

### 7.3 Règle de dosage

Dans l’UI standard :

```text
80–90 % neutres
10–15 % contrastes fonctionnels
0–5 % accent
```

CAILLOU™ ne doit jamais donner l’impression d’avoir une « couleur de marque » agressive.

Le caillou et sa matière fournissent l’essentiel de la couleur.

---

## 8. Mode clair

### Fond

`mineral-ivory`

### Surfaces

Blanc cassé légèrement plus lumineux que le fond, jamais blanc clinique pur partout.

### Texte

- principal : `basalt` ;
- secondaire : `graphite` ;
- faible emphase : gris dérivé de `warm-stone` avec contraste vérifié.

### Accent

`aged-bronze` uniquement pour :

- état sélectionné ;
- détail de distinction ;
- petit filet ;
- iconographie exceptionnelle.

---

## 9. Mode sombre

Le mode sombre n’est pas noir OLED uniforme.

### Fond

`#111110` à `#181817` selon surface.

### Surfaces

Graphite très sombre avec différences de luminance discrètes.

### Texte

Ivoire chaud plutôt que blanc pur.

### Accent

Bronze désaturé ou quartz selon contraste.

Le mode sombre doit ressembler à une galerie après fermeture, pas à une interface gaming.

---

## 10. Typographie

### 10.1 Direction

La typographie doit être contemporaine, nette et légèrement éditoriale.

Recommandation V1 :

- une **sans-serif premium et neutre** pour l’ensemble de l’interface ;
- éventuellement une **serif éditoriale très limitée** pour les noms de spécimens ou certaines plaques muséales, seulement si le contraste reste élégant.

### 10.2 Choix pratique

Priorité à une police libre pouvant être embarquée localement et utilisée hors ligne.

Candidats à évaluer visuellement au prototype :

- Instrument Sans ;
- Inter ;
- Manrope ;
- Geist Sans.

Option éditoriale secondaire à tester, sans obligation :

- Instrument Serif.

La licence exacte et les fichiers nécessaires devront être vérifiés avant intégration.

### 10.3 Fallback

```css
font-family:
  "Instrument Sans",
  "Inter",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### 10.4 Échelle typographique

| Style | Taille cible mobile | Usage |
|---|---:|---|
| Display | 40–52 px | CAILLOU™, onboarding exceptionnel |
| H1 | 28–34 px | nom du caillou, titre écran |
| H2 | 20–24 px | sections |
| Body | 16–18 px | texte principal |
| Small | 13–14 px | métadonnées |
| Micro | 11–12 px | plaque, label très secondaire |

### 10.5 Graisses

Limiter les graisses :

- Regular 400 ;
- Medium 500 ;
- Semibold 600.

Éviter les ExtraBold et Black qui casseraient le raffinement général.

### 10.6 Capitales

Les capitales sont réservées :

- à la marque ;
- à quelques labels institutionnels ;
- aux micro-métadonnées.

Les phrases normales restent en casse naturelle.

---

# PARTIE III — ESPACE ET COMPOSITION

## 11. Grille

### Mobile

- marge latérale : 20–24 px ;
- grille conceptuelle 4 colonnes ;
- composants fluides.

### Tablette

- marge : 32–48 px ;
- grille 8 colonnes.

### Desktop

- largeur UI maximale contrôlée ;
- Canvas généreux ;
- grilles 12 colonnes si nécessaire, sans transformer le produit en dashboard.

---

## 12. Échelle d’espacement

Token de base : `4 px`.

```text
4
8
12
16
24
32
48
64
96
```

Le produit doit respirer. Entre deux blocs importants, préférer trop d’espace à une accumulation de cartes.

---

## 13. Rayons

Les surfaces ne doivent être ni complètement carrées ni « app mobile bonbon ».

| Élément | Rayon cible |
|---|---:|
| boutons compacts | 10–12 px |
| cartes | 16–20 px |
| sheets | 24–28 px en haut |
| chips | 999 px si réellement une pilule |

Éviter un rayon de 30 px appliqué à tout sans distinction.

---

## 14. Élévation

Les ombres de l’interface restent extrêmement discrètes.

Le relief principal appartient à la scène 3D.

### Surfaces UI

Préférer :

- contraste de fond ;
- bord très subtil ;
- légère ombre diffuse.

Éviter :

- grosse drop shadow noire ;
- glassmorphism généralisé ;
- glow lumineux.

---

# PARTIE IV — SCÈNE 3D

## 15. Principe de rendu

Le caillou doit pouvoir être montré isolément dans une capture et rester crédible.

Test de qualité :

> Si l’on retire toute l’interface et le logo, l’image doit encore ressembler à une photographie produit premium d’un véritable objet minéral.

---

## 16. Géométrie des cailloux

### 16.1 Silhouette

Chaque spécimen doit posséder une silhouette immédiatement différente.

La différence ne doit pas reposer uniquement sur une texture.

Exemples :

- Galet de rivière : forme aplatie, arrondie, légère asymétrie ;
- Pierre volcanique : masse irrégulière, cavités, angles émoussés ;
- Quartz : silhouette cassée plus cristalline mais non caricaturale ;
- Granite : forme plus anguleuse et dense ;
- Ocre : pierre naturelle irrégulière et douce ;
- Galet noir : forme minimaliste, presque sculptée par l’eau.

### 16.2 Imperfection

Aucune symétrie parfaite.

Le réalisme vient de :

- micro-asymétries ;
- bordures irrégulières ;
- variations de courbure ;
- petits défauts ;
- surface non uniforme.

### 16.3 Densité géométrique

Le maillage doit être suffisamment dense pour conserver la silhouette sous rotation et lumière rasante, mais pas utilisé pour simuler des micro-détails qui devraient être dans les normales/textures.

Le budget exact doit être défini par profilage.

---

## 17. Textures et matière

### 17.1 Maps recommandées

Selon spécimen :

- base color/albedo ;
- normal ;
- roughness ;
- ambient occlusion si visible ;
- éventuellement bump/height maîtrisé.

### 17.2 Rugosité

La pierre ne doit pas être traitée comme du plastique.

La roughness doit présenter des variations locales fines.

Même le galet noir premium ne doit pas devenir un bonbon brillant : il peut avoir des zones satinées, polies par l’eau, mais conserver une réponse minérale.

### 17.3 Échelle des détails

Trois niveaux visuels :

```text
silhouette     visible à distance
macro-texture  visible en rotation
micro-texture  visible au zoom
```

Le zoom doit révéler quelque chose : grains, pores, strates, petites irrégularités.

### 17.4 Couleur

Éviter les noirs bouchés et blancs purs dans les textures.

Conserver assez d’information pour que la lumière définisse le volume.

---

## 18. Spécimens — direction détaillée

### 18.1 Galet de rivière

**Palette :** gris chaud moyen, nuances froides ponctuelles.  
**Surface :** lisse mais pas miroir.  
**Forme :** aplatie, douce, rassurante.  
**Détail signature :** petite veine ou zone légèrement plus claire.  
**Éclairage idéal :** grande source douce latérale.

### 18.2 Pierre volcanique

**Palette :** charbon, brun très sombre, cendres.  
**Surface :** poreuse, micro-cavités crédibles.  
**Forme :** irrégulière et plus verticale.  
**Détail signature :** quelques cavités profondes mais lisibles.  
**Attention :** ne pas la transformer en astéroïde de science-fiction.

### 18.3 Quartz pâle

**Palette :** blanc cassé, beige froid, transparence très limitée.  
**Surface :** zones cristallines et cassures.  
**Forme :** plus angulaire.  
**Détail signature :** profondeur interne légère.  
**Attention :** le shader ne doit pas coûter disproportionnellement cher pour un effet de réfraction invisible sur mobile.

### 18.4 Caillou granitique

**Palette :** gris clair à moyen, grains noirs et crème.  
**Surface :** grenue, dense.  
**Forme :** robuste et légèrement trapue.  
**Détail signature :** grain minéral visible au zoom.

### 18.5 Pierre ocre

**Palette :** terre cuite atténuée, sable, ocre chaud.  
**Surface :** mate, légèrement friable visuellement.  
**Forme :** naturelle et irrégulière.  
**Détail signature :** variation de strate très discrète.

### 18.6 Galet noir premium

**Palette :** anthracite profond, jamais noir absolu.  
**Surface :** satin minéral, zones plus polies.  
**Forme :** compacte, lisse, très belle en silhouette.  
**Détail signature :** reflet doux continu qui se déplace pendant la rotation.  
**C’est le spécimen vitrine de l’application.**

---

## 19. Échelle et socle

Le caillou doit occuper généralement **45 à 65 % de la hauteur utile de la scène** selon orientation.

Il ne flotte pas visiblement.

Le contact avec le support doit être crédible :

- vraie position de repos ;
- ombre de contact ;
- légère occlusion ;
- aucune pénétration géométrique évidente.

Le socle ne doit jamais être plus spectaculaire que l’objet.

---

## 20. Caméra

### 20.1 Perspective

Utiliser une perspective peu déformante, proche de la photographie produit.

Plage initiale à tester :

- FOV environ `28° à 35°` ;
- distance ajustée selon bounding box ;
- pas de grand-angle.

### 20.2 Position initiale

Le modèle n’est pas obligatoirement parfaitement frontal ou centré mathématiquement.

Une légère asymétrie peut renforcer la sensation photographique.

### 20.3 Zoom

Le zoom maximal doit permettre de lire la matière sans entrer dans la géométrie.

Le zoom minimal conserve le caillou comme sujet principal.

### 20.4 Mouvement caméra

Aucun mouvement permanent.

En Mode Observation, un déplacement quasi imperceptible peut être testé, mais doit être désactivé en reduced motion et supprimé s’il donne une sensation de « démo 3D ».

---

## 21. Éclairage

### 21.1 Philosophie

Éclairer le caillou comme un photographe produit, pas comme un niveau de jeu vidéo.

### 21.2 Schéma de base

```text
        Rim
         ↘

Fill →  CAILLOU  ← Key large

       Contact shadow
```

### 21.3 Key light

- source large ;
- douce ;
- légèrement latérale et haute ;
- crée la lecture principale de la forme.

### 21.4 Fill

- faible ;
- empêche les ombres bouchées ;
- ne doit pas aplatir le volume.

### 21.5 Rim

- très discret ;
- sépare la silhouette du fond ;
- particulièrement utile pour la pierre noire.

### 21.6 Ombre

- contact net au point d’appui ;
- diffusion progressive ;
- jamais une ellipse générique trop noire sous l’objet.

### 21.7 Exposition

Les highlights doivent conserver de la matière. Pas de zones brûlées massives sur le quartz ou le galet poli.

---

# PARTIE V — AMBIANCES

## 22. Studio minéral

### Intention

Le caillou comme produit de prestige.

### Décor

- cyclorama minimal ;
- surface mate ;
- aucune décoration visible nécessaire.

### Lumière

- lumière studio douce ;
- contraste contrôlé ;
- excellente lecture de roughness.

### Son

Quasi-silence. Éventuellement très léger bruit de pièce.

### Rôle

Ambiance par défaut et référence de calibration des matériaux.

---

## 23. Jardin zen

### Intention

Présence minérale calme sans tomber dans la caricature « méditation app ».

### Décor

- sable fin ;
- quelques sillons subtils ;
- éventuellement un élément secondaire flou ;
- composition sobre.

### Lumière

Naturelle, matinale ou fin d’après-midi légère.

### Son

Vent extrêmement doux, quelques grains, aucun gong obligatoire.

### Interdit

- bouddha décoratif ;
- bambou cliché ;
- musique zen générique.

---

## 24. Mousse

### Intention

Le caillou semble trouvé dans un sous-bois humide mais photographié avec soin.

### Décor

- mousse courte ;
- sol sombre ;
- profondeur de champ visuelle discrète.

### Lumière

Diffuse, verte seulement par rebond, jamais filtre vert global.

### Son

Ambiance forestière quasi imperceptible.

### Micro-événement privilégié

Petite goutte d’eau ou insecte lointain.

---

## 25. Bois noble

### Intention

Le caillou devient objet de bureau ou pièce domestique de collection.

### Décor

- bois naturel sombre ou noyer ;
- grain réaliste ;
- fond très simple.

### Lumière

Chaude mais pas orange.

### Son

Silence intérieur.

### Danger

Éviter l’esthétique « publicité parfum cliché » avec trop de doré.

---

## 26. Vitrine muséale

### Intention

Le niveau maximal du sérieux absurde.

### Décor

- socle sobre ;
- plaque institutionnelle ;
- fond de galerie ;
- éventuel textile ou pierre claire.

### Plaque exemple

```text
BERNARD
Galet de rivière
Collection particulière
Activité observée : faible
```

### Lumière

Spot de galerie doux + remplissage invisible.

### Son

Ambiance de salle vide presque inaudible.

---

# PARTIE VI — INTERFACE

## 27. Le Socle

L’écran principal doit être construit autour du Canvas et non l’inverse.

Composition mobile recommandée :

```text
┌─────────────────────────┐
│ CAILLOU™            ··· │
│                         │
│                         │
│       [ CAI LLOU ]      │
│          3D             │
│                         │
│                         │
│        BERNARD          │
│  Présence stable.       │
│                         │
│  Fiche  Ambiance  Photo │
└─────────────────────────┘
```

Le mot-symbole peut devenir encore plus discret après le premier lancement.

---

## 28. Navigation

### Principe

Peu d’options visibles à la fois.

Sur téléphone, privilégier :

- barre d’actions compacte en bas ;
- bottom sheets pour les contenus secondaires ;
- plein écran uniquement lorsque la tâche le justifie.

Éviter :

- menu hamburger contenant vingt entrées ;
- rail latéral façon dashboard ;
- cinq onglets permanents si quatre actions discrètes suffisent.

---

## 29. Boutons

### Bouton principal

- fond basalt ou ivoire selon thème ;
- contraste fort ;
- texte court ;
- hauteur tactile confortable ;
- pas de gradient.

### Bouton secondaire

- surface légère ou contour discret ;
- jamais concurrent du bouton principal.

### Bouton iconique

- minimum tactile 44 × 44 px ;
- icône 18–22 px ;
- état hover/focus/pressed clair.

### Pressed

Micro-réduction ou variation de fond très légère.

Pas de rebond cartoon.

---

## 30. Cartes et sheets

Les cartes ne doivent pas devenir le langage universel de l’application.

Utiliser une carte lorsqu’un contenu est réellement groupé :

- spécimen dans la collection ;
- statistique éditoriale ;
- ambiance à sélectionner.

Les sheets mobiles doivent laisser voir ou sentir la scène derrière lorsque possible.

---

## 31. Icônes

Style :

- ligne simple ;
- poids homogène ;
- géométrie sobre.

Lucide convient comme base si les icônes retenues restent cohérentes.

Éviter les emojis comme iconographie fonctionnelle principale.

---

## 32. États de chargement

Le chargement d’un modèle ne doit pas afficher un spinner générique au milieu du caillou.

Approche recommandée :

1. fond d’ambiance disponible immédiatement ;
2. silhouette minérale mate ou placeholder de volume ;
3. léger fondu vers le modèle texturé quand il est prêt.

Texte éventuel :

> « Préparation du spécimen. »

Pas de faux pourcentage si aucune progression fiable n’est disponible.

---

## 33. État d’erreur 3D

Si WebGL ou l’asset échoue :

- conserver l’interface ;
- afficher une représentation 2D propre si disponible ;
- message sobre.

Exemple :

> « Le spécimen n’a pas pu être présenté en trois dimensions. Sa stabilité n’est pas remise en cause. »

Action : **Réessayer**.

L’humour ne doit pas masquer l’information utile.

---

# PARTIE VII — MOUVEMENT

## 34. Philosophie d’animation

Le mouvement doit donner du poids.

Un caillou :

- ne bondit pas ;
- ne flotte pas ;
- ne danse pas ;
- ne respire pas ;
- ne cligne pas des yeux, puisqu’il n’en possède pas.

L’animation sert principalement :

- la manipulation ;
- les transitions ;
- la lumière ;
- les événements environnementaux.

---

## 35. Rotation manuelle

### Sensation

Dense, légèrement inertielle.

### Après relâchement

- inertie courte ;
- décélération naturelle ;
- arrêt franc mais doux.

Pas de rotation infinie automatique.

### Vertical

Limiter l’angle afin que le caillou conserve une présentation plausible sur son socle.

---

## 36. Tap

Un tap peut produire :

1. micro-réaction de lumière ;
2. déplacement quasi imperceptible ou aucun déplacement ;
3. haptique court ;
4. son minéral léger ;
5. observation textuelle occasionnelle.

Ne pas déclencher les cinq éléments systématiquement à chaque tap.

---

## 37. Transitions UI

Durées indicatives :

| Type | Durée |
|---|---:|
| feedback immédiat | 100–160 ms |
| bouton / hover | 120–180 ms |
| sheet | 220–320 ms |
| changement d’ambiance | 500–900 ms |
| événement contemplatif | plusieurs secondes si non bloquant |

Courbes : accélérations naturelles, pas de bounce.

---

## 38. Reduced motion

Lorsque `prefers-reduced-motion: reduce` est actif :

- inertie fortement réduite ;
- transitions simplifiées ;
- aucun mouvement caméra automatique ;
- micro-événements animés remplacés ou raccourcis ;
- fades courts acceptables.

Le caillou reste manipulable.

---

# PARTIE VIII — SON ET HAPTIQUE

## 39. Sound design

CAILLOU™ ne possède pas de bande-son permanente obligatoire.

Le silence fait partie du design.

### Familles sonores

- contact pierre/surface ;
- frottement très léger ;
- ambiance de décor ;
- éventuellement petit accent lors d’une distinction.

### Caractéristiques

- faible volume ;
- dynamique douce ;
- sons courts ;
- peu de hautes fréquences agressives ;
- pas de jingles mobiles génériques.

---

## 40. Son de contact

Le son signature doit être un **petit toc minéral sec et élégant**.

Pas :

- `boing` ;
- bruit de cartoon ;
- cloche ;
- explosion ;
- bruit de pierre énorme disproportionné.

Plusieurs variantes proches sont recommandées pour éviter la répétition exacte.

---

## 41. Haptique

Quand disponible :

- impulsion très courte lors d’un contact ;
- intensité faible ;
- jamais nécessaire à la compréhension ;
- désactivable.

Éviter les séquences vibratoires longues qui transformeraient le caillou en gadget.

---

# PARTIE IX — TON ÉDITORIAL

## 42. Voix

CAILLOU™ s’exprime comme un conservateur de musée doté d’un sens de l’absurde très sec.

### Structure typique

```text
constat factuel sérieux
+
objet ridiculement banal
=
humour
```

Exemple :

> « Aucun déplacement spontané n’a été observé. »

L’application n’ajoute pas :

> « 😂 Parce que c’est un caillou !!! »

La première phrase suffit.

---

## 43. Lexique privilégié

Utiliser :

- spécimen ;
- présence ;
- état ;
- stabilité ;
- observation ;
- minéral ;
- masse ;
- surface ;
- activité ;
- période ;
- reconnaissance ;
- collection ;
- distinction ;
- remarquable ;
- conforme ;
- mesuré.

Avec modération :

- géologique ;
- lithique ;
- sédimentaire ;
- minéralogique.

Les termes scientifiques ne doivent pas prétendre à une rigueur réelle lorsque la donnée est fictive.

---

## 44. Exemples de statuts conformes

- « Présence stable. »
- « Aucun changement significatif. »
- « Activité particulièrement contenue. »
- « État minéral satisfaisant. »
- « Stabilité remarquable depuis la dernière observation. »
- « Votre spécimen conserve un excellent niveau de roche. »
- « Aucun projet immédiat n’a été communiqué. »
- « Mobilité spontanée non détectée. »
- « Journée techniquement réussie. »
- « La situation reste minérale. »
- « Dignité intacte. »
- « Rien à signaler. Ce qui est encourageant. »

---

## 45. Réactions conformes

Après tap :

- « Contact enregistré. »
- « Réaction mesurée. »
- « Aucun mouvement de panique. »
- « Surface contrôlée. »
- « Interaction tolérée. »

Après rotation :

- « Orientation révisée. »
- « Nouvel angle validé. »

Après longue absence :

- « La situation est restée sous contrôle. »
- « Aucun développement préoccupant. »
- « [Nom] poursuit ses activités habituelles. »

Aucune phrase ne doit reprocher l’absence.

---

## 46. Humour interdit

Éviter :

- memes datés ;
- références pop permanentes ;
- grossièretés gratuites ;
- humour agressif ;
- humour enfantin ;
- jeux de mots sur chaque écran ;
- géologie volontairement fausse présentée comme vraie ;
- caillou qui supplie l’utilisateur de revenir.

Le produit doit encore faire sourire dans plusieurs années.

---

# PARTIE X — ÉCRANS SPÉCIFIQUES

## 47. Onboarding

### Écran d’accueil

Beaucoup d’espace négatif.

```text
        CAILLOU™

   [un magnifique galet]

 Une présence minérale de qualité.

   Commencer l’adoption
```

Pas de carrousel de six slides marketing.

### Sélection

Les spécimens sont traités comme des objets de showroom :

- grande image/3D ;
- nom ;
- trois propriétés ;
- navigation horizontale ou grille selon écran.

### Nommage

Champ unique, élégant, autofocus contrôlé.

La scène reste visible si possible.

---

## 48. Fiche minérale

Direction : carte de musée + fiche produit.

Hiérarchie :

```text
BERNARD
Galet noir premium

Référence minérale

Adopté le …
Présence …
Mobilité …
Interactions …

[statistiques absurdes]
```

Les chiffres ne doivent pas ressembler à un dashboard analytique saturé de graphiques.

Pas de donut chart pour indiquer que le caillou ne bouge pas.

---

## 49. Collection

Le mot « collection » ne justifie pas une grille de cartes façon marketplace.

Présentation possible :

- galerie horizontale ;
- vitrine ;
- chaque spécimen bien espacé ;
- état actif clairement indiqué ;
- aucune rareté colorée.

Les cailloux non adoptés peuvent être visibles sans cadenas agressif.

---

## 50. Instantané

Le mode photo doit masquer toute interface inutile.

Options limitées :

- cadrage ;
- nom on/off ;
- légende on/off ;
- partager ;
- enregistrer.

### Branding de capture

Très discret :

```text
CAILLOU™
```

petit, dans un coin, avec éventuellement nom et variété.

La capture doit rester assez belle pour être partagée sans ressembler à une publicité.

---

# PARTIE XI — ICÔNE ET PWA

## 51. Icône d’application

### Composition

- fond ivoire ou basalte ;
- un seul galet sombre ou clair ;
- vue légèrement en trois quarts ;
- lumière douce ;
- aucun texte dans les petites tailles.

### Contraintes

L’icône doit fonctionner :

- à 512 px ;
- à 192 px ;
- à 60–76 px sur écran d’accueil ;
- avec masque adaptatif quand la plateforme l’applique.

La silhouette doit donc porter l’identité, pas la micro-texture.

---

## 52. Splash / lancement

Simple :

```text
fond uni
CAILLOU™
petite silhouette minérale
```

Pas d’animation longue imposée à chaque ouverture.

Le meilleur écran de lancement est celui qui disparaît rapidement.

---

# PARTIE XII — ACCESSIBILITÉ VISUELLE

## 53. Contraste

Tous les textes fonctionnels doivent respecter un contraste accessible indépendamment de la scène 3D.

Ne jamais poser un texte directement sur une texture mouvante sans surface ou traitement assurant la lisibilité.

---

## 54. Taille et zoom

L’interface doit tolérer l’agrandissement du texte sans cacher les actions principales.

Les labels critiques ne sont pas exclusivement des icônes.

---

## 55. Couleur

Un spécimen sélectionné ne doit pas être indiqué uniquement par le bronze : ajouter également coche, texte ou structure.

---

## 56. Mouvement et clignotement

Aucun flash rapide.

Les changements lumineux restent progressifs et modérés.

---

# PARTIE XIII — DESIGN TOKENS

## 57. Tokens CSS initiaux

Base indicative à ajuster pendant le prototype :

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
  --duration-scene: 700ms;
}
```

Ces valeurs servent de point de départ, pas de justification pour ignorer les tests visuels.

---

## 58. Tokens 3D

Les réglages de lumière doivent également devenir des presets centralisés, pas des nombres magiques dispersés.

Exemple conceptuel :

```ts
const studioMineral = {
  camera: {
    fov: 32,
    minDistance: 2.2,
    maxDistance: 5.0,
  },
  light: {
    keyIntensity: 3.0,
    fillIntensity: 0.8,
    rimIntensity: 1.1,
  },
  render: {
    exposure: 1.0,
  },
}
```

Les valeurs finales doivent être calibrées sur les vrais assets, pas copiées aveuglément depuis cet exemple.

---

# PARTIE XIV — CRITÈRES DE QUALITÉ DES ASSETS

## 59. Revue obligatoire d’un caillou

Avant validation d’un modèle :

### Silhouette

- [ ] reconnaissable sans texture ;
- [ ] asymétrie naturelle ;
- [ ] aucune facette involontaire visible.

### Matière

- [ ] pas d’aspect plastique ;
- [ ] roughness variée ;
- [ ] détails crédibles au zoom ;
- [ ] pas de répétition de texture évidente.

### Éclairage

- [ ] lisible en Studio ;
- [ ] lisible en ambiance sombre ;
- [ ] highlights non brûlés ;
- [ ] ombres non bouchées.

### Mobile

- [ ] rendu vérifié sur vrai smartphone ;
- [ ] rotation fluide ;
- [ ] poids conforme au budget ;
- [ ] temps de chargement acceptable.

### Identité

- [ ] clairement distinct des cinq autres ;
- [ ] suffisamment beau pour être choisi comme premier caillou ;
- [ ] aucune décoration cartoon ajoutée pour le rendre « intéressant ».

---

## 60. Revue obligatoire d’une ambiance

- [ ] le caillou reste le sujet dominant ;
- [ ] la lumière améliore la matière ;
- [ ] le décor ne paraît pas vide par accident mais minimal volontairement ;
- [ ] aucune référence culturelle cliché inutile ;
- [ ] fonctionne avec les 6 spécimens ;
- [ ] contraste UI vérifié ;
- [ ] coût GPU raisonnable ;
- [ ] sound design facultatif et discret.

---

# PARTIE XV — ANTI-PATTERNS

## 61. Ce qui ferait immédiatement perdre l’identité CAILLOU™

### Visuel

- yeux collés sur le caillou ;
- bouche animée ;
- chapeau de fête permanent ;
- couleurs arc-en-ciel ;
- particules dans tous les sens ;
- grosse barre XP ;
- étoiles de rareté ;
- coffres ;
- confettis à chaque action ;
- arrière-plan spatial sans raison ;
- neon cyberpunk.

### UX

- popup quotidienne ;
- récompense « reviens demain » ;
- menu complexe ;
- dashboard statistique ;
- tutoriel long ;
- bouton partout ;
- badges rouges de notification.

### Ton

- « Bernard a faim ! » ;
- « Ton caillou est triste 😭 » ;
- « SUPER !!! +500 ROCK COINS » ;
- « Vite, reviens avant minuit ! »

Tout cela appartient à un autre produit.

---

# PARTIE XVI — RÈGLES POUR LES ÉVOLUTIONS FUTURES

## 62. Accessoires éventuels

Si des accessoires sont introduits après V1, ils doivent rester :

- rares ;
- sobres ;
- visuellement crédibles ;
- facultatifs ;
- jamais nécessaires à l’état du caillou.

Exemple acceptable : petit socle alternatif ou plaque.

Exemple risqué : lunettes, moustache, dizaines de costumes.

Le second transforme immédiatement le produit en mascotte cartoon.

---

## 63. Nouveaux spécimens

Chaque nouveau caillou doit apporter une vraie différence :

- silhouette ;
- origine visuelle ;
- matériau ;
- réponse lumineuse.

Ne pas créer vingt recolorations du même mesh.

---

## 64. Nouvelles ambiances

Une ambiance doit être conçue autour d’une lumière et d’une relation matière/environnement, pas uniquement d’un fond différent.

Question de validation :

> « Cette ambiance permet-elle de regarder le même caillou autrement ? »

Si la réponse est non, elle n’est pas nécessaire.

---

# PARTIE XVII — VISION DU PREMIER ÉCRAN FINAL

## 65. Expérience recherchée

L’utilisateur ouvre CAILLOU™.

Le fond apparaît presque immédiatement.

Le caillou est déjà là ou se révèle en douceur.

Il reçoit une lumière latérale lente et naturelle.

En dessous :

**BERNARD**

> Présence stable. Dignité intacte.

Trois ou quatre commandes discrètes.

L’utilisateur glisse le doigt.

Bernard tourne avec du poids.

La lumière accroche une zone polie qu’il n’avait pas encore remarquée.

Il relâche.

Le caillou s’arrête.

Un petit toc minéral se fait entendre s’il le touche.

Rien d’autre ne réclame son attention.

**C’est exactement l’expérience.**

---

# 66. Checklist de validation V1 visuelle

## Marque

- [ ] mot-symbole final ;
- [ ] pictogramme final ;
- [ ] icône PWA ;
- [ ] variantes clair/sombre.

## UI

- [ ] tokens finalisés ;
- [ ] typographie embarquée/licenciée ;
- [ ] Socle mobile ;
- [ ] tablette ;
- [ ] desktop ;
- [ ] onboarding ;
- [ ] fiche ;
- [ ] collection ;
- [ ] ambiances ;
- [ ] instantané ;
- [ ] réglages ;
- [ ] états loading/error/empty ;
- [ ] focus et reduced motion.

## 3D

- [ ] 6 silhouettes distinctes ;
- [ ] textures finales ;
- [ ] roughness calibrée ;
- [ ] 5 presets d’ambiance ;
- [ ] caméra finale ;
- [ ] ombre de contact ;
- [ ] qualité mobile ;
- [ ] capture haute qualité.

## Sensoriel

- [ ] son contact ;
- [ ] variantes audio ;
- [ ] sons d’ambiance ;
- [ ] haptique subtil ;
- [ ] expérience cohérente son désactivé.

## Ton

- [ ] aucun écran bavard ;
- [ ] humour sec ;
- [ ] aucun reproche après absence ;
- [ ] aucune mécanique anxiogène ;
- [ ] le caillou reste un caillou.

---

# 67. Règle finale de direction artistique

Avant de valider n’importe quel écran, asset ou animation, poser trois questions :

1. **Le caillou paraît-il réellement beau ?**
2. **Le traitement paraît-il légèrement trop sérieux pour ce qu’il représente ?**
3. **Peut-on supprimer encore quelque chose ?**

Si les réponses sont **oui, oui, oui**, CAILLOU™ est probablement sur la bonne pierre.
