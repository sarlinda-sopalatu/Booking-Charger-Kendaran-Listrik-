import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queueApi, stationApi } from '../services/api'
import { useState } from 'react'

export default function QueuePage() {
  const queryClient = useQueryClient()
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ stationId: '', slotDate: '', connectorType: 'ANY' })

  const { data: position, isLoading } = useQuery({
    queryKey: ['queue-position'],
    queryFn: () => queueApi.getMyPosition().then(r => r.data).catch(() => null),
    refetchInterval: 15000
  })

  const { data: stationsData } = useQuery({
    queryKey: ['stations-list'],
    queryFn: () => stationApi.getAll().then(r => r.data)
  })

  const stations = stationsData?.stations || (Array.isArray(stationsData) ? stationsData : [])

  async function handleJoin() {
    if (!form.stationId || !form.slotDate) {
      setError('Pilih stasiun dan tanggal terlebih dahulu')
      return
    }
    setJoining(true)
    setError('')
    try {
      await queueApi.join(form.stationId, form.slotDate)
      queryClient.invalidateQueries({ queryKey: ['queue-position'] })
      setShowForm(false)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Gagal masuk antrian')
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    setLeaving(true)
    setError('')
    try {
      await queueApi.leave()
      queryClient.invalidateQueries({ queryKey: ['queue-position'] })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Gagal keluar antrian')
    } finally {
      setLeaving(false)
    }
  }

  const inQueue = position && position.position != null

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Antrian</h1>
        <p className="text-sm text-gray-500 mt-1">Status antrean Anda saat ini.</p>
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-32" />
      ) : inQueue ? (
        /* Sedang dalam antrian */
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Posisi saat ini</p>
              <p className="text-4xl font-bold text-blue-600 mt-1">#{position.position}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Perkiraan tunggu</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {position.estimatedWaitMinutes} menit
              </p>
            </div>
          </div>

          <div className="border-t pt-3 text-sm text-gray-600 space-y-1">
            <p>Stasiun: <span className="font-medium">{position.stationId}</span></p>
            <p>Tanggal: <span className="font-medium">{position.slotDate}</span></p>
            <p>Total dalam antrian: <span className="font-medium">{position.total_in_queue} orang</span></p>
          </div>

          <p className="text-xs text-gray-400">
            Anda akan diberitahu ketika slot tersedia. Halaman ini otomatis refresh setiap 15 detik.
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="w-full py-2 px-4 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition"
          >
            {leaving ? 'Memproses...' : 'Keluar dari Antrian'}
          </button>
        </div>
      ) : (
        /* Belum dalam antrian */
        <div className="card space-y-4">
          <div>
            <p className="text-sm text-gray-500">Posisi saat ini</p>
            <p className="text-xl font-semibold text-gray-400 mt-1">—</p>
            <p className="text-sm text-gray-600 mt-2">
              Belum masuk antrian. Gunakan fitur ini jika semua slot di stasiun yang Anda inginkan sudah penuh.
            </p>
          </div>

          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary w-full"
            >
              Masuk Antrian
            </button>
          ) : (
            <div className="space-y-3 border-t pt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stasiun</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.stationId}
                  onChange={e => setForm(f => ({ ...f, stationId: e.target.value }))}
                >
                  <option value="">-- Pilih Stasiun --</option>
                  {stations.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.slotDate}
                  min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()}
                  onChange={e => setForm(f => ({ ...f, slotDate: e.target.value }))}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="btn-primary flex-1"
                >
                  {joining ? 'Memproses...' : 'Konfirmasi Masuk Antrian'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setError('') }}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
