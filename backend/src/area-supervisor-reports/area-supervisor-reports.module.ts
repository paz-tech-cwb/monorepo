import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaSupervisorReport } from './entities/area-supervisor-report.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { AreaSupervisorReportsService } from './area-supervisor-reports.service';
import { AreaSupervisorReportsController } from './area-supervisor-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AreaSupervisorReport]), FormsCoreModule],
  controllers: [AreaSupervisorReportsController],
  providers: [AreaSupervisorReportsService],
})
export class AreaSupervisorReportsModule {}
