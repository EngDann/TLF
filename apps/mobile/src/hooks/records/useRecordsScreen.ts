import type {
  CategoryData,
  SummaryData,
  TransactionListItem,
} from '@/components/finance/records/types'
import type { ThemedOverlayAlertAction } from '@/components/ui/ThemedOverlayAlert'
import { transactionQueries } from '@/services/database/repository/transaction'
import { TransactionType } from '@/services/database/models/transaction'
import {
  buildCategoryData,
  buildCategoryOptions,
  buildSummaryData,
  filterTransactions,
} from '@/utils/records/recordsCalculations'
import { mapLocalTransactionToListItem } from '@/utils/records/transactionMappers'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'

const TRANSACTION_TYPE_OPTIONS: TransactionType[] = ['EXPENSE', 'INCOME', 'TRANSFER']

export type RecordsScreenAlert = {
  title?: string
  message: string
  actions: ThemedOverlayAlertAction[]
}

export function useRecordsScreen() {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [alert, setAlert] = useState<RecordsScreenAlert | null>(null)

  useEffect(() => {
    let isActive = true

    const loadTransactions = async () => {
      try {
        setIsLoading(true)
        const filters = typeFilter !== 'ALL' ? { type: typeFilter } : undefined
        const localData = filters
          ? await transactionQueries.getByFilters(filters)
          : await transactionQueries.getAll()

        if (!isActive) return

        setTransactions(localData.map(mapLocalTransactionToListItem))
        setError(null)
      } catch (localError) {
        if (!isActive) return
        console.error('Erro ao carregar transacoes locais:', localError)
        setError('Nao foi possivel carregar as transacoes.')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadTransactions()

    return () => {
      isActive = false
    }
  }, [typeFilter])

  const dismissAlert = useCallback(() => setAlert(null), [])

  const handleEdit = useCallback((transaction: TransactionListItem) => {
    router.push({
      pathname: '/edit-record/[id]',
      params: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount.toString(),
        categoryId: transaction.category,
        description: transaction.description,
      },
    })
  }, [])

  const performDelete = useCallback(
    async (transactionId: string) => {
      setAlert(null)

      try {
        await transactionQueries.delete(transactionId)
        setTransactions((prev) => prev.filter((item) => item.id !== transactionId))
        setError(null)
        setAlert({
          title: 'Transacao excluida',
          message: 'A transacao foi removida com sucesso.',
          actions: [{ label: 'Entendi', onPress: dismissAlert }],
        })
      } catch (deleteError) {
        console.error('Erro ao excluir transacao:', deleteError)
        setError('Nao foi possivel excluir a transacao.')
      }
    },
    [dismissAlert],
  )

  const handleDelete = useCallback(
    (transactionId: string) => {
      setAlert({
        title: 'Confirmar exclusao',
        message: 'Deseja excluir esta transacao?',
        actions: [
          {
            label: 'Cancelar',
            onPress: dismissAlert,
            fillTone: 'muted',
            textTone: 'default',
          },
          {
            label: 'Excluir',
            onPress: () => void performDelete(transactionId),
            fillTone: 'destructive',
            textTone: 'onPrimary',
          },
        ],
      })
    },
    [dismissAlert, performDelete],
  )

  const categoryOptions = useMemo(() => buildCategoryOptions(transactions, []), [transactions])

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        categoryFilter,
        typeFilter,
        searchQuery,
      }),
    [categoryFilter, searchQuery, transactions, typeFilter],
  )

  const summaryData: SummaryData = useMemo(
    () => buildSummaryData(filteredTransactions),
    [filteredTransactions],
  )

  const categoryData: CategoryData[] = useMemo(
    () => buildCategoryData(filteredTransactions),
    [filteredTransactions],
  )

  return {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    typeFilter,
    setTypeFilter,
    categoryOptions,
    transactionTypeOptions: TRANSACTION_TYPE_OPTIONS,
    filteredTransactions,
    summaryData,
    categoryData,
    isLoading,
    error,
    handleEdit,
    handleDelete,
    alert,
    dismissAlert,
  }
}
