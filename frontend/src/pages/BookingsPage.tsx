import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingApi } from '../services/api'
import { ChargingCountdown } from '../components/ChargingCountdown'

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  CONFIRMED:       'bg-green-100 text-green-800',
  CANCELLED:       'bg-red-100 text-red-800',
  COMPLETED:       'bg-blue-100 text-blue-800',
  EXPIRED:         'bg-gray-100 text-gray-600',
  CHARGING:        'bg-teal-100 text-teal-800',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu Bayar',
  CONFIRMED:       'Dikonfirmasi',
  CANCELLED:       'Dibatalkan',
  COMPLETED:       'Selesai',
  EXPIRED:         'Kedaluwarsa',
  CHARGING:        'Sedang Mengisi',
}


export default function BookingsPage() {
  const queryClient = useQueryClient()
  const [cancelTarget, setCancelTarget] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingApi.getAll({ limit: 50 }).then(r => r.data),
    refetchInterval: 15000,
    staleTime: 0,
  })

  const bookings = data?.bookings || []

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    setErrorMsg('')
    try {
      await bookingApi.cancel(cancelTarget.id, cancelReason || undefined)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setCancelTarget(null)
      setCancelReason('')
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Gagal membatalkan booking')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daftar Booking</h1>
        <p className="text-sm text-gray-500 mt-1">Riwayat pemesanan slot pengisian Anda.</p>
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-32" />
      ) : bookings.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500 font-medium">Belum ada booking</p>
          <Link to="/stations" className="btn-primary mt-4 inline-block">Cari Stasiun</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking: any) => (
            <div key={booking.id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <Link to={`/bookings/${booking.id}`} className="flex-1 min-w-0 hover:opacity-80">
                  <p className="font-semibold text-gray-900">
                    Booking #{booking.id?.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(booking.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  {booking.station_name && (
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{booking.station_name}</p>
                  )}
                  {booking.slot_date && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Jadwal: {booking.slot_date}
                      {booking.slot_start_time && ` · ${booking.slot_start_time.slice(0, 5)}`}
                      {booking.slot_end_time   && ` – ${booking.slot_end_time.slice(0, 5)}`}
                    </p>
                  )}
                  {booking.status === 'CONFIRMED' && (
                    <p className="text-xs text-green-600 mt-1">
                      ℹ Charging akan dimulai otomatis saat jadwal tiba
                    </p>
                  )}
                  {booking.status === 'CHARGING' && (
                    <ChargingCountdown
                      bookingId={booking.id}
                      slotStartTime={booking.slot_start_time}
                      slotEndTime={booking.slot_end_time}
                    />
                  )}
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLOR[booking.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[booking.status] ?? booking.status}
                  </span>
                  {['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status) && (
                    <button
                      onClick={() => { setCancelTarget(booking); setCancelReason(''); setErrorMsg('') }}
                      className="text-xs text-red-500 border border-red-300 rounded-full px-2.5 py-1 hover:bg-red-50 whitespace-nowrap"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Konfirmasi Cancel */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Batalkan Booking?</h2>
            <p className="text-sm text-gray-600">
              Booking <span className="font-semibold">#{cancelTarget.id.slice(0, 8).toUpperCase()}</span>
              {cancelTarget.slot_date && ` · ${cancelTarget.slot_date} ${cancelTarget.slot_start_time?.slice(0,5)}–${cancelTarget.slot_end_time?.slice(0,5)}`} akan dibatalkan dan slot akan dilepas.
            </p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Alasan pembatalan (opsional)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Mis: berubah rencana"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setCancelTarget(null)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled={cancelling}
              >
                Kembali
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                disabled={cancelling}
              >
                {cancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
