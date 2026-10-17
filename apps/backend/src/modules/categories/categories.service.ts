import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@common/prisma/prisma.service'
import { createDeletedRecords } from '@common/sync/deleted-record.util'
import {
  nullifyRecurrenceCategoryRefs,
  nullifyRecurrenceSubCategoryRefs,
  nullifyTransactionCategoryRefs,
  nullifyTransactionSubCategoryRefs,
} from '@common/sync/set-null.util'
import { buildTimestampWhere } from '@common/sync/sync-query.util'
import { SyncTx } from '@common/sync/sync-tx.type'
import { TableName } from 'generated/prisma/client'
import { FindManyCategoriesDto } from './dto/find-many.dto'
import { RemoveCategoryRequestDto } from './dto/remove.dto'
import { SyncCategoryDto } from './dto/sync-category.dto'

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(dto: FindManyCategoriesDto) {
    const { userId, id, name, createdAfter, updatedAfter } = dto

    return this.prisma.category.findMany({
      where: {
        userId,
        ...(id && { id }),
        ...(name && { name }),
        ...buildTimestampWhere({ createdAfter, updatedAfter }),
      },
    })
  }

  async syncCreate(userId: string, dto: SyncCategoryDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    return db.category.upsert({
      where: { id: dto.id },
      create: {
        id: dto.id,
        userId,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        ...(dto.createdAt && { createdAt: new Date(dto.createdAt) }),
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
      update: {
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async syncUpdate(userId: string, dto: SyncCategoryDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    const category = await db.category.findUnique({ where: { id: dto.id } })
    if (!category) throw new NotFoundException('Categoria não encontrada')
    if (category.userId !== userId) throw new ForbiddenException('Acesso negado')

    return db.category.update({
      where: { id: dto.id },
      data: {
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async remove(dto: RemoveCategoryRequestDto, tx?: SyncTx): Promise<void> {
    const { userId, id } = dto
    const db = tx ?? this.prisma
    const category = await db.category.findUnique({
      where: { id },
      include: { subCategories: true, budgets: true },
    })
    if (!category) throw new NotFoundException('Categoria não encontrada')
    if (category.userId !== userId) throw new ForbiddenException('Acesso negado')

    const perform = async (client: SyncTx) => {
      await createDeletedRecords({
        tx: client,
        userId,
        tableName: TableName.BUDGETS,
        recordIds: category.budgets.map((b) => b.id),
      })
      await client.budget.deleteMany({ where: { categoryId: id } })

      for (const subCategory of category.subCategories) {
        await nullifyTransactionSubCategoryRefs(client, subCategory.id)
        await nullifyRecurrenceSubCategoryRefs(client, subCategory.id)
      }

      await nullifyTransactionCategoryRefs(client, id)
      await nullifyRecurrenceCategoryRefs(client, id)

      await Promise.all([
        createDeletedRecords({
          tx: client,
          userId,
          tableName: TableName.SUB_CATEGORIES,
          recordIds: category.subCategories.map((s) => s.id),
        }),
        createDeletedRecords({
          tx: client,
          userId,
          tableName: TableName.CATEGORIES,
          recordIds: [id],
        }),
      ])
      await client.category.delete({ where: { id } })
    }

    if (tx) await perform(tx)
    else await this.prisma.$transaction(perform)
  }
}
