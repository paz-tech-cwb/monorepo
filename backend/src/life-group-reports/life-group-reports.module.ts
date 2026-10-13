import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeGroupReport } from './entities/life-group-report.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { LifeGroupReportCreatePolicy } from './life-group-report-create-policy';
import { LifeGroupReportsService } from './life-group-reports.service';
import { LifeGroupReportsController } from './life-group-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LifeGroupReport]), FormsCoreModule],
  controllers: [LifeGroupReportsController],
  providers: [LifeGroupReportsService, LifeGroupReportCreatePolicy],
})
export class LifeGroupReportsModule {}
