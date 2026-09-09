# CAILLOU™ — Guide de la documentation

Ce fichier est la porte d'entrée de la documentation active. Il organise les documents existants sans réécrire leur historique.

## 1. Sources de vérité

La documentation suit quatre niveaux simples :

1. **Roadmap active** — [`roadmap/00-INDEX-ROADMAP.md`](roadmap/00-INDEX-ROADMAP.md) porte l'ordonnancement et le statut courant des étapes V2.
2. **Étapes futures** — les fichiers `V2-XX-*.md` non encore exécutés sont leurs cahiers des charges autonomes et peuvent être précisés avant exécution.
3. **Étapes terminées** — une fois exécuté, le fichier d'étape devient le compte rendu historique du chantier et doit rester gelé dans son sens.
4. **Archive V1** — [`roadmap/archive/v1/`](roadmap/archive/v1/) est un snapshot historique et ne doit pas être réécrit pour suivre la V2.

## 2. État courant avant V2-06

État documentaire vérifié le **9 septembre 2026** :

| Étape | Sujet | État documentaire |
|---|---|---|
| V2-00 | Architecture / cadrage / migrations | ✅ Terminée, historique |
| V2-01 | Placement 2.0 / scène interactive | ✅ Terminée, historique |
| V2-02 | Socle canonique / économie V2 | ✅ Terminée, historique |
| V2-03 | Accessoires V2 / pipeline collisions | ✅ Terminée, historique |
| V2-04 | Sols / Boutique décorative | ✅ Terminée, historique |
| V2-05 | Peinture du caillou | ✅ Terminée, historique |
| **V2-06** | **Personnalité 2.0** | **➡️ Prochaine étape** |
| V2-07 à V2-13 | Journal → Release V2.0 | Planifiées |

La V2-05 est bien présente dans le socle réellement livré : la migration Supabase `v2_05_rock_paint` est appliquée et le déploiement applicatif correspondant est `READY` en production Vercel. Le commit documentaire de clôture suivant est volontairement ignoré côté build, conformément au garde-fou docs-only.

## 3. Navigation rapide

### Roadmap active

- [`roadmap/00-INDEX-ROADMAP.md`](roadmap/00-INDEX-ROADMAP.md) — index et règles d'orchestration ;
- [`roadmap/V2-06-PERSONNALITE-2-0.md`](roadmap/V2-06-PERSONNALITE-2-0.md) — prochaine étape ;
- [`roadmap/V2-07-JOURNAL-DE-VIE.md`](roadmap/V2-07-JOURNAL-DE-VIE.md) ;
- [`roadmap/V2-08-STUDIO-PHOTO.md`](roadmap/V2-08-STUDIO-PHOTO.md) ;
- [`roadmap/V2-09-HARMONISATION-UX-V2.md`](roadmap/V2-09-HARMONISATION-UX-V2.md) ;
- [`roadmap/V2-10-PERFORMANCE-PWA-V2.md`](roadmap/V2-10-PERFORMANCE-PWA-V2.md) ;
- [`roadmap/V2-11-SECURITE-ECONOMIE-HARDENING.md`](roadmap/V2-11-SECURITE-ECONOMIE-HARDENING.md) ;
- [`roadmap/V2-12-QA-MIGRATION-V1-V2.md`](roadmap/V2-12-QA-MIGRATION-V1-V2.md) ;
- [`roadmap/V2-13-RELEASE-V2-0.md`](roadmap/V2-13-RELEASE-V2-0.md).

### Historique V2 déjà exécuté

Les fichiers `V2-00` à `V2-05` ainsi que les lots détaillés de V2-03 restent à leur emplacement actuel. Ils servent de mémoire d'exécution et ne doivent pas être réorganisés, renommés ou réécrits simplement pour uniformiser leur présentation.

### Archive V1

- [`roadmap/archive/v1/README.md`](roadmap/archive/v1/README.md) — règles de l'archive ;
- [`roadmap/archive/v1/`](roadmap/archive/v1/) — roadmap et étapes V1 gelées ;
- [`roadmap/archive/v1/references/`](roadmap/archive/v1/references/) — références V1 figées.

### Références transverses

Documents de conception ou d'exploitation encore présents hors archive :

- [`../CAHIER-DES-CHARGES-V1.md`](../CAHIER-DES-CHARGES-V1.md) ;
- [`../ARCHITECTURE-TECHNIQUE.md`](../ARCHITECTURE-TECHNIQUE.md) ;
- [`../DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md`](../DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md) ;
- [`../WORKFLOW-3D-BLENDER-GITHUB.md`](../WORKFLOW-3D-BLENDER-GITHUB.md) ;
- [`../THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md) ;
- [`ACCESSORY-ASSET-INVENTORY.md`](ACCESSORY-ASSET-INVENTORY.md) ;
- [`PLAN-CORRECTION-HARMONISATION-SOL-ET-PLACEMENTS.md`](PLAN-CORRECTION-HARMONISATION-SOL-ET-PLACEMENTS.md).

Leur copie éventuelle sous `roadmap/archive/v1/references/` reste, elle, strictement figée à l'état V1.

## 4. Règles de maintenance

Pour éviter que la documentation se transforme en carrière de strates contradictoires :

- **ne pas corriger rétroactivement l'histoire** d'une étape terminée ;
- mettre les **changements de statut ou d'ordre** dans `roadmap/00-INDEX-ROADMAP.md` ;
- mettre les **décisions d'une étape à venir** dans son fichier avant exécution ;
- après clôture, considérer ce fichier d'étape comme un **compte rendu historique** ;
- préférer une **documentation additive** lorsqu'une explication actuelle doit compléter un ancien choix ;
- isoler les remises au propre documentaires dans une **PR docs-only** ;
- ne pas consommer un déploiement Vercel pour une modification purement documentaire lorsque le garde-fou du projet l'évite.

## 5. Avant de démarrer V2-06

Le point de départ normal est :

1. lire [`roadmap/00-INDEX-ROADMAP.md`](roadmap/00-INDEX-ROADMAP.md) ;
2. lire [`roadmap/V2-06-PERSONNALITE-2-0.md`](roadmap/V2-06-PERSONNALITE-2-0.md) ;
3. vérifier l'état réel GitHub et Supabase demandé par l'étape ;
4. n'utiliser Vercel que lorsqu'une validation visuelle ou de livraison apporte une preuve utile.

Aucune étape V2-06 n'est considérée commencée par cette remise au propre documentaire.
