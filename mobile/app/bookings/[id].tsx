import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { bookingApi, paymentApi } from '../../services/api'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu Bayar', CONFIRMED: 'Dikonfirmasi', CHARGING: 'Sedang Mengisi',
  COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan', EXPIRED: 'Kedaluwarsa',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: '#F59E0B', CONFIRMED: '#10B981', CHARGING: '#0EA5E9',
  COMPLETED: '#6B7280', CANCELLED: '#EF4444', EXPIRED: '#EF4444',
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, color ? { color } : {}]}>{value}</Text>
    </View>
  )
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    bookingApi.getById(id!).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  async function handlePay() {
    setPaying(true)
    try {
      await paymentApi.initiate(id!, 'QRIS')
      router.push(`/bookings/${id}/pay`)
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error || 'Gagal memulai pembayaran')
    } finally { setPaying(false) }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#10B981" />

  return (
    <View style={s.page}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Detail Booking</Text>
          <Text style={s.headerSub}>#{data?.id?.slice(0,8).toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <Row label="Status" value={STATUS_LABEL[data?.status] || data?.status} color={STATUS_COLOR[data?.status]} />
          <Row label="Stasiun" value={data?.station_name || '—'} />
          <Row label="Tipe Charger" value={data?.charger_type || '—'} />
          <Row label="Slot" value={data?.slot_label || '—'} />
          <Row
            label="Total"
            value={data?.total_amount ? `Rp ${Number(data.total_amount).toLocaleString('id-ID')}` : '—'}
          />
          {data?.expires_at && data?.status === 'PENDING_PAYMENT' && (
            <Row
              label="Batas Bayar"
              value={new Date(data.expires_at).toLocaleString('id-ID')}
              color="#EF4444"
            />
          )}
        </View>

        {data?.status === 'PENDING_PAYMENT' && (
          <TouchableOpacity style={s.payBtn} onPress={handlePay} disabled={paying}>
            <Text style={s.payBtnText}>{paying ? 'Memproses...' : '💳  Bayar Sekarang'}</Text>
          </TouchableOpacity>
        )}

        {data?.status === 'CHARGING' && (
          <View style={s.chargingCard}>
            <Text style={s.chargingText}>⚡ Sedang mengisi daya...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: '#F9FAFB' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  backBtn:     { padding: 8 },
  backText:    { fontSize: 22, color: '#111827' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSub:   { fontSize: 13, color: '#6B7280', marginTop: 2 },
  content:     { padding: 16, paddingBottom: 40, gap: 14 },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel:    { fontSize: 14, color: '#6B7280' },
  rowValue:    { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'right', flex: 1, marginLeft: 16 },
  payBtn:      { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  payBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  chargingCard:{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#A7F3D0', alignItems: 'center' },
  chargingText:{ color: '#065F46', fontWeight: '700', fontSize: 15 },
})
