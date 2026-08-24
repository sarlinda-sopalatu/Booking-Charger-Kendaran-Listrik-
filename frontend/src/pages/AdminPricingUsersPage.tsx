import { useMemo, useState } from 'react'
import { DollarSign, UserPlus, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { useAdminAuditStore } from '../store/adminAuditStore'
import {
  defaultOfflinePricing,
  getOfflinePricingConfig,
  OfflinePricingConfig,
  setOfflinePricingConfig
} from '../services/offlinePricing'
import { addOfflineUserByAdmin, listOfflineUsers } from '../services/authFallback'

type Role = 'USER' | 'OPERATOR' | 'ADMIN'

const connectorKeys: Array<keyof OfflinePricingConfig> = ['AC_TYPE2', 'DC_CCS2', 'DC_CHAdeMO', 'DC_GB_T']

const connectorLabels: Record<keyof OfflinePricingConfig, string> = {
  AC_TYPE2: 'AC Type 2',
  DC_CCS2: 'DC CCS2',
  DC_CHAdeMO: 'DC CHAdeMO',
  DC_GB_T: 'DC GB/T'
}

export default function AdminPricingUsersPage() {
  const user = useAuthStore((s) => s.user)
  const addAuditEntry = useAdminAuditStore((s) => s.addEntry)

  const [pricing, setPricing] = useState<OfflinePricingConfig>(getOfflinePricingConfig())
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    phone: '',
    ev_plate: '',
    role: 'USER' as Role
  })
  const [refreshKey, setRefreshKey] = useState(0)

  const users = useMemo(() => listOfflineUsers(), [refreshKey])

  const updatePrice = (
    connector: keyof OfflinePricingConfig,
    field: 'morning' | 'daytime' | 'evening',
    value: string
  ) => {
    const parsed = Number(value)
    setPricing((prev) => ({
      ...prev,
      [connector]: {
        ...prev[connector],
        [field]: Number.isFinite(parsed) ? parsed : 0
      }
    }))
  }

  const savePricing = () => {
    setOfflinePricingConfig(pricing)
    addAuditEntry({
      actorEmail: user?.email || 'unknown@local',
      actorRole: user?.role || 'UNKNOWN',
      action: 'Update charging prices',
      changedKeys: connectorKeys
    })
    toast.success('Harga charging offline berhasil diperbarui.')
  }

  const resetPricing = () => {
    setPricing(defaultOfflinePricing)
    setOfflinePricingConfig(defaultOfflinePricing)
    addAuditEntry({
      actorEmail: user?.email || 'unknown@local',
      actorRole: user?.role || 'UNKNOWN',
      action: 'Reset charging prices',
      changedKeys: connectorKeys
    })
    toast.success('Harga charging dikembalikan ke default.')
  }

  const createUser = (e: React.FormEvent) => {
    e.preventDefault()
    const created = addOfflineUserByAdmin(createForm)
    if (!created) {
      toast.error('Email sudah terdaftar.')
      return
    }

    addAuditEntry({
      actorEmail: user?.email || 'unknown@local',
      actorRole: user?.role || 'UNKNOWN',
      action: 'Create offline user/client',
      changedKeys: ['name', 'email', 'role']
    })

    setCreateForm({
      name: '',
      email: '',
      password: 'Password123!',
      phone: '',
      ev_plate: '',
      role: 'USER'
    })
    setRefreshKey((k) => k + 1)
    toast.success('User/client baru berhasil ditambahkan.')
  }

  return (
    <div className="space-y-6">
      <div className="admin-card relative overflow-hidden">
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/85 font-semibold">Admin Operations</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Kelola Harga dan User/Client</h1>
        <p className="text-slate-600 text-sm mt-1">Admin dapat mengubah harga charging offline dan menambah akun baru tanpa Docker.</p>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="admin-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
              <DollarSign size={18} />
              Pengaturan Harga Charging
            </h2>
            <div className="flex gap-2">
              <button type="button" className="btn-outline" onClick={resetPricing}>Reset</button>
              <button type="button" className="btn-primary" onClick={savePricing}>Simpan Harga</button>
            </div>
          </div>

          {connectorKeys.map((connector) => (
            <div key={connector} className="rounded-xl border border-sky-200/70 p-3 bg-white/90 shadow-sm">
              <p className="text-sm font-semibold text-slate-800 mb-2">{connectorLabels[connector]}</p>
              <div className="grid grid-cols-3 gap-2">
                <PriceInput
                  label="Pagi"
                  value={pricing[connector].morning}
                  onChange={(v) => updatePrice(connector, 'morning', v)}
                />
                <PriceInput
                  label="Siang"
                  value={pricing[connector].daytime}
                  onChange={(v) => updatePrice(connector, 'daytime', v)}
                />
                <PriceInput
                  label="Sore"
                  value={pricing[connector].evening}
                  onChange={(v) => updatePrice(connector, 'evening', v)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="admin-card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
            <UserPlus size={18} />
            Tambah User atau Client
          </h2>

          <form className="space-y-3" onSubmit={createUser}>
            <div>
              <label className="label">Nama</label>
              <input className="input" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Password</label>
                <input className="input" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as Role }))}>
                  <option value="USER">USER / CLIENT</option>
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">No. HP</label>
                <input className="input" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Plat EV</label>
                <input className="input" value={createForm.ev_plate} onChange={(e) => setCreateForm((p) => ({ ...p, ev_plate: e.target.value }))} />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">Tambah Akun</button>
          </form>

          <div className="pt-3 border-t border-sky-200/70">
            <p className="text-sm font-semibold text-slate-800 mb-2 inline-flex items-center gap-2">
              <Users size={16} />
              Daftar User/Client Offline ({users.length})
            </p>
            <div className="max-h-56 overflow-auto space-y-2 pr-1">
              {users.map((u) => (
                <div key={u.id} className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-600">{u.email}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">{u.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PriceInput({
  label,
  value,
  onChange
}: {
  label: string
  value: number
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="label">{label} (Rp/kWh)</label>
      <input
        type="number"
        min={0}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
