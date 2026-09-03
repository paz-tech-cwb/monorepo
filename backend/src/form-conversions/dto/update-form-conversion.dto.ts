import { PartialType } from '@nestjs/mapped-types';
import { CreateFormConversionDto } from './create-form-conversion.dto';

export class UpdateFormConversionDto extends PartialType(
  CreateFormConversionDto,
) {}
