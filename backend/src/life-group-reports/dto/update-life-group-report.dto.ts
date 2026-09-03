import { PartialType } from '@nestjs/mapped-types';
import { CreateLifeGroupReportDto } from './create-life-group-report.dto';

export class UpdateLifeGroupReportDto extends PartialType(
  CreateLifeGroupReportDto,
) {}
