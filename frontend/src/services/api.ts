import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// Response interceptor — auto refresh token jika 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

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

// Stations
export const stationApi = {
  getAll:   (params?: any) => api.get('/stations', { params }),
  getById:  (id: string) => api.get(`/stations/${id}`),
  getSlots: (id: string, date: string) => api.get(`/stations/${id}/slots`, { params: { date } })
}

// Bookings
export const bookingApi = {
  create: (slotId: string, notes?: string) => api.post('/bookings', { slot_id: slotId, ...(notes && notes.trim() ? { notes: notes.trim() } : {}) }),
  getAll: (params?: any) => api.get('/bookings', { params }),
  getById:(id: string)   => api.get(`/bookings/${id}`),
  cancel: (id: string, reason?: string) => api.put(`/bookings/${id}/cancel`, { reason }),
  // Cek apakah user punya booking aktif pada tanggal tertentu
  getActiveOnDate: (date: string) =>
    api.get('/bookings', { params: { limit: 5, status: 'CONFIRMED' } })
      .then(r => (r.data.bookings ?? []).find((b: any) => b.slot_date === date) || null)
      .catch(() => null),
}

// Queue
export const queueApi = {
  join:           (stationId: string, slotDate: string) => api.post('/queue/join', { station_id: stationId, slot_date: slotDate }),
  getStationQueue:(stationId: string)  => api.get(`/queue/station/${stationId}`),
  getMyPosition:  ()                   => api.get('/queue/position/me'),
  leave:          ()                   => api.delete('/queue/leave')
}

// Payments
export const paymentApi = {
  initiate: (bookingId: string, method: string) => api.post('/payments/initiate', { booking_id: bookingId, method }),
  getById:  (id: string)          => api.get(`/payments/${id}`),
  getByBooking: (bookingId: string) => api.get(`/payments/booking/${bookingId}`),
  getHistory: (params?: any)      => api.get('/payments', { params }),
  simulateConfirm: (paymentId: string) => api.post(`/payments/${paymentId}/simulate-confirm`)
}

// Monitoring
export const monitoringApi = {
  getStation: (stationId: string) => api.get(`/monitoring/station/${stationId}`),
  getCharger: (chargerId: string, params?: any) => api.get(`/monitoring/chargers/${chargerId}/latest`, { params }),
  getChargerInfo: (chargerId: string) => api.get(`/stations/chargers/${chargerId}`),
}

// Sessions (Charging)
export const sessionApi = {
  start:      (bookingId: string, chargerId: string, tariffPerKwh?: number) =>
    api.post('/sessions/start', { booking_id: bookingId, charger_id: chargerId, energy_kwh_start: 0, tariff_per_kwh: tariffPerKwh ?? 2500 }),
  stop:       (sessionId: string, energyKwhEnd: number) =>
    api.put(`/sessions/${sessionId}/stop`, { energy_kwh_end: energyKwhEnd, stop_reason: 'MANUAL' }),
  getByBooking: (bookingId: string) => api.get(`/sessions/booking/${bookingId}`),
  getById:    (sessionId: string)  => api.get(`/sessions/${sessionId}`)
}

// Admin
export const adminApi = {
  // Semua booking
  getAllBookings: (params?: any) => api.get('/bookings', { params: { all: 'true', ...params } }),
  // Kelola stasiun
  createStation:  (data: any)    => api.post('/stations', data),
  updateStation:  (id: string, data: any) => api.put(`/stations/${id}`, data),
  deleteStation:  (id: string)   => api.delete(`/stations/${id}`),
  // Update harga slot
  updateSlotPrice: (chargerId: string, slotId: string, price: number) =>
    api.patch(`/stations/chargers/${chargerId}/slots/${slotId}/price`, { price_per_kwh: price }),
}
