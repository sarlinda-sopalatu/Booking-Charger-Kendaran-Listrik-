import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { bookingApi } from '../services/api'
import { Calendar, Clock, CreditCard, XCircle, CheckCircle2, TimerReset } from 'lucide-react'
import toast from 'react-hot-toast'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: 'badge-yellow',
    CONFIRMED: 'badge-blue',
    CHARGING: 'badge-green',
    COMPLETED: 'badge-gray',
    CANCELLED: 'badge-red',
    EXPIRED: 'badge-red'
  }

  return <span className={map[status] || 'badge-gray'}>{status}</span>
}

function Stat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500 font-medium">{title}</p>
        {icon}
      </div>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  )
}

export default function BookingsPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const qc = useQueryClient()

  const { data: listData, isLoading } = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: () => bookingApi.getAll({ limit: 20 }).then((r) => r.data)
  })

  const { data: detailData } = useQuery({
    queryKey: ['bookings', 'detail', bookingId],
    queryFn: () => bookingApi.getById(bookingId!).then((r) => r.data),
    enabled: !!bookingId
  })

  const cancelBooking = useMutation({
    mutationFn: (id: string) => bookingApi.cancel(id, 'Dibatalkan pengguna'),
    onSuccess: () => {
      toast.success('Booking dibatalkan')
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Gagal membatalkan booking')
    }
  })

  const bookings = listData?.bookings || []
  const selected = detailData?.booking
  const pending = bookings.filter((b: any) => b.status === 'PENDING_PAYMENT').length
  const active = bookings.filter((b: any) => ['CONFIRMED', 'CHARGING'].includes(b.status)).length
  const completed = bookings.filter((b: any) => b.status === 'COMPLETED').length

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden">
        <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-blue-200/35 blur-2xl" />
        <h1 className="text-2xl font-bold text-slate-900">Booking</h1>
        <p className="text-slate-600 text-sm mt-1">Pantau status, lihat detail, dan batalkan booking bila masih diizinkan.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <Stat title="Total" value={bookings.length} icon={<Calendar size={14} className="text-slate-600" />} />
          <Stat title="Menunggu Bayar" value={pending} icon={<TimerReset size={14} className="text-amber-600" />} />
          <Stat title="Aktif" value={active} icon={<CreditCard size={14} className="text-blue-600" />} />
          <Stat title="Selesai" value={completed} icon={<CheckCircle2 size={14} className="text-emerald-600" />} />
        </div>
      </div>

      {selected && (
        <div className="card border-green-200 bg-green-50/90">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">Detail Booking Dipilih</p>
              <p className="font-semibold text-gray-900 mt-1">#{selected.id}</p>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
            </div>
            {['PENDING_PAYMENT', 'CONFIRMED'].includes(selected.status) && (
              <button
                className="btn-danger"
                onClick={() => cancelBooking.mutate(selected.id)}
                disabled={cancelBooking.isPending}
              >
                {cancelBooking.isPending ? 'Membatalkan...' : 'Batalkan'}
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card">Memuat data booking...</div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-10">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada booking</p>
          <Link to="/stations" className="btn-primary mt-4 inline-block">Cari Stasiun</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => (
            <div key={b.id} className="card flex items-center justify-between gap-4 border-l-4 border-l-blue-300/80">
              <div>
                <p className="font-medium text-gray-900 text-sm">#{b.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(b.created_at).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={b.status} />
                <Link to={`/bookings/${b.id}`} className="btn-outline text-xs px-3 py-1.5">Lihat</Link>
                {b.status === 'PENDING_PAYMENT' && (
                  <button className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1" disabled>
                    <CreditCard size={13} /> Bayar
                  </button>
                )}
                {['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) && (
                  <button
                    className="btn-danger text-xs px-3 py-1.5 inline-flex items-center gap-1"
                    onClick={() => cancelBooking.mutate(b.id)}
                    disabled={cancelBooking.isPending}
                  >
                    <XCircle size={13} /> Batal
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
