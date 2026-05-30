import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceReportDto } from './create-service-report.dto';

export class UpdateServiceReportDto extends PartialType(CreateServiceReportDto) {}
