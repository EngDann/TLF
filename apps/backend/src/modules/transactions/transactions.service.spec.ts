import { Test, TestingModule } from '@nestjs/testing'
import { TransactionsService } from './transactions.service'
import { PrismaService } from '@common/prisma/prisma.service'
import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { TransactionType, TransactionStatus } from '../../../generated/prisma/enums'

const prismaMock = {
  invoice: { findUnique: jest.fn() },
  recurrence: { findUnique: jest.fn() },
  account: { findUnique: jest.fn() },
  transaction: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  deletedRecord: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

prismaMock.$transaction.mockImplementation((arg: unknown) => {
  if (typeof arg === 'function') {
    return arg(prismaMock)
  }
  return Promise.all(arg as Promise<unknown>[])
})

const transactionWithAccess = (userId: string) => ({
  id: 'tx-1',
  type: TransactionType.EXPENSE,
  amount: 5000,
  account: {
    id: 'acc-1',
    institution: { userId },
  },
})

const accountOwned = (userId: string) => ({
  id: 'acc-1',
  institution: { userId },
})

describe('TransactionsService', () => {
  let service: TransactionsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile()
    service = module.get<TransactionsService>(TransactionsService)
    jest.clearAllMocks()
  })

  const syncDto = {
    id: 'tx-1',
    accountId: 'acc-1',
    type: TransactionType.EXPENSE,
    amount: 5000,
    date: '2026-05-02T00:00:00.000Z',
    status: TransactionStatus.COMPLETED,
  }

  describe('findMany', () => {
    it('returns transactions for user', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([transactionWithAccess('user-1')])
      const result = await service.findMany({ userId: 'user-1' })
      expect(result).toHaveLength(1)
    })
  })

  describe('syncCreate', () => {
    it('upserts when account belongs to user', async () => {
      prismaMock.account.findUnique.mockResolvedValue(accountOwned('user-1'))
      prismaMock.transaction.upsert.mockResolvedValue(syncDto)
      const result = await service.syncCreate('user-1', syncDto)
      expect(result).toEqual(syncDto)
    })

    it('throws ForbiddenException when account belongs to another user', async () => {
      prismaMock.account.findUnique.mockResolvedValue(accountOwned('other'))
      await expect(service.syncCreate('user-1', syncDto)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('syncUpdate', () => {
    it('updates transaction', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue(transactionWithAccess('user-1'))
      prismaMock.account.findUnique.mockResolvedValue(accountOwned('user-1'))
      prismaMock.transaction.update.mockResolvedValue({ ...syncDto, amount: 6000 })
      const result = await service.syncUpdate('user-1', { ...syncDto, amount: 6000 })
      expect(result.amount).toBe(6000)
    })

    it('throws NotFoundException when transaction missing', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue(null)
      await expect(service.syncUpdate('user-1', syncDto)).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('deletes transaction and records tombstone', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue(transactionWithAccess('user-1'))
      prismaMock.transaction.delete.mockResolvedValue({ id: 'tx-1' })
      prismaMock.deletedRecord.createMany.mockResolvedValue({ count: 1 })

      await service.remove({ userId: 'user-1', id: 'tx-1' })

      expect(prismaMock.transaction.delete).toHaveBeenCalledWith({ where: { id: 'tx-1' } })
    })
  })
})
