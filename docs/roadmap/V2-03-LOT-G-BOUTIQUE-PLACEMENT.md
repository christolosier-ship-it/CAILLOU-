# V2-03 — Lot G — Boutique / Placement

> **Statut : ✅ TERMINÉ — 5 septembre 2026.**
>
> **Étape parente :** `V2-03-ACCESSOIRES-V2-PIPELINE-COLLISIONS.md`.

## Objectif

Publier commercialement les 11 accessoires V2 validés par les Lots A à F, sans modifier le modèle d'économie V2-02 : une référence catalogue représente un bien permanent au compte, achetable une seule fois et plaçable une seule fois simultanément.

## Catalogue publié

Les 11 références V2 sont :

- `mask-scan` ;
- `mouse-ears` ;
- `traffic-cone` ;
- `bebe-assets` ;
- `chicken` ;
- `crocodile-dog-toy` ;
- `garden-gnome` ;
- `model` ;
- `poo-scan` ;
- `skull` ;
- `worn-flip-flop`.

Le catalogue technique reste porté par `public/assets/accessories/catalog.json` en `schemaVersion: 2`. Les licences, notices et l'historisation de provenance des V2 restent explicitement hors périmètre de V2-03.

## Comportement Boutique / Placement

Le Lot G valide le contrat produit suivant :

- achat unique côté serveur ;
- état `Possédé` après acquisition ;
- une possession reste durable au compte ;
- une référence déjà placée n'est plus proposée comme ajoutable dans Placement ;
- retirer l'objet le rend immédiatement réutilisable ;
- aucune duplication multi-instance d'une même référence ;
- sélection/tap du vrai modèle V2 fonctionnels via `AccessoryModel` ;
- plafond V2.0 maintenu à **8 accessoires simultanés** côté frontend et serveur.

Le fallback UI inventé `Licence vérifiée` a été retiré pour les références V2 sans provenance, conformément à la décision de périmètre.

## Validation Browser

Un scénario dédié `v2-03-commerce` a été raccordé à `Browser regression`.

Il couvre les 11 V2 et vérifie :

1. présence dans le catalogue de test ;
2. achat unique ;
3. état `Possédé` ;
4. indisponibilité d'un objet déjà placé ;
5. retrait puis réutilisation ;
6. chargement et tap d'un vrai GLB V2 avec `AccessoryModel`.

Le premier passage Browser #110 a échoué uniquement parce que le probe de sélection 3D était visuellement recouvert par le panneau Placement sur le viewport téléphone. Le parcours métier avait déjà passé ses contrôles. Le probe a été corrigé pour dispatcher le geste sur le canvas R3F, sans assouplir aucun contrat fonctionnel.

Validation finale :

- **CI #440 : verte** ;
- **Browser regression #112 : verte** ;
- message de preuve : `V2-03 Lot G commerce PASS: 11 V2 + achat unique + Possédé + placé indisponible + retrait réutilisable + tap V2`.

## Publication Vercel

La PR #45 a été mergée sur `main` au commit `511b635a0bfb6746444c3494e05b4bc66e3798bb`.

Le premier déploiement production Vercel a échoué avant build dans `scripts/vercel-ignore-build.sh` : le checkout Git Vercel était shallow et ne contenait pas le SHA précédent utilisé par `git diff`.

Ce défaut d'infrastructure a été isolé dans la PR #46. Le script choisit désormais le comportement conservateur « builder » lorsque le SHA précédent n'est pas disponible localement ou lorsque la comparaison Git échoue.

La PR #46 a été mergée au commit `69eef12d2d049d6443c956c0cfce4f28159513ec`.

Le déploiement production `dpl_DZjm8xWdR7Z9nAFvGpxnSf9TCfjz` est ensuite passé **READY**. L'alias production est `caillou-sigma.vercel.app`.

Avant activation commerciale, les ressources suivantes ont été vérifiées comme servies par la production :

- manifeste `assets/accessories/catalog.json` ;
- `assets/accessories/skull/model.glb` ;
- `assets/accessories/skull/collider.glb` ;
- preview `assets/accessory-previews/skull.png`.

Le manifeste de production contient bien les 11 nouvelles références V2.

## Activation Supabase

Les 11 références avaient été préparées au Lot D avec `active=false` afin d'éviter d'exposer des chemins runtime avant leur disponibilité Vercel.

La migration de publication présente dans le repo est :

`supabase/migrations/20260905074500_v2_03_activate_accessory_catalogue.sql`.

Son garde vérifie les 11 IDs, les chemins canoniques, les triangles, dimensions, metadata `physics`, `collision`, `budget` et `runtimeModelBytes` avant le passage à `active=true`.

Après confirmation du déploiement production READY et des ressources statiques, la migration a été appliquée à Supabase sous le nom `v2_03_activate_accessory_catalogue`.

État final vérifié :

- **15 accessoires actifs au total** ;
- **11/11 V2 actifs** ;
- **0 V2 staged/inactif** ;
- rôle `anon` : **15 accessoires visibles, dont les 11 V2**.

Aucune nouvelle RLS ni aucun RPC n'ont été nécessaires au Lot G : les contrats V2-02 d'achat unique, possession et placement restent la source de vérité serveur.

## Clôture

Le Lot G est terminé et V2-03 est livrée en production.

Les Lots A à G sont maintenant historiques. V2-04 peut être exécutée dans une nouvelle branche et une nouvelle PR.