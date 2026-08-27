import { useAuthStore } from '../store/authStore'

export default function ProfilePage() {
  const { user } = useAuthStore()

  const fields = [
    { label: 'Nama Lengkap', value: user?.name },
    { label: 'Email', value: user?.email },
    { label: 'Nomor HP', value: user?.phone || '-' },
    { label: 'Plat Kendaraan', value: user?.ev_plate || '-' },
    { label: 'Role', value: user?.role },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Informasi akun pengguna.</p>
      </div>

      <div className="card space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <hr />

        {/* Detail */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
