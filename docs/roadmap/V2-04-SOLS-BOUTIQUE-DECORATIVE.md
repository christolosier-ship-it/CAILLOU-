# V2-04 — Sols & Boutique décorative

> **Statut : spécifiée — prête à exécuter après V2-02.**
>
> **Date : 4 septembre 2026.**
>
> **Dépendances : V2-02 obligatoire ; V2-01 déjà disponible pour la scène.**

Ce fichier est le prompt autonome d'exécution de V2-04 et deviendra son historique après réalisation.

## 1. Prompt d'exécution

Lis l'index, ce fichier, les comptes rendus V2-01/V2-02, le Socle réel, la Boutique, le sol physique actuel, le modèle économique Supabase, les politiques PWA/cache et les documents de design. Inspecte les assets réellement disponibles avant d'en ajouter.

GitHub et Supabase obligatoires. Vercel uniquement pour validation visuelle finale utile.

## 2. Contexte réel

Le sol gris V1 sert actuellement de frontière physique et de surface visuelle fixe. V2-04 doit introduire des sols décoratifs achetables sans casser la fonction physique du plancher.

Après V2-02, un bien décoratif appartient durablement au compte et l'économie doit être capable d'accorder un bien via achat aujourd'hui ou autre source demain.

## 3. Décisions métier actées

- un sol est un **bien permanent au compte** ;
- achat en Lithons, avec possibilité d'item gratuit ;
- achat unique ;
- possession conservée après changement de caillou ;
- un seul sol est sélectionné pour le Socle actif ;
- le sol visuel et le sol physique doivent rester cohérents ;
- aucun décor/arrière-plan V2.1 n'est ajouté maintenant.

## 4. Objectif utilisateur

L'utilisateur peut ouvrir la Boutique, acheter un sol, le posséder définitivement, puis choisir le sol visible sous son caillou. Le changement doit être immédiat, propre, persistant et sans modifier la géométrie physique au point de casser Placement.

## 5. Périmètre précis

### Lot A — Catalogue sols

Créer un catalogue serveur spécialisé, conceptuellement :

```text
floors
- id
- name
- description
- price_lithons
- preview_path
- material/texture descriptor
- active
- sort_order
- provenance/licence
- budget metadata
```

Les noms exacts sont à confirmer après audit.

### Lot B — Possessions compte

Créer une table de possession spécialisée, conceptuellement `user_floors`, avec :

- user_id ;
- floor_id ;
- acquired_at ;
- acquisition_source ;
- price_paid éventuel.

Une possession gratuite ou future `grant` doit être possible sans falsifier le ledger.

### Lot C — Achat autoritaire

Créer `purchase_floor(floor_id, event_key)` ou contrat équivalent : prix serveur, wallet lock, acquisition unique, ledger, idempotence, insuffisance de solde, item inactif.

### Lot D — Sélection du sol

Persist(er) la sélection sur le caillou/Socle actif, par exemple via `user_rocks.floor_id` si cela reste le modèle le plus simple.

Règles :

- impossible de sélectionner un sol non possédé ;
- un sol gratuit de base doit permettre un état valide sans achat ;
- changement de caillou ne retire aucune possession ;
- le nouveau caillou peut sélectionner un sol possédé.

### Lot E — Rendu

Le rendu du sol doit :

- conserver exactement la frontière physique attendue ;
- remplacer l'apparence, pas la sécurité du Placement ;
- respecter échelle/UV/répétition crédibles ;
- éviter aliasing et textures surdimensionnées ;
- fonctionner avec ombres/contact shadows existants.

### Lot F — Boutique

Ajouter une famille `Sols` distincte des `Accessoires` et `Fonctionnalités`, sans créer une seconde Boutique.

États minimum : Disponible, Gratuit, Acheter, Possédé, Sélectionné, Solde insuffisant, Pending, Retry.

## 6. Hors périmètre

- arrière-plans ;
- éclairage ;
- murs/décors ;
- Studio Photo ;
- peinture ;
- changement de géométrie du plancher ;
- physique différente par matériau décoratif ;
- succès.

## 7. Architecture cible

```text
floor catalog Supabase
    -> possession compte
    -> sélection sur caillou actif
    -> material resolver frontend
    -> floor mesh existant
```

Le moteur physique ne dépend pas d'une texture.

## 8. Contrats frontend / 3D / physique

- sol physique unique, stable et infranchissable ;
- matérialisation visuelle via paramètres/texture ;
- aucun rechargement complet de la scène si un simple changement de matériau suffit ;
- disposal textures au changement ;
- preview et runtime séparés proprement.

## 9. Contrats Supabase

V2-04 implique probablement DDL : catalogue, possessions et sélection persistante.

Toute table publique : RLS immédiate. Les achats passent par RPC. Le client ne fixe jamais le prix ni n'insère directement une possession payante.

## 10. Migration / backfill / compatibilité V1

Créer un sol de base représentant l'apparence historique V1 ou une équivalence visuelle choisie. Les cailloux existants doivent obtenir un état de sol valide sans perte ni achat forcé pour afficher le Socle.

Aucun achat V1 n'est à inventer.

## 11. RLS / grants / RPC / idempotence / sécurité

Tester :

- lecture catalogue ;
- achat sans Lithons ;
- double achat ;
- prix falsifié ;
- sélection d'un sol non possédé ;
- modification du sol d'un autre utilisateur ;
- replay event key ;
- item inactif.

Après DDL : advisors sécurité/performance.

## 12. Offline / PWA / réconciliation

- dernier sol sélectionné peut être affiché depuis le cache ;
- achat jamais simulé offline ;
- changement non confirmé n'est pas canonique ;
- textures de sols intégrées à un cache runtime borné ;
- reconnexion relit possession et sélection serveur.

## 13. Performance et budgets

Règles V2-00 : 2048×2048 max par défaut, viser ≤ 1 MiB par texture, cache borné, disposal contrôlé, pas d'augmentation du précache initial.

Tester plusieurs changements successifs de sols et vérifier l'absence de croissance GPU linéaire.

## 14. UX téléphone / tablette / desktop

La Boutique doit permettre de comprendre instantanément la différence entre `Possédé` et `Sélectionné`. La sélection doit fonctionner au tactile sans exiger une Preview plein écran lourde.

## 15. Tests unitaires utiles

- mapping catalogue ;
- règles possession/sélection ;
- resolver du sol par défaut ;
- cache policy ;
- validation descriptors/materials.

## 16. Browser regression

Scénarios : acheter sol, sélectionner, reload, offline dernier état connu, changer de caillou et retrouver la possession, essayer sol non possédé, Placement avec nouveau sol, sol infranchissable, non-régression accessoires/Permis.

## 17. Discipline plateformes

Une branche/PR. DDL via `apply_migration`. Advisors après DDL. Une Preview finale est utile si elle permet de contrôler réellement rendu/texture sur mobile ; aucune Preview intermédiaire.

## 18. Critères d'acceptation

- [ ] catalogue sols autoritaire ;
- [ ] possession compte durable ;
- [ ] achat unique/idempotent ;
- [ ] sélection persistante ;
- [ ] sol V1 migré vers un état valide ;
- [ ] physique Placement inchangée et fiable ;
- [ ] textures dans budgets/caches ;
- [ ] RLS/RPC validés ;
- [ ] CI + Browser regression verts ;
- [ ] production vérifiée.

## 19. Interdictions anti-scope-creep

Ne pas ajouter murs, décors, éclairage, physique spécifique parquet/moquette, succès, marketplace ou plusieurs sols simultanés.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : catalogue/seed, migrations, possessions, RPC achat, règle sol de base, assets/licences, budgets textures, tests, advisors, Preview éventuelle, production et dettes.

**Ne pas démarrer V2-05 dans cette PR.**