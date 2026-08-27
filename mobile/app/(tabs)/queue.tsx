import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { queueApi, stationApi } from '../../services/api'

export default function QueueScreen() {
  const [position, setPosition] = useState<any>(null)
  const [stations, setStations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [stationId, setStationId] = useState('')
  const [slotDate, setSlotDate] = useState('')
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)

  async function load() {
    try {
      const [q, s] = await Promise.all([
        queueApi.getMyPosition().catch(() => ({ data: null })),
        stationApi.getAll(),
      ])
      setPosition(q.data?.position != null ? q.data : null)
      setStations(s.data.stations ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()

  async function handleJoin() {
    if (!stationId || !slotDate) { Alert.alert('Error', 'Pilih stasiun dan tanggal'); return }
    setJoining(true)
    try {
      await queueApi.join(stationId, slotDate)
      setShowForm(false)
      load()
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error || 'Gagal masuk antrian')
    } finally { setJoining(false) }
  }

  async function handleLeave() {
    Alert.alert('Keluar Antrian?', 'Anda akan dikeluarkan dari antrian.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
        setLeaving(true)
        try { await queueApi.leave(); load() }
        catch (e: any) { Alert.alert('Gagal', e.response?.data?.error || 'Terjadi kesalahan') }
        finally { setLeaving(false) }
      }}
    ])
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#10B981" />

  return (
    <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={s.title}>Antrian</Text>
      <Text style={s.sub}>Status antrean Anda saat ini</Text>

      {position ? (
        <View style={s.card}>
          <View style={s.posRow}>
            <View>
              <Text style={s.posLabel}>Posisi saat ini</Text>
              <Text style={s.posNum}>#{position.position}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.posLabel}>Perkiraan tunggu</Text>
              <Text style={s.posWait}>{position.estimatedWaitMinutes} menit</Text>
            </View>
          </View>
          <View style={s.divider} />
          <Text style={s.infoText}>Stasiun: <Text style={s.infoVal}>{position.stationId?.slice(0,12)}</Text></Text>
          <Text style={s.infoText}>Tanggal: <Text style={s.infoVal}>{position.slotDate}</Text></Text>
          <Text style={s.infoText}>Total antrian: <Text style={s.infoVal}>{position.total_in_queue} orang</Text></Text>
          <Text style={s.hint}>Halaman ini auto-refresh setiap 15 detik</Text>
          <TouchableOpacity style={s.leaveBtn} onPress={handleLeave} disabled={leaving}>
            <Text style={s.leaveBtnText}>{leaving ? 'Memproses...' : 'Keluar dari Antrian'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.noQueueLabel}>Posisi saat ini</Text>
          <Text style={s.noQueueNum}>—</Text>
          <Text style={s.noQueueDesc}>
            Belum masuk antrian. Gunakan fitur ini jika semua slot di stasiun yang Anda inginkan sudah penuh.
          </Text>

          {!showForm ? (
            <TouchableOpacity style={s.joinBtn} onPress={() => setShowForm(true)}>
              <Text style={s.joinBtnText}>Masuk Antrian</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Text style={s.formLabel}>Pilih Stasiun</Text>
              <View style={s.pickerWrap}>
                <Picker selectedValue={stationId} onValueChange={setStationId}>
                  <Picker.Item label="-- Pilih Stasiun --" value="" />
                  {stations.map(st => (
                    <Picker.Item key={st.id} label={st.name} value={st.id} />
                  ))}
                </Picker>
              </View>

              <Text style={s.formLabel}>Tanggal</Text>
              <TextInputDate value={slotDate} onChange={setSlotDate} min={today} />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[s.joinBtn, { flex: 1 }]} onPress={handleJoin} disabled={joining}>
                  <Text style={s.joinBtnText}>{joining ? 'Memproses...' : 'Konfirmasi'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setShowForm(false)}>
                  <Text style={s.cancelBtnText}>Batal</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

// Simple date input (YYYY-MM-DD text field)
function TextInputDate({ value, onChange, min }: { value: string; onChange: (v: string) => void; min: string }) {
  return (
    <TextInput
      style={s.input}
      placeholder={`YYYY-MM-DD (min: ${min})`}
      value={value}
      onChangeText={onChange}
      keyboardType="numeric"
    />
  )
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title:       { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 8 },
  sub:         { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 1 },
  posRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  posLabel:    { fontSize: 13, color: '#6B7280' },
  posNum:      { fontSize: 40, fontWeight: '800', color: '#3B82F6', marginTop: 4 },
  posWait:     { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  divider:     { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },
  infoText:    { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  infoVal:     { color: '#111827', fontWeight: '600' },
  hint:        { fontSize: 12, color: '#9CA3AF', marginTop: 12, marginBottom: 16 },
  leaveBtn:    { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  leaveBtnText:{ color: '#EF4444', fontWeight: '700', fontSize: 14 },
  noQueueLabel:{ fontSize: 13, color: '#6B7280' },
  noQueueNum:  { fontSize: 32, fontWeight: '800', color: '#9CA3AF', marginTop: 4 },
  noQueueDesc: { fontSize: 14, color: '#6B7280', marginTop: 10, lineHeight: 20 },
  joinBtn:     { backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn:   { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  cancelBtnText:{ color: '#6B7280', fontWeight: '700', fontSize: 15 },
  formLabel:   { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  pickerWrap:  { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, backgroundColor: '#F9FAFB' },
  input:       { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, backgroundColor: '#F9FAFB' },
})
