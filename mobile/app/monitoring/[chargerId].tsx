import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useGlobalSearchParams, router } from 'expo-router'
import { monitoringApi } from '../../services/api'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

export default function MonitoringScreen() {
  const { chargerId } = useLocalSearchParams<{ chargerId: string }>()
  const params = useGlobalSearchParams()
  const stationName = params.station as string || ''
  const chargerType = params.type as string || ''

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  async function load() {
    try {
      const r = await monitoringApi.getCharger(chargerId!)
      setData(r.data); setError(false)
    } catch {
      setError(true)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <View style={s.page}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Monitoring Charger</Text>
          {stationName ? (
            <Text style={s.headerSub}>{stationName}{chargerType ? ` · ${chargerType}` : ''}</Text>
          ) : (
            <Text style={s.headerSub}>Charger aktif Anda</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator color="#10B981" style={{ marginTop: 40 }} />
        ) : error || !data ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📡</Text>
            <Text style={s.emptyTitle}>Data monitoring belum tersedia</Text>
            <Text style={s.emptyDesc}>Data akan muncul saat charger mulai digunakan (status CHARGING).</Text>
            <TouchableOpacity style={s.retryBtn} onPress={load}>
              <Text style={s.retryText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.card}>
            <Row label="Status"    value={data.status || 'UNKNOWN'} />
            <Row label="Daya"      value={data.power_kw   ? `${data.power_kw} kW`   : '—'} />
            <Row label="Voltase"   value={data.voltage_v  ? `${data.voltage_v} V`   : '—'} />
            <Row label="Arus"      value={data.current_a  ? `${data.current_a} A`   : '—'} />
            <Row label="Energi"    value={data.energy_kwh ? `${data.energy_kwh} kWh`: '—'} />
            {data.timestamp && (
              <Text style={s.timestamp}>
                Update terakhir: {new Date(data.timestamp).toLocaleTimeString('id-ID')}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  page:       { flex: 1, backgroundColor: '#F9FAFB' },
  header:     { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  backBtn:    { padding: 8 },
  backText:   { fontSize: 22, color: '#111827' },
  headerTitle:{ fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSub:  { fontSize: 13, color: '#6B7280', marginTop: 2 },
  content:    { padding: 16, paddingBottom: 40 },
  card:       { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel:   { fontSize: 14, color: '#6B7280' },
  rowValue:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  timestamp:  { fontSize: 12, color: '#9CA3AF', marginTop: 12 },
  emptyCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 32, alignItems: 'center', elevation: 1 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptyDesc:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn:   { marginTop: 20, backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12 },
  retryText:  { color: '#fff', fontWeight: '700' },
})
