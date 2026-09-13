// import { Module } from '@nestjs/common';
// import { EventsGateway } from './events.gateway';

// @Module({
//   providers: [EventsGateway],
//   exports: [EventsGateway], // Must export so MessagesModule can inject it
// })
// export class EventsModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecret',
    }),
  ],
  providers: [EventsGateway, PrismaService],
  exports: [EventsGateway],
})
export class EventsModule {}
