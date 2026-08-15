import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { bookingApi, stationApi } from '../services/api'
import { ChevronLeft, Zap, Clock, MapPin, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BookingPage() {
  const { id: stationId, slotId } = useParams<{ id: string; slotId: string }>()
  const navigate = useNavigate()
  const [notes, setNotes] = useState('')

  const { data: station } = useQuery({
    queryKey: ['station', stationId],
    queryFn:  () => stationApi.getById(stationId!).then(r => r.data)
  })

  const createBooking = useMutation({
    mutationFn: () => bookingApi.create(slotId!, notes),
    onSuccess: (data) => {
      toast.success('Booking berhasil dibuat!')
      navigate(`/bookings/${data.data.id}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Booking gagal')
    }
  })

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Konfirmasi Booking</h1>
      </div>

      {/* Station info */}
      {station && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Detail Stasiun</h3>
          <div className="space-y-3">
            <InfoRow icon={<MapPin size={16} />} label="Stasiun" value={station.name} />
            <InfoRow icon={<MapPin size={16} />} label="Alamat" value={station.address} />
          </div>
        </div>
      )}

      {/* Booking details */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Detail Slot</h3>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
          <div className="flex items-center gap-2 text-green-700">
            <Zap size={18} />
            <span className="font-semibold">Slot Terpilih</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">ID Slot: {slotId?.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Anda memiliki 30 menit untuk menyelesaikan pembayaran setelah booking dibuat.
          </p>
        </div>

        <div>
          <label className="label">Catatan (opsional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Tambahkan catatan untuk operator stasiun..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Info pembayaran */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <CreditCard size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900 text-sm">Informasi Pembayaran</p>
            <p className="text-xs text-blue-700 mt-1">
              Pembayaran dilakukan setelah booking dikonfirmasi. Tagihan dihitung berdasarkan 
              energi yang terpakai (kWh) setelah pengisian selesai.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => createBooking.mutate()}
        disabled={createBooking.isPending}
        className="btn-primary w-full py-3 text-base"
      >
        {createBooking.isPending ? 'Memproses...' : 'Konfirmasi Booking'}
      </button>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}
