import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsNotEmpty, IsObject, IsUUID, ValidateNested } from 'class-validator'
import { PushChanges } from '../../../types/tables'

export class PushQueryDto {
  @ApiProperty({
    description: 'ISO 8601 cursor from the last successful pull',
    example: '2026-01-15T12:00:00.000Z',
  })
  @IsDateString()
  lastUpdatedAt!: string
}

export class PushBodyDto {
  @ApiProperty({
    description: 'WatermelonDB sync changes grouped by table (created, updated, deleted ids)',
  })
  @IsObject()
  changes!: PushChanges
}

export class PushRequestDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string

  @IsDateString()
  lastUpdatedAt!: string

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  changes!: PushChanges
}

export class PushResponseDto {
  @ApiProperty({ example: true })
  success!: boolean
}
