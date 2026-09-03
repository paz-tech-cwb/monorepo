import { PartialType } from '@nestjs/mapped-types';
import { CreateMinistryTeamDto } from './create-ministry-team.dto';
export class UpdateMinistryTeamDto extends PartialType(CreateMinistryTeamDto) {}
