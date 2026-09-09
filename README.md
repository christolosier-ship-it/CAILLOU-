# CAILLOU™

CAILLOU™ est une PWA 3D centrée sur un caillou de compagnie numérique : adoption d'un spécimen, personnalisation, accessoires, économie en Lithons et interactions persistantes.

## État du projet

La feuille de route active est la **V2.0**.

- **V1.0** : publiée et archivée ;
- **V2-00 à V2-05** : terminées ;
- **V2-06 — Personnalité 2.0** : prochaine étape à exécuter ;
- **V2-07 à V2-13** : planifiées.

La source de vérité pour l'ordre d'exécution et le statut des étapes reste [`docs/roadmap/00-INDEX-ROADMAP.md`](docs/roadmap/00-INDEX-ROADMAP.md).

## Documentation

Pour entrer dans la documentation sans fouiller toute l'arborescence :

- [`docs/README.md`](docs/README.md) — carte de la documentation et règles de maintenance ;
- [`docs/roadmap/00-INDEX-ROADMAP.md`](docs/roadmap/00-INDEX-ROADMAP.md) — roadmap active V2 ;
- [`docs/roadmap/V2-06-PERSONNALITE-2-0.md`](docs/roadmap/V2-06-PERSONNALITE-2-0.md) — prochaine étape ;
- [`docs/roadmap/archive/v1/README.md`](docs/roadmap/archive/v1/README.md) — archive documentaire V1 gelée.

## Règle de conservation documentaire

La documentation terminée fait partie de l'historique du projet.

- la V1 archivée n'est pas réécrite pour refléter la V2 ;
- une étape V2 terminée n'est pas réécrite pour masquer ou réinterpréter ce qui a réellement été exécuté ;
- les changements de statut et d'ordonnancement se font dans l'index actif ;
- une étape future peut être précisée avant son exécution, puis devient historique une fois terminée.

Cette règle permet de conserver à la fois une documentation actuelle lisible et une trace fiable de l'évolution réelle du produit.

## Socle opérationnel

- **GitHub** : code, documentation, branches, PR et CI ;
- **Supabase** : authentification, données persistantes, économie, RLS et migrations ;
- **Vercel** : livraison de la PWA Vite et déploiements de production/preview.

Les changements purement documentaires doivent rester séparés des évolutions fonctionnelles. Le garde-fou Vercel du projet permet d'éviter un déploiement applicatif inutile lorsqu'un commit ne touche que la documentation.
