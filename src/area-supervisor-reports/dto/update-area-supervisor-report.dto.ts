import { PartialType } from '@nestjs/mapped-types';
import { CreateAreaSupervisorReportDto } from './create-area-supervisor-report.dto';

export class UpdateAreaSupervisorReportDto extends PartialType(CreateAreaSupervisorReportDto) {}
