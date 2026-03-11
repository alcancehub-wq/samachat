import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { MessagesModule } from '../modules/messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
