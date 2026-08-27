import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Zap, MapPin, Calendar, Activity,
  User, LogOut, Settings, ClipboardList, Users
} from 'lucide-react'
import toast from 'react-hot-toast'

const userNavItems = [
  { to: '/',          icon: Activity,      label: 'Dashboard',  end: true },
  { to: '/stations',  icon: MapPin,        label: 'Stasiun' },
  { to: '/bookings',  icon: Calendar,      label: 'Booking' },
  { to: '/queue',     icon: Users,         label: 'Antrian' },
  { to: '/profile',   icon: User,          label: 'Profil' }
]

const adminNavItems = [
  { to: '/',                 icon: Activity,      label: 'Dashboard',     end: true },
  { to: '/admin/bookings',   icon: ClipboardList, label: 'Booking' },
  { to: '/admin/stations',   icon: Settings,      label: 'Stasiun' },
  { to: '/profile',          icon: User,          label: 'Profil' }
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OPERATOR'
  const navItems = isAdmin ? adminNavItems : userNavItems

  const handleLogout = async () => {
    await logout()
    toast.success('Berhasil logout')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Sidebar (desktop only) ──────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">EV Charging</p>
            <p className="text-xs text-gray-500">Booking System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? 'bg-purple-100' : 'bg-green-100'}`}>
              <span className={`font-semibold text-sm ${isAdmin ? 'text-purple-700' : 'text-green-700'}`}>
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{isAdmin ? user?.role : user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Mobile top header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">EV Charging</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAdmin ? 'bg-purple-100' : 'bg-green-100'}`}>
              <span className={`font-semibold text-xs ${isAdmin ? 'text-purple-700' : 'text-green-700'}`}>
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-8 lg:p-8">
          <Outlet />
        </main>

        {/* ── Mobile bottom navigation ──────────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex safe-area-inset-bottom">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-green-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-green-50' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
