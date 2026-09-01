export const ROCK_NAME_MIN_LENGTH = 1
export const ROCK_NAME_MAX_LENGTH = 32

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u

export function normalizeRockName(raw: string) {
  return raw.trim().replace(/\s+/gu, ' ')
}

export function validateRockName(raw: string) {
  if (CONTROL_CHARACTER_PATTERN.test(raw)) {
    return 'Le nom contient un caractère non autorisé.'
  }

  const normalized = normalizeRockName(raw)
  const length = [...normalized].length

  if (length < ROCK_NAME_MIN_LENGTH) return 'Donnez un nom à votre caillou.'
  if (length > ROCK_NAME_MAX_LENGTH) return `Maximum ${ROCK_NAME_MAX_LENGTH} caractères.`

  return null
}
