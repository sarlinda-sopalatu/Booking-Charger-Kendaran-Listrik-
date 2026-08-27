import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native'
import { router } from 'expo-router'
import { stationApi, adminApi } from '../../services/api'

export default function AdminStationsScreen() {
  const [stations, setStations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const { data } = await stationApi.getAll({ limit: 100 })
      setStations(data.stations ?? [])
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, name: string) {
    Alert.alert('Hapus Stasiun?', `"${name}" akan dihapus secara permanen.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try {
          await adminApi.deleteStation(id)
          load()
        } catch (e: any) {
          Alert.alert('Gagal', e.response?.data?.error || 'Gagal menghapus stasiun')
        }
      }}
    ])
  }

  async function handleToggleStatus(station: any) {
    const newStatus = station.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await adminApi.updateStation(station.id, { status: newStatus })
      load()
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error || 'Gagal mengubah status')
    }
  }

  return (
    <View style={s.page}>
      <View style={s.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Kelola Stasiun</Text>
      </View>

      {loading ? <ActivityIndicator color="#10B981" style={{ marginTop: 40 }} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        >
          {stations.map(station => (
            <View key={station.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.stationName}>{station.name}</Text>
                  <Text style={s.stationAddr}>📍 {station.address}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: station.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: station.status === 'ACTIVE' ? '#065F46' : '#991B1B' }}>
                    {station.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                  </Text>
                </View>
              </View>
              <Text style={s.chargerCount}>{station.chargers?.length || 0} charger terdaftar</Text>
              <View style={s.actions}>
                <TouchableOpacity style={s.toggleBtn} onPress={() => handleToggleStatus(station)}>
                  <Text style={s.toggleText}>
                    {station.status === 'ACTIVE' ? '⏸ Nonaktifkan' : '▶ Aktifkan'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(station.id, station.name)}>
                  <Text style={s.deleteText}>🗑 Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: '#F9FAFB' },
  pageHeader:  { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  backBtn:     { padding: 8 },
  backText:    { fontSize: 22, color: '#111827' },
  title:       { fontSize: 18, fontWeight: '700', color: '#111827' },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  stationName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  stationAddr: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chargerCount:{ fontSize: 13, color: '#6B7280', marginBottom: 12 },
  actions:     { flexDirection: 'row', gap: 10 },
  toggleBtn:   { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  toggleText:  { fontSize: 13, fontWeight: '600', color: '#374151' },
  deleteBtn:   { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  deleteText:  { fontSize: 13, fontWeight: '600', color: '#EF4444' },
})
