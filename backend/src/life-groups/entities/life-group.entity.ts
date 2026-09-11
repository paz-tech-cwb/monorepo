import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
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
  @JoinColumn({ name: 'leader_id' })
  leader: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'co_leader_id' })
  coLeader: User | null;

  @ManyToOne(() => Sector, { nullable: true })
  sector: Sector | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  // Geocoded server-side from `location` on create/update (see
  // LifeGroupsService.geocodeLocation) — powers the map discovery view.
  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  // Address parts parsed from Nominatim's `addressdetails=1` on the same
  // geocode call as latitude/longitude (see LifeGroupsService.geocodeLocation)
  // — powers the distribution-by-neighborhood/city analytics chart. `state`
  // is stored for completeness even though no UI consumes it yet.
  @Column({ type: 'varchar', length: 255, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  neighborhood: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  state: string | null;

  @Column({ name: 'kids_count', type: 'int', default: 0 })
  kidsCount: number;

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
