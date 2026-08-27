import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { authApi, api } from '../services/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  ev_plate?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token')
      if (!token) { set({ isLoading: false }); return }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const { data } = await api.get('/users/me')
      set({ user: data, isAuthenticated: true, isLoading: false })
    } catch {
      // Token expired atau invalid — bersihkan semua, arahkan ke login
      await SecureStore.deleteItemAsync('access_token').catch(() => {})
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {})
      await SecureStore.deleteItemAsync('user').catch(() => {})
      delete api.defaults.headers.common['Authorization']
      set({ user: null, isAuthenticated: false, isLoading: false })
      // Jangan re-throw — biarkan app redirect ke login
    }
  },

  login: async (email, password) => {
    const { data } = await authApi.login(email, password)
    const { access_token, refresh_token, user } = data
    await SecureStore.setItemAsync('access_token', access_token)
    if (refresh_token) await SecureStore.setItemAsync('refresh_token', refresh_token)
    await SecureStore.setItemAsync('user', JSON.stringify(user))
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    set({ user, isAuthenticated: true })
  },

  register: async (formData) => {
    const { data } = await authApi.register(formData)
    const { access_token, refresh_token, user } = data
    await SecureStore.setItemAsync('access_token', access_token)
    if (refresh_token) await SecureStore.setItemAsync('refresh_token', refresh_token)
    await SecureStore.setItemAsync('user', JSON.stringify(user))
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    set({ user, isAuthenticated: true })
  },

  logout: async () => {
    try { await authApi.logout() } catch {}
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    await SecureStore.deleteItemAsync('user')
    delete api.defaults.headers.common['Authorization']
    set({ user: null, isAuthenticated: false })
  },
}))
