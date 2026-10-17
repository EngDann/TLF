import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@common/prisma/prisma.service'
import { createDeletedRecords } from '@common/sync/deleted-record.util'
import { buildTimestampWhere } from '@common/sync/sync-query.util'
import { AccountsService } from '@modules/accounts/accounts.service'
import { SyncTx } from '@common/sync/sync-tx.type'
import { TableName } from 'generated/prisma/client'
import { FindManyInstitutionsDto } from './dto/find-many.dto'
import { RemoveInstitutionRequestDto } from './dto/remove.dto'
import { SyncInstitutionDto } from './dto/sync-institution.dto'

@Injectable()
export class InstitutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  findMany(dto: FindManyInstitutionsDto) {
    const { userId, id, createdAfter, updatedAfter } = dto

    return this.prisma.institution.findMany({
      where: {
        userId,
        ...(id && { id }),
        ...buildTimestampWhere({ createdAfter, updatedAfter }),
      },
    })
  }

  async syncCreate(userId: string, dto: SyncInstitutionDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    return db.institution.upsert({
      where: { id: dto.id },
      create: {
        id: dto.id,
        userId,
        name: dto.name,
        color: dto.color,
        logoUrl: dto.logoUrl ?? null,
        ...(dto.createdAt && { createdAt: new Date(dto.createdAt) }),
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
      update: {
        name: dto.name,
        color: dto.color,
        logoUrl: dto.logoUrl ?? null,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async syncUpdate(userId: string, dto: SyncInstitutionDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    const institution = await db.institution.findUnique({ where: { id: dto.id } })
    if (!institution) throw new NotFoundException('Instituição não encontrada')
    if (institution.userId !== userId) throw new ForbiddenException('Acesso negado')

    return db.institution.update({
      where: { id: dto.id },
      data: {
        name: dto.name,
        color: dto.color,
        logoUrl: dto.logoUrl ?? null,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async remove(dto: RemoveInstitutionRequestDto, tx?: SyncTx): Promise<void> {
    const { userId, id: institutionId } = dto
    const db = tx ?? this.prisma
    const institution = await db.institution.findUnique({
      where: { id: institutionId },
      include: {
        accounts: {
          include: {
            invoices: true,
            recurrences: true,
            transactions: true,
          },
        },
      },
    })
    if (!institution) throw new NotFoundException('Instituição não encontrada')
    if (institution.userId !== userId) throw new ForbiddenException('Acesso negado')

    const perform = async (client: SyncTx) => {
      for (const account of institution.accounts) {
        await this.accountsService.removeWithDependents({
          tx: client,
          userId,
          accountId: account.id,
          invoiceIds: account.invoices.map((i) => i.id),
          recurrenceIds: account.recurrences.map((r) => r.id),
          transactionIds: account.transactions.map((t) => t.id),
        })
      }

      await createDeletedRecords({
        tx: client,
        userId,
        tableName: TableName.INSTITUTIONS,
        recordIds: [institutionId],
      })
      await client.institution.delete({ where: { id: institutionId } })
    }

    if (tx) await perform(tx)
    else await this.prisma.$transaction(perform)
  }
}
