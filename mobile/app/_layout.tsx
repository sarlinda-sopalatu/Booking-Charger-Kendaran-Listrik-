import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '../store/authStore'

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore()

  useEffect(() => { loadUser() }, [])

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
