import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger(AuditLogger.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async logAuthAttempt(
    email: string,
    provider: string,
    action: AuditAction,
    reason?: string | null,
    ipAddress?: string | null,
  ): Promise<void> {
    try {
      const entry = this.auditLogRepo.create({
        email,
        provider,
        action,
        reason: reason ?? null,
        ipAddress: ipAddress ?? null,
        timestamp: new Date(),
      });
      await this.auditLogRepo.save(entry);
    } catch (error) {
      this.logger.error(
        `Failed to write audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
