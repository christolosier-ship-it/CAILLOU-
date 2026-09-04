# V2-13 — Release V2.0

> **Statut : spécifiée — prête à exécuter uniquement après GO V2-12.**
>
> **Date : 4 septembre 2026.**
>
> **Nature : release, validation finale et archivage. Aucune nouvelle feature.**

Ce fichier est le prompt autonome d'exécution de V2-13 et deviendra l'historique final de la release V2.0.

## 1. Prompt d'exécution

Tu travailles lorsque V2-01 à V2-12 sont terminées et que V2-12 a rendu une décision **GO**. Lis l'index, ce fichier, tous les comptes rendus V2, le tag/release V1, les documents normatifs, les workflows actifs, l'état Supabase réel et la production Vercel réelle.

GitHub, Supabase et Vercel obligatoires.

V2-13 doit livrer. Si un bug fonctionnel, sécurité, migration ou performance critique est découvert, repasser en NO-GO et corriger dans une PR ciblée avant la release. Ne pas bricoler une grosse feature directement dans la PR de tag.

## 2. Contexte réel

La V2.0 doit livrer :

- Placement 2.0 objets/caméra/collisions fines ;
- économie V2 : accessoires uniques, biens compte, features par caillou ;
- nouveaux accessoires ;
- sols ;
- peinture ;
- personnalité ;
- Journal ;
- Studio Photo local ;
- harmonisation UX ;
- performance/PWA ;
- hardening sécurité ;
- migration V1→V2 validée.

## 3. Décisions métier finales à préserver

- une seule composition/Socle ;
- chaque accessoire unique ;
- biens décoratifs permanents au compte ;
- Permis/Peinture/Personnalité/Journal/Studio liés au caillou ;
- Permis V1 historique non transféré ;
- Bio/Stats gratuits ;
- Journal payant mais événements canoniques conservés ;
- Studio local uniquement ;
- aucun système de succès V2.0 ;
- aucune feature V2.1+ glissée dans la release.

## 4. Objectif utilisateur

Mettre en production une V2.0 stable, migrable et cohérente, puis produire un tag/release GitHub qui correspond exactement au runtime réellement validé.

## 5. Périmètre précis

### Lot A — Gel candidat

Identifier un SHA candidat unique.

À partir de ce SHA :

- aucune feature ;
- corrections uniquement si release-blocker ;
- toute correction crée un nouveau SHA candidat et invalide les validations précédentes pertinentes.

### Lot B — Contrôles GitHub

Sur le SHA final :

- `CI` verte ;
- `Browser regression` verte ;
- aucun workflow historique rouge requis par la roadmap ;
- vérifier diff depuis dernière étape ;
- vérifier docs/licences/manifest/version.

### Lot C — Supabase final

Vérifier :

- projet `ACTIVE_HEALTHY` ;
- migrations appliquées dans l'ordre attendu ;
- RLS sur tables publiques ;
- advisors sécurité/performance ;
- RPC/grants finaux ;
- aucune migration locale non appliquée ;
- seed catalogues/features cohérent ;
- aucune donnée fixture QA laissée en production.

### Lot D — Preview finale

Créer **une seule Preview finale intentionnelle** si le candidat n'en possède pas déjà une tree-identical et encore valable.

Valider :

- build réel ;
- HTTP 200 ;
- manifest/service worker ;
- assets 3D/textures ;
- auth ;
- parcours principal ;
- erreurs runtime ;
- headers de sécurité ;
- tactile distant si possible.

Ne pas consommer plusieurs Previews pour des commits docs-only.

### Lot E — Smoke tests release

Minimum :

1. inscription/connexion ;
2. adoption ;
3. Socle ;
4. caresse/nettoyage ;
5. Boutique ;
6. achat accessoire unique ;
7. achat Permis V2 ;
8. Placement objet ;
9. caméra en Placement ;
10. collisions crédibles ;
11. sol ;
12. peinture ;
13. Bio/Stats ;
14. Personnalité ;
15. Journal ;
16. Studio Photo ;
17. offline/reconnexion ;
18. Jeter ;
19. nouvelle adoption sans features héritées ;
20. accessoires compte toujours possédés.

### Lot F — Production

Après merge final sur `main` :

- suivre le déploiement Vercel production ;
- vérifier SHA déployé ;
- READY ;
- HTTP 200 ;
- runtime errors ;
- endpoints/assets critiques ;
- Supabase toujours sain.

### Lot G — Smoke production

Répéter un sous-ensemble critique sur l'URL production réelle, sans modifier des données utilisateur non dédiées aux tests.

### Lot H — Version/documentation

Mettre à jour uniquement ce qui doit représenter la vérité V2 :

- version package/app si politique retenue ;
- `00-INDEX-ROADMAP.md` ;
- documents normatifs racine si des règles V2 les rendent obsolètes ;
- notices/licences ;
- compte rendu de chaque étape déjà complété ;
- ce compte rendu V2-13.

Ne pas réécrire l'archive V1 ni V2-00.

### Lot I — Tag et Release GitHub

Créer le tag/release **V2.0** uniquement après validation production.

Convention recommandée :

- tag `v2.0.0` ;
- release `CAILLOU™ V2.0`.

Le tag doit pointer vers le commit applicatif/documentaire final décidé comme release, et ce SHA doit être documenté explicitement.

Release notes :

- nouveautés principales ;
- migration V1 ;
- nouvelles règles accessoires/features ;
- limites connues ;
- pas de roman sur chaque commit interne.

### Lot J — Clôture roadmap

Marquer V2.0 terminée, conserver les 13 prompts comme historique, puis désigner la prochaine action de planification V2.1 sans démarrer V2.1 automatiquement.

## 6. Hors périmètre

- nouvelle feature ;
- nouveaux accessoires de dernière minute ;
- changement de prix non nécessaire ;
- V2.1 ;
- widget ;
- partage public ;
- peinture avancée ;
- succès.

## 7. Architecture cible

Aucune nouvelle architecture. Le candidat release doit être exactement l'architecture validée par V2-12.

## 8. Contrats frontend / 3D / physique

Valider, ne pas refactorer. Toute régression physique critique = NO-GO.

## 9. Contrats Supabase

Aucune migration attendue, sauf correction release-blocker. Une migration de dernière minute exige tests, advisors et nouveau cycle de validation.

## 10. Migration / compatibilité V1

S'appuyer sur la preuve V2-12. Faire au moins un smoke upgrade/compte existant si possible avant tag. Ne jamais reset une donnée V1 pour contourner un problème.

## 11. RLS / RPC / idempotence / sécurité

Vérifier qu'aucune alerte critique n'est ouverte. Rejouer quelques scénarios sentinelles : double achat, accès A/B, feature ancien caillou, accessoire double placement, vieux Permis.

## 12. Offline / PWA / réconciliation

Tester installation/launch/update, service worker, cache, reconnexion et présence de la nouvelle version. Un vieux cache ne doit pas masquer la release ni réactiver des règles V1 serveur.

## 13. Performance et budgets

Comparer les métriques finales aux valeurs V2-10. Toute régression majeure non expliquée = NO-GO ou dette explicitement acceptée si non bloquante.

## 14. UX téléphone / tablette / desktop

Utiliser la matrice appareils V2-12 et réaliser les smoke tests physiques disponibles. Ne pas déclarer un appareil testé si seule une émulation navigateur l'a été.

## 15. Tests unitaires utiles

Aucun nouveau test par principe. Ajouter uniquement un test qui reproduit un bug release-blocker corrigé.

## 16. Browser regression

Exécuter la matrice complète sur le candidat final. Aucun contournement manuel des checks rouges.

## 17. Discipline plateformes

### GitHub

- PR release dédiée si nécessaire ;
- merge seulement vert ;
- tag immuable après publication ;
- release notes liées au SHA réel.

### Supabase

- audit final ;
- pas de branche payante réflexe ;
- aucune donnée QA résiduelle.

### Vercel

- une Preview finale utile ;
- production depuis `main` ;
- vérifier deployment ID, SHA, HTTP et runtime errors ;
- docs-only après release doivent être ignorés par build lorsque possible.

## 18. Critères de release

- [ ] V2-12 = GO ;
- [ ] aucun bug bloquant connu ;
- [ ] aucun risque sécurité/économie critique ;
- [ ] CI verte ;
- [ ] Browser regression verte ;
- [ ] Supabase sain/advisors acceptables ;
- [ ] Preview finale validée ;
- [ ] production READY sur le bon SHA ;
- [ ] HTTP 200 ;
- [ ] aucune erreur runtime critique ;
- [ ] migration V1 vérifiée ;
- [ ] smoke tests appareils documentés ;
- [ ] licences/crédits à jour ;
- [ ] roadmap/documentation synchronisée ;
- [ ] tag `v2.0.0` créé ;
- [ ] release `CAILLOU™ V2.0` publiée.

## 19. Interdictions anti-scope-creep

Ne pas ajouter une feature de dernière minute, déplacer le tag après publication, taguer avant validation production, masquer un check rouge, créer plusieurs Previews inutiles ou réécrire l'historique V1/V2 terminé.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter obligatoirement :

- date ;
- PR/commits ;
- SHA candidat ;
- SHA `main` release ;
- CI/Browser regression ;
- Supabase/advisors ;
- Preview ID/URL/SHA ;
- production deployment ID/SHA/HTTP/runtime errors ;
- appareils testés ;
- migration smoke ;
- version/tag ;
- URL release GitHub ;
- dettes acceptées ;
- prochaine étape de planification V2.1.

**Après clôture, ne pas démarrer V2.1 sans nouveau cadrage autonome.**