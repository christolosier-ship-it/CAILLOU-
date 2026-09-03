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

**Statut : Terminée**

- Date de clôture : 2026-09-01
- PR / commit de validation : PR #13 ; `02077c954fa9e7dcb3931a00d702cb04a3bb6533`
- 20 assets validés : 20/20 spécimens accessibles, catalogue Supabase contrôlé en lecture seule à 20 actifs / 20 prêts, IDs `rock-001` à `rock-020`, 10 000 triangles par modèle
- Chargement 3D : un seul GLB actif à la fois ; changement de spécimen abortable ; disposal explicite des géométries, matériaux et textures
- Mémoire / performance : validation WebGL répétée sur 3 tours × 20 spécimens, soit 60 chargements/disposals ; test de changement rapide `01 → 20 → 01` validé ; mémoire résiduelle stable mesurée à 0 géométrie et 1 texture, sans croissance GPU continue détectée
- Tests tactiles / responsive : vrai composant Showroom validé en CI en 390 × 844 et 1024 × 768 ; cibles tactiles ≥ 44 px ; drag de rotation sans changement accidentel de spécimen ; navigation clavier aller/retour validée ; reduced motion validé
- Vercel Preview : déploiement `dpl_6LPpcvPqKmvtwstnfCnjZQZr1e18` en état `READY` ; les commits ultérieurs limités aux fixtures/tests sont ignorés avant build par le garde-fou Vercel
- Décisions UX : navigation circulaire `01 / 20` à `20 / 20`, 20 descriptions institutionnelles distinctes, loading basé sur les previews, erreur récupérable avec retry, caméra auto-fit FOV 32°, DPR borné à 1,5, zoom borné et preset Studio fixe avec contact shadow
- Validation automatique : CI frontend, build production, tests unitaires, validation WebGL mémoire et validation responsive téléphone/tablette tous verts avant fusion
- Dette : aucune dette bloquante pour l'étape 06 ; l'enregistrement de l'adoption reste volontairement hors périmètre et relève de l'étape 07
- Étape suivante recommandée : 07 — Adoption, nommage et Socle
