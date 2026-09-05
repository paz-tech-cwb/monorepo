import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('life_group_studies')
export class LifeGroupStudy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  author: string;

  @Column({ name: 'body_markdown', type: 'text' })
  bodyMarkdown: string;

  @Index('IDX_life_group_studies_published_by_id')
  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'published_by_id' })
  publishedBy: User;

  @Column({ name: 'published_by_id' })
  publishedById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
