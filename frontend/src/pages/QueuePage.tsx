import { useQuery } from '@tanstack/react-query'
import { queueApi } from '../services/api'

export default function QueuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['queue'],
    queryFn: () => queueApi.getMyPosition().then(r => r.data)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Antrian</h1>
        <p className="text-sm text-gray-500 mt-1">Status antrean Anda saat ini.</p>
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-32" />
      ) : (
        <div className="card">
          <p className="text-sm text-gray-500">Posisi saat ini</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data?.position ?? '—'}</p>
          <p className="text-sm text-gray-600 mt-2">{data?.message || 'Belum masuk antrian.'}</p>
        </div>
      )}
    </div>
  )
}
