export function formatRockAge(adoptedAt: string, nowMs = Date.now()) {
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
