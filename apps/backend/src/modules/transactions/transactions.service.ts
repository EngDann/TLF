import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '@common/prisma/prisma.service'
import { createDeletedRecords } from '@common/sync/deleted-record.util'
import { buildTimestampWhere } from '@common/sync/sync-query.util'
import { SyncTx } from '@common/sync/sync-tx.type'
import { TableName, TransactionStatus } from 'generated/prisma/client'
import { FindManyTransactionsDto } from './dto/find-many.dto'
import { RemoveTransactionRequestDto } from './dto/remove.dto'
import { SyncTransactionDto } from './dto/sync-transaction.dto'

type SyncDb = SyncTx | PrismaService

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(dto: FindManyTransactionsDto) {
    const { userId, id, accountId, categoryId, type, status, createdAfter, updatedAfter } = dto

    return this.prisma.transaction.findMany({
      where: {
        account: { institution: { userId } },
        ...(id && { id }),
        ...(accountId && { accountId }),
        ...(categoryId && { categoryId }),
        ...(type && { type }),
        ...(status && { status }),
        ...buildTimestampWhere({ createdAfter, updatedAfter }),
      },
    })
  }

  private async assertTransactionOwnership(userId: string, id: string, tx?: SyncTx) {
    const db = tx ?? this.prisma
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        account: {
          include: {
            institution: true,
          },
        },
      },
    })

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada')
    }

    if (transaction.account.institution.userId !== userId) {
      throw new ForbiddenException('Acesso negado')
    }
  }

  private async assertTransactionRelations(
    userId: string,
    data: {
      accountId: string
      invoiceId?: string | null
      recurrenceId?: string | null
      destinationAccountId?: string | null
    },
    db: SyncDb = this.prisma,
  ): Promise<void> {
    const account = await db.account.findUnique({
      where: { id: data.accountId },
      include: { institution: true },
    })
    if (!account) throw new NotFoundException('Conta não encontrada')
    if (account.institution.userId !== userId) throw new ForbiddenException('Acesso negado')

    if (data.invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { account: { include: { institution: true } } },
      })
      if (!invoice) throw new NotFoundException('Fatura não encontrada')
      if (invoice.account.institution.userId !== userId)
        throw new ForbiddenException('Acesso negado')
      if (invoice.accountId !== data.accountId) {
        throw new BadRequestException('Fatura deve pertencer à mesma conta da transação')
      }
    }

    if (data.recurrenceId) {
      const recurrence = await db.recurrence.findUnique({
        where: { id: data.recurrenceId },
        include: { account: { include: { institution: true } } },
      })
      if (!recurrence) throw new NotFoundException('Recorrência não encontrada')
      if (recurrence.account.institution.userId !== userId) {
        throw new ForbiddenException('Acesso negado')
      }
      if (recurrence.accountId !== data.accountId) {
        throw new BadRequestException('Recorrência deve pertencer à mesma conta da transação')
      }
    }

    if (data.destinationAccountId) {
      const destination = await db.account.findUnique({
        where: { id: data.destinationAccountId },
        include: { institution: true },
      })
      if (!destination) throw new NotFoundException('Conta destino não encontrada')
      if (destination.institution.userId !== userId) throw new ForbiddenException('Acesso negado')
    }
  }

  async syncCreate(userId: string, dto: SyncTransactionDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    await this.assertTransactionRelations(
      userId,
      {
        accountId: dto.accountId,
        invoiceId: dto.invoiceId,
        recurrenceId: dto.recurrenceId,
        destinationAccountId: dto.destinationAccountId,
      },
      db,
    )

    return db.transaction.upsert({
      where: { id: dto.id },
      create: {
        id: dto.id,
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        subCategoryId: dto.subCategoryId ?? null,
        type: dto.type,
        amount: dto.amount,
        description: dto.description ?? null,
        date: dto.date ? new Date(dto.date) : new Date(),
        status: dto.status ?? TransactionStatus.COMPLETED,
        invoiceId: dto.invoiceId ?? null,
        recurrenceId: dto.recurrenceId ?? null,
        destinationAccountId: dto.destinationAccountId ?? null,
        installmentReference: dto.installmentReference ?? null,
        installmentNumber: dto.installmentNumber ?? null,
        installmentTotal: dto.installmentTotal ?? null,
        receiptUrl: dto.receiptUrl ?? null,
        externalId: dto.externalId ?? null,
        ...(dto.createdAt && { createdAt: new Date(dto.createdAt) }),
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
      update: {
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        subCategoryId: dto.subCategoryId ?? null,
        type: dto.type,
        amount: dto.amount,
        description: dto.description ?? null,
        date: dto.date ? new Date(dto.date) : undefined,
        status: dto.status,
        invoiceId: dto.invoiceId ?? null,
        recurrenceId: dto.recurrenceId ?? null,
        destinationAccountId: dto.destinationAccountId ?? null,
        installmentReference: dto.installmentReference ?? null,
        installmentNumber: dto.installmentNumber ?? null,
        installmentTotal: dto.installmentTotal ?? null,
        receiptUrl: dto.receiptUrl ?? null,
        externalId: dto.externalId ?? null,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async syncUpdate(userId: string, dto: SyncTransactionDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    await this.assertTransactionOwnership(userId, dto.id, tx)
    await this.assertTransactionRelations(
      userId,
      {
        accountId: dto.accountId,
        invoiceId: dto.invoiceId,
        recurrenceId: dto.recurrenceId,
        destinationAccountId: dto.destinationAccountId,
      },
      db,
    )

    return db.transaction.update({
      where: { id: dto.id },
      data: {
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        subCategoryId: dto.subCategoryId ?? null,
        type: dto.type,
        amount: dto.amount,
        description: dto.description ?? null,
        date: dto.date ? new Date(dto.date) : undefined,
        status: dto.status,
        invoiceId: dto.invoiceId ?? null,
        recurrenceId: dto.recurrenceId ?? null,
        destinationAccountId: dto.destinationAccountId ?? null,
        installmentReference: dto.installmentReference ?? null,
        installmentNumber: dto.installmentNumber ?? null,
        installmentTotal: dto.installmentTotal ?? null,
        receiptUrl: dto.receiptUrl ?? null,
        externalId: dto.externalId ?? null,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async remove(dto: RemoveTransactionRequestDto, tx?: SyncTx): Promise<void> {
    const { userId, id } = dto
    await this.assertTransactionOwnership(userId, id, tx)

    const perform = async (client: SyncTx) => {
      await createDeletedRecords({
        tx: client,
        userId,
        tableName: TableName.TRANSACTIONS,
        recordIds: [id],
      })
      await client.transaction.delete({ where: { id } })
    }

    if (tx) await perform(tx)
    else await this.prisma.$transaction(perform)
  }
}
