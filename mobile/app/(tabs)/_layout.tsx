import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return <Ionicons name={name} size={24} color={focused ? '#10B981' : '#9CA3AF'} />
}

export default function TabsLayout() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OPERATOR'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopColor: '#E5E7EB',
          backgroundColor: '#fff',
          paddingBottom: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {/* Selalu tampil */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} />,
        }}
      />

      {/* User only */}
      <Tabs.Screen
        name="stations"
        options={{
          title: 'Stasiun',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'location' : 'location-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Booking',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Antrian',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'time' : 'time-outline'} focused={focused} />,
        }}
      />

      {/* Admin only */}
      <Tabs.Screen
        name="admin-bookings"
        options={{
          title: 'Booking',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'clipboard' : 'clipboard-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="admin-stations"
        options={{
          title: 'Stasiun',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'flash' : 'flash-outline'} focused={focused} />,
        }}
      />

      {/* Selalu tampil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  )
}
