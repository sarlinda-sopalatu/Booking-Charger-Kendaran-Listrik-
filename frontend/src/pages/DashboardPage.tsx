import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { bookingApi, queueApi, stationApi, adminApi } from '../services/api'
import {
  Calendar, CreditCard, Users, Zap, ChevronRight,
  Clock, MapPin, Settings, ClipboardList, Activity
} from 'lucide-react'

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

// ============================================================
// Dashboard Admin
// ============================================================
function AdminDashboard({ name }: { name: string }) {
  const { data: allBookings } = useQuery({
    queryKey: ['admin-dashboard-bookings'],
    queryFn:  () => adminApi.getAllBookings({ limit: 5 }).then(r => r.data)
  })
  const { data: stationsData } = useQuery({
    queryKey: ['admin-dashboard-stations'],
    queryFn:  () => stationApi.getAll({ status: 'ALL', limit: 100 }).then(r => r.data)
  })

  const total        = allBookings?.total ?? 0
  const bookings     = allBookings?.bookings ?? []
  const confirmed    = bookings.filter((b: any) => b.status === 'CONFIRMED').length
  const pending      = bookings.filter((b: any) => b.status === 'PENDING_PAYMENT').length
  const totalStation = stationsData?.total ?? 0
  const activeStation = stationsData?.stations?.filter((s: any) => s.status === 'ACTIVE').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Selamat datang, {name}. Pantau seluruh sistem EV Charging.</p>
      </div>

      {/* Stats system */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar />}    color="bg-blue-100 text-blue-600"   label="Total Booking"   value={total} />
        <StatCard icon={<Zap />}         color="bg-green-100 text-green-600" label="Booking Aktif"   value={confirmed} />
        <StatCard icon={<MapPin />}      color="bg-purple-100 text-purple-600" label="Stasiun Aktif" value={activeStation} />
        <StatCard icon={<CreditCard />}  color="bg-orange-100 text-orange-600" label="Menunggu Bayar" value={pending} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Booking terbaru semua user */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Booking Terbaru (Semua User)</h2>
            <Link to="/admin/bookings" className="text-sm text-green-600 hover:underline flex items-center gap-1">
              Lihat semua <ChevronRight size={16} />
            </Link>
          </div>
          {bookings.length === 0 ? (
            <div className="card text-center py-10">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Belum ada transaksi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b: any) => (
                <div key={b.id} className="card flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">#{b.id.slice(0,8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">User: {b.user_id?.slice(0,8)}…</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={b.status} />
                    <span className="text-xs text-gray-400">
                      {new Date(b.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aksi cepat admin */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Aksi Cepat</h2>
          <div className="space-y-3">
            <Link to="/admin/bookings" className="card-hover flex items-center gap-4 py-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Semua Booking</p>
                <p className="text-xs text-gray-500">Monitor transaksi pengguna</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 ml-auto" />
            </Link>
            <Link to="/admin/stations" className="card-hover flex items-center gap-4 py-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Kelola Stasiun</p>
                <p className="text-xs text-gray-500">{totalStation} stasiun terdaftar</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 ml-auto" />
            </Link>
            <Link to="/stations" className="card-hover flex items-center gap-4 py-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Lihat Peta Stasiun</p>
                <p className="text-xs text-gray-500">{activeStation} stasiun aktif</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 ml-auto" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Dashboard User
// ============================================================
function UserDashboard({ name, evPlate }: { name: string; evPlate?: string }) {
  const { data: bookingsData } = useQuery({
    queryKey: ['bookings', 'dashboard'],
    queryFn:  () => bookingApi.getAll({ limit: 50 }).then(r => r.data),
    refetchInterval: 15000,
    staleTime: 0,
  })

  const { data: recentData } = useQuery({
    queryKey: ['bookings', 'recent'],
    queryFn:  () => bookingApi.getAll({ limit: 3 }).then(r => r.data),
    refetchInterval: 15000,
    staleTime: 0,
  })
  const { data: queueData } = useQuery({
    queryKey: ['queue', 'position'],
    queryFn:  () => queueApi.getMyPosition().then(r => r.data),
    retry:    false
  })

  const allBookings  = bookingsData?.bookings || []
  const bookings     = recentData?.bookings || []
  const activeBooking = allBookings.find((b: any) =>
    ['CONFIRMED', 'CHARGING', 'PENDING_PAYMENT'].includes(b.status)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Selamat datang, {name}! 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Kelola booking pengisian daya kendaraan listrik Anda</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar />}    color="bg-blue-100 text-blue-600"    label="Total Booking"   value={bookingsData?.total || 0} />
        <StatCard icon={<Zap />}         color="bg-green-100 text-green-600"  label="Aktif"           value={allBookings.filter((b: any) => b.status === 'CHARGING').length} />
        <StatCard icon={<Users />}       color="bg-purple-100 text-purple-600" label="Di Antrian"     value={queueData ? 1 : 0} />
        <StatCard icon={<CreditCard />}  color="bg-orange-100 text-orange-600" label="Menunggu Bayar" value={allBookings.filter((b: any) => b.status === 'PENDING_PAYMENT').length} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Booking Terbaru</h2>
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
                  className="card-hover flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Booking #{booking.id.slice(0,8).toUpperCase()}</p>
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

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Aksi Cepat</h2>
          <div className="space-y-3">
            <Link to="/stations" className="card-hover flex items-center gap-4 py-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Cari Stasiun</p>
                <p className="text-xs text-gray-500">Temukan charger terdekat</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 ml-auto" />
            </Link>
            <Link to="/queue" className="card-hover flex items-center gap-4 py-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Lihat Antrian</p>
                <p className="text-xs text-gray-500">{queueData ? `Posisi #${queueData.position}` : 'Tidak di antrian'}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 ml-auto" />
            </Link>
            {activeBooking && (
              <Link to={`/monitoring/${activeBooking.charger_id || activeBooking.slot_id}?station=${encodeURIComponent(activeBooking.station_name || '')}&type=${encodeURIComponent(activeBooking.charger_type || '')}`}
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
          {evPlate && (
            <div className="card bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Kendaraan Terdaftar</p>
              <p className="font-bold text-lg text-gray-900">{evPlate}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Entry point
// ============================================================
export default function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OPERATOR'

  if (isAdmin) return <AdminDashboard name={user?.name?.split(' ')[0] ?? 'Admin'} />
  return <UserDashboard name={user?.name?.split(' ')[0] ?? ''} evPlate={user?.ev_plate} />
}

function StatCard({ icon, color, label, value }: {
  icon: React.ReactNode; color: string; label: string; value: number
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  )
}

