import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { stationApi } from '../services/api'
import { MapPin, Zap, Search, Filter, ChevronRight } from 'lucide-react'

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

  const { data, isLoading } = useQuery({
    queryKey: ['stations', connector],
    queryFn:  () => stationApi.getAll({
      connector_type: connector !== 'ALL' ? connector : undefined
    }).then(r => r.data)
  })

  const stations = (data?.stations || []).filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stasiun Pengisian</h1>
        <p className="text-gray-500 text-sm mt-1">Temukan stasiun pengisian daya kendaraan listrik terdekat</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Cari nama atau lokasi stasiun..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {CONNECTOR_TYPES.map(type => (
            <button key={type}
              onClick={() => setConnector(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                connector === type
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
              }`}
            >
              {CONNECTOR_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

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
      ) : stations.length === 0 ? (
        <div className="card text-center py-12">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Tidak ada stasiun ditemukan</p>
          <p className="text-gray-400 text-sm mt-1">Coba ubah filter pencarian</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station: any) => (
            <Link key={station.id} to={`/stations/${station.id}`} className="card-hover">
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
                <span>{station.chargers?.length || 0} charger</span>
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
