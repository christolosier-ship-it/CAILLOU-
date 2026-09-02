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

**Statut : À faire**

- Date :
- PR / commits :
- Audit GitHub :
- Audit Supabase :
- Audit Vercel :
- Appareils testés :
- Performance 3D/physique :
- Boutique / économie :
- Placement universel :
- Multi-accessoires :
- Sécurité :
- Licences/crédits :
- Bugs restants :
- Dette acceptée :
- Décision release :
