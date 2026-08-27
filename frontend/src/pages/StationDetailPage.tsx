import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stationApi, bookingApi } from '../services/api'
import { MapPin, Zap, Clock, ChevronLeft, Calendar, AlertTriangle } from 'lucide-react'

const CONNECTOR_LABELS: Record<string, string> = {
  AC_TYPE2: 'AC Type 2', DC_CCS2: 'DC CCS2', DC_CHAdeMO: 'DC CHAdeMO', DC_GB_T: 'DC GB/T'
}

// ── Modal: konflik booking ────────────────────────────────────────────────────
function ConflictModal({
  existingBookingId,
  slotDate,
  onCancel,
  onKeep,
  cancelling,
}: {
  existingBookingId: string
  slotDate: string
  onCancel: () => void
  onKeep: () => void
  cancelling: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="bg-yellow-100 p-2 rounded-lg flex-shrink-0">
            <AlertTriangle size={20} className="text-yellow-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Sudah Ada Booking</h2>
            <p className="text-sm text-gray-500 mt-1">
              Anda sudah memiliki booking aktif pada tanggal <strong>{slotDate}</strong>.
              Satu tanggal hanya bisa satu booking untuk menjaga jadwal tetap teratur.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
          ID Booking: <span className="font-mono font-medium text-gray-700">{existingBookingId.slice(0, 8).toUpperCase()}…</span>
        </div>

        <p className="text-sm text-gray-700 font-medium">Apa yang ingin Anda lakukan?</p>

        <div className="space-y-2">
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="w-full px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {cancelling ? 'Membatalkan...' : '✕ Batalkan booking sebelumnya & pesan slot baru'}
          </button>
          <button
            onClick={onKeep}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ← Tetap dengan booking yang ada
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SlotButton ────────────────────────────────────────────────────────────────
function SlotButton({ slot, onSelect, selected, isToday }: {
  slot: any; onSelect: (slot: any) => void; selected: boolean; isToday: boolean
}) {
  const isAvailable = slot.status === 'AVAILABLE'
  const isPast = isToday && (() => {
    const now = new Date()
    const [endH, endM] = slot.end_time.split(':').map(Number)
    const endDate = new Date()
    endDate.setHours(endH, endM, 0, 0)
    return now >= endDate
  })()
  const canBook = isAvailable && !isPast

  return (
    <button
      onClick={() => canBook && onSelect(slot)}
      disabled={!canBook}
      className={`p-3 rounded-lg border text-xs font-medium transition-all ${
        selected
          ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
          : canBook
            ? 'border-gray-200 hover:border-green-300 bg-white text-gray-700 hover:bg-green-50'
            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
      }`}
    >
      <div className="font-semibold">{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</div>
      <div className={`mt-0.5 ${canBook ? 'text-green-600' : 'text-gray-400'}`}>
        {isPast ? 'Sudah Lewat' : isAvailable ? 'Tersedia' : slot.status === 'RESERVED' ? 'Direservasi' : slot.status === 'OCCUPIED' ? 'Digunakan' : 'Maintenance'}
      </div>
      {canBook && (
        <div className="text-gray-500 mt-0.5">Rp {parseInt(slot.price_per_kwh).toLocaleString('id-ID')}/kWh</div>
      )}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [conflict, setConflict] = useState<{ bookingId: string; slotDate: string; pendingSlotId: string } | null>(null)

  const { data: station } = useQuery({
    queryKey: ['station', id],
    queryFn:  () => stationApi.getById(id!).then(r => r.data)
  })

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', id, selectedDate],
    queryFn:  () => stationApi.getSlots(id!, selectedDate).then(r => r.data)
  })

  // Cek booking aktif user pada tanggal yang dipilih
  const { data: activeBookings } = useQuery({
    queryKey: ['my-bookings-active'],
    queryFn: () => bookingApi.getAll({ limit: 50 }).then(r => r.data),
    staleTime: 10000,
  })

  const activeOnDate = (date: string) =>
    (activeBookings?.bookings ?? []).find(
      (b: any) => b.slot_date === date && ['PENDING_PAYMENT', 'CONFIRMED', 'CHARGING'].includes(b.status)
    ) ?? null

  // Batalkan booking lama lalu navigasi ke halaman booking slot baru
  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => bookingApi.cancel(bookingId, 'Digantikan dengan booking baru'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings-active'] })
      if (conflict) {
        navigate(`/stations/${id}/book/${conflict.pendingSlotId}`)
      }
      setConflict(null)
    },
    onError: (err: any) => {
      alert('Gagal membatalkan: ' + (err.response?.data?.error || err.message))
    }
  })

  const handleBook = () => {
    if (!selectedSlot) return
    const existing = activeOnDate(selectedDate)
    if (existing) {
      setConflict({ bookingId: existing.id, slotDate: selectedDate, pendingSlotId: selectedSlot.id })
    } else {
      navigate(`/stations/${id}/book/${selectedSlot.id}`)
    }
  }

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  if (!station) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{station.name}</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin size={12} /> {station.address}
          </p>
        </div>
      </div>

      {/* Charger list */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Charger Tersedia</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {station.chargers?.map((c: any) => (
            <div key={c.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-green-500" />
                <span className="text-sm font-medium">{CONNECTOR_LABELS[c.connector_type]}</span>
              </div>
              <p className="text-xs text-gray-500">{c.max_power_kw} kW max</p>
              <span className={`text-xs font-medium mt-1 inline-block ${
                c.status === 'AVAILABLE' ? 'text-green-600' : 'text-red-500'
              }`}>{c.status === 'AVAILABLE' ? '● Tersedia' : '● ' + c.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Date selector */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar size={18} /> Pilih Tanggal
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dates.map(date => {
            const d = new Date(date)
            const isToday = date === today
            const hasBooking = !!activeOnDate(date)
            return (
              <button
                key={date}
                onClick={() => { setSelectedDate(date); setSelectedSlot(null) }}
                className={`flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-lg border text-sm transition-colors relative ${
                  selectedDate === date
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300 bg-white text-gray-700'
                }`}
              >
                <span className="text-xs text-gray-500">{isToday ? 'Hari ini' : d.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                <span className="font-semibold">{d.getDate()}</span>
                <span className="text-xs text-gray-500">{d.toLocaleDateString('id-ID', { month: 'short' })}</span>
                {/* Indikator sudah ada booking */}
                {hasBooking && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" title="Sudah ada booking" />
                )}
              </button>
            )
          })}
        </div>
        {/* Banner peringatan jika tanggal dipilih sudah ada booking */}
        {activeOnDate(selectedDate) && (
          <div className="mt-3 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <span className="font-semibold">Anda sudah memiliki booking aktif pada tanggal ini.</span>
              {' '}Jika melanjutkan, Anda akan diminta membatalkan booking yang ada.
            </div>
          </div>
        )}
      </div>

      {/* Slot grid */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} /> Pilih Slot Waktu
        </h3>
        {slotsLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 animate-pulse">
            {[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg" />)}
          </div>
        ) : (
          slotsData?.chargers?.map((charger: any) => (
            <div key={charger.id} className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {CONNECTOR_LABELS[charger.connector_type] || charger.connector_type} — {charger.max_power_kw}kW
              </p>
              {charger.slots?.length === 0 ? (
                <p className="text-xs text-gray-400">Tidak ada slot untuk tanggal ini</p>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                  {charger.slots?.map((slot: any) => (
                    <SlotButton
                      key={slot.id}
                      slot={slot}
                      selected={selectedSlot?.id === slot.id}
                      onSelect={setSelectedSlot}
                      isToday={selectedDate === today}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Book action */}
      {selectedSlot && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Slot Dipilih</p>
              <p className="text-sm text-gray-600 mt-0.5">
                {selectedDate} · {selectedSlot.start_time.slice(0, 5)}–{selectedSlot.end_time.slice(0, 5)}
              </p>
              <p className="text-sm text-green-700 font-medium mt-1">
                Rp {parseInt(selectedSlot.price_per_kwh).toLocaleString('id-ID')}/kWh
              </p>
            </div>
            <button onClick={handleBook} className="btn-primary px-6">
              Pesan Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Conflict modal */}
      {conflict && (
        <ConflictModal
          existingBookingId={conflict.bookingId}
          slotDate={conflict.slotDate}
          onCancel={() => cancelMutation.mutate(conflict.bookingId)}
          onKeep={() => setConflict(null)}
          cancelling={cancelMutation.isPending}
        />
      )}
    </div>
  )
}
