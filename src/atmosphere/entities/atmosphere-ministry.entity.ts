import {
  Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne,
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
  @ManyToMany(() => User)
  @JoinTable({
    name: 'atmosphere_ministry_members',
    joinColumn: { name: 'ministry_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  members: User[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
