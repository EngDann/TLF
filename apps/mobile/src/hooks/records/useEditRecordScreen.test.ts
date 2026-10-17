import { renderHook, waitFor } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEditRecordScreen } from './useEditRecordScreen'
import { TRANSACTION_FORM_COPY } from '@/utils/transactionForm'
import { getTransactionById } from '@/services/database/repository/transaction'

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}))

jest.mock('@/services/database/repository/transaction', () => ({
  getTransactionById: jest.fn(),
}))

const mockedBack = jest.mocked(router.back)
const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams)
const mockedGetTransactionById = jest.mocked(getTransactionById)

describe('useEditRecordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseLocalSearchParams.mockReturnValue({ id: 'tx-1' })
    mockedGetTransactionById.mockResolvedValue({
      id: 'tx-1',
      type: 'EXPENSE',
      amount: 150.5,
      accountId: 'acc-1',
      categoryId: 'food',
      subcategoryId: null,
      description: 'Almoco',
    } as never)
  })

  it('loads transaction from the database for edit', async () => {
    const { result } = renderHook(() => useEditRecordScreen())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.mode).toBe('edit')
    expect(result.current.title).toBe(TRANSACTION_FORM_COPY.editTitle)
    expect(result.current.initialValues).toEqual({
      id: 'tx-1',
      type: 'EXPENSE',
      amountCents: 15050,
      accountId: 'acc-1',
      categoryId: 'food',
      subcategoryId: '',
      notes: 'Almoco',
    })
  })

  it('navigates back from header and success handlers', async () => {
    const { result } = renderHook(() => useEditRecordScreen())

    await waitFor(() => expect(result.current.loading).toBe(false))

    result.current.handleBack()
    result.current.handleSuccess()

    expect(mockedBack).toHaveBeenCalledTimes(2)
  })
})
