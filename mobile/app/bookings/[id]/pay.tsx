import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { paymentApi } from '../../../services/api'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu', PROCESSING: 'Diproses', COMPLETED: 'Berhasil',
  FAILED: 'Gagal', CANCELLED: 'Dibatalkan',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B', PROCESSING: '#3B82F6', COMPLETED: '#10B981',
  FAILED: '#EF4444', CANCELLED: '#6B7280',
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, color ? { color } : {}]}>{value}</Text>
    </View>
  )
}

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  async function load() {
    try {
      const r = await paymentApi.getByBooking(id!)
      setData(r.data)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleSimulate() {
    setConfirming(true)
    try {
      await paymentApi.simulateConfirm(data.id)
      load()
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error || 'Gagal konfirmasi')
    } finally { setConfirming(false) }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#10B981" />

  return (
    <View style={s.page}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pembayaran</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <Row label="ID Pembayaran" value={`#${(data?.id || '').slice(0,8).toUpperCase()}`} />
          <Row label="Status" value={STATUS_LABEL[data?.status] || data?.status} color={STATUS_COLOR[data?.status]} />
          <Row label="Jumlah" value={data?.amount_idr ? `Rp ${Number(data.amount_idr).toLocaleString('id-ID')}` : '—'} />
          <Row label="Metode" value={data?.method || '—'} />
          {data?.expires_at && data?.status === 'PENDING' && (
            <Row label="Batas Bayar" value={new Date(data.expires_at).toLocaleString('id-ID')} color="#EF4444" />
          )}
        </View>

        {data?.status === 'COMPLETED' && (
          <View style={s.successCard}>
            <Text style={s.successTitle}>✅ Pembayaran Berhasil!</Text>
            <Text style={s.successSub}>Booking Anda telah dikonfirmasi.</Text>
            <TouchableOpacity style={s.backToBookingBtn} onPress={() => router.replace(`/bookings/${id}`)}>
              <Text style={s.backToBookingText}>Lihat Booking</Text>
            </TouchableOpacity>
          </View>
        )}

        {data?.qr_string && data?.status === 'PENDING' && (
          <View style={s.qrCard}>
            <Text style={s.qrLabel}>Scan QR Code untuk membayar</Text>
            <Image
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.qr_string)}` }}
              style={s.qrImage}
            />
            <Text style={s.qrHint}>Halaman ini otomatis update setiap 5 detik</Text>
          </View>
        )}

        {data?.status === 'PENDING' && (
          <TouchableOpacity style={s.simBtn} onPress={handleSimulate} disabled={confirming}>
            <Text style={s.simBtnText}>
              {confirming ? 'Memproses...' : '🧪 Simulasi: Konfirmasi Pembayaran (Dev)'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  page:              { flex: 1, backgroundColor: '#F9FAFB' },
  header:            { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  backBtn:           { padding: 8 },
  backText:          { fontSize: 22, color: '#111827' },
  headerTitle:       { fontSize: 18, fontWeight: '700', color: '#111827' },
  content:           { padding: 16, paddingBottom: 40, gap: 14 },
  card:              { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1 },
  row:               { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel:          { fontSize: 14, color: '#6B7280' },
  rowValue:          { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'right', flex: 1, marginLeft: 16 },
  successCard:       { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#A7F3D0', alignItems: 'center' },
  successTitle:      { fontSize: 18, fontWeight: '700', color: '#065F46' },
  successSub:        { fontSize: 14, color: '#10B981', marginTop: 6 },
  backToBookingBtn:  { marginTop: 16, backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12 },
  backToBookingText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  qrCard:            { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', elevation: 1 },
  qrLabel:           { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 16 },
  qrImage:           { width: 220, height: 220, borderRadius: 8 },
  qrHint:            { fontSize: 12, color: '#9CA3AF', marginTop: 12 },
  simBtn:            { borderWidth: 1.5, borderColor: '#FCD34D', borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFFBEB', borderStyle: 'dashed' },
  simBtnText:        { color: '#92400E', fontWeight: '600', fontSize: 14 },
})
