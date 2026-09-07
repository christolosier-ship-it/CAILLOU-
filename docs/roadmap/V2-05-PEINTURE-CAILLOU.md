# V2-05 — Peinture du caillou

> **Statut : terminée, fusionnée et vérifiée en production le 7 septembre 2026.**
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

- [x] Peinture achetable par caillou ;
- [x] absence de transfert au caillou suivant ;
- [x] preview locale ;
- [x] persistance confirmée ;
- [x] natural restaurable ;
- [x] matériaux sources intacts ;
- [x] plusieurs roches/materials testés ;
- [x] pas d'impact collider/Placement ;
- [x] RLS/RPC/idempotence validés ;
- [x] CI + Browser regression verts ;
- [x] production vérifiée.

## 19. Interdictions anti-scope-creep

Ne pas implémenter V2.4 : UV, motifs, zones, couches, patine, stickers, galerie de créations ou texture paint.

## 20. État / compte rendu d'exécution

**Statut : clôturée le 7 septembre 2026.**

### Implémentation

- Branche `feat/v2-05-paint`, issue de `630c590` (V2-04, PR #48).
- Peinture minérale : **250 Lithons par caillou**, prix serveur dans `feature_catalog`. Achat par le contrat V2-02 existant, sans nouvelle mécanique économique.
- Migration Supabase appliquée : `20260906193308_v2_05_rock_paint.sql`. Apparence version 1, `natural` explicite ou `solid` avec couleur hexadécimale normalisée et finition. Backfill naturel sans droits offerts ; nouveau caillou naturel et verrouillé.
- Lecture propriétaire sous RLS, écritures clientes directes interdites. RPC publique invoker, implémentation privée avec contrôle du propriétaire, caillou actif, entitlement et idempotence liée au contenu. Un ancien retry ne réapplique pas un état dépassé.
- Action Peinture au Socle, renvoi vers la Boutique existante, aperçu local, Annuler, Appliquer après confirmation serveur, cache isolé par propriétaire/caillou, sauvegarde offline bloquée et réconciliation après reconnexion.
- Palette : Ivoire, Graphite, Ocre, Terre cuite, Mousse, Bleu ardoise, Prune et Rose quartz ; sélecteur de couleur personnalisé. Finitions mate/satinée/brillante : roughness 0,90 / 0,48 / 0,18 et metalness 0, sans promesse physique supplémentaire.

### Rendu et preuves disponibles

- Audit binaire des 20 GLB : chacun possède actuellement un mesh, un matériau PBR, une texture couleur et une normale. Aucune modification des assets, aucune texture ajoutée.
- Override sur clones propres à l'instance, sans texture couleur en mode peint ; normales/AO conservées. Retour naturel par réaffectation des références originales exactes, sans rechargement. Clones réutilisés puis libérés avant les ressources sources. Géométrie et collider inchangés.
- Tests unitaires : validation, draft/annulation/confirmation, cache isolé, multi-mesh/multi-matériaux synthétiques, ressources partagées, 60 cycles et disposal. Suite de 143 tests passée, TypeScript et lint passés.
- `supabase/tests/v2_05_rock_paint.sql` exécuté avec rollback : ownership/RLS/ACL, prix et débit unique, retries, paramètres invalides, entitlement, caillou jeté, nouveau caillou, attribution administrative et accès anonyme : PASS.
- Advisors : aucun nouveau warning ; protection contre mots de passe compromis désactivée, avertissement Auth préexistant ([remédiation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).
- Banc navigateur intégré au workflow existant : composants réels, service économique simulé déterministe, 20 GLB, 60 cycles, captures mobile/tablette, réseau interrompu, réconciliation, poussière et chute physique. Les contrats serveur sont testés séparément par SQL, pas simulés comme preuve serveur.

### Validation finale et publication

- [PR #49](https://github.com/christolosier-ship-it/CAILLOU-/pull/49) fusionnée sur `main` : `9f75f1e1976a027b719e7cfd31718d91675560e2`. Tête validée : `de9d0efbe26ba46d44913bc657851def60f9697d`.
- [CI #453](https://github.com/christolosier-ship-it/CAILLOU-/actions/runs/34093083466) et [Browser regression #119](https://github.com/christolosier-ship-it/CAILLOU-/actions/runs/34093083533) verts. Les parcours existants adoption, Bio/Jeter, soins, sols, accessoires et Placement passent également.
- [Diagnostics #119](https://github.com/christolosier-ship-it/CAILLOU-/actions/runs/34093083533/artifacts/10007886607) : 20 GLB / 60 cycles, ressources stables à 6 textures, 2 géométries et 5 programmes. Captures mobile/tablette inspectées ; en-tête sans chevauchement ni débordement à 320/390/768/1024 px, cibles tactiles ≥44 px.
- Deux corrections issues de la validation : ancien test Bio rendu explicite après ajout du bouton Peinture ; en-tête responsive ajusté après inspection visuelle. Le banc Peinture utilise le rendu à la demande hors chute, ramenant sa durée de 13 min 45 à environ 1 min 21 sous SwiftShader, sans réduire la couverture. Ce temps de runner ne mesure pas les performances d'un téléphone réel.
- Build local : chunk Socle 27,39 kB gzip, chunk 3D 1 021,94 kB gzip ; précache inchangé à 6 entrées / 445,80 KiB. Aucun asset ni nouvelle texture bitmap.
- Supabase : prix actif 250 Lithons, aucun caillou sans apparence ; tests transactionnels annulés proprement, zéro utilisateur de test restant. Migration déjà appliquée, aucune action manuelle requise.
- Production Vercel **READY** : `dpl_4meaPx4MGaQgQiJmXxxjdMH2DpRF`, commit `9f75f1e`, domaine [caillou-sigma.vercel.app](https://caillou-sigma.vercel.app/). HTML, JS Socle et 3D, CSS responsive, service worker et manifeste contrôlés sur le domaine public ; RPC `set_rock_appearance`, feature `rock_paint` et adaptateur `paint-v1` présents dans les fichiers servis.
- Validation fonctionnelle : composants réels en navigateur avec services simulés, contrats réels Supabase testés séparément par SQL. Le contrôle production porte sur le déploiement et les ressources publiées ; aucun achat utilisateur réel n'a été effectué pour cette vérification.
- Un seul déploiement applicatif de production, aucune Preview supplémentaire. Clôture documentaire séparée, couverte par le garde-fou Vercel docs-only.

Aucun motif, UV, couche, texture peinte ou périmètre V2.4 ajouté. V2-06 n'a pas démarré.

**Ne pas démarrer V2-06 dans cette PR.**
