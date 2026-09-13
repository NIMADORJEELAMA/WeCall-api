import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { MessageStatus, PaymentStatus } from '@prisma/client';

import Stripe from 'stripe';
import { EventsGateway } from 'src/events/events.gateway';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    this.stripe.accounts
      .retrieve('')
      .then((account) => {
        console.log('🔥 BACKEND STRIPE ACCOUNT:', {
          id: account.id,
          email: account.email,
        });
      })
      .catch((err) => {
        console.error('❌ STRIPE ACCOUNT ERROR:', err.message);
      });
  }

  // ============================================================
  // CREATE PAYMENT INTENT
  // ============================================================

  async createPaymentIntent(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: {
        id: messageId,
      },
      include: {
        payment: true,
        creatorProfile: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only the message sender can pay
    if (message.senderId !== userId) {
      throw new BadRequestException('You cannot pay for this message');
    }

    if (!message.payment) {
      throw new BadRequestException('Payment record not found');
    }

    // Already paid
    if (message.payment.status === PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('This message has already been paid');
    }

    // Prevent creating another PaymentIntent
    // if one already exists
    if (message.payment.stripePaymentIntentId) {
      const existingIntent = await this.stripe.paymentIntents.retrieve(
        message.payment.stripePaymentIntentId,
      );

      return {
        paymentId: message.payment.id,
        messageId: message.id,
        clientSecret: existingIntent.client_secret,
        amount: message.payment.amount,
        currency: message.payment.currency,
      };
    }

    const amountInCents = Math.round(Number(message.payment.amount) * 100);

    if (amountInCents <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: message.payment.currency.toLowerCase(),

      automatic_payment_methods: {
        enabled: true,
      },

      metadata: {
        messageId: message.id,
        userId: message.senderId,
        creatorId: message.creatorId,
        paymentId: message.payment.id,
      },
    });
    console.log('🔥 CREATED PAYMENT INTENT:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    });

    await this.prisma.payment.update({
      where: {
        id: message.payment.id,
      },
      data: {
        status: PaymentStatus.PROCESSING,
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    return {
      paymentId: message.payment.id,
      messageId: message.id,
      clientSecret: paymentIntent.client_secret,
      amount: message.payment.amount,
      currency: message.payment.currency,
    };
  }

  // ============================================================
  // STRIPE WEBHOOK
  // ============================================================
  async handleWebhook(rawBody: Buffer, signature: string) {
    console.log('================ STRIPE WEBHOOK ================');
    console.log('Signature exists:', !!signature);
    console.log('Signature:', signature);
    console.log('Raw body exists:', !!rawBody);
    console.log('Raw body type:', typeof rawBody);
    console.log('Raw body length:', rawBody ? rawBody.length : 0);
    console.log('Webhook secret exists:', !!process.env.STRIPE_WEBHOOK_SECRET);
    console.log(
      'Webhook secret prefix:',
      process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
    );

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (error) {
      console.error('❌ STRIPE WEBHOOK ERROR:', error);

      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    console.log('🔥 STRIPE WEBHOOK:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log(
          '✅ PAYMENT SUCCEEDED:',
          (event.data.object as Stripe.PaymentIntent).id,
        );

        await this.handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.payment_failed':
        console.log(
          '❌ PAYMENT FAILED:',
          (event.data.object as Stripe.PaymentIntent).id,
        );

        await this.handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      default:
        console.log('ℹ️ Ignored Stripe event:', event.type);
    }

    return {
      received: true,
    };
  }
  // async handleWebhook(rawBody: Buffer, signature: string) {
  //   let event: Stripe.Event;

  //   try {
  //     event = this.stripe.webhooks.constructEvent(
  //       rawBody,
  //       signature,
  //       process.env.STRIPE_WEBHOOK_SECRET!,
  //     );
  //   } catch {
  //     throw new BadRequestException('Invalid Stripe webhook signature');
  //   }

  //   switch (event.type) {
  //     case 'payment_intent.succeeded':
  //       await this.handlePaymentSucceeded(
  //         event.data.object as Stripe.PaymentIntent,
  //       );
  //       break;

  //     case 'payment_intent.payment_failed':
  //       await this.handlePaymentFailed(
  //         event.data.object as Stripe.PaymentIntent,
  //       );
  //       break;
  //   }

  //   return {
  //     received: true,
  //   };
  // }

  // ============================================================
  // PAYMENT SUCCEEDED
  // ============================================================

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    console.log('💰 Processing successful payment:', {
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
      status: paymentIntent.status,
    });

    const messageId = paymentIntent.metadata?.messageId;

    if (!messageId) {
      console.error('❌ No messageId in Stripe metadata');
      return;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const message = await tx.message.findUnique({
        where: {
          id: messageId,
        },

        include: {
          payment: true,
        },
      });

      if (!message || !message.payment) {
        console.error('❌ Message/payment not found:', messageId);
        return null;
      }

      // Stripe can send duplicate webhooks
      if (message.payment.status === PaymentStatus.SUCCEEDED) {
        console.log('ℹ️ Payment already processed:', messageId);
        return null;
      }

      // 1️⃣ Mark payment successful
      const payment = await tx.payment.update({
        where: {
          id: message.payment.id,
        },

        data: {
          status: PaymentStatus.SUCCEEDED,
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      // 2️⃣ Mark message ready for creator
      const updatedMessage = await tx.message.update({
        where: {
          id: message.id,
        },

        data: {
          status: MessageStatus.AWAITING_REPLY,
        },
      });

      // 3️⃣ Find conversation
      const conversation = await tx.conversation.findUnique({
        where: {
          userId_creatorId: {
            userId: message.senderId,
            creatorId: message.creatorId,
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // 4️⃣ NOW create the real chat message
      //    This happens ONLY after successful payment.
      const chatMessage = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: message.senderId,
          content: message.content,
        },
      });

      // 5️⃣ Update conversation
      await tx.conversation.update({
        where: {
          id: conversation.id,
        },

        data: {
          updatedAt: new Date(),
        },
      });

      return {
        payment,
        message: updatedMessage,
        conversation,
        chatMessage,
      };
    });

    if (!result) {
      return;
    }

    // ============================================================
    // 🔥 NOTIFY CREATOR
    // ============================================================

    this.eventsGateway.emitToUser(result.message.creatorId, 'newMessage', {
      id: result.chatMessage.id,
      conversationId: result.conversation.id,
      content: result.chatMessage.content,
      senderId: result.chatMessage.senderId,
      creatorId: result.message.creatorId,
      status: result.message.status,
      createdAt: result.chatMessage.createdAt,

      paidMessageId: result.message.id,
      expiresAt: result.message.expiresAt,

      payment: result.payment,
    });

    // ============================================================
    // 🔥 NOTIFY USER
    // ============================================================

    this.eventsGateway.emitToUser(result.message.senderId, 'newMessage', {
      id: result.chatMessage.id,
      conversationId: result.conversation.id,
      content: result.chatMessage.content,
      senderId: result.chatMessage.senderId,
      creatorId: result.message.creatorId,
      status: result.message.status,
      createdAt: result.chatMessage.createdAt,

      paidMessageId: result.message.id,
      expiresAt: result.message.expiresAt,

      payment: result.payment,
    });

    // ============================================================
    // 🔥 PAYMENT SUCCESS
    // ============================================================

    this.eventsGateway.emitToUser(
      result.message.creatorId,
      'paymentSucceeded',
      {
        messageId: result.message.id,
        paymentId: result.payment.id,
        conversationId: result.conversation.id,
        status: result.message.status,
      },
    );

    // ============================================================
    // 🔥 PAYMENT SUCCESS → USER
    // ============================================================

    this.eventsGateway.emitToUser(result.message.senderId, 'paymentSucceeded', {
      messageId: result.message.id,
      paymentId: result.payment.id,
      conversationId: result.conversation.id,
      status: result.message.status,
    });
  }

  // ============================================================
  // PAYMENT FAILED
  // ============================================================

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const messageId = paymentIntent.metadata?.messageId;

    if (!messageId) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const message = await tx.message.findUnique({
        where: {
          id: messageId,
        },
        include: {
          payment: true,
        },
      });

      if (!message || !message.payment) {
        return;
      }

      await tx.payment.update({
        where: {
          id: message.payment.id,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      await tx.message.update({
        where: {
          id: message.id,
        },
        data: {
          status: MessageStatus.PENDING_PAYMENT,
        },
      });
    });
  }
}
