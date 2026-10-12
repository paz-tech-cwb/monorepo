import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Church } from '../../church/entities/church.entity';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'church_id' })
  church: Church;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column()
  title: string;

  @Column()
  subtitle: string;

  @Column({ name: 'markdown_content', type: 'text' })
  markdownContent: string;

  @Column({ name: 'action_url', nullable: true })
  actionUrl?: string;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
