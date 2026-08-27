import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { paymentApi } from '../services/api'
import { useState } from 'react'

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['payment-booking', id],
    queryFn: () => paymentApi.getByBooking(id!).then(r => r.data),
    refetchInterval: 5000
  })

  async function handleSimulateConfirm() {
    if (!data?.id) return
    setConfirming(true)
    setConfirmError('')
    try {
      await paymentApi.simulateConfirm(data.id)
      queryClient.invalidateQueries({ queryKey: ['payment-booking', id] })
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
    } catch (err: any) {
      setConfirmError(err?.response?.data?.error || 'Gagal mensimulasikan pembayaran')
    } finally {
      setConfirming(false)
    }
  }

  if (isLoading) {
    return <div className="card animate-pulse h-40" />
  }

  if (error || !data) {
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Pembayaran</h1>
        <div className="card text-center text-red-500">Gagal memuat data pembayaran</div>
        <Link to="/bookings" className="btn-secondary block text-center">Kembali ke Booking</Link>
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    PENDING:    'text-yellow-600',
    PROCESSING: 'text-blue-600',
    COMPLETED:  'text-green-600',
    FAILED:     'text-red-500',
    CANCELLED:  'text-gray-500',
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pembayaran</h1>
        <Link to="/bookings" className="btn-secondary">Kembali</Link>
      </div>

      <div className="card space-y-3">
        <Row label="ID Pembayaran" value={`#${(data.id || '').slice(0, 8).toUpperCase()}`} />
        <Row
          label="Status"
          value={data.status || 'PENDING'}
          className={statusColor[data.status] || ''}
        />
        <Row
          label="Jumlah"
          value={data.amount_idr ? `Rp ${Number(data.amount_idr).toLocaleString('id-ID')}` : '—'}
        />
        <Row label="Metode" value={data.method || '—'} />
        {data.expires_at && data.status === 'PENDING' && (
          <Row
            label="Batas Bayar"
            value={new Date(data.expires_at).toLocaleString('id-ID')}
            className="text-red-500"
          />
        )}
      </div>

      {data.status === 'COMPLETED' && (
        <div className="card bg-green-50 border border-green-200 text-center">
          <p className="text-green-700 font-semibold">Pembayaran Berhasil!</p>
          <p className="text-sm text-green-600 mt-1">Booking Anda telah dikonfirmasi.</p>
          <Link to="/bookings" className="btn-primary mt-4 inline-block">Lihat Booking</Link>
        </div>
      )}

      {data.qr_string && data.status === 'PENDING' && (
        <div className="card text-center space-y-3">
          <p className="text-sm font-medium text-gray-700">Scan QR Code untuk membayar</p>
          <div className="flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.qr_string)}`}
              alt="QR Code Pembayaran"
              className="rounded-lg border"
            />
          </div>
          <p className="text-xs text-gray-400">Halaman ini otomatis update setiap 5 detik</p>
        </div>
      )}

      {data.status === 'PENDING' && (
        <div className="space-y-2">
          {confirmError && <p className="text-sm text-red-500">{confirmError}</p>}
          <button
            onClick={handleSimulateConfirm}
            disabled={confirming}
            className="w-full py-2 px-4 rounded-lg border border-dashed border-yellow-400 bg-yellow-50 text-yellow-700 text-sm font-medium hover:bg-yellow-100 transition"
          >
            {confirming ? 'Memproses...' : 'Simulasi: Konfirmasi Pembayaran (Dev Only)'}
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
