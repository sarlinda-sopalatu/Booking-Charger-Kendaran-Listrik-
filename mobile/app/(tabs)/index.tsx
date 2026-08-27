import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../store/authStore'
import { bookingApi, queueApi, adminApi, stationApi } from '../../services/api'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu Bayar',
  CONFIRMED: 'Dikonfirmasi',
  CHARGING: 'Mengisi',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  EXPIRED: 'Kedaluwarsa',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: '#F59E0B',
  CONFIRMED: '#10B981',
  CHARGING: '#0EA5E9',
  COMPLETED: '#6B7280',
  CANCELLED: '#EF4444',
  EXPIRED: '#EF4444',
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

function AdminDashboard({ name }: { name: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.getAllBookings({ limit: 5 }),
      stationApi.getAll({ limit: 100 }),
    ]).then(([b, s]) => {
      setData({ bookings: b.data.bookings ?? [], total: b.data.total ?? 0, stations: s.data.stations ?? [] })
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#10B981" />

  const confirmed = data.bookings.filter((b: any) => b.status === 'CONFIRMED').length
  const pending   = data.bookings.filter((b: any) => b.status === 'PENDING_PAYMENT').length
  const activeStations = data.stations.filter((s: any) => s.status === 'ACTIVE').length

  return (
    <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={s.greeting}>Dashboard Admin</Text>
      <Text style={s.sub}>Selamat datang, {name}</Text>

      <View style={s.statsGrid}>
        <StatCard label="Total Booking" value={data.total} color="#3B82F6" />
        <StatCard label="Booking Aktif" value={confirmed} color="#10B981" />
        <StatCard label="Stasiun Aktif" value={activeStations} color="#8B5CF6" />
        <StatCard label="Menunggu Bayar" value={pending} color="#F59E0B" />
      </View>

      <Text style={s.sectionTitle}>Booking Terbaru</Text>
      {data.bookings.map((b: any) => (
        <TouchableOpacity key={b.id} style={s.bookingCard} onPress={() => router.push(`/admin/bookings`)}>
          <View style={{ flex: 1 }}>
            <Text style={s.bookingId}>#{b.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={s.bookingMeta}>{b.user?.name || b.user_id?.slice(0, 8)}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: STATUS_COLOR[b.status] + '20' }]}>
            <Text style={[s.badgeText, { color: STATUS_COLOR[b.status] }]}>
              {STATUS_LABEL[b.status] || b.status}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={{ gap: 12, marginTop: 8 }}>
        <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/admin/bookings')}>
          <Text style={s.quickBtnText}>📋  Semua Booking</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/admin/stations')}>
          <Text style={s.quickBtnText}>⚙️  Kelola Stasiun</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function UserDashboard({ name, evPlate }: { name: string; evPlate?: string }) {
  const [bookings, setBookings] = useState<any[]>([])
  const [queue, setQueue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const [b, q] = await Promise.all([
        bookingApi.getAll({ limit: 10 }),
        queueApi.getMyPosition().catch(() => ({ data: null })),
      ])
      setBookings(b.data.bookings ?? [])
      setQueue(q.data)
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const recent = bookings.slice(0, 3)
  const charging = bookings.filter(b => b.status === 'CHARGING').length
  const pendingPay = bookings.filter(b => b.status === 'PENDING_PAYMENT').length

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
    >
      <Text style={s.greeting}>Selamat datang, {name}! 👋</Text>
      <Text style={s.sub}>Kelola booking pengisian daya Anda</Text>

      <View style={s.statsGrid}>
        <StatCard label="Total Booking" value={bookings.length} color="#3B82F6" />
        <StatCard label="Aktif Charge" value={charging} color="#10B981" />
        <StatCard label="Di Antrian" value={queue ? 1 : 0} color="#8B5CF6" />
        <StatCard label="Tunggu Bayar" value={pendingPay} color="#F59E0B" />
      </View>

      {evPlate && (
        <View style={s.plateCard}>
          <Text style={s.plateSub}>Kendaraan Terdaftar</Text>
          <Text style={s.plateNum}>{evPlate}</Text>
        </View>
      )}

      <Text style={s.sectionTitle}>Booking Terbaru</Text>
      {loading ? <ActivityIndicator color="#10B981" /> : recent.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>Belum ada booking</Text>
          <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/(tabs)/stations')}>
            <Text style={s.btnPrimaryText}>Cari Stasiun</Text>
          </TouchableOpacity>
        </View>
      ) : recent.map((b: any) => (
        <TouchableOpacity key={b.id} style={s.bookingCard} onPress={() => router.push(`/bookings/${b.id}`)}>
          <View style={{ flex: 1 }}>
            <Text style={s.bookingId}>#{b.id.slice(0, 8).toUpperCase()}</Text>
            {b.station_name && <Text style={s.bookingMeta}>{b.station_name}</Text>}
            {b.slot_date && (
              <Text style={s.bookingMeta}>
                {b.slot_date} · {b.slot_start_time?.slice(0,5)}–{b.slot_end_time?.slice(0,5)}
              </Text>
            )}
          </View>
          <View style={[s.badge, { backgroundColor: STATUS_COLOR[b.status] + '20' }]}>
            <Text style={[s.badgeText, { color: STATUS_COLOR[b.status] }]}>
              {STATUS_LABEL[b.status] || b.status}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={{ gap: 12, marginTop: 8 }}>
        <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/(tabs)/stations')}>
          <Text style={s.quickBtnText}>📍  Cari Stasiun Terdekat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/(tabs)/bookings')}>
          <Text style={s.quickBtnText}>📅  Lihat Semua Booking</Text>
        </TouchableOpacity>
        {queue && (
          <TouchableOpacity style={[s.quickBtn, { borderColor: '#8B5CF6' }]} onPress={() => router.push('/(tabs)/queue')}>
            <Text style={[s.quickBtnText, { color: '#8B5CF6' }]}>🔢  Posisi Antrian #{queue.position}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

export default function DashboardScreen() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OPERATOR'

  if (isAdmin) return <AdminDashboard name={user?.name?.split(' ')[0] ?? 'Admin'} />
  return <UserDashboard name={user?.name?.split(' ')[0] ?? ''} evPlate={user?.ev_plate} />
}

const s = StyleSheet.create({
  page:         { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  greeting:     { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 8 },
  sub:          { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard:     { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 3, elevation: 1, shadowOpacity: 0.04, shadowRadius: 4 },
  statValue:    { fontSize: 24, fontWeight: '800' },
  statLabel:    { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  bookingCard:  { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1, shadowOpacity: 0.04, shadowRadius: 4 },
  bookingId:    { fontSize: 14, fontWeight: '700', color: '#111827' },
  bookingMeta:  { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  quickBtn:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: '#10B981', elevation: 1 },
  quickBtnText: { fontSize: 15, fontWeight: '600', color: '#10B981' },
  emptyCard:    { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', elevation: 1 },
  emptyText:    { color: '#6B7280', fontSize: 15, marginBottom: 14 },
  btnPrimary:   { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnPrimaryText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  plateCard:    { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  plateSub:     { fontSize: 12, color: '#6B7280' },
  plateNum:     { fontSize: 20, fontWeight: '800', color: '#065F46', marginTop: 2 },
})
