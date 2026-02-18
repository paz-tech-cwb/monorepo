import {
  IsString,
  IsOptional,
  IsEmail,
  IsDate,
  IsPhoneNumber,
  IsNumber,
} from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'Name must be a string.' })
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Role ID must be a number.' })
  roleId?: number;
}
