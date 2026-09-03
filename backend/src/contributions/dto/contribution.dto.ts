import { Contribution } from '../entities/contribution.entity';

export class ContributionDto {
  bankName: string;
  branchNumber: string;
  accountNumber: string;
  pixKey: string;

  static fromEntity(contribution: Contribution) {
    return {
      id: contribution.id,
    };
  }
}
