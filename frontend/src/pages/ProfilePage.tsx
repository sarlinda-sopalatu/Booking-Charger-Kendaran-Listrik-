import { useAuthStore } from '../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { userApi } from '../services/api'
import { Mail, Phone, Car, Shield, BadgeCheck, UserCircle2 } from 'lucide-react'

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 break-words">{value || '-'}</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuthStore()

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => userApi.me().then((r) => r.data),
    retry: false
  })

  const profile = profileData || user
  const hasData = Boolean(profile?.id || profile?.name || profile?.email)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card relative overflow-hidden">
        <div className="pointer-events-none absolute -top-10 -right-8 h-24 w-24 rounded-full bg-emerald-200/40 blur-2xl" />
        <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-emerald-700/85 font-semibold">
          <BadgeCheck size={13} /> Profil Pengguna
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Profil</h1>
        <p className="text-slate-600 text-sm mt-1">Informasi akun dan kendaraan Anda.</p>
      </div>

      <div className="card">
        {!isLoading && !hasData && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Data profil belum termuat. Coba refresh halaman atau login ulang jika sesi sudah kedaluwarsa.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-200 to-green-100 rounded-2xl flex items-center justify-center border border-emerald-200/80">
            <span className="text-green-700 font-bold text-2xl">{profile?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-900">{isLoading ? 'Memuat...' : (profile?.name || '-')}</p>
            <p className="text-sm text-slate-500">ID: {profile?.id || '-'}</p>
          </div>
          <div className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <UserCircle2 size={14} />
            {profile?.role || 'USER'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/70 divide-y divide-slate-100 px-4">
          <Row icon={<Mail size={16} />} label="Email" value={profile?.email} />
          <Row icon={<Phone size={16} />} label="Telepon" value={profile?.phone} />
          <Row icon={<Car size={16} />} label="Plat Kendaraan" value={profile?.ev_plate} />
          <Row icon={<Shield size={16} />} label="Role" value={profile?.role} />
        </div>
      </div>
    </div>
  )
}
