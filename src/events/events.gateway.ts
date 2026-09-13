import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
} from '@nestjs/websockets';

import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  user: {
    userId: string;
    email: string;
    role: string;
    name: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token;

      if (!token) {
        console.log('Socket rejected: No token');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);

      if (!payload?.sub) {
        console.log('Socket rejected: Invalid token');
        client.disconnect();
        return;
      }

      client.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      };

      // Private room for user-specific events
      client.join(`user:${payload.sub}`);

      console.log(`Socket connected: ${client.id} | User: ${payload.sub}`);
    } catch (error) {
      console.log('Socket rejected: Invalid/expired JWT');
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Socket disconnected: ${client.id}`);
  }

  /**
   * Emit an event to a specific user.
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit an event to everyone inside a conversation.
   */
  emitToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  /**
   * Securely join a conversation room.
   */
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    console.log('📥 JOIN CONVERSATION PAYLOAD:', payload);

    const conversationId = payload?.conversationId;

    console.log('📥 EXTRACTED CONVERSATION ID:', conversationId);

    if (!conversationId) {
      return {
        success: false,
        message: 'Conversation ID is required',
      };
    }

    const userId = client.user?.userId;

    if (!userId) {
      return {
        success: false,
        message: 'Unauthorized',
      };
    }

    try {
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

      console.log('🔎 CONVERSATION:', conversation);

      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      const isMember =
        conversation.userId === userId || conversation.creatorId === userId;

      if (!isMember) {
        console.log(
          `🚫 Unauthorized conversation access: ${userId} -> ${conversationId}`,
        );

        return {
          success: false,
          message: 'You are not a member of this conversation',
        };
      }

      const room = `conversation:${conversation.id}`;

      client.join(room);

      console.log(`✅ User ${userId} joined room ${room}`);

      return {
        success: true,
        conversationId: conversation.id,
      };
    } catch (error) {
      console.error('❌ JOIN CONVERSATION ERROR:', error);

      return {
        success: false,
        message: 'Failed to join conversation',
      };
    }
  }
}
