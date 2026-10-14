import { renderHook, act, waitFor } from '@testing-library/react-native'
import { institutionQueries } from '@/services/database/queries/institution'
import { useInstitutionsStore } from '@/stores/institutions'
import { useInstitutionsScreen } from './useInstitutionsScreen'

jest.mock('@/services/database/queries/institution', () => ({
  institutionQueries: {
    getAll: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))

const mockedGetAll = jest.mocked(institutionQueries.getAll)
const mockedDelete = jest.mocked(institutionQueries.delete)

const localInstitutions = [
  {
    id: 'inst-1',
    name: 'Nubank',
    color: '#820AD1',
    icon: 'landmark',
    logoUrl: null,
  },
  {
    id: 'inst-2',
    name: 'Itau',
    color: '#FF6600',
    icon: 'landmark',
    logoUrl: null,
  },
]

describe('useInstitutionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useInstitutionsStore.setState({ institutions: [] })
    mockedGetAll.mockResolvedValue(localInstitutions as never)
  })

  it('loads institutions from local database', async () => {
    const { result } = renderHook(() => useInstitutionsScreen())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.institutions).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('filters institutions by search query', async () => {
    const { result } = renderHook(() => useInstitutionsScreen())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setSearchQuery('Nubank')
    })

    expect(result.current.institutions).toHaveLength(1)
    expect(result.current.institutions[0].name).toBe('Nubank')
  })

  it('deletes an institution from local database', async () => {
    mockedDelete.mockResolvedValue(undefined as never)
    const { result } = renderHook(() => useInstitutionsScreen())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.handleDelete('inst-1')
    })

    await act(async () => {
      result.current.confirmDelete()
    })

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith('inst-1')
    })
  })
})
