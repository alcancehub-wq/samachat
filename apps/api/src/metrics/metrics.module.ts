import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { ObservabilityService } from './observability.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, ObservabilityService],
  exports: [MetricsService],
})
export class MetricsModule {}
