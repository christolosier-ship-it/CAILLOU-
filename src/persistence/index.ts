/**
 * Les adaptateurs de persistance seront introduits par les étapes dédiées.
 * Aucun backend n'est volontairement initialisé dans la fondation frontend.
 */
export type PersistenceBoundary = {
  readonly configured: false
}
