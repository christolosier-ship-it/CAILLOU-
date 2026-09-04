# V2-07 — Journal de vie

> **Statut : spécifiée — prête à exécuter après V2-02 et V2-06.**
>
> **Date : 4 septembre 2026.**
>
> **Dépendances : V2-02 entitlements par caillou, V2-06 personnalité stable.**

Ce fichier est le prompt autonome d'exécution de V2-07 et deviendra son historique après réalisation.

## 1. Prompt d'exécution

Lis l'index, ce fichier, les comptes rendus V2-02/V2-06, les données `user_rocks`, `rock_progress`, `lithon_ledger`, acquisitions/entitlements, les RPC d'adoption/caresse/nettoyage/achat/jeter et les mécanismes d'idempotence.

GitHub et Supabase obligatoires. Vercel seulement pour une validation UX finale utile.

## 2. Contexte réel

La V1 possède déjà plusieurs sources historiques fiables mais pas de journal événementiel général : adoption datée, nettoyages, achats dans le ledger, progression et timestamps de certaines opérations.

V2-07 doit créer une mémoire canonique réutilisable plus tard par V2.2, sans inventer un passé absent des données.

Le Journal visible est une **fonctionnalité payante liée au caillou**.

## 3. Décisions métier actées

- Journal payant par caillou ;
- historique d'un caillou jeté conservable côté serveur ;
- backfill V1 uniquement pour les faits prouvables ;
- événements V2 déterministes et traçables ;
- aucun événement inventé pour « remplir » la timeline ;
- la projection éditoriale est distincte de l'événement source ;
- le stockage des événements doit être suffisamment canonique pour V2.2.

Décision structurelle V2-07 : **l'absence d'entitlement Journal ne doit pas empêcher l'enregistrement des événements métier futurs**. Le paywall contrôle l'accès à l'interface Journal, pas l'existence de l'histoire canonique. Ainsi, acheter Journal plus tard permet de voir l'histoire réellement accumulée.

## 4. Objectif utilisateur

Après achat du Journal, l'utilisateur découvre une chronologie de la vie réelle de son caillou : adoption, soins, acquisitions pertinentes, premières personnalisations et autres événements significatifs.

Le Journal doit sembler vivant sans devenir un flux bavard où chaque tap produit une ligne.

## 5. Périmètre précis

### Lot A — Taxonomie d'événements V2.0

Définir une liste stable et limitée d'événements significatifs. Minimum à envisager :

```text
rock_adopted
rock_renamed (si changement existe réellement)
cleaning_milestone ou cleaned significatif
first_accessory_placed
accessory_acquired / accessory_placed si utile
feature_unlocked
floor_acquired / floor_selected
paint_applied / paint_reset_natural
personality_unlocked/generated
journal_unlocked
studio_unlocked
rock_discarded
anniversary / milestone réellement calculable
```

Ne pas enregistrer automatiquement chaque micro-geste. Les événements à haute fréquence doivent être résumés en milestone ou rester dans `rock_progress`.

### Lot B — Event store append-only

Créer un modèle conceptuel :

```text
rock_events
- id
- user_rock_id
- event_type
- happened_at
- event_key nullable/unique selon source
- payload versionné et minimal
- source
- created_at
```

Principes :

- append-only côté client ;
- payload sans blob/image ;
- IDs externes seulement si nécessaires ;
- `event_type` contrôlé ;
- version de payload si nécessaire ;
- timestamps serveur pour les nouveaux événements.

### Lot C — Capture des nouveaux événements

Brancher l'enregistrement **dans les mutations métier autoritaires**, pas dans des `useEffect` UI fragiles.

Préférer qu'une transaction qui réalise une action crée aussi son événement canonique lorsque cela est pertinent : achat, unlock, peinture, sol, discard, etc.

Pour les événements dérivés de compteurs, utiliser une logique déterministe qui évite les doublons.

### Lot D — Backfill V1

Établir une matrice « source → événement possible ».

Exemples :

- `user_rocks.adopted_at` → adoption certaine ;
- `lithon_ledger.created_at + user_rock_id` → opération rattachable au caillou ;
- `user_accessories.purchased_at` sans rattachement fiable au caillou → ne pas attribuer arbitrairement au caillou ;
- `last_cleaned_at` → dernier nettoyage seulement, pas toute une série inventée ;
- ancien Permis V1 sans rattachement caillou fiable → historique économique conservé mais pas forcément événement du Journal d'un caillou.

Le backfill doit être idempotent et documenter clairement ce qu'il ne peut pas reconstruire.

### Lot E — Feature Journal et accès

- feature `journal` dans `feature_catalog` ;
- achat via V2-02 ;
- l'event store peut déjà contenir l'histoire avant achat ;
- sans entitlement : UI verrouillée ;
- après achat : lecture de toute l'histoire du caillou disponible, y compris événements antérieurs prouvables.

### Lot F — Projection éditoriale

Ne pas stocker uniquement une phrase finale figée.

Stocker l'événement canonique puis produire une phrase depuis un corpus/version d'affichage :

```text
event source
  -> formatter éditorial
  -> entrée Journal
```

Ainsi le wording peut évoluer sans falsifier l'histoire.

### Lot G — UI Journal

Timeline sobre :

- date ;
- événement ;
- petite formulation CAILLOU™ ;
- regroupement des événements répétitifs si utile ;
- pagination/chargement progressif si l'historique grandit ;
- pas de scroll infini lourd au démarrage du Socle.

## 6. Hors périmètre

- traits évolutifs V2.2 ;
- accomplissements opérationnels ;
- réactions contextuelles ;
- événements rares aléatoires ;
- notifications push Journal ;
- édition/suppression utilisateur de l'histoire ;
- partage public.

## 7. Architecture cible

```text
mutations métier Supabase
       -> rock_events append-only
       -> lecture chronologique
       -> projection éditoriale frontend
       -> Journal UI (gated par entitlement)
```

Les Stats continuent à vivre dans leurs sources agrégées ; le Journal n'est pas un remplacement du ledger ni de `rock_progress`.

## 8. Contrats frontend

- loader paginé/limité ;
- formatter éditorial pur ;
- état verrouillé ;
- cache lecture non autoritaire ;
- aucune création d'événement depuis le rendu ;
- Bio peut montrer un résumé/CTA sans charger toute la timeline.

## 9. Contrats Supabase

V2-07 implique une table événementielle et probablement des helpers privés/RPC internes.

RLS : l'utilisateur ne lit que les événements de ses cailloux. Les inserts directs `authenticated` doivent être refusés si les événements sont produits par fonctions métier SECURITY DEFINER contrôlées.

Index typiques : `(user_rock_id, happened_at desc)` et unicité event key lorsque pertinent.

## 10. Migration / backfill / compatibilité V1

- migration additive ;
- script/backfill transactionnel et idempotent ;
- aucune suppression des données sources V1 ;
- aucun événement sans preuve ;
- documenter nombre/type d'événements reconstruits ;
- conserver les cailloux jetés et leur histoire.

## 11. RLS / grants / RPC / idempotence / sécurité

Tester :

- lecture du Journal d'un autre utilisateur ;
- insert direct forgé ;
- modification/suppression d'un événement ;
- replay d'une mutation générant événement ;
- même `event_key` = un seul événement ;
- backfill rejoué = aucun doublon ;
- Journal verrouillé sans entitlement côté API d'affichage si un RPC dédié est utilisé.

Après DDL : advisors.

## 12. Offline / PWA / réconciliation

Une timeline déjà lue peut être consultée depuis cache si souhaité. Les nouveaux événements ne sont jamais inventés offline. Après reconnexion, la mutation métier réutilise son event key puis le Journal relit les événements canoniques.

## 13. Performance et budgets

- ne pas charger tout l'historique au boot ;
- requête paginée ;
- payloads petits ;
- pas de HTML pré-rendu en DB ;
- éviter de dupliquer tout le ledger dans `rock_events` sans valeur Journal.

## 14. UX téléphone / tablette / desktop

Timeline lisible sur petit écran, dates compréhensibles, pas de jargon technique. Les événements doivent rester assez rares pour que le Journal raconte quelque chose.

## 15. Tests unitaires utiles

- mapping event → texte ;
- version payload ;
- regroupement ;
- règles de milestone ;
- matrice de backfill ;
- entitlement gating.

## 16. Browser regression

Scénarios : Journal verrouillé, événements accumulés avant achat, achat Journal, affichage du passé, nouvelle action visible une fois, reload sans doublon, discard conserve l'historique, nouveau caillou avec Journal verrouillé.

## 17. Discipline plateformes

Une branche/PR. Migration + backfill via Supabase. Tests SQL transactionnels. CI + Browser regression. Preview uniquement si nécessaire pour UX timeline.

## 18. Critères d'acceptation

- [ ] event store canonique append-only ;
- [ ] événements enregistrés indépendamment du paywall d'affichage ;
- [ ] Journal payant par caillou ;
- [ ] backfill V1 uniquement prouvable ;
- [ ] aucune duplication au retry/backfill ;
- [ ] timeline basée sur événements source ;
- [ ] histoire conservée après discard ;
- [ ] nouveau caillou sans Journal hérité ;
- [ ] RLS/grants validés ;
- [ ] CI + Browser regression verts.

## 19. Interdictions anti-scope-creep

Ne pas inventer le passé, enregistrer chaque tap, implémenter succès/réactions V2.2, ajouter édition utilisateur de l'histoire, galerie ou réseau social.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : taxonomie d'événements, schéma, backfill exact et limites, événements branchés dans quelles mutations, prix Journal, tests idempotence/RLS, CI, Preview éventuelle, production et dettes V2.2.

**Ne pas démarrer V2-08 dans cette PR.**