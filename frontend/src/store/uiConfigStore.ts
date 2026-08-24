import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UiConfig {
  appName: string
  appTagline: string
  userAnnouncement: string
  dashboardGreetingLabel: string
  stationPageTitle: string
  activeThemePreset: string
  showUserAnnouncement: boolean
  showDashboardStats: boolean
  showDashboardQuickActions: boolean
  showDashboardTips: boolean
  showStationSummaryCards: boolean
  showStationFilterControls: boolean
  accentColor: string
  accentDarkColor: string
  bgColorStart: string
  bgColorEnd: string
}

interface UiConfigState {
  config: UiConfig
  updateConfig: (patch: Partial<UiConfig>) => void
  resetConfig: () => void
}

export const defaultUiConfig: UiConfig = {
  appName: 'EV Charging',
  appTagline: 'Booking System',
  userAnnouncement: 'Selamat datang di sistem booking charging. Pilih stasiun, atur slot, dan pantau status Anda.',
  dashboardGreetingLabel: 'Energy Control',
  stationPageTitle: 'Stasiun Pengisian',
  activeThemePreset: 'Default Green',
  showUserAnnouncement: true,
  showDashboardStats: true,
  showDashboardQuickActions: true,
  showDashboardTips: true,
  showStationSummaryCards: true,
  showStationFilterControls: true,
  accentColor: '#16a34a',
  accentDarkColor: '#15803d',
  bgColorStart: '#f5f7ff',
  bgColorEnd: '#edf7f1'
}

export const useUiConfigStore = create<UiConfigState>()(
  persist(
    (set) => ({
      config: defaultUiConfig,
      updateConfig: (patch) =>
        set((state) => ({
          config: {
            ...state.config,
            ...patch
          }
        })),
      resetConfig: () => set({ config: defaultUiConfig })
    }),
    {
      name: 'ev-ui-config'
    }
  )
)
