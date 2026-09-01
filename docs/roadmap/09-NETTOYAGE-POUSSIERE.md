# Étape 09 — Nettoyage et poussière cosmétique

## Prompt d'exécution

Tu travailles sur CAILLOU™ après le Socle. Lis `docs/roadmap/00-INDEX-ROADMAP.md`, ce fichier et les quatre documents de référence. Inspecte le renderer, le schéma Supabase et les interactions existantes avant d'agir.

### Objectif

Implémenter le nettoyage comme interaction uniquement cosmétique, satisfaisante et persistante, sans besoin vital, récompense ou sanction.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire pour la persistance.
- Vercel recommandé pour la validation mobile.

### Règles

- La poussière n'affecte jamais humeur, santé, Lithons ou progression obligatoire.
- Nettoyer ne rapporte aucun Lithon.
- L'absence n'entraîne aucun message culpabilisant.
- L'intensité peut dépendre du temps depuis le dernier nettoyage, avec un plafond visuel discret.

### À réaliser

- Choisir une technique visuelle légère et compatible avec les 20 roches.
- Activer le mode Nettoyer depuis la commande du Socle.
- Implémenter un geste tactile compréhensible et accessible.
- Persister `last_cleaned_at` ou l'état équivalent côté Supabase.
- Incrémenter la statistique de nettoyages sans toucher au portefeuille.
- Tester reload, reconnexion, réseau intermittent et performances mobiles.
- Respecter reduced motion et les règles visuelles premium.

### Hors périmètre

- Boutique.
- Récompenses de nettoyage.
- Nouveaux décors complexes.

### Critères d'acceptation

- Poussière visible mais discrète et jamais punitive.
- Nettoyage compréhensible et agréable.
- Aucun Lithon attribué.
- État persistant dans Supabase.
- Effet performant et cohérent sur les 20 spécimens.

### Fin d'étape

PR dédiée. Compléter le compte rendu et l'index. Documenter les paramètres retenus pour qu'ils puissent évoluer.

## État / compte rendu

**Statut : Terminée**

- Date de clôture : 2026-09-01
- PR / commit de validation : PR #17 ; candidat runtime `57ffa6110224f3a67d5839675ff1b096289214de`
- Technique visuelle : seconde peau PBR très fine partageant la géométrie et les UV du scan ; masque procédural `CanvasTexture` 128 × 128 déterministe par spécimen ; matériau minéral mat, sans ombre ni raycast ; aucune texture source des vingt GLB n'est modifiée et aucun asset lourd n'est ajouté
- Nettoyage local : en mode Nettoyer, `OrbitControls` est suspendu et le masque de poussière est effacé exactement aux coordonnées UV parcourues ; le renderer en `frameloop="demand"` est invalidé à chaque passage afin que l'effacement soit immédiatement visible
- Accumulation : surface propre pendant les 12 premières heures suivant adoption ou dernier nettoyage ; apparition progressive ensuite ; plafond visuel atteint à 14 jours ; aucune jauge de propreté, santé, humeur ou sanction d'absence
- Geste retenu : 320 ms minimum, 80 px de trajet cumulé, 30 px d'amplitude et 6 échantillons minimum ; tap et micro-jitter rejetés ; un geste incomplet ou annulé restaure le masque canonique au lieu de conserver une propreté non enregistrée
- UX : `BrushCleaning` devient une vraie commande seulement lorsque de la poussière est visible ; Caresser et Nettoyer sont des modes mutuellement exclusifs ; après succès, message sobre `Surface remise dans un état réglementaire.` ; Accessoire et Jeter restent désactivés
- Reduced motion : aucune animation temporelle de poussière ni effet obligatoire ; le nettoyage repose uniquement sur le geste direct et le redraw local
- Persistance : réutilisation de `public.register_cleaning(p_user_rock_id, p_event_key)` ; `last_cleaned_at`, `rock_progress.cleaning_count` et `interaction_count` sont autoritaires côté Supabase ; reload/reconnexion réhydratent `last_cleaned_at` et `cleaning_count` depuis les tables protégées par RLS
- Migration Supabase : `20260901105135_harden_cleaning_cadence` ; un événement distinct est refusé avant 12 h depuis adoption/nettoyage, ce qui empêche l'inflation artificielle de `cleaning_count` ; un replay exact du même `event_key` reste idempotent
- Économie : le nettoyage ne modifie jamais `wallets.balance`, `lifetime_earned`, `caress_count` ou `lithons_generated` et n'écrit aucune entrée dans `lithon_ledger`
- Tests serveur : test SQL transactionnel réel validé ; premier nettoyage + replay = un seul incrément ; second événement distinct <12 h refusé ; utilisateur B refusé sur le caillou A ; rôle `anon` sans exécution ; wallet et ledger inchangés ; rollback final avec 0 fixture et 0 ledger de test
- Tests automatiques du candidat : CI #74 verte ; adoption E2E #14 verte ; caresse/Lithon E2E #8 verte ; nettoyage/poussière E2E #2 verte ; showroom WebGL + téléphone/tablette #24 vert
- Test tactile : Chrome 151.0.7922.173 sur vrai modèle 3D ; scénario validé `dust → tap rejected → UV scrub → lost response → idempotent retry → reload → 0 Lithon` ; téléphone 390 × 844 et tablette 1024 × 768 ; artifact `9797616873`
- Vercel Preview : une seule Preview volontairement déclenchée après stabilisation ; `dpl_DUp6KcxBQri8R5q2ttQCojVzgJ9D` en état `READY` sur `preview/09-cleaning-dust` ; commit Preview `51f127ce9b01e27bf92271530f5827f40baaeb24` avec zéro différence de fichiers par rapport au candidat runtime ; build Vite/PWA réussi
- Advisors Supabase : aucune nouvelle alerte sécurité ; avertissement Auth préexistant sur la protection contre les mots de passe compromis ; informations d'index inutilisés non bloquantes
- Dette : aucune dette bloquante pour l'étape 09 ; les seuils et durées sont centralisés afin de pouvoir être recalibrés ; la poussière reste volontairement cosmétique et la boutique demeure hors périmètre
- Étape suivante recommandée : 10 — Accessoires et boutique Lithons
