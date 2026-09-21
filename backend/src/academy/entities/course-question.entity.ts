import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseQuestionnaire } from './course-questionnaire.entity';

export type CourseQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'free_text';

@Entity('course_questions')
export class CourseQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'questionnaire_id', type: 'uuid' })
  questionnaireId: string;

  @ManyToOne(() => CourseQuestionnaire, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionnaire_id' })
  questionnaire: CourseQuestionnaire;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'varchar', length: 20 })
  type: CourseQuestionType;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'int', default: 1 })
  points: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
