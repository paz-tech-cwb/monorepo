import { PartialType } from '@nestjs/mapped-types';
import { CreateMultiplicationDto } from './create-multiplication.dto';

export class UpdateMultiplicationDto extends PartialType(
  CreateMultiplicationDto,
) {}
