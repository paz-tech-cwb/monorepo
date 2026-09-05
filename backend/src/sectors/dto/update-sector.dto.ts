import { PartialType } from '@nestjs/mapped-types';
import { CreateSectorDto } from './create-sector.dto';

export class UpdateSectorDto extends PartialType(CreateSectorDto) {}
