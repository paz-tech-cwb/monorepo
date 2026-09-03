import { PartialType } from '@nestjs/mapped-types';
import { CreateFormGuestDto } from './create-form-guest.dto';

export class UpdateFormGuestDto extends PartialType(CreateFormGuestDto) {}
