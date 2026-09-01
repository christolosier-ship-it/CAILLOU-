export type RockId = `rock-${string}`

export interface RockCatalogEntry {
  id: RockId
  catalogIndex: number
  label: string
  modelPath: string
  previewPath: string
  description: string
}

const ROCK_DESCRIPTIONS = [
  'Silhouette large et relativement basse, avec une présence horizontale marquée. L’ensemble donne une impression de stabilité immédiate et ne présente aucun signe documenté d’initiative locomotrice.',
  'Volume resserré dans sa largeur et plus affirmé dans sa hauteur apparente. La répartition générale reste compacte, avec une aptitude très satisfaisante à occuper exactement l’emplacement qui lui est attribué.',
  'Spécimen aux proportions équilibrées, dont le volume visuel se développe de façon nette sur les trois axes. Son profil irrégulier demeure compatible avec une station immobile de longue durée.',
  'Forme ample et relativement volumineuse, présentant une silhouette presque aussi développée en largeur qu’en longueur. La stabilité apparente est élevée et aucun déplacement spontané n’a été constaté.',
  'Silhouette nettement étirée, accompagnée d’un profil vertical contenu. Cette géométrie favorise une présence discrètement allongée et une conformité remarquable aux usages statiques.',
  'Corps compact, légèrement plus étroit que long, avec un relief vertical modéré. L’ensemble paraît correctement assis et ne manifeste aucune ambition particulière en matière de mobilité.',
  'Silhouette étroite et allongée, caractérisée par une emprise latérale réduite. Malgré cette économie de largeur, la présence reste parfaitement lisible et durablement stationnaire.',
  'Proportions intermédiaires, ni franchement plates ni particulièrement massives. Le spécimen présente un équilibre visuel sérieux et une capacité constante à demeurer disponible sans sollicitation.',
  'Forme large et peu élevée, à dominante horizontale très nette. Son centre visuel bas lui confère une impression de stabilité convaincante, sans événement cinétique notable à signaler.',
  'Spécimen plus volumique, avec une hauteur apparente importante au regard de sa largeur. Cette densité de silhouette produit une présence soutenue tout en restant strictement compatible avec l’immobilité.',
  'Volume particulièrement plein et homogène dans ses proportions générales. La silhouette donne une impression de compacité institutionnellement rassurante et aucun comportement autonome n’a été observé.',
  'Forme ample et profonde, présentant peu d’écart entre ses dimensions principales. Le résultat est une présence visuelle substantielle, stable et entièrement dépourvue d’urgence opérationnelle.',
  'Silhouette presque carrée dans son emprise principale, complétée par un relief vertical bien présent. L’ensemble conserve une lecture compacte et une disposition naturelle à ne rien entreprendre.',
  'Spécimen étroit, plus long que large, avec un relief vertical modéré. Sa silhouette affirme une direction principale claire tout en maintenant un niveau de stabilité apparent très convenable.',
  'Forme large et basse, aux proportions franchement horizontales. La présence qui en résulte est calme, posée et particulièrement compétente dans l’exercice prolongé de l’absence de déplacement.',
  'Silhouette ample avec un relief vertical contenu, donnant au spécimen une assise visuelle basse. Aucun mouvement spontané ni tentative de réorientation administrative n’a été relevé.',
  'Corps étroit mais relativement profond, offrant une silhouette plus verticale que les spécimens les plus plats du catalogue. Sa présence reste compacte et son activité motrice demeure nulle à l’observation.',
  'Proportions équilibrées avec une largeur généreuse et un relief vertical modéré. Le spécimen occupe son volume avec sérieux et conserve une stabilité apparente constante sous observation normale.',
  'Silhouette large, légèrement resserrée sur un axe et dotée d’un relief bien perceptible. L’ensemble reste visuellement compact, stable et sans indication de déplacement volontaire.',
  'Forme très ample dans son emprise principale, associée à un relief vertical soutenu. Cette combinaison lui confère une présence dense et parfaitement adaptée à une carrière essentiellement stationnaire.',
] as const

export const ROCK_CATALOG: readonly RockCatalogEntry[] = Array.from({ length: 20 }, (_, offset) => {
  const catalogIndex = offset + 1
  const suffix = String(catalogIndex).padStart(3, '0')
  const labelIndex = String(catalogIndex).padStart(2, '0')
  const id = `rock-${suffix}` as RockId

  return {
    id,
    catalogIndex,
    label: `Spécimen ${labelIndex}`,
    modelPath: `/assets/rocks/${id}/model.glb`,
    previewPath: `/assets/rock-previews/${id}.png`,
    description: ROCK_DESCRIPTIONS[offset] ?? 'Spécimen minéral actuellement sous observation.',
  }
})

export function getRockCatalogEntry(catalogIndex: number) {
  const entry = ROCK_CATALOG[catalogIndex - 1]
  if (!entry) throw new Error(`Unknown rock catalog index: ${catalogIndex}`)
  return entry
}

export function getRelativeRockIndex(currentIndex: number, delta: number) {
  const catalogLength = ROCK_CATALOG.length
  return ((currentIndex + delta) % catalogLength + catalogLength) % catalogLength
}
