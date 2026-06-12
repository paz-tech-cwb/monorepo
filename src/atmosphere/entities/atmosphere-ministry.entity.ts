import {
  Column, CreateDateColumn, Entity, ManyToOne,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AtmosphereTeam } from './atmosphere-team.entity';

@Entity('atmosphere_ministries')
export class AtmosphereMinistry {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 180 }) name: string;
  @ManyToOne(() => User, { nullable: true }) leader: User | null;
  @OneToMany(() => AtmosphereTeam, (t) => t.ministry) teams: AtmosphereTeam[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
