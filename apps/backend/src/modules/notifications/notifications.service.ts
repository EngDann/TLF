import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@common/prisma/prisma.service'
import { createDeletedRecords } from '@common/sync/deleted-record.util'
import { buildTimestampWhere } from '@common/sync/sync-query.util'
import { SyncTx } from '@common/sync/sync-tx.type'
import { TableName } from 'generated/prisma/client'
import { FindManyNotificationsDto } from './dto/find-many.dto'
import { RemoveNotificationRequestDto } from './dto/remove.dto'
import { SyncNotificationDto } from './dto/sync-notification.dto'

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(dto: FindManyNotificationsDto) {
    const { userId, id, type, isRead, referenceType, createdAfter, updatedAfter } = dto

    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(id && { id }),
        ...(type && { type }),
        ...(isRead !== undefined && { isRead }),
        ...(referenceType && { referenceType }),
        ...buildTimestampWhere({ createdAfter, updatedAfter }),
      },
    })
  }

  async syncCreate(userId: string, dto: SyncNotificationDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    return db.notification.upsert({
      where: { id: dto.id },
      create: {
        id: dto.id,
        userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        isRead: dto.isRead ?? false,
        primaryActionLabel: dto.primaryActionLabel ?? null,
        primaryAction: dto.primaryAction ?? null,
        secondaryActionLabel: dto.secondaryActionLabel ?? null,
        secondaryAction: dto.secondaryAction ?? null,
        icon: dto.icon,
        color: dto.color,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        ...(dto.createdAt && { createdAt: new Date(dto.createdAt) }),
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
      update: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        isRead: dto.isRead,
        primaryActionLabel: dto.primaryActionLabel ?? null,
        primaryAction: dto.primaryAction ?? null,
        secondaryActionLabel: dto.secondaryActionLabel ?? null,
        secondaryAction: dto.secondaryAction ?? null,
        icon: dto.icon,
        color: dto.color,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async syncUpdate(userId: string, dto: SyncNotificationDto, tx?: SyncTx) {
    const db = tx ?? this.prisma
    const notification = await db.notification.findUnique({ where: { id: dto.id } })
    if (!notification) throw new NotFoundException('Notificação não encontrada')
    if (notification.userId !== userId) throw new ForbiddenException('Acesso negado')

    return db.notification.update({
      where: { id: dto.id },
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        isRead: dto.isRead,
        primaryActionLabel: dto.primaryActionLabel ?? null,
        primaryAction: dto.primaryAction ?? null,
        secondaryActionLabel: dto.secondaryActionLabel ?? null,
        secondaryAction: dto.secondaryAction ?? null,
        icon: dto.icon,
        color: dto.color,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        ...(dto.updatedAt && { updatedAt: new Date(dto.updatedAt) }),
      },
    })
  }

  async remove(dto: RemoveNotificationRequestDto, tx?: SyncTx): Promise<void> {
    const { userId, id: notificationId } = dto
    const db = tx ?? this.prisma
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    })
    if (!notification) throw new NotFoundException('Notificação não encontrada')
    if (notification.userId !== userId) throw new ForbiddenException('Acesso negado')

    const perform = async (client: SyncTx) => {
      await createDeletedRecords({
        tx: client,
        userId,
        tableName: TableName.NOTIFICATIONS,
        recordIds: [notificationId],
      })
      await client.notification.delete({ where: { id: notificationId } })
    }

    if (tx) await perform(tx)
    else await this.prisma.$transaction(perform)
  }
}
