import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column()
  title: string;

  @Column()
  subtitle: string;

  @Column({ name: 'markdown_content', type: 'text' })
  markdownContent: string;

  @Column({ name: 'action_url', nullable: true })
  actionUrl: string;

  @CreateDateColumn({ name: 'created_at', default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
