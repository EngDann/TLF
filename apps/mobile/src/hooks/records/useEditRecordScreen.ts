import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import type { TransactionInitialValues } from '@/hooks/transactions/useTransactionForm'
import { getTransactionById } from '@/services/database/repository/transaction'
import { TRANSACTION_FORM_COPY, parseRouteString } from '@/utils/transactionForm'

export function useEditRecordScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const recordId = parseRouteString(params.id)

  const [initialValues, setInitialValues] = useState<TransactionInitialValues | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!recordId) {
      setLoadError('Transação não encontrada')
      setLoading(false)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const transaction = await getTransactionById(recordId)
        if (cancelled) return
        setInitialValues({
          id: transaction.id,
          type: transaction.type,
          amountCents: Math.round(transaction.amount * 100),
          accountId: transaction.accountId,
          categoryId: transaction.categoryId ?? '',
          subcategoryId: transaction.subcategoryId ?? '',
          notes: transaction.description ?? '',
        })
      } catch {
        if (!cancelled) {
          setLoadError('Não foi possível carregar a transação')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [recordId])

  const handleBack = useCallback(() => {
    router.back()
  }, [])

  const handleSuccess = useCallback(() => {
    router.back()
  }, [])

  return {
    title: TRANSACTION_FORM_COPY.editTitle,
    mode: 'edit' as const,
    initialValues,
    loading,
    loadError,
    handleBack,
    handleSuccess,
  }
}
