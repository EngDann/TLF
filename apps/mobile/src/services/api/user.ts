import { api } from './axios-client'
import { getApiErrorMessage } from '@/utils/apiErrorMessage'

export type UserProfile = {
  id: string
  name: string
  email: string
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  try {
    const { data } = await api.get<{ user: UserProfile }>('/user')
    return data.user
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Não foi possível carregar o perfil.'))
  }
}
