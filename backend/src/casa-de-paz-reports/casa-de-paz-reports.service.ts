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

export interface CasaDePazReportResponse {
  id: string;
  date: string;
  facilitator: string;
  sector_id: number;
  adults: number;
  kids: number;
  guests: number;
  conversions: number;
  meeting_day: string | null;
  meeting_time: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CasaDePazReportsService {
  constructor(
    @InjectRepository(CasaDePazReport)
    private readonly repo: Repository<CasaDePazReport>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  // The global ClassSerializerInterceptor defaults to excludeAll +
  // excludeExtraneousValues, which would silently serialize a raw
  // CasaDePazReport entity (no @Expose() decorators) down to `{}`, and even
  // with @SerializeOptions(exposeAll) on the controller the entity's
  // camelCase properties wouldn't match the snake_case wire format every
  // other endpoint uses — map to a plain snake_case object explicitly
  // instead, same pattern as AreasService/SectorsService.
  private toResponse(m: CasaDePazReport): CasaDePazReportResponse {
    return {
      id: m.id,
      date: m.date,
      facilitator: m.facilitator,
      sector_id: m.sectorId,
      adults: m.adults,
      kids: m.kids,
      guests: m.guests,
      conversions: m.conversions,
      meeting_day: m.meetingDay,
      meeting_time: m.meetingTime,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    };
  }

  async create(
    dto: CreateCasaDePazReportDto,
    actorId: number,
  ): Promise<CasaDePazReportResponse> {
    const entity = await this.repo.save(
      this.repo.create({
        date: dto.date,
        facilitator: dto.facilitator,
        sectorId: dto.sectorId,
        adults: dto.adults,
        kids: dto.kids ?? 0,
        guests: dto.guests ?? 0,
        conversions: dto.conversions ?? 0,
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
    return this.toResponse(entity);
  }

  // This entity has no life_group_id to scope by, so area_leader/
  // sector_leader visibility is derived from scope.sectorIds (the sectors
  // within their area, or their own sector) matching the report's sector_id.
  // Actors with no sector scope (life_group_leader, member) fall back to
  // seeing only their own submissions. Unrestricted actors (admin/pastor)
  // see everything.
  async list(
    scope: ResolvedScope,
    actor: { id: number },
  ): Promise<CasaDePazReportResponse[]> {
    const qb = this.repo.createQueryBuilder('f').where('f.deleted_at IS NULL');
    if (!scope.unrestricted) {
      if (scope.sectorIds.length > 0) {
        qb.andWhere('f.sector_id IN (:...sectorIds)', {
          sectorIds: scope.sectorIds,
        });
      } else {
        qb.andWhere('f.submitted_by_id = :actorId', { actorId: actor.id });
      }
    }
    const rows = await qb.orderBy('f.created_at', 'DESC').getMany();
    return rows.map((r) => this.toResponse(r));
  }

  // scope/actor are optional so internal callers (update/softDelete) that
  // already apply their own policy check can load unscoped; the controller's
  // GET :id and :id/audit routes MUST always pass both, otherwise any
  // authenticated user could read another actor's submission/audit trail by
  // guessing its id — the same restriction list() already applies.
  private async findEntity(
    id: string,
    scope?: ResolvedScope,
    actor?: { id: number },
  ): Promise<CasaDePazReport> {
    const m = await this.repo.findOne({
      where: { id },
      relations: ['submittedBy'],
    });
    if (!m) throw new NotFoundException();
    if (scope && !scope.unrestricted) {
      const inSectorScope = scope.sectorIds.includes(m.sectorId);
      if (!inSectorScope && (!actor || m.submittedBy.id !== actor.id))
        throw new NotFoundException();
    }
    return m;
  }

  async findOne(
    id: string,
    scope?: ResolvedScope,
    actor?: { id: number },
  ): Promise<CasaDePazReportResponse> {
    return this.toResponse(await this.findEntity(id, scope, actor));
  }

  async update(
    id: string,
    dto: UpdateCasaDePazReportDto,
    actor: { id: number; roleSlug: string },
    scope?: ResolvedScope,
  ): Promise<CasaDePazReportResponse> {
    const m = await this.findEntity(id);
    const managesSector =
      !!scope && (scope.unrestricted || scope.sectorIds.includes(m.sectorId));
    if (!managesSector) {
      this.policy.assertCanEdit(actor, {
        submittedById: m.submittedBy.id,
        createdAt: m.createdAt,
        deletedAt: m.deletedAt,
      });
    }
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
    scope?: ResolvedScope,
  ): Promise<void> {
    const m = await this.findEntity(id);
    const managesSector =
      !!scope && (scope.unrestricted || scope.sectorIds.includes(m.sectorId));
    if (!managesSector) {
      this.policy.assertCanDelete(actor);
    }
    await this.repo.softDelete(id);
    await this.audit.record({
      formSlug: SLUG,
      submissionId: id,
      actorId: actor.id,
      action: 'delete',
    });
  }

  async auditLog(id: string, scope: ResolvedScope, actor: { id: number }) {
    await this.findOne(id, scope, actor); // enforces the same visibility rule as findOne/list
    return this.audit.listForSubmission(SLUG, id);
  }
}
