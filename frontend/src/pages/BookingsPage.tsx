import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { bookingApi } from '../services/api'

export default function BookingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingApi.getAll().then(r => r.data)
  })

  const bookings = data?.bookings || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daftar Booking</h1>
        <p className="text-sm text-gray-500 mt-1">Riwayat pemesanan slot pengisian Anda.</p>
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-32" />
      ) : bookings.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500 font-medium">Belum ada booking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking: any) => (
            <Link key={booking.id} to={`/bookings/${booking.id}`} className="card-hover block">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">Booking #{booking.id?.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-gray-500 mt-1">Status: {booking.status}</p>
                </div>
                <span className="badge-green">{booking.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
