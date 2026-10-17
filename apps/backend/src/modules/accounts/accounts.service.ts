import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@common/prisma/prisma.service'
import { createDeletedRecords } from '@common/sync/deleted-record.util'
import { nullifyTransactionDestinationAccountRefs } from '@common/sync/set-null.util'
import { buildTimestampWhere } from '@common/sync/sync-query.util'
import { SyncTx } from '@common/sync/sync-tx.type'
import { AccountType, Currency, TableName } from 'generated/prisma/client'
import { RemoveAccountWithDependentsDto } from './dto/remove-with-dependents.dto'
import { FindManyAccountsDto } from './dto/find-many.dto'
import { RemoveAccountRequestDto } from './dto/remove.dto'
import { SyncAccountDto } from './dto/sync-account.dto'

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(dto: FindManyAccountsDto) {
    const { userId, id, institutionId, isActive, createdAfter, updatedAfter } = dto

    return this.prisma.account.findMany({
      where: {
        institution: { userId },
        ...(id && { id }),
        ...(institutionId && { institutionId }),
        ...(isActive !== undefined && { isActive }),
        ...buildTimestampWhere({ createdAfter, updatedAfter }),
      },
    })
  }

  private async assertInstitutionOwnership(userId: string, institutionId: string, tx?: SyncTx) {
    const db = tx ?? this.prisma
    const institution = await db.institution.findUnique({ where: { id: institutionId } })
    if (!institution) throw new NotFoundException('Instituição não encontrada')
    if (institution.userId !== userId) throw new ForbiddenException('Acesso negado')
  }

  async removeWithDependents(dto: RemoveAccountWithDependentsDto): Promise<void> {
    const { tx, userId, accountId, invoiceIds, recurrenceIds, transactionIds } = dto

    await nullifyTransactionDestinationAccountRefs(tx, accountId)

    await Promise.all([
      createDeletedRecords({ tx, userId, tableName: TableName.INVOICES, recordIds: invoiceIds }),
      createDeletedRecords({
        tx,
        userId,
        tableName: TableName.RECURRENCES,
        recordIds: recurrenceIds,
      }),
      createDeletedRecords({
        tx,
        userId,
        tableName: TableName.TRANSACTIONS,
        recordIds: transactionIds,
      }),
      createDeletedRecords({ tx, userId, tableName: TableName.ACCOUNTS, recordIds: [accountId] }),
    ])

    await tx.account.delete({ where: { id: accountId } })
  }

  async syncCreate(userId: string, dto: SyncAccountDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    await this.assertInstitutionOwnership(userId, dto.institutionId, tx)
    return db.account.upsert({
      where: { id: dto.id },
      create: {
        id: dto.id,
        institutionId: dto.institutionId,
        name: dto.name,
        type: dto.type ?? AccountType.CHECKING,
        balance: dto.balance ?? 0,
        closingDay: dto.closingDay ?? null,
        dueDay: dto.dueDay ?? null,
        creditLimit: dto.creditLimit ?? 0,
        currency: dto.currency ?? Currency.BRL,
        isActive: dto.isActive ?? true,
        ...(dto.createdAt && { createdAt: new Date(dto.createdAt) }),
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
      update: {
        institutionId: dto.institutionId,
        name: dto.name,
        type: dto.type,
        balance: dto.balance,
        closingDay: dto.closingDay ?? null,
        dueDay: dto.dueDay ?? null,
        creditLimit: dto.creditLimit ?? 0,
        currency: dto.currency,
        isActive: dto.isActive,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async syncUpdate(userId: string, dto: SyncAccountDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    const account = await db.account.findUnique({
      where: { id: dto.id },
      include: { institution: true },
    })
    if (!account) throw new NotFoundException('Conta não encontrada')
    if (account.institution.userId !== userId) throw new ForbiddenException('Acesso negado')

    return db.account.update({
      where: { id: dto.id },
      data: {
        institutionId: dto.institutionId,
        name: dto.name,
        type: dto.type,
        balance: dto.balance,
        closingDay: dto.closingDay ?? null,
        dueDay: dto.dueDay ?? null,
        creditLimit: dto.creditLimit ?? 0,
        currency: dto.currency,
        isActive: dto.isActive,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async remove(dto: RemoveAccountRequestDto, tx?: SyncTx): Promise<void> {
    const { userId, id: accountId } = dto
    const db = tx ?? this.prisma
    const account = await db.account.findUnique({
      where: { id: accountId },
      include: {
        institution: true,
        invoices: true,
        recurrences: true,
        transactions: true,
      },
    })
    if (!account) throw new NotFoundException('Conta não encontrada')
    if (account.institution.userId !== userId) throw new ForbiddenException('Acesso negado')

    const perform = async (client: SyncTx) => {
      await this.removeWithDependents({
        tx: client,
        userId,
        accountId,
        invoiceIds: account.invoices.map((i) => i.id),
        recurrenceIds: account.recurrences.map((r) => r.id),
        transactionIds: account.transactions.map((t) => t.id),
      })
    }

    if (tx) await perform(tx)
    else await this.prisma.$transaction(perform)
  }
}
