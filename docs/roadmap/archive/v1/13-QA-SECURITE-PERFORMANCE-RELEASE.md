# Étape 13 — QA, sécurité, performance et release V1

## Prompt d'exécution

Tu travailles sur CAILLOU™ lorsque les étapes 01 à 12 sont terminées, y compris 10A–10D, 10.5 et 10.75. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte GitHub, Supabase et Vercel dans leur état réel avant d'agir.

### Objectif

Effectuer la passe de consolidation finale et décider si CAILLOU™ peut être déclaré V1.0 : qualité fonctionnelle, sécurité Supabase, performance 3D/physique, accessibilité, PWA, UX, contenu et déploiement.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel obligatoire.

### À auditer

#### Produit
- inscription/connexion ;
- showroom 20 cailloux ;
- descriptions ;
- adoption/nommage ;
- Socle ;
- caresse/Lithons ;
- nettoyage ;
- Boutique unifiée ;
- achat accessoires ;
- achat/déblocage de fonctionnalités ;
- Permis de manutention minérale à 1000 Lithons ;
- propriété accessoires distincte des instances ;
- multi-équipement ;
- Placement unique ;
- sélecteur caillou / instances ;
- manipulation commune Position / Orientation ;
- échelle accessoires ;
- placement libre avec intersections volontaires ;
- carré gris infranchissable pendant le geste ;
- reprise Rapier à Terminer ;
- stabilisation individuelle et globale ;
- persistance/reprise des placements et de la pose du caillou ;
- Bio/Stats ;
- Jeter puis nouvelle adoption.

#### Supabase / sécurité
- RLS toutes tables concernées ;
- utilisateur A/B ;
- service-role absent du client ;
- transactions Lithons/achats ;
- `purchase_accessory` ;
- `purchase_feature_unlock` ;
- idempotence ;
- prix autoritaires ;
- possession d'accessoires distincte des instances équipées ;
- déblocages permanents distincts des possessions d'accessoires ;
- impossibilité d'équiper un accessoire non possédé ;
- impossibilité de manutention du caillou sans permis ;
- intégrité des instances, transforms et pose du caillou ;
- `stabilize_equipped_accessory` ;
- `stabilize_rock_composition` atomique/idempotent ;
- comportement des instances lorsque le caillou est jeté ;
- advisors sécurité/performance ;
- contraintes et index.

#### 3D / physique / performance
- 20 GLB cailloux ;
- GLB accessoires retenus, provenance/licences et poids ;
- mémoire GPU sur cycles complets ;
- temps de chargement ;
- frame time pendant observation ;
- frame time pendant Placement ;
- frame time pendant gravité/stabilisation ;
- chauffe sur session prolongée ;
- qualité adaptative ;
- accessoires + poussière ;
- plusieurs accessoires simultanés ;
- stabilité des colliders ;
- intersections volontaires pendant Placement non bloquées ;
- absence de franchissement du sol gris ;
- résolution Rapier d'une forte pénétration sans crash ni perte de cible ;
- absence de jitter/tunneling bloquant ;
- endormissement des corps physiques ;
- coût CPU/GPU lorsque la scène est au repos ;
- libération mémoire lors ajout/retrait/changement de caillou.

#### UX / accessibilité
- téléphone portrait ;
- tablette portrait/paysage ;
- desktop ;
- clavier ;
- focus ;
- contraste ;
- reduced motion ;
- zones tactiles ;
- erreurs et chargements ;
- Boutique unique et lisible ;
- état `Acquis`/`Possédé`/`Verrouillé` ;
- Placement unique ;
- cible clairement identifiée ;
- canvas entier utilisable après sélection ;
- conflits entre OrbitControls, Caresser, Nettoyer et Placement ;
- ajout et sélection claire de plusieurs instances ;
- réglage fin utilisable comme alternative à la gestuelle.

#### PWA / Vercel
- Preview/Production ;
- installation ;
- service worker ;
- mise à jour ;
- cache ;
- cache des GLB nécessaires ;
- reprise de la pose du caillou et des transforms ;
- reprise Boutique/propriétés/déblocages ;
- reconnexion pendant une stabilisation atomique ;
- réseau médiocre ;
- erreurs runtime pertinentes.

### Règle de test

Éviter la prolifération de tests sans valeur. Prioriser les parcours critiques, invariants économiques, RLS, régressions 3D/physique et E2E essentiels.

Pour la physique et le tactile, les tests automatisés ne remplacent pas une validation visuelle sur appareil réel. Mesurer les scénarios utiles plutôt que chercher une couverture artificielle exhaustive.

Les intersections volontaires de 10.75 ne doivent pas être signalées comme défauts par des assertions historiques « aucune pénétration ». Le défaut à rechercher est une perte de contrôle, un franchissement du sol, un crash, une pose non persistée ou une résolution physique bloquante.

### Critères de release

- Aucun bug bloquant connu.
- Aucun risque de sécurité ou économique critique ouvert.
- Tous les contrôles essentiels verts.
- Parcours principal validé sur appareils réels disponibles.
- Boutique unifiée et Permis fonctionnels sans double circuit d'achat.
- Plusieurs accessoires simultanés restent manipulables et persistants.
- Placement caillou/accessoires partage une grammaire cohérente.
- Les intersections volontaires sont possibles pendant le geste et le sol reste infranchissable.
- Rapier reprend proprement l'autorité à Terminer.
- Collisions/gravité acceptables sur mobile/tablette cibles.
- Performance au repos proche du coût attendu d'une scène stable ; aucune simulation physique inutile permanente.
- Documentation de référence synchronisée avec le produit réel.
- Crédits/licences présents pour tous les assets tiers distribués.
- `main` correspond à la version candidate de production.

### Sortie attendue

- Corriger les problèmes V1 dans des PR ciblées.
- Pour toute dette non bloquante, documenter explicitement pourquoi elle est reportée.
- Mettre `00-INDEX-ROADMAP.md` à jour avec l'état final.
- Mettre à jour les quatre documents normatifs si l'implémentation finale a fait évoluer une décision.
- Tag/release V1.0 uniquement lorsque les critères sont satisfaits.

## État / compte rendu

**Statut : Terminée — candidate V1 de production validée ; tag `V1.0` différé jusqu'aux smoke tests matériels réels**

- Date : 3 septembre 2026.
- PR / commits : PR #34 ; candidat runtime final `6ae5bfda833042d1ad336d965eca99b4ec2a26d5` ; commit technique Preview sans changement fonctionnel `466303e0f63f473e894b20e931483116e9eada1c`.
- Audit GitHub : le head final a obtenu 4/4 contrôles ciblés verts : CI complète, Boutique/Placement, physique/stabilisation accessoires et mouvement global. La CI valide `release:validate`, lint, TypeScript strict, 24 fichiers / 83 tests unitaires et build de production.
- Audit Supabase : projet `CAILLOU-` `ACTIVE_HEALTHY`. Les tests d'isolation utilisateur A/B, RLS, grants, autorité des prix, wallet/ledger, propriété, limite de huit instances et idempotence n'ont révélé aucune violation critique. Deux migrations de durcissement ont été appliquées : `harden_auth_registration_rate_limit` et `deny_client_auth_rate_limits`.
- Inscription : `auth-register` est déployée en version 4 avec limitation serveur à 5 tentatives valides par 15 minutes et par IP pseudonymisée SHA-256. L'IP brute n'est pas persistée ; la table anti-abus est RLS, sans accès `anon`/`authenticated`, et le RPC de consommation est réservé au `service_role`.
- Advisors Supabase : aucun advisor sécurité critique. Dette acceptée : `auth_leaked_password_protection` reste désactivé. Les seuls avis performance sont des index encore inutilisés, niveau INFO ; ils ne sont pas supprimés en fin de V1 sans preuve qu'ils sont inutiles à long terme.
- Audit Vercel : une seule Preview volontaire étape 13, `dpl_GDbBc6VihWvNYYaifzS8CPX8X2T3`, branche `preview/13-final`, état `READY`. Build Node 22 / Vite 8 réussi, 2 488 modules transformés, service worker généré et aucun runtime error observé dans la fenêtre de contrôle.
- PWA / sécurité navigateur : précache final 6 entrées pour `443,69 KiB` sur Vercel ; les scènes 3D/physique restent lazy/runtime. `vercel.json` ajoute `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` et une `Permissions-Policy` restrictive.
- Appareils testés : les workflows Puppeteer/Chrome ont validé les parcours tactiles téléphone/tablette critiques, notamment Boutique/Placement, sol gris, physique/stabilisation et mouvement global. Aucun appareil iOS/Android/tablette/desktop physique n'était directement pilotable dans cette exécution ; ce point reste volontairement distinct des émulations navigateur.
- Performance 3D/physique : les 20 GLB cailloux passent le budget de 5 MiB avec un maximum mesuré à `0,78 MiB`. Les 4 accessoires V1 passent le même garde-fou avec un maximum à `2,47 MiB`. Le gros chunk 3D/physique reste environ `2,87 MiB` minifié / `1,02 MiB` gzip, chargé à la demande et non précaché ; il est accepté comme dette mesurée plutôt que refactorisé à risque juste avant release.
- Boutique / économie : prix et solde restent autoritaires Supabase ; achats accessoires et déblocages sont transactionnels/idempotents ; le Permis à 1000 Lithons conserve son circuit unique dans la Boutique. Aucun succès économique n'est fabriqué côté client.
- Placement universel : la grammaire commune caillou/accessoires, les intersections volontaires hors sol, la frontière dure du carré gris, la reprise Rapier à `Terminer` et la persistance atomique de `stabilize_rock_composition` ont été conservées et revalidées.
- Multi-accessoires : propriété de type et instances restent distinctes ; plusieurs instances simultanées restent permises avec plafond serveur de huit et transforms persistants.
- Sécurité : aucune clé `service_role` côté frontend. Le nouveau validateur `scripts/release/validate-v1-release.mjs` bloque la CI si l'inventaire 3D, les poids GLB, previews, licences/provenances, icônes PWA, règles de déploiement, headers ou absence de secrets frontend ne respectent plus le contrat V1.
- Licences/crédits : `THIRD-PARTY-NOTICES.md` est ajouté ; l'attribution CC BY 4.0 du Monocle est explicite et les trois autres accessoires conservent leur provenance CC0 vérifiée dans le catalogue.
- Accessibilité : la cible tactile compte/session est portée à 44 px ; focus visible et reduced-motion existants restent conservés.
- Bugs restants : aucun bug fonctionnel, économique ou sécurité critique connu au terme des contrôles automatisés et audits plateformes.
- Dette acceptée : protection Supabase des mots de passe compromis à activer ultérieurement ; quelques index Supabase encore inutilisés ; chunk 3D runtime d'environ `1,02 MiB` gzip ; lockfile npm toujours absent, l'installation CI restant stabilisée avec `--legacy-peer-deps` ; icônes PWA toujours nommées `provisional` faute d'un nouvel asset final fourni.
- Documentation normative : aucun changement de règle produit, de direction artistique ou de pipeline de conversion 3D n'a été introduit pendant cette passe ; les quatre documents normatifs restent applicables. Les nouveaux garde-fous sécurité/release sont consignés ici et dans le code versionné.
- Décision release : **GO technique pour fusionner la candidate dans `main` et la déployer en production. NO-GO volontaire pour créer le tag/release `V1.0` tant que les smoke tests physiques iOS/Android/tablette/desktop exigés par cette étape n'ont pas été réalisés.**
