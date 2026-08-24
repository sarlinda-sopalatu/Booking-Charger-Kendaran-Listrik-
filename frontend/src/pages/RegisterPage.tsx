import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Zap, UserPlus, ShieldCheck, CircleCheckBig } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { register } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', ev_plate: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password minimal 8 karakter')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Akun berhasil dibuat!')
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registrasi gagal')
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
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">Buat Akun EV Charging</h1>
            <p className="text-slate-600 mt-2 text-sm">
              Daftar sekali, lalu kelola booking charging lebih cepat kapan saja.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Feature icon={<UserPlus size={16} />} text="Registrasi cepat dengan data yang sederhana" />
            <Feature icon={<CircleCheckBig size={16} />} text="Langsung bisa akses Stasiun, Booking, dan Antrian" />
            <Feature icon={<ShieldCheck size={16} />} text="Akun aman untuk penggunaan harian" />
          </div>
        </div>

        <div className="card shadow-md">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/85 font-semibold">Registrasi</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Daftar Akun</h2>
            <p className="text-sm text-slate-600 mt-1">Lengkapi data berikut untuk memulai.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nama Lengkap</label>
              <input className="input" placeholder="Budi Santoso"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="email@example.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Minimal 8 karakter"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Nomor HP (opsional)</label>
              <input className="input" placeholder="+628123456789"
                value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nomor Plat Kendaraan (opsional)</label>
              <input className="input" placeholder="B 1234 EV"
                value={form.ev_plate} onChange={e => setForm(p => ({ ...p, ev_plate: e.target.value }))} />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
              {loading ? 'Mendaftarkan...' : 'Buat Akun'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-green-600 font-medium hover:underline">Masuk</Link>
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
