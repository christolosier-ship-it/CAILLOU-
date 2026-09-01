# Étape 07 — Adoption, nommage et Socle

## Prompt d'exécution

Tu travailles sur CAILLOU™ après les étapes Auth et Showroom. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte GitHub, Supabase et la Preview réelle avant toute modification.

### Objectif

Relier le premier parcours complet : utilisateur connecté → choix d'un spécimen → nommage → adoption persistée dans Supabase → arrivée sur le Socle principal.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel recommandé pour E2E mobile.

### À réaliser

- Implémenter la mutation d'adoption côté serveur selon les contrats de l'étape 03.
- Empêcher les doublons/états incohérents en cas de double tap ou retry réseau.
- Écran de nommage simple, premium, accessible.
- Validation raisonnable du nom du caillou.
- Enregistrer spécimen, nom, date d'adoption et état actif dans Supabase.
- Après adoption, router vers le Socle.
- Construire le Socle sobre : caillou central 3D manipulable, Bio/Stats en haut à gauche, slot futur en haut à droite, quatre commandes en bas : Caresser, Nettoyer, Accessoire, Jeter.
- Les quatre commandes peuvent être partiellement inactives tant que leurs étapes dédiées ne sont pas réalisées, mais leur état doit paraître volontaire.
- Au reload/reconnexion, retrouver le bon caillou et son nom depuis Supabase.
- Prévoir le cas utilisateur connecté sans caillou actif.

### Hors périmètre

- Crédit Lithon réel.
- Nettoyage fonctionnel.
- Boutique fonctionnelle.
- Jeter fonctionnel.

### Critères d'acceptation

- Parcours inscription/connexion → showroom → choix → nom → Socle fonctionnel.
- Adoption persistée serveur et idempotente.
- Reload conserve le bon état.
- Socle conforme à l'architecture UI cible.
- Aucune donnée métier essentielle uniquement en local.

### Fin d'étape

PR dédiée, compte rendu + index. Ajouter un E2E du premier parcours critique.

## État / compte rendu

**Statut : Terminée**

- Date de clôture : 2026-09-01.
- PR / candidat : PR #14 ; candidat fonctionnel `e134eaff0b8bad036afadfbd29ebca257dd21423` avant clôture documentaire.
- Mutation adoption : le frontend utilise le contrat serveur existant `public.adopt_rock(p_specimen_id, p_name, p_event_key)` ; `auth.uid()` reste l'autorité sur l'utilisateur, la contrainte Postgres garantit un seul caillou actif, la création de `user_rocks` + `rock_progress` est atomique et le reçu de mutation rend un retry réseau idempotent.
- Nommage : écran dédié avec le spécimen 3D maintenu visible ; nom normalisé côté client, borné à 1–32 caractères, caractères de contrôle rejetés ; la migration Supabase `20260901074158_harden_adoption_naming` durcit la contrainte côté serveur.
- État serveur / reprise : l'hydratation de session lit le caillou actif depuis Supabase et restaure son identifiant, son spécimen, son nom, sa date d'adoption et son dernier nettoyage ; l'utilisateur sans caillou actif retourne au Showroom, l'utilisateur avec caillou actif arrive au Socle.
- Socle : scène Studio 3D réutilisée avec caillou central manipulable, Bio / Stats, slot futur neutre et commandes Caresser / Nettoyer / Accessoire / Jeter présentes mais volontairement désactivées jusqu'aux étapes dédiées.
- Validation Supabase réelle : scénario transactionnel exécuté sur le projet cible avec nom invalide rejeté, adoption de `rock-007` sous le nom `Bernard`, replay du même `event_key` sans doublon, second caillou actif refusé, isolation RLS entre deux utilisateurs puis rollback ; état final des fixtures : `0 user_rocks` et `0 rock_progress`.
- E2E : workflow `Validate adoption first path`, run #3 (`33483996284`) vert ; scénario téléphone 390 × 844 : Showroom → nommage → réponse réseau simulée perdue après enregistrement → retry avec le même `event_key` → Socle, quatre commandes désactivées, cibles ≥ 44 px, canvas 3D présent et Bio / Stats accessible.
- Régressions 3D / responsive : workflow `Validate showroom WebGL and responsive UI`, run #14 (`33483996267`) vert, y compris cycle mémoire WebGL et validation téléphone/tablette.
- CI frontend : run #60 (`33483996281`) vert : lint, typecheck, tests unitaires et build production.
- Vercel Preview : branche `preview/07-adoption-naming-socle`, commit arbre-identique `3b769177c5806f119d40e8df9bfabb0026ebdbb4`, déploiement `dpl_H58JHYtZ8wysJqatPn2SUpHo4ozo` en état `READY`. Build `tsc -b && vite build` terminé, 637 modules transformés, PWA générée et outputs déployés. La Preview est protégée par Vercel Authentication ; une requête non authentifiée reçoit la redirection SSO attendue.
- Sécurité / performance : aucun nouvel avertissement Supabase causé par l'étape 07. L'avertissement Auth préexistant sur la protection des mots de passe compromis reste hors périmètre ; les informations d'index inutilisés concernent des tables encore peu sollicitées et ne justifient pas de suppression anticipée.
- Dette : les quatre actions du Socle sont volontairement non fonctionnelles ; Lithons, caresse, nettoyage, accessoires et abandon restent dans leurs étapes dédiées. Le bundle Vite principal reste volumineux et sera à surveiller lors de la passe performance/release sans bloquer cette étape.
- Étape suivante recommandée : 08 — Caresse et économie en Lithons.
