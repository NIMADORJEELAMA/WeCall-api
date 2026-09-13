import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageStatus, PaymentStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // -------------------------------------------------------------
  // DASHBOARD FETCHING METHODS
  // -------------------------------------------------------------

  // Used by the User Dashboard to show all pending/completed requests
  async getSentMessages(userId: string) {
    return this.prisma.message.findMany({
      where: { senderId: userId },
      include: {
        creatorProfile: {
          select: {
            username: true,
            category: true,
            replyPrice: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Used by the Creator Dashboard to see incoming bounties
  async getIncomingMessages(creatorId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        creatorId,

        status: {
          not: MessageStatus.PENDING_PAYMENT,
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        payment: {
          select: {
            amount: true,
            status: true,
            stripePaymentIntentId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const senderIds = [
      ...new Set(
        messages.map((m) => m.sender?.id).filter((id): id is string => !!id),
      ),
    ];

    const conversations = await this.prisma.conversation.findMany({
      where: {
        creatorId,
        userId: { in: senderIds },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    const conversationMap = new Map(conversations.map((c) => [c.userId, c.id]));

    return messages.map((message) => ({
      ...message,
      conversationId: message.sender?.id
        ? (conversationMap.get(message.sender.id) ?? null)
        : null,
    }));
  }

  // -------------------------------------------------------------
  // REAL-TIME CHAT METHODS
  // -------------------------------------------------------------

  // async getConversation(userId: string, creatorId: string) {
  //   /**
  //    * Find the ONE conversation between this authenticated user
  //    * and this creator.
  //    *
  //    * IMPORTANT:
  //    * We use BOTH IDs here.
  //    *
  //    * User A cannot request User B's conversation because:
  //    *
  //    * userId = User A
  //    * creatorId = Creator X
  //    *
  //    * will only return:
  //    *
  //    * Conversation {
  //    *   userId: User A,
  //    *   creatorId: Creator X
  //    * }
  //    */

  //   const conversation = await this.prisma.conversation.findUnique({
  //     where: {
  //       userId_creatorId: {
  //         userId,
  //         creatorId,
  //       },
  //     },
  //   });

  //   /**
  //    * If there is no conversation, return an empty array.
  //    *
  //    * This is important for a brand-new chat.
  //    */
  //   if (!conversation) {
  //     return [];
  //   }

  //   /**
  //    * Fetch ONLY messages belonging to this conversation.
  //    *
  //    * We do NOT query Message here.
  //    *
  //    * ChatMessage = actual chat history
  //    * Message     = paid request/payment workflow
  //    */
  //   const messages = await this.prisma.chatMessage.findMany({
  //     where: {
  //       conversationId: conversation.id,
  //     },
  //     orderBy: {
  //       createdAt: 'asc',
  //     },
  //   });

  //   return messages;
  // }

  async getConversation(userId: string, creatorId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        userId_creatorId: {
          userId,
          creatorId,
        },
      },
      select: {
        id: true,
        userId: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // No conversation yet
    if (!conversation) {
      return {
        conversationId: null,
        messages: [],
      };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        createdAt: true,
      },
    });

    return {
      conversationId: conversation.id,
      messages,
    };
  }
  async getMyConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          {
            userId,
          },
          {
            creatorId: userId,
          },
        ],
        messages: {
          some: {},
        },
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },

        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },

        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
          },
        },
      },

      orderBy: {
        updatedAt: 'desc',
      },
    });

    return conversations.map((conversation) => {
      const isCreator = conversation.creatorId === userId;

      const participant = isCreator ? conversation.user : conversation.creator;

      const latestMessage = conversation.messages[0] ?? null;

      return {
        id: conversation.id,

        // Useful for frontend
        conversationId: conversation.id,

        participant: {
          id: participant.id,
          name: participant.name,
          avatarUrl: participant.avatarUrl,
        },

        latestMessage,

        updatedAt: conversation.updatedAt,

        // Useful for deciding whether current
        // authenticated user is creator/user
        role: isCreator ? 'CREATOR' : 'USER',
      };
    });
  }
  // async getMyConversations(userId: string) {
  //   const conversations = await this.prisma.conversation.findMany({
  //     where: {
  //       userId: userId,

  //       // Only show conversations that actually have chat messages
  //       messages: {
  //         some: {},
  //       },
  //     },

  //     include: {
  //       creator: {
  //         select: {
  //           id: true,
  //           name: true,
  //           avatarUrl: true,

  //           creatorProfile: {
  //             select: {
  //               username: true,
  //               category: true,
  //               replyPrice: true,
  //               profileImage: true,
  //             },
  //           },
  //         },
  //       },

  //       messages: {
  //         orderBy: {
  //           createdAt: 'desc',
  //         },
  //         take: 1,

  //         select: {
  //           id: true,
  //           senderId: true,
  //           content: true,
  //           createdAt: true,
  //         },
  //       },
  //     },

  //     orderBy: {
  //       updatedAt: 'desc',
  //     },
  //   });

  //   return conversations.map((conversation) => ({
  //     id: conversation.id,

  //     creator: conversation.creator,

  //     latestMessage: conversation.messages[0] ?? null,

  //     updatedAt: conversation.updatedAt,
  //   }));
  // }
  async sendPaidChat(senderId: string, creatorId: string, content: string) {
    if (!content?.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    /**
     * Make sure the creator actually exists.
     */
    const creator = await this.prisma.creatorProfile.findUnique({
      where: {
        userId: creatorId,
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    /**
     * Check for an existing pending paid request.
     */
    const pending = await this.prisma.message.findFirst({
      where: {
        senderId,
        creatorId,
        // status: MessageStatus.AWAITING_REPLY,

        status: MessageStatus.PENDING_PAYMENT,
      },
    });

    // if (pending) {
    //   throw new ConflictException(
    //     'You already have a pending request with this creator.',
    //   );
    // }

    /**
     * IMPORTANT:
     *
     * Everything is created in ONE database transaction:
     *
     * Conversation
     *      ↓
     * Paid Message
     *      ↓
     * Payment
     *      ↓
     * ChatMessage
     *
     * If anything fails, none of them are created.
     */
    const result = await this.prisma.$transaction(async (tx) => {
      /**
       * 1. Find or create the conversation.
       *
       * Because your Prisma schema has:
       *
       * @@unique([userId, creatorId])
       *
       * this gives us exactly ONE conversation
       * between this user and this creator.
       */
      const conversation = await tx.conversation.upsert({
        where: {
          userId_creatorId: {
            userId: senderId,
            creatorId,
          },
        },
        create: {
          userId: senderId,
          creatorId,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      /**
       * 2. Create the paid request.
       */
      const message = await tx.message.create({
        data: {
          senderId,
          creatorId,
          creatorProfileId: creator.id,
          content: content.trim(),
          status: MessageStatus.PENDING_PAYMENT,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          payment: {
            create: {
              userId: senderId,
              amount: creator.replyPrice,
              status: PaymentStatus.PENDING,
            },
          },
        },
        include: {
          payment: true,
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      /**
       * 3. Create the REAL chat message.
       *
       * This is what getConversation() now reads.
       */
      // const chatMessage = await tx.chatMessage.create({
      //   data: {
      //     conversationId: conversation.id,
      //     senderId,
      //     content: content.trim(),
      //   },
      // });

      return {
        conversation,
        message,
        // chatMessage,
      };
    });

    /**
     * Notify the creator.
     *
     * We will later change this to the conversation room.
     * For now, keep your existing creator notification working.
     */
    // this.eventsGateway.emitToConversation(
    //   result.conversation.id,
    //   'newMessage',
    //   {
    //     id: result.chatMessage.id,
    //     conversationId: result.conversation.id,
    //     content: result.chatMessage.content,
    //     senderId: result.chatMessage.senderId,
    //     creatorId,
    //     status: result.message.status,
    //     createdAt: result.chatMessage.createdAt,
    //     paidMessageId: result.message.id,
    //     expiresAt: result.message.expiresAt,
    //     payment: result.message.payment,
    //   },
    // );
    // const payload = {
    //   id: result.chatMessage.id,
    //   conversationId: result.conversation.id,
    //   content: result.chatMessage.content,
    //   senderId: result.chatMessage.senderId,
    //   creatorId,
    //   status: result.message.status,
    //   createdAt: result.chatMessage.createdAt,
    //   paidMessageId: result.message.id,
    //   expiresAt: result.message.expiresAt,
    //   payment: result.message.payment,
    // };

    // 🔥 CREATOR REAL-TIME NOTIFICATION
    // this.eventsGateway.emitToUser(creatorId, 'newMessage', payload);

    // // 🔥 CONVERSATION REAL-TIME MESSAGE
    // this.eventsGateway.emitToConversation(
    //   result.conversation.id,
    //   'newMessage',
    //   payload,
    // );
    /**
     * Also return the conversation and chat message to the sender.
     */
    return {
      ...result.message,
      conversationId: result.conversation.id,
      // chatMessage: result.chatMessage,
    };
  }

  async replyToMessage(
    creatorUserId: string,
    messageId: string,
    replyContent: string,
  ) {
    if (!replyContent?.trim()) {
      throw new BadRequestException('Reply cannot be empty');
    }

    /**
     * Find the paid message.
     */
    const message = await this.prisma.message.findUnique({
      where: {
        id: messageId,
      },
      include: {
        payment: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    /**
     * SECURITY:
     *
     * The creator replying MUST be the creator
     * who owns this paid request.
     *
     * creatorUserId comes from the authenticated JWT.
     */
    if (message.creatorId !== creatorUserId) {
      throw new ForbiddenException(
        'You are not authorized to reply to this message',
      );
    }

    /**
     * Prevent duplicate replies.
     */
    if (message.status === MessageStatus.REPLIED) {
      throw new ConflictException('This message has already been replied to');
    }

    if (message.status !== MessageStatus.AWAITING_REPLY) {
      throw new BadRequestException(
        'This message is not ready for a reply. Payment has not been completed.',
      );
    }

    if (message.payment?.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Payment has not been completed.');
    }
    /**
     * Find the conversation belonging to this
     * exact user + creator pair.
     */
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        userId_creatorId: {
          userId: message.senderId,
          creatorId: creatorUserId,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    /**
     * Everything below happens atomically.
     */
    const result = await this.prisma.$transaction(async (tx) => {
      /**
       * 1. Update the paid request.
       */
      const updatedMessage = await tx.message.update({
        where: {
          id: messageId,
        },

        data: {
          replyContent: replyContent.trim(),
          status: MessageStatus.REPLIED,
          repliedAt: new Date(),

          // payment: {
          //   update: {
          //     status: PaymentStatus.SUCCEEDED,
          //   },
          // },
        },

        include: {
          payment: true,
        },
      });

      /**
       * 2. Create the REAL chat message.
       *
       * This is what the user's conversation
       * history will read.
       */
      const chatMessage = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: creatorUserId,
          content: replyContent.trim(),
        },
      });

      /**
       * 3. Update conversation timestamp.
       */
      await tx.conversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      return {
        updatedMessage,
        chatMessage,
      };
    });

    /**
     * Notify the user.
     *
     * IMPORTANT:
     * This event goes only to the user who
     * created the paid request.
     */
    this.eventsGateway.emitToConversation(conversation.id, 'messageReplied', {
      id: result.chatMessage.id,
      conversationId: conversation.id,
      content: result.chatMessage.content,
      senderId: result.chatMessage.senderId,
      status: result.updatedMessage.status,
      createdAt: result.chatMessage.createdAt,

      // Paid workflow information
      paidMessageId: result.updatedMessage.id,
      originalMessage: {
        id: result.updatedMessage.id,
        content: result.updatedMessage.content,
        senderId: result.updatedMessage.senderId,
        status: result.updatedMessage.status,
        createdAt: result.updatedMessage.createdAt,
      },
    });
    // this.eventsGateway.emitToUser(
    //   result.updatedMessage.senderId,
    //   'messageReplied',
    //   {
    //     messageId: result.updatedMessage.id,

    //     conversationId: conversation.id,

    //     originalMessage: {
    //       id: result.updatedMessage.id,
    //       content: result.updatedMessage.content,
    //       senderId: result.updatedMessage.senderId,
    //       status: result.updatedMessage.status,
    //       createdAt: result.updatedMessage.createdAt,
    //     },

    //     reply: {
    //       id: result.chatMessage.id,
    //       content: result.chatMessage.content,
    //       senderId: result.chatMessage.senderId,
    //       status: 'REPLIED',
    //       createdAt: result.chatMessage.createdAt,
    //     },
    //   },
    // );

    /**
     * Notify creator's other tabs/devices.
     */
    // this.eventsGateway.emitToUser(
    //   result.updatedMessage.creatorId,
    //   'messageReplySent',
    //   {
    //     messageId: result.updatedMessage.id,
    //     conversationId: conversation.id,
    //     status: result.updatedMessage.status,
    //   },
    // );

    return {
      ...result.updatedMessage,
      conversationId: conversation.id,
      chatMessage: result.chatMessage,
    };
  }

  /**
   * Get all chat messages for a conversation.
   * The authenticated user must be a member of the conversation.
   */
  async getConversationMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ userId }, { creatorId: userId }],
      },
      select: {
        id: true,
        userId: true,
        creatorId: true,
      },
    });

    if (!conversation) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      conversationId: conversation.id,
      userId: conversation.userId,
      creatorId: conversation.creatorId,
      messages,
    };
  }
  /**
   * Create a conversation between a user and creator,
   * or return the existing conversation.
   */
  async createOrGetConversation(userId: string, creatorId: string) {
    if (userId === creatorId) {
      throw new BadRequestException(
        'You cannot create a conversation with yourself',
      );
    }

    // Verify creator exists
    const creator = await this.prisma.user.findUnique({
      where: {
        id: creatorId,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        role: true,
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const conversation = await this.prisma.conversation.upsert({
      where: {
        userId_creatorId: {
          userId,
          creatorId,
        },
      },
      create: {
        userId,
        creatorId,
      },
      update: {},
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return conversation;
  }
}
