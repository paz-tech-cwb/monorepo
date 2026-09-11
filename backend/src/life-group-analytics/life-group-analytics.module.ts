import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeGroupAttendance } from '../life-group-attendance/entities/life-group-attendance.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { LifeGroupAnalyticsService } from './life-group-analytics.service';
import { LifeGroupAnalyticsController } from './life-group-analytics.controller';
import { FormsCoreModule } from '../forms-core/forms-core.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LifeGroupAttendance, LifeGroup]),
    FormsCoreModule,
  ],
  controllers: [LifeGroupAnalyticsController],
  providers: [LifeGroupAnalyticsService],
  exports: [LifeGroupAnalyticsService],
})
export class LifeGroupAnalyticsModule {}
