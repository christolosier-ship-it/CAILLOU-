from pathlib import Path
import sys

MODE = sys.argv[1] if len(sys.argv) > 1 else None
if MODE not in {"docs", "product"}:
    raise SystemExit("usage: apply-step11.py docs|product")

def replace_once(path: str, old: str, new: str, label: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"{label}: anchor missing in {path}")
    p.write_text(text.replace(old, new, 1))

def replace_between(path: str, start: str, end: str, new: str, label: str):
    p = Path(path)
    text = p.read_text()
    i = text.find(start)
    if i < 0:
        raise SystemExit(f"{label}: start anchor missing in {path}")
    j = text.find(end, i)
    if j < 0:
        raise SystemExit(f"{label}: end anchor missing in {path}")
    p.write_text(text[:i] + new + text[j:])

if MODE == "docs":
    replace_once(
        "docs/roadmap/00-INDEX-ROADMAP.md",
        "**La prochaine étape à exécuter est donc 11.**\n\n## Frontières importantes",
        """**La prochaine étape à exécuter est donc 11.**

## Consolidation post-10.75 — Socle, PlacementSession et drafts multi-cibles

Après la clôture historique de 10.75, deux corrections transversales ont été exécutées avant l'étape 11. Elles ne constituent pas de nouvelles étapes de roadmap : elles assainissent le socle technique déjà prévu par les documents normatifs.

### PR #30 — harmonisation du Socle et du Placement

- branche historique : `refactor/harmonisation-sol-placement` ;
- merge : `659d055f77f665c161f5be4b2e219f7c47dc6cc4` ;
- unification du Socle visuel/physique, des contraintes et du contrôleur de Placement ;
- suppression des chemins legacy devenus concurrents ;
- maintien du contrat 10.75 : Boutique = acquérir, Placement = manipuler, Rapier = arbitrer après validation.

### PR #31 — PlacementSession réellement multi-cibles

- titre : `fix: rendre la session Placement multi-cibles réellement persistante` ;
- merge : `d9372f4b7af8ceaa8a67dc35476cbf1398206465` ;
- le `PlacementSession` devient la source de vérité de la composition pendant toute l'édition ;
- le caillou et chaque instance accessoire possèdent un draft monde indépendant ;
- déplacer le caillou ne déplace plus les accessoires pendant l'édition ;
- changer de cible ne restaure plus une pose persistée et ne détruit aucun draft ;
- aucune RPC Supabase n'est effectuée lors d'un simple changement de cible ;
- `Terminer` valide la session entière : settlement global si le caillou est dirty, settlement limité aux accessoires dirty sinon, aucune écriture si rien n'a changé ;
- les accessoires démarrent le settlement depuis leurs transforms monde de session, sans recalcul préalable relativement au nouveau caillou ;
- aucune migration Supabase n'a été nécessaire.

Validation de clôture :

- neuf workflows officiels verts sur le candidat de #31 ;
- CI post-merge `main` verte ;
- workflow temporaire d'intégration supprimé ;
- production Vercel `READY` sur le SHA exact `d9372f4b7af8ceaa8a67dc35476cbf1398206465` ;
- aucun runtime error Vercel observé lors du contrôle de clôture.

**L'étape 11 démarre donc sur cette architecture consolidée, et non sur l'implémentation historique 10.75.**

## Frontières importantes""",
        "index post placement session",
    )

    replace_once(
        "ARCHITECTURE-TECHNIQUE.md",
        "> **Statut : architecture V1 après 10.5, cible d'exécution 10.75**  ",
        "> **Statut : architecture V1 courante après 10.75, PR #30 et PlacementSession PR #31**  ",
        "architecture status",
    )
    replace_once(
        "ARCHITECTURE-TECHNIQUE.md",
        "### Cible 10.75 : Shop UI agrégé, backend spécialisé",
        "### Boutique actuelle : UI agrégée, backend spécialisé",
        "architecture shop heading",
    )

    new_arch_section = """## 10. Moteur de Placement actuel : contrôleur universel + PlacementSession

### 10.1 Contrôleur commun

Le caillou et les accessoires utilisent la même grammaire de manipulation. La cible détermine seulement ses capabilities :

```text
PlacementController
  target: rock | accessory-instance
  tool: position | orientation | size
  capabilities:
    position: true
    orientation: true
    size: accessory uniquement
```

Le canvas entier sert de surface de geste. Les intersections objet/objet sont autorisées pendant l'édition ; le Socle gris reste la seule frontière géométrique dure.

### 10.2 Source de vérité pendant l'édition

Depuis la PR #31, une session de Placement conserve **toute la composition en coordonnées monde** :

```text
PlacementSessionState
  rock: PlacementTransform
  accessories: Record<instanceId, PlacementTransform>
  dirtyRock: boolean
  dirtyAccessoryIds: string[]
```

À l'ouverture de Placement :

1. la pose monde du caillou est capturée ;
2. chaque accessoire persistant est converti local → monde **une seule fois** ;
3. ces transforms deviennent le snapshot de session.

Pendant l'édition :

- déplacer le caillou modifie uniquement `session.rock` ;
- déplacer un accessoire modifie uniquement `session.accessories[id]` ;
- un changement de cible ne détruit aucun draft ;
- revenir sur une cible restitue exactement son dernier draft ;
- les accessoires non actifs ne sont jamais recalculés en continu depuis la pose courante du caillou ;
- aucune écriture Supabase n'est déclenchée par un mouvement ou un changement de cible.

Cette séparation empêche le caillou de « tracter » ses accessoires pendant l'édition et permet d'alterner librement entre plusieurs cibles.

### 10.3 Plan de settlement

`Terminer` construit un plan à partir des dirty targets :

```text
PlacementSettlementPlan
  rock: boolean
  accessoryIds: string[]
```

Trois cas existent.

**Caillou dirty** : le caillou et toutes les instances entrent dans le settlement global. Les accessoires démarrent depuis leurs transforms monde de session. Rapier résout gravité/collisions/intersections, puis `stabilize_rock_composition` persiste atomiquement le caillou et la composition.

**Caillou propre, accessoires dirty** : le caillou reste fixe, les accessoires non modifiés restent fixes, seuls les accessoires dirty deviennent dynamiques. Après stabilisation, chacun est converti monde → local puis persisté via `stabilize_equipped_accessory`.

**Aucune dirty target** : Placement se ferme sans mutation serveur.

### 10.4 Persistance et rechargement

La conversion monde → local d'un accessoire est une adaptation de frontière de persistance, jamais une source de vérité pendant l'édition.

La pose canonique affichée après reload est toujours la dernière pose stabilisée confirmée par Supabase.

### 10.5 Historique de livraison

- PR #30 : refactor transversal du Socle et du Placement ;
- PR #31 : finalisation du `PlacementSession` multi-cibles et correction des drafts indépendants ;
- aucune migration Supabase requise pour #31 ;
- production validée sur `d9372f4b7af8ceaa8a67dc35476cbf1398206465`.

---

"""
    replace_between(
        "ARCHITECTURE-TECHNIQUE.md",
        "## 10. Cible 10.75 : moteur de manipulation universel",
        "## 11. État frontend",
        new_arch_section,
        "architecture placement section",
    )

    replace_between(
        "ARCHITECTURE-TECHNIQUE.md",
        "### État UI temporaire actuel",
        "### État 3D temporaire",
        """### État UI courant

Le Socle utilise :

```text
mode: orbit | caress | cleaning | placement | settling
placementTarget: rock | accessory-instance | null
placementTool: position | orientation | size
placementSession: snapshot monde multi-cibles | null
settlementPlan: rock + accessoryIds | null
```

La capacité `size` n'est disponible que pour un accessoire. La Boutique est un état commercial distinct de Placement.

Le `PlacementSession` garde tous les drafts jusqu'à la fin de la session ; `placementTarget` ne fait que choisir la cible active et ne possède pas sa propre copie autoritaire de transform.

""",
        "architecture frontend state",
    )

    replace_once(
        "ARCHITECTURE-TECHNIQUE.md",
        "Les cibles tactiles UI font au moins 44 px. Les réglages fins restent accessibles hors Canvas et au clavier lorsque pertinent.\n\n---\n\n## 13. RLS et sécurité",
        """Les cibles tactiles UI font au moins 44 px. Les réglages fins restent accessibles hors Canvas et au clavier lorsque pertinent.

### 12.1 Bio / Stats — sources fiables de l'étape 11

La Bio lit sous RLS les sources métier existantes :

- `user_rocks` pour identité, adoption et pose stabilisée ;
- `rock_progress` pour caresses, nettoyages et Lithons générés par le caillou ;
- `wallets` pour solde, total gagné et total dépensé au compte ;
- `user_accessories` pour la propriété permanente des types d'accessoires ;
- `equipped_accessories` pour les instances actuellement placées sur le caillou actif ;
- `user_feature_unlocks` pour les déblocages permanents, dont `rock_movement`.

`observation_seconds` existe dans le schéma historique mais aucun contrat serveur courant ne l'alimente. Il ne doit donc pas être présenté comme une statistique fiable tant qu'une instrumentation autoritaire n'existe pas.

### 12.2 Jeter — contrat serveur existant

L'opération `discard_active_rock(user_rock_id, event_key)` existe déjà dans Supabase. Elle est transactionnelle, vérifie le propriétaire et utilise les reçus de mutation idempotents.

Lors du premier discard :

1. `user_rocks.discarded_at` est renseigné ;
2. les lignes `equipped_accessories` liées à ce caillou sont supprimées comme **déséquipement logique de la composition active** ;
3. le caillou, `rock_progress` et le ledger restent conservés comme historique ;
4. `wallets`, `user_accessories` et `user_feature_unlocks` ne sont pas modifiés.

La suppression d'une instance équipée ne supprime donc jamais la propriété commerciale du type d'accessoire.

Après confirmation côté UI, le caillou disparaît immédiatement du rendu. Une réponse réseau incertaine conserve le même `event_key` au retry. Après confirmation serveur, l'hydratation ne trouve plus de caillou actif et route vers l'état vide / nouvelle adoption.

Aucune migration Supabase supplémentaire n'est requise pour ce contrat.

---

## 13. RLS et sécurité""",
        "architecture step11 contract",
    )
    replace_once(
        "ARCHITECTURE-TECHNIQUE.md",
        "Une étape runtime passe par branche + PR + CI + tests ciblés. Pour 10.75 :",
        "Une étape runtime passe par branche + PR + CI + tests ciblés. Pour les évolutions après 10.75 :",
        "architecture git current",
    )
    replace_once(
        "ARCHITECTURE-TECHNIQUE.md",
        "- 10.75 : Boutique unifiée, Placement unique et contrôleur tactile commun.",
        """- 10.75 : Boutique unifiée, Placement unique et contrôleur tactile commun ;
- PR #30 : harmonisation du Socle, des contraintes et du moteur de Placement ;
- PR #31 : `PlacementSession` multi-cibles, drafts monde indépendants et validation de session entière.""",
        "architecture phase history",
    )
    replace_once(
        "ARCHITECTURE-TECHNIQUE.md",
        "### R5 - Désolidarisation des accessoires\nRéponse : transforms persistés localement au caillou et conversions monde/local centralisées.",
        """### R5 - Désolidarisation des accessoires
Réponse : transforms persistés localement au caillou, mais snapshot monde indépendant pendant `PlacementSession` ; conversions local/monde limitées aux frontières d'ouverture et de persistance.""",
        "architecture risk placement",
    )

    replace_once(
        "CAHIER-DES-CHARGES-V1.md",
        "> **Statut : document de référence V1, aligné après 10.5 et sur la cible 10.75**  ",
        "> **Statut : document de référence V1 courant, aligné après 10.75, PR #30 et PlacementSession PR #31**  ",
        "cdc status",
    )
    replace_once(
        "CAHIER-DES-CHARGES-V1.md",
        """### 13.5 Validation et physique

Au clic sur **Terminer** :

- Rapier reprend l'autorité ;
- gravité et collisions normales redeviennent actives ;
- une intersection créée volontairement peut provoquer glissement, rotation ou éjection rapide ;
- cet effet physique est acceptable et ne doit pas être remplacé par une correction artificielle de placement ;
- le résultat stabilisé est persisté côté Supabase.

Pour un accessoire seul, la pose finale reste exprimée dans le repère local du caillou. Pour la manutention du caillou, caillou et accessoires sont stabilisés ensemble et la composition est persistée atomiquement.
""",
        """### 13.5 Session multi-cibles, validation et physique

À l'ouverture de Placement, la composition est capturée en coordonnées monde dans un `PlacementSession`. Les accessoires persistés localement sont convertis local → monde une seule fois.

Pendant toute la session :

- chaque cible conserve son propre draft monde ;
- déplacer le caillou ne déplace pas les accessoires ;
- déplacer un accessoire ne modifie pas les autres objets ;
- changer de cible ne restaure jamais la pose persistée ;
- revenir sur une cible reprend exactement son dernier draft ;
- aucun mouvement ni changement de cible ne produit une écriture Supabase.

Au clic sur **Terminer**, c'est la session entière qui est validée :

- si le caillou a été modifié, Rapier stabilise globalement caillou + accessoires depuis leurs transforms monde de session, puis la composition est persistée atomiquement ;
- si seuls des accessoires ont été modifiés, le caillou et les accessoires non modifiés restent fixes, seuls les accessoires dirty sont stabilisés puis persistés ;
- si rien n'a été modifié, Placement se ferme sans écriture serveur ;
- gravité et collisions normales redeviennent actives uniquement pendant le settlement ;
- une intersection créée volontairement peut provoquer glissement, rotation ou éjection rapide ;
- cet effet physique est acceptable et ne doit pas être remplacé par une correction artificielle de placement.

La pose finale d'un accessoire est convertie monde → local uniquement à la frontière de persistance.
""",
        "cdc placement session",
    )
    replace_once(
        "CAHIER-DES-CHARGES-V1.md",
        """- règle explicite pour les anciennes instances du caillou afin d'éviter tout orphelin métier.

Puis état vide : **Aucun caillou actuellement sous votre responsabilité.** et CTA **Adopter un nouveau caillou**.
""",
        """- les instances `equipped_accessories` du caillou jeté sont déséquipées logiquement et retirées de la composition active ;
- cette suppression d'instances ne retire jamais la propriété `user_accessories` correspondante du compte.

Puis état vide : **Aucun caillou actuellement sous votre responsabilité.** et CTA **Adopter un nouveau caillou**.

Le caillou jeté, sa progression et les écritures de ledger restent conservés comme historique. L'opération est idempotente et transactionnelle.
""",
        "cdc discard semantics",
    )
    replace_once(
        "CAHIER-DES-CHARGES-V1.md",
        """- Lithons générés ;
- solde actuel ;
- accessoires possédés ;
- instances actuellement placées ;
- Permis de manutention minérale acquis ou non ;
- temps d'observation s'il est réellement fiable ;
- statistiques éditoriales telles que déplacement spontané `0 m`.

Une donnée fantaisiste ne doit jamais être présentée comme une mesure scientifique réelle.
""",
        """- Lithons générés par ce caillou ;
- solde actuel ;
- total de Lithons gagnés et dépensés au compte ;
- types d'accessoires possédés ;
- instances actuellement placées ;
- nombre de déblocages permanents ;
- Permis de manutention minérale acquis ou non ;
- temps d'observation uniquement s'il devient réellement instrumenté et fiable ;
- indicateurs éditoriaux absurdes clairement séparés des mesures métier.

À l'état actuel du backend, `observation_seconds` n'est alimenté par aucune mutation autoritaire : il est donc volontairement omis de l'interface.

Une donnée fantaisiste ne doit jamais être présentée comme une mesure scientifique réelle. Les indicateurs éditoriaux portent une mention explicite « non scientifique ».
""",
        "cdc bio reliability",
    )

    replace_once(
        "DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md",
        "> **Statut : référence visuelle V1, alignée après 10.5 et sur la cible 10.75**  ",
        "> **Statut : référence visuelle V1 courante, alignée après 10.75, PR #30 et PlacementSession PR #31**  ",
        "design status",
    )
    replace_once(
        "DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md",
        "### 9.1 Composition cible 10.75",
        "### 9.1 Composition courante",
        "design socle heading",
    )
    replace_between(
        "DESIGN-SYSTEM-DIRECTION-ARTISTIQUE.md",
        "## 20. Bio / Stats",
        "## 22. Caméra et lumière",
        """## 20. Bio / Stats

La Bio est un **dossier institutionnel**, pas un dashboard de performance. Elle s'ouvre depuis l'utilitaire supérieur gauche dans une sheet ou un dialogue sobre qui laisse le caillou conceptuellement au centre du produit.

Organisation recommandée :

```text
DOSSIER INSTITUTIONNEL
BERNARD

Identité
  Spécimen
  Adopté le
  Ancienneté
  Dernière pose stabilisée

Registre
  Caresses
  Nettoyages
  Lithons générés par ce caillou

Compte
  Solde
  Lithons gagnés
  Lithons dépensés

Composition et autorisations
  Types d'accessoires possédés
  Instances placées
  Déblocages permanents
  Permis de manutention

Indicateurs éditoriaux — non scientifiques
  Mobilité spontanée : non constatée
```

Les catégories **propriété au compte**, **instances placées** et **déblocages permanents** ne doivent jamais être fusionnées sous un compteur ambigu.

Le temps d'observation n'est affiché que lorsqu'une instrumentation autoritaire existe. Une colonne présente dans la base mais non alimentée n'est pas une preuve suffisante.

Les statistiques absurdes portent explicitement la mention **« non scientifiques »**. Elles ne prennent pas l'apparence d'une mesure géologique ou biométrique réelle.

Chargement, erreur et retry restent contenus dans le dossier sans fermer brutalement la Bio.

---

## 21. Jeter

`Jeter` reste visuellement discret dans la barre d'actions et ne devient pas rouge en permanence.

Le clic ouvre un `alertdialog` au ton sec :

> **Jeter Bernard ?**
>
> Cette opération mettra fin à la composition minérale active. Le caillou et son historique resteront archivés. Vos Lithons, acquisitions et autorisations permanentes sont conservés. Les accessoires actuellement placés seront déséquipés.

Actions :

- **Annuler** ;
- **Jeter Bernard**.

Après confirmation :

- le caillou disparaît **immédiatement** du rendu ;
- aucune animation de lancer, chute, rebond ou disparition dramatique ;
- pendant la confirmation serveur, l'écran reste sobre et indique uniquement la mise à jour du registre ;
- en cas de réponse réseau incertaine, un retry conserve la même opération idempotente ;
- après confirmation, l'état vide affiche **« Aucun caillou actuellement sous votre responsabilité. »** et le CTA **« Adopter un nouveau caillou »**.

Bio et Jeter ne peuvent pas s'ouvrir pendant Placement, Caresser, Nettoyer ou un settlement en cours.

---

""",
        "design bio discard",
    )

    replace_once(
        "docs/PLAN-CORRECTION-HARMONISATION-SOL-ET-PLACEMENTS.md",
        "> **Statut :** validé comme cible d’architecture, non exécuté.",
        "> **Statut :** exécuté par la PR #30 puis complété par la PR #31 ; architecture en production.",
        "plan status",
    )
    replace_once(
        "docs/PLAN-CORRECTION-HARMONISATION-SOL-ET-PLACEMENTS.md",
        "> **État de référence :** `main` après la correction post-10.75, SHA `c8e3c34fd96857f4a608acb0d5b4536dbad5901a`.",
        "> **État de référence actuel :** `main` après finalisation du PlacementSession, SHA `d9372f4b7af8ceaa8a67dc35476cbf1398206465`.",
        "plan current sha",
    )
    replace_once(
        "docs/PLAN-CORRECTION-HARMONISATION-SOL-ET-PLACEMENTS.md",
        "---\n\n## 1. Objectif",
        """---

## Compte rendu d'exécution

Le plan a été réalisé en deux temps afin de ne pas transformer les défauts découverts après production en rustines parallèles.

### PR #30 — refactorisation du Socle et du Placement

Merge : `659d055f77f665c161f5be4b2e219f7c47dc6cc4`.

Cette PR a réalisé le socle structurel du plan : unification du Socle, de la géométrie de Placement, du contrôleur tactile, des transitions physiques et nettoyage des chemins historiques concurrents.

### PR #31 — finalisation du PlacementSession

Merge : `d9372f4b7af8ceaa8a67dc35476cbf1398206465`.

Deux défauts UX révélés après #30 ont montré que la source de vérité multi-cibles devait être raccordée jusqu'au bout :

1. déplacer le caillou entraînait encore les accessoires parce que leurs poses monde étaient recalculées depuis le `rockPose` courant ;
2. changer de cible reconstruisait le draft depuis la pose persistée et perdait les modifications temporaires.

La correction finale implémente le contrat prévu dans ce plan :

- snapshot monde de toute la composition à l'ouverture de Placement ;
- drafts indépendants conservés pendant toute la session ;
- aucun recalcul permanent local → monde d'un accessoire non actif ;
- aucun commit serveur lors des mouvements ou changements de cible ;
- settlement global si le caillou est dirty ;
- settlement limité aux accessoires dirty si le caillou est propre ;
- aucune écriture si la session n'est pas dirty ;
- conversion monde → local uniquement à la frontière de persistance.

### Validation

- tests unitaires `PlacementSession` : indépendance rock/accessoires, round-trip de cibles et plans de settlement ;
- E2E : déplacement du caillou sans déplacement monde des accessoires, conservation des drafts lors des changements de cible, contraintes du Socle et gestes existants ;
- neuf workflows officiels verts ;
- CI `main` post-merge verte ;
- workflow temporaire d'application supprimé ;
- aucune migration Supabase nécessaire ;
- production Vercel `READY` sur le SHA exact de merge #31.

La grille d'acceptation ci-dessous est conservée comme **grille historique originale du plan**. Le présent compte rendu, le code de `main` et les validations #30/#31 constituent l'état d'exécution faisant foi.

---

## 1. Objectif""",
        "plan execution report",
    )

    print("Documentation aligned with current post-#31 state.")

elif MODE == "product":
    Path("src/features/bio").mkdir(parents=True, exist_ok=True)
    Path("src/features/bio/bioTypes.ts").write_text("""export interface RockBioSnapshot {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  caressCount: number
  cleaningCount: number
  lithonsGenerated: number
  ownedAccessoryCount: number
  permanentUnlockCount: number
  rockMovementUnlocked: boolean
}

export type LoadRockBioSnapshot = (userRockId: string) => Promise<RockBioSnapshot>
""")
    Path("src/features/bio/bioApi.ts").write_text("""import { supabase } from '../../lib/supabase/client'
import type { LoadRockBioSnapshot, RockBioSnapshot } from './bioTypes'

export class BioSnapshotError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BioSnapshotError'
  }
}

export const loadRockBioSnapshot: LoadRockBioSnapshot = async (userRockId): Promise<RockBioSnapshot> => {
  const [walletResult, progressResult, ownershipResult, unlockResult] = await Promise.all([
    supabase.from('wallets').select('balance, lifetime_earned, lifetime_spent').single(),
    supabase
      .from('rock_progress')
      .select('caress_count, cleaning_count, lithons_generated')
      .eq('user_rock_id', userRockId)
      .single(),
    supabase.from('user_accessories').select('accessory_id'),
    supabase.from('user_feature_unlocks').select('feature_id'),
  ])

  if (walletResult.error || !walletResult.data) {
    throw new BioSnapshotError('Le registre des Lithons n’a pas pu être relu.')
  }
  if (progressResult.error || !progressResult.data) {
    throw new BioSnapshotError('Les statistiques du caillou ne sont pas disponibles.')
  }
  if (ownershipResult.error) {
    throw new BioSnapshotError('Votre collection d’accessoires n’a pas pu être vérifiée.')
  }
  if (unlockResult.error) {
    throw new BioSnapshotError('Vos autorisations permanentes n’ont pas pu être vérifiées.')
  }

  const unlocks = unlockResult.data ?? []
  return {
    balance: walletResult.data.balance,
    lifetimeEarned: walletResult.data.lifetime_earned,
    lifetimeSpent: walletResult.data.lifetime_spent,
    caressCount: progressResult.data.caress_count,
    cleaningCount: progressResult.data.cleaning_count,
    lithonsGenerated: progressResult.data.lithons_generated,
    ownedAccessoryCount: (ownershipResult.data ?? []).length,
    permanentUnlockCount: unlocks.length,
    rockMovementUnlocked: unlocks.some(({ feature_id }) => feature_id === 'rock_movement'),
  }
}
""")
    Path("src/features/bio/bioRules.ts").write_text("""export function formatRockAge(adoptedAt: string, nowMs = Date.now()) {
  const adoptedMs = new Date(adoptedAt).getTime()
  const elapsedMs = Math.max(0, nowMs - adoptedMs)
  const hours = Math.floor(elapsedMs / 3_600_000)

  if (hours < 1) return 'Moins d’une heure'
  if (hours < 24) return `${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 365) return `${days} ${days === 1 ? 'jour' : 'jours'}`

  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  const yearsLabel = `${years} ${years === 1 ? 'an' : 'ans'}`
  return months > 0 ? `${yearsLabel} et ${months} mois` : yearsLabel
}

export function lithonLabel(value: number) {
  return `${value} ${value === 1 ? 'Lithon' : 'Lithons'}`
}
""")
    Path("src/features/bio/bioRules.test.ts").write_text("""import { describe, expect, it } from 'vitest'

import { formatRockAge, lithonLabel } from './bioRules'

describe('Bio rules', () => {
  it('formats a reliable age without inventing observation time', () => {
    const adopted = '2026-09-01T08:00:00.000Z'
    const now = new Date('2026-09-03T10:00:00.000Z').getTime()
    expect(formatRockAge(adopted, now)).toBe('2 jours')
  })

  it('uses the official Lithon singular and plural', () => {
    expect(lithonLabel(1)).toBe('1 Lithon')
    expect(lithonLabel(42)).toBe('42 Lithons')
  })
})
""")
    Path("src/features/bio/BioDialog.tsx").write_text("""import type { ActiveRock } from '../adoption/adoptionTypes'
import { formatRockAge, lithonLabel } from './bioRules'
import type { RockBioSnapshot } from './bioTypes'

interface BioDialogProps {
  rockName: string
  rockLabel: string
  catalogIndex: number
  activeRock: ActiveRock
  snapshot: RockBioSnapshot | null
  loading: boolean
  error: string | null
  equippedAccessoryCount: number
  onRetry: () => void
  onClose: () => void
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

function formatDate(value: string) {
  return DATE_FORMAT.format(new Date(value))
}

export function BioDialog({
  rockName,
  rockLabel,
  catalogIndex,
  activeRock,
  snapshot,
  loading,
  error,
  equippedAccessoryCount,
  onRetry,
  onClose,
}: BioDialogProps) {
  return (
    <div className="pedestal-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="pedestal-dialog bio-dialog" role="dialog" aria-modal="true" aria-labelledby="pedestal-bio-title">
        <div className="pedestal-dialog-heading">
          <div>
            <p className="eyebrow">Dossier institutionnel</p>
            <h2 id="pedestal-bio-title">{rockName}</h2>
            <p className="bio-specimen-label">{rockLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer Bio / Stats">Fermer</button>
        </div>

        {loading && !snapshot ? (
          <p className="bio-loading" role="status">Consultation des registres…</p>
        ) : error && !snapshot ? (
          <div className="bio-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRetry}>Réessayer</button>
          </div>
        ) : snapshot ? (
          <div className="bio-sections">
            {error ? (
              <div className="bio-error bio-error-inline" role="alert">
                <p>{error}</p>
                <button type="button" onClick={onRetry}>Actualiser</button>
              </div>
            ) : null}

            <section aria-labelledby="bio-identity-title">
              <h3 id="bio-identity-title">Identité</h3>
              <dl>
                <div><dt>Spécimen</dt><dd>{String(catalogIndex).padStart(2, '0')}</dd></div>
                <div><dt>Adopté le</dt><dd>{formatDate(activeRock.adoptedAt)}</dd></div>
                <div><dt>Ancienneté</dt><dd>{formatRockAge(activeRock.adoptedAt)}</dd></div>
                <div><dt>Dernière pose stabilisée</dt><dd>{activeRock.poseStabilizedAt ? formatDate(activeRock.poseStabilizedAt) : 'Non documentée'}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="bio-register-title">
              <h3 id="bio-register-title">Registre</h3>
              <dl>
                <div><dt>Caresses</dt><dd>{snapshot.caressCount}</dd></div>
                <div><dt>Nettoyages</dt><dd>{snapshot.cleaningCount}</dd></div>
                <div><dt>Dernier nettoyage</dt><dd>{activeRock.lastCleanedAt ? formatDate(activeRock.lastCleanedAt) : 'Non requis à ce jour'}</dd></div>
                <div><dt>Lithons générés par ce caillou</dt><dd>{snapshot.lithonsGenerated}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="bio-account-title">
              <h3 id="bio-account-title">Compte</h3>
              <dl>
                <div><dt>Solde actuel</dt><dd>{lithonLabel(snapshot.balance)}</dd></div>
                <div><dt>Lithons gagnés</dt><dd>{snapshot.lifetimeEarned}</dd></div>
                <div><dt>Lithons dépensés</dt><dd>{snapshot.lifetimeSpent}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="bio-composition-title">
              <h3 id="bio-composition-title">Composition et autorisations</h3>
              <dl>
                <div><dt>Types d’accessoires possédés</dt><dd>{snapshot.ownedAccessoryCount}</dd></div>
                <div><dt>Instances actuellement placées</dt><dd>{equippedAccessoryCount}</dd></div>
                <div><dt>Déblocages permanents</dt><dd>{snapshot.permanentUnlockCount}</dd></div>
                <div><dt>Permis de manutention</dt><dd>{snapshot.rockMovementUnlocked ? 'Acquis' : 'Non acquis'}</dd></div>
              </dl>
            </section>

            <section className="bio-editorial" aria-labelledby="bio-editorial-title">
              <div><h3 id="bio-editorial-title">Indicateurs éditoriaux</h3><p>Non scientifiques.</p></div>
              <dl>
                <div><dt>Mobilité spontanée</dt><dd>Non constatée</dd></div>
                <div><dt>Présence minérale</dt><dd>Conforme</dd></div>
              </dl>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  )
}
""")

    Path("src/features/discard").mkdir(parents=True, exist_ok=True)
    Path("src/features/discard/discardTypes.ts").write_text("""export interface DiscardRockInput {
  userRockId: string
  eventKey: string
}

export interface DiscardRockResult {
  userRockId: string
  discardedAt: string
}

export type DiscardRockMutation = (input: DiscardRockInput) => Promise<DiscardRockResult>
""")
    Path("src/features/discard/discardApi.ts").write_text("""import { supabase } from '../../lib/supabase/client'
import type { DiscardRockMutation } from './discardTypes'

export type DiscardRockErrorKind = 'ownership' | 'session' | 'in-progress' | 'unknown'

export class DiscardRockError extends Error {
  constructor(message: string, readonly kind: DiscardRockErrorKind, readonly retryable: boolean) {
    super(message)
    this.name = 'DiscardRockError'
  }
}

export function toDiscardRockError(error: { code?: string; message?: string }) {
  const detail = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  if (detail.includes('owned_rock_required')) return new DiscardRockError('Ce caillou n’est plus sous votre responsabilité.', 'ownership', false)
  if (detail.includes('authentication_required') || detail.includes('permission denied') || error.code === 'PGRST301') {
    return new DiscardRockError('Votre session doit être vérifiée avant cette opération.', 'session', false)
  }
  if (detail.includes('mutation_in_progress') || error.code === '40001') {
    return new DiscardRockError('La mise à jour du registre est encore en cours. La même opération peut être renvoyée.', 'in-progress', true)
  }
  return new DiscardRockError('La confirmation serveur n’est pas arrivée. La même opération peut être renvoyée sans double archivage.', 'unknown', true)
}

export const discardActiveRock: DiscardRockMutation = async ({ userRockId, eventKey }) => {
  const { data, error } = await supabase.rpc('discard_active_rock', { p_user_rock_id: userRockId, p_event_key: eventKey }).single()
  if (error) throw toDiscardRockError(error)
  if (!data) throw new DiscardRockError('Le registre n’a retourné aucune confirmation.', 'unknown', true)
  return { userRockId: data.user_rock_id, discardedAt: data.discarded_at }
}
""")
    Path("src/features/discard/discardApi.test.ts").write_text("""import { describe, expect, it } from 'vitest'
import { toDiscardRockError } from './discardApi'

describe('discard error mapping', () => {
  it('marks an uncertain response retryable so the same event key can be reused', () => {
    const error = toDiscardRockError({ message: 'network response missing' })
    expect(error.kind).toBe('unknown')
    expect(error.retryable).toBe(true)
  })
  it('does not retry an ownership rejection', () => {
    const error = toDiscardRockError({ message: 'owned_rock_required' })
    expect(error.kind).toBe('ownership')
    expect(error.retryable).toBe(false)
  })
})
""")
    Path("src/features/discard/DiscardRockDialog.tsx").write_text("""interface DiscardRockDialogProps {
  rockName: string
  onCancel: () => void
  onConfirm: () => void
}

export function DiscardRockDialog({ rockName, onCancel, onConfirm }: DiscardRockDialogProps) {
  return (
    <div className="pedestal-dialog-backdrop discard-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <section className="pedestal-dialog discard-dialog" role="alertdialog" aria-modal="true" aria-labelledby="discard-rock-title" aria-describedby="discard-rock-description">
        <p className="eyebrow">Fin de responsabilité minérale</p>
        <h2 id="discard-rock-title">Jeter {rockName} ?</h2>
        <p id="discard-rock-description">Cette opération mettra fin à la composition minérale active. Le caillou et son historique resteront archivés. Vos Lithons, acquisitions et autorisations permanentes sont conservés. Les accessoires actuellement placés seront déséquipés.</p>
        <div className="discard-actions">
          <button type="button" className="discard-cancel" onClick={onCancel}>Annuler</button>
          <button type="button" className="discard-confirm" onClick={onConfirm}>Jeter {rockName}</button>
        </div>
      </section>
    </div>
  )
}
""")

    Path("src/features/adoption/EmptyRockState.tsx").write_text("""interface EmptyRockStateProps {
  username: string
  pending?: boolean
  error?: string | null
  onRetry?: (() => void) | undefined
  onAdopt?: (() => void) | undefined
  onSignOut: () => Promise<void>
}

export function EmptyRockState({ username, pending = false, error = null, onRetry, onAdopt, onSignOut }: EmptyRockStateProps) {
  return (
    <main className="empty-rock-shell">
      <section className="empty-rock-card" aria-live="polite">
        <p className="eyebrow">{pending || error ? 'Mise à jour du registre' : 'Dossier minéral'}</p>
        <h1>Aucun caillou actuellement sous votre responsabilité.</h1>
        <p>{pending ? 'Le Socle est désormais vide. Confirmation serveur en cours.' : 'Vos Lithons, acquisitions et autorisations permanentes restent enregistrés.'}</p>
        {error ? <div className="empty-rock-error" role="alert"><p>{error}</p>{onRetry ? <button type="button" onClick={onRetry}>Réessayer la confirmation</button> : null}</div> : null}
        {!pending && !error && onAdopt ? <button type="button" className="empty-rock-primary" onClick={onAdopt}>Adopter un nouveau caillou</button> : null}
      </section>
      <footer className="empty-rock-footer"><span>{username}</span><button type="button" onClick={() => void onSignOut()}>Déconnexion</button></footer>
    </main>
  )
}
""")

    replace_once(
        "src/features/auth/authRules.ts",
        """export function resolveAuthenticatedDestination(hasActiveRock: boolean) {
  return hasActiveRock ? 'socle' : 'showroom'
}
""",
        """export type AuthenticatedDestination = 'showroom' | 'empty' | 'socle'

export function resolveAuthenticatedDestination(hasActiveRock: boolean, hasRockHistory: boolean): AuthenticatedDestination {
  if (hasActiveRock) return 'socle'
  return hasRockHistory ? 'empty' : 'showroom'
}
""",
        "auth destination",
    )
    replace_once(
        "src/features/auth/authRules.test.ts",
        """  it('routes authenticated users according to active rock ownership', () => {
    expect(resolveAuthenticatedDestination(false)).toBe('showroom')
    expect(resolveAuthenticatedDestination(true)).toBe('socle')
  })
""",
        """  it('routes authenticated users according to active rock ownership and history', () => {
    expect(resolveAuthenticatedDestination(false, false)).toBe('showroom')
    expect(resolveAuthenticatedDestination(false, true)).toBe('empty')
    expect(resolveAuthenticatedDestination(true, true)).toBe('socle')
  })
""",
        "auth destination tests",
    )

    replace_once("src/features/auth/useAuthSession.ts", "import { resolveAuthenticatedDestination } from './authRules'\n", "import { resolveAuthenticatedDestination } from './authRules'\nimport type { AuthenticatedDestination } from './authRules'\n", "auth session destination import")
    replace_once("src/features/auth/useAuthSession.ts", "    destination: 'showroom' | 'socle'\n", "    destination: AuthenticatedDestination\n", "auth session destination type")
    replace_once("src/features/auth/useAuthSession.ts", "        { data: wallet, error: walletError },\n      ] = await Promise.all([\n", "        { data: wallet, error: walletError },\n        { data: rockHistory, error: rockHistoryError },\n      ] = await Promise.all([\n", "auth session history destructure")
    replace_once(
        "src/features/auth/useAuthSession.ts",
        """        supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', session.user.id)
          .single(),
      ])

      if (profileError || !profile || rockError || walletError || !wallet) {
        throw profileError ?? rockError ?? walletError ?? new Error('Canonical session state missing')
      }
""",
        """        supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', session.user.id)
          .single(),
        supabase.from('user_rocks').select('id').eq('user_id', session.user.id).limit(1),
      ])

      if (profileError || !profile || rockError || walletError || !wallet || rockHistoryError) {
        throw profileError ?? rockError ?? walletError ?? rockHistoryError ?? new Error('Canonical session state missing')
      }
""",
        "auth session history query",
    )
    replace_once("src/features/auth/useAuthSession.ts", "        destination: resolveAuthenticatedDestination(activeRock !== null),\n", "        destination: resolveAuthenticatedDestination(activeRock !== null, (rockHistory?.length ?? 0) > 0),\n", "auth session history route")

    replace_once("src/features/auth/AuthenticatedHome.tsx", "import { useState } from 'react'\n", "import { useEffect, useState } from 'react'\n", "authenticated home useeffect")
    replace_once("src/features/auth/AuthenticatedHome.tsx", "import { NamingScreen } from '../adoption/NamingScreen'\n", "import { EmptyRockState } from '../adoption/EmptyRockState'\nimport { NamingScreen } from '../adoption/NamingScreen'\n", "authenticated home empty import")
    replace_once("src/features/auth/AuthenticatedHome.tsx", "import type { RegisterCleaningMutation } from '../cleaning/cleaningTypes'\n", "import type { RegisterCleaningMutation } from '../cleaning/cleaningTypes'\nimport type { LoadRockBioSnapshot } from '../bio/bioTypes'\nimport type { DiscardRockMutation } from '../discard/discardTypes'\nimport type { AuthenticatedDestination } from './authRules'\n", "authenticated home step11 imports")
    replace_once("src/features/auth/AuthenticatedHome.tsx", "  destination: 'showroom' | 'socle'\n", "  destination: AuthenticatedDestination\n", "authenticated home destination type")
    replace_once("src/features/auth/AuthenticatedHome.tsx", "  registerCleaningMutation?: RegisterCleaningMutation\n", "  registerCleaningMutation?: RegisterCleaningMutation\n  loadBioSnapshot?: LoadRockBioSnapshot\n  discardRockMutation?: DiscardRockMutation\n", "authenticated home step11 props")
    replace_once("src/features/auth/AuthenticatedHome.tsx", "  registerCleaningMutation,\n}: AuthenticatedHomeProps) {\n  const [namingRock, setNamingRock] = useState<RockCatalogEntry | null>(null)\n", "  registerCleaningMutation,\n  loadBioSnapshot,\n  discardRockMutation,\n}: AuthenticatedHomeProps) {\n  const [namingRock, setNamingRock] = useState<RockCatalogEntry | null>(null)\n  const [showroomRequested, setShowroomRequested] = useState(false)\n", "authenticated home destructure")
    replace_once("src/features/auth/AuthenticatedHome.tsx", "  const mutation = adoptRockMutation ?? adoptRock\n\n  if (destination === 'socle' && activeRock) {\n", "  const mutation = adoptRockMutation ?? adoptRock\n\n  useEffect(() => {\n    if (destination === 'empty') setShowroomRequested(false)\n  }, [destination])\n\n  if (destination === 'socle' && activeRock) {\n", "authenticated home empty reset")
    replace_once(
        "src/features/auth/AuthenticatedHome.tsx",
        """        registerCaressMutation={registerCaressMutation}
        registerCleaningMutation={registerCleaningMutation}
      />
    )
  }

  if (namingRock) {
""",
        """        registerCaressMutation={registerCaressMutation}
        registerCleaningMutation={registerCleaningMutation}
        loadBioSnapshot={loadBioSnapshot}
        discardRockMutation={discardRockMutation}
      />
    )
  }

  if (destination === 'empty' && !showroomRequested && !namingRock) {
    return <EmptyRockState username={username} onAdopt={() => setShowroomRequested(true)} onSignOut={onSignOut} />
  }

  if (namingRock) {
""",
        "authenticated home empty state",
    )

    replace_once("src/features/pedestal/Pedestal.tsx", "import { useReducedMotion } from '../../utils/useReducedMotion'\n", "import { useReducedMotion } from '../../utils/useReducedMotion'\nimport { BioDialog } from '../bio/BioDialog'\nimport { loadRockBioSnapshot } from '../bio/bioApi'\nimport type { LoadRockBioSnapshot, RockBioSnapshot } from '../bio/bioTypes'\n", "pedestal bio imports")
    replace_once("src/features/pedestal/Pedestal.tsx", "import type { ActiveRock } from '../adoption/adoptionTypes'\n", "import { EmptyRockState } from '../adoption/EmptyRockState'\nimport type { ActiveRock } from '../adoption/adoptionTypes'\n", "pedestal empty import")
    replace_once("src/features/pedestal/Pedestal.tsx", "import type { RegisterCleaningInput, RegisterCleaningMutation } from '../cleaning/cleaningTypes'\n", "import type { RegisterCleaningInput, RegisterCleaningMutation } from '../cleaning/cleaningTypes'\nimport { DiscardRockDialog } from '../discard/DiscardRockDialog'\nimport { DiscardRockError, discardActiveRock } from '../discard/discardApi'\nimport type { DiscardRockInput, DiscardRockMutation } from '../discard/discardTypes'\n", "pedestal discard imports")
    replace_once("src/features/pedestal/Pedestal.tsx", "  registerCleaningMutation?: RegisterCleaningMutation | undefined\n", "  registerCleaningMutation?: RegisterCleaningMutation | undefined\n  loadBioSnapshot?: LoadRockBioSnapshot | undefined\n  discardRockMutation?: DiscardRockMutation | undefined\n", "pedestal step11 props")
    replace_once("src/features/pedestal/Pedestal.tsx", "function formatDate(value: string) {\n  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))\n}\n\n", "", "pedestal remove date helper")
    replace_once(
        "src/features/pedestal/Pedestal.tsx",
        """function cleaningErrorPresentation(error: unknown) {
  if (error instanceof CleaningMutationError) {
    return { message: error.message, retryable: error.retryable, refresh: !error.retryable }
  }

  return {
    message: 'La confirmation serveur n’est pas arrivée. Le même nettoyage peut être renvoyé sans doubler la statistique.',
    retryable: true,
    refresh: false,
  }
}
""",
        """function cleaningErrorPresentation(error: unknown) {
  if (error instanceof CleaningMutationError) {
    return { message: error.message, retryable: error.retryable, refresh: !error.retryable }
  }
  return { message: 'La confirmation serveur n’est pas arrivée. Le même nettoyage peut être renvoyé sans doubler la statistique.', retryable: true, refresh: false }
}

function discardErrorPresentation(error: unknown) {
  if (error instanceof DiscardRockError) return { message: error.message, retryable: error.retryable, refresh: !error.retryable }
  return { message: 'La confirmation serveur n’est pas arrivée. La même opération peut être renvoyée sans double archivage.', retryable: true, refresh: false }
}
""",
        "pedestal discard presentation",
    )
    replace_once("src/features/pedestal/Pedestal.tsx", "  registerCaressMutation,\n  registerCleaningMutation,\n}: PedestalProps) {\n", "  registerCaressMutation,\n  registerCleaningMutation,\n  loadBioSnapshot,\n  discardRockMutation,\n}: PedestalProps) {\n", "pedestal destructure step11")
    replace_once("src/features/pedestal/Pedestal.tsx", "  const [bioOpen, setBioOpen] = useState(false)\n", "  const [bioOpen, setBioOpen] = useState(false)\n  const [bioSnapshot, setBioSnapshot] = useState<RockBioSnapshot | null>(null)\n  const [bioLoading, setBioLoading] = useState(false)\n  const [bioError, setBioError] = useState<string | null>(null)\n  const [discardOpen, setDiscardOpen] = useState(false)\n  const [discardPending, setDiscardPending] = useState(false)\n  const [discardError, setDiscardError] = useState<string | null>(null)\n  const [discardRetryInput, setDiscardRetryInput] = useState<DiscardRockInput | null>(null)\n  const [discardedVisual, setDiscardedVisual] = useState(false)\n", "pedestal step11 state")
    replace_once("src/features/pedestal/Pedestal.tsx", "  const cleaningMutation = registerCleaningMutation ?? registerCleaning\n  const rockPermit = useRockMovementPermit()\n", "  const cleaningMutation = registerCleaningMutation ?? registerCleaning\n  const bioLoader = loadBioSnapshot ?? loadRockBioSnapshot\n  const discardMutation = discardRockMutation ?? discardActiveRock\n  const rockPermit = useRockMovementPermit()\n", "pedestal step11 services")
    replace_once("src/features/pedestal/Pedestal.tsx", "} = useAccessoryPlacements(activeRock.id)\n  const adoptionDate = useMemo(() => formatDate(activeRock.adoptedAt), [activeRock.adoptedAt])\n  const lastCleaningDate = useMemo(\n    () => lastCleanedAtState ? formatDate(lastCleanedAtState) : 'Non requis à ce jour',\n    [lastCleanedAtState],\n  )\n  const dustAmount = useMemo(\n", "} = useAccessoryPlacements(activeRock.id)\n  const dustAmount = useMemo(\n", "pedestal remove old bio dates")
    replace_once("src/features/pedestal/Pedestal.tsx", "    || accessorySettling\n    || globalSettling\n    || rockPermit.pending\n", "    || accessorySettling\n    || globalSettling\n    || rockPermit.pending\n    || discardPending\n", "pedestal discard blocks mutations")

    replace_once(
        "src/features/pedestal/Pedestal.tsx",
        "const openShop = useCallback((focus: ShopFocus = 'default') => {\n",
        """  const refreshBio = useCallback(async () => {
    if (bioLoading) return
    setBioLoading(true)
    setBioError(null)
    try { setBioSnapshot(await bioLoader(activeRock.id)) }
    catch (error) { setBioError(error instanceof Error ? error.message : 'Le dossier institutionnel n’a pas pu être relu.') }
    finally { setBioLoading(false) }
  }, [activeRock.id, bioLoader, bioLoading])

  const openBio = useCallback(() => {
    if (mutationBlocked || mode !== 'orbit' || accessoryShopOpen || discardOpen) return
    setBioOpen(true)
    void refreshBio()
  }, [accessoryShopOpen, discardOpen, mode, mutationBlocked, refreshBio])

  const submitDiscard = useCallback(async (input: DiscardRockInput) => {
    if (discardPending) return
    setDiscardedVisual(true)
    setDiscardPending(true)
    setDiscardError(null)
    try {
      await discardMutation(input)
      setDiscardRetryInput(null)
      await onServerStateChanged()
    } catch (error) {
      const presentation = discardErrorPresentation(error)
      setDiscardError(presentation.message)
      setDiscardRetryInput(presentation.retryable ? input : null)
      if (presentation.refresh) {
        await onServerStateChanged()
        setDiscardedVisual(false)
      }
    } finally { setDiscardPending(false) }
  }, [discardMutation, discardPending, onServerStateChanged])

  const openDiscard = useCallback(() => {
    if (mutationBlocked || mode !== 'orbit' || accessoryShopOpen || bioOpen) return
    setDiscardError(null)
    setDiscardRetryInput(null)
    setDiscardOpen(true)
  }, [accessoryShopOpen, bioOpen, mode, mutationBlocked])

  const confirmDiscard = useCallback(() => {
    const input = { userRockId: activeRock.id, eventKey: crypto.randomUUID() }
    setDiscardOpen(false)
    setDiscardRetryInput(input)
    void submitDiscard(input)
  }, [activeRock.id, submitDiscard])

const openShop = useCallback((focus: ShopFocus = 'default') => {
""",
        "pedestal step11 callbacks",
    )

    replace_once("src/features/pedestal/Pedestal.tsx", "  return (\n    <div className={`pedestal-shell${shellModeClass}`}>\n", "  if (discardedVisual) {\n    return <EmptyRockState username={username} pending={discardPending} error={discardError} onRetry={discardRetryInput ? () => void submitDiscard(discardRetryInput) : undefined} onSignOut={onSignOut} />\n  }\n\n  return (\n    <div className={`pedestal-shell${shellModeClass}`}>\n", "pedestal immediate empty")
    replace_once("src/features/pedestal/Pedestal.tsx", "            onClick={() => setBioOpen(true)}\n            aria-label=\"Bio et statistiques\"\n", "            onClick={openBio}\n            disabled={mutationBlocked || mode !== 'orbit' || accessoryShopOpen || discardOpen}\n            aria-label=\"Bio et statistiques\"\n", "pedestal bio button")
    replace_once(
        "src/features/pedestal/Pedestal.tsx",
        """            const isShop = label === 'Boutique'
            const isActive = (isCaress && caressMode)
              || (isCleaning && cleaningMode)
              || (isShop && accessoryShopOpen)
            const disabled = isCaress
              ? mutationBlocked
              : isCleaning
                ? mutationBlocked || !cleaningAvailable
                : isShop ? mutationBlocked : true
            const ariaLabel = isCaress
""",
        """            const isShop = label === 'Boutique'
            const isDiscard = label === 'Jeter'
            const isActive = (isCaress && caressMode) || (isCleaning && cleaningMode) || (isShop && accessoryShopOpen) || (isDiscard && discardOpen)
            const disabled = isCaress
              ? mutationBlocked
              : isCleaning
                ? mutationBlocked || !cleaningAvailable
                : isShop
                  ? mutationBlocked
                  : isDiscard
                    ? mutationBlocked || mode !== 'orbit' || accessoryShopOpen || bioOpen
                    : true
            const ariaLabel = isCaress
""",
        "pedestal discard action flags",
    )
    replace_once("src/features/pedestal/Pedestal.tsx", "                : isShop\n                  ? (accessoryShopOpen ? 'Boutique ouverte' : 'Ouvrir la Boutique')\n                  : `${label} — fonctionnalité en préparation`\n", "                : isShop\n                  ? (accessoryShopOpen ? 'Boutique ouverte' : 'Ouvrir la Boutique')\n                  : isDiscard\n                    ? 'Jeter le caillou'\n                    : label\n", "pedestal discard aria")
    replace_once("src/features/pedestal/Pedestal.tsx", "                    ? () => toggleMode('cleaning')\n                    : isShop ? () => openShop('default') : undefined}\n", "                    ? () => toggleMode('cleaning')\n                    : isShop\n                      ? () => openShop('default')\n                      : isDiscard ? openDiscard : undefined}\n", "pedestal discard click")
    replace_between(
        "src/features/pedestal/Pedestal.tsx",
        "      {bioOpen ? (",
        "      {accessoryShopOpen ? (",
        """      {bioOpen ? (
        <BioDialog
          rockName={activeRock.name}
          rockLabel={rock.label}
          catalogIndex={rock.catalogIndex}
          activeRock={{ ...activeRock, lastCleanedAt: lastCleanedAtState }}
          snapshot={bioSnapshot}
          loading={bioLoading}
          error={bioError}
          equippedAccessoryCount={accessoryInstances.length}
          onRetry={() => void refreshBio()}
          onClose={() => setBioOpen(false)}
        />
      ) : null}

      {discardOpen ? <DiscardRockDialog rockName={activeRock.name} onCancel={() => setDiscardOpen(false)} onConfirm={confirmDiscard} /> : null}

""",
        "pedestal dialogs",
    )

    Path("src/styles/step11.css").write_text(""".bio-dialog { max-height: min(88dvh, 760px); overflow: auto; }
.bio-specimen-label, .bio-loading, .bio-error p, .bio-editorial p { margin: 0; color: var(--color-graphite); }
.bio-specimen-label { margin-top: 2px; font-size: .78rem; }
.bio-loading { padding: var(--space-8) 0; text-align: center; }
.bio-error { display: grid; gap: var(--space-3); margin-top: var(--space-5); padding: var(--space-4); border: 1px solid rgb(153 70 56 / 16%); border-radius: 14px; background: rgb(153 70 56 / 8%); }
.bio-error-inline { margin-top: 0; }
.bio-error button, .empty-rock-error button { justify-self: start; min-height: 42px; padding: 0 var(--space-3); border: 1px solid rgb(52 51 48 / 16%); border-radius: 999px; background: transparent; cursor: pointer; }
.bio-sections { display: grid; gap: var(--space-5); margin-top: var(--space-5); }
.bio-sections section { min-width: 0; }
.bio-sections h3 { margin: 0; color: var(--color-graphite); font-size: .72rem; font-weight: 650; letter-spacing: .11em; text-transform: uppercase; }
.bio-sections section > dl { margin-top: var(--space-2); }
.bio-editorial { padding: var(--space-4); border: 1px solid rgb(154 120 77 / 18%); border-radius: 16px; background: rgb(154 120 77 / 6%); }
.bio-editorial > div { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
.bio-editorial p { font-size: .7rem; font-style: italic; }
.discard-dialog h2 { margin: var(--space-2) 0 0; font-size: clamp(1.8rem, 8vw, 2.5rem); font-weight: 500; letter-spacing: -.03em; }
.discard-dialog > p:not(.eyebrow) { margin: var(--space-4) 0 0; color: var(--color-graphite); }
.discard-actions { display: grid; gap: var(--space-3); margin-top: var(--space-6); }
.discard-actions button { min-height: 50px; padding: 0 var(--space-4); border-radius: 14px; cursor: pointer; }
.discard-cancel { border: 1px solid rgb(52 51 48 / 18%); background: transparent; }
.discard-confirm { border: 0; color: var(--color-mineral-ivory); background: var(--color-basalt); font-weight: 600; }
.empty-rock-shell { display: flex; min-height: 100vh; min-height: 100dvh; max-width: 920px; margin: 0 auto; padding: max(var(--space-8), env(safe-area-inset-top)) max(var(--space-4), env(safe-area-inset-right)) max(var(--space-6), env(safe-area-inset-bottom)) max(var(--space-4), env(safe-area-inset-left)); flex-direction: column; justify-content: center; gap: var(--space-8); }
.empty-rock-card { display: grid; max-width: 680px; gap: var(--space-4); }
.empty-rock-card h1 { margin: 0; max-width: 15ch; font-size: clamp(2.4rem, 10vw, 5.2rem); font-weight: 500; letter-spacing: -.05em; line-height: .98; }
.empty-rock-card > p:not(.eyebrow) { margin: 0; max-width: 52ch; color: var(--color-graphite); }
.empty-rock-primary { min-height: 52px; justify-self: start; padding: 0 var(--space-5); border: 0; border-radius: 14px; color: var(--color-mineral-ivory); background: var(--color-basalt); font-weight: 600; cursor: pointer; }
.empty-rock-error { display: grid; gap: var(--space-3); max-width: 540px; padding: var(--space-4); border-radius: 14px; color: #6f2e25; background: rgb(153 70 56 / 9%); }
.empty-rock-error p { margin: 0; }
.empty-rock-footer { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding-top: var(--space-4); border-top: 1px solid rgb(52 51 48 / 12%); color: var(--color-graphite); font-size: .75rem; }
.empty-rock-footer button { min-height: 42px; padding: 0 var(--space-3); border: 1px solid rgb(52 51 48 / 16%); border-radius: 999px; background: transparent; cursor: pointer; }
@media (min-width: 700px) { .discard-actions { grid-template-columns: 1fr 1.1fr; } }
@media (max-width: 560px) { .bio-dialog { max-height: 86dvh; padding: var(--space-4); } .bio-dialog .pedestal-dialog dl > div { align-items: flex-start; } .empty-rock-shell { justify-content: flex-start; padding-top: max(18dvh, env(safe-area-inset-top)); } }
""")
    replace_once("src/main.tsx", "import './styles/rock-movement.css'\n", "import './styles/rock-movement.css'\nimport './styles/step11.css'\n", "step11 css import")

    Path("scripts/web/step11-e2e-validation.tsx").write_text("""import { StrictMode, useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthenticatedHome } from '../../src/features/auth/AuthenticatedHome'
import type { ActiveRock } from '../../src/features/adoption/adoptionTypes'
import type { LoadRockBioSnapshot } from '../../src/features/bio/bioTypes'
import { DiscardRockError } from '../../src/features/discard/discardApi'
import type { DiscardRockMutation } from '../../src/features/discard/discardTypes'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'
import '../../src/styles/caress.css'
import '../../src/styles/cleaning.css'
import '../../src/styles/accessories.css'
import '../../src/styles/accessory-placement.css'
import '../../src/styles/rock-movement.css'
import '../../src/styles/step11.css'

const INITIAL_ROCK: ActiveRock = { id: '11111111-1111-4111-8111-111111111111', specimenId: 'rock-001', name: 'Bernard', adoptedAt: '2026-08-31T08:00:00.000Z', lastCleanedAt: '2026-09-02T08:00:00.000Z', posePosition: [0, 0, 0], poseRotation: [0, 0, 0, 1], poseStabilizedAt: '2026-09-02T22:05:43.000Z' }

function Step11Fixture() {
  const [activeRock, setActiveRock] = useState<ActiveRock | null>(INITIAL_ROCK)
  const [eventKeys, setEventKeys] = useState<string[]>([])
  const serverRock = useRef<ActiveRock | null>(INITIAL_ROCK)
  const receipts = useRef(new Map<string, { userRockId: string; discardedAt: string }>())
  const loseFirstResponse = useRef(true)
  const loadBio: LoadRockBioSnapshot = useCallback(async () => ({ balance: 321, lifetimeEarned: 1450, lifetimeSpent: 1129, caressCount: 1450, cleaningCount: 7, lithonsGenerated: 1450, ownedAccessoryCount: 4, permanentUnlockCount: 1, rockMovementUnlocked: true }), [])
  const discardRock: DiscardRockMutation = useCallback(async ({ userRockId, eventKey }) => {
    setEventKeys((current) => [...current, eventKey])
    const replay = receipts.current.get(eventKey)
    if (replay) { serverRock.current = null; return replay }
    const result = { userRockId, discardedAt: '2026-09-03T09:00:00.000Z' }
    receipts.current.set(eventKey, result)
    serverRock.current = null
    if (loseFirstResponse.current) { loseFirstResponse.current = false; throw new DiscardRockError('La confirmation serveur n’est pas arrivée. La même opération peut être renvoyée sans double archivage.', 'unknown', true) }
    return result
  }, [])
  const refresh = useCallback(async () => { setActiveRock(serverRock.current) }, [])
  return <><AuthenticatedHome username="Step11" destination={activeRock ? 'socle' : 'empty'} activeRock={activeRock} economy={activeRock ? { balance: 321, caressCount: 1450, cleaningCount: 7, lithonsGenerated: 1450 } : null} loadBioSnapshot={loadBio} discardRockMutation={discardRock} onServerStateChanged={refresh} onSignOut={async () => undefined} /><output id="step11-e2e-state" hidden data-active-rock={activeRock?.name ?? ''} data-event-keys={eventKeys.join(',')} data-server-active={serverRock.current ? 'true' : 'false'} /></>
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing Step 11 E2E fixture root')
createRoot(root).render(<StrictMode><Step11Fixture /></StrictMode>)
""")
    Path("scripts/web/validate-step11-e2e.mjs").write_text("""import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
const outDir = path.join(process.cwd(), 'build', 'step11-validation')
await fs.mkdir(outDir, { recursive: true })
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] })

async function runViewport(width, height, label) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  try {
    await page.goto('http://127.0.0.1:4175/scripts/web/step11-e2e-validation.html', { waitUntil: 'networkidle0' })
    await page.waitForSelector('.pedestal-actions')
    const buttons = await page.$$('.pedestal-actions button')
    if (buttons.length !== 4) throw new Error(`${label}: expected four Socle actions`)
    if (await buttons[3].evaluate((node) => node.disabled)) throw new Error(`${label}: Jeter is still disabled`)
    await page.click('.pedestal-utility[aria-label="Bio et statistiques"]')
    await page.waitForSelector('.bio-dialog')
    const bioText = await page.$eval('.bio-dialog', (node) => node.textContent ?? '')
    for (const expected of ['Types d’accessoires possédés', 'Instances actuellement placées', 'Déblocages permanents', 'Lithons gagnés', 'Lithons dépensés', 'Non scientifiques']) if (!bioText.includes(expected)) throw new Error(`${label}: Bio missing ${expected}`)
    if (bioText.toLowerCase().includes('temps d’observation')) throw new Error(`${label}: unreliable observation time is displayed`)
    await page.click('.bio-dialog button[aria-label="Fermer Bio / Stats"]')
    await buttons[3].click()
    await page.waitForSelector('.discard-dialog')
    const discardText = await page.$eval('.discard-dialog', (node) => node.textContent ?? '')
    if (!discardText.includes('seront déséquipés')) throw new Error(`${label}: discard rule is not explicit`)
    if (!discardText.includes('Lithons') || !discardText.includes('autorisations permanentes')) throw new Error(`${label}: account preservation is not explicit`)
    await page.click('.discard-confirm')
    await page.waitForSelector('.empty-rock-shell')
    if (await page.$('.pedestal-stage')) throw new Error(`${label}: rock stage remained visible after confirmation`)
    const pendingText = await page.$eval('.empty-rock-shell', (node) => node.textContent ?? '')
    if (!pendingText.includes('Aucun caillou actuellement sous votre responsabilité.')) throw new Error(`${label}: immediate empty state missing`)
    await page.waitForFunction(() => (document.querySelector('.empty-rock-shell')?.textContent ?? '').includes('Réessayer la confirmation'))
    await page.click('.empty-rock-error button')
    await page.waitForFunction(() => (document.querySelector('.empty-rock-shell')?.textContent ?? '').includes('Adopter un nouveau caillou'))
    const state = await page.$eval('#step11-e2e-state', (node) => ({ activeRock: node.getAttribute('data-active-rock'), eventKeys: (node.getAttribute('data-event-keys') ?? '').split(',').filter(Boolean), serverActive: node.getAttribute('data-server-active') }))
    if (state.activeRock) throw new Error(`${label}: active rock resurrected after discard`)
    if (state.serverActive !== 'false') throw new Error(`${label}: server fixture still has an active rock`)
    if (state.eventKeys.length !== 2 || state.eventKeys[0] !== state.eventKeys[1]) throw new Error(`${label}: discard retry did not reuse the same event key`)
    await page.screenshot({ path: path.join(outDir, `${label}.png`), fullPage: true })
    return { label, ok: true, eventKeyReused: true }
  } finally { await page.close() }
}
try {
  const phone = await runViewport(390, 844, 'phone')
  const tablet = await runViewport(1024, 768, 'tablet')
  const report = { bioReliableSources: true, ownedVsEquippedDistinct: true, editorialStatsLabelled: true, unreliableObservationOmitted: true, discardImmediate: true, discardRetryIdempotent: true, emptyStateAfterDiscard: true, phone, tablet }
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await browser.close() }
""")
    Path("scripts/web/step11-e2e-validation.html").write_text("""<!doctype html><html lang="fr"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>CAILLOU Step 11 validation</title></head><body><div id="root"></div><script type="module" src="/scripts/web/step11-e2e-validation.tsx"></script></body></html>
""")
    Path(".github/workflows/step11-validation.yml").write_text("""name: Validate Bio Stats and discard

on:
  workflow_dispatch:
  pull_request:
    branches: [main]
    paths:
      - 'src/app/**'
      - 'src/features/adoption/**'
      - 'src/features/auth/**'
      - 'src/features/bio/**'
      - 'src/features/discard/**'
      - 'src/features/pedestal/**'
      - 'src/styles/adoption.css'
      - 'src/styles/step11.css'
      - 'scripts/web/step11-e2e-validation.*'
      - 'scripts/web/validate-step11-e2e.mjs'
      - '.github/workflows/step11-validation.yml'
permissions:
  contents: read
concurrency:
  group: step11-validation-${{ github.ref }}
  cancel-in-progress: true
jobs:
  bio-discard:
    name: Bio / Stats → Jeter → état vide
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Use Node 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install dependencies
        run: npm install --no-audit --no-fund
      - name: Install Chrome validation driver
        run: npm install --no-save --package-lock=false --no-audit --no-fund puppeteer-core@24.16.0
      - name: Validate Bio and discard on phone and tablet
        shell: bash
        run: |
          set -euo pipefail
          npm exec -- vite --host 127.0.0.1 --port 4175 > /tmp/caillou-step11-vite.log 2>&1 &
          server_pid=$!
          trap 'kill $server_pid || true' EXIT
          sleep 3
          google-chrome --version
          node scripts/web/validate-step11-e2e.mjs
      - name: Upload Step 11 diagnostics
        if: ${{ always() }}
        uses: actions/upload-artifact@v4
        with:
          name: caillou-step11-validation-${{ github.run_id }}
          path: build/step11-validation/
          if-no-files-found: warn
          retention-days: 14
""")
    print("Step 11 product patch applied.")
