// import { Module } from '@nestjs/common';

// import { PaymentsController } from './payments.controller';
// import { PaymentsService } from './payments.service';
// import { PrismaService } from '../../../prisma/prisma.service';
// import { EventsGateway } from '../../events/events.gateway';

// @Module({
//   controllers: [PaymentsController],

//   providers: [PaymentsService, PrismaService, EventsGateway],

//   exports: [PaymentsService],
// })
// export class PaymentsModule {}

import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventsModule } from '../../events/events.module'; // Import your EventsModule here

@Module({
  imports: [
    EventsModule, // <-- This makes EventsGateway (and its dependencies like JwtService) available here
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService], // <-- EventsGateway removed from here
  exports: [PaymentsService],
})
export class PaymentsModule {}
