import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaSupervisorReport } from './entities/area-supervisor-report.entity';
import { User } from '../users/entities/user.entity';
import { CreateAreaSupervisorReportDto } from './dto/create-area-supervisor-report.dto';
import { UpdateAreaSupervisorReportDto } from './dto/update-area-supervisor-report.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'area-supervisor-reports';

@Injectable()
export class AreaSupervisorReportsService {
  constructor(
    @InjectRepository(AreaSupervisorReport)
    private readonly repo: Repository<AreaSupervisorReport>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(
    dto: CreateAreaSupervisorReportDto,
    actorId: number,
  ): Promise<AreaSupervisorReport> {
    const entity = await this.repo.save(
      this.repo.create({
        date: dto.date,
        areaId: dto.areaId,
        sectorsVisited: dto.sectorsVisited ?? [],
        sectorLeadersPastored: dto.sectorLeadersPastored ?? [],
        multiplicationsInProgress: dto.multiplicationsInProgress ?? null,
        lifeGroupsCount: dto.lifeGroupsCount,
        lifeGroupsSupervised: dto.lifeGroupsSupervised,
        lifeGroupObservations: dto.lifeGroupObservations ?? [],
        notes: dto.notes ?? null,
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

  async list(scope: ResolvedScope): Promise<AreaSupervisorReport[]> {
    const qb = this.repo.createQueryBuilder('f').where('f.deleted_at IS NULL');
    if (!scope.unrestricted) {
      qb.andWhere('1=0');
    }
    return qb.orderBy('f.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<AreaSupervisorReport> {
    const m = await this.repo.findOne({
      where: { id },
      relations: ['submittedBy'],
    });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(
    id: string,
    dto: UpdateAreaSupervisorReportDto,
    actor: { id: number; roleSlug: string },
  ): Promise<AreaSupervisorReport> {
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
