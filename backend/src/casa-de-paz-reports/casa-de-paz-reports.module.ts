import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasaDePazReport } from './entities/casa-de-paz-report.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { CasaDePazReportsService } from './casa-de-paz-reports.service';
import { CasaDePazReportsController } from './casa-de-paz-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CasaDePazReport]), FormsCoreModule],
  controllers: [CasaDePazReportsController],
  providers: [CasaDePazReportsService],
})
export class CasaDePazReportsModule {}
