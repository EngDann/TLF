import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator'
import { PullChanges } from '../../../types/tables'

export class PullRequestDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string

  @IsOptional()
  @IsDateString()
  lastUpdatedAt?: string | null
}

export class PullQueryDto {
  @ApiPropertyOptional({
    description: 'ISO 8601; omit on first sync. Server returns changes after this timestamp.',
    example: '2026-01-15T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  lastUpdatedAt?: string | null
}

export class PullResponseDto {
  @ApiPropertyOptional({
    description: 'Per-table created/updated/deleted payloads for WatermelonDB sync',
  })
  changes?: PullChanges

  @ApiPropertyOptional({ description: 'Server timestamp for the next pull cursor' })
  timestamp!: Date
}
