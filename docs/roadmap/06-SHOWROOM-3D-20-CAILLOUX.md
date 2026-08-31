# Étape 06 — Showroom 3D des 20 cailloux

## Prompt d'exécution

Tu travailles sur CAILLOU™ après validation du socle frontend et des assets 3D. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte le code et les assets réellement présents avant d'agir.

### Objectif

Livrer l'écran de sélection premium des 20 cailloux : un seul spécimen 3D actif à la fois, navigation séquentielle, manipulation tactile et description sérieuse individuelle.

### Plugins

- GitHub obligatoire.
- Vercel recommandé pour validation mobile sur Preview.
- Supabase en lecture seulement si le catalogue est hébergé en base.

### À réaliser

- Construire le showroom plein écran conformément au design system.
- Charger un seul GLB à la fois dans la scène et libérer proprement les ressources au changement.
- Navigation précédent/suivant, compteur `NN / 20`, clavier et zones tactiles accessibles.
- Drag sur le modèle = rotation ; navigation jamais déclenchée accidentellement pendant une rotation.
- Zoom borné si retenu.
- Caméra auto-fit cohérente pour les 20 bounding boxes.
- Même preset Studio pour tous les spécimens.
- Ajouter pour chaque caillou une description très sérieuse, sans inventer de rareté ou de nature géologique non connue.
- Créer loading premium, erreur récupérable et fallback approprié.
- Tester changement rapide de direction, asset lent et navigation répétée `01 → 20 → 01`.
- Mesurer la mémoire GPU et vérifier l'absence de croissance continue.

### Hors périmètre

- Enregistrement de l'adoption définitive.
- Lithons.
- Accessoires.
- Nettoyage.

### Critères d'acceptation

- 20 spécimens accessibles.
- Un seul modèle 3D actif.
- Rotation tactile fluide et navigation sans conflit.
- Descriptions présentes pour les 20.
- Accessibilité clavier et reduced motion.
- Pas de fuite GPU détectable lors d'un tour complet répété.
- UX convaincante sur téléphone et tablette via Preview.

### Fin d'étape

PR dédiée. Compléter compte rendu + index. Les réglages de caméra/lumière validés deviennent les références du design system si nécessaire.

## État / compte rendu

**Statut : À faire**

- Date :
- PR / commit :
- 20 assets validés :
- Mémoire / performance :
- Tests tactiles :
- Décisions UX :
- Dette :
- Étape suivante recommandée : 07
