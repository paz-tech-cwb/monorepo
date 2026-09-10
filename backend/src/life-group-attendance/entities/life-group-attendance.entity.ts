import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { User } from '../../users/entities/user.entity';
import { LifeGroupAttendanceEntry } from './life-group-attendance-entry.entity';

// One row per (life_group_id, meeting_date). `presentCount`/`membersCount`
// are denormalized from the entries at write time so list views don't need
// to aggregate entries for every meeting.
@Entity('life_group_attendance')
@Index(['lifeGroupId', 'meetingDate'], { unique: true })
export class LifeGroupAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'life_group_id', type: 'int' })
  lifeGroupId: number;

  @ManyToOne(() => LifeGroup, { nullable: false })
  @JoinColumn({ name: 'life_group_id' })
  lifeGroup: LifeGroup;

  @Column({ name: 'meeting_date', type: 'date' })
  meetingDate: string;

  @Column({ name: 'present_count', type: 'int', default: 0 })
  presentCount: number;

  @Column({ name: 'members_count', type: 'int', default: 0 })
  membersCount: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'recorded_by' })
  recordedBy: User;

  @OneToMany(() => LifeGroupAttendanceEntry, (entry) => entry.attendance, {
    cascade: true,
  })
  entries: LifeGroupAttendanceEntry[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
