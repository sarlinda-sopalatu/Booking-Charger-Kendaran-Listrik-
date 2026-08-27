import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native'
import { router } from 'expo-router'
import { bookingApi } from '../../services/api'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu Bayar', CONFIRMED: 'Dikonfirmasi', CHARGING: 'Mengisi',
  COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan', EXPIRED: 'Kedaluwarsa',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: '#F59E0B', CONFIRMED: '#10B981', CHARGING: '#0EA5E9',
  COMPLETED: '#6B7280', CANCELLED: '#EF4444', EXPIRED: '#EF4444',
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const { data } = await bookingApi.getAll({ limit: 50 })
      setBookings(data.bookings ?? [])
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  async function handleCancel(b: any) {
    Alert.alert('Batalkan Booking?', `Booking #${b.id.slice(0,8).toUpperCase()} akan dibatalkan.`, [
      { text: 'Kembali', style: 'cancel' },
      { text: 'Batalkan', style: 'destructive', onPress: async () => {
        try {
          await bookingApi.cancel(b.id)
          load()
        } catch (e: any) {
          Alert.alert('Gagal', e.response?.data?.error || 'Terjadi kesalahan')
        }
      }}
    ])
  }

  return (
    <View style={s.page}>
      <Text style={s.title}>Daftar Booking</Text>
      <Text style={s.sub}>Riwayat pemesanan slot pengisian Anda</Text>

      {loading ? <ActivityIndicator color="#10B981" style={{ marginTop: 32 }} /> : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        >
          {bookings.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>Belum ada booking</Text>
              <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/(tabs)/stations')}>
                <Text style={s.btnPrimaryText}>Cari Stasiun</Text>
              </TouchableOpacity>
            </View>
          ) : bookings.map(b => (
            <TouchableOpacity key={b.id} style={s.card} onPress={() => router.push(`/bookings/${b.id}`)}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.bookingId}>Booking #{b.id.slice(0,8).toUpperCase()}</Text>
                  <Text style={s.meta}>
                    {new Date(b.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                  </Text>
                  {b.station_name && <Text style={s.meta}>{b.station_name}</Text>}
                  {b.slot_date && (
                    <Text style={s.meta}>
                      {b.slot_date} · {b.slot_start_time?.slice(0,5)}–{b.slot_end_time?.slice(0,5)}
                    </Text>
                  )}
                </View>
                <View style={[s.badge, { backgroundColor: STATUS_COLOR[b.status] + '20' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLOR[b.status] }]}>
                    {STATUS_LABEL[b.status] || b.status}
                  </Text>
                </View>
              </View>

              {b.status === 'CONFIRMED' && (
                <Text style={s.infoText}>ℹ Charging dimulai otomatis saat jadwal tiba</Text>
              )}
              {['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) && (
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={(e) => { e.stopPropagation(); handleCancel(b) }}
                >
                  <Text style={s.cancelText}>Batalkan Booking</Text>
                </TouchableOpacity>
              )}
              {b.status === 'PENDING_PAYMENT' && (
                <TouchableOpacity
                  style={s.payBtn}
                  onPress={() => router.push(`/bookings/${b.id}/pay`)}
                >
                  <Text style={s.payText}>💳  Bayar Sekarang</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title:       { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 8 },
  sub:         { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1, shadowOpacity: 0.04, shadowRadius: 6 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bookingId:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  meta:        { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  infoText:    { fontSize: 12, color: '#10B981', marginTop: 10 },
  cancelBtn:   { marginTop: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center' },
  cancelText:  { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  payBtn:      { marginTop: 8, backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  payText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 32, alignItems: 'center', marginTop: 20 },
  emptyText:   { color: '#6B7280', fontSize: 15, marginBottom: 16 },
  btnPrimary:  { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
