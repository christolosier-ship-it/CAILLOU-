# Étape 08 — Caresse et économie en Lithons

## Prompt d'exécution

Tu travailles sur CAILLOU™ après adoption/Socle et fondations Supabase. Lis l'index roadmap, ce fichier et les quatre documents normatifs. Inspecte le schéma, les RPC/Edge Functions et le Socle réel avant d'agir.

### Objectif

Implémenter la première boucle de jeu complète : l'utilisateur active le mode Caresser, effectue une vraie caresse tactile sur le caillou, et reçoit des **Lithons** persistés de manière autoritaire côté Supabase.

### Plugins

- GitHub obligatoire.
- Supabase obligatoire.
- Vercel recommandé pour tests tactiles réels.

### Règles métier

- Monnaie officielle : **Lithon / Lithons**.
- Les Lithons n'ont aucune valeur réelle.
- Ils ne s'achètent pas, ne se transfèrent pas, ne se convertissent pas.
- Une caresse valide crédite la récompense définie dans la doc V1, initialement `+1 Lithon`.
- Aucun bonus quotidien, streak ou sanction d'absence.

### À réaliser

- Définir précisément ce qu'est une caresse valide : geste continu intentionnel, seuils tactiles raisonnables, prévention du spam/clic automatique trivial.
- Le frontend détecte le geste mais ne modifie jamais directement le solde.
- Appeler une mutation serveur idempotente qui vérifie propriétaire, crédite le portefeuille, incrémente les stats et écrit le ledger dans une seule transaction.
- Afficher un feedback discret `+1 Lithon` sans esthétique arcade/casino.
- Afficher le solde à l'endroit prévu par l'UX sans voler la vedette au caillou.
- Gérer retries réseau sans double crédit.
- Tester multi-tap, double requête, session expirée, utilisateur A tentant de créditer le caillou B.
- Prévoir instrumentation minimale de debug sans analytics externe obligatoire.

### Hors périmètre

- Achat d'accessoires.
- Nettoyage.
- Jeter.

### Critères d'acceptation

- Une vraie caresse reconnue crédite exactement la récompense attendue.
- Double requête ne double pas le crédit.
- Le client ne peut pas forger son solde.
- Ledger et solde restent cohérents.
- Stats de caresse mises à jour.
- UX tactile fluide sur mobile/tablette.

### Fin d'étape

PR dédiée. Compléter compte rendu + index et documenter les seuils de détection retenus afin qu'ils soient modifiables plus tard.

## État / compte rendu

**Statut : À faire**

- Date :
- PR / commit :
- Règle de caresse :
- Récompense :
- Transaction serveur :
- Tests sécurité/idempotence :
- Tests tactiles :
- Dette :
- Étape suivante recommandée : 09
