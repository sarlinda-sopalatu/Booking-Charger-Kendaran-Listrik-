export type ConnectorType = 'AC_TYPE2' | 'DC_CCS2' | 'DC_CHAdeMO' | 'DC_GB_T'

export interface OfflinePricingConfig {
  AC_TYPE2: { morning: number; daytime: number; evening: number }
  DC_CCS2: { morning: number; daytime: number; evening: number }
  DC_CHAdeMO: { morning: number; daytime: number; evening: number }
  DC_GB_T: { morning: number; daytime: number; evening: number }
}

const OFFLINE_PRICING_KEY = 'ev-offline-pricing'

export const defaultOfflinePricing: OfflinePricingConfig = {
  AC_TYPE2: { morning: 2500, daytime: 3000, evening: 3500 },
  DC_CCS2: { morning: 3000, daytime: 3500, evening: 4000 },
  DC_CHAdeMO: { morning: 3200, daytime: 3700, evening: 4200 },
  DC_GB_T: { morning: 3100, daytime: 3600, evening: 4100 }
}

function isValidConfig(input: any): input is OfflinePricingConfig {
  if (!input || typeof input !== 'object') return false
  const keys: ConnectorType[] = ['AC_TYPE2', 'DC_CCS2', 'DC_CHAdeMO', 'DC_GB_T']
  return keys.every((k) => {
    const row = input[k]
    return row && typeof row.morning === 'number' && typeof row.daytime === 'number' && typeof row.evening === 'number'
  })
}

export function getOfflinePricingConfig(): OfflinePricingConfig {
  try {
    const raw = window.localStorage.getItem(OFFLINE_PRICING_KEY)
    if (!raw) return defaultOfflinePricing
    const parsed = JSON.parse(raw)
    if (isValidConfig(parsed)) return parsed
    return defaultOfflinePricing
  } catch {
    return defaultOfflinePricing
  }
}

export function setOfflinePricingConfig(config: OfflinePricingConfig) {
  window.localStorage.setItem(OFFLINE_PRICING_KEY, JSON.stringify(config))
}

function getTimeBand(startTime: string): 'morning' | 'daytime' | 'evening' {
  if (startTime.startsWith('08:')) return 'morning'
  if (startTime.startsWith('10:')) return 'daytime'
  return 'evening'
}

export function getOfflinePricePerKwh(connectorType: ConnectorType, startTime: string): number {
  const config = getOfflinePricingConfig()
  const band = getTimeBand(startTime)
  return config[connectorType][band]
}
