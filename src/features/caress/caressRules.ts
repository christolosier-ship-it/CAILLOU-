export const CARESS_MIN_DURATION_MS = 220
export const CARESS_MIN_PATH_PX = 56
export const CARESS_MIN_DIRECT_PX = 28
export const CARESS_MIN_SAMPLES = 4
export const CARESS_CLIENT_COOLDOWN_MS = 550

export interface CaressMetrics {
  durationMs: number
  pathLengthPx: number
  directDistancePx: number
  sampleCount: number
}

export function isValidCaress(metrics: CaressMetrics) {
  return metrics.durationMs >= CARESS_MIN_DURATION_MS
    && metrics.pathLengthPx >= CARESS_MIN_PATH_PX
    && metrics.directDistancePx >= CARESS_MIN_DIRECT_PX
    && metrics.sampleCount >= CARESS_MIN_SAMPLES
}
