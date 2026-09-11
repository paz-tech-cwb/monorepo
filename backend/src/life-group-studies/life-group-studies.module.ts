import { Module } from '@nestjs/common';
import { LifeGroupStudiesController } from './life-group-studies.controller';
import { LifeGroupStudiesService } from './life-group-studies.service';
import { LifeGroupStudyAccessService } from './life-group-study-access.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LifeGroupStudiesController],
  providers: [LifeGroupStudiesService, LifeGroupStudyAccessService],
})
export class LifeGroupStudiesModule {}
