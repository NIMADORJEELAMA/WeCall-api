// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Param,
//   Req,
//   UseGuards,
//   Request,
// } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport'; // Import this!
// import { MessagesService } from './messages.service';
// import { JwtAuthGuard } from 'src/auth/jwt.guard';
// import { ReplyMessageDto } from './dto/reply-message.dto';

// @Controller('messages')
// @UseGuards(AuthGuard('jwt')) // <--- THIS IS THE FIX. It protects all routes in this controller.
// export class MessagesController {
//   constructor(private readonly messagesService: MessagesService) {}

//   @Get('my-sent-messages')
//   getSentMessages(@Req() req: any) {
//     return this.messagesService.getSentMessages(req.user.sub);
//   }

//   @Get('incoming')
//   getIncomingMessages(@Req() req: any) {
//     return this.messagesService.getIncomingMessages(req.user.sub);
//   }

//   @Get('conversation/:creatorId')
//   getConversation(@Req() req: any, @Param('creatorId') creatorId: string) {
//     return this.messagesService.getConversation(req.user.sub, creatorId);
//   }

//   @UseGuards(JwtAuthGuard) // 1. Ensure the user is logged in
//   @Post('send-paid-chat')
//   async sendPaidChat(
//     @Request() req: any, // 2. Grab the request object to get the JWT payload
//     @Body() body: { creatorId: string; content: string },
//   ) {
//     // 3. Extract the sender's ID from the JWT token.
//     console.log('req', req);
//     // (Depending on your AuthService, this might be req.user.id instead of sub)
//     const senderId = req.user.userId || req.user.id;

//     return this.messagesService.sendPaidChat(
//       senderId,
//       body.creatorId,
//       body.content,
//     );
//   }

//   // messages.controller.ts
//   @UseGuards(JwtAuthGuard)
//   @Post(':id/reply')
//   async replyToMessage(
//     @Request() req: any,
//     @Param('id') messageId: string,
//     @Body() dto: ReplyMessageDto,
//   ) {
//     console.log('req', req);
//     // Use req.user.userid based on your JWT payload structure
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

  /**
   * Get paid messages sent by the authenticated user.
   *
   * IMPORTANT:
   * We NEVER accept userId from the frontend.
   * userId comes from the verified JWT.
   */
  @Get('my-sent-messages')
  getSentMessages(@Request() req: any) {
    const userId = req.user.userId;

    return this.messagesService.getSentMessages(userId);
  }

  /**
   * Get paid messages received by the authenticated creator.
   *
   * IMPORTANT:
   * creatorId comes from the verified JWT.
   */
  @Get('incoming')
  getIncomingMessages(@Request() req: any) {
    const creatorId = req.user.userId;

    return this.messagesService.getIncomingMessages(creatorId);
  }
  @Get('my-conversations')
  async getMyConversations(@Request() req) {
    return this.messagesService.getMyConversations(req.user.userId);
  }
  /**
   * Get the conversation between the authenticated user
   * and a creator.
   *
   * For now the URL still contains creatorId because your
   * frontend currently uses this route.
   *
   * The service MUST verify that the authenticated user
   * owns this conversation.
   */
  @Get('conversation/:creatorId')
  getConversation(@Request() req: any, @Param('creatorId') creatorId: string) {
    const userId = req.user.userId;

    return this.messagesService.getConversation(userId, creatorId);
  }

  /**
   * Create a paid message.
   *
   * senderId is ALWAYS taken from the JWT.
   *
   * The frontend cannot impersonate another user.
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
