import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { Link, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'

export default function LoginScreen() {
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin() {
    if (!email || !password) { Alert.alert('Error', 'Email dan password wajib diisi'); return }
    setLoading(true)
    try {
      await login(email.trim(), password)
      router.replace('/(tabs)/')
    } catch (err: any) {
      Alert.alert('Login Gagal', err.response?.data?.error || 'Email atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoIcon}><Text style={s.logoEmoji}>⚡</Text></View>
          <Text style={s.logoTitle}>EV Charging</Text>
          <Text style={s.logoSub}>Booking System</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Masuk Akun</Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="off"
          />

          <Text style={s.label}>Password</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.inputInner}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="off"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Masuk</Text>
            }
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Belum punya akun? </Text>
            <Link href="/(auth)/register"><Text style={s.link}>Daftar</Text></Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f0fdf4' },
  logoWrap:  { alignItems: 'center', marginBottom: 32 },
  logoIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoEmoji: { fontSize: 32 },
  logoTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  logoSub:   { fontSize: 14, color: '#6B7280', marginTop: 2 },
  card:      { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label:     { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:     { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16, backgroundColor: '#F9FAFB' },
  btn:       { backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer:    { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText:{ color: '#6B7280', fontSize: 14 },
  link:      { color: '#10B981', fontWeight: '600', fontSize: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, backgroundColor: '#F9FAFB', marginBottom: 16 },
  inputInner:{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  eyeBtn:    { paddingHorizontal: 12, paddingVertical: 12 },
})
