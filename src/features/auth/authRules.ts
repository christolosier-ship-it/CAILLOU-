export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 24
export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128

const USERNAME_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N} ._-]*[\p{L}\p{N}])?$/u

export function normalizeUsername(raw: string) {
  const display = raw.trim().replace(/\s+/gu, ' ')
  return {
    display,
    normalized: display.toLocaleLowerCase('fr-FR'),
  }
}

export function validateUsername(raw: string) {
  const { display } = normalizeUsername(raw)
  const length = [...display].length

  if (length < USERNAME_MIN_LENGTH || length > USERNAME_MAX_LENGTH) {
    return `Entre ${USERNAME_MIN_LENGTH} et ${USERNAME_MAX_LENGTH} caractères.`
  }

  if (!USERNAME_PATTERN.test(display)) {
    return 'Lettres, chiffres, espaces, point, tiret et underscore uniquement.'
  }

  return null
}

export function validatePassword(password: string) {
  const length = [...password].length
  if (length < PASSWORD_MIN_LENGTH) return `Au moins ${PASSWORD_MIN_LENGTH} caractères.`
  if (length > PASSWORD_MAX_LENGTH) return 'Mot de passe trop long.'
  return null
}

export function resolveAuthenticatedDestination(hasActiveRock: boolean) {
  return hasActiveRock ? 'socle' : 'showroom'
}
