import { PartialType } from '@nestjs/mapped-types';
import { CreateSectorSupervisorReportDto } from './create-sector-supervisor-report.dto';

export class UpdateSectorSupervisorReportDto extends PartialType(
  CreateSectorSupervisorReportDto,
) {}
