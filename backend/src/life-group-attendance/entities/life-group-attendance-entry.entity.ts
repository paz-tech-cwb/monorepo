import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroupAttendance } from './life-group-attendance.entity';

// Roster snapshot as of when attendance was first recorded for this meeting.
// Reopening a past record for edit must not retroactively add members who
// joined the life group later — only the members captured here are shown.
@Entity('life_group_attendance_entries')
@Index(['attendance', 'userId'], { unique: true })
export class LifeGroupAttendanceEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // No separate `attendanceId` scalar column on purpose: TypeORM shadows the
  // relation-computed FK with an explicit column of the same @JoinColumn
  // name, so cascaded inserts (which only set userId/present on the child,
  // relying on the parent's OneToMany cascade to populate this FK) silently
  // wrote NULL into attendance_id instead of the new parent's id.
  @ManyToOne(() => LifeGroupAttendance, (attendance) => attendance.entries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attendance_id' })
  attendance: LifeGroupAttendance;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: false })
  present: boolean;
}
