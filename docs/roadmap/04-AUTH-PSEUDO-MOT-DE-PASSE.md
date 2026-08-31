# Étape 04 — Authentification pseudo + mot de passe

## Prompt d'exécution

Tu travailles sur CAILLOU™ après l'étape Supabase schéma/RLS. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte l'état réel GitHub/Supabase/Vercel avant d'agir.

### Objectif

Livrer l'expérience d'inscription et de connexion visible par l'utilisateur uniquement sous la forme **pseudo + mot de passe**, tout en utilisant Supabase Auth de façon sûre et maintenable.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel utile pour variables Preview/Production et validation bout en bout.

### À réaliser

- Implémenter la stratégie technique documentée qui masque l'identifiant Auth interne à l'utilisateur.
- Créer les Edge Functions ou mécanismes serveur nécessaires pour inscription/connexion par pseudo si cette stratégie reste la plus sûre après vérification des capacités Supabase actuelles.
- Garantir unicité et normalisation du pseudo sans casser sa casse d'affichage.
- Définir règles raisonnables de pseudo et mot de passe.
- Ne jamais exposer service-role ou secret serveur au frontend.
- Implémenter écrans : création de compte, connexion, déconnexion et états d'erreur.
- Prévoir persistance de session et restauration au rechargement.
- Gérer pseudo déjà pris, mauvais mot de passe, session expirée et réseau indisponible.
- Vérifier qu'un nouvel utilisateur sans caillou est routé vers le showroom, et qu'un utilisateur avec caillou actif ira plus tard vers le Socle.

### Hors périmètre

- Adoption réelle si l'étape 07 n'est pas encore faite.
- Reset mot de passe complexe par email si aucun email utilisateur n'est collecté ; documenter clairement la stratégie V1 retenue.
- Social login.

### Critères d'acceptation

- Inscription par pseudo + mot de passe fonctionnelle.
- Connexion/déconnexion fonctionnelles.
- Pseudo unique.
- Aucun identifiant technique étrange visible dans l'UX.
- Aucun secret serveur dans le bundle.
- Tests auth et RLS utilisateur A/B verts.
- Parcours mobile propre.

### Fin d'étape

PR dédiée, compte rendu et index mis à jour. Si la réalité Supabase impose une adaptation de la stratégie d'authentification, mettre à jour l'architecture avant merge.

## État / compte rendu

**Statut : Prête à fusionner — PR #8**

- Date : 31 août 2026.
- PR / commit : PR #8 `feat: authentification pseudo et mot de passe`, branche `feature/04-auth-pseudo-password`.
- Stratégie Auth retenue : l'utilisateur ne manipule que `pseudo + mot de passe`. Le pseudo normalisé reste l'identifiant fonctionnel dans `profiles`, tandis que Supabase Auth reçoit à l'inscription un email technique aléatoire `UUID@auth.caillou.invalid`. Cet identifiant n'est jamais renvoyé au frontend. Au login, le broker retrouve le profil par `username_normalized`, récupère l'identité Auth côté serveur puis ouvre la session par mot de passe. `ARCHITECTURE-TECHNIQUE.md` a été aligné sur cette stratégie, qui évite de dériver un identifiant Auth prévisible depuis le pseudo.
- Normalisation / règles V1 : pseudo canonisé par trim + espaces internes réduits, unicité insensible à la casse via `username_normalized`, casse d'affichage conservée, longueur 3–24 caractères, caractères autorisés lettres/chiffres/espace/point/tiret/underscore. Mot de passe 10–128 caractères.
- Migration Supabase : `20260831203257_enforce_profile_username_normalization`, avec contraintes Postgres sur longueur, espacement canonique et cohérence `username_normalized`.
- Edge Functions : `auth-register` ACTIVE version 3 et `auth-login` ACTIVE version 2. Elles sont pré-auth (`verify_jwt=false`) car elles doivent être appelables avant session, mais exigent une publishable key valide et gardent les secrets d'administration exclusivement dans Supabase.
- Inscription : création Auth, création du profil, wallet créé par le trigger existant `profiles_create_wallet`, ouverture de session. En cas d'échec après création Auth, le broker supprime l'utilisateur technique pour ne pas laisser de compte fantôme.
- Connexion : pseudo inconnu et mot de passe incorrect renvoient tous deux `invalid_credentials`, afin de ne pas exposer l'existence des comptes.
- Frontend : client `@supabase/supabase-js`, écrans création/connexion, erreurs métier, persistance/restauration de session, déconnexion locale `signOut({ scope: 'local' })`, état hors ligne, message de session expirée uniquement sur vrai `SIGNED_OUT` et routage `showroom` si aucun caillou actif / `socle` sinon.
- Test live Supabase : workflow temporaire GitHub Actions run `33437618762` vert. Il a validé inscription de deux utilisateurs, doublon de pseudo insensible à la casse, mauvais mot de passe, reconnexion, absence d'identifiant technique dans les réponses, isolation RLS A/B, refus anonyme et absence de caillou actif. Le workflow temporaire a ensuite été retiré.
- Nettoyage test : 0 profil `E2E-*` restant après validation.
- CI frontend : run `33438329137` vert sur le head fonctionnel : install, lint, TypeScript strict, tests unitaires et build production.
- Supabase advisors : 0 alerte sécurité. Les seuls avis performance sont des index encore inutilisés sur cette base jeune, sans action requise dans cette étape.
- Preview Vercel : branche volontaire `preview/04-auth-ui`, déploiement `dpl_Dn2yC37FF8Wp6KCBg4H3Yaqsv4LW` READY, build Node 22, PWA générée, HTTP 200 sur l'URL de Preview. Le filtre Vercel continue d'ignorer les branches `feature/**` ordinaires.
- Performance frontend : le bundle principal monte à environ 357,55 kB gzip après ajout de Supabase et conserve l'avertissement Vite de chunk > 500 kB minifié. Ce n'est pas bloquant pour l'étape 04 et sera à traiter dans une passe de découpage/performance ultérieure.
- Limites V1 : aucun email/téléphone utilisateur n'est collecté, donc pas de récupération autonome standard du mot de passe. Aucun mécanisme improvisé n'est ajouté. Le pseudo de connexion reste immuable en V1.
- Dette conservée : `package-lock.json` reste absent, donc la CI utilise toujours `npm install`; warning npm transitoire `glob@11.1.0` déjà connu.
- Étape suivante recommandée : 05 — Pipeline 3D de production et catalogue, préalable au showroom complet de l'étape 06.
