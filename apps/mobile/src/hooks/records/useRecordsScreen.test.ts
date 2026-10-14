import { renderHook, act, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { transactionQueries } from '@/services/database/repository/transaction'
import { useRecordsScreen } from './useRecordsScreen'

jest.mock('@/services/database/repository/transaction', () => ({
  transactionQueries: {
    getAll: jest.fn(),
    getByFilters: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))

const mockedGetAll = jest.mocked(transactionQueries.getAll)
const mockedGetByFilters = jest.mocked(transactionQueries.getByFilters)
const mockedDelete = jest.mocked(transactionQueries.delete)
const mockedPush = jest.mocked(router.push)

const localTransactions = [
  {
    id: 'tx-1',
    description: 'Aluguel',
    categoryId: 'Moradia',
    type: 'EXPENSE' as const,
    date: new Date('2026-05-01'),
    amount: 1500,
  },
  {
    id: 'tx-2',
    description: 'Salario',
    categoryId: 'Salario',
    type: 'INCOME' as const,
    date: new Date('2026-04-30'),
    amount: 5500,
  },
]

describe('useRecordsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetAll.mockResolvedValue(localTransactions as never)
    mockedGetByFilters.mockResolvedValue(localTransactions as never)
  })

  it('loads local transactions on mount', async () => {
    const { result } = renderHook(() => useRecordsScreen())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.filteredTransactions).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('filters transactions by search query', async () => {
    const { result } = renderHook(() => useRecordsScreen())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setSearchQuery('Aluguel')
    })

    expect(result.current.filteredTransactions).toHaveLength(1)
    expect(result.current.filteredTransactions[0].description).toBe('Aluguel')
  })

  it('computes summary from filtered transactions', async () => {
    const { result } = renderHook(() => useRecordsScreen())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    mockedGetByFilters.mockResolvedValue([localTransactions[1]] as never)

    act(() => {
      result.current.setTypeFilter('INCOME')
    })

    await waitFor(() => {
      expect(result.current.summaryData.income).toBeGreaterThan(0)
      expect(result.current.summaryData.expense).toBe(0)
    })
  })

  it('navigates to edit screen with transaction params', async () => {
    const { result } = renderHook(() => useRecordsScreen())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const transaction = result.current.filteredTransactions[0]

    act(() => {
      result.current.handleEdit(transaction)
    })

    expect(mockedPush).toHaveBeenCalled()
  })

  it('deletes a transaction from local database', async () => {
    mockedDelete.mockResolvedValue(undefined as never)
    const { result } = renderHook(() => useRecordsScreen())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.handleDelete('tx-1')
    })

    const confirmAction = result.current.alert?.actions.find((action) => action.label === 'Excluir')
    await act(async () => {
      await confirmAction?.onPress()
    })

    expect(mockedDelete).toHaveBeenCalledWith('tx-1')
  })
})
