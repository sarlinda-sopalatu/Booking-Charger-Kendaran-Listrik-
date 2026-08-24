import { useMemo, useState } from 'react'
import { ShieldCheck, RefreshCcw, Save, Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { defaultUiConfig, useUiConfigStore } from '../store/uiConfigStore'
import { useAuthStore } from '../store/authStore'
import { useAdminAuditStore } from '../store/adminAuditStore'

const themePresets = [
  {
    name: 'Default Green',
    accentColor: '#16a34a',
    accentDarkColor: '#15803d',
    bgColorStart: '#f5f7ff',
    bgColorEnd: '#edf7f1'
  },
  {
    name: 'Ocean Blue',
    accentColor: '#0284c7',
    accentDarkColor: '#0369a1',
    bgColorStart: '#f0f9ff',
    bgColorEnd: '#ecfeff'
  },
  {
    name: 'Sunset Gold',
    accentColor: '#d97706',
    accentDarkColor: '#b45309',
    bgColorStart: '#fff7ed',
    bgColorEnd: '#fefce8'
  }
]

function getChangedKeys(before: Record<string, any>, after: Record<string, any>) {
  return Object.keys(after).filter((key) => before[key] !== after[key])
}

export default function AdminDisplayControlPage() {
  const user = useAuthStore((s) => s.user)
  const { config, updateConfig, resetConfig } = useUiConfigStore()
  const addAuditEntry = useAdminAuditStore((s) => s.addEntry)
  const [draft, setDraft] = useState(config)

  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(config), [draft, config])

  const applyChanges = () => {
    const changedKeys = getChangedKeys(config as any, draft as any)
    updateConfig(draft)
    addAuditEntry({
      actorEmail: user?.email || 'unknown@local',
      actorRole: user?.role || 'UNKNOWN',
      action: 'Update display config',
      changedKeys
    })
    toast.success('Perubahan tampilan user berhasil disimpan.')
  }

  const handleReset = () => {
    const changedKeys = getChangedKeys(config as any, defaultUiConfig as any)
    resetConfig()
    setDraft(defaultUiConfig)
    addAuditEntry({
      actorEmail: user?.email || 'unknown@local',
      actorRole: user?.role || 'UNKNOWN',
      action: 'Reset display config',
      changedKeys
    })
    toast.success('Tampilan dikembalikan ke default.')
  }

  const applyPreset = (preset: (typeof themePresets)[number]) => {
    setDraft((prev) => ({
      ...prev,
      activeThemePreset: preset.name,
      accentColor: preset.accentColor,
      accentDarkColor: preset.accentDarkColor,
      bgColorStart: preset.bgColorStart,
      bgColorEnd: preset.bgColorEnd
    }))
  }

  return (
    <div className="space-y-6">
      <div className="admin-card relative overflow-hidden">
        <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-blue-200/35 blur-2xl" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-blue-700/85 font-semibold">Admin Control</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <ShieldCheck size={22} />
              Pengaturan Tampilan User
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Hanya admin yang dapat mengubah branding, warna tema, judul halaman, dan pesan global user.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleReset} className="btn-outline inline-flex items-center gap-2">
              <RefreshCcw size={15} />
              Reset
            </button>
            <button type="button" onClick={applyChanges} className="btn-primary inline-flex items-center gap-2" disabled={!hasChanges}>
              <Save size={15} />
              Simpan
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="admin-card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Branding Utama</h2>

          <div>
            <label className="label">Nama Aplikasi</label>
            <input
              className="input"
              value={draft.appName}
              onChange={(e) => setDraft((p) => ({ ...p, appName: e.target.value }))}
              placeholder="EV Charging"
            />
          </div>

          <div>
            <label className="label">Subjudul Aplikasi</label>
            <input
              className="input"
              value={draft.appTagline}
              onChange={(e) => setDraft((p) => ({ ...p, appTagline: e.target.value }))}
              placeholder="Booking System"
            />
          </div>

          <div>
            <label className="label">Label Greeting Dashboard</label>
            <input
              className="input"
              value={draft.dashboardGreetingLabel}
              onChange={(e) => setDraft((p) => ({ ...p, dashboardGreetingLabel: e.target.value }))}
              placeholder="Energy Control"
            />
          </div>

          <div>
            <label className="label">Judul Halaman Stasiun</label>
            <input
              className="input"
              value={draft.stationPageTitle}
              onChange={(e) => setDraft((p) => ({ ...p, stationPageTitle: e.target.value }))}
              placeholder="Stasiun Pengisian"
            />
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 space-y-2">
            <p className="text-sm font-semibold text-slate-800">Akses dan Dampak</p>
            <p className="text-xs text-slate-600">Admin: dapat ubah semua field di halaman ini.</p>
            <p className="text-xs text-slate-600">User: hanya melihat hasil konfigurasi, tidak bisa edit.</p>
          </div>
        </div>

        <div className="admin-card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Tema dan Konten User</h2>

          <div>
            <label className="label inline-flex items-center gap-2">
              <Palette size={14} /> Preset Tema
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {themePresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium text-left transition-all ${
                    draft.activeThemePreset === preset.name
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Pengumuman Global User</label>
            <textarea
              className="input min-h-24"
              value={draft.userAnnouncement}
              onChange={(e) => setDraft((p) => ({ ...p, userAnnouncement: e.target.value }))}
              placeholder="Pesan ini tampil di semua halaman user"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Warna Aksen</label>
              <input
                type="color"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1"
                value={draft.accentColor}
                onChange={(e) => setDraft((p) => ({ ...p, accentColor: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Warna Aksen Gelap</label>
              <input
                type="color"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1"
                value={draft.accentDarkColor}
                onChange={(e) => setDraft((p) => ({ ...p, accentDarkColor: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Warna Latar Awal</label>
              <input
                type="color"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1"
                value={draft.bgColorStart}
                onChange={(e) => setDraft((p) => ({ ...p, bgColorStart: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Warna Latar Akhir</label>
              <input
                type="color"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1"
                value={draft.bgColorEnd}
                onChange={(e) => setDraft((p) => ({ ...p, bgColorEnd: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3">
            <p className="text-sm font-semibold text-slate-800">Kontrol Section User</p>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.showUserAnnouncement}
                onChange={(e) => setDraft((p) => ({ ...p, showUserAnnouncement: e.target.checked }))}
              />
              Tampilkan pengumuman global user
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.showDashboardStats}
                onChange={(e) => setDraft((p) => ({ ...p, showDashboardStats: e.target.checked }))}
              />
              Tampilkan kartu statistik dashboard user
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.showDashboardQuickActions}
                onChange={(e) => setDraft((p) => ({ ...p, showDashboardQuickActions: e.target.checked }))}
              />
              Tampilkan panel aksi cepat dashboard user
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.showStationSummaryCards}
                onChange={(e) => setDraft((p) => ({ ...p, showStationSummaryCards: e.target.checked }))}
              />
              Tampilkan ringkasan stasiun aktif dan total charger
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.showStationFilterControls}
                onChange={(e) => setDraft((p) => ({ ...p, showStationFilterControls: e.target.checked }))}
              />
              Tampilkan panel pencarian dan filter stasiun
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.showDashboardTips}
              onChange={(e) => setDraft((p) => ({ ...p, showDashboardTips: e.target.checked }))}
            />
            Tampilkan kartu Tip Hari Ini di Dashboard User
          </label>
        </div>
      </div>
    </div>
  )
}
