import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../store/authStore'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OPERATOR'

  async function handleLogout() {
    Alert.alert('Logout?', 'Anda akan keluar dari akun ini.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout()
        router.replace('/(auth)/login')
      }}
    ])
  }

  const fields = [
    { label: 'Nama Lengkap', value: user?.name },
    { label: 'Email', value: user?.email },
    { label: 'Nomor HP', value: user?.phone || '-' },
    { label: 'Plat Kendaraan', value: user?.ev_plate || '-' },
    { label: 'Role', value: user?.role },
  ]

  return (
    <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>Profil</Text>

      {/* Avatar */}
      <View style={s.avatarWrap}>
        <View style={[s.avatar, isAdmin && { backgroundColor: '#7C3AED' }]}>
          <Text style={s.avatarChar}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.email}>{user?.email}</Text>
        {isAdmin && (
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{user?.role}</Text>
          </View>
        )}
      </View>

      {/* Detail */}
      <View style={s.card}>
        {fields.map(({ label, value }) => (
          <View key={label} style={s.row}>
            <Text style={s.rowLabel}>{label}</Text>
            <Text style={s.rowValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Admin shortcuts */}
      {isAdmin && (
        <View style={s.card}>
          <Text style={s.sectionLabel}>Menu Admin</Text>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push('/admin/bookings')}>
            <Text style={s.menuText}>📋  Semua Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push('/admin/stations')}>
            <Text style={s.menuText}>⚙️  Kelola Stasiun</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title:       { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 20 },
  avatarWrap:  { alignItems: 'center', marginBottom: 24 },
  avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarChar:  { fontSize: 36, fontWeight: '800', color: '#fff' },
  name:        { fontSize: 20, fontWeight: '700', color: '#111827' },
  email:       { fontSize: 14, color: '#6B7280', marginTop: 4 },
  roleBadge:   { marginTop: 8, backgroundColor: '#EDE9FE', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  roleText:    { color: '#7C3AED', fontSize: 13, fontWeight: '700' },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 1 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel:    { fontSize: 13, color: '#6B7280' },
  rowValue:    { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'right', flex: 1, marginLeft: 16 },
  sectionLabel:{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  menuItem:    { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuText:    { fontSize: 15, color: '#374151', fontWeight: '600' },
  logoutBtn:   { backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  logoutText:  { color: '#EF4444', fontWeight: '700', fontSize: 16 },
})
