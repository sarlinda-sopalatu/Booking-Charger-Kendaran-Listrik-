import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native'
import { router } from 'expo-router'
import { adminApi } from '../../services/api'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu Bayar', CONFIRMED: 'Dikonfirmasi', CHARGING: 'Mengisi',
  COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan', EXPIRED: 'Kedaluwarsa',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: '#F59E0B', CONFIRMED: '#10B981', CHARGING: '#0EA5E9',
  COMPLETED: '#6B7280', CANCELLED: '#EF4444', EXPIRED: '#9CA3AF',
}
const FILTERS = ['', 'PENDING_PAYMENT', 'CONFIRMED', 'CHARGING', 'COMPLETED', 'CANCELLED', 'EXPIRED']
const FILTER_LABELS: Record<string, string> = {
  '': 'Semua', PENDING_PAYMENT: 'Menunggu', CONFIRMED: 'Dikonfirmasi',
  CHARGING: 'Mengisi', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan', EXPIRED: 'Kedaluwarsa',
}

export default function AdminBookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const totalPages = Math.ceil(total / 20)

  async function load(p: number, s: string) {
    try {
      const { data } = await adminApi.getAllBookings({ page: p, limit: 20, ...(s ? { status: s } : {}) })
      setBookings(data.bookings ?? [])
      setTotal(data.total ?? 0)
    } catch (e: any) {
      console.error('Admin bookings error:', e?.response?.data || e?.message)
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { setLoading(true); load(page, status) }, [page, status])

  return (
    <View style={s.page}>
      <View style={s.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Semua Booking</Text>
          <Text style={s.sub}>Total: {total} booking</Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, status === f && s.filterActive]}
            onPress={() => { setStatus(f); setPage(1); setLoading(true); load(1, f) }}
          >
            <Text style={[s.filterText, status === f && s.filterActiveText]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator color="#10B981" style={{ marginTop: 32 }} /> : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(page, status) }} />}
        >
          {bookings.map(b => (
            <View key={b.id} style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.bookingId}>#{b.id.slice(0,8).toUpperCase()}</Text>
                <View style={[s.badge, { backgroundColor: STATUS_COLOR[b.status] + '20' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLOR[b.status] }]}>
                    {STATUS_LABEL[b.status] || b.status}
                  </Text>
                </View>
              </View>
              {(b.user_name || b.user?.name) && (
                <View style={s.userRow}>
                  <Text style={s.userName}>{b.user_name || b.user?.name}</Text>
                  <Text style={s.userEmail}>{b.user_email || b.user?.email}</Text>
                </View>
              )}
              {b.station_name && <Text style={s.meta}>📍 {b.station_name}</Text>}
              {b.slot_date && (
                <Text style={s.meta}>
                  📅 {b.slot_date} · {b.slot_start_time?.slice(0,5)}–{b.slot_end_time?.slice(0,5)}
                </Text>
              )}
              <Text style={s.created}>
                {b.created_at ? new Date(b.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-'}
              </Text>
            </View>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={s.pagination}>
              <TouchableOpacity style={[s.pageBtn, page === 1 && s.pageBtnDis]} disabled={page === 1} onPress={() => setPage(p => p - 1)}>
                <Text style={s.pageBtnText}>← Prev</Text>
              </TouchableOpacity>
              <Text style={s.pageInfo}>{page} / {totalPages}</Text>
              <TouchableOpacity style={[s.pageBtn, page === totalPages && s.pageBtnDis]} disabled={page === totalPages} onPress={() => setPage(p => p + 1)}>
                <Text style={s.pageBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  page:           { flex: 1, backgroundColor: '#F9FAFB' },
  pageHeader:     { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  backBtn:        { padding: 8 },
  backText:       { fontSize: 22, color: '#111827' },
  title:          { fontSize: 18, fontWeight: '700', color: '#111827' },
  sub:            { fontSize: 12, color: '#6B7280', marginTop: 2 },
  filterScroll:   { flexShrink: 0, flexGrow: 0, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 56 },
  filterBtn:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff', marginRight: 8 },
  filterActive:   { backgroundColor: '#10B981', borderColor: '#10B981' },
  filterText:     { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterActiveText:{ color: '#fff' },
  card:           { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  cardTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bookingId:      { fontSize: 13, fontWeight: '700', color: '#111827', fontVariant: ['tabular-nums'] },
  badge:          { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText:      { fontSize: 11, fontWeight: '700' },
  userRow:        { marginBottom: 4 },
  userName:       { fontSize: 14, fontWeight: '600', color: '#111827' },
  userEmail:      { fontSize: 12, color: '#9CA3AF' },
  meta:           { fontSize: 12, color: '#6B7280', marginTop: 3 },
  created:        { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  pagination:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  pageBtn:        { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#D1D5DB' },
  pageBtnDis:     { opacity: 0.4 },
  pageBtnText:    { fontSize: 13, fontWeight: '600', color: '#374151' },
  pageInfo:       { fontSize: 14, color: '#6B7280' },
})
