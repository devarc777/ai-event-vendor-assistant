import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { VendorsModule } from './vendors/vendors.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MailModule,
    PaymentsModule,
    WorkOrdersModule,
    EventsModule,
    AiModule,
    VendorsModule,
  ],
})
export class AppModule {}
