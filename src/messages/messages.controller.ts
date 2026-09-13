// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Param,
//   Request,
//   UseGuards,
// } from '@nestjs/common';

// import { MessagesService } from './messages.service';
// import { JwtAuthGuard } from 'src/auth/jwt.guard';
// import { ReplyMessageDto } from './dto/reply-message.dto';

// @Controller('messages')
// @UseGuards(JwtAuthGuard)
// export class MessagesController {
//   constructor(private readonly messagesService: MessagesService) {}

//   /**
//    * Get paid messages sent by the authenticated user.
//    *
//    * IMPORTANT:
//    * We NEVER accept userId from the frontend.
//    * userId comes from the verified JWT.
//    */
//   @Get('my-sent-messages')
//   getSentMessages(@Request() req: any) {
//     const userId = req.user.userId;

//     return this.messagesService.getSentMessages(userId);
//   }

//   /**
//    * Get paid messages received by the authenticated creator.
//    *
//    * IMPORTANT:
//    * creatorId comes from the verified JWT.
//    */
//   @Get('incoming')
//   getIncomingMessages(@Request() req: any) {
//     const creatorId = req.user.userId;

//     return this.messagesService.getIncomingMessages(creatorId);
//   }
//   @Get('my-conversations')
//   async getMyConversations(@Request() req) {
//     return this.messagesService.getMyConversations(req.user.userId);
//   }
//   /**
//    * Get the conversation between the authenticated user
//    * and a creator.
//    *
//    * For now the URL still contains creatorId because your
//    * frontend currently uses this route.
//    *
//    * The service MUST verify that the authenticated user
//    * owns this conversation.
//    */
//   @Get('conversation/:creatorId')
//   getConversation(@Request() req: any, @Param('creatorId') creatorId: string) {
//     const userId = req.user.userId;

//     return this.messagesService.getConversation(userId, creatorId);
//   }

//   /**
//    * Create a paid message.
//    *
//    * senderId is ALWAYS taken from the JWT.
//    *
//    * The frontend cannot impersonate another user.
//    */
//   @Post('send-paid-chat')
//   async sendPaidChat(
//     @Request() req: any,
//     @Body()
//     body: {
//       creatorId: string;
//       content: string;
//     },
//   ) {
//     const senderId = req.user.userId;

//     return this.messagesService.sendPaidChat(
//       senderId,
//       body.creatorId,
//       body.content,
//     );
//   }

//   /**
//    * Creator replies to a paid message.
//    *
//    * creatorUserId ALWAYS comes from the JWT.
//    */
//   @Post(':id/reply')
//   async replyToMessage(
//     @Request() req: any,
//     @Param('id') messageId: string,
//     @Body() dto: ReplyMessageDto,
//   ) {
//     const creatorUserId = req.user.userId;

//     return this.messagesService.replyToMessage(
//       creatorUserId,
//       messageId,
//       dto.content,
//     );
//   }
// }

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';

import { MessagesService } from './messages.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ReplyMessageDto } from './dto/reply-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ============================================================
  // EXISTING ENDPOINTS
  // ============================================================

  /**
   * Get paid messages sent by the authenticated user.
   */
  @Get('my-sent-messages')
  getSentMessages(@Request() req: any) {
    const userId = req.user.userId;

    return this.messagesService.getSentMessages(userId);
  }

  /**
   * Get paid messages received by the authenticated creator.
   */
  @Get('incoming')
  getIncomingMessages(@Request() req: any) {
    const creatorId = req.user.userId;

    return this.messagesService.getIncomingMessages(creatorId);
  }

  /**
   * Existing conversations endpoint.
   *
   * Kept temporarily so your existing frontend does not break.
   *
   * We will eventually move this to:
   *
   * GET /conversations
   */
  @Get('my-conversations')
  async getMyConversations(@Request() req: any) {
    return this.messagesService.getMyConversations(req.user.userId);
  }

  /**
   * OLD ENDPOINT
   *
   * Kept temporarily for backward compatibility.
   *
   * We will stop using this from the frontend once the
   * conversationId-based API is connected.
   */
  @Get('conversation/:creatorId')
  getConversation(@Request() req: any, @Param('creatorId') creatorId: string) {
    const userId = req.user.userId;

    return this.messagesService.getConversation(userId, creatorId);
  }

  // ============================================================
  // NEW CONVERSATION-FIRST ENDPOINTS
  // ============================================================

  /**
   * Get all conversations for the authenticated user/creator.
   *
   * GET /messages/conversations
   *
   * IMPORTANT:
   *
   * The authenticated user comes from JWT.
   * We never accept userId from the frontend.
   */
  @Get('conversations')
  async getConversations(@Request() req: any) {
    const userId = req.user.userId;

    return this.messagesService.getMyConversations(userId);
  }

  /**
   * Get a conversation with a specific creator.
   *
   * GET /messages/conversations/with/:creatorId
   *
   * This is useful when a user opens a creator profile.
   *
   * It returns:
   *
   * {
   *   conversationId: "..."
   * }
   *
   * or:
   *
   * {
   *   conversationId: null
   * }
   */
  @Get('conversations/with/:creatorId')
  async getConversationWithCreator(
    @Request() req: any,
    @Param('creatorId') creatorId: string,
  ) {
    const userId = req.user.userId;

    return this.messagesService.getConversation(userId, creatorId);
  }

  /**
   * Get messages using conversationId.
   *
   * GET /messages/conversations/:conversationId
   *
   * The service MUST verify that the authenticated
   * user belongs to this conversation.
   */
  @Get('conversations/:conversationId')
  async getConversationMessages(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = req.user.userId;

    return this.messagesService.getConversationMessages(userId, conversationId);
  }

  /**
   * Create/get a conversation before starting payment.
   *
   * POST /messages/conversations
   *
   * Body:
   *
   * {
   *   creatorId: string
   * }
   *
   * The authenticated user comes from JWT.
   */
  @Post('conversations')
  async createConversation(
    @Request() req: any,
    @Body()
    body: {
      creatorId: string;
    },
  ) {
    const userId = req.user.userId;

    return this.messagesService.createOrGetConversation(userId, body.creatorId);
  }

  // ============================================================
  // PAID CHAT
  // ============================================================

  /**
   * Create a paid message.
   *
   * senderId is ALWAYS taken from the JWT.
   */
  @Post('send-paid-chat')
  async sendPaidChat(
    @Request() req: any,
    @Body()
    body: {
      creatorId: string;
      content: string;
    },
  ) {
    const senderId = req.user.userId;

    return this.messagesService.sendPaidChat(
      senderId,
      body.creatorId,
      body.content,
    );
  }

  // ============================================================
  // CREATOR REPLY
  // ============================================================

  /**
   * Creator replies to a paid message.
   *
   * creatorUserId ALWAYS comes from the JWT.
   */
  @Post(':id/reply')
  async replyToMessage(
    @Request() req: any,
    @Param('id') messageId: string,
    @Body() dto: ReplyMessageDto,
  ) {
    const creatorUserId = req.user.userId;

    return this.messagesService.replyToMessage(
      creatorUserId,
      messageId,
      dto.content,
    );
  }
}
