import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { stationApi } from '../services/api'
import { useUiConfigStore } from '../store/uiConfigStore'
import { MapPin, Search, ChevronRight, Zap, SlidersHorizontal } from 'lucide-react'

const CONNECTOR_TYPES = ['ALL', 'AC_TYPE2', 'DC_CCS2', 'DC_CHAdeMO', 'DC_GB_T']
const CONNECTOR_LABELS: Record<string, string> = {
  ALL: 'Semua', AC_TYPE2: 'AC Type 2', DC_CCS2: 'DC CCS2', DC_CHAdeMO: 'DC CHAdeMO', DC_GB_T: 'DC GB/T'
}

function ChargerBadge({ type, power }: { type: string; power: number }) {
  const colors: Record<string, string> = {
    AC_TYPE2: 'badge-blue', DC_CCS2: 'badge-green', DC_CHAdeMO: 'badge-yellow', DC_GB_T: 'badge-gray'
  }
  return (
    <span className={colors[type] || 'badge-gray'}>
      {CONNECTOR_LABELS[type] || type} · {power}kW
    </span>
  )
}

export default function StationsPage() {
  const [search, setSearch] = useState('')
  const [connector, setConnector] = useState('ALL')
  const uiConfig = useUiConfigStore((s) => s.config)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['stations', connector],
    queryFn:  () => stationApi.getAll({
      connector_type: connector !== 'ALL' ? connector : undefined
    }).then(r => r.data),
    retry: 1
  })

  const stations = (data?.stations || []).filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  )

  const totalChargers = stations.reduce((acc: number, station: any) => acc + (station.chargers?.length || 0), 0)
  const activeStations = stations.filter((s: any) => s.status === 'ACTIVE').length

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden">
        <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl" />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/80 font-semibold">Navigator</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{uiConfig.stationPageTitle}</h1>
            <p className="text-slate-600 text-sm mt-1">Temukan lokasi charger, cek tipe konektor, dan pilih slot terbaik.</p>
          </div>
          {uiConfig.showStationSummaryCards && (
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
                <p className="text-[11px] text-emerald-700 font-medium">Stasiun Aktif</p>
                <p className="text-xl font-bold text-emerald-800">{activeStations}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2">
                <p className="text-[11px] text-blue-700 font-medium">Total Charger</p>
                <p className="text-xl font-bold text-blue-800">{totalChargers}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      {uiConfig.showStationFilterControls && (
        <div className="card flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Cari nama atau lokasi stasiun..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 mr-1">
              <SlidersHorizontal size={13} /> Filter
            </span>
            {CONNECTOR_TYPES.map(type => (
              <button key={type}
                onClick={() => setConnector(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  connector === type
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-green-500 shadow-sm'
                    : 'bg-white/90 text-gray-600 border-gray-200 hover:border-green-300 hover:bg-emerald-50'
                }`}
              >
                {CONNECTOR_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-4" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded-full w-20" />
                <div className="h-6 bg-gray-200 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="card text-center py-12">
          <MapPin className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-red-600 font-medium">Gagal memuat data stasiun</p>
          <p className="text-gray-500 text-sm mt-1">
            {error instanceof Error ? error.message : 'Periksa koneksi backend (api-gateway/station-service) lalu coba lagi.'}
          </p>
        </div>
      ) : stations.length === 0 ? (
        <div className="card text-center py-12">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Tidak ada stasiun ditemukan</p>
          <p className="text-gray-400 text-sm mt-1">Coba ubah filter pencarian</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station: any) => (
            <Link key={station.id} to={`/stations/${station.id}`} className="card-hover border-l-4 border-l-emerald-400/70">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{station.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                    <MapPin size={11} className="mt-0.5 flex-shrink-0" />
                    {station.address}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 ${
                  station.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {station.status === 'ACTIVE' ? 'Aktif' : station.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {station.chargers?.map((c: any) => (
                  <ChargerBadge key={c.id} type={c.connector_type} power={c.max_power_kw} />
                ))}
                {(!station.chargers || station.chargers.length === 0) && (
                  <span className="badge-gray">Tidak ada charger</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><Zap size={12} /> {station.chargers?.length || 0} charger</span>
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  Lihat slot <ChevronRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
