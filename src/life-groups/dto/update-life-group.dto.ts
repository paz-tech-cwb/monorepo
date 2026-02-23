import { PartialType } from '@nestjs/mapped-types';
import { CreateLifeGroupDto } from './create-life-group.dto';

export class UpdateLifeGroupDto extends PartialType(CreateLifeGroupDto) {}
