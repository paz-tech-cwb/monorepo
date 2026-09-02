import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';

@Entity('announcements')
export class Announcement {
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @Expose({ name: 'image_url' })
  @Column({ name: 'image_url' })
  imageUrl: string;

  @Expose()
  @Column()
  title: string;

  @Expose()
  @Column()
  subtitle: string;

  @Expose({ name: 'markdown_content' })
  @Column({ name: 'markdown_content', type: 'text' })
  markdownContent: string;

  @Expose({ name: 'action_url' })
  @Column({ name: 'action_url', nullable: true })
  actionUrl: string;

  @Expose({ name: 'created_at' })
  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Expose({ name: 'updated_at' })
  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
