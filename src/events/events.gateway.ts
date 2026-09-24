// import {
//   ConnectedSocket,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
//   SubscribeMessage,
//   WebSocketGateway,
//   WebSocketServer,
//   MessageBody,
// } from '@nestjs/websockets';

// import { JwtService } from '@nestjs/jwt';
// import { Socket, Server } from 'socket.io';
// import { PrismaService } from '../../prisma/prisma.service';

// interface AuthenticatedSocket extends Socket {
//   user: {
//     userId: string;
//     email: string;
//     role: string;
//     name: string;
//   };
// }

// @WebSocketGateway({
//   cors: {
//     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//     credentials: true,
//   },

//   transports: ['websocket'],
// })
// export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer()
//   server!: Server;

//   constructor(
//     private readonly jwtService: JwtService,
//     private readonly prisma: PrismaService,
//   ) {}

//   // ============================================================
//   // CONNECTION
//   // ============================================================

//   async handleConnection(client: AuthenticatedSocket) {
//     try {
//       const token = client.handshake.auth?.token;

//       if (!token) {
//         console.log('❌ Socket rejected: No token');

//         client.disconnect(true);
//         return;
//       }

//       const payload = this.jwtService.verify(token);

//       if (!payload?.sub) {
//         console.log('❌ Socket rejected: Invalid token');

//         client.disconnect(true);
//         return;
//       }

//       client.user = {
//         userId: payload.sub,
//         email: payload.email,
//         role: payload.role,
//         name: payload.name,
//       };

//       // --------------------------------------------------------
//       // PRIVATE USER ROOM
//       // --------------------------------------------------------
//       //
//       // Useful for:
//       //
//       // paymentSucceeded
//       // notifications
//       // other user-specific events
//       //
//       client.join(`user:${payload.sub}`);

//       console.log(`🟢 Socket connected: ${client.id} | User: ${payload.sub}`);
//     } catch (error) {
//       console.log('❌ Socket rejected: Invalid/expired JWT');

//       client.disconnect(true);
//     }
//   }

//   // ============================================================
//   // DISCONNECT
//   // ============================================================

//   handleDisconnect(client: AuthenticatedSocket) {
//     console.log(`🔴 Socket disconnected: ${client.id}`);
//   }

//   // ============================================================
//   // USER ROOM
//   // ============================================================

//   /**
//    * Emit an event to all active connections belonging
//    * to one authenticated user.
//    *
//    * This automatically supports multiple tabs/devices.
//    */
//   emitToUser(userId: string, event: string, data: any) {
//     this.server.to(`user:${userId}`).emit(event, data);
//   }

//   // ============================================================
//   // CONVERSATION ROOM
//   // ============================================================

//   /**
//    * Emit an event to everyone currently inside
//    * a conversation.
//    *
//    * Room:
//    *
//    * conversation:${conversationId}
//    */
//   emitToConversation(conversationId: string, event: string, data: any) {
//     this.server.to(`conversation:${conversationId}`).emit(event, data);
//   }

//   // ============================================================
//   // JOIN CONVERSATION
//   // ============================================================

//   /**
//    * Client requests:
//    *
//    * joinConversation
//    *
//    * {
//    *   conversationId: "..."
//    * }
//    *
//    * SECURITY:
//    *
//    * We NEVER trust the frontend.
//    *
//    * We query the database and verify that the
//    * authenticated socket user is either:
//    *
//    * conversation.userId
//    *
//    * OR
//    *
//    * conversation.creatorId
//    */
//   @SubscribeMessage('joinConversation')
//   async handleJoinConversation(
//     @ConnectedSocket() client: AuthenticatedSocket,
//     @MessageBody()
//     payload: { conversationId: string },
//   ) {
//     const conversationId = payload?.conversationId?.trim();

//     if (!conversationId) {
//       return {
//         success: false,
//         message: 'Conversation ID is required',
//       };
//     }

//     const userId = client.user?.userId;

//     if (!userId) {
//       return {
//         success: false,
//         message: 'Unauthorized',
//       };
//     }

//     try {
//       const conversation = await this.prisma.conversation.findUnique({
//         where: {
//           id: conversationId,
//         },

//         select: {
//           id: true,
//           userId: true,
//           creatorId: true,
//         },
//       });

//       if (!conversation) {
//         return {
//           success: false,
//           message: 'Conversation not found',
//         };
//       }

//       // --------------------------------------------------------
//       // AUTHORIZATION CHECK
//       // --------------------------------------------------------

//       const isMember =
//         conversation.userId === userId || conversation.creatorId === userId;

//       if (!isMember) {
//         console.log(
//           `🚫 Unauthorized room access | User: ${userId} | Conversation: ${conversationId}`,
//         );

//         return {
//           success: false,
//           message: 'You are not a member of this conversation',
//         };
//       }

//       // --------------------------------------------------------
//       // JOIN ROOM
//       // --------------------------------------------------------

//       const room = `conversation:${conversation.id}`;

//       client.join(room);

//       console.log(`✅ User ${userId} joined ${room}`);

//       return {
//         success: true,
//         conversationId: conversation.id,
//       };
//     } catch (error) {
//       console.error('❌ JOIN CONVERSATION ERROR:', error);

//       return {
//         success: false,
//         message: 'Failed to join conversation',
//       };
//     }
//   }

//   // ============================================================
//   // LEAVE CONVERSATION
//   // ============================================================

//   /**
//    * Leave the conversation room when the user navigates
//    * away from a chat.
//    */
//   @SubscribeMessage('leaveConversation')
//   async handleLeaveConversation(
//     @ConnectedSocket() client: AuthenticatedSocket,
//     @MessageBody()
//     payload: { conversationId: string },
//   ) {
//     const conversationId = payload?.conversationId?.trim();

//     if (!conversationId) {
//       return {
//         success: false,
//         message: 'Conversation ID is required',
//       };
//     }

//     const userId = client.user?.userId;

//     if (!userId) {
//       return {
//         success: false,
//         message: 'Unauthorized',
//       };
//     }

//     try {
//       const conversation = await this.prisma.conversation.findUnique({
//         where: {
//           id: conversationId,
//         },

//         select: {
//           id: true,
//           userId: true,
//           creatorId: true,
//         },
//       });

//       if (!conversation) {
//         return {
//           success: false,
//           message: 'Conversation not found',
//         };
//       }

//       const isMember =
//         conversation.userId === userId || conversation.creatorId === userId;

//       if (!isMember) {
//         return {
//           success: false,
//           message: 'You are not a member of this conversation',
//         };
//       }

//       const room = `conversation:${conversation.id}`;

//       client.leave(room);

//       console.log(`👋 User ${userId} left ${room}`);

//       return {
//         success: true,
//         conversationId: conversation.id,
//       };
//     } catch (error) {
//       console.error('❌ LEAVE CONVERSATION ERROR:', error);

//       return {
//         success: false,
//         message: 'Failed to leave conversation',
//       };
//     }
//   }
// }

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
import { parse } from 'cookie';

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

  // ============================================================
  // CONNECTION
  // ============================================================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // --------------------------------------------------------
      // READ JWT FROM HTTP COOKIE
      // --------------------------------------------------------

      const cookieHeader = client.handshake.headers.cookie;

      if (!cookieHeader) {
        console.log('❌ Socket rejected: No cookies');

        client.disconnect(true);
        return;
      }

      const cookies = parse(cookieHeader);

      const token = cookies.access_token;

      if (!token) {
        console.log('❌ Socket rejected: No access_token cookie');

        client.disconnect(true);
        return;
      }

      // --------------------------------------------------------
      // VERIFY JWT
      // --------------------------------------------------------

      const payload = this.jwtService.verify(token);

      if (!payload?.sub) {
        console.log('❌ Socket rejected: Invalid token');

        client.disconnect(true);
        return;
      }

      // --------------------------------------------------------
      // ATTACH AUTHENTICATED USER
      // --------------------------------------------------------

      client.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      };

      // --------------------------------------------------------
      // PRIVATE USER ROOM
      // --------------------------------------------------------

      client.join(`user:${payload.sub}`);

      console.log(`🟢 Socket connected: ${client.id} | User: ${payload.sub}`);
    } catch (error) {
      console.log('❌ Socket rejected: Invalid/expired JWT');

      client.disconnect(true);
    }
  }

  // ============================================================
  // DISCONNECT
  // ============================================================

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`🔴 Socket disconnected: ${client.id}`);
  }

  // ============================================================
  // USER ROOM
  // ============================================================

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ============================================================
  // CONVERSATION ROOM
  // ============================================================

  emitToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  // ============================================================
  // JOIN CONVERSATION
  // ============================================================

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket()
    client: AuthenticatedSocket,

    @MessageBody()
    payload: {
      conversationId: string;
    },
  ) {
    const conversationId = payload?.conversationId?.trim();

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

      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      // --------------------------------------------------------
      // BACKEND AUTHORIZATION
      // --------------------------------------------------------

      const isMember =
        conversation.userId === userId || conversation.creatorId === userId;

      if (!isMember) {
        console.log(
          `🚫 Unauthorized room access | User: ${userId} | Conversation: ${conversationId}`,
        );

        return {
          success: false,
          message: 'You are not a member of this conversation',
        };
      }

      // --------------------------------------------------------
      // JOIN ROOM
      // --------------------------------------------------------

      const room = `conversation:${conversation.id}`;

      client.join(room);

      console.log(`✅ User ${userId} joined ${room}`);

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

  // ============================================================
  // LEAVE CONVERSATION
  // ============================================================

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket()
    client: AuthenticatedSocket,

    @MessageBody()
    payload: {
      conversationId: string;
    },
  ) {
    const conversationId = payload?.conversationId?.trim();

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

      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      const isMember =
        conversation.userId === userId || conversation.creatorId === userId;

      if (!isMember) {
        return {
          success: false,
          message: 'You are not a member of this conversation',
        };
      }

      const room = `conversation:${conversation.id}`;

      client.leave(room);

      console.log(`👋 User ${userId} left ${room}`);

      return {
        success: true,
        conversationId: conversation.id,
      };
    } catch (error) {
      console.error('❌ LEAVE CONVERSATION ERROR:', error);

      return {
        success: false,
        message: 'Failed to leave conversation',
      };
    }
  }
}
