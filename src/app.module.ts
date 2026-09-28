import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { AdminController } from './admin/admin.controller';
import { AdminModule } from './admin/admin.module';

import { QzModule } from './qz/qz.module';
import { MessagesModule } from './messages/messages.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CreatorsModule } from './creators/creators.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    CreatorsModule,
    AuthModule,
    MessagesModule,
    AdminModule,
    PaymentsModule,
    // QzModule,
  ],
  controllers: [AdminController],
})
// export class AppModule {}
export class AppModule implements OnModuleInit {
  onModuleInit() {
    console.log('--- DATABASE CHECK ---');
    console.log('Connecting to:', process.env.DATABASE_URL);
    console.log('-----------------------');
  }
}
