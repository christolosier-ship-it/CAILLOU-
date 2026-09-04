# V2-11 — Sécurité, économie & hardening

> **Statut : spécifiée — prête à exécuter après V2-02 à V2-10.**
>
> **Date : 4 septembre 2026.**
>
> **Nature : audit transversal final, pas première sécurisation des features.**

Ce fichier est le prompt autonome d'exécution de V2-11 et deviendra son historique après réalisation.

## 1. Prompt d'exécution

Lis l'index, ce fichier, les comptes rendus V2-02 à V2-10, toutes les migrations V2, fonctions SECURITY DEFINER, politiques RLS, grants, catalogues, tables d'entitlements/possessions, ledger, mutation receipts et le frontend qui consomme ces contrats.

GitHub et Supabase obligatoires. Vercel utile pour vérifier qu'aucun secret/comportement runtime inattendu n'apparaît en Preview/production.

Principe : chaque étape précédente devait déjà être sécurisée. V2-11 recherche les **angles morts transversaux**, les incohérences entre modèles et les régressions provoquées par leur combinaison.

## 2. Contexte réel

V2.0 doit désormais inclure : accessoires uniques, entitlements par caillou, sols, peinture, personnalité, Journal et Studio. Le risque principal n'est plus une table isolée mais la possibilité de combiner des contrats de manière inattendue : réutiliser un droit après discard, placer un bien deux fois, falsifier un prix, rejouer un événement, lire l'histoire d'un autre caillou, etc.

## 3. Décisions métier actées

- Supabase autoritaire ;
- client non autoritaire sur prix, solde, possessions, entitlements et états persistants ;
- biens décoratifs permanents au compte ;
- fonctionnalités liées au caillou ;
- Permis V1 non transféré ;
- accessoire unique ;
- event store Journal append-only ;
- futur `grant` possible mais succès non implémentés ;
- vieux clients PWA ne doivent pas contourner les règles.

## 4. Objectif utilisateur

Garantir qu'un utilisateur normal ne subit pas d'incohérence économique et qu'un client modifié ne peut ni voler des droits, ni fabriquer des Lithons, ni manipuler les données d'un autre compte/caillou.

## 5. Périmètre précis

### Lot A — Cartographie de surface d'attaque

Inventorier :

- tables publiques ;
- vues ;
- fonctions publiques ;
- fonctions SECURITY DEFINER ;
- grants `anon/authenticated/service_role` ;
- Edge Functions ;
- secrets/env frontend ;
- Storage éventuel ;
- mutations offline/retry ;
- caches IndexedDB/localStorage.

### Lot B — Isolation utilisateur/caillou

Avec au moins deux utilisateurs et plusieurs cailloux historiques :

- lecture croisée refusée ;
- update croisé refusé ;
- RPC sur `user_rock_id` tiers refusé ;
- entitlements tiers refusés ;
- Journal tiers refusé ;
- apparence/sol tiers refusés.

### Lot C — Wallet / ledger

Tester :

- prix négatif/falsifié ;
- solde insuffisant ;
- double tap ;
- event key identique ;
- event keys différents simultanés ;
- achat gratuit ;
- produit inactif ;
- wallet absent ;
- rollback transactionnel ;
- cohérence `balance`, `lifetime_spent`, ledger et possession.

### Lot D — Accessoires uniques

Tester :

- acheter deux fois ;
- placer sans posséder ;
- placer deux fois ;
- forger accessory_id ;
- retirer l'objet d'un autre ;
- scale/transform invalides ;
- dépassement plafond ;
- discard puis réutilisation sur nouveau caillou ;
- ancienne PWA tentant `create_equipped_accessory` multi-instance.

### Lot E — Fonctionnalités par caillou

Tester pour Permis, Peinture, Personnalité, Journal, Studio :

- achat pour autre caillou ;
- caillou jeté ;
- entitlement de l'ancien caillou réutilisé ;
- feature inactive ;
- accès sans achat ;
- double achat ;
- prix falsifié ;
- ancien `user_feature_unlocks` ne réactive pas un droit V2 ;
- vieux client V1 ne contourne pas le nouveau scope.

### Lot F — Sols et biens compte

- achat unique ;
- possession d'un autre refusée ;
- sélection non possédée refusée ;
- possession survit au discard ;
- source `grant` éventuelle possible sans permettre un insert client libre.

### Lot G — Peinture

- modification sans feature ;
- paramètres invalides ;
- caillou tiers ;
- RPC replay ;
- natural reset autorisé uniquement sur son caillou.

### Lot H — Personnalité

- injection arbitraire de traits refusée ;
- génération sans feature refusée ;
- génération multiple idempotente ;
- lecture tiers refusée ;
- versioning stable.

### Lot I — Journal

- insert direct forgé refusé ;
- update/delete event refusé au client ;
- duplicate event_key impossible ;
- backfill non rejouable en doublon ;
- payloads contrôlés ;
- lecture tiers refusée ;
- events enregistrés par fonctions métier même si UI Journal verrouillée.

### Lot J — Auth / secrets / frontend

- aucune `service_role` dans bundle/env exposée ;
- clés publishable uniquement ;
- CORS/headers pertinents ;
- Auth rate limiting V1 conservé ;
- aucun endpoint de debug sensible ;
- logs sans secrets/passwords/tokens.

### Lot K — Advisors et index

Lancer advisors sécurité/performance. Corriger les problèmes réellement liés à V2 ou critiques. Ne pas supprimer à l'aveugle un index signalé `unused` si la période d'observation est trop courte.

## 6. Hors périmètre

- nouvelle feature produit ;
- redesign ;
- changement arbitraire de prix ;
- système anti-fraude complexe ;
- WAF payant ;
- compliance entreprise non requise ;
- refactor sans lien sécurité.

## 7. Architecture cible

```text
client non fiable
   -> RPC / RLS / validations
      -> transaction
         -> possession/entitlement + ledger + event
            -> état canonique
```

Toute règle importante doit rester vraie même si le frontend est modifié à la main.

## 8. Contrats frontend / 3D / physique

Le hardening ne doit pas casser la grammaire tactile. Les validations transforms/colliders protègent bornes et ownership, pas une « physique serveur » complète.

## 9. Contrats Supabase

Inspecter toutes les tables/fonctions V2 réelles. Préférer :

- `SET search_path = ''` sur fonctions sensibles ;
- SECURITY DEFINER minimales ;
- validation `auth.uid()` ;
- grants explicites ;
- RLS defense-in-depth ;
- contraintes DB pour invariants simples ;
- RPC pour transactions économiques.

## 10. Migration / compatibilité

Toute correction DDL doit être additive et sûre pour les données V1/V2 existantes. Ne pas casser l'ancien cache PWA sans plan d'upgrade explicite.

## 11. RLS / RPC / idempotence / sécurité

Cette section constitue le cœur de l'étape. Produire une matrice documentée : **ressource × action × acteur × résultat attendu** et conserver les tests automatisés à haute valeur.

## 12. Offline / PWA / réconciliation

Auditer les queues de mutations :

- event key persistant ;
- payload immuable au retry ;
- aucun replay vers un nouveau caillou par erreur ;
- purge/invalidations après discard ;
- aucun faux succès local ;
- stale entitlements non utilisés pour autoriser une mutation serveur.

## 13. Performance

Ne pas transformer toutes les lectures en fonctions SECURITY DEFINER lourdes si RLS suffit. Mesurer les queries critiques après durcissement et vérifier les index FK/lookup.

## 14. UX appareils

Les erreurs de sécurité attendues doivent devenir des messages utilisateur sobres, pas des stack traces. Un refus serveur après stale cache doit proposer réconciliation/reload approprié.

## 15. Tests unitaires utiles

Frontend seulement pour mapping des erreurs et règles client. Les invariants sécurité principaux doivent être testés au niveau SQL/RPC réel.

## 16. Browser regression

Scénarios produit positifs + quelques refus réalistes : double achat, accessoire déjà placé, feature perdue après nouveau caillou, stale cache. Ne pas essayer de reproduire tous les tests RLS dans Puppeteer.

## 17. Discipline plateformes

- une PR principale de hardening ;
- migrations via `apply_migration` ;
- advisors avant/après corrections ;
- CI + Browser regression ;
- Preview Vercel uniquement si changement runtime ;
- vérifier runtime errors après merge.

## 18. Critères d'acceptation

- [ ] aucun accès croisé A/B ;
- [ ] économie autoritaire ;
- [ ] accessoires uniques inattaquables via vieux RPC/client ;
- [ ] entitlements strictement par caillou ;
- [ ] ancien Permis V1 non réutilisable ;
- [ ] sols/peinture/personnalité/Journal protégés ;
- [ ] event store append-only ;
- [ ] retries idempotents ;
- [ ] aucun secret frontend ;
- [ ] advisors sans risque critique V2 ouvert ;
- [ ] tests SQL/RPC verts ;
- [ ] CI + Browser regression verts.

## 19. Interdictions anti-scope-creep

Ne pas ajouter de feature, cryptomonnaie, DRM, obfuscation client, service backend parallèle ou règle punitivement restrictive non justifiée par un invariant métier.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : matrice sécurité, vulnérabilités trouvées/corrigées, migrations, advisors, tests A/B, idempotence, vieux client, secrets/headers, CI, Preview éventuelle, production et risques acceptés.

**Ne pas démarrer V2-12 dans cette PR.**