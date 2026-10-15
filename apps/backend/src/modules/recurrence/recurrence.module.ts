import { Module } from '@nestjs/common'
import { RecurrenceService } from './recurrence.service'
import { RecurrenceScheduler } from './recurrence.scheduler'

@Module({
  providers: [RecurrenceService, RecurrenceScheduler],
  exports: [RecurrenceService],
})
export class RecurrenceModule {}
