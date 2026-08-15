import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../services/api'

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
        set({ user: data.user, accessToken: data.access_token, isAuthenticated: true })
      },

      register: async (registerData) => {
        const { data } = await api.post('/auth/register', registerData)
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
        set({ user: data.user, accessToken: data.access_token, isAuthenticated: true })
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
