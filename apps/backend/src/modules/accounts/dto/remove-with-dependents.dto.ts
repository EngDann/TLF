import { SyncTx } from '@common/sync/sync-tx.type'

export type RemoveAccountWithDependentsDto = {
  tx: SyncTx
  userId: string
  accountId: string
  invoiceIds: string[]
  recurrenceIds: string[]
  transactionIds: string[]
}
