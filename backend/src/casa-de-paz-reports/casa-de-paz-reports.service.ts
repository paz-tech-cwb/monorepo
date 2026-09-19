import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CasaDePazReport } from './entities/casa-de-paz-report.entity';
import { User } from '../users/entities/user.entity';
import { CreateCasaDePazReportDto } from './dto/create-casa-de-paz-report.dto';
import { UpdateCasaDePazReportDto } from './dto/update-casa-de-paz-report.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'casa-de-paz-reports';

@Injectable()
export class CasaDePazReportsService {
  constructor(
    @InjectRepository(CasaDePazReport)
    private readonly repo: Repository<CasaDePazReport>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(
    dto: CreateCasaDePazReportDto,
    actorId: number,
  ): Promise<CasaDePazReport> {
    const entity = await this.repo.save(
      this.repo.create({
        date: dto.date,
        facilitator: dto.facilitator,
        sectorId: dto.sectorId,
        adults: dto.adults,
        kids: dto.kids ?? 0,
        guests: dto.guests ?? 0,
        conversions: dto.conversions ?? 0,
        weekNumber: dto.weekNumber ?? null,
        meetingDay: dto.meetingDay ?? null,
        meetingTime: dto.meetingTime ?? null,
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

  // This entity has no life_group_id to scope by, so unlike
  // LifeGroupReportsService, "restricted" actors are scoped to their own
  // submissions (submitted_by_id = actor.id) rather than a set of
  // life-group ids. Unrestricted actors (admin/pastor, per
  // ScopeResolverService) see everything.
  async list(
    scope: ResolvedScope,
    actor: { id: number },
  ): Promise<CasaDePazReport[]> {
    const qb = this.repo.createQueryBuilder('f').where('f.deleted_at IS NULL');
    if (!scope.unrestricted) {
      qb.andWhere('f.submitted_by_id = :actorId', { actorId: actor.id });
    }
    return qb.orderBy('f.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<CasaDePazReport> {
    const m = await this.repo.findOne({
      where: { id },
      relations: ['submittedBy'],
    });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(
    id: string,
    dto: UpdateCasaDePazReportDto,
    actor: { id: number; roleSlug: string },
  ): Promise<CasaDePazReport> {
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
