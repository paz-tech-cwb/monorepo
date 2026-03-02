import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Sector } from '../../sectors/entities/sector.entity';

@Entity('life_groups')
export class LifeGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToOne(() => User, { nullable: true })
  leader: User | null;

  @ManyToOne(() => Sector, { nullable: true })
  sector: Sector | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ name: 'meeting_day', type: 'varchar', length: 50, nullable: true })
  meetingDay: string | null;

  @Column({ name: 'meeting_time', type: 'time', nullable: true })
  meetingTime: string | null;

  @ManyToMany(() => User, (user) => user.lifeGroups)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
