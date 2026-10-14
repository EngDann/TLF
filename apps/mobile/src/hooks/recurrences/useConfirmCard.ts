import { useEffect, useState } from 'react'
import type { Recurrence } from '@/components/finance/recurrences/types'
import { accountQueries } from '@/services/database/repository/account'
import { categoryQueries } from '@/services/database/repository/category'
import { subCategoryQueries } from '@/services/database/repository/subCategory'
import type { IconKey } from '@/utils/icons'

export function useConfirmCard(recurrence: Recurrence, isConfirmed: boolean, isSkipped: boolean) {
  const [accountName, setAccountName] = useState(recurrence.accountId)
  const [subcategoryName, setSubcategoryName] = useState<string | undefined>()
  const [icon, setIcon] = useState<IconKey>('refresh-cw')
  const [iconBg, setIconBg] = useState('#4A5060')

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
          setIcon((category.icon as IconKey) || 'refresh-cw')
          setIconBg(category.color || '#4A5060')
          if (!recurrence.subcategoryId) setSubcategoryName(category.name)
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
  const acted = isConfirmed || isSkipped

  return { icon, iconBg, accountName, subcategoryName, isExpense, amountSign, acted }
}
