import { useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import type { PaymentHistoryEntry, Recurrence } from '@/components/finance/recurrences/types'
import { accountQueries } from '@/services/database/repository/account'
import { categoryQueries } from '@/services/database/repository/category'
import { useRecurrencesStore } from '@/stores/recurrences'
import { getNextBillingLabel } from '@/utils/recurrences/dates'
import type { IconKey } from '@/utils/icons'

export function useRecurrenceDetails() {
  const params = useLocalSearchParams<{
    id: string
    description: string
    amount: string
    type: string
    frequency: string
    dueDay: string
    accountId: string
    categoryId: string
    subcategoryId?: string
    startDate: string
    isActive: string
  }>()

  const setPendingDeleteId = useRecurrencesStore((state) => state.setPendingDeleteId)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [accountName, setAccountName] = useState(params.accountId ?? '')
  const [categoryName, setCategoryName] = useState(params.categoryId ?? '')
  const [icon, setIcon] = useState<IconKey>('tag')
  const [iconColor, setIconColor] = useState('#4A5060')

  const id = params.id ?? ''
  const description = params.description ?? ''
  const amount = parseFloat(params.amount ?? '0')
  const type = params.type ?? 'EXPENSE'
  const frequency = params.frequency ?? 'MONTHLY'
  const dueDay = parseInt(params.dueDay ?? '1', 10)
  const accountId = params.accountId ?? ''
  const categoryId = params.categoryId ?? ''
  const subcategoryId = params.subcategoryId ?? ''
  const startDate = params.startDate ?? ''
  const isActive = params.isActive === '1'

  useEffect(() => {
    let active = true

    if (accountId) {
      void accountQueries
        .getById(accountId)
        .then((account) => {
          if (active) setAccountName(account.name)
        })
        .catch(() => undefined)
    }

    if (categoryId) {
      void categoryQueries
        .getById(categoryId)
        .then((category) => {
          if (!active) return
          setCategoryName(category.name)
          setIcon((category.icon as IconKey) || 'tag')
          setIconColor(category.color || '#4A5060')
        })
        .catch(() => undefined)
    }

    return () => {
      active = false
    }
  }, [accountId, categoryId])

  const isExpense = type === 'EXPENSE'
  const frequencyLabel =
    frequency === 'MONTHLY' ? 'Mensal' : frequency === 'WEEKLY' ? 'Semanal' : 'Anual'
  const typeLabel = `${categoryName} ${frequencyLabel}`

  const history: PaymentHistoryEntry[] = []
  const annualProjection = amount * 12
  const nextBillingLabel = getNextBillingLabel(dueDay)

  const [intPart, decPart] = amount.toFixed(2).split('.')
  const intFormatted = parseInt(intPart, 10).toLocaleString('pt-BR')

  const recurrenceForModal: Recurrence = {
    id,
    description,
    amount,
    type: type as Recurrence['type'],
    frequency: frequency as Recurrence['frequency'],
    dueDay,
    accountId,
    categoryId,
    subcategoryId: subcategoryId || undefined,
    startDate,
    duration: 'INDEFINITE',
    isActive,
  }

  const handleEdit = () => {
    router.push({
      pathname: '/recurrence/new',
      params: {
        id,
        description,
        amount: params.amount,
        type,
        frequency,
        dueDay: params.dueDay,
        accountId,
        categoryId,
        subcategoryId: subcategoryId ?? '',
        startDate,
        isActive: params.isActive,
      },
    })
  }

  const handleDeleteConfirm = () => {
    setPendingDeleteId(id)
    setShowDeleteModal(false)
    router.back()
  }

  return {
    id,
    description,
    amount,
    dueDay,
    isActive,
    isExpense,
    accountName,
    frequencyLabel,
    typeLabel,
    icon,
    iconColor,
    history,
    annualProjection,
    nextBillingLabel,
    intFormatted,
    decPart,
    recurrenceForModal,
    showDeleteModal,
    setShowDeleteModal,
    handleEdit,
    handleDeleteConfirm,
  }
}
