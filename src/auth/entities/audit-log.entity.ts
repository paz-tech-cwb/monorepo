import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED_ROLE'
  | 'LOGIN_FAILED_AUTH';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'email', length: 255 })
  email: string;

  @Column({ name: 'provider', length: 50 })
  provider: string;

  @Column({
    name: 'action',
    type: 'enum',
    enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED_ROLE', 'LOGIN_FAILED_AUTH'],
  })
  action: AuditAction;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @Column({
    name: 'timestamp',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp: Date;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;
}
