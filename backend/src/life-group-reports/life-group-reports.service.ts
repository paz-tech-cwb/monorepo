import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { LifeGroupReport } from './entities/life-group-report.entity';
import {
  LifeGroupReportResponse,
  pickLifeGroupReportInputColumns,
  toLifeGroupReportResponse,
} from './life-group-report.mapper';
import { User } from '../users/entities/user.entity';
import { CreateLifeGroupReportDto } from './dto/create-life-group-report.dto';
import { UpdateLifeGroupReportDto } from './dto/update-life-group-report.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'life-group-reports';

// Re-exported so existing importers of the response type keep working.
export type { LifeGroupReportResponse };

interface Actor {
  id: number;
}

@Injectable()
export class LifeGroupReportsService {
  constructor(
    @InjectRepository(LifeGroupReport)
    private readonly repo: Repository<LifeGroupReport>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  // The global ClassSerializerInterceptor (excludeAll + excludeExtraneousValues)
  // would collapse a raw LifeGroupReport entity (no @Expose) to `{}`, and its
  // camelCase properties would not match the snake_case wire format anyway.
  // Map explicitly; the controller opts out of the global strategy with
  // @SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false }).
  toResponse(m: LifeGroupReport): LifeGroupReportResponse {
    return toLifeGroupReportResponse(m);
  }

  // A co-leader may carry no leadership role slug (role `member`), so scope
  // alone does not grant access: extend it with the groups where the actor is
  // leader_id or co_leader_id. Mirrors LifeGroupAnalyticsService.
  private async ledGroupIds(actor: Actor): Promise<number[]> {
    const rows = await this.em
      .createQueryBuilder(LifeGroup, 'lg')
      .select('lg.id', 'id')
      .where('lg.leader_id = :actorId OR lg.co_leader_id = :actorId', {
        actorId: actor.id,
      })
      .getRawMany<{ id: number }>();
    return rows.map((r) => Number(r.id));
  }

  async create(
    dto: CreateLifeGroupReportDto,
    actorId: number,
  ): Promise<LifeGroupReportResponse> {
    let entity: LifeGroupReport;
    try {
      entity = await this.repo.save(
        this.repo.create({
          date: dto.date,
          areaId: dto.areaId,
          sectorId: dto.sectorId,
          lifeGroupId: dto.lifeGroupId,
          committedMembers: dto.committedMembers,
          committedMembersPresent: dto.committedMembersPresent,
          ...pickLifeGroupReportInputColumns(dto),
          submittedBy: { id: actorId } as User,
        }),
      );
    } catch (err: unknown) {
      // Partial unique index (life_group_id, date) WHERE deleted_at IS NULL
      // (migration 1796000000000) when present.
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(
          'A report already exists for this life group and date.',
        );
      }
      throw err;
    }
    await this.audit.record({
      formSlug: SLUG,
      submissionId: entity.id,
      actorId,
      action: 'create',
    });
    // Reload so the response carries submitted_by {id, name}.
    return this.toResponse(await this.findEntity(entity.id));
  }

  // Visible reports: groups in the actor's form scope plus groups they lead
  // or co-lead. Unrestricted actors (admin/pastor) see everything. An explicit
  // `life_group_id` filter outside the allowed set is rejected with 403, same
  // as LifeGroupAnalyticsService.
  async list(
    scope: ResolvedScope,
    actor: Actor,
    lifeGroupId?: number,
  ): Promise<LifeGroupReportResponse[]> {
    let allowed: number[] | null = null;
    if (!scope.unrestricted) {
      allowed = Array.from(
        new Set([...scope.lifeGroupIds, ...(await this.ledGroupIds(actor))]),
      );
    }
    if (lifeGroupId !== undefined) {
      if (allowed !== null && !allowed.includes(lifeGroupId)) {
        throw new ForbiddenException(
          'You do not have access to this life group.',
        );
      }
      allowed = [lifeGroupId];
    }

    const qb = this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.submittedBy', 'submittedBy')
      .where('f.deleted_at IS NULL');
    if (allowed !== null) {
      if (allowed.length === 0) {
        qb.andWhere('1=0');
      } else {
        qb.andWhere('f.life_group_id = ANY(:lgs)', { lgs: allowed });
      }
    }
    const rows = await qb.orderBy('f.created_at', 'DESC').getMany();
    return rows.map((r) => this.toResponse(r));
  }

  // scope/actor are optional so internal callers (update) that apply their own
  // policy can load unscoped; the controller's GET :id and :id/audit routes
  // MUST pass both. Out-of-scope reads answer 404 (not 403) so ids cannot be
  // probed. Visibility matches list(): form scope plus groups the actor leads
  // or co-leads. Being the original submitter grants no extra read access.
  private async findEntity(
    id: string,
    scope?: ResolvedScope,
    actor?: Actor,
  ): Promise<LifeGroupReport> {
    const m = await this.repo.findOne({
      where: { id },
      relations: ['submittedBy'],
    });
    if (!m) throw new NotFoundException();
    if (scope && !scope.unrestricted) {
      const allowed =
        scope.lifeGroupIds.includes(m.lifeGroupId) ||
        (!!actor && (await this.ledGroupIds(actor)).includes(m.lifeGroupId));
      if (!allowed) throw new NotFoundException();
    }
    return m;
  }

  async findOne(
    id: string,
    scope?: ResolvedScope,
    actor?: Actor,
  ): Promise<LifeGroupReportResponse> {
    return this.toResponse(await this.findEntity(id, scope, actor));
  }

  async update(
    id: string,
    dto: UpdateLifeGroupReportDto,
    actor: { id: number; roleSlug: string },
  ): Promise<LifeGroupReportResponse> {
    const m = await this.findEntity(id);
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
    return this.toResponse(saved);
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

  async auditLog(id: string, scope: ResolvedScope, actor: Actor) {
    await this.findEntity(id, scope, actor); // same visibility rule as findOne
    const rows = await this.audit.listForSubmission(SLUG, id);
    // Map explicitly (admin-ui AuditLogEntry shape): returning the entities
    // would expose the whole eager-joined actor User (email, phone, ...).
    return rows.map((r) => ({
      id: r.id,
      form_slug: r.formSlug,
      submission_id: r.submissionId,
      action: r.action,
      diff: r.diff,
      created_at: r.createdAt,
      actor: { id: r.actor?.id, name: r.actor?.name },
    }));
  }
}
