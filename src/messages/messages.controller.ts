import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';

import { MessagesService } from './messages.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ReplyMessageDto } from './dto/reply-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('my-sent-messages')
  getSentMessages(@Request() req: any) {
    const userId = req.user.userId;

    return this.messagesService.getSentMessages(userId);
  }

  @Get('incoming')
  getIncomingMessages(@Request() req: any) {
    const creatorId = req.user.userId;

    return this.messagesService.getIncomingMessages(creatorId);
  }

  @Get('my-conversations')
  async getMyConversations(@Request() req: any) {
    return this.messagesService.getMyConversations(req.user.userId);
  }

  @Get('conversation/:creatorId')
  getConversation(@Request() req: any, @Param('creatorId') creatorId: string) {
    const userId = req.user.userId;

    return this.messagesService.getConversation(userId, creatorId);
  }

  @Get('conversations')
  async getConversations(@Request() req: any) {
    const userId = req.user.userId;

    return this.messagesService.getMyConversations(userId);
  }

  @Get('conversations/with/:creatorId')
  async getConversationWithCreator(
    @Request() req: any,
    @Param('creatorId') creatorId: string,
  ) {
    const userId = req.user.userId;

    return this.messagesService.getConversation(userId, creatorId);
  }

  @Get(':conversationId/messages')
  async getMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    console.log('req', req);
    return this.messagesService.getConversationMessages(
      req.user.userId,
      conversationId,
      cursor,
      limit ? Number(limit) : 30,
    );
  }

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
