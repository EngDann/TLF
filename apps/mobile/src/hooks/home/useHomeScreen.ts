import { useAuthStore } from '@/stores/auth'

export function useHomeScreen() {
  const user = useAuthStore((state) => state.user)

  const greeting = user?.name ? `Olá, ${user.name}` : 'Bem-vindo'

  return { greeting, subtitle: 'Resumo e atalhos em breve.' }
}
