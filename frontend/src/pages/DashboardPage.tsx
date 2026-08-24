import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { bookingApi, queueApi } from '../services/api'
import { useUiConfigStore } from '../store/uiConfigStore'
import { Calendar, CreditCard, Users, Zap, ChevronRight, Clock, MapPin, Sparkles } from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: 'badge-yellow',
    CONFIRMED:       'badge-blue',
    CHARGING:        'badge-green',
    COMPLETED:       'badge-gray',
    CANCELLED:       'badge-red',
    EXPIRED:         'badge-red'
  }
  const labels: Record<string, string> = {
    PENDING_PAYMENT: 'Menunggu Bayar',
    CONFIRMED:       'Dikonfirmasi',
    CHARGING:        'Sedang Mengisi',
    COMPLETED:       'Selesai',
    CANCELLED:       'Dibatalkan',
    EXPIRED:         'Kedaluwarsa'
  }
  return <span className={map[status] || 'badge-gray'}>{labels[status] || status}</span>
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const uiConfig = useUiConfigStore((s) => s.config)

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings', 'recent'],
    queryFn:  () => bookingApi.getAll({ limit: 3 }).then(r => r.data)
  })

  const { data: queueData } = useQuery({
    queryKey: ['queue', 'position'],
    queryFn:  () => queueApi.getMyPosition().then(r => r.data),
    retry:    false
  })

  const bookings = bookingsData?.bookings || []
  const activeBooking = bookings.find((b: any) =>
    ['CONFIRMED', 'CHARGING', 'PENDING_PAYMENT'].includes(b.status)
  )
  const firstName = user?.name?.split(' ')[0] || 'Pengguna'

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="card relative overflow-hidden">
        <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl" />
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-emerald-700/85 font-semibold">
              <Sparkles size={13} /> {uiConfig.dashboardGreetingLabel}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Selamat datang, {firstName}
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Kelola jadwal charging, pantau antrian, dan lihat progress booking Anda.
            </p>
          </div>
          {user?.ev_plate && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
              <p className="text-[11px] text-emerald-700 font-medium">Kendaraan Aktif</p>
              <p className="text-lg font-bold text-emerald-800">{user.ev_plate}</p>
            </div>
          )}
        </div>
      </div>

      {uiConfig.showDashboardStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Calendar />} color="bg-blue-100 text-blue-600" label="Total Booking"
            value={bookingsData?.total || 0} />
          <StatCard icon={<Zap />}      color="bg-green-100 text-green-600" label="Aktif"
            value={bookings.filter((b: any) => b.status === 'CHARGING').length} />
          <StatCard icon={<Users />}    color="bg-purple-100 text-purple-600" label="Di Antrian"
            value={queueData ? 1 : 0} />
          <StatCard icon={<CreditCard />} color="bg-orange-100 text-orange-600" label="Menunggu Bayar"
            value={bookings.filter((b: any) => b.status === 'PENDING_PAYMENT').length} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active booking */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Booking Terbaru</h2>
            <Link to="/bookings" className="text-sm text-green-600 hover:underline flex items-center gap-1">
              Lihat semua <ChevronRight size={16} />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="card text-center py-10">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Belum ada booking</p>
              <p className="text-gray-400 text-sm mt-1">Cari stasiun pengisian terdekat dan buat booking pertama Anda</p>
              <Link to="/stations" className="btn-primary mt-4 inline-block">Cari Stasiun</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking: any) => (
                <Link key={booking.id} to={`/bookings/${booking.id}`}
                  className="card-hover flex items-center justify-between border-l-4 border-l-blue-300/80">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Booking #{booking.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        {new Date(booking.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={booking.status} />
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        {uiConfig.showDashboardQuickActions && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Aksi Cepat</h2>
            <div className="space-y-3">
              <Link to="/stations" className="card-hover flex items-center gap-4 py-4 border-l-4 border-l-emerald-300/80">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Cari Stasiun</p>
                  <p className="text-xs text-gray-500">Temukan charger terdekat</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 ml-auto" />
              </Link>

              <Link to="/queue" className="card-hover flex items-center gap-4 py-4 border-l-4 border-l-violet-300/80">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Lihat Antrian</p>
                  <p className="text-xs text-gray-500">
                    {queueData ? `Posisi #${queueData.position}` : 'Tidak di antrian'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-400 ml-auto" />
              </Link>

              {activeBooking && (
                <Link to={`/monitoring/${activeBooking.slot_id}`}
                  className="card-hover flex items-center gap-4 py-4 border-l-4 border-green-400">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Monitor Pengisian</p>
                    <p className="text-xs text-green-600">Live monitoring aktif</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 ml-auto" />
                </Link>
              )}
            </div>

            {uiConfig.showDashboardTips && (
              <div className="card bg-gradient-to-br from-slate-50 to-white">
                <p className="text-xs text-slate-500 mb-1">Tip Hari Ini</p>
                <p className="text-sm text-slate-700">Booking di luar jam sibuk biasanya punya antrian lebih pendek dan proses lebih cepat.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, color, label, value }: {
  icon: React.ReactNode; color: string; label: string; value: number
}) {
  return (
    <div className="stat-card border-l-4 border-l-slate-200/80">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}
