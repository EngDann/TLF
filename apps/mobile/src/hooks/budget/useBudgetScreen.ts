import { useCallback, useState } from 'react'
import { budgetQueries } from '@/services/database/repository/budget'
import { BudgetData, BudgetListItem, BudgetType } from 'types/types'
import { formatCurrency } from '@/utils/formatters'

const MAX_CENTS = 9_999_999

export type BudgetInitialValues = {
  name: string
  type?: BudgetType
  amountLimit?: number
  categoryId?: string
  month: number
  year: number
}

function mapBudgetToListItem(budget: {
  id: string
  name: string
  categoryId: string
  amountLimit: number
  month: number
  year: number
}): BudgetListItem {
  return {
    id: budget.id,
    name: budget.name,
    categoryId: budget.categoryId,
    amountLimit: budget.amountLimit,
    month: budget.month,
    year: budget.year,
    totalValue: budget.amountLimit / 100,
    spentValue: 0,
  }
}

export function useBudgetScreen(initialValues?: BudgetInitialValues) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [type, setType] = useState<BudgetType>(initialValues?.type ?? 'BUDGET')
  const [amountLimit, setAmountLimit] = useState(initialValues?.amountLimit ?? 0)
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? '')
  const [month, setMonth] = useState(initialValues?.month ?? new Date().getMonth())
  const [year, setYear] = useState(initialValues?.year ?? new Date().getFullYear())
  const [submitting, setSubmitting] = useState(false)
  const [showKeypad, setShowKeypad] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [budgets, setBudgets] = useState<BudgetListItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const dismissFeedback = useCallback(() => setFeedbackMessage(null), [])

  async function fetchBudgets() {
    try {
      const data = await budgetQueries.getAll()
      setBudgets(data.map(mapBudgetToListItem))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setFeedbackMessage(errorMessage)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchBudgets()
    setRefreshing(false)
  }

  async function fetchBudget(id: string) {
    const budget = await budgetQueries.getById(id)
    setName(budget.name)
    setAmountLimit(budget.amountLimit)
    setMonth(budget.month - 1)
    setYear(budget.year)
    setCategoryId(budget.categoryId)
  }

  async function deleteBudget(id: string) {
    await budgetQueries.delete(id)
    setBudgets((prev) => prev.filter((item) => item.id !== id))
  }

  const handleKeypad = useCallback((key: string) => {
    setAmountLimit((prev) => {
      if (key === 'del') return Math.floor(prev / 10)
      const digit = parseInt(key, 10)
      if (isNaN(digit)) return prev
      const next = prev * 10 + digit
      return next > MAX_CENTS ? prev : next
    })
  }, [])

  const handleTypeChange = (newType: BudgetType) => {
    setType(newType)
    setCategoryId('')
  }

  const amount = formatCurrency(amountLimit / 100)

  const errors = {
    amount: amountLimit === 0 ? 'Informe o valor da transação' : undefined,
  }

  const isValid = !errors.amount

  const reset = () => {
    setName('orçamento')
    setAmountLimit(0)
    setCategoryId('')
    setMonth(new Date().getMonth())
    setYear(new Date().getFullYear())
    setSubmitAttempted(false)
    setFeedbackMessage(null)
  }

  const handleCreateSubmit = async (onSuccess?: () => void) => {
    setSubmitAttempted(true)
    if (!isValid || submitting) return
    setFeedbackMessage(null)
    setSubmitting(true)
    try {
      const payload: BudgetData = {
        name,
        amountLimit,
        month: month + 1,
        year,
        categoryId: categoryId || undefined,
      }

      await budgetQueries.create({
        name: payload.name,
        amountLimit: payload.amountLimit,
        month: payload.month,
        year: payload.year,
        categoryId: payload.categoryId ?? '',
      })
      reset()
      onSuccess?.()
    } catch (error) {
      console.error('[BudgetCreateSubmit]', error)
      setFeedbackMessage('Não foi possível salvar o orçamento. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (id: string, onSuccess?: () => void) => {
    setSubmitAttempted(true)
    if (!isValid || submitting) return
    setFeedbackMessage(null)
    setSubmitting(true)
    try {
      await budgetQueries.update(id, {
        name,
        amountLimit,
        month: month + 1,
        year,
        categoryId: categoryId || undefined,
      })
      onSuccess?.()
    } catch (error) {
      console.error('[BudgetEditSubmit]', error)
      setFeedbackMessage('Não foi possível salvar o orçamento. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    name,
    setName,
    type,
    handleTypeChange,
    amount,
    amountLimit,
    setAmountLimit,
    categoryId,
    setCategoryId,
    month,
    setMonth,
    year,
    setYear,
    handleKeypad,
    showKeypad,
    setShowKeypad,
    showCategoryPicker,
    setShowCategoryPicker,
    errors,
    submitAttempted,
    isValid,
    submitting,
    handleCreateSubmit,
    handleEditSubmit,
    budgets,
    setBudgets,
    fetchBudgets,
    fetchBudget,
    deleteBudget,
    refreshing,
    setRefreshing,
    onRefresh,
    feedbackMessage,
    setFeedbackMessage,
    dismissFeedback,
  }
}
