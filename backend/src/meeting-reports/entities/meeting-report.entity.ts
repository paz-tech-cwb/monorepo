import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { Area } from '../../areas/entities/area.entity';
import { Sector } from '../../sectors/entities/sector.entity';

@Entity('meeting_reports')
export class MeetingReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false })
  leader: User;

  @ManyToOne(() => LifeGroup, { nullable: false })
  lifeGroup: LifeGroup;

  @Column({ name: 'meeting_date', type: 'date' })
  meetingDate: Date;

  @ManyToOne(() => Area, { nullable: false })
  area: Area;

  @ManyToOne(() => Sector, { nullable: false })
  sector: Sector;

  @Column({ name: 'total_members', type: 'int' })
  totalMembers: number;

  @Column({ name: 'members_present', type: 'int' })
  membersPresent: number;

  @Column({ name: 'children_0_11', type: 'int', default: 0 })
  children0To11: number;

  @Column({ name: 'invited_persons', type: 'int', default: 0 })
  invitedPersons: number;

  @Column({ type: 'text', nullable: true })
  mdas: string | null;

  @Column({
    name: 'offering_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  offeringAmount: number;

  @Column({ name: 'tadel_attendees', type: 'int', default: 0 })
  tadelAttendees: number;

  @Column({ name: 'culto_attendees', type: 'int', default: 0 })
  cultoAttendees: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
