import { PartialType } from '@nestjs/mapped-types';
import { CreateMemberRegistrationDto } from './create-member-registration.dto';

export class UpdateMemberRegistrationDto extends PartialType(
  CreateMemberRegistrationDto,
) {}
