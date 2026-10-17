import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@common/prisma/prisma.service'
import { createDeletedRecords } from '@common/sync/deleted-record.util'
import { nullifyTransactionInvoiceRefs } from '@common/sync/set-null.util'
import { buildTimestampWhere } from '@common/sync/sync-query.util'
import { SyncTx } from '@common/sync/sync-tx.type'
import { InvoicePaymentStatus, InvoiceStatus, TableName } from 'generated/prisma/client'
import { FindManyInvoicesDto } from './dto/find-many.dto'
import { RemoveInvoiceRequestDto } from './dto/remove.dto'
import { SyncInvoiceDto } from './dto/sync-invoice.dto'

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(dto: FindManyInvoicesDto) {
    const {
      userId,
      id,
      accountId,
      status,
      referenceMonth,
      referenceYear,
      createdAfter,
      updatedAfter,
    } = dto

    return this.prisma.invoice.findMany({
      where: {
        account: { institution: { userId } },
        ...(id && { id }),
        ...(accountId && { accountId }),
        ...(status && { status }),
        ...(referenceMonth !== undefined && { referenceMonth }),
        ...(referenceYear !== undefined && { referenceYear }),
        ...buildTimestampWhere({ createdAfter, updatedAfter }),
      },
    })
  }

  private async assertAccountOwnership(userId: string, accountId: string, tx?: SyncTx) {
    const db = tx ?? this.prisma
    const account = await db.account.findUnique({
      where: { id: accountId },
      include: { institution: true },
    })
    if (!account) throw new NotFoundException('Conta não encontrada')
    if (account.institution.userId !== userId) throw new ForbiddenException('Acesso negado')
  }

  async syncCreate(userId: string, dto: SyncInvoiceDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    await this.assertAccountOwnership(userId, dto.accountId, tx)
    return db.invoice.upsert({
      where: { id: dto.id },
      create: {
        id: dto.id,
        accountId: dto.accountId,
        status: dto.status ?? InvoiceStatus.OPEN,
        paymentStatus: dto.paymentStatus ?? InvoicePaymentStatus.NOT_PAID,
        referenceMonth: dto.referenceMonth,
        referenceYear: dto.referenceYear,
        totalAmount: dto.totalAmount ?? 0,
        paidAmount: dto.paidAmount ?? 0,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        ...(dto.createdAt && { createdAt: new Date(dto.createdAt) }),
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
      update: {
        accountId: dto.accountId,
        status: dto.status,
        paymentStatus: dto.paymentStatus,
        referenceMonth: dto.referenceMonth,
        referenceYear: dto.referenceYear,
        totalAmount: dto.totalAmount,
        paidAmount: dto.paidAmount,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async syncUpdate(userId: string, dto: SyncInvoiceDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    const invoice = await db.invoice.findUnique({
      where: { id: dto.id },
      include: { account: { include: { institution: true } } },
    })
    if (!invoice) throw new NotFoundException('Fatura não encontrada')
    if (invoice.account.institution.userId !== userId) throw new ForbiddenException('Acesso negado')

    return db.invoice.update({
      where: { id: dto.id },
      data: {
        accountId: dto.accountId,
        status: dto.status,
        paymentStatus: dto.paymentStatus,
        referenceMonth: dto.referenceMonth,
        referenceYear: dto.referenceYear,
        totalAmount: dto.totalAmount,
        paidAmount: dto.paidAmount,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async remove(dto: RemoveInvoiceRequestDto, tx?: SyncTx): Promise<void> {
    const { userId, id: invoiceId } = dto
    const db = tx ?? this.prisma
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { account: { include: { institution: true } } },
    })
    if (!invoice) throw new NotFoundException('Fatura não encontrada')
    if (invoice.account.institution.userId !== userId) throw new ForbiddenException('Acesso negado')

    const perform = async (client: SyncTx) => {
      await nullifyTransactionInvoiceRefs(client, invoiceId)
      await createDeletedRecords({
        tx: client,
        userId,
        tableName: TableName.INVOICES,
        recordIds: [invoiceId],
      })
      await client.invoice.delete({ where: { id: invoiceId } })
    }

    if (tx) await perform(tx)
    else await this.prisma.$transaction(perform)
  }
}
