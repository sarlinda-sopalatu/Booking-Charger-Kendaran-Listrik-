import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { bookingApi } from '../../../../services/api'

export default function BookingConfirmScreen() {
  const { id: stationId, slotId } = useLocalSearchParams<{ id: string; slotId: string }>()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      const { data } = await bookingApi.create(slotId!, notes)
      Alert.alert('Berhasil!', 'Booking berhasil dibuat.', [
        { text: 'Lihat Booking', onPress: () => router.replace(`/bookings/${data.id}`) }
      ])
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error || 'Booking gagal, coba lagi')
    } finally { setLoading(false) }
  }

  return (
    <View style={s.page}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Konfirmasi Booking</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Detail Slot</Text>
          <View style={s.slotBox}>
            <Text style={s.slotIcon}>⚡</Text>
            <View>
              <Text style={s.slotLabel}>Slot Terpilih</Text>
              <Text style={s.slotId}>ID: {slotId?.slice(0, 8).toUpperCase()}</Text>
            </View>
          </View>
          <Text style={s.notice}>
            ⏱ Anda memiliki 30 menit untuk menyelesaikan pembayaran setelah booking dibuat.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Catatan (opsional)</Text>
          <TextInput
            style={s.textarea}
            placeholder="Tambahkan catatan untuk operator stasiun..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={s.infoCard}>
          <Text style={s.infoTitle}>💳 Informasi Pembayaran</Text>
          <Text style={s.infoDesc}>
            Pembayaran dilakukan setelah booking dikonfirmasi. Tagihan dihitung berdasarkan energi yang terpakai (kWh) setelah pengisian selesai.
          </Text>
        </View>

        <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.confirmText}>Konfirmasi Booking</Text>
          }
        </TouchableOpacity>
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
  content:     { padding: 16, paddingBottom: 40, gap: 14 },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1 },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  slotBox:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#A7F3D0' },
  slotIcon:    { fontSize: 24 },
  slotLabel:   { fontSize: 14, fontWeight: '700', color: '#065F46' },
  slotId:      { fontSize: 12, color: '#6B7280', marginTop: 2 },
  notice:      { fontSize: 13, color: '#6B7280', marginTop: 12, lineHeight: 18 },
  textarea:    { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', backgroundColor: '#F9FAFB' },
  infoCard:    { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  infoTitle:   { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  infoDesc:    { fontSize: 13, color: '#3B82F6', lineHeight: 18 },
  confirmBtn:  { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
