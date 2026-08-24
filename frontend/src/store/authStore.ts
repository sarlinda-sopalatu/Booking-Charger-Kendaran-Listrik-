import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../services/api'
import { authenticateOffline, registerOffline } from '../services/authFallback'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  ev_plate?: string
  role: 'USER' | 'OPERATOR' | 'ADMIN'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login:    (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout:   () => Promise<void>
  setToken: (token: string) => void
}

interface RegisterData {
  email: string; password: string; name: string; phone?: string; ev_plate?: string;
}

function isBackendUnavailable(error: any) {
  const status = Number(error?.response?.status || 0)
  const message = String(error?.message || '')
  return !error?.response || (status >= 500 && status < 600) || message.includes('ECONNREFUSED')
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const { data } = await api.post('/auth/login', { email, password })

          api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`

          set({
            user: data.user,
            accessToken: data.access_token,
            isAuthenticated: true
          })
        } catch (error: any) {
          if (!isBackendUnavailable(error)) {
            throw error
          }

          const offlineUser = authenticateOffline(email, password)
          if (!offlineUser) {
            const authError: any = new Error('Akun tidak ada di data offline atau password salah.')
            authError.offlineCredentialError = true
            authError.response = {
              status: 401,
              data: { error: 'Akun tidak ada di data offline atau password salah.' }
            }
            throw authError
          }

          const offlineToken = `offline-token-${Date.now()}`
          api.defaults.headers.common['Authorization'] = `Bearer ${offlineToken}`
          set({
            user: offlineUser,
            accessToken: offlineToken,
            isAuthenticated: true
          })
        }
      },

      register: async (registerData) => {
        try {
          const { data } = await api.post('/auth/register', registerData)

          api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`

          set({
            user: data.user,
            accessToken: data.access_token,
            isAuthenticated: true
          })
        } catch (error: any) {
          if (!isBackendUnavailable(error)) {
            throw error
          }

          const offlineUser = registerOffline(registerData)
          if (!offlineUser) {
            const registerError: any = new Error('Email sudah terdaftar di mode offline.')
            registerError.response = {
              status: 409,
              data: { error: 'Email sudah terdaftar di mode offline.' }
            }
            throw registerError
          }

          const offlineToken = `offline-token-${Date.now()}`
          api.defaults.headers.common['Authorization'] = `Bearer ${offlineToken}`
          set({
            user: offlineUser,
            accessToken: offlineToken,
            isAuthenticated: true
          })
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout') } catch {}
        delete api.defaults.headers.common['Authorization']
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      setToken: (token) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        set({ accessToken: token })
      }
    }),
    {
      name: 'ev-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`
        }
      }
    }
  )
)
