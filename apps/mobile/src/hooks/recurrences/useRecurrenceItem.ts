import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import type { Recurrence } from '@/components/finance/recurrences/types'
import { accountQueries } from '@/services/database/repository/account'
import { categoryQueries } from '@/services/database/repository/category'
import { subCategoryQueries } from '@/services/database/repository/subCategory'
import type { IconKey } from '@/utils/icons'

export function useRecurrenceItem(recurrence: Recurrence) {
  const [accountName, setAccountName] = useState(recurrence.accountId)
  const [categoryName, setCategoryName] = useState(recurrence.categoryId)
  const [subcategoryName, setSubcategoryName] = useState<string | undefined>()
  const [icon, setIcon] = useState<IconKey>('tag')
  const [iconColor, setIconColor] = useState('#4A5060')

  useEffect(() => {
    let active = true

    void accountQueries
      .getById(recurrence.accountId)
      .then((account) => {
        if (active) setAccountName(account.name)
      })
      .catch(() => undefined)

    if (recurrence.categoryId) {
      void categoryQueries
        .getById(recurrence.categoryId)
        .then((category) => {
          if (!active) return
          setCategoryName(category.name)
          setIcon((category.icon as IconKey) || 'tag')
          setIconColor(category.color || '#4A5060')
        })
        .catch(() => undefined)
    }

    if (recurrence.subcategoryId) {
      void subCategoryQueries
        .getById(recurrence.subcategoryId)
        .then((subCategory) => {
          if (active) setSubcategoryName(subCategory.name)
        })
        .catch(() => undefined)
    }

    return () => {
      active = false
    }
  }, [recurrence.accountId, recurrence.categoryId, recurrence.subcategoryId])

  const isExpense = recurrence.type === 'EXPENSE'
  const amountSign = isExpense ? '−' : '+'

  const handlePress = () => {
    router.push({
      pathname: '/recurrence/[id]',
      params: {
        id: recurrence.id,
        description: recurrence.description,
        amount: recurrence.amount.toString(),
        type: recurrence.type,
        frequency: recurrence.frequency,
        dueDay: recurrence.dueDay.toString(),
        accountId: recurrence.accountId,
        categoryId: recurrence.categoryId,
        subcategoryId: recurrence.subcategoryId ?? '',
        startDate: recurrence.startDate,
        isActive: recurrence.isActive ? '1' : '0',
      },
    })
  }

  return {
    icon,
    iconColor,
    accountName,
    subcategoryName,
    categoryName,
    isExpense,
    amountSign,
    handlePress,
  }
}
