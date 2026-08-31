# CAILLOU™ - Workflow 3D automatisé Blender + GitHub Actions

> **Statut : workflow de référence pour les assets 3D V1**  
> **Objectif : produire et valider les vingt GLB de CAILLOU™ sans dépendre d'un poste local**  
> **Base V1 : vingt meshes LOD2 autour de 10 000 triangles avec textures source autour de 1024 x 1024**

---

## 1. Objet du document

Ce document décrit le pipeline 3D de CAILLOU™ V1 depuis le fichier Blender source jusqu'aux assets GLB distribués par l'application.

Il complète :

- `CAHIER-DES-CHARGES-V1.md` ;
- `ARCHITECTURE-TECHNIQUE.md` ;
- `DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`.

Le pipeline concerne les vingt spécimens fixes de la V1. L'ancienne logique de casting de six pierres n'est plus applicable.

---

## 2. État actuel validé

Le dépôt contient actuellement :

```text
Ressource/
├── rock_001.blend
├── rock_001_LOD2.jpeg
├── rock_001_LOD2_normal.jpeg
├── ...
├── rock_020_LOD2.jpeg
└── rock_020_LOD2_normal.jpeg
```

Le fichier Blender contient vingt meshes LOD2 distincts.

L'audit automatisé actuel a validé pour les vingt spécimens :

- environ 10 000 triangles par mesh ;
- UV présents ;
- matériau individuel ;
- texture couleur ;
- normal map ;
- génération de preview automatisable.

Le workflow `.github/workflows/audit-rocks.yml` et le script `scripts/blender/audit_rocks.py` constituent la base opérationnelle actuelle.

---

## 3. Principe général

```text
Ressource/rock_001.blend
          ↓
GitHub Actions
          ↓
Blender headless
          ↓
audit_rocks.py
          ↓
inventaire + previews
          ↓
validation humaine
          ↓
export_rocks.py futur
          ↓
20 GLB individuels
          ↓
validation automatique
          ↓
public/assets/rocks/
          ↓
Vercel CDN
```

Le téléphone ou la tablette sert à piloter GitHub et consulter les artifacts. Le traitement Blender est exécuté sur le runner GitHub.

---

## 4. Source maître

Le fichier `.blend` placé dans `Ressource/` est la source maître des vingt cailloux V1.

Les textures sources associées restent dans `Ressource/` tant que le pipeline de production n'a pas extrait les assets web définitifs.

Les sources lourdes ne doivent jamais être servies par le bundle public.

---

## 5. Identifiants de production

Les vingt sorties utilisent des identifiants stables :

```text
rock-001
rock-002
...
rock-020
```

Chaque identifiant correspond à exactement un mesh LOD2 source.

Le mapping `mesh Blender -> rock-id` doit être déterministe et versionné dans le script ou une configuration dédiée existante lorsque l'export sera implémenté.

---

## 6. Audit actuel

Le script `scripts/blender/audit_rocks.py` doit rester descriptif et non destructif.

Il collecte au minimum :

- nom du mesh ;
- nombre de triangles ;
- nombre de sommets ;
- UV ;
- matériaux ;
- chemins de textures ;
- dimensions ;
- bounding box ;
- preview standardisée.

Il produit :

```text
audit/
├── inventory.json
├── inventory.md
├── contact-sheet.png
└── previews/
```

Les previews Workbench sont destinées au contrôle rapide, pas au rendu final de l'application.

---

## 7. Blender dans GitHub Actions

### 7.1 Runner

```yaml
runs-on: ubuntu-latest
```

Le pipeline ne doit pas supposer la présence d'un GPU.

### 7.2 Version Blender

Le workflow d'audit actuel installe Blender depuis les paquets Ubuntu. Cette méthode est acceptable pour l'inventaire et les previews de casting.

**Avant l'export de production des GLB, la version Blender doit être figée explicitement.**

Stratégie recommandée :

```text
téléchargement d'une archive Blender officielle versionnée
→ cache éventuel
→ utilisation de cette version pour tous les exports de production
```

L'objectif est la reproductibilité.

### 7.3 Aucun secret Blender

Blender et `bpy` ne nécessitent aucune clé API.

Le pipeline ne doit jamais demander de clé Blender.

---

## 8. Cible géométrique V1

La géométrie source LOD2 autour de **10 000 triangles** est la cible V1 par défaut.

Il n'existe plus de cible générale à 30 000, 40 000 ou 50 000 triangles.

Règle :

> **Ne pas augmenter ou réduire la géométrie sans mesure réelle sur appareil cible.**

Une décimation supplémentaire n'est autorisée que si :

- la fluidité mobile l'exige ;
- le poids réseau devient problématique ;
- la silhouette reste visuellement inchangée.

Une montée vers un LOD plus lourd n'est justifiée que si les 10k triangles produisent un défaut réellement visible.

---

## 9. Textures V1

Base actuelle : environ **1024 x 1024** pour la couleur et la normal map.

Cible runtime par défaut : **1K**.

Une texture 2K n'est retenue que si les tests montrent une amélioration visible au zoom sur les appareils cibles.

Cartes prioritaires :

- base color ;
- normal ;
- roughness calibrée lorsque nécessaire ;
- AO uniquement si elle améliore réellement le rendu.

Ne jamais ajouter des textures plus lourdes par principe.

---

## 10. Matériau PBR

Le matériau final doit être compatible glTF / Three.js.

Principes :

- matériau physiquement crédible ;
- roughness ajustée par spécimen si nécessaire ;
- normales non exagérées ;
- aucun node Blender propriétaire indispensable au rendu ;
- aucune dépendance externe après export du GLB.

La pierre ne doit jamais devenir brillante comme du plastique sauf si le scan le justifie réellement.

---

## 11. Normalisation avant export

Pour chaque mesh :

1. isoler le LOD2 attendu ;
2. vérifier les textures ;
3. appliquer les transforms nécessaires ;
4. calculer la bounding box ;
5. centrer selon la convention de scène ;
6. déterminer une position de repos stable ;
7. conserver les UV source ;
8. vérifier les normales ;
9. calibrer le matériau ;
10. exporter un GLB individuel.

Le modèle final doit pouvoir être chargé seul, sans dépendre du `.blend` ou d'un autre mesh.

---

## 12. Convention de repos et cadrage

Chaque caillou doit posséder :

- une base cohérente avec le plan du Socle ;
- un centre exploitable par l'auto-fit caméra ;
- une orientation initiale choisie pour sa lisibilité ;
- une échelle relative cohérente.

Le cadrage final est néanmoins calculé côté application à partir de la bounding box pour donner aux vingt spécimens une présence comparable.

---

## 13. Export GLB

Format final :

```text
.glb
```

Arborescence :

```text
public/assets/rocks/
├── rock-001/
│   └── model.glb
├── rock-002/
│   └── model.glb
├── ...
└── rock-020/
    └── model.glb
```

Les previews peuvent être placées dans :

```text
public/assets/rock-previews/
```

Chaque GLB est autonome.

---

## 14. Budget par spécimen

Valeurs de départ :

- géométrie : ~10k triangles ;
- textures : 1K par défaut ;
- GLB : viser moins de 5 Mo lorsque possible ;
- un matériau principal lorsque la source le permet ;
- aucune caméra ou lumière importée ;
- aucune dépendance externe.

Le budget est validé par mesures réelles, pas par optimisation aveugle.

---

## 15. Validation automatique après export

Chaque GLB final doit être contrôlé.

Minimum :

- fichier ouvrable ;
- ID attendu ;
- mesh présent ;
- triangles connus ;
- UV présents ;
- texture couleur présente ;
- normal map ou matériau final valide ;
- taille connue ;
- bounding box cohérente ;
- aucune caméra ;
- aucune lumière ;
- aucune référence externe cassée ;
- aucun mesh parasite.

Rapport type :

```text
CAILLOU 3D REPORT
────────────────────────
rockId        rock-007
triangles     10 000
materials     1
textures      2
GLB size      2.4 MB
bounding box  OK
external deps 0
status        PASS
```

---

## 16. Validation visuelle

Chaque spécimen final reçoit une preview avec :

- même focale ;
- même fond ;
- même éclairage de contrôle ;
- même résolution ;
- cadrage comparable.

Puis contrôle humain :

- silhouette ;
- matière ;
- normal map ;
- roughness ;
- orientation ;
- absence de défaut ;
- lisibilité sur mobile.

---

## 17. Vertical slice avant export complet

Ne pas commencer par publier les vingt GLB de production.

Étape recommandée :

```text
Rock 001
Rock 002
    ↓
export GLB
    ↓
intégration React Three Fiber
    ↓
showroom précédent/suivant
    ↓
disposal mémoire
    ↓
rotation tactile
    ↓
Socle
```

Cette vertical slice valide le pipeline réel avant l'industrialisation des dix-huit autres.

---

## 18. Export complet des vingt roches

Après validation Rock 001 / Rock 002 :

1. exporter les vingt meshes ;
2. valider chaque GLB ;
3. produire une planche-contact finale ;
4. vérifier les IDs `rock-001` à `rock-020` ;
5. publier dans `public/assets/rocks/` ;
6. synchroniser les métadonnées `rock_catalog` Supabase ;
7. tester les vingt dans le même Studio web.

Le catalogue Supabase contient les métadonnées et les chemins d'assets. Les fichiers lourds restent distribués comme assets statiques/CDN.

---

## 19. Relation avec Supabase

Supabase ne stocke pas le `.blend` source.

Supabase peut stocker pour chaque spécimen :

- ID ;
- index ;
- label ;
- description ;
- chemin du GLB ;
- chemin de preview ;
- nombre de triangles ;
- statut actif.

Les fichiers GLB eux-mêmes peuvent rester dans le déploiement statique Vercel tant qu'aucun besoin de Storage séparé n'est démontré.

---

## 20. Accessoires 3D

Les accessoires appartiennent à un pipeline distinct mais compatible avec les mêmes principes.

Cible :

- assets légers ;
- géométrie très inférieure au caillou ;
- textures modestes ;
- point d'ancrage stable ;
- aucune physique obligatoire ;
- validation visuelle avec plusieurs formes de caillou.

Ils sont placés dans :

```text
public/assets/accessories/
```

Les métadonnées et prix en Lithons sont stockés côté Supabase.

---

## 21. CI et déclenchements

### Audit

Le workflow actuel peut se déclencher sur modifications de :

```text
Ressource/**
scripts/blender/audit_rocks.py
.github/workflows/audit-rocks.yml
```

### Export de production

Le futur export complet doit privilégier :

```yaml
workflow_dispatch:
```

puis, une fois stabilisé, éventuellement des triggers ciblés.

Éviter de lancer Blender à chaque modification React, CSS ou documentation.

---

## 22. Permissions GitHub

Audit :

```yaml
permissions:
  contents: read
```

Publication automatique future, uniquement si réellement nécessaire :

```yaml
permissions:
  contents: write
```

Préférer les artifacts de validation avant toute écriture automatique dans le dépôt.

---

## 23. Reproductibilité

À verrouiller avant production :

- version Blender ;
- script d'export ;
- mapping des vingt meshes ;
- options glTF ;
- règles de texture ;
- éventuels outils d'optimisation post-export.

Même source + même configuration doivent produire un résultat fonctionnellement équivalent.

---

## 24. Licences et provenance

La transformation Blender ne change pas la licence de la source.

Pour chaque asset, conserver :

- auteur ;
- source ;
- licence ;
- éventuelle mention de modification ;
- informations nécessaires aux crédits de l'application.

Aucune étape du pipeline ne doit supprimer la traçabilité.

---

## 25. Ce que le pipeline ne doit pas faire

- conserver l'ancienne logique de six finalistes ;
- remonter systématiquement à 30-50k triangles ;
- passer systématiquement en 2K/4K ;
- scraper une plateforme ;
- contourner une licence ;
- exiger un GPU ;
- lancer des rendus Cycles lourds en CI ordinaire ;
- modifier la source maître sans nécessité ;
- publier automatiquement un export non contrôlé ;
- servir le `.blend` dans le bundle web.

---

## 26. Critères de réussite

Le pipeline 3D V1 est terminé lorsque :

1. les vingt meshes LOD2 sont mappés à `rock-001` ... `rock-020` ;
2. Rock 001 et Rock 002 ont validé la vertical slice web ;
3. les vingt GLB sont exportables de manière déterministe ;
4. les vingt passent la validation automatique ;
5. les vingt possèdent une preview ;
6. les vingt chargent dans React Three Fiber ;
7. aucun GLB ne possède de dépendance externe cassée ;
8. le tour complet du showroom ne produit pas de fuite GPU ;
9. provenance et licence sont conservées ;
10. la version Blender de production est figée.

---

## 27. Règle finale

> **Le pipeline doit préserver ce qui rend chaque pierre crédible, puis s'arrêter.**

Pour CAILLOU™ V1, dix mille triangles bien éclairés valent mieux que cinquante mille triangles chargés par habitude.
