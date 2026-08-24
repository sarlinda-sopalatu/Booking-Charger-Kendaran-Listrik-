import { ConnectorType, getOfflinePricePerKwh } from './offlinePricing'

type Station = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  status: 'ACTIVE' | 'MAINTENANCE' | 'CLOSED'
  chargers: Array<{
    id: string
    station_id: string
    connector_type: 'AC_TYPE2' | 'DC_CCS2' | 'DC_CHAdeMO' | 'DC_GB_T'
    max_power_kw: number
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'FAULTED' | 'OFFLINE'
  }>
}

const baseStations: Station[] = [
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000001',
    name: 'SPKLU PLN Monas',
    address: 'Jl. Medan Merdeka Barat, Gambir, Jakarta Pusat, DKI Jakarta',
    latitude: -6.1754,
    longitude: 106.8272,
    status: 'ACTIVE',
    chargers: [
      {
        id: 'b1b2c3d4-0002-0001-0001-000000000001',
        station_id: 'a1b2c3d4-0001-0001-0001-000000000001',
        connector_type: 'AC_TYPE2',
        max_power_kw: 22,
        status: 'AVAILABLE'
      },
      {
        id: 'b1b2c3d4-0002-0001-0001-000000000002',
        station_id: 'a1b2c3d4-0001-0001-0001-000000000001',
        connector_type: 'DC_CCS2',
        max_power_kw: 50,
        status: 'AVAILABLE'
      }
    ]
  },
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000002',
    name: 'SPKLU Shell Kuningan',
    address: 'Jl. HR Rasuna Said Kav. 5, Kuningan, Jakarta Selatan',
    latitude: -6.2088,
    longitude: 106.8306,
    status: 'ACTIVE',
    chargers: [
      {
        id: 'b1b2c3d4-0002-0001-0001-000000000003',
        station_id: 'a1b2c3d4-0001-0001-0001-000000000002',
        connector_type: 'AC_TYPE2',
        max_power_kw: 22,
        status: 'AVAILABLE'
      },
      {
        id: 'b1b2c3d4-0002-0001-0001-000000000004',
        station_id: 'a1b2c3d4-0001-0001-0001-000000000002',
        connector_type: 'DC_CCS2',
        max_power_kw: 50,
        status: 'AVAILABLE'
      }
    ]
  },
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000003',
    name: 'SPKLU BPJT Tol Cikampek',
    address: 'Rest Area KM 57 Tol Jakarta-Cikampek, Karawang, Jawa Barat',
    latitude: -6.3521,
    longitude: 107.1432,
    status: 'ACTIVE',
    chargers: [
      {
        id: 'b1b2c3d4-0002-0001-0001-000000000005',
        station_id: 'a1b2c3d4-0001-0001-0001-000000000003',
        connector_type: 'DC_CCS2',
        max_power_kw: 150,
        status: 'AVAILABLE'
      }
    ]
  }
]

export function getFallbackStations(connectorType?: string) {
  if (!connectorType) {
    return baseStations
  }

  return baseStations
    .map((station) => ({
      ...station,
      chargers: station.chargers.filter((c) => c.connector_type === connectorType)
    }))
    .filter((station) => station.chargers.length > 0)
}

export function getFallbackStationById(id: string) {
  return baseStations.find((s) => s.id === id) || null
}

function buildSlotsForDate(chargerId: string, slotDate: string, connectorType: ConnectorType) {
  const morningPrice = getOfflinePricePerKwh(connectorType, '08:00:00')
  const daytimePrice = getOfflinePricePerKwh(connectorType, '10:00:00')
  const eveningPrice = getOfflinePricePerKwh(connectorType, '14:00:00')

  return [
    {
      id: `${chargerId}-${slotDate}-0800`,
      charger_id: chargerId,
      slot_date: slotDate,
      start_time: '08:00:00',
      end_time: '10:00:00',
      status: 'AVAILABLE',
      price_per_kwh: `${morningPrice}.00`
    },
    {
      id: `${chargerId}-${slotDate}-1000`,
      charger_id: chargerId,
      slot_date: slotDate,
      start_time: '10:00:00',
      end_time: '12:00:00',
      status: 'AVAILABLE',
      price_per_kwh: `${daytimePrice}.00`
    },
    {
      id: `${chargerId}-${slotDate}-1400`,
      charger_id: chargerId,
      slot_date: slotDate,
      start_time: '14:00:00',
      end_time: '16:00:00',
      status: 'AVAILABLE',
      price_per_kwh: `${eveningPrice}.00`
    }
  ]
}

export function getFallbackSlots(stationId: string, slotDate: string, connectorType?: string) {
  const station = getFallbackStationById(stationId)
  if (!station) {
    return { date: slotDate, station_id: stationId, chargers: [] }
  }

  const chargers = station.chargers
    .filter((c) => !connectorType || c.connector_type === connectorType)
    .map((c) => ({
      ...c,
      slots: buildSlotsForDate(c.id, slotDate, c.connector_type as ConnectorType)
    }))

  return {
    date: slotDate,
    station_id: stationId,
    chargers
  }
}
