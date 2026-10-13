import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateLifeGroupReportDto } from './create-life-group-report.dto';

// The owning group (and the area/sector derived from it) is fixed at create
// time, where access is checked: PATCH must not be able to move a report to
// another group. The global pipe uses excludeExtraneousValues, so clients that
// still send these keys are silently ignored, not rejected.
export class UpdateLifeGroupReportDto extends PartialType(
  OmitType(CreateLifeGroupReportDto, [
    'lifeGroupId',
    'areaId',
    'sectorId',
  ] as const),
) {}
