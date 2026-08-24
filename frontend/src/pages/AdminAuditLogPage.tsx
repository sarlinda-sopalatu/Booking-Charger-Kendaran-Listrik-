import { Trash2, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdminAuditStore } from '../store/adminAuditStore'

export default function AdminAuditLogPage() {
  const { entries, clearEntries } = useAdminAuditStore()

  const clearLog = () => {
    clearEntries()
    toast.success('Audit log dibersihkan.')
  }

  return (
    <div className="space-y-6">
      <div className="admin-card flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600 font-semibold">Admin Audit</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <History size={22} />
            Riwayat Perubahan Tampilan
          </h1>
          <p className="text-slate-600 text-sm mt-1">Mencatat siapa admin yang mengubah apa dan kapan.</p>
        </div>
        <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={clearLog}>
          <Trash2 size={15} />
          Bersihkan Log
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="admin-card text-center py-12">
          <p className="text-slate-500 font-medium">Belum ada perubahan yang tercatat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="admin-card border-l-4 border-l-sky-300/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{entry.action}</p>
                <p className="text-xs text-slate-500">
                  {new Date(entry.timestamp).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
              <p className="text-xs text-slate-600 mt-1">Admin: {entry.actorEmail} ({entry.actorRole})</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {entry.changedKeys.length === 0 ? (
                  <span className="badge-gray">Tanpa perubahan field</span>
                ) : (
                  entry.changedKeys.map((key) => (
                    <span key={key} className="badge-blue">{key}</span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
