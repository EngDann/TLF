import { fetchCurrentUser } from '@/services/api/user'
import { getStoredTokens, clearTokens } from '@/services/api/token-storage'
import { useAuthStore } from '@/stores/auth'
import { useEffect, useState } from 'react'

export function useAuthHydration() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setSession = useAuthStore((s) => s.setSession)
  const logout = useAuthStore((s) => s.logout)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (isAuthenticated) {
        if (!cancelled) {
          setReady(true)
        }
        return
      }

      if (!cancelled) {
        setReady(false)
      }

      try {
        const { accessToken, refreshToken } = await getStoredTokens()
        if (!accessToken || !refreshToken) {
          return
        }
        const user = await fetchCurrentUser()
        if (!cancelled) {
          setSession(user, accessToken, refreshToken)
        }
      } catch {
        await clearTokens()
        if (!cancelled) {
          logout()
        }
      } finally {
        if (!cancelled) {
          setReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, logout, setSession])

  return ready
}
