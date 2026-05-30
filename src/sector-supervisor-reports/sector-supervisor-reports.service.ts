import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectorSupervisorReport } from './entities/sector-supervisor-report.entity';
import { User } from '../users/entities/user.entity';
import { CreateSectorSupervisorReportDto } from './dto/create-sector-supervisor-report.dto';
import { UpdateSectorSupervisorReportDto } from './dto/update-sector-supervisor-report.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'sector-supervisor-reports';

@Injectable()
export class SectorSupervisorReportsService {
  constructor(
    @InjectRepository(SectorSupervisorReport) private readonly repo: Repository<SectorSupervisorReport>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(dto: CreateSectorSupervisorReportDto, actorId: number): Promise<SectorSupervisorReport> {
    const entity = await this.repo.save(
      this.repo.create({
        date: dto.date,
        sectorId: dto.sectorId,
        areaId: dto.areaId ?? null,
        lifeGroupsVisited: dto.lifeGroupsVisited,
        leadersPastored: dto.leadersPastored,
        meetingsHeld: dto.meetingsHeld,
        trainingsConducted: dto.trainingsConducted,
        multiplicationCandidates: dto.multiplicationCandidates,
        notes: dto.notes ?? null,
        submittedBy: { id: actorId } as User,
      }),
    );
    await this.audit.record({ formSlug: SLUG, submissionId: entity.id, actorId, action: 'create' });
    return entity;
  }

  async list(scope: ResolvedScope): Promise<SectorSupervisorReport[]> {
    const qb = this.repo.createQueryBuilder('f').where('f.deleted_at IS NULL');
    if (!scope.unrestricted) {
      qb.andWhere('1=0');
    }
    return qb.orderBy('f.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<SectorSupervisorReport> {
    const m = await this.repo.findOne({ where: { id }, relations: ['submittedBy'] });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(id: string, dto: UpdateSectorSupervisorReportDto, actor: { id: number; roleSlug: string }): Promise<SectorSupervisorReport> {
    const m = await this.findOne(id);
    this.policy.assertCanEdit(actor, { submittedById: m.submittedBy.id, createdAt: m.createdAt, deletedAt: m.deletedAt });
    Object.assign(m, dto);
    const saved = await this.repo.save(m);
    await this.audit.record({ formSlug: SLUG, submissionId: id, actorId: actor.id, action: 'update', diff: dto as Record<string, unknown> });
    return saved;
  }

  async softDelete(id: string, actor: { id: number; roleSlug: string }): Promise<void> {
    this.policy.assertCanDelete(actor);
    await this.repo.softDelete(id);
    await this.audit.record({ formSlug: SLUG, submissionId: id, actorId: actor.id, action: 'delete' });
  }

  async auditLog(id: string) {
    return this.audit.listForSubmission(SLUG, id);
  }
}
