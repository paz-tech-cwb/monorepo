import { Module } from '@nestjs/common';
import { MeetingReportsService } from './meeting-reports.service';
import { MeetingReportsController } from './meeting-reports.controller';

@Module({
  controllers: [MeetingReportsController],
  providers: [MeetingReportsService],
  exports: [MeetingReportsService],
})
export class MeetingReportsModule {}
