# Étape 13 — QA, sécurité, performance et release V1

## Prompt d'exécution

Tu travailles sur CAILLOU™ lorsque les étapes 01 à 12 sont terminées, y compris le jalon accessoires 10A–10D. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte GitHub, Supabase et Vercel dans leur état réel avant d'agir.

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
- catalogue accessoires ;
- boutique et achats ;
- multi-équipement ;
- placement, rotation et échelle ;
- collisions et gravité ;
- persistance/reprise des placements ;
- Bio/Stats ;
- Jeter puis nouvelle adoption.

#### Supabase / sécurité
- RLS toutes tables concernées ;
- utilisateur A/B ;
- service-role absent du client ;
- transactions Lithons/achats ;
- idempotence ;
- possession d'accessoires distincte des instances équipées ;
- impossibilité d'équiper un accessoire non possédé ;
- intégrité des instances multi-accessoires et de leurs transforms ;
- comportement des instances lorsque le caillou est jeté ;
- advisors sécurité/performance ;
- contraintes et index.

#### 3D / physique / performance
- 20 GLB cailloux ;
- GLB accessoires retenus, provenance/licences et poids ;
- mémoire GPU sur cycles complets ;
- temps de chargement ;
- frame time pendant rotation ;
- frame time pendant manipulation/gravité ;
- chauffe sur session prolongée ;
- qualité adaptative ;
- accessoires + poussière ;
- plusieurs accessoires simultanés ;
- stabilité des colliders ;
- absence de pénétration visible ;
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
- conflits entre OrbitControls, caresse, nettoyage et manipulation d'accessoires ;
- sélection/édition claire de plusieurs accessoires.

#### PWA / Vercel
- Preview/Production ;
- installation ;
- service worker ;
- mise à jour ;
- cache ;
- cache des GLB accessoires équipés ;
- reprise des transforms après offline/reconnexion ;
- réseau médiocre ;
- erreurs runtime pertinentes.

### Règle de test

Éviter la prolifération de tests sans valeur. Prioriser les parcours critiques, invariants économiques, RLS, régressions 3D/physique et E2E essentiels.

Pour la physique, les tests automatisés ne remplacent pas une validation visuelle/tactile sur appareil réel. Mesurer les scénarios utiles plutôt que chercher une couverture artificielle exhaustive.

### Critères de release

- Aucun bug bloquant connu.
- Aucun risque de sécurité ou économique critique ouvert.
- Tous les contrôles essentiels verts.
- Parcours principal validé sur appareils réels disponibles.
- Plusieurs accessoires simultanés restent manipulables et persistants sans régression critique.
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

**Statut : À faire**

- Date :
- PR / commits :
- Audit GitHub :
- Audit Supabase :
- Audit Vercel :
- Appareils testés :
- Performance 3D/physique :
- Multi-accessoires :
- Sécurité :
- Licences/crédits :
- Bugs restants :
- Dette acceptée :
- Décision release :
