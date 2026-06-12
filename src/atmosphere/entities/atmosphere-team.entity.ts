import {
  Column, CreateDateColumn, Entity, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AtmosphereMinistry } from './atmosphere-ministry.entity';

@Entity('atmosphere_teams')
export class AtmosphereTeam {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 180 }) name: string;
  @ManyToOne(() => AtmosphereMinistry, (m) => m.teams, { nullable: false })
  ministry: AtmosphereMinistry;
  @Column({ name: 'ministry_id' }) ministryId: number;
  @ManyToOne(() => User, { nullable: true }) leader: User | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
