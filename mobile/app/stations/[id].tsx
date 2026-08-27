import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { stationApi, bookingApi } from '../../services/api'

const CONNECTOR_LABELS: Record<string, string> = {
  AC_TYPE2: 'AC Type 2', DC_CCS2: 'DC CCS2', DC_CHAdeMO: 'DC CHAdeMO', DC_GB_T: 'DC GB/T'
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const today = localDateStr(new Date())
  const [station, setStation] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(today)
  const [slots, setSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return { str: localDateStr(d), d }
  })

  async function loadStation() {
    try {
      const { data } = await stationApi.getById(id!)
      setStation(data)
    } finally { setLoading(false) }
  }

  async function loadSlots(date: string) {
    setSlotsLoading(true); setSelectedSlot(null)
    try {
      const { data } = await stationApi.getSlots(id!, date)
      setSlots(data.chargers ?? [])
    } finally { setSlotsLoading(false) }
  }

  useEffect(() => { loadStation(); loadSlots(today) }, [])

  function isSlotPast(slot: any) {
    if (selectedDate !== today) return false
    const now = new Date()
    const [h, m] = slot.end_time.split(':').map(Number)
    const end = new Date(); end.setHours(h, m, 0, 0)
    return now >= end
  }

  async function handleBook() {
    if (!selectedSlot) return
    // Cek booking aktif pada tanggal ini
    try {
      const { data } = await bookingApi.getAll({ limit: 50 })
      const existing = (data.bookings ?? []).find(
        (b: any) => b.slot_date === selectedDate && ['PENDING_PAYMENT','CONFIRMED','CHARGING'].includes(b.status)
      )
      if (existing) {
        Alert.alert(
          'Sudah Ada Booking',
          `Anda sudah memiliki booking aktif pada ${selectedDate}. Batalkan booking yang ada terlebih dahulu.`,
          [
            { text: 'Lihat Booking', onPress: () => router.push(`/bookings/${existing.id}`) },
            { text: 'Tutup', style: 'cancel' },
          ]
        )
        return
      }
    } catch {}
    router.push(`/stations/${id}/book/${selectedSlot.id}`)
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#10B981" />

  return (
    <View style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.stationName} numberOfLines={1}>{station?.name}</Text>
          <Text style={s.stationAddr} numberOfLines={1}>📍 {station?.address}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Date picker */}
        <Text style={s.sectionTitle}>📅 Pilih Tanggal</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dateScroll}>
          {dates.map(({ str, d }) => {
            const isToday = str === today
            const selected = str === selectedDate
            return (
              <TouchableOpacity
                key={str}
                style={[s.dateBtn, selected && s.dateBtnActive]}
                onPress={() => { setSelectedDate(str); loadSlots(str) }}
              >
                <Text style={[s.dateDow, selected && s.dateTextActive]}>
                  {isToday ? 'Hari ini' : d.toLocaleDateString('id-ID', { weekday: 'short' })}
                </Text>
                <Text style={[s.dateNum, selected && s.dateTextActive]}>{d.getDate()}</Text>
                <Text style={[s.dateMon, selected && s.dateTextActive]}>
                  {d.toLocaleDateString('id-ID', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Slot grid */}
        <Text style={s.sectionTitle}>⏰ Pilih Slot Waktu</Text>
        {slotsLoading ? <ActivityIndicator color="#10B981" /> : slots.map(charger => (
          <View key={charger.id} style={{ marginBottom: 16 }}>
            <Text style={s.chargerLabel}>
              {CONNECTOR_LABELS[charger.connector_type] || charger.connector_type} — {charger.max_power_kw}kW
            </Text>
            <View style={s.slotsGrid}>
              {charger.slots?.map((slot: any) => {
                const past = isSlotPast(slot)
                const avail = slot.status === 'AVAILABLE' && !past
                const sel = selectedSlot?.id === slot.id
                return (
                  <TouchableOpacity
                    key={slot.id}
                    disabled={!avail}
                    onPress={() => setSelectedSlot(sel ? null : slot)}
                    style={[s.slotBtn, sel && s.slotBtnSel, !avail && s.slotBtnDis]}
                  >
                    <Text style={[s.slotTime, sel && s.slotTextSel, !avail && s.slotTextDis]}>
                      {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}
                    </Text>
                    <Text style={[s.slotStatus, sel && s.slotTextSel, !avail && s.slotTextDis]}>
                      {past ? 'Lewat' : avail ? 'Tersedia' : slot.status === 'RESERVED' ? 'Direservasi' : 'Digunakan'}
                    </Text>
                    {avail && (
                      <Text style={[s.slotPrice, sel && s.slotTextSel]}>
                        Rp {parseInt(slot.price_per_kwh).toLocaleString('id-ID')}/kWh
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating book bar */}
      {selectedSlot && (
        <View style={s.bookBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.bookBarTime}>
              {selectedSlot.start_time.slice(0,5)}–{selectedSlot.end_time.slice(0,5)} · {selectedDate}
            </Text>
            <Text style={s.bookBarPrice}>
              Rp {parseInt(selectedSlot.price_per_kwh).toLocaleString('id-ID')}/kWh
            </Text>
          </View>
          <TouchableOpacity style={s.bookBtn} onPress={handleBook}>
            <Text style={s.bookBtnText}>Pesan</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  page:         { flex: 1, backgroundColor: '#F9FAFB' },
  header:       { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  backBtn:      { padding: 8 },
  backText:     { fontSize: 22, color: '#111827' },
  stationName:  { fontSize: 16, fontWeight: '700', color: '#111827' },
  stationAddr:  { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  dateScroll:   { paddingLeft: 16, marginBottom: 4 },
  dateBtn:      { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', marginRight: 8, minWidth: 60 },
  dateBtnActive:{ borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  dateDow:      { fontSize: 11, color: '#6B7280' },
  dateNum:      { fontSize: 18, fontWeight: '700', color: '#111827' },
  dateMon:      { fontSize: 11, color: '#6B7280' },
  dateTextActive:{ color: '#065F46' },
  chargerLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginBottom: 8 },
  slotsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  slotBtn:      { width: '30%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 10, backgroundColor: '#fff', alignItems: 'center' },
  slotBtnSel:   { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  slotBtnDis:   { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  slotTime:     { fontSize: 12, fontWeight: '700', color: '#111827' },
  slotStatus:   { fontSize: 11, color: '#10B981', marginTop: 2 },
  slotPrice:    { fontSize: 10, color: '#6B7280', marginTop: 2 },
  slotTextSel:  { color: '#065F46' },
  slotTextDis:  { color: '#D1D5DB' },
  bookBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 28 },
  bookBarTime:  { fontSize: 14, fontWeight: '700', color: '#111827' },
  bookBarPrice: { fontSize: 13, color: '#10B981', marginTop: 2 },
  bookBtn:      { backgroundColor: '#10B981', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13 },
  bookBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
})
