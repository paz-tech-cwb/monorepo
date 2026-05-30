import {
  Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type FormAuditAction = 'create' | 'update' | 'delete';

@Entity('form_submission_audit_log')
@Index(['formSlug', 'submissionId'])
export class FormSubmissionAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_slug', type: 'varchar', length: 64 })
  formSlug: string;

  @Column({ name: 'submission_id', type: 'varchar', length: 64 })
  submissionId: string;

  @ManyToOne(() => User, { nullable: false, eager: false })
  actor: User;

  @Column({ name: 'action', type: 'varchar', length: 16 })
  action: FormAuditAction;

  @Column({ name: 'diff', type: 'jsonb', nullable: true })
  diff: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
