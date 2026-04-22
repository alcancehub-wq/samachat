import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { WabaController } from './waba.controller';

@Module({
  controllers: [WabaController],
  imports: [WebhooksModule],
})
export class WabaModule {}
