import { PartialType } from '@nestjs/mapped-types';
import { CreateAtmosphereMinistryDto } from './create-atmosphere-ministry.dto';
export class UpdateAtmosphereMinistryDto extends PartialType(CreateAtmosphereMinistryDto) {}
