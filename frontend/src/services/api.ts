import axios from 'axios'
import { getFallbackStationById, getFallbackStations, getFallbackSlots } from './stationFallback'

const OFFLINE_BOOKINGS_KEY = 'ev-offline-bookings'
let offlineMode = false
const offlineModeListeners = new Set<(value: boolean) => void>()

function setOfflineMode(value: boolean) {
  if (offlineMode === value) return
  offlineMode = value
  offlineModeListeners.forEach((listener) => listener(value))
}

export function getOfflineMode() {
  return offlineMode
}

export function subscribeOfflineMode(listener: (value: boolean) => void) {
  offlineModeListeners.add(listener)
  return () => {
    offlineModeListeners.delete(listener)
  }
}

function nowIso() {
  return new Date().toISOString()
}

function readOfflineBookings() {
  try {
    const raw = window.localStorage.getItem(OFFLINE_BOOKINGS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeOfflineBookings(bookings: any[]) {
  window.localStorage.setItem(OFFLINE_BOOKINGS_KEY, JSON.stringify(bookings))
}

function createOfflineBooking(slotId: string, notes?: string) {
  const booking = {
    id: `offline-${Date.now()}`,
    slot_id: slotId,
    notes: notes || '',
    status: 'PENDING_PAYMENT',
    created_at: nowIso(),
    updated_at: nowIso()
  }
  const bookings = readOfflineBookings()
  bookings.unshift(booking)
  writeOfflineBookings(bookings)
  return booking
}

function cancelOfflineBooking(id: string, reason?: string) {
  const bookings = readOfflineBookings()
  const next = bookings.map((b: any) =>
    b.id === id
      ? { ...b, status: 'CANCELLED', cancel_reason: reason || 'Dibatalkan', updated_at: nowIso() }
      : b
  )
  writeOfflineBookings(next)
  return next.find((b: any) => b.id === id) || null
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// Response interceptor — auto refresh token jika 401
api.interceptors.response.use(
  (res) => {
    setOfflineMode(false)
    return res
  },
  async (err) => {
    const originalRequest = err.config

    const status = Number(err?.response?.status || 0)
    if (!err?.response || (status >= 500 && status < 600)) {
      setOfflineMode(true)
    }

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const { data } = await api.post('/auth/refresh')
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
        originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`
        return api(originalRequest)
      } catch {
        // Refresh gagal — redirect ke login
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ---- API Service functions ----

// Auth
export const authApi = {
  login:    (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  logout:   () => api.post('/auth/logout'),
  refresh:  () => api.post('/auth/refresh')
}

// Users
export const userApi = {
  me: () => api.get('/users/me'),
  updateMe: (data: { name?: string; phone?: string; ev_plate?: string }) => api.put('/users/me', data)
}

// Stations
export const stationApi = {
  getAll: async (params?: any) => {
    try {
      return await api.get('/stations', { params })
    } catch {
      const connectorType = params?.connector_type
      const stations = getFallbackStations(connectorType)
      return Promise.resolve({ data: { stations, total: stations.length } } as any)
    }
  },
  getById: async (id: string) => {
    try {
      return await api.get(`/stations/${id}`)
    } catch {
      const station = getFallbackStationById(id)
      if (!station) {
        throw new Error('Stasiun tidak ditemukan')
      }
      return Promise.resolve({ data: station } as any)
    }
  },
  getSlots: async (id: string, date: string) => {
    try {
      return await api.get(`/stations/${id}/slots`, { params: { date } })
    } catch {
      const payload = getFallbackSlots(id, date)
      return Promise.resolve({ data: payload } as any)
    }
  }
}

// Bookings
export const bookingApi = {
  create: async (slotId: string, notes?: string) => {
    try {
      return await api.post('/bookings', { slot_id: slotId, notes })
    } catch {
      const booking = createOfflineBooking(slotId, notes)
      return Promise.resolve({ data: booking } as any)
    }
  },
  getAll: async (params?: any) => {
    try {
      return await api.get('/bookings', { params })
    } catch {
      const all = readOfflineBookings()
      const limit = Number(params?.limit || all.length)
      const bookings = all.slice(0, limit)
      return Promise.resolve({ data: { bookings, total: all.length } } as any)
    }
  },
  getById: async (id: string) => {
    try {
      return await api.get(`/bookings/${id}`)
    } catch {
      const booking = readOfflineBookings().find((b: any) => b.id === id) || null
      if (!booking) {
        throw new Error('Booking tidak ditemukan')
      }
      return Promise.resolve({ data: { booking } } as any)
    }
  },
  cancel: async (id: string, reason?: string) => {
    try {
      return await api.put(`/bookings/${id}/cancel`, { reason })
    } catch {
      const booking = cancelOfflineBooking(id, reason)
      if (!booking) {
        throw new Error('Booking tidak ditemukan')
      }
      return Promise.resolve({ data: booking } as any)
    }
  }
}

// Queue
export const queueApi = {
  join: async (stationId: string, slotDate: string) => {
    try {
      return await api.post('/queue/join', { station_id: stationId, slot_date: slotDate })
    } catch {
      return Promise.resolve({
        data: {
          station_id: stationId,
          slot_date: slotDate,
          position: 1,
          estimated_wait_minutes: 10,
          offline_mode: true
        }
      } as any)
    }
  },
  getStationQueue: async (stationId: string) => {
    try {
      return await api.get(`/queue/station/${stationId}`)
    } catch {
      return Promise.resolve({ data: { station_id: stationId, queue: [] } } as any)
    }
  },
  getMyPosition: async () => {
    try {
      return await api.get('/queue/position/me')
    } catch {
      return Promise.resolve({ data: null } as any)
    }
  },
  leave: async () => {
    try {
      return await api.delete('/queue/leave')
    } catch {
      return Promise.resolve({ data: { message: 'Offline mode: keluar antrian lokal' } } as any)
    }
  }
}

// Payments
export const paymentApi = {
  initiate: (bookingId: string, method: string) => api.post('/payments/initiate', { booking_id: bookingId, method }),
  getById:  (id: string)          => api.get(`/payments/${id}`),
  getByBooking: (bookingId: string) => api.get(`/payments/booking/${bookingId}`),
  getHistory: (params?: any)      => api.get('/payments', { params })
}

// Monitoring
export const monitoringApi = {
  getStation: (stationId: string) => api.get(`/monitoring/station/${stationId}`),
  getCharger: (chargerId: string, params?: any) => api.get(`/monitoring/charger/${chargerId}`, { params })
}
