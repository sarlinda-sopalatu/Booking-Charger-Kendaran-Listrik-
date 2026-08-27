import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { Link, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'

export default function RegisterScreen() {
  const { register } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', ev_plate: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Error', 'Nama, email, dan password wajib diisi'); return
    }
    if (form.password.length < 8) {
      Alert.alert('Error', 'Password minimal 8 karakter'); return
    }
    setLoading(true)
    try {
      await register(form)
      router.replace('/(tabs)/')
    } catch (err: any) {
      Alert.alert('Registrasi Gagal', err.response?.data?.error || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={s.logoWrap}>
          <View style={s.logoIcon}><Text style={s.logoEmoji}>⚡</Text></View>
          <Text style={s.logoTitle}>EV Charging</Text>
          <Text style={s.logoSub}>Buat akun baru</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Daftar Akun</Text>

          {([
            { label: 'Nama Lengkap', key: 'name', placeholder: 'Budi Santoso' },
            { label: 'Email', key: 'email', placeholder: 'email@example.com', keyboard: 'email-address' as const, lower: true },
          ] as any[]).map(f => (
            <View key={f.key}>
              <Text style={s.label}>{f.label}</Text>
              <TextInput
                style={s.input}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChangeText={set(f.key as keyof typeof form)}
                keyboardType={f.keyboard || 'default'}
                autoCapitalize={f.lower ? 'none' : 'words'}
                autoComplete="off"
              />
            </View>
          ))}

          <Text style={s.label}>Password</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.inputInner}
              placeholder="Minimal 8 karakter"
              value={form.password}
              onChangeText={set('password')}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="off"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {([
            { label: 'Nomor HP (opsional)', key: 'phone', placeholder: '+628123456789', keyboard: 'phone-pad' as const },
            { label: 'Nomor Plat (opsional)', key: 'ev_plate', placeholder: 'B 1234 EV' },
          ] as any[]).map(f => (
            <View key={f.key}>
              <Text style={s.label}>{f.label}</Text>
              <TextInput
                style={s.input}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChangeText={set(f.key as keyof typeof form)}
                keyboardType={f.keyboard || 'default'}
                autoCapitalize="words"
                autoComplete="off"
              />
            </View>
          ))}

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Buat Akun</Text>
            }
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Sudah punya akun? </Text>
            <Link href="/(auth)/login"><Text style={s.link}>Masuk</Text></Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f0fdf4' },
  logoWrap:  { alignItems: 'center', marginBottom: 28 },
  logoIcon:  { width: 56, height: 56, borderRadius: 16, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoEmoji: { fontSize: 28 },
  logoTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  logoSub:   { fontSize: 13, color: '#6B7280', marginTop: 2 },
  card:      { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  label:     { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input:     { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, marginBottom: 14, backgroundColor: '#F9FAFB' },
  btn:       { backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer:    { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  footerText:{ color: '#6B7280', fontSize: 14 },
  link:      { color: '#10B981', fontWeight: '600', fontSize: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, backgroundColor: '#F9FAFB', marginBottom: 14 },
  inputInner:{ flex: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  eyeBtn:    { paddingHorizontal: 12, paddingVertical: 11 },
})
