import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AdminAuditEntry {
  id: string
  actorEmail: string
  actorRole: string
  action: string
  changedKeys: string[]
  timestamp: string
}

interface AdminAuditState {
  entries: AdminAuditEntry[]
  addEntry: (entry: Omit<AdminAuditEntry, 'id' | 'timestamp'>) => void
  clearEntries: () => void
}

export const useAdminAuditStore = create<AdminAuditState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            {
              id: `audit-${Date.now()}`,
              timestamp: new Date().toISOString(),
              ...entry
            },
            ...state.entries
          ].slice(0, 150)
        })),
      clearEntries: () => set({ entries: [] })
    }),
    {
      name: 'ev-admin-audit'
    }
  )
)
