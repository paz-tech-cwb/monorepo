import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Address } from '../../addresses/entities/address.entity';
import { UserAccount } from './account.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToOne(() => Address, { nullable: true })
  address: Address;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({ name: 'phone_number', type: 'varchar', length: 15, nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ nullable: true })
  picture: string;

  @ManyToOne(() => Role)
  role: Role;

  @OneToMany(() => UserAccount, (userAccount) => userAccount.user, {
    nullable: true,
  })
  accounts: UserAccount[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
