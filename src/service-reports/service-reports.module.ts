import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceReport } from './entities/service-report.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { MinistryAccessModule } from '../ministry-access/ministry-access.module';
import { ServiceReportsService } from './service-reports.service';
import { ServiceReportsController } from './service-reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceReport]),
    FormsCoreModule,
    MinistryAccessModule,
  ],
  controllers: [ServiceReportsController],
  providers: [ServiceReportsService],
})
export class ServiceReportsModule {}
