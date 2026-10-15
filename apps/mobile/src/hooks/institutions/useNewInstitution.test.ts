import { renderHook, act } from '@testing-library/react-native'
import { institutionQueries } from '@/services/database/repository/institution'
import { useInstitutionsStore } from '@/stores/institutions'
import { useNewInstitution } from './useNewInstitution'

jest.mock('@/services/database/repository/institution', () => ({
  institutionQueries: {
    create: jest.fn(),
  },
}))

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}))

const mockedCreate = jest.mocked(institutionQueries.create)

describe('useNewInstitution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useInstitutionsStore.setState({ institutions: [] })
    mockedCreate.mockResolvedValue({
      id: 'inst-new',
      name: 'Caixa',
      color: '#005CA9',
      icon: 'landmark',
      logoUrl: null,
    } as never)
  })

  it('creates an institution in the local database', async () => {
    const { result } = renderHook(() => useNewInstitution())

    act(() => {
      result.current.setName('Caixa')
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockedCreate).toHaveBeenCalled()
    expect(useInstitutionsStore.getState().institutions).toHaveLength(1)
  })
})
