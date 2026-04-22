import { forwardRef, Module } from '@nestjs/common';
import { MessageNormalizer } from './message.normalizer';
import { MessageProcessor } from './message.processor';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ConnectionsModule } from '../connections/connections.module';
import { ConversationQuery } from './conversation.query';
import { InboxGateway } from './inbox.gateway';
import { InboxRealtimeService } from './inbox.realtime';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [forwardRef(() => ConnectionsModule), StorageModule],
  controllers: [MessagesController],
  providers: [
    MessageNormalizer,
    MessageProcessor,
    MessagesService,
    ConversationQuery,
    InboxGateway,
    InboxRealtimeService,
  ],
  exports: [MessagesService, ConversationQuery],
})
export class MessagesModule {}
