# V2-02 — Socle canonique & économie V2

> **Statut : spécifiée — prête à exécuter après V2-01.**
>
> **Date de spécification : 4 septembre 2026.**
>
> **Position : fondation serveur/économie de la V2.0.**
>
> **Dépendances : V2-00 terminée, V2-01 terminée et validée.**
>
> Ce fichier est le **prompt autonome d'exécution** de V2-02. Après réalisation, il devient le compte rendu historique de l'étape.

## 1. Prompt d'exécution

Tu travailles sur CAILLOU™ après V2-01. Lis intégralement :

- `docs/roadmap/00-INDEX-ROADMAP.md` ;
- ce fichier ;
- le compte rendu final de `V2-01-PLACEMENT-2-0-SCENE-INTERACTIVE.md` ;
- `V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md` ;
- `ARCHITECTURE-TECHNIQUE.md` ;
- les migrations Supabase actives ;
- les fonctions publiques/privées d'achat, adoption, discard, placement et stabilisation ;
- le code frontend Boutique, Permis, possessions et `usePedestalPlacement`.

Inspecte le **dernier `main` réel** et le schéma Supabase réellement déployé avant d'écrire une migration.

Plugins : GitHub et Supabase obligatoires. Vercel uniquement pour une validation finale utile.

## 2. Contexte réel au moment de la spécification

Le modèle V1 comprend notamment :

- `user_rocks` pour le caillou actif/historique et sa pose ;
- `user_accessories(user_id, accessory_id)` pour la possession de types ;
- `equipped_accessories` pour les instances placées ;
- `feature_catalog` ;
- `user_feature_unlocks(user_id, feature_id)` pour les déblocages V1 liés au compte ;
- `wallets` + `lithon_ledger` ;
- RPC idempotents avec `event_key`.

Au 4 septembre 2026, toutes les tables publiques du projet sont sous RLS et le projet est `ACTIVE_HEALTHY`.

Le RPC V1 `create_equipped_accessory` permet encore plusieurs instances d'un accessoire possédé, avec plafond 8. Le Permis V1 est encore lié au compte.

## 3. Décisions métier actées et non négociables

### 3.1 Un seul Socle persistant

Un caillou actif possède **un seul petit monde**. Il n'existe pas de système de compositions multiples.

Ne pas créer de table `compositions` simplement parce que V2-00 l'avait envisagée avant révision produit.

Le modèle normalisé existant peut rester la base canonique si son évolution est suffisante.

### 3.2 Accessoires unitaires

Chaque référence du catalogue accessoires représente **un objet unique** :

- achat une seule fois par compte ;
- possession permanente au compte ;
- placement au maximum une seule fois simultanément ;
- aucun clonage/multi-instance depuis Placement ;
- si un doublon visuellement identique existe un jour, il doit avoir une référence catalogue distincte.

### 3.3 Biens compte vs fonctionnalités caillou

**Biens permanents au compte** : accessoires, sols et futurs biens décoratifs.

**Fonctionnalités liées au caillou** : Permis, Peinture, Personnalité, Journal, Studio Photo et futures capacités équivalentes.

Une fonctionnalité est acquise pour un `user_rock_id` précis. Jeter ce caillou ne transmet aucun de ses déblocages au suivant.

### 3.4 Migration du Permis V1

Décision explicite : **le Permis V1 déjà payé n'est pas transféré gratuitement sur le caillou V2 actif**.

- l'historique de dépense V1 reste conservé ;
- l'ancien entitlement compte n'est pas converti en entitlement caillou ;
- même le premier caillou V2 doit racheter le Permis ;
- après changement de caillou, le nouveau doit également acheter son propre Permis.

### 3.5 Entitlement ≠ forcément achat

Préparer le modèle pour qu'un futur succès puisse accorder un bien ou une fonctionnalité sans dépense Lithon.

Ne pas implémenter le système de succès en V2-02.

## 4. Objectif utilisateur

À la fin de V2-02 :

- l'utilisateur possède chaque accessoire une seule fois ;
- le Placement n'autorise plus à fabriquer des copies ;
- les accessoires possédés survivent au changement de caillou ;
- le Permis et les futures fonctionnalités sont propres au caillou ;
- jeter un caillou remet les accessoires possédés dans un état disponible pour le suivant ;
- le solde et les prix restent autoritaires ;
- aucune donnée V1 utile n'est perdue ;
- la PWA encore en cache ne peut pas contourner les nouvelles règles serveur.

## 5. Périmètre précis

### Lot A — Audit et contrat de données final

Avant migration, établir l'état réel :

- données `user_feature_unlocks` ;
- données `user_accessories` ;
- placements actifs ;
- ledger ;
- fonctions `purchase_accessory`, `purchase_feature_unlock`, `create/remove/stabilize_equipped_accessory`, `discard_active_rock`, `stabilize_rock_composition` ;
- reçus d'idempotence.

Choisir la migration la plus additive possible.

### Lot B — Entitlements liés au caillou

Créer un modèle canonique de déblocages par caillou, par exemple conceptuellement :

```text
rock_feature_unlocks
- user_rock_id
- feature_id
- acquired_at
- acquisition_source   purchase | grant
- price_paid
```

Les noms SQL peuvent différer après audit, mais les propriétés métier sont obligatoires.

Contraintes :

- propriété du caillou vérifiée serveur ;
- unicité `(user_rock_id, feature_id)` ;
- historique conservé après discard ;
- nouveau caillou sans entitlement ;
- source d'acquisition explicite afin de rester compatible avec un futur `grant`.

### Lot C — RPC d'achat d'une fonctionnalité pour un caillou

Créer un contrat autoritaire, par exemple :

```text
purchase_rock_feature_unlock(user_rock_id, feature_id, event_key)
```

Exigences :

- auth requise ;
- caillou actif et possédé ;
- feature active ;
- prix lu côté serveur ;
- wallet verrouillé ;
- déduction atomique ;
- entitlement créé atomiquement ;
- ledger cohérent ;
- idempotence même `event_key` ;
- double achat bloqué.

### Lot D — Compatibilité du RPC V1

Le vieux client PWA peut encore appeler `purchase_feature_unlock(feature_id, event_key)`.

Ne pas laisser cet appel acheter silencieusement un entitlement compte incompatible V2.

Choisir après audit une stratégie de compatibilité sûre, avec préférence pour :

- dériver le caillou actif côté serveur ;
- router l'appel V1 vers le nouveau contrat V2 lorsque possible ;
- ou refuser proprement avec un état d'upgrade contrôlé si la compatibilité ne peut pas être garantie.

Le serveur doit rester la dernière barrière : un client V1 ne doit jamais réactiver un Permis perdu sur un nouveau caillou.

### Lot E — Migration du Permis historique

Pour `rock_movement` :

- préserver toutes les lignes ledger historiques ;
- ne créer aucun `rock_feature_unlock` gratuit depuis l'ancien `user_feature_unlocks` ;
- empêcher l'ancien entitlement compte d'être interprété comme droit V2 actif ;
- documenter précisément ce qui advient de la ligne legacy (`archive`, suppression contrôlée, miroir de compatibilité ou autre stratégie justifiée).

L'utilisateur ayant payé le Permis V1 accepte explicitement de devoir le repayer en V2.

### Lot F — Accessoires uniques

Le modèle `user_accessories` peut être conservé puisqu'il impose déjà un achat unique par référence.

Modifier le contrat de placement afin que :

- un accessoire possédé déjà placé sur le caillou actif soit indisponible dans « Ajouter un objet » ;
- le serveur refuse une deuxième instance de la même référence ;
- le frontend n'affiche plus de logique `#1`, `#2`, etc. pour une même référence ;
- retirer un accessoire le rend simplement disponible à nouveau ;
- jeter le caillou supprime/déséquipe le placement sans retirer la possession compte.

Une contrainte unique serveur du type `(user_rock_id, accessory_id)` est recommandée si elle correspond au schéma réel.

### Lot G — Préparation de l'économie générique

L'arrivée de sols et d'autres biens ne doit pas entraîner un champ FK spécialisé supplémentaire dans `lithon_ledger` pour chaque famille.

Faire évoluer le ledger de manière additive si nécessaire afin de permettre de référencer proprement de futurs achats de catégories diverses.

Principes :

- conserver les anciennes lignes et raisons V1 ;
- aucun backfill mensonger ;
- nouvelle représentation générique possible (`item_kind/item_id`, metadata contrôlée ou équivalent) ;
- prix et delta toujours serveur ;
- un entitlement gratuit/futur `grant` n'exige pas forcément une dépense ledger.

Ne pas créer dès maintenant les catalogues sols/décors.

### Lot H — Frontend Boutique / Placement

Adapter :

- état `Possédé` ;
- accessoire placé vs disponible ;
- Permit lié au caillou ;
- changement de caillou ;
- cache/reconciliation ;
- libellés qui parlaient de déblocage « permanent au compte ».

V2-02 ne redessine pas encore entièrement la Boutique : V2-09 fera l'harmonisation globale.

## 6. Hors périmètre

- sols ;
- peinture ;
- personnalité ;
- Journal ;
- Studio Photo ;
- système de succès ;
- ajout massif d'accessoires ;
- compositions multiples ;
- refonte visuelle globale Boutique.

## 7. Architecture cible

```text
Compte
├── wallet / ledger
├── biens possédés
│   └── accessoires uniques
└── historique de cailloux
    ├── Caillou A
    │   ├── Socle / placements
    │   └── feature unlocks A
    └── Caillou B actif
        ├── Socle / placements
        └── feature unlocks B
```

Le frontend ne déduit jamais une possession à partir du ledger. Les tables d'entitlement sont la vérité de droit ; le ledger est la vérité comptable.

## 8. Contrats frontend / 3D / physique

- le Placement V2-01 reste intact ;
- une référence accessoire correspond à un seul objet plaçable ;
- retrait = retour à l'inventaire disponible ;
- `usePedestalPlacement` ou son successeur consomme les nouvelles règles sans recréer de multi-instance ;
- les colliders et transforms V2-01 sont conservés.

## 9. Contrats Supabase

V2-02 est une étape **avec migrations probables**.

Toute nouvelle table publique :

- PK/FK explicites ;
- RLS activée immédiatement ;
- politiques minimales ;
- droits directs limités ;
- mutation sensible via RPC autoritaire ;
- index sur FK/chemins réels ;
- types TypeScript régénérés si le projet les versionne.

Utiliser `apply_migration`, jamais du DDL ad hoc par `execute_sql`.

## 10. Migration / backfill / compatibilité V1

La migration doit préserver :

- comptes ;
- cailloux ;
- wallet ;
- lifetime earned/spent ;
- ledger ;
- accessoires achetés ;
- placements compatibles ;
- pose du caillou ;
- progression.

Exception assumée : Permis V1 non transféré comme entitlement actif V2.

Si des données V1 contiennent plusieurs instances du même accessoire sur un même caillou, la migration doit **détecter ce cas avant d'ajouter l'unicité**. Ne pas supprimer silencieusement des instances. Produire une stratégie explicite et conserver une trace. Si la production réelle ne contient pas de doublon, le constater avant contrainte.

## 11. RLS / grants / RPC / idempotence / sécurité

Tests obligatoires :

- A ne lit pas les entitlements de B ;
- A ne débloque pas une feature sur le caillou de B ;
- prix client ignoré ;
- solde insuffisant ;
- double achat même event key ;
- double achat event keys différents ;
- feature inactive ;
- caillou jeté ;
- nouveau caillou sans héritage ;
- accessoire non possédé ;
- accessoire déjà placé ;
- tentative de seconde instance ;
- retry après réponse réseau ambiguë.

Après migration : advisors sécurité + performance.

## 12. Offline / PWA / réconciliation

- cache local non autoritaire ;
- après changement de caillou, invalider les feature unlocks de l'ancien dans l'état affiché ;
- possession accessoire compte conservée ;
- placement non confirmé jamais présenté comme canonique ;
- vieux cache PWA ne peut pas contourner les vérifications serveur ;
- les mutations retryables réutilisent leur event key.

## 13. Performance et budgets

Cette étape est surtout métier. Ne pas introduire de requêtes N+1 :

- charger les entitlements du caillou en une lecture raisonnable ;
- charger possessions accessoire en une lecture ;
- indexer seulement les accès démontrés ;
- éviter une vue SQL géante simplement pour simplifier un composant frontend.

## 14. UX téléphone / tablette / desktop

Comportements à rendre explicites :

- accessoire acheté = `Possédé` ;
- accessoire placé = `Placée`/état équivalent, non ajoutable une seconde fois ;
- feature non acquise sur ce caillou = verrouillée ;
- changement de caillou = nouveaux locks ;
- wallet conservé ;
- aucun message laissant croire qu'une feature est permanente au compte.

## 15. Tests unitaires utiles

- règles de disponibilité d'un accessoire ;
- distinction possession/placement ;
- distinction compte/caillou ;
- mapping des snapshots Supabase ;
- cache/reconciliation ;
- capacités frontend liées au nouvel entitlement.

## 16. Browser regression

Adapter les scénarios existants :

- acheter un accessoire ;
- impossible de racheter ;
- placer une fois ;
- impossible d'ajouter une copie ;
- retirer puis replacer ;
- jeter le caillou ;
- accessoire toujours possédé sur nouveau caillou ;
- Permit absent sur nouveau caillou ;
- achat Permit V2 ;
- Placement rock autorisé après achat ;
- reload/reconnexion ;
- non-régression V2-01.

## 17. Discipline plateformes

### GitHub

Une branche, une PR principale, commits structurés par migration/backend/frontend si utile. CI + Browser regression uniquement.

### Supabase

- audit préalable ;
- migrations via `apply_migration` ;
- tests SQL transactionnels ;
- advisors après DDL ;
- aucune branche Supabase payante sans demande explicite.

### Vercel

Preview finale uniquement si nécessaire pour valider l'upgrade PWA/UX. Après merge runtime, contrôler production.

## 18. Critères d'acceptation

- [ ] aucun système de compositions multiples créé ;
- [ ] accessoire catalogue achetable une seule fois ;
- [ ] une seule instance plaçable par référence ;
- [ ] possession accessoire survit au changement de caillou ;
- [ ] entitlements fonctionnalités liés au caillou ;
- [ ] nouveau caillou sans feature héritée ;
- [ ] Permis V1 non transféré ;
- [ ] historique de dépense V1 conservé ;
- [ ] nouveau Permis achetable pour le caillou ;
- [ ] modèle compatible futur `grant` sans moteur de succès ;
- [ ] wallet/ledger cohérents ;
- [ ] vieux client ne contourne pas les règles ;
- [ ] RLS et RPC validés ;
- [ ] advisors sans nouvelle alerte critique ;
- [ ] CI + Browser regression vertes ;
- [ ] production contrôlée.

## 19. Interdictions anti-scope-creep

Ne pas :

- ajouter sols/peinture/personnalité/Journal/Studio ;
- implémenter les succès ;
- généraliser tous les catalogues en une table polymorphe si les métiers spécialisés restent plus sûrs ;
- supprimer le ledger historique ;
- rembourser automatiquement le Permis V1 ;
- transférer le Permis V1 au caillou ;
- supprimer des doublons de placements historiques sans audit ;
- affaiblir les validations serveur pour faciliter le frontend.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : date, PR, SHA, migrations, schéma final, stratégie legacy `user_feature_unlocks`, RPC final d'achat par caillou, traitement du Permis V1, règle accessoires unitaires, compatibilité vieux client/PWA, tests SQL, advisors, CI, Browser regression, Preview éventuelle, production et dettes reportées.

**Ne pas démarrer V2-03 dans cette PR.**