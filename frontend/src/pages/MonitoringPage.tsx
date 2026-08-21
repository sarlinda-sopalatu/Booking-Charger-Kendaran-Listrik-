import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { monitoringApi } from '../services/api'

export default function MonitoringPage() {
  const { chargerId } = useParams<{ chargerId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['charger-monitoring', chargerId],
    queryFn: () => monitoringApi.getCharger(chargerId!).then(r => r.data)
  })

  if (isLoading || !data) {
    return <div className="card animate-pulse h-40" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring Charger</h1>
          <p className="text-sm text-gray-500 mt-1">{chargerId}</p>
        </div>
        <Link to="/stations" className="btn-secondary">Kembali</Link>
      </div>

      <div className="card space-y-3">
        <Row label="Status" value={data.status || 'UNKNOWN'} />
        <Row label="Daya" value={data.power_kw ? `${data.power_kw} kW` : '—'} />
        <Row label="Voltase" value={data.voltage_v ? `${data.voltage_v} V` : '—'} />
      </div>
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
