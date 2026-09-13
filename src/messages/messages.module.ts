// src/messages/messages.module.ts
import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // Ensure Prisma is imported
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [MessagesController], // Make sure this is here!
  providers: [MessagesService],
})
export class MessagesModule {}
