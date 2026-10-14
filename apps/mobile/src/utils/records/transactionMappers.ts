import type { TransactionListItem } from '@/components/finance/records/types'
import type { Transaction } from '@/services/database/models/transaction'

export function mapLocalTransactionToListItem(transaction: Transaction): TransactionListItem {
  return {
    id: transaction.id,
    description: transaction.description,
    category: transaction.categoryId || 'Sem categoria',
    type: transaction.type,
    date: transaction.date,
    amount: transaction.amount,
  }
}
