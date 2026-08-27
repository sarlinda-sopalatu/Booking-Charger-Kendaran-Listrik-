import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl
} from 'react-native'
import { router } from 'expo-router'
import { stationApi } from '../../services/api'

const CONNECTOR_LABELS: Record<string, string> = {
  ALL: 'Semua', AC_TYPE2: 'AC Type 2', DC_CCS2: 'DC CCS2', DC_CHAdeMO: 'CHAdeMO', DC_GB_T: 'GB/T'
}
const CONNECTORS = ['ALL', 'AC_TYPE2', 'DC_CCS2', 'DC_CHAdeMO', 'DC_GB_T']
const BADGE_COLOR: Record<string, string> = {
  AC_TYPE2: '#3B82F6', DC_CCS2: '#10B981', DC_CHAdeMO: '#F59E0B', DC_GB_T: '#6B7280'
}

export default function StationsScreen() {
  const [stations, setStations] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [connector, setConnector] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(conn = connector) {
    try {
      const params: any = {}
      if (conn !== 'ALL') params.connector_type = conn
      const { data } = await stationApi.getAll(params)
      setStations(data.stations ?? [])
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(stations.filter(s =>
      s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)
    ))
  }, [search, stations])

  async function handleConnector(c: string) {
    setConnector(c); setLoading(true)
    await load(c)
  }

  return (
    <View style={s.page}>
      <Text style={s.title}>Stasiun Pengisian</Text>
      <Text style={s.sub}>Temukan charger kendaraan listrik terdekat</Text>

      <TextInput
        style={s.search}
        placeholder="🔍  Cari nama atau lokasi..."
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
        {CONNECTORS.map(c => (
          <TouchableOpacity
            key={c}
            style={[s.filterBtn, connector === c && s.filterBtnActive]}
            onPress={() => handleConnector(c)}
          >
            <Text style={[s.filterText, connector === c && s.filterTextActive]}>
              {CONNECTOR_LABELS[c]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator color="#10B981" style={{ marginTop: 32 }} /> : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        >
          {filtered.length === 0 ? (
            <Text style={s.empty}>Tidak ada stasiun ditemukan</Text>
          ) : filtered.map(station => (
            <TouchableOpacity
              key={station.id}
              style={s.card}
              onPress={() => router.push(`/stations/${station.id}`)}
            >
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.stationName}>{station.name}</Text>
                  <Text style={s.stationAddr}>📍 {station.address}</Text>
                </View>
                <View style={[s.statusDot, { backgroundColor: station.status === 'ACTIVE' ? '#10B981' : '#EF4444' }]} />
              </View>
              <View style={s.chargerRow}>
                {station.chargers?.map((c: any) => (
                  <View key={c.id} style={[s.chargerBadge, { backgroundColor: (BADGE_COLOR[c.connector_type] ?? '#6B7280') + '20' }]}>
                    <Text style={[s.chargerBadgeText, { color: BADGE_COLOR[c.connector_type] ?? '#6B7280' }]}>
                      {CONNECTOR_LABELS[c.connector_type] || c.connector_type} · {c.max_power_kw}kW
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={s.slotLink}>{station.chargers?.length || 0} charger  →  Lihat slot</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  page:            { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title:           { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 8 },
  sub:             { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  search:          { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, backgroundColor: '#fff', marginBottom: 12 },
  filterScroll:    { maxHeight: 44, marginBottom: 14 },
  filterBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff', marginRight: 8 },
  filterBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  filterText:      { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  filterTextActive:{ color: '#fff' },
  card:            { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1, shadowOpacity: 0.04, shadowRadius: 6 },
  cardHeader:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stationName:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  stationAddr:     { fontSize: 12, color: '#6B7280', marginTop: 3 },
  statusDot:       { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  chargerRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chargerBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chargerBadgeText:{ fontSize: 11, fontWeight: '600' },
  slotLink:        { fontSize: 12, color: '#10B981', fontWeight: '600' },
  empty:           { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
})
