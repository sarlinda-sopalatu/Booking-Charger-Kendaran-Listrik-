import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { bookingApi } from '../services/api'

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.getById(id!).then(r => r.data)
  })

  if (isLoading || !data) {
    return <div className="card animate-pulse h-40" />
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detail Booking</h1>
          <p className="text-sm text-gray-500 mt-1">#{data.id?.slice(0, 8).toUpperCase()}</p>
        </div>
        <Link to="/bookings" className="btn-secondary">Kembali</Link>
      </div>

      <div className="card space-y-3">
        <Row label="Status" value={data.status} />
        <Row label="Stasiun" value={data.station_name || '—'} />
        <Row label="Slot" value={data.slot_label || '—'} />
        <Row label="Total" value={data.total_amount ? `Rp ${Number(data.total_amount).toLocaleString('id-ID')}` : '—'} />
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
