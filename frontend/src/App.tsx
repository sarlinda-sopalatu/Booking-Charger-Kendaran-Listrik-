import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/common/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import StationsPage from './pages/StationsPage'
import StationDetailPage from './pages/StationDetailPage'
import BookingPage from './pages/BookingPage'
import BookingsPage from './pages/BookingsPage'
import BookingDetailPage from './pages/BookingDetailPage'
import PaymentPage from './pages/PaymentPage'
import MonitoringPage from './pages/MonitoringPage'
import QueuePage from './pages/QueuePage'
import ProfilePage from './pages/ProfilePage'
import AdminBookingsPage from './pages/AdminBookingsPage'
import AdminStationsPage from './pages/AdminStationsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!['ADMIN', 'OPERATOR'].includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index                                element={<DashboardPage />} />
          <Route path="stations"                      element={<StationsPage />} />
          <Route path="stations/:id"                  element={<StationDetailPage />} />
          <Route path="stations/:id/book/:slotId"     element={<BookingPage />} />
          <Route path="bookings"                      element={<BookingsPage />} />
          <Route path="bookings/:id"                  element={<BookingDetailPage />} />
          <Route path="bookings/:id/pay"              element={<PaymentPage />} />
          <Route path="monitoring/:chargerId"         element={<MonitoringPage />} />
          <Route path="queue"                         element={<QueuePage />} />
          <Route path="profile"                       element={<ProfilePage />} />

          {/* Admin-only routes */}
          <Route path="admin/bookings"  element={<AdminRoute><AdminBookingsPage /></AdminRoute>} />
          <Route path="admin/stations"  element={<AdminRoute><AdminStationsPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
