import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { CourseQuestionnaire } from './course-questionnaire.entity';

export type CourseQuestionnaireAnswer = {
  question_id: string;
  option_ids?: string[];
  text?: string;
};

@Entity('course_questionnaire_responses')
@Index('IDX_course_questionnaire_responses_user_course', ['userId', 'courseId'])
export class CourseQuestionnaireResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'questionnaire_id', type: 'uuid' })
  questionnaireId: string;

  @ManyToOne(() => CourseQuestionnaire, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionnaire_id' })
  questionnaire: CourseQuestionnaire;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  // IMPORTANT: always assign an explicit array (never leave undefined) before
  // saving — see commit 563626f. TypeORM's `default` for jsonb columns only
  // applies at the DB DDL level, it will NOT rescue a save() call that never
  // set this property.
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  answers: CourseQuestionnaireAnswer[];

  @Column({ name: 'score_percentage', type: 'int' })
  scorePercentage: number;

  @Column({ type: 'boolean' })
  passed: boolean;

  @Column({ name: 'attempt_number', type: 'int' })
  attemptNumber: number;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;
}
