# V2-09 — Harmonisation UX V2

> **Statut : spécifiée — prête à exécuter après V2-01 à V2-08.**
>
> **Date : 4 septembre 2026.**
>
> **Nature : consolidation UX/UI, sans nouvelle feature métier majeure.**

Ce fichier est le prompt autonome d'exécution de V2-09 et deviendra son historique après réalisation.

## 1. Prompt d'exécution

Lis l'index, ce fichier et les comptes rendus finaux V2-01 à V2-08. Inspecte l'application réelle sur téléphone, tablette et desktop, le design system, les états Socle, la Boutique, Placement, Bio/Personnalité, Journal, Studio, offline/pending/errors.

GitHub obligatoire. Supabase en lecture/audit pour vérifier que les libellés reflètent les vraies règles. Vercel recommandé pour une Preview finale UX.

## 2. Contexte réel

La V2.0 a ajouté plusieurs surfaces dans des étapes verticales. V2-09 ne doit pas redessiner chaque feature indépendamment, mais faire disparaître les incohérences de navigation, hiérarchie, wording, responsive et états.

## 3. Décisions métier actées

- Boutique unique ;
- catégories distinctes `Accessoires`, `Sols`, `Fonctionnalités` ;
- accessoires/sols = biens permanents au compte ;
- features = liées au caillou ;
- Bio/Stats gratuits ;
- Personnalité et Journal payants ;
- Placement et Studio sont des modes explicites ;
- caméra sélectionnable en Placement ;
- aucun système de compositions multiples.

## 4. Objectif utilisateur

Un utilisateur qui découvre V2.0 doit comprendre où acheter, où personnaliser, où manipuler, où consulter l'identité et comment revenir au Socle sans mémoriser l'histoire technique de la roadmap.

## 5. Périmètre précis

### Lot A — Audit des surfaces

Cartographier :

- header ;
- actions principales ;
- actions secondaires ;
- Boutique ;
- Placement ;
- Bio/Stats ;
- Personnalité ;
- Journal ;
- Studio ;
- Jeter ;
- états offline/reconnecting ;
- dialogs/panels/toasts.

Identifier doublons, CTA concurrents, états contradictoires et zones perdues sur petits écrans.

### Lot B — Hiérarchie Socle

Conserver une hiérarchie courte. Les fonctions fréquentes restent accessibles sans transformer l'écran en tableau de bord.

Définir clairement :

- soin/interactions ;
- personnalisation/manipulation ;
- identité/histoire ;
- commerce ;
- compte/Jeter.

### Lot C — Boutique

Harmoniser :

- catégories ;
- `Acheter`, `Possédé`, `Placée`, `Sélectionné`, `Débloqué pour ce caillou`, `Verrouillé` ;
- insuffisance de Lithons ;
- pending/retry ;
- gratuit ;
- explication « reste au compte » vs « lié à ce caillou » sans jargon technique.

### Lot D — Placement

- sélection objet/caméra lisible ;
- barre contextuelle cohérente ;
- Annuler/Terminer visibles ;
- état Permit verrouillé expliqué ;
- aucun conflit avec Boutique/Studio ;
- ciblage tactile sans petites zones impossibles.

### Lot E — Bio / Personnalité / Journal

Bio/Stats de base doit rester utile gratuitement. Les sections payantes doivent être compréhensibles sans donner l'impression que la Bio entière a été mise derrière un paywall.

Éviter plusieurs CTA différents pour acheter la même feature.

### Lot F — Studio

Entrée/sortie claire, contrôles caméra cohérents avec le reste de l'app mais suffisamment distincts du Placement pour éviter la confusion.

### Lot G — Responsive/accessibilité

- téléphone portrait ;
- tablette portrait/paysage ;
- desktop ;
- clavier/focus ;
- 44 px minimum pour cibles tactiles lorsque pertinent ;
- reduced motion ;
- contraste ;
- lecteurs d'écran sur contrôles principaux ;
- dialogs scrollables sans bloquer la fermeture.

### Lot H — Wording et feedback

Uniformiser :

- chargement ;
- offline ;
- reconnexion ;
- réussite ;
- retry ;
- état non confirmé ;
- verrou économique ;
- possession vs fonctionnalité.

Garder le ton CAILLOU™ sans faire de l'humour au détriment d'une erreur critique.

## 6. Hors périmètre

- nouvelle feature ;
- changement de prix ;
- nouveau schéma SQL majeur ;
- refonte complète de direction artistique ;
- animations lourdes ;
- nouvelles catégories commerce non prévues ;
- V2.1.

## 7. Architecture cible

Les règles UX doivent dériver des états React et contrats métier existants. Ne pas recréer un pont DOM, observer des classes CSS pour déterminer une capacité ou dupliquer les règles de `pedestalState` dans chaque composant.

## 8. Contrats frontend / 3D / physique

Aucune modification physique volontaire. Les changements autour de la scène doivent rester de présentation : overlays, spacing, contrôles, focus, feedback sélection.

## 9. Contrats Supabase

Aucun DDL attendu. Si l'UX révèle un manque de donnée serveur nécessaire, privilégier une lecture/agrégation existante. Toute migration doit être justifiée comme bug de contrat, pas commodité visuelle.

## 10. Migration / compatibilité

Pas de backfill attendu. Préserver l'état utilisateur et les caches existants.

## 11. RLS / sécurité

Ne jamais remplacer un gating serveur par un simple bouton masqué. Les états UX doivent refléter la sécurité existante, pas la remplacer.

## 12. Offline / PWA

Chaque surface doit avoir un comportement cohérent :

- lecture du dernier état connu possible ;
- mutation indisponible expliquée ;
- sortie d'un mode toujours possible ;
- reconnexion non destructive ;
- aucune modalité qui enferme l'utilisateur offline.

## 13. Performance

L'harmonisation ne doit pas ajouter une bibliothèque UI lourde sans nécessité. Éviter overlays toujours montés, images/previews chargées hors besoin et animations coûteuses.

## 14. UX appareils

Faire une vraie matrice écran/appareil et documenter les corrections. Priorité au tactile, puis desktop.

## 15. Tests unitaires utiles

Uniquement pour règles partagées : labels/états dérivés, capability mapping, navigation/mode transitions, pas de snapshots JSX massifs.

## 16. Browser regression

Réutiliser les parcours V2-01 à V2-08 et ajouter les transitions entre features : Boutique→Placement, Bio→Personnalité, Bio→Journal, Socle→Studio→Socle, offline pendant dialogs/modes, navigation petits écrans.

## 17. Discipline plateformes

Une branche/PR principale. Pas de migration sauf besoin réel. Une Preview Vercel finale est recommandée pour inspection téléphone/tablette distante. Éviter les tests redondants.

## 18. Critères d'acceptation

- [ ] hiérarchie Socle compréhensible ;
- [ ] Boutique clairement segmentée ;
- [ ] états économiques cohérents ;
- [ ] Placement lisible ;
- [ ] Bio gratuit distinct des features payantes ;
- [ ] Journal/Studio accessibles sans duplication de navigation ;
- [ ] offline/pending/retry homogènes ;
- [ ] téléphone/tablette/desktop validés ;
- [ ] accessibilité de base validée ;
- [ ] aucune nouvelle feature cachée ;
- [ ] CI + Browser regression verts.

## 19. Interdictions anti-scope-creep

Ne pas changer les règles métier, les prix, la physique, l'économie ou ajouter un nouveau design system externe simplement pour « moderniser ».

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : audit UX, principaux changements, écrans/appareils testés, règles de wording, éventuelles dettes, CI, Preview, production.

**Ne pas démarrer V2-10 dans cette PR.**