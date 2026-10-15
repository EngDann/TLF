import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '@common/prisma/prisma.service'
import { createDeletedRecords } from '@common/sync/deleted-record.util'
import { buildTimestampWhere } from '@common/sync/sync-query.util'
import { TableName, TransactionStatus } from 'generated/prisma/client'
import { FindManyTransactionsDto } from './dto/find-many.dto'
import { RemoveTransactionRequestDto } from './dto/remove.dto'
import { SyncTransactionDto } from './dto/sync-transaction.dto'

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

  private async getTransactionOrThrow(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findUnique({
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
      throw new ForbiddenException('Você não tem acesso a esta transação')
    }

    return transaction
  }

  private async assertTransactionRelations(
    userId: string,
    data: {
      accountId: string
      invoiceId?: string | null
      recurrenceId?: string | null
      destinationAccountId?: string | null
    },
  ): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: data.accountId },
      include: { institution: true },
    })
    if (!account) throw new NotFoundException('Conta não encontrada')
    if (account.institution.userId !== userId) throw new ForbiddenException('Acesso negado')

    if (data.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({
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
      const recurrence = await this.prisma.recurrence.findUnique({
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
      const destination = await this.prisma.account.findUnique({
        where: { id: data.destinationAccountId },
        include: { institution: true },
      })
      if (!destination) throw new NotFoundException('Conta destino não encontrada')
      if (destination.institution.userId !== userId) throw new ForbiddenException('Acesso negado')
    }
  }

  async syncCreate(userId: string, dto: SyncTransactionDto) {
    await this.assertTransactionRelations(userId, {
      accountId: dto.accountId,
      invoiceId: dto.invoiceId,
      recurrenceId: dto.recurrenceId,
      destinationAccountId: dto.destinationAccountId,
    })

    return this.prisma.transaction.upsert({
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

  async syncUpdate(userId: string, dto: SyncTransactionDto) {
    await this.getTransactionOrThrow(userId, dto.id)
    await this.assertTransactionRelations(userId, {
      accountId: dto.accountId,
      invoiceId: dto.invoiceId,
      recurrenceId: dto.recurrenceId,
      destinationAccountId: dto.destinationAccountId,
    })

    return this.prisma.transaction.update({
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

  async remove(dto: RemoveTransactionRequestDto): Promise<void> {
    const { userId, id } = dto
    await this.getTransactionOrThrow(userId, id)

    await this.prisma.$transaction(async (tx) => {
      await createDeletedRecords({ tx, userId, tableName: TableName.TRANSACTIONS, recordIds: [id] })
      await tx.transaction.delete({ where: { id } })
    })
  }
}
