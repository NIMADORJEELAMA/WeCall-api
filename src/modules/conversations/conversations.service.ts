import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all conversations belonging to the authenticated user.
   *
   * The authenticated user can be:
   * - the normal user
   * - the creator
   *
   * We always use conversation.id as the identity.
   */
  async getMyConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ userId }, { creatorId: userId }],
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

            creatorProfile: {
              select: {
                username: true,
                category: true,
                replyPrice: true,
                profileImage: true,
              },
            },
          },
        },

        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,

          select: {
            id: true,
            conversationId: true,
            senderId: true,
            content: true,
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

      return {
        id: conversation.id,

        user: conversation.user,
        creator: conversation.creator,

        /**
         * The other person in the conversation.
         */
        participant: isCreator ? conversation.user : conversation.creator,

        latestMessage: conversation.messages[0] ?? null,

        updatedAt: conversation.updatedAt,
      };
    });
  }

  /**
   * Find a conversation between the authenticated user
   * and a creator.
   *
   * This is mainly useful when opening a creator profile
   * before a conversation exists.
   */
  async getConversationWithCreator(userId: string, creatorId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        userId_creatorId: {
          userId,
          creatorId,
        },
      },
    });

    if (!conversation) {
      return {
        conversationId: null,
      };
    }

    return {
      conversationId: conversation.id,
    };
  }

  /**
   * Get messages using conversationId.
   *
   * SECURITY:
   * The authenticated user must be one of the two
   * participants in this conversation.
   */
  async getConversationMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },

      select: {
        id: true,
        userId: true,
        creatorId: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant =
      conversation.userId === userId || conversation.creatorId === userId;

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
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
      conversationId,
      messages,
    };
  }

  /**
   * Create the conversation before starting the
   * payment flow.
   *
   * Because the Prisma schema has:
   *
   * @@unique([userId, creatorId])
   *
   * this is safe to call multiple times.
   */
  async createOrGetConversation(userId: string, creatorId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: {
        userId: creatorId,
      },
      select: {
        userId: true,
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
    });

    return {
      conversationId: conversation.id,
    };
  }
}
