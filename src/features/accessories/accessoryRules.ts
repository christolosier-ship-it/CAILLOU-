export type PurchaseAvailability =
  | { allowed: true; label: 'Acheter' }
  | { allowed: false; label: 'Acquis' | 'Solde insuffisant' | 'Indisponible' }

export function formatLithons(value: number) {
  return `${value} ${value === 1 ? 'Lithon' : 'Lithons'}`
}

export function getPurchaseAvailability({
  balance,
  priceLithons,
  purchasedAt,
  pending,
}: {
  balance: number
  priceLithons: number
  purchasedAt: string | null
  pending: boolean
}): PurchaseAvailability {
  if (purchasedAt) return { allowed: false, label: 'Acquis' }
  if (pending) return { allowed: false, label: 'Indisponible' }
  if (balance < priceLithons) return { allowed: false, label: 'Solde insuffisant' }
  return { allowed: true, label: 'Acheter' }
}
