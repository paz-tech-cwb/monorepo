import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { LifeGroupReport } from './entities/life-group-report.entity';
import { User } from '../users/entities/user.entity';
import { CreateLifeGroupReportDto } from './dto/create-life-group-report.dto';
import { UpdateLifeGroupReportDto } from './dto/update-life-group-report.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'life-group-reports';

interface Actor {
  id: number;
}

export interface LifeGroupReportResponse {
  id: string;
  date: string;
  area_id: number;
  sector_id: number;
  life_group_id: number;
  committed_members: number;
  committed_members_present: number;
  kids_0_to_11: number;
  guests: number;
  mdas: number;
  offering: string;
  committed_at_tadel: number;
  committed_at_culto: number;
  leader_attended: string[];
  disciples_count: number;
  disciples_discipled_this_week: number;
  pastoring_activity_type: string[];
  pastoring_activity_other: string | null;
  training_activity_type: string[];
  training_activity_other: string | null;
  submitted_by: { id: number; name: string } | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
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
    return {
      id: m.id,
      date: m.date,
      area_id: m.areaId,
      sector_id: m.sectorId,
      life_group_id: m.lifeGroupId,
      committed_members: m.committedMembers,
      committed_members_present: m.committedMembersPresent,
      kids_0_to_11: m.kids0To11,
      guests: m.guests,
      mdas: m.mdas,
      offering: m.offering,
      committed_at_tadel: m.committedAtTadel,
      committed_at_culto: m.committedAtCulto,
      leader_attended: m.leaderAttended ?? [],
      disciples_count: m.disciplesCount,
      disciples_discipled_this_week: m.disciplesDiscipledThisWeek,
      pastoring_activity_type: m.pastoringActivityType ?? [],
      pastoring_activity_other: m.pastoringActivityOther ?? null,
      training_activity_type: m.trainingActivityType ?? [],
      training_activity_other: m.trainingActivityOther ?? null,
      submitted_by: m.submittedBy
        ? { id: m.submittedBy.id, name: m.submittedBy.name }
        : null,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
      deleted_at: m.deletedAt ?? null,
    };
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
        trainingActivityType: dto.trainingActivityType,
        trainingActivityOther: dto.trainingActivityOther ?? null,
        submittedBy: { id: actorId } as User,
      }),
    );
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
  // probed. Mirrors CasaDePazReportsService.findEntity.
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
        (!!actor &&
          (m.submittedBy?.id === actor.id ||
            (await this.ledGroupIds(actor)).includes(m.lifeGroupId)));
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
    return this.audit.listForSubmission(SLUG, id);
  }
}
