# CAILLOU™ — Roadmap long terme V2.0 → V2.4

> **Statut : feuille de route active — prompts autonomes V2.0 créés le 4 septembre 2026.**
>
> La V1 est publiée sous le tag `v1.0.0` sur `e9d926be0f2f09f9f1464cf5b4360f82dbeae2ad` et sa roadmap est gelée dans `docs/roadmap/archive/v1/`.
>
> V2-00 est terminée et gelée dans [`V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md`](V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md).
>
> V2-01 est terminée, fusionnée et vérifiée en production le 4 septembre 2026 ; son compte rendu historique est consigné dans [`V2-01-PLACEMENT-2-0-SCENE-INTERACTIVE.md`](V2-01-PLACEMENT-2-0-SCENE-INTERACTIVE.md).
>
> V2-02 est terminée, fusionnée et vérifiée en production le 4 septembre 2026 ; son compte rendu historique est consigné dans [`V2-02-SOCLE-CANONIQUE-ECONOMIE-V2.md`](V2-02-SOCLE-CANONIQUE-ECONOMIE-V2.md).
>
> Ce document est la **source de vérité d'ordonnancement**. Les fichiers `V2-XX-....md` sont les cahiers des charges autonomes d'exécution et deviennent, une fois l'étape terminée, son compte rendu historique.

---

## 1. Principe directeur

La V1 a construit le socle : compte, adoption, économie Lithon, Boutique, accessoires, Placement, physique, Bio/Stats, PWA, sécurité, persistance et résilience.

V2-00 a nettoyé l'architecture React et supprimé les ponts DOM historiques.

À partir de V2-01 commence la **vraie construction produit V2**.

Direction produit :

> **Ton caillou devient vraiment le tien.**

Promesse V2.0 :

> **Personnaliser, aménager, raconter.**

Trois axes :

1. **Petit monde personnalisable** : accessoires, sols, peinture, Studio Photo, puis éclairage/décors.
2. **Vie du caillou** : personnalité, Journal, puis traits évolutifs/réactions/accomplissements.
3. **Bac à sable physique crédible** : Placement 2.0, collisions fines, puis objets animés/interactifs.

---

## 2. Règles d'orchestration

### Historique

- Ne jamais réécrire la V1 pour refléter une décision V2.
- Ne jamais réécrire V2-00 pour masquer une décision ultérieure.
- Une étape V2 terminée devient historique.
- Chaque prompt autonome contient son bloc `État / compte rendu d'exécution` à compléter en fin d'étape.
- Une étape suivante ne démarre pas dans la PR de l'étape courante.

### Autorité

> **DOM = rendu. React = source de vérité UI. Supabase = source de vérité serveur et économique.**

- le frontend peut porter un draft ;
- le frontend ne fabrique jamais un achat, un solde, une possession ou un entitlement ;
- chaque modèle SQL est sécurisé dès l'étape qui l'introduit ;
- V2-11 est une passe de hardening transversal, pas une sécurisation tardive.

### Livraison

- branche + PR par étape ;
- `main` toujours déployable ;
- réutiliser `CI` et `Browser regression` ;
- ne pas recréer un workflow par feature ;
- Vercel Preview seulement lorsqu'elle apporte une preuve réelle ;
- documentation docs-only ignorée par Vercel lorsque le garde-fou le permet ;
- priorité téléphone/tablette tactile, desktop conservé.

---

## 3. Décisions produit V2.0 actées

### 3.1 Un seul petit monde

Les compositions multiples sont abandonnées.

Un caillou actif possède **un seul état persistant du Socle**.

Il n'existe pas de fonctionnalité utilisateur : Nouvelle composition, Dupliquer, Changer de composition ou Composition active.

Le terme `composition` peut rester technique pour désigner l'état cohérent caillou + objets + environnement, sans devenir une collection de sauvegardes ni une feature payante.

### 3.2 Placement 2.0

Caillou et accessoires sont des objets manipulables selon la même grammaire :

```text
ObjectTarget
├── rock       position + rotation
└── accessory  position + rotation + scale selon catalogue
```

Ergonomie :

1. tap direct sur l'objet ;
2. fallback par sélecteur ;
3. tout le canvas contrôle la cible sélectionnée ;
4. petite barre contextuelle ;
5. sélection toujours visible.

La caméra est elle aussi une **cible de contrôle** pendant la session :

```text
PlacementControlTarget
├── camera
└── object
```

Passer sur la caméra ne termine pas Placement et ne perd aucun draft.

### 3.3 Collisions

La règle V1 autorisant les interpénétrations volontaires pendant Placement est supprimée.

> **Un objet manipulé ne traverse ni le caillou, ni un accessoire, ni le sol.**

Les colliders doivent suivre suffisamment finement la géométrie visible pour éviter l'effet « flottement ». Les grosses sphères/boîtes surdimensionnées ne sont pas une solution finale acceptable.

### 3.4 Accessoires uniques

Chaque référence catalogue représente **un objet unique** :

- achetable une seule fois ;
- possédé durablement au compte ;
- plaçable une seule fois simultanément ;
- retirer l'objet le rend disponible ;
- jeter le caillou retire ses placements mais ne retire pas les possessions.

Le plafond V1 de 8 objets reste provisoire jusqu'aux mesures V2-03/V2-10.

### 3.5 Boutique : biens vs fonctionnalités

**Biens permanents au compte** :

- accessoires ;
- sols ;
- futurs décors ;
- futurs arrière-plans ;
- futures ambiances.

**Fonctionnalités payantes liées au caillou** :

- Permis de manutention ;
- Peinture ;
- Personnalité ;
- Journal ;
- Studio Photo.

Bio/Stats de base restent gratuits.

### 3.6 Permis V1

Décision explicite : **le Permis V1 n'est pas transféré gratuitement comme Permis V2**.

- l'achat/dépense historique reste conservé ;
- le caillou V2 doit acheter son propre Permis ;
- jeter ce caillou fait perdre ce Permis pour le suivant.

### 3.7 Lithons et futur système de succès

Les Lithons restent la monnaie de référence.

Le modèle doit cependant permettre plus tard un entitlement issu d'un `grant`/succès sans dépense Lithon.

> **Possession / entitlement ≠ obligatoirement achat dans le ledger.**

Aucun moteur de succès n'est implémenté en V2.0.

### 3.8 Personnalité

> **Le caillou est comme il est.**

- feature payante par caillou ;
- déterministe/versionnée ;
- persistée ;
- aucun reroll ;
- aucune personnalité aléatoire à chaque affichage.

### 3.9 Journal

- feature payante par caillou ;
- histoire V1 reconstruite uniquement lorsqu'elle est prouvable ;
- aucun événement inventé ;
- les nouveaux événements canoniques sont enregistrés même avant achat du Journal ;
- le paywall contrôle l'accès à l'interface, pas l'existence de l'histoire.

### 3.10 Studio Photo

- feature payante par caillou ;
- caméra/cadrage Studio ;
- capture locale ;
- téléchargement ;
- partage natif/Web Share si disponible ;
- aucun stockage cloud ni URL publique en V2.0.

---

## 4. Ordre d'exécution V2.0

| Étape | Prompt autonome | Sujet | Dépendances | Statut |
|---|---|---|---|---|
| **V2-00** | [`V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md`](V2-00-ARCHITECTURE-CADRAGE-MIGRATIONS.md) | Architecture / cadrage | V1 | **✅ Terminée** |
| **V2-01** | [`V2-01-PLACEMENT-2-0-SCENE-INTERACTIVE.md`](V2-01-PLACEMENT-2-0-SCENE-INTERACTIVE.md) | Placement 2.0 & scène interactive | V2-00 | **✅ Terminée** |
| **V2-02** | [`V2-02-SOCLE-CANONIQUE-ECONOMIE-V2.md`](V2-02-SOCLE-CANONIQUE-ECONOMIE-V2.md) | Socle canonique & économie V2 | V2-01 | **✅ Terminée** |
| **V2-03** | [`V2-03-ACCESSOIRES-V2-PIPELINE-COLLISIONS.md`](V2-03-ACCESSOIRES-V2-PIPELINE-COLLISIONS.md) | Accessoires V2 & pipeline collisions | V2-01, V2-02 | **▶ Prochaine à exécuter** |
| **V2-04** | [`V2-04-SOLS-BOUTIQUE-DECORATIVE.md`](V2-04-SOLS-BOUTIQUE-DECORATIVE.md) | Sols & Boutique décorative | V2-02 | Prompt prêt |
| **V2-05** | [`V2-05-PEINTURE-CAILLOU.md`](V2-05-PEINTURE-CAILLOU.md) | Peinture du caillou | V2-02 | Prompt prêt |
| **V2-06** | [`V2-06-PERSONNALITE-2-0.md`](V2-06-PERSONNALITE-2-0.md) | Personnalité 2.0 | V2-02 | Prompt prêt |
| **V2-07** | [`V2-07-JOURNAL-DE-VIE.md`](V2-07-JOURNAL-DE-VIE.md) | Journal de vie | V2-02, V2-06 | Prompt prêt |
| **V2-08** | [`V2-08-STUDIO-PHOTO.md`](V2-08-STUDIO-PHOTO.md) | Studio Photo | V2-01, V2-02, V2-04, V2-05 | Prompt prêt |
| **V2-09** | [`V2-09-HARMONISATION-UX-V2.md`](V2-09-HARMONISATION-UX-V2.md) | Harmonisation UX V2 | V2-01 à V2-08 | Prompt prêt |
| **V2-10** | [`V2-10-PERFORMANCE-PWA-V2.md`](V2-10-PERFORMANCE-PWA-V2.md) | Performance & PWA | V2-03 à V2-09 | Prompt prêt |
| **V2-11** | [`V2-11-SECURITE-ECONOMIE-HARDENING.md`](V2-11-SECURITE-ECONOMIE-HARDENING.md) | Sécurité / économie / hardening | V2-02 à V2-10 | Prompt prêt |
| **V2-12** | [`V2-12-QA-MIGRATION-V1-V2.md`](V2-12-QA-MIGRATION-V1-V2.md) | QA / migration V1→V2 | V2-11 | Prompt prêt |
| **V2-13** | [`V2-13-RELEASE-V2-0.md`](V2-13-RELEASE-V2-0.md) | Release V2.0 | V2-12 GO | Prompt prêt |

---

## 5. Plan d'implémentation V2.0

### V2-01 — Placement 2.0

- refactor ciblé de `ShowroomScene` ;
- moteur objet commun ;
- caméra sélectionnable ;
- colliders fins ;
- Annuler/Terminer ;
- mesures tactiles/physiques.

### V2-02 — Socle canonique & économie V2

- aucune composition multiple ;
- accessoires unitaires ;
- entitlements par caillou ;
- migration du Permis ;
- compatibilité vieux client ;
- ledger/acquisition prêts pour futurs biens/grants.

### V2-03 — Accessoires

- assets/provenance ;
- previews ;
- pipeline GLB ;
- colliders/proxies ;
- budgets ;
- plafond d'objets mesuré.

### V2-04 — Sols

- catalogue ;
- possession compte ;
- achat ;
- sélection ;
- rendu ;
- cache texture ;
- sol physique inchangé.

### V2-05 — Peinture

- entitlement caillou ;
- état natural/solid ;
- couleur/finition ;
- preview locale ;
- persistance ;
- matériau source récupérable.

### V2-06 — Personnalité

- 4 à 6 traits fondamentaux maximum ;
- seed/version stable ;
- persistance ;
- corpus éditorial ;
- intégration Bio ;
- aucun reroll.

### V2-07 — Journal

- event store append-only ;
- événements métier canoniques ;
- backfill V1 prouvable ;
- projection éditoriale ;
- paywall d'affichage, pas d'enregistrement.

### V2-08 — Studio Photo

- mode Studio ;
- caméra libre ;
- formats ;
- capture WebGL locale ;
- download ;
- Web Share ;
- aucun cloud.

### V2-09 — Harmonisation UX

- hiérarchie Socle ;
- Boutique Biens/Fonctionnalités ;
- Placement ;
- Bio/Personnalité/Journal ;
- Studio ;
- responsive/accessibilité ;
- wording offline/pending/retry.

### V2-10 — Performance/PWA

- profiling ;
- bundles lazy ;
- GLB/colliders/textures ;
- plafond final d'objets ;
- cache V2 ;
- snapshot offline ;
- upgrade service worker V1→V2.

### V2-11 — Hardening

- matrice A/B ;
- wallet/ledger ;
- accessoires uniques ;
- entitlements par caillou ;
- sols/peinture/personnalité/Journal ;
- vieux client ;
- secrets/grants/advisors.

### V2-12 — QA/migration

- fixture V1 ;
- matrice avant/après ;
- Permis historique ;
- accessoires/placements ;
- Journal backfill ;
- vieux cache PWA ;
- appareils réels ;
- décision GO/NO-GO.

### V2-13 — Release

- gel candidat ;
- CI/Browser regression ;
- Supabase final ;
- Preview finale unique ;
- production ;
- smoke tests ;
- tag `v2.0.0` ;
- release `CAILLOU™ V2.0` ;
- clôture de roadmap.

---

## 6. Carte des dépendances

### Socle physique

```text
V2-00
  -> V2-01 Placement
  -> V2-02 Socle/économie
  -> V2-03 Accessoires
```

### Personnalisation

```text
V2-02
  -> V2-04 Sols
  -> V2-05 Peinture
  -> V2-08 Studio
```

### Vie du caillou

```text
V2-02
  -> V2-06 Personnalité
  -> V2-07 Journal
  -> V2.2 évolution/réactions/accomplissements
```

### Consolidation

```text
V2-01..08
  -> V2-09 UX
  -> V2-10 Performance/PWA
  -> V2-11 Hardening
  -> V2-12 QA/Migration
  -> V2-13 Release
```

---

## 7. V2.1 — Décoration & sensation

Ordre cible après V2.0 :

1. éclairage / ambiance ;
2. décors d'arrière-plan ;
3. collections d'accessoires ;
4. son et haptique ;
5. QA/performance/release V2.1.

Les nouveaux biens décoratifs restent permanents au compte sauf décision explicite contraire.

---

## 8. V2.2 — Vie du caillou

Ordre cible :

1. traits évolutifs ;
2. réactions contextuelles ;
3. accomplissements ;
4. événements rares et absurdes ;
5. éventuels rewards/grants si cette option est confirmée ;
6. QA/release.

Pas de système punitif de besoins quotidiens.

---

## 9. V2.3 — Interaction & partage

Ordre cible :

1. pipeline animation ;
2. accessoires animés ;
3. accessoires interactifs ;
4. états persistants d'interaction si nécessaire ;
5. fiche publique / partage ;
6. QA/performance/sécurité/release.

Le partage reste léger, pas un réseau social complet.

---

## 10. V2.4 — Personnalisation avancée

Ordre cible :

1. architecture peinture avancée ;
2. zones / motifs / masques / finitions ;
3. outils tactiles ;
4. patine / traces du temps optionnelles ;
5. QA GPU/migration/release.

La roche naturelle d'origine doit toujours rester récupérable.

---

## 11. R&D séparée — Widget écran d'accueil

Le widget reste hors roadmap séquentielle tant que la R&D n'a pas tranché :

- limites PWA iOS/Android ;
- WidgetKit / Android widgets ;
- PWA vs couche native/hybride ;
- auth/session ;
- fréquence de mise à jour ;
- batterie/offline ;
- distribution stores ;
- bénéfice réel.

Aucun choix V2 ne doit être dicté par le widget avant cette étude.

---

## 12. Format normatif des prompts autonomes

Chaque prompt V2.0 suit le modèle qui a bien fonctionné en V1, enrichi des contraintes V2 :

1. statut/date/dépendances ;
2. contexte réel du repo ;
3. décisions métier actées ;
4. objectif utilisateur ;
5. périmètre/lots ;
6. hors périmètre ;
7. architecture cible ;
8. contrats frontend/3D/physique ;
9. contrats Supabase ;
10. migration/backfill/compatibilité V1 ;
11. RLS/grants/RPC/idempotence ;
12. offline/PWA/réconciliation ;
13. performance/budgets ;
14. UX appareils ;
15. tests unitaires utiles ;
16. Browser regression ;
17. discipline GitHub/Supabase/Vercel ;
18. critères d'acceptation ;
19. interdictions anti-scope-creep ;
20. compte rendu d'exécution.

Le prompt protège le **comportement produit**, pas un workaround d'implémentation.

---

## 13. Discipline plateformes

### GitHub

- une branche dédiée par étape ;
- une PR principale par étape ;
- commits par lots si utile ;
- `CI` + `Browser regression` seulement ;
- merge vert.

### Supabase

- audit du schéma réel ;
- aucun DDL spéculatif ;
- `apply_migration` pour le DDL ;
- RLS/grants dans la même étape ;
- advisors après DDL significatif ;
- plan Free pris en compte ;
- pas de branche payante par réflexe.

### Vercel

- aucune Preview pour docs ;
- pas de Preview à chaque commit ;
- une Preview finale intentionnelle lorsque tactile/visuel/PWA le justifie ;
- vérification production après merges runtime ;
- quota de déploiements traité comme une ressource.

---

## 14. Archive et historique

- V1 : gelée dans `docs/roadmap/archive/v1/` ;
- V2-00 : gelée ;
- V2-01 : gelée après clôture du 4 septembre 2026 ;
- V2-02 : gelée après clôture du 4 septembre 2026 ;
- chaque `V2-XX` devient gelé après sa clôture ;
- les décisions ultérieures qui supersèdent une hypothèse historique sont consignées dans cet index et dans le prompt actif, jamais rétro-écrites dans l'historique.

---

## 15. Prochaine action

**V2-02 est clôturée, fusionnée et vérifiée en production.**

Prochaine étape autorisée :

> **Exécuter [`V2-03-ACCESSOIRES-V2-PIPELINE-COLLISIONS.md`](V2-03-ACCESSOIRES-V2-PIPELINE-COLLISIONS.md).**