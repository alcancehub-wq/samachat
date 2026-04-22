import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ConnectionsModule } from '../modules/connections/connections.module';

@Module({
  imports: [ConnectionsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
