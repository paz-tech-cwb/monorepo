import { Module } from '@nestjs/common';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { JourneyTracksService } from './journey-tracks.service';
import { JourneyProgressService } from './journey-progress.service';
import { JourneyTracksAdminController } from './journey-tracks-admin.controller';
import { JourneyTracksController } from './journey-tracks.controller';

@Module({
  imports: [FormsCoreModule],
  controllers: [JourneyTracksAdminController, JourneyTracksController],
  providers: [JourneyTracksService, JourneyProgressService],
  exports: [JourneyProgressService],
})
export class JourneyTracksModule {}
