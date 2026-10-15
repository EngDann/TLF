import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '@common/prisma/prisma.service'
import { createDeletedRecords } from '@common/sync/deleted-record.util'
import { nullifyTransactionRecurrenceRefs } from '@common/sync/set-null.util'
import { buildTimestampWhere } from '@common/sync/sync-query.util'
import { TableName, TransactionStatus, TransactionType } from 'generated/prisma/client'
import { FindManyRecurrencesSyncDto } from './dto/find-many-sync.dto'
import { RemoveRecurrenceRequestDto } from './dto/remove-sync.dto'
import { SyncRecurrenceDto } from './dto/sync-recurrence.dto'

@Injectable()
export class RecurrenceService {
  private readonly logger = new Logger(RecurrenceService.name)

  constructor(private readonly prisma: PrismaService) {}

  findMany(dto: FindManyRecurrencesSyncDto) {
    const { userId, id, accountId, categoryId, isActive, createdAfter, updatedAfter } = dto

    return this.prisma.recurrence.findMany({
      where: {
        account: { institution: { userId } },
        ...(id && { id }),
        ...(accountId && { accountId }),
        ...(categoryId && { categoryId }),
        ...(isActive !== undefined && { isActive }),
        ...buildTimestampWhere({ createdAfter, updatedAfter }),
      },
    })
  }

  async syncCreate(userId: string, dto: SyncRecurrenceDto) {
    await this.assertAccountOwnership(userId, dto.accountId)
    return this.prisma.recurrence.upsert({
      where: { id: dto.id },
      create: {
        id: dto.id,
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        subCategoryId: dto.subCategoryId ?? null,
        description: dto.description,
        amount: dto.amount,
        isActive: dto.isActive ?? true,
        chargeDate: dto.chargeDate,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        ...(dto.createdAt && { createdAt: new Date(dto.createdAt) }),
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
      update: {
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        subCategoryId: dto.subCategoryId ?? null,
        description: dto.description,
        amount: dto.amount,
        isActive: dto.isActive,
        chargeDate: dto.chargeDate,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async syncUpdate(userId: string, dto: SyncRecurrenceDto) {
    const recurrence = await this.prisma.recurrence.findUnique({
      where: { id: dto.id },
      include: { account: { include: { institution: true } } },
    })
    if (!recurrence) throw new NotFoundException('Recorrência não encontrada')
    if (recurrence.account.institution.userId !== userId)
      throw new ForbiddenException('Acesso negado')

    return this.prisma.recurrence.update({
      where: { id: dto.id },
      data: {
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        subCategoryId: dto.subCategoryId ?? null,
        description: dto.description,
        amount: dto.amount,
        isActive: dto.isActive,
        chargeDate: dto.chargeDate,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async removeForSync(dto: RemoveRecurrenceRequestDto): Promise<void> {
    const { userId, id: recurrenceId } = dto
    const recurrence = await this.prisma.recurrence.findUnique({
      where: { id: recurrenceId },
      include: { account: { include: { institution: true } } },
    })
    if (!recurrence) throw new NotFoundException('Recorrência não encontrada')
    if (recurrence.account.institution.userId !== userId)
      throw new ForbiddenException('Acesso negado')

    await this.prisma.$transaction(async (tx) => {
      await nullifyTransactionRecurrenceRefs(tx, recurrenceId)
      await createDeletedRecords({
        tx,
        userId,
        tableName: TableName.RECURRENCES,
        recordIds: [recurrenceId],
      })
      await tx.recurrence.delete({ where: { id: recurrenceId } })
    })
  }

  async generateTransactionsFromRecurrences() {
    const now = new Date()
    this.logger.log(`Recurrence job started at ${now.toISOString()}`)

    const recurrences = await this.prisma.recurrence.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    })

    this.logger.log(`Found ${recurrences.length} active recurrences`)

    const month = now.getMonth()
    const year = now.getFullYear()

    const startOfMonth = new Date(year, month, 1)
    const startOfNextMonth = new Date(year, month + 1, 1)

    const existingTransactions = await this.prisma.transaction.findMany({
      where: {
        recurrenceId: {
          in: recurrences.map((r) => r.id),
        },
        date: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      select: {
        recurrenceId: true,
      },
    })

    const existingSet = new Set(existingTransactions.map((t) => t.recurrenceId))

    const toCreate = recurrences.filter((r) => !existingSet.has(r.id))

    await this.prisma.transaction.createMany({
      data: toCreate.map((recurrence) => {
        const lastDay = new Date(year, month + 1, 0).getDate()
        const day = Math.min(recurrence.chargeDate, lastDay)

        return {
          accountId: recurrence.accountId,
          categoryId: recurrence.categoryId,
          subCategoryId: recurrence.subCategoryId,
          amount: recurrence.amount,
          description: recurrence.description,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.PENDING,
          date: new Date(year, month, day),
          recurrenceId: recurrence.id,
        }
      }),
    })

    this.logger.log(`Created ${toCreate.length} transactions for current month`)
    this.logger.log('Recurrence job finished successfully')
  }

  private async assertAccountOwnership(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { institution: true },
    })
    if (!account) throw new NotFoundException('Conta não encontrada')
    if (account.institution.userId !== userId) throw new ForbiddenException('Acesso negado')
  }
}
