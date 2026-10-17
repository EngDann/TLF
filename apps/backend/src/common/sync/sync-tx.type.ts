import { Prisma } from 'generated/prisma/client'

/** Client for sync push operations; pass through the outer `$transaction` callback. */
export type SyncTx = Prisma.TransactionClient
