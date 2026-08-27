import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { LogBox } from 'react-native'
import { useAuthStore } from '../store/authStore'

LogBox.ignoreLogs(['Uncaught (in promise', 'AxiosError'])

// Override React Native global unhandled promise rejection handler
const originalPromiseHandler = (global as any).HermesInternal?.hasPromise
  ? undefined
  : (global as any).__reactNativeGlobalHandler

;(global as any).__reactNativeGlobalHandler = (error: any, isFatal: boolean) => {
  // Abaikan axios 401 errors — sudah ditangani oleh interceptor
  if (error?.isAxiosError && error?.response?.status === 401) return
  if (error?.message?.includes('401')) return
  if (originalPromiseHandler) originalPromiseHandler(error, isFatal)
}

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore()

  useEffect(() => { loadUser().catch(() => {}) }, [])

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)/')
      } else {
        router.replace('/(auth)/login')
      }
    }
  }, [isAuthenticated, isLoading])

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="stations/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="stations/[id]/book/[slotId]" options={{ headerShown: false }} />
        <Stack.Screen name="bookings/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="bookings/[id]/pay" options={{ headerShown: false }} />
        <Stack.Screen name="monitoring/[chargerId]" options={{ headerShown: false }} />
        <Stack.Screen name="admin/bookings" options={{ headerShown: false }} />
        <Stack.Screen name="admin/stations" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
