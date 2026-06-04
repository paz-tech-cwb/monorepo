import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceReport } from './entities/service-report.entity';
import { User } from '../users/entities/user.entity';
import { CreateServiceReportDto } from './dto/create-service-report.dto';
import { UpdateServiceReportDto } from './dto/update-service-report.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'service-reports';

@Injectable()
export class ServiceReportsService {
  constructor(
    @InjectRepository(ServiceReport)
    private readonly repo: Repository<ServiceReport>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(
    dto: CreateServiceReportDto,
    actorId: number,
  ): Promise<ServiceReport> {
    const entity = await this.repo.save(
      this.repo.create({
        date: dto.date,
        serviceType: dto.serviceType,
        serviceTypeOther: dto.serviceTypeOther ?? null,
        totalAttendance: dto.totalAttendance,
        membersPresent: dto.membersPresent,
        guestsPresent: dto.guestsPresent,
        kidsPresent: dto.kidsPresent,
        decisionsForChrist: dto.decisionsForChrist,
        reconciliations: dto.reconciliations,
        baptismCandidates: dto.baptismCandidates ?? null,
        offering: dto.offering,
        notes: dto.notes ?? null,
        areaId: dto.areaId ?? null,
        sectorId: dto.sectorId ?? null,
        lifeGroupId: dto.lifeGroupId ?? null,
        submittedBy: { id: actorId } as User,
      }),
    );
    await this.audit.record({
      formSlug: SLUG,
      submissionId: entity.id,
      actorId,
      action: 'create',
    });
    return entity;
  }

  async list(scope: ResolvedScope): Promise<ServiceReport[]> {
    const qb = this.repo.createQueryBuilder('f').where('f.deleted_at IS NULL');
    if (!scope.unrestricted && scope.lifeGroupIds.length > 0) {
      qb.andWhere('f.life_group_id = ANY(:lgs)', { lgs: scope.lifeGroupIds });
    } else if (!scope.unrestricted) {
      qb.andWhere('1=0');
    }
    return qb.orderBy('f.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<ServiceReport> {
    const m = await this.repo.findOne({
      where: { id },
      relations: ['submittedBy'],
    });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(
    id: string,
    dto: UpdateServiceReportDto,
    actor: { id: number; roleSlug: string },
  ): Promise<ServiceReport> {
    const m = await this.findOne(id);
    this.policy.assertCanEdit(actor, {
      submittedById: m.submittedBy.id,
      createdAt: m.createdAt,
      deletedAt: m.deletedAt,
    });
    Object.assign(m, dto);
    const saved = await this.repo.save(m);
    await this.audit.record({
      formSlug: SLUG,
      submissionId: id,
      actorId: actor.id,
      action: 'update',
      diff: dto as Record<string, unknown>,
    });
    return saved;
  }

  async softDelete(
    id: string,
    actor: { id: number; roleSlug: string },
  ): Promise<void> {
    this.policy.assertCanDelete(actor);
    await this.repo.softDelete(id);
    await this.audit.record({
      formSlug: SLUG,
      submissionId: id,
      actorId: actor.id,
      action: 'delete',
    });
  }

  async auditLog(id: string) {
    return this.audit.listForSubmission(SLUG, id);
  }
}
