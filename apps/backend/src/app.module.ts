import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { appConfig, validate } from './config/app.config'
import { PrismaModule } from './common/prisma/prisma.module'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from './modules/auth/auth.module'
import { SupabaseModule } from './modules/supabase/supabase.module'
import { UserModule } from './modules/user/user.module'
import { SyncModule } from './modules/sync/sync.module'
import { RecurrenceModule } from './modules/recurrence/recurrence.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: 'env/.env',
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    SupabaseModule,
    SyncModule,
    RecurrenceModule,
  ],
})
export class AppModule {}
