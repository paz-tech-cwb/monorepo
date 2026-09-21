import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseQuestion } from './course-question.entity';

@Entity('course_question_options')
export class CourseQuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => CourseQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: CourseQuestion;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'is_correct', type: 'boolean', default: false })
  isCorrect: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
