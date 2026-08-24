import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from './store/authStore'
import Layout from './components/common/Layout'
import OfflineBanner from './components/common/OfflineBanner'
import { getOfflineMode, subscribeOfflineMode } from './services/api'
import { useUiConfigStore } from './store/uiConfigStore'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import StationsPage from './pages/StationsPage'
import StationDetailPage from './pages/StationDetailPage'
import BookingPage from './pages/BookingPage'
import BookingsPage from './pages/BookingsPage'
import QueuePage from './pages/QueuePage'
import ProfilePage from './pages/ProfilePage'
import AdminDisplayControlPage from './pages/AdminDisplayControlPage'
import AdminAuditLogPage from './pages/AdminAuditLogPage'
import AdminPricingUsersPage from './pages/AdminPricingUsersPage'


function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return isAuthenticated
    ? <>{children}</>
    : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)

  return user?.role === 'ADMIN'
    ? <>{children}</>
    : <Navigate to="/" replace />
}


export default function App() {
  const [isOfflineMode, setIsOfflineMode] = useState(getOfflineMode())
  const uiConfig = useUiConfigStore((s) => s.config)

  useEffect(() => {
    return subscribeOfflineMode(setIsOfflineMode)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--ev-accent', uiConfig.accentColor)
    root.style.setProperty('--ev-accent-dark', uiConfig.accentDarkColor)
    root.style.setProperty('--ev-bg-1', uiConfig.bgColorStart)
    root.style.setProperty('--ev-bg-2', uiConfig.bgColorEnd)
  }, [uiConfig])

  return (
    <BrowserRouter>

      {isOfflineMode && <OfflineBanner />}

      <Routes>

        {/* Halaman tanpa login */}
        <Route 
          path="/login" 
          element={<LoginPage />} 
        />

        <Route 
          path="/register" 
          element={<RegisterPage />} 
        />


        {/* Halaman setelah login */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >

          <Route
            index
            element={<DashboardPage />}
          />

          <Route
            path="stations"
            element={<StationsPage />}
          />

          <Route
            path="stations/:id"
            element={<StationDetailPage />}
          />

          <Route
            path="stations/:id/book/:slotId"
            element={<BookingPage />}
          />

          <Route
            path="bookings"
            element={<BookingsPage />}
          />

          <Route
            path="bookings/:bookingId"
            element={<BookingsPage />}
          />

          <Route
            path="queue"
            element={<QueuePage />}
          />

          <Route
            path="profile"
            element={<ProfilePage />}
          />

          <Route
            path="admin/display-control"
            element={
              <AdminRoute>
                <AdminDisplayControlPage />
              </AdminRoute>
            }
          />

          <Route
            path="admin/audit-log"
            element={
              <AdminRoute>
                <AdminAuditLogPage />
              </AdminRoute>
            }
          />

          <Route
            path="admin/pricing-users"
            element={
              <AdminRoute>
                <AdminPricingUsersPage />
              </AdminRoute>
            }
          />

        </Route>


        {/* Jika halaman tidak ditemukan */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>

    </BrowserRouter>
  )
}