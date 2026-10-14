import type { Recurrence } from '@/components/finance/recurrences/types'
import type { Recurrence as RecurrenceModel } from '@/services/database/models/recurrence'

export function mapLocalRecurrenceToListItem(recurrence: RecurrenceModel): Recurrence {
  return {
    id: recurrence.id,
    description: recurrence.description,
    amount: recurrence.amount,
    type: 'EXPENSE',
    frequency: 'MONTHLY',
    dueDay: recurrence.chargeDate,
    accountId: recurrence.accountId,
    categoryId: recurrence.categoryId ?? '',
    subcategoryId: recurrence.subCategoryId ?? undefined,
    startDate: recurrence.startDate.toISOString().slice(0, 10),
    duration: recurrence.endDate ? 'INDEFINITE' : 'INDEFINITE',
    isActive: recurrence.isActive,
  }
}
