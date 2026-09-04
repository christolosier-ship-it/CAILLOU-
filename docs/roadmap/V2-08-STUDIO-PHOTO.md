# V2-08 — Studio Photo

> **Statut : spécifiée — prête à exécuter après V2-01, V2-02, V2-04 et V2-05.**
>
> **Date : 4 septembre 2026.**
>
> **Dépendances : scène interactive, entitlements par caillou, sols et peinture.**

Ce fichier est le prompt autonome d'exécution de V2-08 et deviendra son historique après réalisation.

## 1. Prompt d'exécution

Lis l'index, ce fichier, les comptes rendus V2-01/V2-02/V2-04/V2-05, le renderer R3F/Three.js réel, les contrôles caméra, les règles responsive/PWA et le mécanisme d'entitlement par caillou.

GitHub obligatoire. Supabase obligatoire pour la feature Studio. Vercel recommandé pour validation réelle des captures selon navigateurs/appareils.

## 2. Contexte réel

Le Studio doit capturer le **petit monde réel** tel qu'il existe : caillou, accessoires, sol et peinture actifs. Il ne crée pas une seconde scène métier ni une copie persistante du Socle.

V2.0 exclut galerie cloud, stockage serveur d'images, URL publique et fiche publique.

## 3. Décisions métier actées

- Studio Photo est une fonctionnalité payante liée au caillou ;
- nouveau caillou = Studio à racheter ;
- capture locale uniquement ;
- téléchargement local ;
- partage natif/Web Share lorsque disponible ;
- pas de cloud ;
- pas de publication web ;
- la caméra Studio ne modifie pas la pose persistante des objets.

## 4. Objectif utilisateur

Après achat du Studio, l'utilisateur ouvre un mode dédié, cadre librement son caillou, choisit un format, masque l'interface et produit une image propre qu'il peut enregistrer ou partager avec les capacités natives de son appareil.

## 5. Périmètre précis

### Lot A — Entitlement

Ajouter/seeder `studio_photo` ou identifiant final équivalent dans le catalogue de fonctionnalités. Achat via le contrat V2-02 par caillou.

### Lot B — Mode Studio

Créer un mode/overlay explicite compatible avec le contrôleur Socle V2-00 :

- exclusif avec Caresser/Nettoyer/Placement ;
- sortie propre vers le Socle ;
- aucun changement de pose canonique ;
- scène rendue sans chrome applicatif au moment de la capture.

### Lot C — Caméra Studio

Caméra libre dédiée, distincte des transformations d'objets :

- orbite ;
- zoom ;
- cadrage ;
- recentrage ;
- contrôles tactiles et souris ;
- aucun besoin de Permis de manutention pour déplacer la **caméra**.

Le Studio ne doit pas détourner le Placement pour déplacer les objets.

### Lot D — Formats de capture

Prévoir un petit ensemble utile, par exemple :

- 1:1 ;
- 4:5 portrait ;
- 16:9 paysage.

Les formats exacts peuvent être ajustés selon les tests, mais pas de catalogue infini de ratios.

La résolution doit être raisonnable pour mobile. Éviter une capture 8K qui fait planter Safari pour un caillou portant un monocle.

### Lot E — Capture WebGL

Choisir la méthode la plus robuste après audit du renderer :

- capture du canvas lorsque fiable ;
- render target temporaire si nécessaire ;
- `toBlob`/PNG ou JPEG/WebP selon compatibilité et qualité ;
- ne pas activer un coûteux `preserveDrawingBuffer` permanent si une solution ponctuelle existe.

Le rendu capturé doit inclure ombres, peinture, sol et accessoires visibles.

### Lot F — Export local

- téléchargement fichier ;
- nom de fichier propre ;
- Web Share API avec `File` lorsque supportée ;
- fallback téléchargement si partage indisponible ;
- gérer refus/cancel utilisateur sans erreur rouge.

### Lot G — UI Studio

Contrôles minimaux :

- format ;
- recadrer/recentrer ;
- capturer ;
- quitter.

L'UI doit disparaître de l'image finale sans manipulation DOM fragile basée sur timing arbitraire.

## 6. Hors périmètre

- galerie serveur ;
- upload Supabase Storage ;
- URL publique ;
- profil public ;
- filtres Instagram ;
- stickers ;
- watermark obligatoire ;
- vidéo ;
- animation ;
- déplacement d'objets en Studio ;
- partage social intégré serveur.

## 7. Architecture cible

```text
Socle canonique
  -> StudioScreen/overlay
      -> StudioCameraController
      -> capture pipeline
      -> local Blob/File
      -> download / Web Share
```

Le Studio lit l'état du Socle, il ne devient pas une seconde source de vérité.

## 8. Contrats frontend / 3D / physique

- aucune simulation Rapier supplémentaire au repos ;
- caméra indépendante du Placement ;
- captures sans altérer la caméra principale si possible, ou restauration exacte à la sortie ;
- disposal des render targets/blobs temporaires ;
- respect reduced motion ;
- aucune mutation d'objet.

## 9. Contrats Supabase

Seulement l'entitlement Studio et éventuellement aucune autre donnée persistante.

**Ne pas créer de table photos, bucket Storage ou metadata cloud en V2.0.**

## 10. Migration / backfill / compatibilité V1

Aucun utilisateur reçoit Studio gratuitement. Aucun fichier historique à migrer. Le Socle actuel reste la source de la photo.

## 11. RLS / grants / RPC / idempotence / sécurité

Vérifier l'achat Studio via le contrat V2-02. L'accès frontend doit être gated, mais aucune image locale ne transite par Supabase. Aucune clé/URL privée ne doit être encodée dans le fichier.

## 12. Offline / PWA / réconciliation

Une fois l'entitlement et les assets nécessaires déjà disponibles localement, le Studio peut fonctionner offline pour une capture locale du dernier Socle connu, à condition d'indiquer si le Socle affiché est un état dégradé.

Aucun upload différé.

## 13. Performance et budgets

- allocation de capture ponctuelle ;
- résolution plafonnée ;
- libérer render target/blob/object URL ;
- pas d'impact permanent sur le renderer principal ;
- tester iPad/iPhone/Chrome avec textures/objets proches du plafond retenu.

## 14. UX téléphone / tablette / desktop

- contrôles accessibles sans masquer le sujet ;
- rotation/zoom fluides ;
- orientation portrait/paysage ;
- partage système iOS/Android lorsque supporté ;
- fallback explicite sur desktop ;
- capture ne doit pas inclure des boutons coupés ou un flash blanc.

## 15. Tests unitaires utiles

- ratios/résolutions ;
- noms MIME/extensions ;
- feature gating ;
- fallback share/download ;
- nettoyage object URLs ;
- restauration caméra/état.

## 16. Browser regression

Scénarios : Studio verrouillé, achat, ouverture, caméra libre, capture non vide, bon ratio, UI absente de la capture selon test possible, téléchargement/fallback, sortie sans modifier Socle, reload, nouveau caillou verrouillé.

Les tests navigateur ne remplacent pas un smoke test matériel de partage natif.

## 17. Discipline plateformes

Une branche/PR. Pas de Storage Supabase. Une Preview Vercel finale est fortement recommandée pour vérifier CORS/assets, capture et Web Share/fallback dans un contexte HTTPS réel.

## 18. Critères d'acceptation

- [ ] feature Studio payante par caillou ;
- [ ] mode Studio séparé du Placement ;
- [ ] caméra libre ;
- [ ] capture locale fidèle ;
- [ ] UI absente de l'image ;
- [ ] formats maîtrisés ;
- [ ] download fonctionne ;
- [ ] partage natif lorsque supporté ;
- [ ] aucun stockage cloud ;
- [ ] aucune mutation du Socle ;
- [ ] ressources temporaires libérées ;
- [ ] CI + Browser regression verts ;
- [ ] smoke HTTPS/Preview validé.

## 19. Interdictions anti-scope-creep

Ne pas créer galerie, stockage cloud, URLs publiques, filtre photo avancé, partage social backend, vidéo ou éditeur d'image.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : prix feature, architecture capture, formats/résolutions, navigateurs/appareils testés, Preview, CI, production, limites connues du Web Share et dettes V2.3.

**Ne pas démarrer V2-09 dans cette PR.**