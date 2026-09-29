import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasaDePazReport } from './entities/casa-de-paz-report.entity';
import { CasaDePazReportGuest } from './entities/casa-de-paz-report-guest.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { CasaDePazReportsService } from './casa-de-paz-reports.service';
import { CasaDePazReportsController } from './casa-de-paz-reports.controller';
import { GuestOriginsModule } from '../guest-origins/guest-origins.module';
import { CasaDePazCyclesModule } from '../casa-de-paz-cycles/casa-de-paz-cycles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CasaDePazReport, CasaDePazReportGuest]),
    FormsCoreModule,
    GuestOriginsModule,
    CasaDePazCyclesModule,
  ],
  controllers: [CasaDePazReportsController],
  providers: [CasaDePazReportsService],
})
export class CasaDePazReportsModule {}
