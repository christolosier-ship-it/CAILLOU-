# V2-00 — Architecture, cadrage et migrations

> **Statut : spécifiée — prête à exécuter.**
>
> Ce document est le prompt autonome d'exécution de l'étape V2-00 de CAILLOU™.
> Il complète `docs/roadmap/00-INDEX-ROADMAP.md` et doit être utilisé comme cahier des charges lorsque le chantier V2-00 sera lancé.
>
> Baseline documentaire au moment de sa rédaction : `main` au commit `a5e15bd4825923dbcc4714a9fcbdfde313f5ce6c`, après publication V1.0 et nettoyage post-V1. L'exécution future doit toutefois partir du `main` réel du moment, pas forcer ce SHA si le dépôt a évolué entre-temps.

## Prompt d'exécution

Tu travailles sur le projet CAILLOU™.

### Plateformes

GitHub :
- dépôt : `christolosier-ship-it/CAILLOU-`
- branche de référence : `main`
- release historique V1 : tag `v1.0.0`

Supabase :
- projet : `CAILLOU-`
- project ref : `zibhzhpvtiplbkhioqco`

Vercel :
- projet : `caillou`
- project id : `prj_s7mALANJeRy7DM7qq4umXnYobuz1`
- team id : `team_UBsxpombLG8nzlOvgUNXMmJL`

### Plugins obligatoires

- GitHub obligatoire.
- Supabase obligatoire pour auditer les contrats réellement en production et vérifier qu'aucune hypothèse frontend ne contredit le backend.
- Vercel obligatoire pour contrôler la stratégie de déploiement et l'état production, mais ne pas déclencher de Preview inutile.

Avant toute modification :

1. lire `docs/roadmap/00-INDEX-ROADMAP.md` ;
2. lire intégralement ce document ;
3. inspecter l'état réel du code sur `main` ;
4. inspecter les contrats Supabase réellement déployés ;
5. vérifier la production Vercel actuelle ;
6. ne jamais réécrire les documents de `docs/roadmap/archive/v1/`.

---

## 1. Finalité de V2-00

V2-00 n'ajoute pas encore une nouvelle fonctionnalité utilisateur majeure.

Son objectif est de rendre l'architecture suffisamment explicite, modulaire et stable pour accueillir sans spaghettification :

- Placement 2.0 ;
- compositions multiples ;
- nouveaux accessoires ;
- sols ;
- peinture ;
- Bio/personnalité 2.0 ;
- journal de vie ;
- Studio Photo ;
- puis les extensions V2.1 à V2.4.

Le chantier doit corriger la dette structurelle du Socle révélée à la fin de la V1, tout en figeant les contrats architecturaux nécessaires aux étapes V2 suivantes.

La règle directrice est :

> **DOM = rendu. React = source de vérité UI. Supabase = source de vérité serveur et économique.**

---

## 2. Invariants V1 à préserver absolument

V2-00 est un refactor de fondation. Le comportement utilisateur V1 doit rester fonctionnel.

Préserver notamment :

- authentification et session ;
- showroom des 20 cailloux ;
- adoption et nommage ;
- Socle ;
- caresse et génération de Lithons ;
- nettoyage et poussière ;
- Boutique unifiée ;
- achat et propriété des accessoires ;
- plusieurs instances simultanées, plafond actuel de huit ;
- Permis de manutention minérale ;
- Placement actuel du caillou et des accessoires ;
- translation/orientation/échelle selon les règles V1 ;
- sol infranchissable ;
- intersections volontaires hors sol pendant Placement ;
- reprise Rapier et stabilisation ;
- persistance des transforms ;
- Bio/Stats ;
- Jeter et nouvelle adoption ;
- mode offline/dégradé ;
- réconciliation réseau et idempotence ;
- PWA ;
- autorité Supabase sur prix, soldes, achats, possessions et états persistants.

Aucune nouvelle architecture ne doit affaiblir les règles RLS, RPC, idempotence ou sécurité acquises en V1.

---

## 3. Dette architecturale actuelle à supprimer

### 3.1 `Pedestal.tsx` concentre trop de responsabilités

Au démarrage de V2-00, `src/features/pedestal/Pedestal.tsx` concentre encore notamment :

- rendu principal du Socle ;
- modes `orbit`, `caress`, `cleaning`, `placement`, `settling` ;
- gestuelle caresse ;
- gestuelle nettoyage ;
- économie locale affichée ;
- Boutique ;
- Permis ;
- chargement/ajout/retrait d'accessoires ;
- session Placement ;
- cible et outil de Placement ;
- pose du caillou ;
- stabilisation physique ;
- persistance accessoire ;
- persistance composition ;
- restauration après erreur ;
- feedbacks et haptique ;
- anciennes responsabilités Bio.

La taille du fichier n'est pas en elle-même le critère de réussite. Le problème est l'absence de frontières explicites entre orchestration, règles d'état, mutations et rendu.

### 3.2 `Step11Pedestal` est un raccord historique à supprimer

`src/features/pedestal/Step11Pedestal.tsx` est une surcouche historique de l'étape V1-11.

Elle communique actuellement avec `Pedestal` en observant et modifiant son DOM :

- `querySelector` sur les boutons/classes du Socle ;
- `addEventListener` en capture ;
- `preventDefault` ;
- `stopPropagation` / `stopImmediatePropagation` ;
- modification directe de `disabled` et d'attributs ;
- `MutationObserver` ;
- lecture de classes CSS pour déduire l'état métier ;
- interception du Bio et de Jeter.

Cette couche doit disparaître.

Une classe CSS ne doit plus servir d'API métier entre composants React.

### 3.3 Bio existe sous deux générations

Le Bio historique de `Pedestal` et le `BioDialog` moderne ne doivent plus coexister avec une interception DOM permettant de choisir lequel gagne.

À la fin de V2-00 il doit exister un seul flux Bio explicite.

### 3.4 Jeter ne doit plus être réactivé depuis l'extérieur du composant

Le bouton Jeter ne doit plus être créé comme « en préparation » dans un composant puis rendu fonctionnel par mutation DOM depuis son parent.

Son état disponible/indisponible et son action doivent provenir de l'état React canonique.

---

## 4. Architecture cible du Socle

Ne pas imposer artificiellement un grand framework de state machine ni ajouter une dépendance globale si les primitives React suffisent.

Préférer :

- types explicites ;
- fonctions pures ;
- `useReducer` ou contrôleur React équivalent ;
- hooks métier ciblés déjà existants lorsque leur responsabilité est saine ;
- composition de composants.

Éviter de remplacer un gros fichier par des dizaines de micro-fichiers sans cohérence.

### Cible conceptuelle

```text
AuthenticatedHome
       │
       ▼
 PedestalScreen
       │
       ├── contrôleur / reducer Socle
       │      ├── état d'interaction
       │      ├── capacités
       │      ├── réseau
       │      └── orchestration des features
       │
       ├── vue du Socle
       │      ├── header
       │      ├── actions
       │      ├── overlays/dialogs
       │      └── scène 3D
       │
       └── hooks métier existants
              ├── accessoires
              ├── permis
              ├── caresse
              ├── nettoyage
              ├── Bio
              └── Jeter
```

Les noms exacts de fichiers peuvent évoluer après inspection. La séparation de responsabilités est obligatoire, pas cette nomenclature précise.

---

## 5. État canonique du Socle

Le Socle possède déjà implicitement une machine à états. V2-00 doit la rendre explicite.

Modèle minimal attendu, adaptable après audit :

```text
interactionMode:
  idle/orbit
  caress
  cleaning
  placement
  settling

overlay:
  none
  shop
  bio
  discard

network:
  online
  reconnecting
  offline
```

Les opérations asynchrones/pending doivent rester représentées explicitement lorsque nécessaire.

À partir de cet état, produire des règles/capacités pures, par exemple :

- `canCaress` ;
- `canClean` ;
- `canOpenShop` ;
- `canOpenBio` ;
- `canDiscard` ;
- `canEnterPlacement` ;
- `canExitPlacement` ;
- `canPurchase` ;
- `canPersist`.

Ces noms sont indicatifs.

Les règles doivent couvrir les subtilités V1, notamment :

- Bio et Jeter bloqués pendant Placement/settling ;
- mutations bloquées offline ;
- possibilité de quitter un mode même lorsque l'entrée dans une nouvelle mutation est bloquée ;
- exclusivité des modes caresse/nettoyage/placement ;
- Boutique et dialogues incompatibles avec les modes qui doivent rester exclusifs ;
- opérations pending empêchant les doubles soumissions ;
- réconciliation réseau explicite.

Le rendu dérive de cet état. Le DOM ne doit jamais être relu pour reconstruire cet état.

---

## 6. Lot A — Introduire le contrôleur Socle

Créer une source de vérité React explicite pour l'état du Socle.

Attendus :

- reducer/contrôleur ou équivalent testable ;
- transitions explicites ;
- fonctions de capacités pures ;
- suppression progressive des combinaisons dispersées de `setState` lorsqu'elles représentent une transition de mode ;
- aucune modification UX volontaire ;
- conservation des hooks métier déjà sains comme `useAccessoryPlacements` et `useRockMovementPermit` sauf preuve contraire.

Ajouter uniquement les tests unitaires utiles pour les transitions et capacités critiques.

Ne pas introduire Redux, XState, Zustand ou autre dépendance d'état globale sans nécessité démontrée.

---

## 7. Lot B — Supprimer le pont DOM `Step11Pedestal ↔ Pedestal`

Transformer Bio, Jeter et réseau en contrats React normaux.

À la fin de ce lot :

- aucun `querySelector` de production utilisé pour piloter les fonctionnalités du Socle ;
- aucun `MutationObserver` de production utilisé pour synchroniser l'état métier du Socle ;
- aucune mutation directe de `button.disabled` ou d'attributs métier ;
- aucune interception `stopImmediatePropagation()` permettant de remplacer l'action d'un enfant ;
- aucune logique métier dépendant de classes CSS telles que `is-placement-mode` ;
- un seul Bio ;
- un seul flux Jeter ;
- état offline/réseau propagé explicitement ;
- `Step11Pedestal.tsx` supprimé lorsqu'il n'a plus de responsabilité propre ;
- `step11ControlRules.ts` et ses tests supprimés ou remplacés par les nouvelles règles canoniques ;
- `AuthenticatedHome` charge directement le nouveau Socle unifié.

Le nom final peut rester `Pedestal` ou devenir `PedestalScreen`, mais il ne doit plus exister deux générations superposées de l'écran.

---

## 8. Lot C — Réduire le rôle du god-component `Pedestal`

Une fois le pont Step11 supprimé, réduire les responsabilités du composant principal.

Extraire seulement les ensembles cohérents qui ont une vraie responsabilité autonome.

Candidats naturels :

- contrôleur des modes/capacités ;
- réseau/réconciliation ;
- orchestration caresse/nettoyage si cela clarifie réellement le composant ;
- dialogues/overlays ;
- éventuellement sous-vues de header/actions lorsque cela réduit la complexité sans créer de plomberie inutile.

Ne pas chercher une taille de fichier arbitraire.

Critère réel : lire le composant principal doit permettre de comprendre la composition du Socle sans parcourir au milieu des détails de chaque mutation, geste et rollback.

---

## 9. Limite du chantier : ne pas réécrire `ShowroomScene` maintenant

`src/scene/ShowroomScene.tsx` porte encore trop de responsabilités : viewer showroom, interactions du Socle, Placement, accessoires et physique.

Cette dette est reconnue mais son refactor profond appartient à **V2-01 — Placement 2.0**.

Pendant V2-00 :

- adapter proprement ses props si le nouveau contrôleur l'exige ;
- ne pas lancer une réécriture de la caméra, Rapier, gestures ou Placement ;
- ne pas modifier volontairement la grammaire tactile ;
- ne pas créer `PedestalScene`/`RockViewport` uniquement pour déplacer du code sans bénéfice immédiat.

V2-00 doit préparer l'interface qui rendra ce découpage plus facile en V2-01, pas absorber V2-01.

---

## 10. Cadrage architectural des fonctions V2.0 futures

V2-00 doit également figer les contrats de haut niveau nécessaires à la suite de la roadmap, sans implémenter prématurément les features.

### 10.1 Composition canonique

Définir ce qu'une future composition pourra contenir :

- pose du caillou ;
- instances d'accessoires et transforms ;
- peinture ;
- sol ;
- plus tard éclairage et arrière-plan.

Définir :

- identité d'une composition ;
- composition active ;
- version du format si nécessaire ;
- stratégie de compatibilité avec l'unique composition V1 actuelle ;
- frontière entre état de travail/draft et état serveur canonique.

Ne pas créer une table Supabase inutilisée uniquement pour anticiper V2-02.

### 10.2 Peinture

Figer l'approche technique envisagée pour V2-05 :

- matériau original conservé ;
- couleur/finition persistantes sous forme de paramètres lorsque possible ;
- retour garanti à la roche naturelle ;
- pas de texture bitmap générée côté client pour la V2.0 simple si des paramètres suffisent ;
- prévoir l'extension V2.4 par zones/motifs sans bloquer le modèle V2.0.

Ne pas implémenter l'éditeur peinture pendant V2-00.

### 10.3 Sols / décors

Définir un futur catalogue cohérent avec les catalogues accessoires :

- identifiant stable ;
- label ;
- asset/material ;
- preview ;
- prix éventuel ;
- provenance/licence lorsque nécessaire ;
- budget asset ;
- propriété et sélection active.

Ne pas ajouter de contenu sol pendant V2-00.

### 10.4 Personnalité et journal

Définir les frontières entre :

- identité stable du caillou ;
- traits de personnalité ;
- statistiques calculées ;
- événements historiques ;
- journal éditorial ;
- futures évolutions V2.2.

Le journal futur doit pouvoir reposer sur des événements déterministes et traçables, pas sur une génération aléatoire différente à chaque affichage.

Ne pas implémenter la personnalité V2 pendant V2-00.

---

## 11. Supabase et stratégie de migration

V2-00 doit inspecter le schéma réel et documenter une stratégie V1 → V2 sans perte.

Invariants de migration :

- aucun utilisateur perdu ;
- aucun caillou actif perdu ;
- nom/adoption/pose conservés ;
- wallet et ledger conservés ;
- accessoires possédés conservés ;
- instances placées et transforms conservés ;
- Permis/déblocages permanents conservés ;
- aucun prix ou solde rendu autoritaire côté client ;
- RLS par utilisateur conservée ;
- RPC sensibles toujours idempotents lorsque la répétition réseau est possible.

### Règle anti-spéculation

Ne pas créer des tables, colonnes, fonctions ou migrations uniquement parce qu'elles seront probablement utiles plus tard.

Une migration V2-00 n'est acceptable que si :

1. elle est nécessaire à la nouvelle fondation immédiatement utilisée ; ou
2. elle constitue un prérequis structurel rétrocompatible clairement démontré et qu'il serait risqué de reporter.

Sinon, documenter le futur contrat et laisser la migration à l'étape fonctionnelle correspondante.

Si une migration est réellement appliquée :

- utiliser `apply_migration` ;
- vérifier RLS/grants ;
- générer/mettre à jour les types si nécessaire ;
- lancer les advisors sécurité/performance ;
- vérifier la compatibilité des données V1.

---

## 12. Performance et budgets V2

Mesurer l'état réel avant de figer de nouveaux budgets.

Baseline connue V1 :

- 20 GLB cailloux sous le budget 5 MiB ;
- accessoires V1 sous le budget 5 MiB ;
- gros runtime 3D/physique chargé à la demande, environ 1 MiB gzip lors de la release V1 ;
- PWA à caches bornés.

V2-00 doit définir ou confirmer des garde-fous pour :

- GLB ;
- textures futures ;
- nombre de ressources simultanément résidentes ;
- mémoire GPU ;
- lazy loading ;
- cache PWA ;
- compositions futures ;
- absence de simulation physique permanente inutile au repos.

Ne pas optimiser à l'aveugle. Documenter une dette mesurée plutôt que lancer un refactor de performance sans preuve.

---

## 13. Tests et non-régression

Réutiliser les deux workflows actifs :

- `CI` ;
- `Browser regression`.

Ne pas recréer une forêt de workflows par étape.

### Tests unitaires à ajouter ou adapter

Protéger au minimum :

- transitions du Socle ;
- capacités selon mode/réseau/pending ;
- exclusivité des modes ;
- Bio/Jeter indisponibles lorsque requis ;
- sortie de Placement possible dans les cas prévus ;
- comportement offline explicite.

### E2E à adapter

L'ancien test Step11 protège en partie l'interception DOM. Après refactor, il doit protéger le **comportement produit**, pas le bricolage historique.

Vérifier notamment :

- Bio disponible en état normal ;
- Bio bloqué pendant Placement/settling si c'est la règle retenue ;
- Jeter disponible lorsqu'il doit l'être ;
- Jeter bloqué offline ;
- retry Jeter réutilisant le même event key ;
- caresse/nettoyage/Boutique/Placement sans régression ;
- état vide après Jeter ;
- reprise réseau.

Supprimer les assertions du type « le legacy Bio handler a bien été intercepté » lorsque le legacy n'existe plus.

Les tests tactiles automatisés ne remplacent pas une validation visuelle finale si l'implémentation a réellement touché le comportement du Socle.

---

## 14. Interdits explicites

V2-00 ne doit pas :

- ajouter Peinture, Sols, Compositions multiples, Personnalité, Journal ou Studio Photo ;
- réécrire profondément `ShowroomScene` ;
- changer volontairement l'UX Placement ;
- modifier les règles économiques ;
- affaiblir RLS/grants ;
- créer des données Supabase spéculatives ;
- ajouter une nouvelle librairie de state management sans justification forte ;
- conserver `Step11Pedestal` comme simple couche de compatibilité permanente ;
- utiliser le DOM ou les classes CSS comme bus d'état métier ;
- multiplier les fichiers uniquement pour faire baisser artificiellement la taille de `Pedestal.tsx` ;
- ajouter des workflows GitHub redondants ;
- déclencher des Preview Vercel à chaque commit.

---

## 15. Discipline GitHub / Supabase / Vercel

### GitHub

- travailler sur une branche dédiée ;
- conserver `main` déployable ;
- commits lisibles et ciblés ;
- une PR V2-00 principale est préférable à une succession de merges intermédiaires qui provoqueraient des déploiements production inutiles ;
- fusion uniquement avec les contrôles essentiels verts ;
- ne pas déclarer l'étape terminée si le pont DOM historique subsiste.

### Supabase

- audit obligatoire ;
- modification non obligatoire ;
- ne rien changer si le refactor frontend n'exige aucune évolution serveur ;
- toute migration doit être justifiée, rétrocompatible et testée.

### Vercel

- ne pas déployer une Preview par réflexe ;
- la branche de développement peut rester sans Preview ;
- si une validation visuelle/tactile distante apporte une vraie valeur, créer **une seule Preview finale intentionnelle** après CI verte ;
- après merge, vérifier le déploiement production, HTTP 200 et les erreurs runtime pertinentes.

---

## 16. Critères d'acceptation V2-00

L'étape est terminée uniquement si tous les points suivants sont vrais :

### Architecture Socle

- [ ] un état React canonique représente explicitement les modes/overlays/réseau utiles ;
- [ ] les capacités des actions sont dérivées de règles testables ;
- [ ] aucune règle métier du Socle ne dépend de classes CSS ;
- [ ] aucune orchestration métier du Socle ne dépend de `querySelector` ;
- [ ] aucun `MutationObserver` ne sert à synchroniser deux composants du Socle ;
- [ ] Bio possède un seul flux ;
- [ ] Jeter possède un seul flux ;
- [ ] réseau/offline est transmis explicitement ;
- [ ] `Step11Pedestal` et ses règles historiques ont disparu lorsqu'ils ne sont plus nécessaires ;
- [ ] le composant principal du Socle n'est plus l'unique propriétaire de toutes les responsabilités métier ;
- [ ] `AuthenticatedHome` pointe vers le Socle unifié.

### Non-régression

- [ ] caresse fonctionne ;
- [ ] nettoyage fonctionne ;
- [ ] Boutique fonctionne ;
- [ ] accessoires fonctionnent ;
- [ ] Permis fonctionne ;
- [ ] Placement V1 fonctionne ;
- [ ] stabilisation/persistance fonctionnent ;
- [ ] Bio fonctionne ;
- [ ] Jeter/retry/nouvelle adoption fonctionnent ;
- [ ] offline/reconnexion restent cohérents ;
- [ ] aucune régression RLS/économie connue ;
- [ ] `CI` verte ;
- [ ] `Browser regression` verte.

### Cadrage V2

- [ ] modèle canonique de composition documenté ;
- [ ] architecture Peinture documentée ;
- [ ] contrat catalogue Sols/Décors documenté ;
- [ ] frontières Personnalité/Journal documentées ;
- [ ] stratégie de migration V1 → V2 documentée ;
- [ ] budgets V2 définis ou explicitement mesurés/reportés ;
- [ ] aucune table ou feature spéculative ajoutée sans usage immédiat.

### Plateformes

- [ ] Supabase contrôlé et sain ;
- [ ] Vercel final contrôlé si un déploiement est réalisé ;
- [ ] aucun déploiement Vercel inutile consommé.

---

## 17. Sortie attendue

À la fin de l'exécution :

1. le Socle V1 se comporte comme avant, mais son architecture React est saine ;
2. le raccord `Step11Pedestal ↔ Pedestal` n'existe plus ;
3. les responsabilités du Socle sont suffisamment séparées pour que V2-01 puisse refactorer la scène/Placement sans reprendre ce chantier ;
4. les futurs modèles V2 sont documentés sans code mort ni schéma spéculatif ;
5. les tests protègent les règles métier et non les hacks historiques ;
6. GitHub, Supabase et Vercel sont vérifiés dans leur état réel ;
7. `docs/roadmap/00-INDEX-ROADMAP.md` est mis à jour avec le statut de V2-00 ;
8. ce document reçoit un compte rendu final : date, PR, commits, décisions d'architecture, éventuelles migrations, dette reportée et état des contrôles.

Ne passer à **V2-01 — Placement 2.0** qu'une fois V2-00 réellement terminé.

---

## État / compte rendu

**Statut : à exécuter.**

À compléter pendant le chantier V2-00 avec :

- date ;
- PR / commits ;
- architecture finale retenue ;
- fichiers supprimés/remplacés ;
- migrations Supabase éventuelles ;
- résultat CI / Browser regression ;
- Preview Vercel éventuelle et justification ;
- état production après merge ;
- dette explicitement reportée vers V2-01 ou une étape ultérieure.
