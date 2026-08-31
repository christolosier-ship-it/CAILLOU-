# CAILLOU™ — Workflow 3D automatisé Blender + GitHub Actions

> **Statut : workflow de référence pour la préparation des assets 3D**  
> **Objectif : permettre de produire des cailloux GLB premium sans poste de travail local**  
> **Principe : l’utilisateur peut travailler depuis un mobile ; le traitement 3D lourd est exécuté à distance par GitHub Actions avec Blender en mode headless.**

---

## 1. Objet du document

Ce document décrit le workflow cible pour transformer des modèles 3D source, notamment des scans photogrammétriques provenant de Sketchfab ou d’autres bibliothèques compatibles, en assets optimisés pour **CAILLOU™**.

Il complète :

- `CAHIER-DES-CHARGES-V1.md` pour le périmètre produit ;
- `ARCHITECTURE-TECHNIQUE.md` pour la stack applicative ;
- `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md` pour la qualité visuelle et les règles de rendu.

Le workflow vise une contrainte assumée : **aucune dépendance à un ordinateur local n’est nécessaire pour préparer les modèles**.

---

## 2. Décision de principe

La chaîne de production retenue est :

```text
Source 3D légale et documentée
        ↓
Archive ou fichiers source placés dans le dépôt
        ↓
GitHub Actions
        ↓
Runner Linux hébergé par GitHub
        ↓
Blender lancé en mode headless
        ↓
Script Python CAILLOU™
        ↓
Nettoyage / normalisation / optimisation / matériau
        ↓
Export GLB
        ↓
Contrôles automatiques
        ↓
Artifact de prévisualisation ou commit du résultat final
        ↓
Intégration dans l’application
```

Le téléphone ou la tablette sert à :

- choisir le modèle source ;
- téléverser l’archive ou les fichiers dans GitHub lorsque nécessaire ;
- déclencher ou suivre le workflow ;
- consulter les previews ;
- valider ou refuser le résultat.

Le téléphone n’exécute pas Blender.

---

## 3. Blender ne nécessite aucune clé API

Blender est un logiciel local et scriptable. Il n’existe pas de « clé API Blender » nécessaire pour l’utiliser dans GitHub Actions.

Le workflow utilise directement l’exécutable Blender et son API Python `bpy`.

Commande de référence :

```bash
blender --background --python scripts/3d/process-rock.py -- <arguments>
```

Le mode `--background` lance Blender sans interface graphique.

### Authentifications possibles autour de Blender

| Élément | Authentification requise ? | Remarque |
|---|---:|---|
| Blender | Non | logiciel exécuté localement sur le runner |
| API Python `bpy` | Non | incluse avec Blender |
| GitHub Actions | Automatique | GitHub fournit le contexte du workflow |
| Écriture dans le dépôt | Oui, mais native | via `GITHUB_TOKEN` avec permission minimale `contents: write` |
| Téléchargement Sketchfab automatisé | Éventuellement | dépend de l’API et du modèle ; hors cœur du workflow |
| Archive Sketchfab fournie manuellement | Non | solution privilégiée en V1 |

### Règle de sécurité

Le workflow ne doit jamais demander :

- de mot de passe Blender ;
- de clé Blender ;
- de token personnel GitHub si `GITHUB_TOKEN` suffit ;
- de secret Sketchfab lorsque les fichiers source sont fournis manuellement.

---

## 4. Stratégie d’acquisition des modèles source

### 4.1 Principe

Le pipeline ne doit jamais contourner les conditions de téléchargement d’une plateforme.

Chaque asset source doit disposer d’une licence clairement compatible avec CAILLOU™.

Pour Sketchfab, privilégier :

- modèles explicitement téléchargeables ;
- licence CC BY ou licence plus permissive compatible ;
- auteur et URL source conservés dans les métadonnées ;
- exclusion des modèles NC si une utilisation commerciale future doit rester possible.

### 4.2 Workflow mobile privilégié

Lorsque Sketchfab exige une action utilisateur ou une session de compte :

```text
iPhone / iPad
   ↓
Téléchargement légal du ZIP depuis Sketchfab
   ↓
Téléversement du ZIP ou des fichiers source vers GitHub
   ↓
GitHub Actions prend le relais
```

Cette méthode évite d’ajouter une authentification Sketchfab au projet.

### 4.3 GLB Sketchfab déjà satisfaisant

Le passage Blender n’est pas obligatoire par principe.

Si le GLB fourni directement par Sketchfab :

- est visuellement satisfaisant ;
- respecte le budget de triangles ;
- possède une matière correcte ;
- possède une taille réseau acceptable ;
- ne contient pas de scène ou de nœuds parasites ;

alors le pipeline peut se limiter à une phase de validation et de copie vers les assets finaux.

**Règle : ne pas retraiter Bernard pour le seul plaisir de retraiter Bernard.**

---

## 5. Arborescence cible liée au pipeline

Lorsque l’implémentation commencera, l’organisation recommandée est :

```text
CAILLOU-/
├── assets-source/
│   └── rocks/
│       ├── river-pebble/
│       │   ├── source/
│       │   │   ├── model.obj | model.fbx | model.glb
│       │   │   ├── albedo.*
│       │   │   ├── normal.*
│       │   │   ├── ao.*
│       │   │   └── autres-textures.*
│       │   └── source.json
│       └── ...
│
├── public/
│   └── assets/
│       └── rocks/
│           ├── river-pebble/
│           │   ├── rock.glb
│           │   └── preview.webp
│           └── ...
│
├── scripts/
│   └── 3d/
│       ├── process-rock.py
│       ├── validate-rock.mjs
│       ├── generate-preview.py
│       └── presets.json
│
└── .github/
    └── workflows/
        └── build-rock.yml
```

Les sources brutes et les assets de production doivent rester séparés.

---

## 6. Métadonnées obligatoires par source

Chaque caillou source doit disposer d’un fichier `source.json` ou d’un enregistrement équivalent contenant au minimum :

```json
{
  "name": "Rock Scan 13",
  "author": "Loïc Norgeot",
  "source": "https://sketchfab.com/...",
  "license": "CC BY",
  "downloadedAt": "YYYY-MM-DD",
  "intendedRockId": "river-pebble",
  "notes": "Scan photogrammétrique retenu pour casting CAILLOU™"
}
```

Objectifs :

- préserver l’attribution ;
- pouvoir auditer la licence ;
- distinguer l’asset source de l’asset transformé ;
- faciliter la génération future des crédits de l’application.

---

## 7. Runner GitHub Actions

### 7.1 Runner recommandé

Utiliser en priorité :

```yaml
runs-on: ubuntu-latest
```

Les traitements Blender sont plus lourds qu’un simple lint ou build frontend. Le runner `ubuntu-slim` n’est pas recommandé pour le pipeline principal.

### 7.2 Ressources

Le pipeline doit rester compatible avec les runners standards GitHub hébergés.

Conséquences :

- ne pas supposer la présence d’un GPU ;
- éviter les rendus Cycles lourds dans la CI courante ;
- préférer les opérations mesh/material/export CPU ;
- générer les previews avec Eevee lorsque possible ;
- ne pas considérer le runner comme un poste Blender interactif.

### 7.3 Installation de Blender

Deux stratégies sont acceptables :

#### A — Télécharger une version Blender officielle figée

Recommandé pour la reproductibilité.

```text
workflow
  ↓
télécharge Blender version X.Y.Z
  ↓
met en cache l’archive si pertinent
  ↓
utilise cette version pour tous les exports
```

#### B — Utiliser un conteneur ou une action tierce spécialisée

Possible mais moins souhaitable pour la V1, car cela ajoute une dépendance extérieure supplémentaire.

**Préférence CAILLOU™ : téléchargement officiel + version verrouillée.**

---

## 8. Étapes Blender automatisées

Le script `process-rock.py` doit être déterministe et effectuer uniquement les opérations nécessaires.

### 8.1 Import

Formats sources prioritaires :

1. GLB / glTF ;
2. FBX ;
3. OBJ + textures.

Le script détecte le format à partir du preset ou de la configuration du spécimen.

### 8.2 Nettoyage de scène

Supprimer :

- caméras importées ;
- lumières importées ;
- objets inutiles ;
- empties non nécessaires ;
- géométries manifestement parasites ;
- matériaux non utilisés.

Conserver uniquement le ou les meshes nécessaires au caillou.

### 8.3 Fusion

Si le caillou est composé de plusieurs objets qui ne nécessitent pas de séparation au runtime, les réunir en un seul mesh.

### 8.4 Transformations

Appliquer :

- rotation ;
- échelle ;
- position ;
- transforms finales.

Le modèle final doit :

- être centré autour de l’origine selon une règle stable ;
- être posé naturellement sur le plan `Y=0` ou l’axe retenu par Three.js ;
- présenter son « beau côté » vers la caméra initiale ;
- posséder une échelle cohérente avec les autres spécimens.

### 8.5 Normales

- recalculer les normales si nécessaire ;
- supprimer les incohérences évidentes ;
- préserver les détails du scan ;
- ne pas lisser artificiellement une pierre qui doit rester brute.

### 8.6 Réduction du maillage

Budget cible initial pour le modèle principal :

```text
30 000 à 50 000 triangles
```

Ce budget est une cible, pas une religion.

Le pipeline peut conserver davantage de triangles si :

- la silhouette le justifie ;
- le modèle reste fluide sur les appareils cibles ;
- la taille du GLB reste conforme au budget.

Inversement, un galet très lisse peut nécessiter beaucoup moins.

### 8.7 UV

Ne pas refaire les UV par défaut.

Les scans photogrammétriques dépendent fortement de leurs UV d’origine.

Une nouvelle UV map n’est créée que si la source est inutilisable ou si un rebake complet est explicitement prévu.

### 8.8 Matériau PBR

Le matériau cible doit être compatible avec le pipeline glTF / Three.js.

Cartes utiles :

- base color / albedo ;
- normal ;
- roughness ;
- ambient occlusion ;
- éventuellement displacement utilisé uniquement lors de la préparation, pas nécessairement au runtime.

Le workflow doit éviter les nodes Blender complexes impossibles à traduire correctement vers glTF.

### 8.9 Roughness

Lorsque la source ne fournit pas de roughness exploitable :

- utiliser une valeur physique plausible ;
- éventuellement dériver une texture à partir de données existantes ;
- ajuster par spécimen ;
- ne jamais transformer toutes les pierres en plastique brillant.

### 8.10 Textures

Cible V1 par défaut :

```text
2K pour le runtime mobile
```

Une version 4K peut être conservée comme master ou évaluée pour tablette/desktop, mais ne doit pas être chargée systématiquement sur smartphone.

Le pipeline doit pouvoir :

- redimensionner ;
- convertir ;
- contrôler les dimensions ;
- conserver un master séparé du runtime.

### 8.11 Export GLB

Le format final principal est :

```text
.glb
```

Raisons :

- un seul fichier ;
- support natif par Three.js / GLTFLoader ;
- matériaux PBR standardisés ;
- transport web simple ;
- cache PWA plus facile.

---

## 9. Optimisations post-export

Après Blender, une étape dédiée peut utiliser des outils glTF pour :

- vérifier le document ;
- supprimer des données inutilisées ;
- compresser la géométrie ;
- optimiser les buffers ;
- convertir les textures vers KTX2/Basis lorsque le gain est démontré ;
- produire les statistiques finales.

L’optimisation ne doit jamais être aveugle : une baisse de poids qui dégrade visiblement la matière n’est pas une amélioration pour CAILLOU™.

---

## 10. Contrôles automatiques

Chaque asset final doit être validé avant intégration.

### Contrôles minimaux

- fichier GLB lisible ;
- présence d’au moins un mesh ;
- absence de caméra inutile ;
- absence de lumière importée ;
- nombre de triangles connu ;
- nombre de matériaux connu ;
- textures référencées correctement ;
- taille fichier sous le budget ;
- bounding box cohérente ;
- aucune référence externe manquante.

### Rapport recommandé

Exemple :

```text
CAILLOU 3D REPORT
────────────────────────
rockId        river-pebble
triangles     42 318
materials     1
textures      3
GLB size      5.8 MB
bounding box  OK
external deps 0
status        PASS
```

---

## 11. Preview automatique

Le workflow doit générer une preview standardisée pour validation humaine.

### Preview minimale

- fond neutre ;
- caméra fixe ;
- même focale pour tous les candidats ;
- même lumière studio ;
- résolution modeste suffisante pour GitHub ;
- idéalement trois vues : face, 3/4, profil.

Cette preview permet de comparer les pierres sans lancer l’application complète.

### Option avancée

Générer un court turntable vidéo ou une séquence d’images uniquement si son coût CI reste raisonnable.

---

## 12. Deux modes de sortie

### Mode A — Artifact de validation

Recommandé pendant le casting.

```text
Source
  ↓
Workflow
  ↓
rock.glb + preview + rapport
  ↓
GitHub Actions Artifact
```

Avantages :

- aucun commit automatique ;
- comparaison facile ;
- les essais ratés ne polluent pas le repo ;
- idéal pour tester 8 à 12 candidats.

### Mode B — Publication dans le dépôt

Après validation d’un spécimen :

```text
rock.glb
preview.webp
metadata
   ↓
public/assets/rocks/<rock-id>/
```

Le workflow peut alors créer un commit automatique.

Permission minimale :

```yaml
permissions:
  contents: write
```

GitHub fournit automatiquement `GITHUB_TOKEN` au job. Aucun Personal Access Token n’est nécessaire pour ce cas standard.

---

## 13. Déclenchement du workflow

### Phase de casting

Déclenchement manuel recommandé :

```yaml
on:
  workflow_dispatch:
```

Paramètres possibles :

- `rock_id` ;
- `source_path` ;
- `target_triangles` ;
- `texture_size` ;
- `publish` oui/non.

### Phase stabilisée

Ajouter éventuellement :

```yaml
on:
  push:
    paths:
      - "assets-source/rocks/**"
```

Mais uniquement lorsque le pipeline est suffisamment fiable pour ne pas lancer Blender à chaque modification secondaire.

---

## 14. Esquisse du workflow GitHub Actions

Cette section décrit l’intention, pas le fichier YAML final.

```yaml
name: Build CAILLOU 3D asset

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build-rock:
    runs-on: ubuntu-latest

    steps:
      - checkout
      - download pinned Blender
      - run Blender headless + process-rock.py
      - validate generated GLB
      - generate preview
      - upload artifact
```

Lorsqu’un mode publication est ajouté, les permissions peuvent être élevées uniquement pour le job ou le workflow concerné :

```yaml
permissions:
  contents: write
```

Le principe du moindre privilège doit être conservé.

---

## 15. Pipeline de casting recommandé pour CAILLOU™

Avant de produire les six spécimens définitifs :

### Étape 1 — Sélection

Identifier environ 8 à 12 scans Sketchfab potentiels.

Pour chacun :

- image ;
- auteur ;
- licence ;
- forme ;
- couleur ;
- géométrie ;
- textures ;
- rôle CAILLOU™ possible.

### Étape 2 — Import brut

Tester d’abord le GLB direct lorsqu’il existe.

### Étape 3 — Traitement uniforme

Passer les candidats retenus par le pipeline Blender avec le même preset de base.

### Étape 4 — Preview studio

Générer la même vue pour chaque candidat.

### Étape 5 — Casting humain

Comparer :

- silhouette ;
- matière ;
- crédibilité ;
- personnalité ;
- potentiel sous éclairage premium.

### Étape 6 — Retenir six spécimens

Les six pierres doivent être suffisamment différentes pour ne jamais donner l’impression d’un même mesh recoloré.

### Étape 7 — Finition individuelle

Chaque finaliste reçoit ensuite son preset spécifique :

- roughness ;
- exposition ;
- correction colorimétrique éventuelle ;
- cible triangles ;
- résolution texture ;
- orientation de présentation.

---

## 16. Presets par caillou

Le pipeline doit éviter les valeurs magiques codées dans le script.

Exemple de `presets.json` :

```json
{
  "river-pebble": {
    "targetTriangles": 40000,
    "textureSize": 2048,
    "roughness": 0.72,
    "rotation": [0, 0, 0]
  },
  "black-pebble": {
    "targetTriangles": 45000,
    "textureSize": 2048,
    "roughness": 0.48,
    "rotation": [0, 0, 0]
  }
}
```

Les valeurs finales seront déterminées après tests réels.

---

## 17. Reproductibilité

Le pipeline doit produire le même résultat à source et configuration identiques.

À verrouiller :

- version Blender ;
- scripts Python ;
- preset ;
- version des outils glTF éventuels ;
- options d’export ;
- taille cible des textures.

Éviter :

- dépendre d’un Blender « latest » non contrôlé ;
- opérations manuelles impossibles à reproduire ;
- modification directe d’un GLB final sans conserver la source.

---

## 18. Gestion des licences

Une transformation Blender ne change pas la licence de l’asset source.

Pour un modèle CC BY :

- conserver l’auteur ;
- conserver la source ;
- conserver la mention de licence ;
- indiquer que le modèle a été modifié/optimisé lorsque pertinent ;
- prévoir une page de crédits dans l’application finale.

Le pipeline doit privilégier la traçabilité plutôt que tenter de « nettoyer » les références d’origine.

---

## 19. Ce que le workflow ne doit pas faire

Interdits ou hors périmètre V1 :

- scraper automatiquement Sketchfab ;
- contourner une authentification ou une licence ;
- télécharger des assets non explicitement téléchargeables ;
- dépendre d’un service Blender Cloud ;
- exiger une clé API Blender ;
- lancer un rendu photoréaliste Cycles de plusieurs heures ;
- pousser automatiquement chaque essai raté dans `main` ;
- écraser les sources originales ;
- convertir un modèle correct uniquement parce qu’un pipeline existe.

---

## 20. Critères de réussite du pipeline

Le workflow est considéré comme opérationnel lorsque :

1. un fichier source peut être ajouté depuis un mobile ;
2. GitHub Actions peut lancer Blender sans interaction humaine ;
3. Blender importe la source et produit un GLB valide ;
4. le GLB respecte la structure attendue par Three.js ;
5. le pipeline génère un rapport technique ;
6. une preview standard permet une validation visuelle ;
7. le résultat peut être téléchargé comme artifact ;
8. une variante validée peut être publiée dans les assets finaux ;
9. aucune clé Blender ni machine locale n’est requise ;
10. la provenance et la licence restent traçables.

---

## 21. Stratégie de mise en œuvre recommandée

Ne pas construire immédiatement le pipeline complet pour les six pierres.

### Prototype P0

Un seul modèle Sketchfab.

Objectif :

```text
source GLB/OBJ
   ↓
GitHub Actions
   ↓
Blender headless
   ↓
GLB normalisé
   ↓
preview
   ↓
artifact téléchargeable
```

### P1

Ajouter :

- décimation paramétrable ;
- gestion PBR ;
- redimensionnement textures ;
- rapport automatique.

### P2

Ajouter :

- presets par spécimen ;
- optimisation glTF ;
- publication optionnelle ;
- contrôles de budget.

### P3

Traiter les six spécimens définitifs.

---

## 22. Références officielles

Les décisions de ce workflow s’appuient notamment sur :

- Blender Python API, exécution sans interface : `https://docs.blender.org/api/main/info_tips_and_tricks.html` ;
- GitHub Actions, runners hébergés : `https://docs.github.com/actions/reference/runners/github-hosted-runners` ;
- GitHub `GITHUB_TOKEN` : `https://docs.github.com/actions/concepts/security/github_token` ;
- utilisation et permissions de `GITHUB_TOKEN` : `https://docs.github.com/actions/tutorials/authenticate-with-github_token`.

---

## 23. Résumé décisionnel

```text
L’utilisateur choisit depuis son mobile
             ↓
La source est déposée légalement dans GitHub
             ↓
GitHub fournit la puissance de calcul
             ↓
Blender travaille sans interface ni clé API
             ↓
Le script CAILLOU™ normalise la pierre
             ↓
Un GLB + preview + rapport sont produits
             ↓
Validation humaine
             ↓
Publication seulement si le caillou mérite son socle
```

Le pipeline doit rester **automatique, reproductible, traçable et facultatif**. Son rôle n’est pas de compliquer la 3D ; son rôle est de permettre de produire des assets premium sans dépendre d’un ordinateur local.
