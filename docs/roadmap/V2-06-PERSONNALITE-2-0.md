# V2-06 — Personnalité 2.0

> **Statut : spécifiée — prête à exécuter après V2-02.**
>
> **Date : 4 septembre 2026.**
>
> **Dépendances : V2-02 obligatoire ; Bio/Stats V1 conservés.**

Ce fichier est le prompt autonome d'exécution de V2-06 et deviendra son historique après réalisation.

## 1. Prompt d'exécution

Lis l'index, ce fichier, le compte rendu V2-02, le code `src/features/bio/`, les statistiques réellement disponibles, les données `rock_catalog`, `user_rocks`, `rock_progress`, le ton éditorial CAILLOU™ et les documents de direction artistique.

GitHub et Supabase obligatoires. Vercel seulement si une validation visuelle finale apporte une preuve utile.

V2-06 doit produire une personnalité **stable, cohérente et déterministe**, sans demander à l'utilisateur de la choisir ou de la relancer.

## 2. Contexte réel

Bio/Stats existe gratuitement depuis la V1 et affiche des faits/statistiques canoniques. La Personnalité V2 est une couche supplémentaire, payante par caillou, destinée à donner une identité éditoriale durable sans transformer l'application en chatbot ni en simulateur de besoins.

## 3. Décisions métier actées

- Personnalité est une fonctionnalité payante liée au caillou ;
- le caillou **est comme il est** ;
- aucun choix initial utilisateur ;
- aucun reroll ;
- aucun tirage différent à chaque ouverture ;
- personnalité persistée/versionnée ;
- elle peut dériver du spécimen, de l'adoption et d'éléments historiques fiables ;
- elle ne remplace pas Bio/Stats gratuits ;
- traits évolutifs avancés réservés à V2.2.

## 4. Objectif utilisateur

Après achat de Personnalité, l'utilisateur découvre une fiche qui donne le sentiment que son caillou a un caractère propre, cohérent et reconnaissable dans le temps.

Deux cailloux différents peuvent avoir des personnalités différentes, mais une même personnalité ne doit pas changer simplement parce que l'écran est rouvert.

## 5. Périmètre précis

### Lot A — Cadrage éditorial exécutable

Avant de coder, formaliser dans le même chantier une petite taxonomie stable.

Contraintes :

- **4 à 6 traits fondamentaux maximum** ;
- vocabulaire compréhensible et amusant ;
- pas de score pseudo-psychologique scientifique ;
- chaque trait appartient à un ensemble contrôlé ;
- ajouter éventuellement 2 à 4 « manies/goûts absurdes » issus d'un corpus contrôlé ;
- éviter les combinaisons incohérentes ou répétitives.

Exemples conceptuels de dimensions possibles : tempérament, curiosité, sociabilité minérale, goût du confort, rapport à l'ordre, audace. Les noms finaux doivent être choisis selon le ton du produit, pas copiés aveuglément.

### Lot B — Algorithme déterministe/versionné

Créer un mécanisme reproductible, par exemple :

```text
stable seed
  = hash(user_rock_id + specimen_id + adopted_at + personality_version)
```

La méthode exacte peut différer, mais :

- résultat stable ;
- pas de `Math.random()` non seedé ;
- `personality_version` explicite ;
- possibilité future de migrer le générateur sans réécrire silencieusement les personnalités existantes.

Le spécimen peut influencer certaines distributions, mais ne doit pas rendre tous les `rock-003` identiques.

### Lot C — Persistance

Créer un modèle conceptuel du type :

```text
rock_personality
- user_rock_id
- version
- seed / generation metadata
- traits
- quirks/preferences
- generated_at
```

JSONB est acceptable pour un petit ensemble versionné si les champs sont validés et ne nécessitent pas de requêtes relationnelles complexes. Une structure relationnelle est préférable seulement si elle apporte une vraie valeur.

### Lot D — Déblocage

- feature `personality` dans `feature_catalog` ;
- achat via le contrat V2-02 ;
- la personnalité peut être générée au moment du premier accès après acquisition ou atomiquement lors de l'acquisition ;
- une seule personnalité canonique par caillou/version active ;
- retry réseau ne génère pas une seconde personnalité.

### Lot E — Présentation Bio

Intégrer proprement la Personnalité à la Bio sans cacher les Stats gratuites.

Avant achat : section verrouillée avec CTA Boutique.

Après achat :

- traits ;
- formulations éditoriales ;
- petites manies/goûts ;
- aucun bouton reroll ;
- distinction visuelle entre faits réels et caractérisation humoristique.

### Lot F — Préparer V2.2 sans l'implémenter

Le modèle doit permettre plus tard des traits évolutifs ou réactions contextuelles sans modifier les traits fondamentaux de manière arbitraire.

Séparer conceptuellement :

```text
core personality V2.0 = stable
future derived/evolving traits V2.2 = évolution à partir de l'histoire
```

## 6. Hors périmètre

- chatbot/LLM ;
- texte généré par API distante ;
- reroll ;
- choix manuel des traits ;
- humeur quotidienne ;
- faim/sommeil/besoins punitifs ;
- réactions contextuelles V2.2 ;
- accomplissements ;
- événements rares.

## 7. Architecture cible

```text
rock canonical data
   + deterministic generator version
        -> persisted personality
        -> editorial projection
        -> Bio UI
```

Le générateur ne doit pas recalculer et remplacer le snapshot canonique à chaque rendu.

## 8. Contrats frontend

- loader dédié ou extension propre du snapshot Bio ;
- l'UI ne génère pas autoritairement la personnalité ;
- rendu éditorial à partir de données contrôlées ;
- fallback clair si entitlement présent mais génération serveur non encore confirmée ;
- aucun couplage à la scène 3D requis.

## 9. Contrats Supabase

V2-06 implique probablement :

- seed feature catalogue ;
- table personnalité ;
- fonction de création/lecture canonique ou RPC idempotent ;
- RLS par `user_rock_id` ;
- validation de version/structure.

La génération peut être implémentée en TypeScript puis persistée via RPC uniquement si le serveur vérifie qu'un client ne peut pas choisir arbitrairement ses traits. Préférence : génération déterministe autoritaire côté serveur ou génération vérifiable côté serveur.

## 10. Migration / backfill / compatibilité V1

- aucun caillou reçoit gratuitement Personnalité ;
- aucun trait historique n'est inventé ;
- Bio/Stats V1 reste fonctionnelle sans entitlement ;
- cailloux jetés conservent leur personnalité historique si elle a été acquise ;
- nouveau caillou n'hérite pas de celle de l'ancien.

## 11. RLS / grants / RPC / idempotence / sécurité

Tester :

- lire personnalité d'un autre ;
- générer sans entitlement ;
- injecter ses propres traits ;
- générer deux fois ;
- retry même event key ;
- caillou jeté ;
- changement de version ;
- achat pour caillou tiers.

## 12. Offline / PWA / réconciliation

Une personnalité déjà confirmée peut être consultée depuis le cache. Une génération/achat non confirmée n'est jamais simulée. Reconnexion relit la personnalité canonique.

## 13. Performance et budgets

Pas d'appel AI ni de payload lourd. Le corpus éditorial peut être local mais doit rester raisonnable, lazy si nécessaire et dédupliqué. La fiche ne doit pas augmenter sensiblement le bundle initial.

## 14. UX téléphone / tablette / desktop

Priorité à une fiche courte, lisible et drôle. Éviter le mur de 30 traits. Les formulations doivent fonctionner sur petits écrans et rester accessibles au clavier/lecteur d'écran.

## 15. Tests unitaires utiles

- stabilité du seed ;
- même input = même personnalité ;
- diversité sur fixtures ;
- versioning ;
- aucune combinaison interdite ;
- mapping éditorial ;
- gating entitlement.

## 16. Browser regression

Scénarios : section verrouillée, achat, génération unique, reload identique, offline lecture, nouveau caillou verrouillé, ancien caillou historique inchangé, Bio/Stats de base toujours accessibles.

## 17. Discipline plateformes

Une branche/PR. Migrations via Supabase. CI + Browser regression. Preview seulement si nécessaire pour validation UX finale de la Bio, pas pour le contenu textuel seul.

## 18. Critères d'acceptation

- [ ] feature payante par caillou ;
- [ ] 4 à 6 traits max, taxonomie documentée ;
- [ ] génération déterministe/versionnée ;
- [ ] personnalité persistée ;
- [ ] aucun reroll ;
- [ ] aucun changement à chaque reload ;
- [ ] Bio/Stats gratuits préservés ;
- [ ] données humoristiques distinguées des faits ;
- [ ] RLS/idempotence validées ;
- [ ] modèle prêt pour V2.2 sans implémenter V2.2 ;
- [ ] CI + Browser regression verts.

## 19. Interdictions anti-scope-creep

Ne pas ajouter LLM, humeur temps réel, besoins quotidiens, réactions, succès, chat avec le caillou, voix ou animation de personnalité.

## 20. État / compte rendu d'exécution

**Statut : À exécuter.**

À compléter : prix, taxonomie finale, algorithme/seed/version, schéma Supabase, corpus éditorial, tests de stabilité/diversité, CI, Preview éventuelle, production et dettes V2.2.

**Ne pas démarrer V2-07 dans cette PR.**