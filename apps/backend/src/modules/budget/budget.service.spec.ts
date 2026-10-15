import { Test, TestingModule } from '@nestjs/testing'
import { BudgetService } from './budget.service'
import { PrismaService } from '@common/prisma/prisma.service'
import { NotFoundException, ForbiddenException } from '@nestjs/common'

const mockPrisma = {
  category: { findUnique: jest.fn() },
  budget: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  deletedRecord: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

mockPrisma.$transaction.mockImplementation((arg: unknown) => {
  if (typeof arg === 'function') {
    return arg(mockPrisma)
  }
  return Promise.all(arg as Promise<unknown>[])
})

const mockCategory = { id: 'cat-001', userId: 'user-001', name: 'Alimentação' }
const mockBudget = {
  id: 'budget-001',
  name: 'Orçamento Alimentação',
  amountLimit: 50000,
  month: 5,
  year: 2026,
  userId: 'user-001',
  categoryId: 'cat-001',
}

describe('BudgetService', () => {
  let service: BudgetService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BudgetService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()
    service = module.get<BudgetService>(BudgetService)
    jest.clearAllMocks()
  })

  const syncDto = {
    id: 'budget-001',
    categoryId: 'cat-001',
    name: 'Orçamento Alimentação',
    amountLimit: 50000,
    month: 5,
    year: 2026,
  }

  describe('findMany', () => {
    it('returns budgets for user', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([mockBudget])
      const result = await service.findMany({ userId: 'user-001' })
      expect(result).toEqual([mockBudget])
    })
  })

  describe('syncCreate', () => {
    it('upserts budget when category belongs to user', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory)
      mockPrisma.budget.upsert.mockResolvedValue(mockBudget)
      const result = await service.syncCreate('user-001', syncDto)
      expect(result).toEqual(mockBudget)
    })

    it('throws ForbiddenException when category belongs to another user', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ ...mockCategory, userId: 'other' })
      await expect(service.syncCreate('user-001', syncDto)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('syncUpdate', () => {
    it('updates budget', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue(mockBudget)
      mockPrisma.budget.update.mockResolvedValue({ ...mockBudget, amountLimit: 60000 })
      const result = await service.syncUpdate('user-001', { ...syncDto, amountLimit: 60000 })
      expect(result.amountLimit).toBe(60000)
    })

    it('throws ForbiddenException when budget belongs to another user', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue({ ...mockBudget, userId: 'other' })
      await expect(service.syncUpdate('user-001', syncDto)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('remove', () => {
    it('removes budget and records tombstone', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue(mockBudget)
      mockPrisma.budget.delete.mockResolvedValue(mockBudget)
      mockPrisma.deletedRecord.createMany.mockResolvedValue({ count: 1 })

      await service.remove({ userId: 'user-001', id: 'budget-001' })

      expect(mockPrisma.budget.delete).toHaveBeenCalledWith({ where: { id: 'budget-001' } })
    })

    it('throws NotFoundException when budget missing', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue(null)
      await expect(service.remove({ userId: 'user-001', id: 'budget-001' })).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
