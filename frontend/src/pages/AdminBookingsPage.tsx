import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../services/api'
import { useState } from 'react'
import { format } from 'date-fns'
import { ChargingCountdown } from '../components/ChargingCountdown'

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  CONFIRMED:       'bg-green-100 text-green-800',
  CANCELLED:       'bg-red-100 text-red-800',
  COMPLETED:       'bg-blue-100 text-blue-800',
  EXPIRED:         'bg-gray-100 text-gray-600',
  CHARGING:        'bg-teal-100 text-teal-800',
}

export default function AdminBookingsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', page, status],
    queryFn: () => adminApi.getAllBookings({ page, limit: 20, ...(status ? { status } : {}) }).then(r => r.data),
    refetchInterval: 15000,
    staleTime: 0,
  })

  const bookings   = data?.bookings ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Semua Booking</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor seluruh transaksi booking pengguna.</p>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        {['', 'PENDING_PAYMENT', 'CONFIRMED', 'CHARGING', 'COMPLETED', 'CANCELLED', 'EXPIRED'].map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              status === s
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s || 'Semua'}
          </button>
        ))}
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="card animate-pulse h-24" />
        ) : bookings.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Tidak ada booking.</p>
        ) : bookings.map((b: any) => (
          <div key={b.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gray-600 font-semibold">{b.id.slice(0, 8).toUpperCase()}…</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {b.status}
              </span>
            </div>
            {b.user ? (
              <div>
                <p className="text-sm font-medium text-gray-800">{b.user.name}</p>
                <p className="text-xs text-gray-400">{b.user.email}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 font-mono">{b.user_id?.slice(0, 8)}…</p>
            )}
            {b.station_name && <p className="text-xs text-gray-600">📍 {b.station_name}</p>}
            {b.slot_date && (
              <p className="text-xs text-gray-500">
                {b.slot_date} · {b.slot_start_time?.slice(0,5) ?? '??:??'} – {b.slot_end_time?.slice(0,5) ?? '??:??'}
              </p>
            )}
            {b.status === 'CHARGING' && (
              <ChargingCountdown bookingId={b.id} slotStartTime={b.slot_start_time} slotEndTime={b.slot_end_time} compact />
            )}
            <p className="text-xs text-gray-400">{b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy HH:mm') : '-'}</p>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block card overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Memuat...</p>
        ) : bookings.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Tidak ada booking.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">ID Booking</th>
                <th className="px-4 py-3 font-medium text-gray-600">Pengguna</th>
                <th className="px-4 py-3 font-medium text-gray-600">Stasiun</th>
                <th className="px-4 py-3 font-medium text-gray-600">Jadwal Slot</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Tanggal Booking</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{b.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-sm">
                    {b.user ? (
                      <div>
                        <div className="font-medium text-gray-800">{b.user.name}</div>
                        <div className="text-xs text-gray-400">{b.user.email}</div>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-gray-400">{b.user_id?.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {b.station_name || <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {b.slot_date ? (
                      <div>
                        <div>{b.slot_date}</div>
                        <div className="text-gray-400">
                          {b.slot_start_time?.slice(0, 5) ?? '??:??'} – {b.slot_end_time?.slice(0, 5) ?? '??:??'}
                        </div>
                        {b.status === 'CHARGING' && (
                          <div className="mt-1">
                            <ChargingCountdown bookingId={b.id} slotStartTime={b.slot_start_time} slotEndTime={b.slot_end_time} compact />
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="font-mono text-gray-400">{b.slot_id?.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total: {total} booking</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >Prev</button>
            <span className="px-3 py-1">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
