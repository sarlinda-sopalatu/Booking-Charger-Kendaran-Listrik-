import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { bookingApi, paymentApi } from '../services/api'
import { useState } from 'react'

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.getById(id!).then(r => r.data)
  })

  if (isLoading || !data) {
    return <div className="card animate-pulse h-40" />
  }

  const statusColor: Record<string, string> = {
    PENDING_PAYMENT: 'text-yellow-600',
    CONFIRMED:       'text-green-600',
    CHARGING:        'text-blue-600',
    COMPLETED:       'text-gray-600',
    CANCELLED:       'text-red-500',
  }

  async function handlePay() {
    setPaying(true)
    setPayError('')
    try {
      const res = await paymentApi.initiate(id!, 'QRIS')
      const payment = res.data
      if (payment.payment_url) {
        window.open(payment.payment_url, '_blank')
      } else {
        navigate(`/bookings/${id}/pay`)
      }
    } catch (err: any) {
      setPayError(err?.response?.data?.error || 'Gagal memulai pembayaran')
    } finally {
      setPaying(false)
    }
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
        <Row label="Status" value={data.status} className={statusColor[data.status] || ''} />
        <Row label="Stasiun" value={data.station_name || '—'} />
        <Row label="Tipe Charger" value={data.charger_type || '—'} />
        <Row label="Slot" value={data.slot_label || '—'} />
        <Row label="Total" value={data.total_amount ? `Rp ${Number(data.total_amount).toLocaleString('id-ID')}` : '—'} />
        {data.expires_at && data.status === 'PENDING_PAYMENT' && (
          <Row label="Batas Bayar" value={new Date(data.expires_at).toLocaleString('id-ID')} className="text-red-500" />
        )}
      </div>

      {data.status === 'PENDING_PAYMENT' && (
        <div className="space-y-2">
          {payError && <p className="text-sm text-red-500">{payError}</p>}
          <button
            onClick={handlePay}
            disabled={paying}
            className="btn-primary w-full"
          >
            {paying ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${className}`}>{value}</span>
    </div>
  )
}

