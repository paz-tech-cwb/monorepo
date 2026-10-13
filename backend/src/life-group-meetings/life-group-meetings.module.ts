import { Module } from '@nestjs/common';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { LifeGroupAttendanceModule } from '../life-group-attendance/life-group-attendance.module';
import { LifeGroupMeetingsController } from './life-group-meetings.controller';
import { LifeGroupMeetingsService } from './life-group-meetings.service';

@Module({
  imports: [LifeGroupAttendanceModule, FormsCoreModule],
  controllers: [LifeGroupMeetingsController],
  providers: [LifeGroupMeetingsService],
})
export class LifeGroupMeetingsModule {}
