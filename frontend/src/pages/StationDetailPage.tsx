import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { stationApi } from '../services/api'
import { MapPin, Zap, Clock, ChevronLeft, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const CONNECTOR_LABELS: Record<string, string> = {
  AC_TYPE2: 'AC Type 2', DC_CCS2: 'DC CCS2', DC_CHAdeMO: 'DC CHAdeMO', DC_GB_T: 'DC GB/T'
}

function SlotButton({ slot, onSelect, selected }: {
  slot: any; onSelect: (slot: any) => void; selected: boolean
}) {
  const isAvailable = slot.status === 'AVAILABLE'
  return (
    <button
      onClick={() => isAvailable && onSelect(slot)}
      disabled={!isAvailable}
      className={`p-3 rounded-lg border text-xs font-medium transition-all ${
        selected
          ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
          : isAvailable
            ? 'border-gray-200 hover:border-green-300 bg-white text-gray-700 hover:bg-green-50'
            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
      }`}
    >
      <div className="font-semibold">
        {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
      </div>
      <div className={`mt-0.5 ${isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
        {isAvailable ? 'Tersedia' : slot.status === 'RESERVED' ? 'Direservasi' : slot.status === 'OCCUPIED' ? 'Digunakan' : 'Maintenance'}
      </div>
      {isAvailable && (
        <div className="text-gray-500 mt-0.5">
          Rp {parseInt(slot.price_per_kwh).toLocaleString('id-ID')}/kWh
        </div>
      )}
    </button>
  )
}

export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)

  const { data: station } = useQuery({
    queryKey: ['station', id],
    queryFn:  () => stationApi.getById(id!).then(r => r.data)
  })

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', id, selectedDate],
    queryFn:  () => stationApi.getSlots(id!, selectedDate).then(r => r.data)
  })

  // Generate next 7 days for date selector
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  if (!station) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/stations" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={20} />
        </Link>
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
            return (
              <button
                key={date}
                onClick={() => { setSelectedDate(date); setSelectedSlot(null) }}
                className={`flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-lg border text-sm transition-colors ${
                  selectedDate === date
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300 bg-white text-gray-700'
                }`}
              >
                <span className="text-xs text-gray-500">{isToday ? 'Hari ini' : d.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                <span className="font-semibold">{d.getDate()}</span>
                <span className="text-xs text-gray-500">{d.toLocaleDateString('id-ID', { month: 'short' })}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Slot grid */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} /> Pilih Slot Waktu
        </h3>

        {slotsLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 animate-pulse">
            {[1,2,3,4,5,6,7,8,9].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg" />
            ))}
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
            <Link
              to={`/stations/${id}/book/${selectedSlot.id}`}
              className="btn-primary px-6"
            >
              Pesan Sekarang
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
