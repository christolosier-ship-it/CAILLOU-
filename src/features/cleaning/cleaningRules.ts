export const DUST_VISIBLE_AFTER_MS = 12 * 60 * 60 * 1000
export const DUST_FULL_AFTER_MS = 14 * 24 * 60 * 60 * 1000
export const DUST_VISIBLE_THRESHOLD = 0.02

export const CLEANING_MIN_DURATION_MS = 320
export const CLEANING_MIN_PATH_LENGTH_PX = 80
export const CLEANING_MIN_SPAN_PX = 30
export const CLEANING_MIN_SAMPLE_COUNT = 6

export interface CleaningMetrics {
  durationMs: number
  pathLengthPx: number
  spanPx: number
  sampleCount: number
}

export function getDustAmount(
  lastCleanedAt: string | null,
  adoptedAt: string,
  nowMs: number = Date.now(),
) {
  const baselineMs = new Date(lastCleanedAt ?? adoptedAt).getTime()
  if (!Number.isFinite(baselineMs)) return 0

  const ageMs = Math.max(0, nowMs - baselineMs)
  if (ageMs <= DUST_VISIBLE_AFTER_MS) return 0

  const accumulationWindow = DUST_FULL_AFTER_MS - DUST_VISIBLE_AFTER_MS
  return Math.min(1, (ageMs - DUST_VISIBLE_AFTER_MS) / accumulationWindow)
}

export function hasVisibleDust(amount: number) {
  return amount >= DUST_VISIBLE_THRESHOLD
}

export function isValidCleaning(metrics: CleaningMetrics) {
  return metrics.durationMs >= CLEANING_MIN_DURATION_MS
    && metrics.pathLengthPx >= CLEANING_MIN_PATH_LENGTH_PX
    && metrics.spanPx >= CLEANING_MIN_SPAN_PX
    && metrics.sampleCount >= CLEANING_MIN_SAMPLE_COUNT
}
