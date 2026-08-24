import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Zap, MapPin, Calendar, Activity,
  Users, User, LogOut, Menu, SlidersHorizontal, ClipboardList, CircleDollarSign, Crown, ShieldCheck
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useUiConfigStore } from '../../store/uiConfigStore'

const navItems = [
  { to: '/',           icon: Activity,  label: 'Dashboard',  end: true },
  { to: '/stations',   icon: MapPin,    label: 'Stasiun' },
  { to: '/bookings',   icon: Calendar,  label: 'Booking' },
  { to: '/queue',      icon: Users,     label: 'Antrian' },
  { to: '/profile',    icon: User,      label: 'Profil' }
]

const adminNavItems = [
  { to: '/admin/display-control', icon: SlidersHorizontal, label: 'Admin Display', end: false },
  { to: '/admin/pricing-users', icon: CircleDollarSign, label: 'Admin Harga & User', end: false },
  { to: '/admin/audit-log', icon: ClipboardList, label: 'Admin Audit Log', end: false }
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const uiConfig = useUiConfigStore((s) => s.config)
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = user?.role === 'ADMIN'
  const renderedNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems
  const rolePillClass = user?.role === 'ADMIN'
    ? 'role-pill-admin'
    : user?.role === 'OPERATOR'
      ? 'role-pill-operator'
      : 'role-pill-user'

  const handleLogout = async () => {
    await logout()
    toast.success('Berhasil logout')
    navigate('/login')
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -left-24 h-64 w-64 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 backdrop-blur-md border-r flex flex-col
        ${isAdmin
          ? 'bg-sky-50/85 border-sky-200/80'
          : 'bg-white/85 border-slate-200/70'}
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-auto
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-6 py-5 border-b ${isAdmin ? 'border-sky-200/80' : 'border-slate-200/70'}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-700 rounded-xl flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">{uiConfig.appName}</p>
            <p className="text-xs text-slate-500">{uiConfig.appTagline}</p>
            {isAdmin && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700">
                <Crown size={11} /> Admin Console
              </p>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {renderedNavItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? isAdmin
                      ? 'bg-gradient-to-r from-sky-100 to-cyan-50 text-sky-800 border border-sky-200/80 shadow-sm'
                      : 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-800 border border-green-200/70 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="mt-auto border-t border-slate-200/70 p-4 bg-white/75 backdrop-blur">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-green-700 font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <span className={`mt-1 ${rolePillClass}`}>Role: {user?.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="group flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-semibold
                       text-red-700 border border-red-200 rounded-xl bg-red-50/70
                       hover:bg-red-100 hover:border-red-300 hover:text-red-800 transition-all duration-200"
          >
            <LogOut size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {/* Top bar (mobile) */}
        <header className={`lg:hidden flex items-center gap-3 px-4 py-3 backdrop-blur border-b ${
          isAdmin ? 'bg-sky-50/90 border-sky-200/80' : 'bg-white/90 border-slate-200/70'
        }`}>
          <button onClick={() => setMobileOpen(true)} className="p-1 rounded-lg hover:bg-slate-100">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-700 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">{uiConfig.appName}</span>
          </div>
        </header>

        {!isAdmin && uiConfig.showUserAnnouncement && uiConfig.userAnnouncement.trim() && (
          <div className="mx-4 mt-4 user-banner text-emerald-900 lg:mx-8">
            {uiConfig.userAnnouncement}
          </div>
        )}

        {isAdmin && (
          <div className="mx-4 mt-4 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-2.5 text-sm text-sky-900 lg:mx-8">
            <span className="inline-flex items-center gap-1 font-semibold">
              <ShieldCheck size={14} /> Mode Admin aktif: perubahan Anda akan memengaruhi tampilan seluruh user.
            </span>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
