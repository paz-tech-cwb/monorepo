import { PartialType } from '@nestjs/mapped-types';
import { CreateCasaDePazReportDto } from './create-casa-de-paz-report.dto';

export class UpdateCasaDePazReportDto extends PartialType(
  CreateCasaDePazReportDto,
) {}
