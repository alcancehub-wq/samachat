import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationEngine } from './automation.engine';
import { MessagesModule } from '../messages/messages.module';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [MessagesModule, CrmModule],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationEngine],
})
export class AutomationModule {}
