# CAILLOU™ - Design system et direction artistique V1

> **Statut : référence visuelle V1, alignée après 10.5 et sur la cible 10.75**  
> **Intention : traiter un simple caillou avec le sérieux d'un objet de collection haut de gamme.**  
> **Règle d'or : si l'interface devient plus intéressante que le caillou, le design a échoué.**

---

## 1. Objet du document

Ce document définit l'identité visuelle et sensorielle de CAILLOU™ V1 :

- marque ;
- palette ;
- typographie ;
- inscription ;
- showroom ;
- descriptions ;
- Socle ;
- Bio / Stats ;
- Caresser et Nettoyer ;
- Boutique unifiée ;
- Placement universel ;
- Lithons ;
- rendu et physique 3D ;
- mouvement ;
- haptique ;
- accessibilité ;
- ton éditorial.

---

## 2. Idée directrice

CAILLOU™ repose sur un contraste :

```text
un simple caillou             x  une présentation premium
une activité minime           x  des statistiques très sérieuses
une caresse                   x  une économie parfaitement documentée
un peu de poussière           x  un protocole d'entretien impeccable
un accessoire inutile         x  une acquisition institutionnelle
un permis à 1000 Lithons      x  une autorisation de déplacer une pierre
un placement impossible       x  une physique qui règle le problème ensuite
un abandon instantané         x  un historique conservé avec rigueur
```

Le design porte l'humour sans transformer le caillou en personnage cartoon.

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

Dosage : 80-90 % neutres, 10-15 % contrastes fonctionnels, 0-5 % accent. Le caillou fournit l'essentiel de la couleur.

---

## 5. Typographie

Direction : contemporaine, nette, éditoriale, sans effet luxe caricatural.

Candidats : Instrument Sans, Inter, Manrope, Geist Sans. Option secondaire limitée : Instrument Serif.

Limiter les graisses à 400, 500 et 600. Les tailles tactiles critiques restent lisibles sans surcharger la scène.

---

## 6. Écran d'inscription

L'inscription appartient au même univers que le Socle : beaucoup d'espace négatif, deux champs, aucun avatar ni onboarding marketing.

```text
        CAILLOU™
 Une présence minérale de qualité.

        Pseudo
      Mot de passe

    Créer mon compte
   J'ai déjà un compte
```

Les erreurs restent directes : « Ce pseudo est déjà attribué. »

---

## 7. Showroom des vingt spécimens

Avant adoption : `Spécimen 01` à `Spécimen 20`.

Aucune rareté, étoile, recommandation, niveau, prix ou badge « meilleur choix ».

Un seul GLB de caillou est visible à la fois. Le changement de spécimen préfère disparition / chargement / apparition douce plutôt qu'un crossfade de deux GLB complets.

Le caillou occupe la majorité de la zone 3D et bénéficie d'un studio constant entre spécimens.

---

## 8. Description et nommage

Chaque caillou possède une description institutionnelle spécifique, sérieuse dans sa forme et sans géologie inventée.

Après adoption :

```text
Spécimen 07
      ↓
   BERNARD
```

Le nom devient l'identité principale sans changer physiquement la pierre.

---

## 9. Le Socle

### 9.1 Composition cible 10.75

```text
┌─────────────────────────────┐
│ [Bio / Stats]    [Placement]│
│                             │
│        [ BERNARD ]          │
│            3D               │
│                             │
│                             │
│ Caresser Nettoyer Boutique  │
│             Jeter           │
└─────────────────────────────┘
```

L'écran principal n'est pas un dashboard.

### 9.2 Priorité visuelle

1. caillou ;
2. espace et lumière ;
3. commandes ;
4. texte.

Le solde Lithon reste discret. Il peut apparaître en haut si l'implémentation actuelle le nécessite, mais la Boutique et les feedbacks économiques restent ses lieux naturels.

### 9.3 Utilitaires supérieurs

- **Bio / Stats** : dossier institutionnel ;
- **Placement** : unique entrée de transformation persistante du caillou et de ses accessoires.

Il n'existe plus de « slot futur » normatif en haut à droite. Ce territoire UI a désormais une responsabilité explicite.

---

## 10. Barre d'actions

Les actions principales sont :

1. **Caresser** ;
2. **Nettoyer** ;
3. **Boutique** ;
4. **Jeter**.

Sur mobile, les zones tactiles font au moins 44 × 44 px. Un layout 2 × 2 reste acceptable si nécessaire.

`Jeter` ne devient pas rouge de manière permanente. Le caractère destructif est explicité dans la confirmation.

---

## 11. Mode normal

En observation :

- drag = rotation de caméra / observation ;
- pinch ou molette = zoom ;
- aucune récompense ;
- aucun nettoyage ;
- aucun placement persistant.

Un même geste ne doit jamais avoir plusieurs significations simultanées.

---

## 12. Mode Caresser

Tap sur **Caresser** active un mode explicite.

Une caresse reconnue produit un feedback très bref :

```text
+1 Lithon
```

Haptique légère possible. Aucun combo, confetti ou langage arcade.

---

## 13. Le Lithon

Le Lithon est traité comme une unité officielle parfaitement sérieuse.

Il permet :

- l'acquisition d'accessoires ;
- le déblocage permanent de fonctionnalités internes comme le Permis de manutention minérale.

Présentation préférée : `84 Lithons`, avec pictogramme minéral éventuel. Aucun symbole monétaire réel.

Le solde est surtout visible dans la Boutique, après un gain, dans Bio / Stats et lors d'un solde insuffisant.

---

## 14. Mode Nettoyer

La poussière reste subtile, réaliste, cosmétique et jamais associée à une santé ou une culpabilité.

Le doigt retire visuellement la poussière sur les zones parcourues. Aucun score ni chronomètre.

Feedback possible :

> « Surface remise dans un état réglementaire. »

Aucun Lithon n'est accordé.

---

## 15. Boutique unifiée

### 15.1 Direction

La Boutique ressemble à un catalogue de musée ou de design, pas à un magasin de jeu mobile.

Elle centralise **tous les achats en Lithons de la V1**.

Les catégories de présentation minimales sont :

- **Accessoires** ;
- **Autorisations / services**.

Cette unification visuelle ne suppose pas un catalogue SQL unique.

### 15.2 Carte produit commune

Une carte peut afficher :

- aperçu ou emblème ;
- catégorie ;
- nom ;
- description ;
- prix en Lithons ;
- état `Possédé` / `Acquis` ;
- bouton d'achat ;
- état de solde insuffisant.

Les cartes de fonctionnalités n'ont pas besoin de faux assets 3D. Un emblème institutionnel sobre suffit.

### 15.3 Permis de manutention minérale

Exemple de carte :

```text
AUTORISATION

PERMIS DE MANUTENTION MINÉRALE

Autorise la manutention réglementaire
du caillou dans les six degrés de liberté.

1000 Lithons

Acheter le permis
```

Après acquisition : badge **Acquis** et absence de second achat.

### 15.4 Après achat

Feedback générique :

> « Acquisition enregistrée. »

La Boutique ne doit pas proposer comme comportement principal « placer maintenant » pour un objet déjà possédé. Le placement appartient à l'utilitaire Placement.

Pas de confettis, compte à rebours, prix barré ou rareté artificielle.

---

## 16. Placement universel

### 16.1 Entrée

Tap sur **Placement** ouvre un sélecteur de cible.

Exemple :

```text
PLACEMENT

Caillou
  Bernard

Accessoires placés
  Lunettes rondes #1
  Monocle #1
  Lunettes rondes #2

+ Ajouter un objet possédé
```

L'interface peut être une sheet, un panneau ou une carte superposée, mais elle ne doit pas masquer inutilement le caillou.

### 16.2 Caillou verrouillé

Sans Permis de manutention minérale, le caillou reste visible dans la liste avec un état verrouillé.

Le message doit être informatif, jamais punitif. L'action mène vers la carte du permis dans la Boutique.

### 16.3 Sélection claire

Une seule cible est active à la fois. Plusieurs instances identiques sont numérotées ou distinguées sans exposer leur UUID brut.

La sélection peut être indiquée par un halo/contour discret. Aucun gizmo 3D agressif par défaut.

---

## 17. Grammaire tactile de Placement

### 17.1 Principe

Après sélection, **le canvas entier devient la surface de contrôle**.

Le doigt n'a pas besoin de rester sur le mesh sélectionné.

### 17.2 Position

- 1 doigt : translation dans le plan de vue ;
- 2 doigts : profondeur.

### 17.3 Orientation

- 1 doigt : orientation libre ;
- twist à deux doigts : rotation autour de l'axe de vue.

### 17.4 Taille

Pour les accessoires uniquement : pinch pour agrandir/réduire dans les bornes autorisées.

Le caillou ne change jamais d'échelle.

### 17.5 Réglage fin

Les réglages X/Y/Z peuvent exister dans un panneau `Réglage fin` replié. Ils restent secondaires, utiles à l'accessibilité clavier et aux placements millimétriques.

---

## 18. Liberté de placement

### 18.1 Aucune correction objet/objet pendant le geste

Pendant Placement, il ne faut pas empêcher l'utilisateur de :

- mettre un accessoire dans le caillou ;
- faire se chevaucher deux accessoires ;
- traverser visuellement une autre géométrie ;
- laisser une cible dans une pose absurde avant validation.

Il ne faut pas aimanter automatiquement l'objet à la surface, le repousser ou lui imposer une clearance qui rend le placement fin impossible.

Cette liberté est volontaire.

### 18.2 Le carré gris est différent

Le grand carré gris est **la frontière infranchissable**.

La cible manipulée ne doit jamais passer visuellement à travers ou sous ce sol. Le comportement doit sembler ferme et évident, sans bounce ni avertissement bruyant.

Visuellement, le carré doit donc être compris comme un vrai plancher et pas comme une simple ombre décorative.

### 18.3 Terminer

À **Terminer**, le langage de l'interface change de « main de l'utilisateur » à « physique ».

- gravité active ;
- collisions normales ;
- glissement/chute/rotation possibles ;
- une intersection forte peut produire une éjection rapide ;
- l'interface n'ajoute aucun effet cartoon artificiel à cette réaction.

Le spectacle éventuel vient de Rapier, pas d'une animation de récompense.

---

## 19. Physique et mouvement

Un caillou n'est pas animé comme une créature. Il peut cependant être déplacé physiquement lorsqu'un utilisateur le décide puis réagir à la gravité.

À éviter : respiration, danse, clignement, flottement gratuit, squash/stretch.

À accepter : chute, bascule, roulement, glissement, collision, rebond très faible et éjection résultant d'une pénétration volontaire.

Les accessoires peuvent avoir des réactions physiques compatibles avec leur collider et leur masse, sans dériver vers un jouet arcade.

---

## 20. Bio / Stats

Le dossier institutionnel peut afficher : nom, spécimen, adoption, caresses, nettoyages, Lithons générés, solde, accessoires placés, statut du permis et statistiques absurdes clairement éditoriales.

L'objectif n'est pas l'optimisation statistique, mais la documentation excessivement sérieuse d'une relation avec un caillou.

---

## 21. Jeter

Confirmation sobre :

> **Jeter Bernard ?**
>
> Cette opération mettra fin à une relation minérale jusque-là correctement documentée.

Après confirmation, le caillou disparaît immédiatement. Pas d'animation de lancer, chute, rebond ou explosion. Cette action métier reste distincte de la physique ludique du Placement.

---

## 22. Caméra et lumière

Caméra showroom : FOV environ 28° à 35°, distance auto-fit, aucun grand-angle.

Le Socle conserve une ambiance studio calme avec key/fill/rim discrets et contact shadow.

Le grand carré gris du Socle est à la fois :

- un repère visuel de composition ;
- le vrai sol physique ;
- la frontière tactile dure du Placement.

Sa présence doit donc être lisible sans devenir un plateau de jeu spectaculaire.

---

## 23. Matière du caillou et accessoires 3D

Caillou : base color, normal, roughness calibrée, AO si utile. Jamais plastique.

Accessoires : géométrie/texture sobres, budget inférieur au caillou, colliders adaptés, plusieurs instances possibles sous limite de performance.

Les accessoires sont physiquement simulables. Les anciens principes « points d'ancrage déterministes » et « pas de physique nécessaire » ne constituent plus la cible V1.

Le caillou reste visuellement dominant même équipé.

---

## 24. Motion

Durées indicatives :

| Type | Durée |
|---|---:|
| feedback bouton | 120-180 ms |
| sheet | 220-320 ms |
| changement de spécimen | 250-500 ms hors réseau |
| feedback Lithon | 300-600 ms |
| sélection de cible | 120-220 ms |

Pas de bounce cartoon ajouté. Les mouvements physiques Rapier ne sont pas des animations UI et peuvent être plus soudains si la composition l'exige.

---

## 25. Reduced motion

Avec `prefers-reduced-motion: reduce` : inertie réduite, fades courts, aucun mouvement caméra automatique, feedback Lithon bref et transitions de sélection simplifiées.

La physique nécessaire à la résolution d'une composition n'est pas supprimée si cela changerait l'état final, mais les embellissements visuels non essentiels sont réduits.

---

## 26. Son et haptique

Son éventuel : frottement minéral, contact d'objet, nettoyage discret, ambiance quasi silencieuse.

Haptique : impulsions courtes sur validation ou achat, jamais vibration continue.

---

## 27. Ton éditorial

Voix : conservateur de musée ayant consacré beaucoup trop de moyens à l'étude d'un caillou.

Lexique recommandé : spécimen, présence, état, stabilité, observation, surface, conformité, acquisition, entretien, activité, Lithon, inventaire, placement, manutention, autorisation.

Exemples :

- « Présence stable. »
- « Orientation révisée. »
- « Acquisition enregistrée. »
- « Manutention autorisée. »
- « Surface remise dans un état réglementaire. »
- « La situation reste minérale. »

Éviter memes, emojis dans l'interface, humour enfantin, reproches, termes de casino ou slogans agressifs.

---

## 28. États réseau

Exemple hors ligne :

> « Synchronisation indisponible. Le spécimen reste observable. »

Les actions économiques sont désactivées ou mises en attente explicitement plutôt que simulées localement.

Une pose locale non confirmée ne doit jamais ressembler à une sauvegarde serveur réussie.

---

## 29. Accessibilité

- zones tactiles minimum 44 × 44 px ;
- focus visible ;
- HTML sémantique hors Canvas ;
- modes identifiables autrement que par la couleur ;
- contraste suffisant ;
- reduced motion ;
- aucune fonction essentielle exclusivement inaccessible au clavier ;
- réglage fin disponible comme alternative lorsque la manipulation gestuelle est imprécise ;
- sélecteur de cible lisible par lecteur d'écran ;
- états `Acquis`, `Verrouillé`, `En cours` annoncés sémantiquement.

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

Yeux, bouche, arc-en-ciel, particules permanentes, XP, rareté, confettis, néon arcade.

### Économie

Deuxième monnaie, packs de Lithons, prix barrés, offre limitée, bonus quotidien, combo, publicité récompensée, loot box.

### UX

- popup quotidienne ;
- streak ;
- menu complexe ;
- dashboard envahissant ;
- fenêtre d'achat spécifique par fonctionnalité alors que la Boutique existe ;
- bouton de placement séparé par type d'objet ;
- obligation de garder le doigt sur un petit mesh ;
- snapping agressif sur la surface du caillou ;
- anti-pénétration objet/objet qui empêche un placement volontaire précis ;
- franchissement du carré gris ;
- collision Rapier active pendant le geste au point de lutter contre la main.

---

## 32. Checklist visuelle V1

### Auth

- [ ] inscription pseudo + mot de passe ;
- [ ] connexion ;
- [ ] erreurs propres.

### Showroom

- [ ] 20 spécimens et descriptions ;
- [ ] un seul GLB visible ;
- [ ] navigation ;
- [ ] rotation ;
- [ ] CTA adoption ;
- [ ] chargement premium.

### Socle

- [ ] Bio / Stats ;
- [ ] Placement unique ;
- [ ] caillou central dominant ;
- [ ] Caresser ;
- [ ] Nettoyer ;
- [ ] Boutique ;
- [ ] Jeter ;
- [ ] modes exclusifs.

### Boutique

- [ ] accessoires ;
- [ ] autorisations/services ;
- [ ] permis 1000 Lithons ;
- [ ] prix lisibles ;
- [ ] état Acquis/Possédé ;
- [ ] achat sans effets casino ;
- [ ] aucune fonction commerciale parallèle.

### Placement

- [ ] sélecteur caillou + instances ;
- [ ] ajout d'un objet possédé ;
- [ ] caillou verrouillé sans permis ;
- [ ] canvas entier comme surface de contrôle ;
- [ ] Position commune ;
- [ ] Orientation commune ;
- [ ] Taille accessoire ;
- [ ] réglage fin secondaire ;
- [ ] intersections volontaires non bloquées ;
- [ ] carré gris infranchissable ;
- [ ] reprise Rapier à Terminer ;
- [ ] réactions physiques sans embellissement cartoon.

### 3D

- [ ] matériaux non plastiques ;
- [ ] caméra auto-fit ;
- [ ] contact shadow ;
- [ ] sol gris cohérent visuel/physique ;
- [ ] poussière crédible ;
- [ ] accessoires légers ;
- [ ] performance mobile/tablette.

---

## 33. Règle finale de direction artistique

Avant de valider un écran, poser quatre questions :

1. Le caillou reste-t-il le sujet principal ?
2. Le traitement paraît-il légèrement trop sérieux pour ce qu'il représente ?
3. L'interaction est-elle compréhensible en quelques secondes ?
4. Peut-on supprimer encore quelque chose ?

Si les réponses sont oui, oui, oui et oui, la situation reste probablement conforme.
