import { renderHook, act } from '@testing-library/react-native'
import { institutionQueries } from '@/services/database/queries/institution'
import { useInstitutionsStore } from '@/stores/institutions'
import { useEditInstitution } from './useEditInstitution'

jest.mock('@/services/database/queries/institution', () => ({
  institutionQueries: {
    update: jest.fn(),
  },
}))

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({
    id: 'inst-1',
    name: 'Nubank',
    color: '#820AD1',
    icon: 'landmark',
  }),
}))

const mockedUpdate = jest.mocked(institutionQueries.update)

describe('useEditInstitution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useInstitutionsStore.setState({
      institutions: [
        {
          id: 'inst-1',
          name: 'Nubank',
          color: '#820AD1',
          icon: 'landmark',
        },
      ],
    })
    mockedUpdate.mockResolvedValue(undefined as never)
  })

  it('updates an institution in the local database', async () => {
    const { result } = renderHook(() => useEditInstitution())

    act(() => {
      result.current.setName('Nubank Atualizado')
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockedUpdate).toHaveBeenCalledWith(
      'inst-1',
      expect.objectContaining({ name: 'Nubank Atualizado' }),
    )
  })
})
