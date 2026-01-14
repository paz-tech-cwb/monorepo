import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contributions')
export class Contribution {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ name: 'branch_number' })
  branchNumber: string;

  @Column({ name: 'account_number' })
  accountNumber: string;

  @Column({ name: 'pix_key' })
  pixKey: string;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
