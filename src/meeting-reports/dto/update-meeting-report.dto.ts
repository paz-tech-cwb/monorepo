import { PartialType } from '@nestjs/mapped-types';
import { CreateMeetingReportDto } from './create-meeting-report.dto';

export class UpdateMeetingReportDto extends PartialType(
  CreateMeetingReportDto,
) {}
