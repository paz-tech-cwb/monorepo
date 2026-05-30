import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('form_course_links')
export class FormCourseLink {
  @PrimaryColumn({ name: 'form_slug', type: 'varchar', length: 64 }) formSlug: string;
  @PrimaryColumn({ name: 'course_id', type: 'uuid' }) courseId: string;
  @Column({ name: 'display_order', type: 'int', default: 0 }) displayOrder: number;
}
