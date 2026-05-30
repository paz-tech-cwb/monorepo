import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifeGroupReport } from './entities/life-group-report.entity';
import { User } from '../users/entities/user.entity';
import { CreateLifeGroupReportDto } from './dto/create-life-group-report.dto';
import { UpdateLifeGroupReportDto } from './dto/update-life-group-report.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'life-group-reports';

@Injectable()
export class LifeGroupReportsService {
  constructor(
    @InjectRepository(LifeGroupReport) private readonly repo: Repository<LifeGroupReport>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(dto: CreateLifeGroupReportDto, actorId: number): Promise<LifeGroupReport> {
    const entity = await this.repo.save(
      this.repo.create({
        date: dto.date,
        areaId: dto.areaId,
        sectorId: dto.sectorId,
        lifeGroupId: dto.lifeGroupId,
        committedMembers: dto.committedMembers,
        committedMembersPresent: dto.committedMembersPresent,
        kids0To11: dto.kids0To11,
        guests: dto.guests,
        mdas: dto.mdas,
        offering: dto.offering,
        committedAtTadel: dto.committedAtTadel,
        committedAtCulto: dto.committedAtCulto,
        leaderAttended: dto.leaderAttended,
        disciplesCount: dto.disciplesCount,
        disciplesDiscipledThisWeek: dto.disciplesDiscipledThisWeek,
        pastoringActivityType: dto.pastoringActivityType,
        pastoringActivityOther: dto.pastoringActivityOther ?? null,
        pastoringActivityObjective: dto.pastoringActivityObjective ?? null,
        trainingActivityType: dto.trainingActivityType,
        trainingActivityOther: dto.trainingActivityOther ?? null,
        submittedBy: { id: actorId } as User,
      }),
    );
    await this.audit.record({ formSlug: SLUG, submissionId: entity.id, actorId, action: 'create' });
    return entity;
  }

  async list(scope: ResolvedScope): Promise<LifeGroupReport[]> {
    const qb = this.repo.createQueryBuilder('f').where('f.deleted_at IS NULL');
    if (!scope.unrestricted && scope.lifeGroupIds.length > 0) {
      qb.andWhere('f.life_group_id = ANY(:lgs)', { lgs: scope.lifeGroupIds });
    } else if (!scope.unrestricted) {
      qb.andWhere('1=0');
    }
    return qb.orderBy('f.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<LifeGroupReport> {
    const m = await this.repo.findOne({ where: { id }, relations: ['submittedBy'] });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(id: string, dto: UpdateLifeGroupReportDto, actor: { id: number; roleSlug: string }): Promise<LifeGroupReport> {
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
