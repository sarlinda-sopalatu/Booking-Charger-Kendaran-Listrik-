import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { paymentApi } from '../services/api'

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentApi.getByBooking(id!).then(r => r.data)
  })

  if (isLoading || !data) {
    return <div className="card animate-pulse h-40" />
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pembayaran</h1>
        <Link to="/bookings" className="btn-secondary">Kembali</Link>
      </div>

      <div className="card space-y-3">
        <Row label="ID Pembayaran" value={data.id || '—'} />
        <Row label="Status" value={data.status || 'PENDING'} />
        <Row label="Jumlah" value={data.amount ? `Rp ${Number(data.amount).toLocaleString('id-ID')}` : '—'} />
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
