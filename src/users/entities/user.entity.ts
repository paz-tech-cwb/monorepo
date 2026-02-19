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

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 15, nullable: true })
  phoneNumber: string | null;

  @ManyToOne(() => Address, { nullable: true })
  address: Address;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  picture: string | null;

  @ManyToOne(() => Role, { nullable: true })
  role: Role;

  // Flat role slug: 'admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader', 'member'
  @Column({ name: 'role_slug', type: 'varchar', length: 50, nullable: false, default: 'member' })
  roleSlug: string;

  @Column({ name: 'life_group', type: 'varchar', length: 255, nullable: true })
  lifeGroup: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'membership_date', type: 'date', nullable: true })
  membershipDate: Date | null;

  @OneToMany(() => UserAccount, (userAccount) => userAccount.user, {
    nullable: true,
  })
  accounts: UserAccount[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
