import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('casa_de_paz_lessons')
export class CasaDePazLesson {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'int', unique: true }) week: number;
  @Column({ type: 'varchar', length: 160 }) title: string;
  @Column({ type: 'text' }) summary: string;
  @Column({ type: 'text' }) guidelines: string;

  // IMPORTANT: always assign an explicit array (never leave undefined) before
  // saving — TypeORM's `default` for jsonb columns only applies at the DB
  // DDL level, it will NOT rescue a save() call that never set this
  // property. See course-questionnaire-response.entity.ts for precedent.
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  questions: string[];

  @Column({ name: 'youtube_url', type: 'varchar', length: 500, nullable: true })
  youtubeUrl: string | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
