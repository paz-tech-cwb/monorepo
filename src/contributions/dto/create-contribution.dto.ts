import { IsString } from 'class-validator';

export class CreateContributionDto {
  @IsString()
  bankName: string;

  @IsString()
  branchNumber: string;

  @IsString()
  accountNumber: string;

  @IsString()
  pixKey: string;
}
