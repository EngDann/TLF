import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { CurrentUser } from '@modules/auth/context/current-user.decorator'
import { AuthGuard } from '@modules/auth/context/auth.guard'
import { PullQueryDto, PullResponseDto } from './dto/pull'
import { PushBodyDto, PushQueryDto, PushResponseDto } from './dto/push'
import { SyncService } from './sync.service'

@ApiTags('Sync')
@ApiBearerAuth('supabase-jwt')
@ApiUnauthorizedResponse({ description: 'Token não fornecido, inválido ou expirado' })
@UseGuards(AuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('pull')
  @ApiOperation({
    summary: 'Pull server changes',
    description:
      'Returns incremental table changes since lastUpdatedAt for the authenticated user.',
  })
  @ApiOkResponse({ type: PullResponseDto })
  async pull(
    @CurrentUser('id') userId: string,
    @Query() dto: PullQueryDto,
  ): Promise<PullResponseDto> {
    return this.syncService.pull({ userId, lastUpdatedAt: dto.lastUpdatedAt })
  }

  @Post('push')
  @ApiOperation({
    summary: 'Push client changes',
    description:
      'Applies created/updated records and tombstone deletes from the mobile sync payload.',
  })
  @ApiOkResponse({ type: PushResponseDto })
  async push(
    @CurrentUser('id') userId: string,
    @Query() query: PushQueryDto,
    @Body() body: PushBodyDto,
  ): Promise<PushResponseDto> {
    return this.syncService.push({
      userId,
      lastUpdatedAt: query.lastUpdatedAt,
      changes: body.changes,
    })
  }
}
