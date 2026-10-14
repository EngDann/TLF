import { useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import type {
  RecurrenceAccountOption,
  RecurrenceCategoryOption,
  RecurrenceFrequency,
  RecurrenceSubcategoryOption,
  RecurrenceType,
} from '@/components/finance/recurrences/types'
import type { EditScope } from '@/hooks/recurrences/useEditScopeModal'
import { accountQueries } from '@/services/database/repository/account'
import { categoryQueries } from '@/services/database/repository/category'
import { recurrenceQueries } from '@/services/database/repository/recurrence'
import { subCategoryQueries } from '@/services/database/repository/subCategory'
import type { IconKey } from '@/utils/icons'

const MAX_CENTS = 9_999_999
const NO_SUBCATEGORY = ''

export const frequencyOptions = [
  { label: 'Diária', value: 'DAILY' },
  { label: 'Semanal', value: 'WEEKLY' },
  { label: 'Quinzenal', value: 'BIWEEKLY' },
  { label: 'Mensal', value: 'MONTHLY' },
  { label: 'Anual', value: 'YEARLY' },
]

export const parseISODate = (iso?: string): Date | null => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export const formatDateDisplay = (date: Date | null): string => {
  if (!date) return ''
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

type Errors = Partial<Record<string, string>>

export function useNewRecurrence() {
  const params = useLocalSearchParams<{
    id?: string
    description?: string
    amount?: string
    type?: RecurrenceType
    frequency?: RecurrenceFrequency
    dueDay?: string
    accountId?: string
    categoryId?: string
    subcategoryId?: string
    startDate?: string
    isActive?: string
  }>()

  const isEditing = !!params.id

  const [accounts, setAccounts] = useState<RecurrenceAccountOption[]>([])
  const [categories, setCategories] = useState<RecurrenceCategoryOption[]>([])
  const [subcategories, setSubcategories] = useState<RecurrenceSubcategoryOption[]>([])
  const [type, setType] = useState<RecurrenceType>(params.type ?? 'EXPENSE')
  const [amountCents, setAmountCents] = useState<number>(() => {
    if (params.amount) {
      const parsed = parseFloat(params.amount.replace(',', '.'))
      return isNaN(parsed) ? 0 : Math.round(parsed * 100)
    }
    return 0
  })
  const [keypadVisible, setKeypadVisible] = useState(false)
  const [description, setDescription] = useState(params.description ?? '')
  const [frequency, setFrequency] = useState<string>(params.frequency ?? 'MONTHLY')
  const [dueDay, setDueDay] = useState(params.dueDay ?? '1')
  const [accountId, setAccountId] = useState(params.accountId ?? '')
  const [categoryId, setCategoryId] = useState(params.categoryId ?? '')
  const [subcategoryId, setSubcategoryId] = useState<string>(params.subcategoryId ?? NO_SUBCATEGORY)
  const [startDate, setStartDate] = useState<Date | null>(() => parseISODate(params.startDate))
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [isIndeterminate, setIsIndeterminate] = useState(true)
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [isActive, setIsActive] = useState(params.isActive !== '0')
  const [errors, setErrors] = useState<Errors>({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [showEditScopeModal, setShowEditScopeModal] = useState(false)
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true

    const loadOptions = async () => {
      try {
        const [accountRows, categoryRows] = await Promise.all([
          accountQueries.getAll(),
          categoryQueries.getAll(),
        ])
        if (!active) return

        const nextAccounts = accountRows.map((account) => ({
          id: account.id,
          name: account.name,
        }))
        const nextCategories = categoryRows.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
        }))

        setAccounts(nextAccounts)
        setCategories(nextCategories)

        setAccountId((current) => current || nextAccounts[0]?.id || '')
        setCategoryId((current) => current || nextCategories[0]?.id || '')
      } catch (error) {
        console.error('Erro ao carregar opcoes de recorrencia:', error)
      }
    }

    void loadOptions()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    if (!categoryId) {
      setSubcategories([])
      return
    }

    void subCategoryQueries
      .getByCategoryId(categoryId)
      .then((rows) => {
        if (!active) return
        setSubcategories(
          rows.map((subCategory) => ({
            id: subCategory.id,
            categoryId: subCategory.categoryId,
            name: subCategory.name,
          })),
        )
      })
      .catch(() => {
        if (active) setSubcategories([])
      })

    return () => {
      active = false
    }
  }, [categoryId])

  const handleKeypad = (key: string) => {
    setAmountCents((prev) => {
      if (key === 'del') return Math.floor(prev / 10)
      const digit = parseInt(key, 10)
      if (isNaN(digit)) return prev
      const next = prev * 10 + digit
      return next > MAX_CENTS ? prev : next
    })
  }

  const validate = (): boolean => {
    const newErrors: Errors = {}
    if (amountCents <= 0) newErrors.amount = 'Informe um valor maior que zero'
    if (!description.trim()) newErrors.description = 'Campo obrigatório'
    if (!dueDay) newErrors.dueDay = 'Campo obrigatório'
    if (!accountId) newErrors.accountId = 'Campo obrigatório'
    if (!startDate) newErrors.startDate = 'Campo obrigatório'
    if (!isIndeterminate && !endDate) newErrors.endDate = 'Campo obrigatório'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateField = (field: string, value: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      if (value.trim()) delete next[field]
      else next[field] = 'Campo obrigatório'
      return next
    })
  }

  const showSuccessAndGoBack = () => {
    setShowSuccess(true)
    globalThis.setTimeout(() => {
      setShowSuccess(false)
      router.back()
    }, 1600)
  }

  const persist = async () => {
    if (!startDate || !accountId) return

    const payload = {
      accountId,
      categoryId: categoryId || null,
      subCategoryId: subcategoryId || null,
      description: description.trim(),
      amount: amountCents / 100,
      isActive,
      chargeDate: parseInt(dueDay, 10) || 1,
      startDate,
      endDate: isIndeterminate ? null : endDate,
    }

    setIsSaving(true)
    try {
      if (isEditing && params.id) {
        await recurrenceQueries.update(params.id, payload)
      } else {
        await recurrenceQueries.create(payload)
      }
      showSuccessAndGoBack()
    } catch (error) {
      console.error('Erro ao salvar recorrencia:', error)
      setErrors((prev) => ({ ...prev, description: 'Não foi possível salvar. Tente novamente.' }))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = () => {
    if (!validate() || isSaving) return
    if (isEditing) {
      setShowEditScopeModal(true)
      return
    }
    void persist()
  }

  const handleScopeConfirm = (_scope: EditScope) => {
    setShowEditScopeModal(false)
    void persist()
  }

  const isFormValid =
    isEditing || (amountCents > 0 && !!description.trim() && startDate != null && !!accountId)
  const selectedFrequencyLabel =
    frequencyOptions.find((f) => f.value === frequency)?.label ?? 'Mensal'
  const selectedAccount = accounts.find((a) => a.id === accountId) ?? {
    id: '',
    name: 'Selecione',
  }
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? {
    id: '',
    name: 'Selecione',
    icon: 'tag' as IconKey,
    color: '#4A5060',
  }
  const subcategoryOptions = subcategories
  const selectedSubcategory = subcategoryOptions.find((s) => s.id === subcategoryId)

  return {
    isEditing,
    type,
    setType,
    amountCents,
    keypadVisible,
    setKeypadVisible,
    description,
    setDescription,
    frequency,
    setFrequency,
    dueDay,
    setDueDay,
    accountId,
    setAccountId,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isIndeterminate,
    setIsIndeterminate,
    showStartPicker,
    setShowStartPicker,
    showEndPicker,
    setShowEndPicker,
    isActive,
    setIsActive,
    errors,
    showSuccess,
    showEditScopeModal,
    setShowEditScopeModal,
    showFrequencyPicker,
    setShowFrequencyPicker,
    showDayPicker,
    setShowDayPicker,
    showAccountPicker,
    setShowAccountPicker,
    showCategoryPicker,
    setShowCategoryPicker,
    showSubcategoryPicker,
    setShowSubcategoryPicker,
    isFormValid,
    selectedFrequencyLabel,
    selectedAccount,
    selectedCategory,
    subcategoryOptions,
    selectedSubcategory,
    accounts,
    categories,
    handleKeypad,
    handleSave,
    handleScopeConfirm,
    validateField,
    NO_SUBCATEGORY,
  }
}
