# Étape 13 — QA, sécurité, performance et release V1

## Prompt d'exécution

Tu travailles sur CAILLOU™ lorsque les étapes 01 à 12 sont terminées. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte GitHub, Supabase et Vercel dans leur état réel avant d'agir.

### Objectif

Effectuer la passe de consolidation finale et décider si CAILLOU™ peut être déclaré V1.0 : qualité fonctionnelle, sécurité Supabase, performance 3D, accessibilité, PWA, UX, contenu et déploiement.

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
- boutique/accessoires ;
- Bio/Stats ;
- Jeter puis nouvelle adoption.

#### Supabase / sécurité
- RLS toutes tables concernées ;
- utilisateur A/B ;
- service-role absent du client ;
- transactions Lithons/achats ;
- idempotence ;
- advisors sécurité/performance ;
- contraintes et index.

#### 3D / performance
- 20 GLB ;
- mémoire GPU sur cycles complets ;
- temps de chargement ;
- frame time pendant rotation ;
- chauffe sur session prolongée ;
- qualité adaptative ;
- accessoires + poussière.

#### UX / accessibilité
- téléphone portrait ;
- tablette portrait/paysage ;
- desktop ;
- clavier ;
- focus ;
- contraste ;
- reduced motion ;
- zones tactiles ;
- erreurs et chargements.

#### PWA / Vercel
- Preview/Production ;
- installation ;
- service worker ;
- mise à jour ;
- cache ;
- réseau médiocre ;
- erreurs runtime pertinentes.

### Règle de test

Éviter la prolifération de tests sans valeur. Prioriser les parcours critiques, invariants économiques, RLS, régressions 3D et E2E essentiels.

### Critères de release

- Aucun bug bloquant connu.
- Aucun risque de sécurité ou économique critique ouvert.
- Tous les contrôles essentiels verts.
- Parcours principal validé sur appareils réels disponibles.
- Performance acceptable sur mobile/tablette cibles.
- Documentation de référence synchronisée avec le produit réel.
- Crédits/licences présents.
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
- Performance :
- Sécurité :
- Bugs restants :
- Dette acceptée :
- Décision release :
