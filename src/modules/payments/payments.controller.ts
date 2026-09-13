import {
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(
    @Req() req: any,
    @Body() body: { messageId: string },
  ) {
    return this.paymentsService.createPaymentIntent(
      req.user.userId,
      body.messageId,
    );
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    console.log('🔥 WEBHOOK HIT');
    console.log('Signature:', signature ? 'YES' : 'NO');
    console.log('Raw body:', req.rawBody ? 'YES' : 'NO');
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}
