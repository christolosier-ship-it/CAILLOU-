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

**Statut : À faire**

- Date :
- PR / commit :
- Stratégie Auth retenue :
- Edge Functions / RPC :
- Tests :
- Limites V1 :
- Étape suivante recommandée : 05 ou 06 selon avancement 3D
