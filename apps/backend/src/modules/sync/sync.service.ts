import { PrismaService } from '@common/prisma/prisma.service'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { TableName } from 'generated/prisma/client'
import { AccountsService } from '../accounts/accounts.service'
import { BudgetService } from '../budget/budget.service'
import { CategoriesService } from '../categories/categories.service'
import { InstitutionsService } from '../institutions/institutions.service'
import { InvoiceService } from '../invoices/invoice.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RecurrenceService } from '../recurrence/recurrence.service'
import { SubCategoriesService } from '../sub-categories/sub-categories.service'
import { TransactionsService } from '../transactions/transactions.service'
import { PullRequestDto, PullResponseDto } from './dto/pull'
import { PushRequestDto, PushResponseDto } from './dto/push'
import { subMonths } from '@common/time/date'

type TableChanges<T> = {
  created?: T[]
  updated?: T[]
  deleted?: string[]
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly subCategoriesService: SubCategoriesService,
    private readonly institutionsService: InstitutionsService,
    private readonly budgetService: BudgetService,
    private readonly accountsService: AccountsService,
    private readonly invoiceService: InvoiceService,
    private readonly recurrenceService: RecurrenceService,
    private readonly transactionsService: TransactionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async pull(dto: PullRequestDto): Promise<PullResponseDto> {
    const { userId } = dto

    const lastUpdatedAt = dto.lastUpdatedAt ? new Date(dto.lastUpdatedAt) : subMonths(new Date(), 6) // TODO: improve to search all tables at once with performance
    const timestamp = new Date()

    const syncFilter = { userId, createdAfter: lastUpdatedAt, updatedAfter: lastUpdatedAt }

    const [
      categories,
      subCategories,
      institutions,
      budgets,
      accounts,
      invoices,
      recurrences,
      transactions,
      notifications,
      deletedRecords,
    ] = await Promise.all([
      this.categoriesService.findMany(syncFilter),
      this.subCategoriesService.findMany(syncFilter),
      this.institutionsService.findMany(syncFilter),
      this.budgetService.findMany(syncFilter),
      this.accountsService.findMany(syncFilter),
      this.invoiceService.findMany(syncFilter),
      this.recurrenceService.findMany(syncFilter),
      this.transactionsService.findMany(syncFilter),
      this.notificationsService.findMany(syncFilter),
      this.prisma.deletedRecord.findMany({
        where: { userId, deletedAt: { gt: lastUpdatedAt } },
      }),
    ])
    const deletedByTable = deletedRecords.reduce(
      (acc, record) => {
        if (!acc[record.tableName]) acc[record.tableName] = []
        acc[record.tableName].push(record.recordId)
        return acc
      },
      {} as Record<TableName, string[]>,
    )

    const splitChanges = <T extends { createdAt: Date; updatedAt: Date }>(records: T[]) => ({
      created: records.filter((record) => record.createdAt > lastUpdatedAt),
      updated: records.filter(
        (record) => record.updatedAt > lastUpdatedAt && record.createdAt <= lastUpdatedAt,
      ),
    })
    return {
      timestamp,
      changes: {
        transactions: {
          ...splitChanges(transactions),
          deleted: deletedByTable[TableName.TRANSACTIONS] ?? [],
        },
        categories: {
          ...splitChanges(categories),
          deleted: deletedByTable[TableName.CATEGORIES] ?? [],
        },
        sub_categories: {
          ...splitChanges(subCategories),
          deleted: deletedByTable[TableName.SUB_CATEGORIES] ?? [],
        },
        institutions: {
          ...splitChanges(institutions),
          deleted: deletedByTable[TableName.INSTITUTIONS] ?? [],
        },
        budgets: {
          ...splitChanges(budgets),
          deleted: deletedByTable[TableName.BUDGETS] ?? [],
        },
        accounts: {
          ...splitChanges(accounts),
          deleted: deletedByTable[TableName.ACCOUNTS] ?? [],
        },
        invoices: {
          ...splitChanges(invoices),
          deleted: deletedByTable[TableName.INVOICES] ?? [],
        },
        recurrences: {
          ...splitChanges(recurrences),
          deleted: deletedByTable[TableName.RECURRENCES] ?? [],
        },
        notifications: {
          ...splitChanges(notifications),
          deleted: deletedByTable[TableName.NOTIFICATIONS] ?? [],
        },
      },
    }
  }

  async push(dto: PushRequestDto): Promise<PushResponseDto> {
    const { userId, changes } = dto

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.applyTableChanges(userId, changes.categories, {
          create: (record) => this.categoriesService.syncCreate(userId, record, tx),
          update: (record) => this.categoriesService.syncUpdate(userId, record, tx),
          remove: (id) => this.categoriesService.remove({ userId, id }, tx),
        })

        await this.applyTableChanges(userId, changes.sub_categories, {
          create: (record) => this.subCategoriesService.syncCreate(userId, record, tx),
          update: (record) => this.subCategoriesService.syncUpdate(userId, record, tx),
          remove: (id) => this.subCategoriesService.remove({ userId, id }, tx),
        })

        await this.applyTableChanges(userId, changes.institutions, {
          create: (record) => this.institutionsService.syncCreate(userId, record, tx),
          update: (record) => this.institutionsService.syncUpdate(userId, record, tx),
          remove: (id) => this.institutionsService.remove({ userId, id }, tx),
        })

        await this.applyTableChanges(userId, changes.budgets, {
          create: (record) => this.budgetService.syncCreate(userId, record, tx),
          update: (record) => this.budgetService.syncUpdate(userId, record, tx),
          remove: (id) => this.budgetService.remove({ userId, id }, tx),
        })

        await this.applyTableChanges(userId, changes.accounts, {
          create: (record) => this.accountsService.syncCreate(userId, record, tx),
          update: (record) => this.accountsService.syncUpdate(userId, record, tx),
          remove: (id) => this.accountsService.remove({ userId, id }, tx),
        })

        await this.applyTableChanges(userId, changes.invoices, {
          create: (record) => this.invoiceService.syncCreate(userId, record, tx),
          update: (record) => this.invoiceService.syncUpdate(userId, record, tx),
          remove: (id) => this.invoiceService.remove({ userId, id }, tx),
        })

        await this.applyTableChanges(userId, changes.recurrences, {
          create: (record) => this.recurrenceService.syncCreate(userId, record, tx),
          update: (record) => this.recurrenceService.syncUpdate(userId, record, tx),
          remove: (id) => this.recurrenceService.remove({ userId, id }, tx),
        })

        await this.applyTableChanges(userId, changes.transactions, {
          create: (record) => this.transactionsService.syncCreate(userId, record, tx),
          update: (record) => this.transactionsService.syncUpdate(userId, record, tx),
          remove: (id) => this.transactionsService.remove({ userId, id }, tx),
        })

        await this.applyTableChanges(userId, changes.notifications, {
          create: (record) => this.notificationsService.syncCreate(userId, record, tx),
          update: (record) => this.notificationsService.syncUpdate(userId, record, tx),
          remove: (id) => this.notificationsService.remove({ userId, id }, tx),
        })
      })

      return { success: true }
    } catch (error) {
      this.logger.error('Error pushing changes', error)
      throw new BadRequestException(`Error pushing changes: ${(error as Error).message}`)
    }
  }

  private async applyTableChanges<T extends { id: string }>(
    _userId: string,
    changes: TableChanges<T> | undefined,
    handlers: {
      create: (record: T) => Promise<unknown>
      update: (record: T) => Promise<unknown>
      remove: (id: string) => Promise<unknown>
    },
  ) {
    if (!changes) return

    for (const record of changes.created ?? []) {
      await handlers.create(record)
    }
    for (const record of changes.updated ?? []) {
      await handlers.update(record)
    }
    for (const id of changes.deleted ?? []) {
      await handlers.remove(id)
    }
  }
}
