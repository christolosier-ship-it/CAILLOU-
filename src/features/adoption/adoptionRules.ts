export const ROCK_NAME_MIN_LENGTH = 1
export const ROCK_NAME_MAX_LENGTH = 32

function containsControlCharacter(value: string) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159))
  })
}

export function normalizeRockName(raw: string) {
  return raw.trim().replace(/\s+/gu, ' ')
}

export function validateRockName(raw: string) {
  if (containsControlCharacter(raw)) {
    return 'Le nom contient un caractère non autorisé.'
  }

  const normalized = normalizeRockName(raw)
  const length = [...normalized].length

  if (length < ROCK_NAME_MIN_LENGTH) return 'Donnez un nom à votre caillou.'
  if (length > ROCK_NAME_MAX_LENGTH) return `Maximum ${ROCK_NAME_MAX_LENGTH} caractères.`

  return null
}
