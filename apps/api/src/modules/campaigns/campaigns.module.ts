import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignsWorker } from './campaigns.worker';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignsWorker],
})
export class CampaignsModule {}
