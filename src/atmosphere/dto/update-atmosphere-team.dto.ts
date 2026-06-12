import { PartialType } from '@nestjs/mapped-types';
import { CreateAtmosphereTeamDto } from './create-atmosphere-team.dto';
export class UpdateAtmosphereTeamDto extends PartialType(CreateAtmosphereTeamDto) {}
