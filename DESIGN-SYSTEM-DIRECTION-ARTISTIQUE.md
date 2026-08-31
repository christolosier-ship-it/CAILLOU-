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
- showroom de sélection ;
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
20 pierres quelconques × casting traité comme de la haute joaillerie
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
- géologie scolaire ;
- marketplace ;
- cartes de rareté ;
- esthétique crypto/NFT.

---

## 4. Personnalité de marque

CAILLOU™ se présente comme une institution excessivement sérieuse consacrée à la présence minérale.

| Trait | Intensité |
|---|---:|
| Calme | 10/10 |
| Premium | 9/10 |
| Absurde | 7/10 |
| Chaleureux | 5/10 |
| Technologique | 3/10 |
| Enfantin | 0/10 |
| Frénétique | 0/10 |

---

## 5. Marque

Nom officiel :

# **CAILLOU™**

Signature principale :

> **Une présence minérale de qualité.**

Signature alternative :

> **Enfin un compagnon qui ne demande absolument rien.**

Le mot-symbole reste extrêmement simple. L’icône PWA peut utiliser une silhouette de pierre asymétrique, sans visage ni détail cartoon.

---

# PARTIE II — COULEUR ET TYPOGRAPHIE

## 6. Palette maîtresse

| Token | Valeur | Usage |
|---|---|---|
| `mineral-ivory` | `#F2EFE9` | fond clair principal |
| `limestone` | `#D8D2C8` | surfaces secondaires |
| `warm-stone` | `#B9B1A5` | séparateurs |
| `graphite` | `#343330` | texte secondaire |
| `basalt` | `#181817` | fond sombre / texte |
| `carbon` | `#0E0E0D` | profondeur |
| `aged-bronze` | `#9A784D` | accent premium |
| `ochre` | `#A66F3F` | accent chaud |
| `moss` | `#66705C` | ambiance végétale |
| `quartz` | `#E5E1D8` | reflets / surfaces claires |

Dosage :

```text
80–90 % neutres
10–15 % contrastes fonctionnels
0–5 % accent
```

Le caillou fournit l’essentiel de la couleur.

---

## 7. Typographie

Direction : contemporaine, nette, légèrement éditoriale.

Candidats :

- Instrument Sans ;
- Inter ;
- Manrope ;
- Geist Sans.

Option secondaire très limitée : Instrument Serif.

Échelle indicative mobile :

| Style | Taille |
|---|---:|
| Display | 40–52 px |
| H1 | 28–34 px |
| H2 | 20–24 px |
| Body | 16–18 px |
| Small | 13–14 px |
| Micro | 11–12 px |

Limiter les graisses à 400, 500 et 600.

---

# PARTIE III — ESPACE ET COMPOSITION

## 8. Grille

### Mobile

- marge latérale 20–24 px ;
- scène 3D dominante ;
- commandes tactiles au bord sans étouffer le sujet.

### Tablette

- marge 32–48 px ;
- Canvas généreux ;
- paysage traité comme un vrai format.

### Desktop

- Canvas centré ;
- largeur UI maîtrisée ;
- aucune transformation en dashboard.

---

## 9. Espacement et surfaces

Échelle : `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`.

Rayons indicatifs :

- boutons : 10–12 px ;
- cartes rares : 16–20 px ;
- sheets : 24–28 px.

Les ombres UI sont discrètes. Le relief principal appartient à la scène 3D.

---

# PARTIE IV — LES 20 SPÉCIMENS

## 10. Nouvelle règle de catalogue

La V1 ne repose plus sur six archétypes visuels prédéfinis.

Elle présente **vingt cailloux réels, quelconques et différents**, issus des scans retenus.

Leur intérêt vient de :

- leur forme réelle ;
- leurs irrégularités ;
- leur matière ;
- leur couleur ;
- leur façon d’accrocher la lumière.

Aucune pierre ne doit être artificiellement transformée en « quartz », « volcanique », « rare » ou « premium » pour lui donner une fonction marketing.

Le produit assume pleinement :

> **Voici vingt cailloux. Choisissez-en un.**

---

## 11. Nommage avant adoption

Avant que l’utilisateur nomme son compagnon, utiliser une nomenclature neutre :

```text
Spécimen 01
Spécimen 02
...
Spécimen 20
```

Éviter les noms commerciaux qui suggèrent une hiérarchie.

Après adoption, le nom choisi par l’utilisateur devient l’identité principale.

---

## 12. Égalité visuelle

Les vingt spécimens doivent bénéficier :

- du même niveau de finition ;
- du même preset de lumière dans le showroom ;
- d’une caméra auto-ajustée selon leur bounding box ;
- du même espace à l’écran ;
- du même niveau de présence éditoriale ;
- d’aucun badge de rareté.

Un caillou ne doit pas paraître « meilleur » uniquement parce que son éclairage est plus flatteur.

---

## 13. Géométrie

Base V1 validée : meshes LOD2 autour de 10 000 triangles.

Critères visuels :

- silhouette naturelle ;
- aucune facette gênante ;
- UV corrects ;
- détails majeurs conservés ;
- rotation lisible sous lumière rasante.

Le réalisme vient autant des normales et de la lumière que de la densité géométrique.

---

## 14. Textures et matière

Maps prioritaires :

- base color ;
- normal ;
- roughness calibrée ;
- AO uniquement si utile.

La pierre ne doit jamais ressembler à du plastique.

Trois niveaux de lecture :

```text
silhouette     visible immédiatement
macro-texture  visible en rotation
micro-texture  visible au zoom
```

Les noirs restent détaillés, les blancs ne brûlent pas, les normales ne doivent pas sembler exagérées.

---

# PARTIE V — SHOWROOM 3D DE SÉLECTION

## 15. Principe

La sélection initiale est une **expérience 3D plein écran**, pas une grille de fiches.

Un seul caillou occupe la scène à la fois.

L’utilisateur doit pouvoir se dire :

> « Celui-là. Je ne sais pas pourquoi, mais c’est lui. »

---

## 16. Composition mobile

```text
┌─────────────────────────────┐
│           CAILLOU™          │
│                             │
│                             │
│  ‹        [ROCHE]        ›  │
│             3D              │
│                             │
│                             │
│          07 / 20            │
│        Spécimen 07          │
│                             │
│  Une stabilité prometteuse. │
│                             │
│    Adopter ce caillou       │
└─────────────────────────────┘
```

Le caillou doit occuper environ **50 à 65 % de la hauteur utile de la zone 3D**.

---

## 17. Navigation gauche / droite

### Flèches

Les flèches sont :

- grandes zones tactiles ;
- graphiquement discrètes ;
- placées à gauche et à droite du sujet ;
- disponibles en permanence ;
- jamais décoratives.

Elles doivent sembler appartenir à une vitrine, pas à un slider publicitaire.

### Clavier

Sur desktop : touches gauche/droite.

### Swipe

Le swipe horizontal peut compléter les flèches si les tests montrent qu’il ne concurrence pas la rotation.

La priorité reste :

```text
drag sur caillou = rotation
flèches = navigation
```

---

## 18. Rotation dans le showroom

Le caillou doit pouvoir être examiné avant adoption.

Sensation :

- dense ;
- légèrement inertielle ;
- aucune rotation automatique permanente ;
- mouvement vertical limité ;
- zoom raisonnable.

La manipulation est la preuve que l’utilisateur choisit un **objet**, pas une image.

---

## 19. Changement de spécimen

Le changement précédent/suivant ne doit pas évoquer une carte qui glisse dans un carrousel.

Séquence visuelle recommandée :

1. légère baisse d’opacité / lumière du spécimen courant ;
2. disparition courte ;
3. maintien du Studio et des textes stables ;
4. placeholder minéral ou dernière image figée pendant le chargement ;
5. apparition douce du nouveau spécimen ;
6. lumière qui se stabilise rapidement.

Durée perçue cible : courte et calme.

Pas de tourbillon, zoom spectaculaire, flip 3D ou transition arcade.

---

## 20. Un seul objet 3D à l’écran

La transition ne doit pas nécessiter deux cailloux 3D simultanés.

Si un masque est nécessaire pendant le chargement, utiliser :

- silhouette neutre ;
- preview 2D ;
- dernier frame figé ;
- fondu du fond.

Le changement doit rester élégant même si le réseau prend un instant.

---

## 21. Compteur

Format recommandé :

```text
07 / 20
```

ou, pour accessibilité textuelle :

```text
Spécimen 7 sur 20
```

Le compteur est une information de position, pas une jauge de progression.

Aucun pourcentage de « collection complétée ».

---

## 22. Texte du showroom

Le texte doit rester minimal.

Exemples :

> « Surface régulière. Intentions inconnues. »

> « Présence compacte. »

> « Orientation convenable. »

> « Une stabilité prometteuse. »

> « Aucun défaut diplomatique visible. »

Ne pas attribuer une personnalité complète à chacun avant adoption.

---

## 23. CTA d’adoption

Libellé recommandé :

**Adopter ce caillou**

Le bouton est clair, stable, sans animation de vente.

Pas :

- « Obtenir maintenant » ;
- « Débloquer » ;
- « Ajouter au panier » ;
- « Choisir le rare ».

Après le tap, transition vers le nommage.

---

# PARTIE VI — CAMÉRA ET LUMIÈRE

## 24. Caméra showroom

Perspective proche de la photographie produit.

Plage initiale :

- FOV 28° à 35° ;
- distance auto-ajustée selon bounding box ;
- pas de grand-angle.

Chaque roche doit occuper une proportion similaire à l’écran malgré des dimensions différentes.

---

## 25. Preset Studio de sélection

Le showroom possède une seule configuration de référence :

```text
        Rim discret
            ↘
Fill →  CAILLOU  ← Key large

       Contact shadow
```

### Key

- large ;
- douce ;
- légèrement haute et latérale.

### Fill

- faible ;
- conserve les détails dans les ombres.

### Rim

- très discret ;
- uniquement pour détacher la silhouette.

### Fond

Neutre et identique entre les vingt spécimens.

Le showroom est l’endroit où l’on compare les pierres. Les ambiances décoratives viennent après l’adoption.

---

## 26. Contact et socle

Le caillou ne flotte pas.

Exigences :

- vraie position de repos ;
- ombre de contact ;
- légère occlusion ;
- aucune pénétration évidente ;
- support minimal.

Le support ne doit jamais rivaliser avec la roche.

---

# PARTIE VII — LE SOCLE ET LES AMBIANCES

## 27. Le Socle

Après adoption, le Socle devient l’écran principal.

Composition :

```text
┌─────────────────────────┐
│ CAILLOU™            ··· │
│                         │
│       [ CAILLOU ]       │
│           3D            │
│                         │
│        BERNARD          │
│  Présence stable.       │
│                         │
│  Fiche  Ambiance  Photo │
└─────────────────────────┘
```

Le mot-symbole peut devenir très discret après le premier lancement.

---

## 28. Studio minéral

Ambiance de référence : cyclorama minimal, surface mate, lumière studio douce.

C’est également la base esthétique du showroom, avec encore moins d’éléments décoratifs.

---

## 29. Jardin zen

- sable fin ;
- sillons subtils ;
- lumière naturelle ;
- aucun bouddha, bambou cliché ou gong obligatoire.

---

## 30. Mousse

- mousse courte ;
- sol sombre ;
- lumière diffuse ;
- vert uniquement par rebond ;
- goutte ou insecte possible comme micro-événement.

---

## 31. Bois noble

- noyer ou bois naturel sombre ;
- lumière chaude mais non orange ;
- silence intérieur ;
- éviter le luxe parfum cliché.

---

## 32. Vitrine muséale

Le niveau maximal du sérieux absurde.

Exemple de plaque :

```text
BERNARD
Spécimen 07
Collection particulière
Activité observée : faible
```

---

# PARTIE VIII — INTERFACE

## 33. Navigation

Peu d’options visibles à la fois.

Sur téléphone :

- barre d’actions compacte ;
- sheets pour contenus secondaires ;
- plein écran seulement pour showroom, observation et photo lorsque justifié.

Éviter menu profond, rail dashboard et multiplication de cartes.

---

## 34. Boutons

Bouton principal : contraste fort, texte court, hauteur tactile confortable, pas de gradient.

Bouton secondaire : surface légère ou contour discret.

Bouton iconique : minimum 44 × 44 px, focus et pressed visibles.

Pas de rebond cartoon.

---

## 35. États de chargement

Aucun spinner générique au centre du caillou.

Approche :

1. fond Studio déjà présent ;
2. silhouette ou preview ;
3. texte éventuel « Préparation du spécimen. » ;
4. fondu vers le modèle prêt.

Pas de faux pourcentage.

---

## 36. Erreur 3D

Si un asset échoue :

> « Le spécimen n’a pas pu être présenté en trois dimensions. Sa stabilité n’est pas remise en cause. »

Actions : **Réessayer** et navigation précédent/suivant toujours disponible.

---

# PARTIE IX — MOUVEMENT

## 37. Philosophie

Un caillou :

- ne bondit pas ;
- ne flotte pas ;
- ne danse pas ;
- ne respire pas ;
- ne cligne pas des yeux.

Le mouvement sert la manipulation, les transitions, la lumière et les événements environnementaux.

---

## 38. Rotation

- inertie courte ;
- décélération naturelle ;
- arrêt doux ;
- angle vertical borné ;
- aucune rotation infinie automatique.

---

## 39. Transitions UI

| Type | Durée indicative |
|---|---:|
| feedback immédiat | 100–160 ms |
| bouton | 120–180 ms |
| sheet | 220–320 ms |
| changement de spécimen | 250–500 ms hors temps réseau |
| changement d’ambiance | 500–900 ms |

Courbes naturelles, jamais de bounce.

---

## 40. Reduced motion

Avec `prefers-reduced-motion: reduce` :

- inertie réduite ;
- transitions simplifiées ;
- pas de mouvement caméra automatique ;
- fades courts ;
- changement de spécimen fonctionnel sans animation complexe.

---

# PARTIE X — SON ET HAPTIQUE

## 41. Sound design

Le silence fait partie du produit.

Familles sonores :

- petit toc pierre/surface ;
- frottement léger ;
- ambiance très discrète ;
- accent rare de distinction.

Le showroom peut rester quasiment silencieux.

---

## 42. Haptique

Quand disponible : impulsion courte, faible, désactivable.

Le changement gauche/droite peut utiliser un feedback extrêmement discret si cela améliore la sensation, mais ne doit jamais vibrer fortement à chaque pierre.

---

# PARTIE XI — TON ÉDITORIAL

## 43. Voix

CAILLOU™ s’exprime comme un conservateur de musée doté d’un sens de l’absurde très sec.

```text
constat sérieux
+
objet banal
=
humour
```

Exemple :

> « Aucun déplacement spontané n’a été observé. »

La phrase suffit.

---

## 44. Lexique privilégié

- spécimen ;
- présence ;
- état ;
- stabilité ;
- observation ;
- minéral ;
- masse ;
- surface ;
- activité ;
- reconnaissance ;
- collection ;
- distinction ;
- remarquable ;
- conforme ;
- mesuré.

Les termes scientifiques sont utilisés avec prudence.

---

## 45. Exemples conformes

- « Présence stable. »
- « Aucun changement significatif. »
- « Activité particulièrement contenue. »
- « Votre spécimen conserve un excellent niveau de roche. »
- « Aucun projet immédiat n’a été communiqué. »
- « Mobilité spontanée non détectée. »
- « La situation reste minérale. »
- « Dignité intacte. »

Après rotation :

- « Orientation révisée. »
- « Nouvel angle validé. »

Après absence :

- « La situation est restée sous contrôle. »
- « Aucun développement préoccupant. »

---

## 46. Humour interdit

Éviter :

- memes datés ;
- grossièretés gratuites ;
- humour enfantin ;
- jeux de mots sur chaque écran ;
- caillou bavard ;
- reproches liés à l’absence ;
- fausse rareté ;
- textes de vente.

---

# PARTIE XII — ÉCRANS SPÉCIFIQUES

## 47. Onboarding

Écran d’accueil : beaucoup d’espace négatif.

```text
        CAILLOU™

   [un magnifique caillou]

 Une présence minérale de qualité.

   Commencer l’adoption
```

Pas de carrousel marketing.

---

## 48. Showroom

Le showroom est la pièce maîtresse du premier lancement.

Obligatoire :

- un seul spécimen 3D ;
- flèches latérales ;
- compteur ;
- label sobre ;
- rotation ;
- CTA d’adoption ;
- aucune grille de 20 miniatures comme expérience principale.

---

## 49. Nommage

Champ unique et élégant.

Le caillou choisi reste visible si possible.

Le passage de « Spécimen 07 » à « Bernard » doit donner la sensation que l’objet devient personnel sans changer physiquement.

---

## 50. Fiche minérale

Direction : carte de musée + fiche produit.

```text
BERNARD
Spécimen 07

Référence minérale

Adopté le …
Présence …
Mobilité …
Interactions …
```

Pas de dashboard analytique.

---

## 51. Collection

La Collection réutilise idéalement le langage du showroom.

Les vingt pierres peuvent être parcourues séquentiellement. Une vue 2D secondaire est acceptable pour navigation rapide, mais l’expérience noble reste l’inspection 3D.

Aucune rareté colorée, cadenas agressif ou barre de complétion.

---

## 52. Instantané

Le mode photo masque l’interface inutile.

Options :

- cadrage ;
- nom on/off ;
- légende on/off ;
- partager ;
- enregistrer.

Branding très discret : `CAILLOU™` dans un coin.

---

# PARTIE XIII — ACCESSIBILITÉ VISUELLE

## 53. Contraste et texte

Tous les textes fonctionnels respectent un contraste accessible indépendamment de la scène 3D.

Ne pas poser les informations critiques directement sur la texture du caillou.

---

## 54. Navigation accessible du showroom

- flèches tactiles ≥ 44 × 44 px ;
- focus visible ;
- labels lecteur d’écran ;
- compteur annoncé comme position, par exemple « Spécimen 7 sur 20 » ;
- adoption accessible sans rotation ;
- touches clavier précédent/suivant sur desktop.

---

# PARTIE XIV — DESIGN TOKENS

## 55. Tokens CSS initiaux

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
  --duration-scene: 700ms;
}
```

---

## 56. Tokens 3D

Les réglages de lumière et caméra sont centralisés.

Exemple conceptuel :

```ts
const showroomStudio = {
  camera: {
    fov: 32,
    framingRatio: 0.58,
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

Les valeurs finales sont calibrées sur les vingt vrais assets.

---

# PARTIE XV — CRITÈRES DE QUALITÉ DES ASSETS

## 57. Revue obligatoire d’un caillou

### Silhouette

- [ ] reconnaissable sans texture ;
- [ ] asymétrie naturelle ;
- [ ] aucune facette involontaire gênante.

### Matière

- [ ] base color correcte ;
- [ ] normal map crédible ;
- [ ] roughness non plastique ;
- [ ] détail lisible au zoom raisonnable.

### Showroom

- [ ] cadrage cohérent avec les 19 autres ;
- [ ] éclairage neutre et flatteur sans favoritisme ;
- [ ] vraie position de repos ;
- [ ] transition précédent/suivant propre.

### Mobile

- [ ] rotation fluide ;
- [ ] poids conforme ;
- [ ] chargement acceptable ;
- [ ] aucun artefact texture.

### Provenance

- [ ] source documentée ;
- [ ] auteur documenté ;
- [ ] licence documentée ;
- [ ] attribution affichable dans les crédits.

---

## 58. Revue obligatoire du catalogue

- [ ] 20 spécimens distincts ;
- [ ] aucun doublon accidentel ;
- [ ] IDs stables ;
- [ ] tous chargent dans le même Studio ;
- [ ] aucun n’est marqué comme rare ou inférieur ;
- [ ] le tour complet 01 → 20 est visuellement cohérent ;
- [ ] le retour 20 → 01 reste fluide ;
- [ ] aucune fuite mémoire visible lors d’une navigation prolongée.

---

## 59. Revue obligatoire d’une ambiance

- [ ] le caillou reste dominant ;
- [ ] la lumière améliore la matière ;
- [ ] le décor est minimal volontairement ;
- [ ] fonctionne avec les vingt spécimens ;
- [ ] contraste UI vérifié ;
- [ ] coût GPU raisonnable ;
- [ ] sound design facultatif et discret.

---

# PARTIE XVI — ANTI-PATTERNS

## 60. Ce qui ferait perdre l’identité CAILLOU™

### Visuel

- yeux ;
- bouche ;
- costumes ;
- arc-en-ciel ;
- particules partout ;
- grosse barre XP ;
- étoiles de rareté ;
- coffres ;
- confettis ;
- néon cyberpunk.

### Showroom

- grille type e-commerce comme écran principal ;
- vingt GLB affichés simultanément ;
- badges « rare », « épique », « recommandé » ;
- prix ou monnaie ;
- fiche produit surchargée ;
- autoplay rapide entre les pierres ;
- choix algorithmique « meilleur pour vous ».

### UX

- popup quotidienne ;
- récompense « reviens demain » ;
- menu complexe ;
- badges rouges ;
- tutoriel long.

### Ton

- « Bernard a faim ! » ;
- « Ton caillou est triste 😭 » ;
- « SUPER !!! +500 ROCK COINS » ;
- « Vite, reviens avant minuit ! »

---

# PARTIE XVII — ÉVOLUTIONS FUTURES

## 61. Nouveaux spécimens

Un nouveau caillou doit apporter une vraie différence de silhouette, matière ou réponse lumineuse.

Ne pas ajouter des recolorations artificielles uniquement pour augmenter le nombre.

Le catalogue de 20 est déjà généreux pour la V1.

---

## 62. Accessoires éventuels

S’ils arrivent après V1 : rares, sobres, crédibles, facultatifs.

Un socle alternatif est acceptable. Une garde-robe de moustaches ne l’est pas.

---

# PARTIE XVIII — VISION DE L’EXPÉRIENCE

## 63. Premier choix

L’utilisateur entre dans le showroom.

Un premier caillou apparaît sous une lumière douce.

Il le tourne.

Il touche la flèche droite.

La pierre disparaît calmement.

Une autre prend sa place.

`02 / 20`.

Puis une autre.

Au bout de quelques spécimens, une préférence irrationnelle commence à se former.

Aucune statistique ne lui dit lequel choisir.

Aucune pierre n’est rare.

Aucun algorithme n’aide.

Il revient au numéro 07.

Il le tourne encore une fois.

Il appuie sur :

**Adopter ce caillou**

Quelques secondes plus tard, Spécimen 07 devient **Bernard**.

C’est exactement l’expérience recherchée.

---

## 64. Socle final

L’utilisateur revient plus tard.

Bernard est là.

La lumière accroche une zone de matière qu’il n’avait pas remarquée.

Il le fait tourner.

Bernard s’arrête avec du poids.

Un petit toc minéral se fait entendre s’il le touche.

Rien d’autre ne réclame son attention.

**C’est exactement le produit.**

---

## 65. Checklist de validation V1 visuelle

### Marque

- [ ] mot-symbole ;
- [ ] pictogramme ;
- [ ] icône PWA ;
- [ ] variantes clair/sombre.

### Showroom

- [ ] 20 spécimens ;
- [ ] un seul caillou visible ;
- [ ] flèches gauche/droite ;
- [ ] compteur N/20 ;
- [ ] rotation tactile ;
- [ ] CTA adoption ;
- [ ] transitions sobres ;
- [ ] loading premium ;
- [ ] erreur récupérable ;
- [ ] navigation clavier ;
- [ ] reduced motion.

### UI

- [ ] tokens finalisés ;
- [ ] typographie licenciée ;
- [ ] Socle mobile ;
- [ ] tablette ;
- [ ] desktop ;
- [ ] fiche ;
- [ ] collection/showroom ;
- [ ] ambiances ;
- [ ] instantané ;
- [ ] réglages.

### 3D

- [ ] 20 silhouettes/scans validés ;
- [ ] textures finales ;
- [ ] roughness calibrée ;
- [ ] preset Studio showroom ;
- [ ] 5 presets d’ambiance ;
- [ ] caméra auto-fit ;
- [ ] ombre de contact ;
- [ ] qualité mobile ;
- [ ] capture haute qualité.

### Ton

- [ ] aucun écran bavard ;
- [ ] humour sec ;
- [ ] aucune rareté ;
- [ ] aucune mécanique anxiogène ;
- [ ] le caillou reste un caillou.

---

# 66. Règle finale de direction artistique

Avant de valider n’importe quel écran, asset ou animation, poser trois questions :

1. **Le caillou paraît-il réellement beau ?**
2. **Le traitement paraît-il légèrement trop sérieux pour ce qu’il représente ?**
3. **Peut-on supprimer encore quelque chose ?**

Si les réponses sont **oui, oui, oui**, CAILLOU™ est probablement sur la bonne pierre.