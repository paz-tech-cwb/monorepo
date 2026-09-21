import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { CourseQuestionnaireResponse } from './course-questionnaire-response.entity';

@Entity('course_certificates')
@Unique('UQ_course_certificates_user_course', ['userId', 'courseId'])
export class CourseCertificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({
    name: 'certificate_code',
    type: 'varchar',
    length: 32,
    unique: true,
  })
  certificateCode: string;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt: Date;

  @Column({ name: 'score_percentage', type: 'int' })
  scorePercentage: number;

  @Column({ name: 'response_id', type: 'uuid', nullable: true })
  responseId: string | null;

  @ManyToOne(() => CourseQuestionnaireResponse, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'response_id' })
  response: CourseQuestionnaireResponse | null;
}
