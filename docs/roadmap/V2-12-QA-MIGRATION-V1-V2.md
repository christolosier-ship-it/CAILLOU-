# V2-12 — QA & migration V1 → V2

> **Statut : spécifiée — prête à exécuter après V2-11.**
>
> **Date : 4 septembre 2026.**
>
> **Nature : répétition générale de migration, QA tactile et preuve de compatibilité.**

Ce fichier est le prompt autonome d'exécution de V2-12 et deviendra son historique après réalisation.

## 1. Prompt d'exécution

Tu travailles lorsque V2-01 à V2-11 sont terminées. Lis l'index, ce fichier, tous les comptes rendus V2, la roadmap V1 archivée, les migrations Supabase V1/V2, les politiques PWA/cache, les validateurs navigateur et l'état réel GitHub/Supabase/Vercel.

GitHub, Supabase et Vercel obligatoires pour cette étape.

V2-12 ne doit pas ajouter une nouvelle feature. Il doit **prouver que le passage de la V1 à la V2 fonctionne réellement** et corriger uniquement les défauts de migration/QA découverts.

## 2. Contexte réel

La V1 publique est figée sous `v1.0.0`. V2.0 a fait évoluer plusieurs règles :

- Placement avec collisions fines ;
- accessoires devenus objets uniques ;
- fonctionnalités devenues liées au caillou ;
- Permis V1 non transféré ;
- sols ;
- peinture ;
- personnalité ;
- Journal ;
- Studio ;
- nouvelle politique cache/runtime V2.

Les migrations ont été appliquées progressivement ; V2-12 vérifie que l'ensemble forme un chemin cohérent.

## 3. Décisions métier actées

- aucune perte de compte, caillou, wallet, ledger ou achat accessoire ;
- ancien Permis V1 conservé historiquement mais non actif sur le caillou V2 ;
- accessoires V1 possédés restent possédés ;
- placements historiques compatibles sont conservés ;
- les doublons multi-instance historiques éventuels ne doivent jamais être supprimés silencieusement ;
- nouveau caillou sans features du précédent ;
- Journal ne fabrique pas de passé ;
- vieux cache PWA ne doit pas contourner le serveur V2.

## 4. Objectif utilisateur

Un utilisateur V1 doit pouvoir ouvrir la V2 et retrouver son compte, son caillou, son solde, ses accessoires et son Socle sans corruption. Il doit comprendre que son ancien Permis n'est plus actif et pouvoir acheter le Permis V2 pour son caillou.

## 5. Périmètre précis

### Lot A — Fixture V1 représentative

Construire une fixture ou transaction de test reproduisant un compte V1 réaliste :

- profil ;
- caillou actif ;
- progression ;
- wallet avec earned/spent ;
- ledger ;
- accessoires achetés ;
- au moins un placement ;
- Permis V1 compte ;
- timestamps historiques ;
- éventuellement caillou jeté si utile.

La fixture ne doit jamais polluer durablement la production : transaction + rollback ou environnement de test contrôlé selon possibilités du plan Free.

### Lot B — Rejouer les migrations

Valider dans l'ordre :

- schéma V1 → migrations V2 ;
- contraintes ;
- backfills ;
- données conservées ;
- aucun doublon imprévu ;
- migration idempotente là où applicable ;
- erreurs explicites si un invariant historique impossible est rencontré.

Si le tooling ne permet pas de reconstruire une DB complète V1 sans coût, tester les fonctions de migration/backfill dans des transactions représentatives et documenter la limite.

### Lot C — Matrice avant/après

Produire un tableau concret :

| Donnée V1 | Attendu V2 |
|---|---|
| compte | conservé |
| caillou actif | conservé |
| pose | conservée |
| wallet | conservé |
| ledger | conservé |
| accessoire acheté | possession conservée |
| placement compatible | conservé |
| Permis V1 | historique seulement, non actif |
| feature V2 | absente tant que non achetée |
| sol | baseline valide |
| peinture | natural |
| personnalité | verrouillée |
| Journal | verrouillé mais histoire canonique peut exister |
| Studio | verrouillé |

### Lot D — Migration Permis

Tester explicitement :

1. utilisateur avait payé 1000 Lithons en V1 ;
2. ledger historique toujours présent ;
3. caillou V2 n'a pas le Permis actif ;
4. Placement rock est verrouillé ;
5. achat du nouveau Permis déduit le prix courant serveur ;
6. Placement rock devient autorisé ;
7. discard ;
8. nouveau caillou sans Permis.

### Lot E — Accessoires uniques

Tester :

- possession V1 conservée ;
- placement existant chargé ;
- impossible de créer une copie ;
- retrait rend disponible ;
- discard rend les biens disponibles au nouveau caillou ;
- plafond final appliqué partout.

Si la production historique contient des doublons d'une même référence, vérifier la stratégie décidée en V2-02 et son absence de perte silencieuse.

### Lot F — Backfill Journal

Contrôler chaque type d'événement V1 reconstruit : source, timestamp, rattachement au caillou. Vérifier l'absence de faux événements et de doublons lors d'un second passage.

### Lot G — Upgrade PWA V1 → V2

Tester :

- service worker V1 ;
- caches V1 ;
- IndexedDB/localStorage V1 ;
- chargement d'une nouvelle V2 ;
- message update/reload ;
- purge/versionnement ;
- session auth conservée si valide ;
- stale entitlements invalidés ;
- ancien code incapable de contourner les nouvelles règles serveur.

### Lot H — QA fonctionnelle complète

Rejouer les parcours :

- auth/adoption ;
- Socle ;
- caresse/nettoyage ;
- Boutique ;
- Permis V2 ;
- Placement objets/caméra/collisions ;
- accessoires uniques ;
- sols ;
- peinture ;
- Bio/Stats ;
- Personnalité ;
- Journal ;
- Studio ;
- Jeter/nouvelle adoption ;
- offline/reconnect.

### Lot I — Appareils réels

Au minimum documenter les appareils réellement testés. Priorité : iPhone/iOS Safari/PWA, iPad/tablette, Android/Chrome si disponible, desktop.

Les émulations Puppeteer ne doivent pas être présentées comme tests matériels.

### Lot J — Corrections ciblées

Corriger les défauts découverts dans la même PR si leur périmètre reste QA/migration. Une refonte majeure doit devenir dette explicite/no-go release plutôt qu'être glissée en fin de chantier.

## 6. Hors périmètre

- nouvelle feature ;
- nouveau catalogue ;
- refonte UX majeure ;
- changement de règles économiques actées ;
- V2.1 ;
- optimisation non liée à un défaut QA observé.

## 7. Architecture cible

V2-12 ne crée pas une architecture : il valide que l'architecture livrée respecte le chemin historique V1 → V2.

## 8. Contrats frontend / 3D / physique

Tester en situation réelle : contact objets, caméra Placement, annulation, stabilisation, sols, peinture et Studio. Vérifier absence de jitter/tunneling bloquant et comportement après reload.

## 9. Contrats Supabase

Auditer schéma/migrations/RLS réels. Aucun DDL sauf correction d'un défaut démontré. Toute correction passe par `apply_migration` et advisors.

## 10. Migration / backfill / compatibilité V1

Cette section est le cœur de l'étape. Produire des preuves et valeurs avant/après, pas seulement « ça semble marcher ».

## 11. RLS / RPC / idempotence / sécurité

Reprendre les scénarios critiques V2-11 sur la base migrée. Vérifier que les backfills n'ont pas ouvert de droits ou contourné les contraintes.

## 12. Offline / PWA / réconciliation

Valider upgrade, boot offline, reconnexion, mutation en vol, stale cache, discard et changement de caillou.

## 13. Performance et budgets

Reprendre les mesures V2-10 sur le candidat QA. Aucune régression brutale ne doit apparaître après backfills/fixtures ou corrections finales.

## 14. UX téléphone / tablette / desktop

Documenter une matrice réelle : appareil/OS/navigateur/orientation/parcours/résultat. Tout problème matériel bloquant doit être corrigé ou déclaré NO-GO pour release.

## 15. Tests unitaires utiles

Conserver les tests migrations/mappings/backfill. Ne pas écrire des centaines de snapshots pour couvrir ce que les E2E et SQL testent mieux.

## 16. Browser regression

La matrice doit couvrir l'ensemble des parcours critiques V2.0. Elle devient la répétition automatisée du candidat release, sans nouveau workflow zoo.

## 17. Discipline plateformes

- une PR principale QA ;
- GitHub `CI` + `Browser regression` ;
- Supabase tests transactionnels/advisors ;
- une Preview Vercel finale **recommandée/attendue** pour le candidat QA ;
- pas de merge tant qu'un bug migration critique reste ouvert.

## 18. Critères d'acceptation

- [ ] fixture V1 migrée sans perte non prévue ;
- [ ] wallet/ledger exacts ;
- [ ] accessoires conservés et unitaires ;
- [ ] placements compatibles conservés ;
- [ ] Permis V1 historique mais non actif ;
- [ ] nouveau Permis achetable ;
- [ ] sol baseline valide ;
- [ ] Journal backfill sans invention ;
- [ ] vieux cache PWA testé ;
- [ ] sécurité V2-11 toujours valide ;
- [ ] matrice fonctionnelle complète verte ;
- [ ] appareils réels documentés ;
- [ ] CI + Browser regression verts ;
- [ ] Preview candidat validée ;
- [ ] aucun bug release-blocker connu.

## 19. Interdictions anti-scope-creep

Ne pas ajouter une feature « puisque la release approche », masquer un bug migration par reset des comptes, supprimer des données pour faire passer les contraintes ou déclarer un test matériel effectué s'il ne l'a pas été.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : fixture/méthode, matrice avant/après, résultats migration, données Permis, doublons historiques éventuels, Journal backfill, PWA upgrade, appareils réels, corrections, CI, Preview, décision GO/NO-GO vers V2-13.

**Ne pas démarrer V2-13 tant que la décision QA n'est pas GO.**