import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, stationApi } from '../services/api'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

const EMPTY_FORM = {
  name: '', address: '', latitude: '', longitude: '',
  phone: '', opening_hours: '', status: 'ACTIVE'
}

export default function AdminStationsPage() {
  const qc = useQueryClient()
  const [form, setForm]         = useState<any>(EMPTY_FORM)
  const [editId, setEditId]     = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [priceEdit, setPriceEdit]   = useState<{ chargerId: string; slotId: string; value: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stations'],
    queryFn: () => stationApi.getAll({ status: 'ALL', limit: 100 }).then(r => r.data)
  })

  const { data: slotData } = useQuery({
    queryKey: ['admin-station-slots', expandedId],
    queryFn: () => stationApi.getSlots(expandedId!, new Date().toISOString().slice(0, 10)).then(r => r.data),
    enabled: !!expandedId
  })

  const saveMutation = useMutation({
    mutationFn: (body: any) =>
      editId ? adminApi.updateStation(editId, body) : adminApi.createStation(body),
    onSuccess: () => {
      toast.success(editId ? 'Stasiun diperbarui' : 'Stasiun ditambahkan')
      qc.invalidateQueries({ queryKey: ['admin-stations'] })
      setShowForm(false); setEditId(null); setForm(EMPTY_FORM)
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Gagal menyimpan')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteStation(id),
    onSuccess: () => {
      toast.success('Stasiun dihapus')
      qc.invalidateQueries({ queryKey: ['admin-stations'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Gagal menghapus')
  })

  const priceMutation = useMutation({
    mutationFn: ({ chargerId, slotId, price }: any) =>
      adminApi.updateSlotPrice(chargerId, slotId, parseFloat(price)),
    onSuccess: () => {
      toast.success('Harga diperbarui')
      qc.invalidateQueries({ queryKey: ['admin-station-slots', expandedId] })
      setPriceEdit(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Gagal update harga')
  })

  const stations = data?.stations ?? []

  function openEdit(s: any) {
    setForm({
      name: s.name, address: s.address,
      latitude: s.latitude, longitude: s.longitude,
      phone: s.phone ?? '', opening_hours: s.opening_hours ?? '',
      status: s.status
    })
    setEditId(s.id); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      ...form,
      latitude:  parseFloat(form.latitude),
      longitude: parseFloat(form.longitude)
    }
    saveMutation.mutate(body)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Stasiun</h1>
          <p className="text-sm text-gray-500 mt-1">Tambah, edit, hapus stasiun & atur harga slot.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Tambah Stasiun
        </button>
      </div>

      {/* Form tambah / edit */}
      {showForm && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{editId ? 'Edit Stasiun' : 'Tambah Stasiun Baru'}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null) }}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'name',          label: 'Nama Stasiun',    type: 'text' },
              { key: 'address',       label: 'Alamat',          type: 'text' },
              { key: 'latitude',      label: 'Latitude',        type: 'number' },
              { key: 'longitude',     label: 'Longitude',       type: 'number' },
              { key: 'phone',         label: 'Nomor Telepon',   type: 'text' },
              { key: 'opening_hours', label: 'Jam Operasional', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <input
                  type={type}
                  step={type === 'number' ? 'any' : undefined}
                  value={form[key]}
                  onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                  className="input w-full"
                  required={['name','address','latitude','longitude'].includes(key)}
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="input w-full">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary">Batal</button>
              <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daftar stasiun */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Memuat...</p>
      ) : (
        <div className="space-y-3">
          {stations.map((s: any) => (
            <div key={s.id} className="card p-0">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    s.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{s.status}</span>
                  <button
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                    title="Lihat slot & harga"
                  >
                    {expandedId === s.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                  <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600">
                    <Pencil size={16}/>
                  </button>
                  <button
                    onClick={() => { if (confirm(`Hapus stasiun "${s.name}"?`)) deleteMutation.mutate(s.id) }}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>

              {/* Slot & harga */}
              {expandedId === s.id && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Slot Hari Ini — Atur Harga
                  </p>
                  {!slotData ? (
                    <p className="text-xs text-gray-400">Memuat slot...</p>
                  ) : slotData.chargers?.length === 0 ? (
                    <p className="text-xs text-gray-400">Tidak ada charger.</p>
                  ) : (
                    slotData.chargers?.map((c: any) => (
                      <div key={c.id}>
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          {c.connector_type} — {c.max_power_kw} kW
                        </p>
                        <div className="space-y-1">
                          {c.slots?.length === 0 && (
                            <p className="text-xs text-gray-400">Tidak ada slot hari ini.</p>
                          )}
                          {c.slots?.map((sl: any) => (
                            <div key={sl.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-1.5">
                              <span className="text-gray-600">
                                {sl.start_time?.slice(0,5)} – {sl.end_time?.slice(0,5)}
                              </span>
                              {priceEdit?.slotId === sl.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={priceEdit!.value}
                                    onChange={e => setPriceEdit(p => p ? {...p, value: e.target.value} : null)}
                                    className="input w-28 text-xs py-1"
                                  />
                                  <button
                                    onClick={() => priceMutation.mutate({ chargerId: c.id, slotId: sl.id, price: priceEdit!.value })}
                                    disabled={priceMutation.isPending}
                                    className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                                  >Simpan</button>
                                  <button onClick={() => setPriceEdit(null)} className="px-2 py-1 border rounded text-xs">Batal</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-800">Rp {Number(sl.price_per_kwh).toLocaleString('id-ID')}/kWh</span>
                                  <button
                                    onClick={() => setPriceEdit({ chargerId: c.id, slotId: sl.id, value: sl.price_per_kwh })}
                                    className="text-blue-600 hover:underline"
                                  ><Pencil size={12}/></button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
