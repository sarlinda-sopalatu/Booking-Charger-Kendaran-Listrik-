import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Zap, Eye, EyeOff, ShieldCheck, MapPin, Clock3 } from 'lucide-react'
import toast from 'react-hot-toast'

const LOGIN_COOLDOWN_MS = 1200

function isBackendUnavailable(err: any) {
  const status = Number(err?.response?.status || 0)
  const message = String(err?.message || '')
  return !err?.response || (status >= 500 && status < 600) || message.includes('ECONNREFUSED')
}

export default function LoginPage() {
  const { login } = useAuthStore()
  const navigate  = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nextAttemptAt, setNextAttemptAt] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (Date.now() < nextAttemptAt) return

    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.dismiss('login-error')
      toast.success('Selamat datang!')
      navigate('/')
    } catch (err: any) {
      const message = err?.offlineCredentialError
        ? (err.response?.data?.error || 'Akun tidak ada di data offline atau password salah.')
        : isBackendUnavailable(err)
        ? 'Backend belum aktif. Jalankan server/API dulu, lalu coba login lagi.'
        : (err.response?.data?.error || 'Login gagal. Periksa email dan password.')

      toast.dismiss('login-error')
      toast.error(message, { id: 'login-error' })
      setNextAttemptAt(Date.now() + LOGIN_COOLDOWN_MS)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6">
        <div className="card relative overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -left-10 h-36 w-36 rounded-full bg-emerald-200/45 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-8 h-36 w-36 rounded-full bg-blue-200/40 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-700 rounded-2xl mb-4 shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">EV Charging Booking</h1>
            <p className="text-slate-600 mt-2 text-sm">
              Satu tempat untuk cari stasiun, pilih slot charging, dan pantau status booking dengan cepat.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Feature icon={<MapPin size={16} />} text="Temukan stasiun terdekat dan cek ketersediaan charger" />
            <Feature icon={<Clock3 size={16} />} text="Booking slot lebih mudah dengan alur yang ringkas" />
            <Feature icon={<ShieldCheck size={16} />} text="Data akun aman dan sesi login terjaga" />
          </div>
        </div>

        <div className="card shadow-md">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/85 font-semibold">Akses Akun</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Masuk ke Akun</h2>
            <p className="text-sm text-slate-600 mt-1">Lanjutkan aktivitas booking Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="email@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            Belum punya akun?{' '}
            <Link to="/register" className="text-green-600 font-medium hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/75 px-3 py-2.5">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
        {icon}
      </span>
      <p className="text-sm text-slate-700">{text}</p>
    </div>
  )
}
