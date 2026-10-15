import { Test, TestingModule } from '@nestjs/testing'
import { RecurrenceService } from './recurrence.service'
import { PrismaService } from '@common/prisma/prisma.service'
import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { TransactionStatus, TransactionType } from '../../../generated/prisma/enums'

const prismaMock = {
  $transaction: jest.fn(),
  account: { findUnique: jest.fn() },
  transaction: {
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  recurrence: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  deletedRecord: {
    createMany: jest.fn(),
  },
}

prismaMock.$transaction.mockImplementation((arg: unknown) => {
  if (typeof arg === 'function') {
    return arg({
      ...prismaMock,
      transaction: {
        ...prismaMock.transaction,
        updateMany: jest.fn(),
      },
    })
  }
  return arg
})

const mockRecurrence = {
  id: 'rec-1',
  accountId: 'acc-1',
  description: 'Netflix',
  amount: 2990,
  chargeDate: 10,
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: null,
  isActive: true,
  account: {
    id: 'acc-1',
    institution: { userId: 'user-1' },
  },
}

describe('RecurrenceService', () => {
  let service: RecurrenceService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecurrenceService, { provide: PrismaService, useValue: prismaMock }],
    }).compile()
    service = module.get<RecurrenceService>(RecurrenceService)
    jest.clearAllMocks()
  })

  const syncDto = {
    id: 'rec-1',
    accountId: 'acc-1',
    description: 'Netflix',
    amount: 2990,
    chargeDate: 10,
    startDate: '2026-01-01T00:00:00.000Z',
  }

  describe('findMany', () => {
    it('returns recurrences for user', async () => {
      prismaMock.recurrence.findMany.mockResolvedValue([mockRecurrence])
      const result = await service.findMany({ userId: 'user-1' })
      expect(result).toHaveLength(1)
    })
  })

  describe('syncCreate', () => {
    it('upserts when account belongs to user', async () => {
      prismaMock.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        institution: { userId: 'user-1' },
      })
      prismaMock.recurrence.upsert.mockResolvedValue(mockRecurrence)
      const result = await service.syncCreate('user-1', syncDto)
      expect(result).toEqual(mockRecurrence)
    })
  })

  describe('syncUpdate', () => {
    it('updates recurrence', async () => {
      prismaMock.recurrence.findUnique.mockResolvedValue(mockRecurrence)
      prismaMock.recurrence.update.mockResolvedValue({ ...mockRecurrence, amount: 3500 })
      const result = await service.syncUpdate('user-1', { ...syncDto, amount: 3500 })
      expect(result.amount).toBe(3500)
    })

    it('throws ForbiddenException when recurrence belongs to another user', async () => {
      prismaMock.recurrence.findUnique.mockResolvedValue({
        ...mockRecurrence,
        account: { id: 'acc-1', institution: { userId: 'other' } },
      })
      await expect(service.syncUpdate('user-1', syncDto)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('removeForSync', () => {
    it('deletes recurrence and records tombstone', async () => {
      prismaMock.recurrence.findUnique.mockResolvedValue(mockRecurrence)
      prismaMock.recurrence.delete.mockResolvedValue(mockRecurrence)
      prismaMock.deletedRecord.createMany.mockResolvedValue({ count: 1 })

      await service.removeForSync({ userId: 'user-1', id: 'rec-1' })

      expect(prismaMock.recurrence.delete).toHaveBeenCalledWith({ where: { id: 'rec-1' } })
    })

    it('throws NotFoundException when recurrence missing', async () => {
      prismaMock.recurrence.findUnique.mockResolvedValue(null)
      await expect(service.removeForSync({ userId: 'user-1', id: 'rec-1' })).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('generateTransactionsFromRecurrences', () => {
    it('creates pending expense transactions for active recurrences without existing month row', async () => {
      prismaMock.recurrence.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          accountId: 'acc-1',
          categoryId: 'cat-1',
          subCategoryId: null,
          amount: 100,
          description: 'Sub',
          chargeDate: 5,
        },
      ])
      prismaMock.transaction.findMany.mockResolvedValue([])
      prismaMock.transaction.createMany.mockResolvedValue({ count: 1 })

      await service.generateTransactionsFromRecurrences()

      expect(prismaMock.transaction.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              recurrenceId: 'rec-1',
              type: TransactionType.EXPENSE,
              status: TransactionStatus.PENDING,
            }),
          ]),
        }),
      )
    })
  })
})
