import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class CreateContributionDto {
  @Expose({ name: 'bank_name' })
  @IsString()
  bankName: string;

  @Expose({ name: 'branch_number' })
  @IsString()
  branchNumber: string;

  @Expose({ name: 'account_number' })
  @IsString()
  accountNumber: string;

  @Expose({ name: 'pix_key' })
  @IsString()
  pixKey: string;
}
