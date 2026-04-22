import { forwardRef, Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { ConnectionGateway } from './connection.gateway';
import { SessionManager } from './session.manager';
import { SessionStore } from './session.store';
import { ConnectionPoolManager } from './connection-pool.manager';
import { MessagesModule } from '../messages/messages.module';
import { MetricsModule } from '../../metrics/metrics.module';

@Module({
  imports: [forwardRef(() => MessagesModule), MetricsModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, ConnectionGateway, SessionManager, SessionStore, ConnectionPoolManager],
  exports: [ConnectionPoolManager, SessionManager],
})
export class ConnectionsModule {}
