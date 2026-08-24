import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queueApi } from '../services/api'
import { Users, Timer, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

export default function QueuePage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['queue', 'me'],
    queryFn: () => queueApi.getMyPosition().then((r) => r.data),
    retry: false
  })

  const leaveQueue = useMutation({
    mutationFn: () => queueApi.leave(),
    onSuccess: () => {
      toast.success('Berhasil keluar dari antrian')
      qc.invalidateQueries({ queryKey: ['queue'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Tidak sedang dalam antrian')
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Antrian</h1>
        <p className="text-gray-500 text-sm mt-1">Pantau posisi antrian Anda</p>
      </div>

      {isLoading ? (
        <div className="card">Memuat posisi antrian...</div>
      ) : !data ? (
        <div className="card text-center py-10">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Anda tidak sedang di antrian</p>
          <p className="text-sm text-gray-500 mt-1">Silakan booking slot untuk mulai antre jika diperlukan.</p>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Posisi Anda</p>
              <p className="text-4xl font-bold text-gray-900 mt-1">#{data.position ?? '-'}</p>
              <p className="text-sm text-gray-500 mt-2 inline-flex items-center gap-1">
                <Timer size={14} /> Estimasi tunggu: {data.estimated_wait_minutes ?? '-'} menit
              </p>
            </div>
            <button
              className="btn-danger inline-flex items-center gap-2"
              onClick={() => leaveQueue.mutate()}
              disabled={leaveQueue.isPending}
            >
              <LogOut size={16} />
              {leaveQueue.isPending ? 'Memproses...' : 'Keluar Antrian'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
