import { renderHook, act } from '@testing-library/react-native'
import { budgetQueries } from '@/services/database/repository/budget'
import { useBudgetScreen } from './useBudgetScreen'

jest.mock('@/services/database/repository/budget', () => ({
  budgetQueries: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

const mockedBudgetQueries = jest.mocked(budgetQueries)

describe('useBudgetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useBudgetScreen())

      expect(result.current.name).toBe('')
      expect(result.current.type).toBe('BUDGET')
      expect(result.current.amountLimit).toBe(0)
      expect(result.current.categoryId).toBe('')
      expect(result.current.submitting).toBe(false)
      expect(result.current.budgets).toEqual([])
      expect(result.current.feedbackMessage).toBeNull()
    })

    it('should initialize with provided initial values', () => {
      const initialValues = {
        name: 'Groceries',
        type: 'BUDGET' as const,
        amountLimit: 50000,
        categoryId: 'cat-1',
        month: 4,
        year: 2026,
      }

      const { result } = renderHook(() => useBudgetScreen(initialValues))

      expect(result.current.name).toBe('Groceries')
      expect(result.current.amountLimit).toBe(50000)
      expect(result.current.categoryId).toBe('cat-1')
      expect(result.current.month).toBe(4)
      expect(result.current.year).toBe(2026)
    })
  })

  describe('create/update', () => {
    it('creates a budget in the local database', async () => {
      mockedBudgetQueries.create.mockResolvedValue({} as never)
      const { result } = renderHook(() => useBudgetScreen())

      act(() => {
        result.current.setName('Mercado')
        result.current.setAmountLimit(10000)
      })

      await act(async () => {
        await result.current.handleCreateSubmit()
      })

      expect(mockedBudgetQueries.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Mercado',
          amountLimit: 10000,
        }),
      )
    })

    it('updates a budget in the local database', async () => {
      mockedBudgetQueries.update.mockResolvedValue({} as never)
      const { result } = renderHook(() =>
        useBudgetScreen({
          name: 'Mercado',
          amountLimit: 10000,
          month: 4,
          year: 2026,
        }),
      )

      await act(async () => {
        await result.current.handleEditSubmit('budget-1')
      })

      expect(mockedBudgetQueries.update).toHaveBeenCalledWith(
        'budget-1',
        expect.objectContaining({
          name: 'Mercado',
          amountLimit: 10000,
        }),
      )
    })
  })
})
