import type { ActiveRock } from '../features/adoption/adoptionTypes'
import type { EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import type { RockEconomySnapshot } from '../features/caress/caressTypes'
import type { RockMovementPermitSnapshot } from '../features/rockMovement/rockMovementTypes'
import type { AuthenticatedDestination } from '../features/auth/authRules'

const DB_NAME = 'caillou-resilience'
const DB_VERSION = 1
const STORE_NAME = 'state'
const FALLBACK_PREFIX = 'caillou.resilience.'

export interface CachedSessionSnapshot {
  userId: string
  username: string
  destination: AuthenticatedDestination
  activeRock: ActiveRock | null
  economy: RockEconomySnapshot | null
  savedAt: string
}

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

function fallbackKey(key: string) {
  return `${FALLBACK_PREFIX}${key}`
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'))
  })
}

export async function putResilienceValue<T>(key: string, value: T) {
  if (!canUseIndexedDb()) {
    try {
      localStorage.setItem(fallbackKey(key), JSON.stringify(value))
    } catch {
      // A local cache is an optimization only.
    }
    return
  }

  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(value, key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'))
    })
    db.close()
  } catch {
    try {
      localStorage.setItem(fallbackKey(key), JSON.stringify(value))
    } catch {
      // A local cache is an optimization only.
    }
  }
}

export async function getResilienceValue<T>(key: string): Promise<T | null> {
  if (!canUseIndexedDb()) {
    try {
      const raw = localStorage.getItem(fallbackKey(key))
      return raw ? JSON.parse(raw) as T : null
    } catch {
      return null
    }
  }

  try {
    const db = await openDatabase()
    const value = await new Promise<T | null>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'))
    })
    db.close()
    return value
  } catch {
    try {
      const raw = localStorage.getItem(fallbackKey(key))
      return raw ? JSON.parse(raw) as T : null
    } catch {
      return null
    }
  }
}

export async function deleteResilienceValue(key: string) {
  try {
    localStorage.removeItem(fallbackKey(key))
  } catch {
    // Ignore unavailable fallback storage.
  }
  if (!canUseIndexedDb()) return

  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB delete failed'))
    })
    db.close()
  } catch {
    // A stale cache is never authoritative.
  }
}

export function writeCachedSession(snapshot: Omit<CachedSessionSnapshot, 'savedAt'>) {
  return putResilienceValue(`session:${snapshot.userId}`, {
    ...snapshot,
    savedAt: new Date().toISOString(),
  } satisfies CachedSessionSnapshot)
}

export function readCachedSession(userId: string) {
  return getResilienceValue<CachedSessionSnapshot>(`session:${userId}`)
}

export function writeCachedAccessories(userRockId: string, instances: EquippedAccessoryInstance[]) {
  return putResilienceValue(`accessories:${userRockId}`, instances)
}

export function readCachedAccessories(userRockId: string) {
  return getResilienceValue<EquippedAccessoryInstance[]>(`accessories:${userRockId}`)
}

export function permitCacheKey(userId: string, userRockId: string) {
  return `permit:${userId}:${userRockId}`
}

export async function writeCachedPermit(
  userId: string,
  userRockId: string,
  permit: RockMovementPermitSnapshot,
) {
  // The V1 account-scoped cache must never be interpreted as a V2 rock entitlement.
  await deleteResilienceValue(`permit:${userId}`)
  await putResilienceValue(permitCacheKey(userId, userRockId), permit)
}

export function readCachedPermit(userId: string, userRockId: string) {
  return getResilienceValue<RockMovementPermitSnapshot>(permitCacheKey(userId, userRockId))
}

export async function clearResilienceState() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(FALLBACK_PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    // Ignore unavailable fallback storage.
  }

  if (!canUseIndexedDb()) return
  try {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  } catch {
    // The server remains authoritative even if local cleanup is delayed.
  }
}
