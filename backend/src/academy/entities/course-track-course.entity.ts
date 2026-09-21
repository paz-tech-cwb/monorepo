import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { CourseTrack } from './course-track.entity';

/**
 * Explicit mapping for the `course_track_courses` join table, used where we
 * need `sort_order` (ordered track membership). The `CourseTrack.courses`
 * ManyToMany relation is kept for simple eager reads of unordered course
 * lists; this entity is used for admin writes and ordered reads.
 */
@Entity('course_track_courses')
export class CourseTrackCourse {
  @PrimaryColumn({ name: 'track_id', type: 'int' })
  trackId: number;

  @ManyToOne(() => CourseTrack, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: CourseTrack;

  @PrimaryColumn({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
