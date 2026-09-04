# V2-03 — Lot B — Contrat d’un asset accessoire V2

> **Checkpoint : terminé le 4 septembre 2026.**
>
> Ce lot définit le contrat catalogue/runtime. Il n’intègre aucun nouvel objet et ne change pas encore la génération des colliders Rapier.

## 1. Décision de schéma

Les colonnes V1 sont conservées pour :

- `id`, `name`, `description` ;
- `price_lithons` ;
- `asset_path`, `preview_path` ;
- `active`, `sort_order`, `slot` ;
- `triangle_count`, `dimensions` ;
- `scale_min`, `scale_max` ;
- `physics`.

Deux métadonnées seulement sont ajoutées car elles ne peuvent pas être dérivées de manière fiable à partir du contrat V1 :

- `collision jsonb not null` : géométrie/stratégie de collision ;
- `budget jsonb not null` : mesures runtime utiles au garde-fou de publication.

Le champ `provenance` est conservé uniquement comme donnée legacy pour compatibilité V1. Il n’est plus exigé pour activer un accessoire.

## 2. Contrat collision

`collision.strategy` accepte :

- `hull` ;
- `cuboid` ;
- `ball` ;
- `compound` ;
- `proxy` ;
- `simplified`.

`geometrySource` vaut `render` ou `proxy` lorsqu’il est présent.

Un `strategy = proxy` impose :

```json
{
  "strategy": "proxy",
  "geometrySource": "proxy",
  "proxyPath": "/assets/accessories/<id>/collider.glb"
}
```

Le chemin est contrôlé côté base. Aucun binaire n’est stocké dans Postgres.

Le choix précis de stratégie par nouvel objet et la production des proxies appartiennent au Lot C.

## 3. Contrat budget

Une entrée active doit disposer au minimum de :

```json
{
  "runtimeModelBytes": 123456
}
```

Les mesures complémentaires prévues sont :

- `maxTextureDimension` ;
- `largestTextureBytes`.

Ces valeurs sont des entiers strictement positifs. Le Lot D pourra enrichir/valider automatiquement ces mesures lors de la publication des assets préparés.

## 4. Contrat d’activation serveur

Une ligne `active = true` doit maintenant posséder :

- description non vide ;
- `asset_path` sous `/assets/accessories/<id>/model.glb` ;
- `preview_path` sous `/assets/accessory-previews/<id>.png` ;
- `triangle_count` ;
- `dimensions` ;
- `physics` objet JSON ;
- `collision` objet JSON valide ;
- `budget` objet JSON avec `runtimeModelBytes`.

Le navigateur ne peut donc pas rendre actif un chemin arbitraire ou un asset incomplet.

## 5. Backfill V1

| ID | triangles | collision | runtimeModelBytes |
| --- | ---: | --- | ---: |
| `monocle` | 665 | `hull / render` | 2 586 068 |
| `bow-tie` | 1 036 | `hull / render` | 264 280 |
| `round-glasses` | 7 386 | `hull / render` | 1 757 336 |
| `pedestal-gallery` | 712 | `cuboid / render` | 1 242 500 |

Les IDs, prix, possessions, placements, limites d’échelle et paramètres physiques V1 ne changent pas.

## 6. Frontend

- les types Supabase sont régénérés depuis le schéma réel ;
- `AccessoryCatalogItem` transporte désormais `collision` et `budget` ;
- `loadAccessoryShop()` lit ces deux colonnes depuis le catalogue serveur ;
- `accessoryAssetContract.ts` fournit des parseurs stricts pour collision et budget ;
- aucun changement n’est encore fait dans `AccessoryModel` ou Rapier : consommation effective au Lot C.

## 7. Tests

- tests Vitest pour descripteurs collision valides/invalides ;
- tests Vitest pour budget valide/invalide ;
- test SQL transactionnel du backfill V1 et des contraintes de base ;
- vérification explicite que `provenance` n’est plus une condition d’activation.

## 8. Supabase / Vercel

Migration appliquée sur Supabase :

`20260904213106_v2_03_accessory_asset_contract`

Les advisors après migration ne signalent aucune nouvelle anomalie liée à ce lot. Le warning Auth sur la protection des mots de passe compromis et les index encore inutilisés sont préexistants et hors périmètre.

Aucun déploiement Vercel manuel n’est requis pour ce lot. Une éventuelle Preview automatique de la PR sert uniquement de contrôle distant et ne constitue pas une validation du Lot C.

## 9. Frontière

**Lot B terminé. Lot C non démarré. Aucun nouvel asset de `Ressource/` n’est publié dans le catalogue à ce checkpoint.**
