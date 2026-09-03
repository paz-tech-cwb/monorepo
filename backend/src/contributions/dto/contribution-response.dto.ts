import { Expose, Transform } from 'class-transformer';

export class ContributionResponseDto {
  @Expose()
  id: number;

  @Expose({ name: 'bank_name' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.bankName)
  bankName: string;

  @Expose({ name: 'branch_number' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.branchNumber)
  branchNumber: string;

  @Expose({ name: 'account_number' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.accountNumber)
  accountNumber: string;

  @Expose({ name: 'pix_key' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.pixKey)
  pixKey: string;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.createdAt)
  createdAt: Date;

  @Expose({ name: 'updated_at' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.updatedAt)
  updatedAt: Date;
}
