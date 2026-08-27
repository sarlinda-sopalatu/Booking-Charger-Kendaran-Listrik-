import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sessionApi } from '../services/api'

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Selesai'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}j ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}d`
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}d`
}

export function ChargingCountdown({
  bookingId,
  slotStartTime,
  slotEndTime,
  compact = false,
}: {
  bookingId: string
  slotStartTime?: string
  slotEndTime?: string
  compact?: boolean
}) {
  const { data: session } = useQuery({
    queryKey: ['session-booking', bookingId],
    queryFn: () => sessionApi.getByBooking(bookingId).then(r => r.data),
    staleTime: 30000,
  })

  const slotDurationSecs = (() => {
    if (slotStartTime && slotEndTime) {
      const [sh, sm] = slotStartTime.split(':').map(Number)
      const [eh, em] = slotEndTime.split(':').map(Number)
      return Math.max(60, (eh * 60 + em - (sh * 60 + sm)) * 60)
    }
    return 7200
  })()

  const endTime = (() => {
    if (session?.started_at) {
      return new Date(new Date(session.started_at).getTime() + slotDurationSecs * 1000)
    }
    if (slotEndTime) {
      const today = new Date().toISOString().slice(0, 10)
      return new Date(`${today}T${slotEndTime}`)
    }
    return null
  })()

  const getSecsLeft = () =>
    endTime ? Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000)) : 0

  const [secs, setSecs] = useState(getSecsLeft)

  useEffect(() => {
    const id = setInterval(() => setSecs(getSecsLeft()), 1000)
    return () => clearInterval(id)
  }, [endTime])

  const elapsedSecs  = Math.max(0, slotDurationSecs - secs)
  const pct          = Math.min(100, Math.round((elapsedSecs / slotDurationSecs) * 100))
  const isAlmostDone = secs > 0 && secs <= 300

  // ── Compact mode: untuk tabel admin (satu baris) ──────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-[160px]">
        <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse flex-shrink-0" />
        <div className="flex-1">
          <div className="w-full bg-teal-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ${isAlmostDone ? 'bg-orange-400' : 'bg-teal-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className={`text-xs font-bold tabular-nums whitespace-nowrap ${isAlmostDone ? 'text-orange-600' : 'text-teal-700'}`}>
          {secs <= 0 ? 'Selesai...' : `sisa ${formatCountdown(secs)}`}
        </span>
      </div>
    )
  }

  // ── Full mode: untuk halaman booking user ────────────────────────────────
  if (!session) {
    return (
      <div className="mt-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
        <span className="text-xs text-teal-600 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          Sedang mengisi daya...
        </span>
      </div>
    )
  }

  return (
    <div className="mt-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-teal-700 font-medium flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          Sedang mengisi daya
        </span>
        <span className={`text-sm font-bold tabular-nums ${isAlmostDone ? 'text-orange-600' : 'text-teal-700'}`}>
          {secs <= 0 ? 'Menyelesaikan...' : `sisa ${formatCountdown(secs)}`}
        </span>
      </div>
      <div className="w-full bg-teal-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${isAlmostDone ? 'bg-orange-400' : 'bg-teal-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>
          Mulai {new Date(session.started_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span>
          {endTime
            ? `Selesai ${endTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
            : slotEndTime?.slice(0, 5)}
        </span>
      </div>
      {isAlmostDone && secs > 0 && (
        <p className="text-xs text-orange-500 mt-1 font-medium">⚡ Hampir selesai!</p>
      )}
    </div>
  )
}
