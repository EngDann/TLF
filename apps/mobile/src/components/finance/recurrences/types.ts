export type RecurrenceType = 'EXPENSE' | 'INCOME'
export type RecurrenceFrequency = 'MONTHLY' | 'WEEKLY' | 'YEARLY'
export type RecurrenceDuration = 'INDEFINITE' | number

export type Recurrence = {
  id: string
  description: string
  amount: number
  type: RecurrenceType
  frequency: RecurrenceFrequency
  dueDay: number
  accountId: string
  categoryId: string
  subcategoryId?: string
  startDate: string
  duration: RecurrenceDuration
  isActive: boolean
}

export type PaymentHistoryEntry = {
  month: number
  year: number
  status: 'CONFIRMED' | 'SKIPPED' | 'PENDING'
  date?: string
  amount?: number
}

export type RecurrenceAccountOption = {
  id: string
  name: string
}

export type RecurrenceCategoryOption = {
  id: string
  name: string
  icon: string
  color: string
}

export type RecurrenceSubcategoryOption = {
  id: string
  categoryId: string
  name: string
}
