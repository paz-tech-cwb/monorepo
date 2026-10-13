import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeGroupAttendance } from './entities/life-group-attendance.entity';
import { LifeGroupAttendanceEntry } from './entities/life-group-attendance-entry.entity';
import { LifeGroupAttendanceService } from './life-group-attendance.service';
import { LifeGroupAttendanceController } from './life-group-attendance.controller';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { LifeGroupReportSnapshotService } from '../life-group-reports/life-group-report-snapshot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LifeGroupAttendance, LifeGroupAttendanceEntry]),
    FormsCoreModule,
  ],
  controllers: [LifeGroupAttendanceController],
  providers: [LifeGroupAttendanceService, LifeGroupReportSnapshotService],
  exports: [LifeGroupAttendanceService, LifeGroupReportSnapshotService],
})
export class LifeGroupAttendanceModule {}
