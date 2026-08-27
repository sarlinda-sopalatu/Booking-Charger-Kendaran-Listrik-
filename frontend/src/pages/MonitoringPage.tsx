import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { monitoringApi } from '../services/api'

export default function MonitoringPage() {
  const { chargerId } = useParams<{ chargerId: string }>()
  const [searchParams] = useSearchParams()
  const stationName   = searchParams.get('station') || null
  const chargerType   = searchParams.get('type')    || null

  const { data, isLoading, isError } = useQuery({
    queryKey: ['charger-monitoring', chargerId],
    queryFn: () => monitoringApi.getCharger(chargerId!).then(r => r.data),
    refetchInterval: 10000,
    retry: 1,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring Charger</h1>
          {stationName ? (
            <p className="text-sm text-gray-500 mt-0.5">
              {stationName}{chargerType ? ` · ${chargerType}` : ''}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Charger aktif Anda</p>
          )}
        </div>
        <Link to="/dashboard" className="btn-secondary">Kembali</Link>
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-40" />
      ) : isError || !data ? (
        <div className="card text-center py-10 space-y-2">
          <p className="text-gray-500 font-medium">Data monitoring belum tersedia</p>
          <p className="text-xs text-gray-400">
            Data akan muncul saat charger mulai digunakan (status CHARGING).
          </p>
        </div>
      ) : (
        <div className="card space-y-3">
          <Row label="Status"   value={data.status    || 'UNKNOWN'} />
          <Row label="Daya"     value={data.power_kw   ? `${data.power_kw} kW`   : '—'} />
          <Row label="Voltase"  value={data.voltage_v  ? `${data.voltage_v} V`   : '—'} />
          <Row label="Arus"     value={data.current_a  ? `${data.current_a} A`   : '—'} />
          <Row label="Energi"   value={data.energy_kwh ? `${data.energy_kwh} kWh`: '—'} />
          {data.timestamp && (
            <p className="text-xs text-gray-400 pt-1">
              Update terakhir: {new Date(data.timestamp).toLocaleTimeString('id-ID')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}
