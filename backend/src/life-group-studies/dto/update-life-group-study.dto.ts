import { PartialType } from '@nestjs/mapped-types';
import { CreateLifeGroupStudyDto } from './create-life-group-study.dto';

export class UpdateLifeGroupStudyDto extends PartialType(
  CreateLifeGroupStudyDto,
) {}
