import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// ⚠️ Ganti IP ini dengan IP mesin kamu di jaringan lokal
// Cek dengan: ipconfig (Windows) → IPv4 Address
// Contoh: http://192.168.1.10:5173/api
export const API_BASE_URL = 'http://10.136.145.221:3000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token dari SecureStore ke setiap request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Auto refresh jika 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token')
        if (!refreshToken) {
          // Tidak ada refresh token — bersihkan dan reject dengan error yang sama
          await SecureStore.deleteItemAsync('access_token').catch(() => {})
          return Promise.reject(err)
        }
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        })
        await SecureStore.setItemAsync('access_token', data.access_token)
        original.headers['Authorization'] = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        // Refresh gagal — bersihkan semua token
        await SecureStore.deleteItemAsync('access_token').catch(() => {})
        await SecureStore.deleteItemAsync('refresh_token').catch(() => {})
        delete api.defaults.headers.common['Authorization']
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  logout:   () => api.post('/auth/logout'),
}

// ── Stations ──────────────────────────────────────────────────────────────────
export const stationApi = {
  getAll:   (params?: any) => api.get('/stations', { params }),
  getById:  (id: string) => api.get(`/stations/${id}`),
  getSlots: (id: string, date: string) => api.get(`/stations/${id}/slots`, { params: { date } }),
}

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingApi = {
  create: (slotId: string, notes?: string) =>
    api.post('/bookings', { slot_id: slotId, ...(notes?.trim() ? { notes: notes.trim() } : {}) }),
  getAll: (params?: any) => api.get('/bookings', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  cancel:  (id: string, reason?: string) => api.put(`/bookings/${id}/cancel`, { reason }),
}

// ── Queue ─────────────────────────────────────────────────────────────────────
export const queueApi = {
  join:          (stationId: string, slotDate: string) =>
    api.post('/queue/join', { station_id: stationId, slot_date: slotDate }),
  getMyPosition: () => api.get('/queue/position/me'),
  leave:         () => api.delete('/queue/leave'),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  initiate:        (bookingId: string, method: string) =>
    api.post('/payments/initiate', { booking_id: bookingId, method }),
  getByBooking:    (bookingId: string) => api.get(`/payments/booking/${bookingId}`),
  simulateConfirm: (paymentId: string) => api.post(`/payments/${paymentId}/simulate-confirm`),
}

// ── Monitoring ────────────────────────────────────────────────────────────────
export const monitoringApi = {
  getCharger: (chargerId: string) => api.get(`/monitoring/chargers/${chargerId}/latest`),
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessionApi = {
  getByBooking: (bookingId: string) => api.get(`/sessions/booking/${bookingId}`),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getAllBookings:  (params?: any) => api.get('/bookings', { params: { all: 'true', ...params } }),
  createStation:  (data: any)    => api.post('/stations', data),
  updateStation:  (id: string, data: any) => api.put(`/stations/${id}`, data),
  deleteStation:  (id: string)   => api.delete(`/stations/${id}`),
}
