import { ThemedBackground } from '@/components/ui/ThemedBackground'
import { ThemedButton } from '@/components/ui/ThemedButton'
import { router } from 'expo-router'

export default function MenuScreen() {
  return (
    <ThemedBackground>
      <ThemedButton title="Notificações" onPress={() => router.push('/notifications')} />
    </ThemedBackground>
  )
}
