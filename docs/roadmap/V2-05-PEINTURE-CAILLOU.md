# V2-05 — Peinture du caillou

> **Statut : spécifiée — prête à exécuter après V2-02.**
>
> **Date : 4 septembre 2026.**
>
> **Dépendances : V2-02 obligatoire ; V2-01 fournit la scène/manipulation.**

Ce fichier est le prompt autonome d'exécution de V2-05 et deviendra son historique après réalisation.

## 1. Prompt d'exécution

Lis l'index, ce fichier, les comptes rendus V2-01/V2-02, `RockModel`, les matériaux des 20 roches, la Boutique, les entitlements par caillou, les caches PWA et les documents de direction artistique. Inspecte les matériaux GLB réels avant de choisir l'implémentation.

GitHub et Supabase obligatoires. Vercel utile pour validation visuelle finale.

## 2. Contexte réel

La roche naturelle est aujourd'hui rendue depuis ses matériaux GLB. V2-00 a fixé un principe non destructif : la peinture V2.0 doit utiliser des paramètres simples, pas une texture bitmap peinte, et la roche naturelle doit toujours être récupérable.

Après V2-02, Peinture est une **fonctionnalité payante liée au caillou**.

## 3. Décisions métier actées

- fonctionnalité achetée en Lithons pour un `user_rock` précis ;
- nouveau caillou = Peinture à racheter ;
- état `natural` explicite ;
- couleur principale simple ;
- finition simple ;
- matériau source jamais écrasé ;
- aucun pinceau UV/zone/motif en V2.0 ;
- aucune composition multiple.

## 4. Objectif utilisateur

Après achat de Peinture, l'utilisateur peut prévisualiser une couleur et une finition, appliquer le résultat à son caillou, revenir à la roche naturelle et retrouver le même état après reload/reconnexion.

Avant achat, l'interface montre clairement la fonctionnalité verrouillée et renvoie vers la Boutique sans dupliquer le parcours commercial.

## 5. Périmètre précis

### Lot A — Entitlement Boutique

Ajouter/seeder la feature Peinture dans `feature_catalog` avec prix défini côté serveur au moment de l'exécution selon la stratégie économique active.

L'achat utilise le contrat V2-02 par caillou.

### Lot B — Contrat apparence

Créer un modèle persistant minimal, conceptuellement :

```text
rock_appearance
- user_rock_id
- paint_mode       natural | solid
- paint_color      valeur normalisée nullable
- paint_finish     natural | matte | satin | glossy (ou vocabulaire final équivalent)
- updated_at
```

Une autre forme peut être retenue si elle est plus simple après audit, mais le contrat doit être versionnable et non destructif.

### Lot C — Rendu non destructif

- conserver une référence/clone sûr des matériaux originaux ;
- appliquer l'override seulement au rendu actif ;
- restaurer exactement `natural` sans reload du GLB si possible ;
- supporter les roches à plusieurs meshes/materials ;
- ne pas muter un matériau partagé entre différentes instances/scènes ;
- traduire la finition en paramètres Three.js mesurés, pas en promesse physique pseudo-scientifique.

### Lot D — Prévisualisation

La preview est locale et non canonique jusqu'à validation.

Flux :

```text
état serveur
  -> draft local couleur/finition
  -> aperçu immédiat
  -> Annuler = état serveur
  -> Appliquer = mutation Supabase
  -> confirmation
```

### Lot E — UI

Interface compacte, tactile :

- accès depuis le Socle/Bio ou action dédiée selon architecture existante ;
- palette raisonnable ;
- couleur personnalisée seulement si elle reste simple et accessible ;
- finitions limitées ;
- bouton Roche naturelle ;
- état verrouillé si entitlement absent.

Ne pas transformer V2-05 en éditeur graphique.

## 6. Hors périmètre

- motifs ;
- pinceau ;
- zones ;
- masques ;
- decals ;
- textures générées ;
- patine ;
- peinture animée ;
- partage de presets ;
- historique de versions ;
- succès.

## 7. Architecture cible

```text
Supabase rock appearance
  -> snapshot canonique
  -> draft React
  -> material adapter
  -> RockModel
```

Le `RockModel` ne doit pas connaître les règles économiques. Il reçoit seulement un état d'apparence valide.

## 8. Contrats frontend / 3D / physique

- la peinture ne change pas la géométrie ni le collider ;
- aucun impact sur Placement ;
- la peinture ne doit pas casser poussière/nettoyage ;
- les effets poussière restent visuellement compatibles avec peinture ;
- l'état `natural` doit restaurer les propriétés sources pertinentes ;
- éviter recompilation/material churn à chaque mouvement de slider.

## 9. Contrats Supabase

V2-05 implique probablement une table/colonnes d'apparence et une RPC de sauvegarde, par exemple `set_rock_appearance(user_rock_id, paint_mode, color, finish, event_key)`.

Le serveur vérifie : ownership du caillou, entitlement Peinture actif, valeurs autorisées et idempotence.

## 10. Migration / backfill / compatibilité V1

Tous les cailloux existants sont `natural` par défaut. Aucun entitlement Peinture gratuit n'est créé. Aucun matériau GLB n'est modifié sur disque.

## 11. RLS / grants / RPC / idempotence / sécurité

Tester :

- modifier le caillou d'un autre ;
- peindre sans entitlement ;
- couleur/finish invalides ;
- retry même event key ;
- caillou jeté ;
- nouveau caillou sans entitlement ;
- manipulation directe table refusée si RPC requis.

Advisors après DDL.

## 12. Offline / PWA / réconciliation

- dernier état peinture peut être affiché depuis cache ;
- un draft peut exister localement mais n'est pas canonique ;
- Appliquer offline doit être bloqué ou mis en attente selon les mécanismes sûrs existants, sans faux succès ;
- reconnexion relit l'état serveur.

## 13. Performance et budgets

Aucune texture bitmap nouvelle pour la peinture V2.0. Éviter de dupliquer inutilement les textures sources. Mesurer le nombre de matériaux/clones sur cycles natural/solid et vérifier le disposal.

## 14. UX téléphone / tablette / desktop

- zones tactiles suffisantes ;
- preview temps réel fluide ;
- contraste des contrôles ;
- couleur choisie lisible ;
- reduced motion sans impact ;
- ne pas masquer le caillou avec un panneau énorme sur téléphone.

## 15. Tests unitaires utiles

- validation couleur ;
- mapping finish → paramètres ;
- reducer/draft Annuler/Appliquer ;
- entitlement gating ;
- natural reset.

## 16. Browser regression

Scénarios : feature verrouillée, achat, preview sans persistance, annulation, application, reload, retour natural, offline/reconnexion, nouveau caillou sans feature, Placement/nettoyage/caresse non régressés.

## 17. Discipline plateformes

Une branche/PR. DDL via Supabase migration. Preview Vercel finale recommandée pour contrôler la fidélité visuelle sur plusieurs roches, pas de Previews intermédiaires.

## 18. Critères d'acceptation

- [ ] Peinture achetable par caillou ;
- [ ] absence de transfert au caillou suivant ;
- [ ] preview locale ;
- [ ] persistance confirmée ;
- [ ] natural restaurable ;
- [ ] matériaux sources intacts ;
- [ ] plusieurs roches/materials testés ;
- [ ] pas d'impact collider/Placement ;
- [ ] RLS/RPC/idempotence validés ;
- [ ] CI + Browser regression verts ;
- [ ] production vérifiée.

## 19. Interdictions anti-scope-creep

Ne pas implémenter V2.4 : UV, motifs, zones, couches, patine, stickers, galerie de créations ou texture paint.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : prix feature, migration, contrat apparence, méthode material override, palette/finitions finales, tests multi-roches, performance, CI, Preview, production et dettes V2.4.

**Ne pas démarrer V2-06 dans cette PR.**