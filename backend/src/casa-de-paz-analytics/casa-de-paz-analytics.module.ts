import { Module } from '@nestjs/common';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { CasaDePazAnalyticsService } from './casa-de-paz-analytics.service';
import { CasaDePazAnalyticsController } from './casa-de-paz-analytics.controller';

@Module({
  imports: [FormsCoreModule],
  controllers: [CasaDePazAnalyticsController],
  providers: [CasaDePazAnalyticsService],
})
export class CasaDePazAnalyticsModule {}
