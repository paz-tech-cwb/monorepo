import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectorSupervisorReport } from './entities/sector-supervisor-report.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { SectorSupervisorReportsService } from './sector-supervisor-reports.service';
import { SectorSupervisorReportsController } from './sector-supervisor-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SectorSupervisorReport]), FormsCoreModule],
  controllers: [SectorSupervisorReportsController],
  providers: [SectorSupervisorReportsService],
})
export class SectorSupervisorReportsModule {}
