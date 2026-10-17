import { useAuthStore } from '@/stores/auth'
import { Redirect } from 'expo-router'

export default function IndexRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />
}
