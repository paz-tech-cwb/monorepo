import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CasaDePazReport } from './entities/casa-de-paz-report.entity';
import { CasaDePazReportGuest } from './entities/casa-de-paz-report-guest.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateCasaDePazReportDto } from './dto/create-casa-de-paz-report.dto';
import { CasaDePazReportGuestDto } from './dto/casa-de-paz-report-guest.dto';
import { UpdateCasaDePazReportDto } from './dto/update-casa-de-paz-report.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { GuestOriginsService } from '../guest-origins/guest-origins.service';

const SLUG = 'casa-de-paz-reports';

export interface CasaDePazReportGuestResponse {
  id: string;
  name: string;
  email: string;
  birth_date: string;
  whatsapp: string | null;
}

export interface CasaDePazReportResponse {
  id: string;
  date: string;
  facilitator: string;
  sector_id: number;
  casa_de_paz_id: string;
  kids: number;
  guests: CasaDePazReportGuestResponse[];
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
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
    private readonly guestOriginsService: GuestOriginsService,
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
      casa_de_paz_id: m.casaDePazId,
      kids: m.kids,
      guests: (m.guests ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        email: g.email,
        birth_date: g.birthDate,
        whatsapp: g.whatsapp,
      })),
      conversions: m.conversions,
      meeting_day: m.meetingDay,
      meeting_time: m.meetingTime,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    };
  }

  // Finds an existing User by (lowercased) email, matching form-guests
  // .service.ts's lookup-for-forms pattern, or creates a new `guest`-role
  // User from the guest-list entry. Then links a guest_origins row (no-op
  // if one already exists, e.g. a returning guest's second visit) and
  // returns the user id to attach to the CasaDePazReportGuest row.
  private async resolveGuestUser(
    entry: CasaDePazReportGuestDto,
    casaDePazId: string,
    manager: EntityManager,
  ): Promise<number> {
    const email = entry.email.trim().toLowerCase();
    let user = await manager.findOne(User, { where: { email } });
    if (!user) {
      const guestRole = await manager.findOne(Role, {
        where: { slug: 'guest' },
      });
      user = manager.create(User, {
        name: entry.name,
        email,
        phoneNumber: entry.whatsapp ?? null,
        birthDate: new Date(entry.birthDate),
        role: guestRole ?? undefined,
        status: 'active',
      });
      user = await manager.save(User, user);
    }
    await this.guestOriginsService.ensureForUser(user.id, {
      originType: 'casa_de_paz',
      casaDePazId,
    });
    return user.id;
  }

  private async saveGuests(
    reportId: string,
    casaDePazId: string,
    entries: CasaDePazReportGuestDto[],
    manager: EntityManager,
  ): Promise<void> {
    for (const entry of entries) {
      const userId = await this.resolveGuestUser(entry, casaDePazId, manager);
      await manager.save(
        CasaDePazReportGuest,
        manager.create(CasaDePazReportGuest, {
          reportId,
          userId,
          name: entry.name,
          email: entry.email.trim().toLowerCase(),
          birthDate: entry.birthDate,
          whatsapp: entry.whatsapp ?? null,
        }),
      );
    }
  }

  async create(
    dto: CreateCasaDePazReportDto,
    actorId: number,
  ): Promise<CasaDePazReportResponse> {
    const savedId = await this.em.transaction(async (manager) => {
      const report = await manager.save(
        CasaDePazReport,
        manager.create(CasaDePazReport, {
          date: dto.date,
          facilitator: dto.facilitator,
          sectorId: dto.sectorId,
          casaDePazId: dto.casaDePazId,
          kids: dto.kids ?? 0,
          conversions: dto.conversions ?? 0,
          meetingDay: dto.meetingDay ?? null,
          meetingTime: dto.meetingTime ?? null,
          submittedBy: { id: actorId } as User,
        }),
      );
      if (dto.guests?.length) {
        await this.saveGuests(report.id, dto.casaDePazId, dto.guests, manager);
      }
      return report.id;
    });

    await this.audit.record({
      formSlug: SLUG,
      submissionId: savedId,
      actorId,
      action: 'create',
    });
    return this.findOne(savedId);
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
    const qb = this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.guests', 'guests')
      .where('f.deleted_at IS NULL');
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
      relations: ['submittedBy', 'guests'],
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

    // Explicit scalar assignment only — `dto.guests`, when present, is an
    // array of plain objects (not CasaDePazReportGuest entities), so a
    // blind Object.assign(m, dto) would corrupt the `guests` relation.
    if (dto.date !== undefined) m.date = dto.date;
    if (dto.facilitator !== undefined) m.facilitator = dto.facilitator;
    if (dto.sectorId !== undefined) m.sectorId = dto.sectorId;
    if (dto.casaDePazId !== undefined) m.casaDePazId = dto.casaDePazId;
    if (dto.kids !== undefined) m.kids = dto.kids;
    if (dto.conversions !== undefined) m.conversions = dto.conversions;
    if (dto.meetingDay !== undefined) m.meetingDay = dto.meetingDay ?? null;
    if (dto.meetingTime !== undefined) m.meetingTime = dto.meetingTime ?? null;

    const savedId = await this.em.transaction(async (manager) => {
      const saved = await manager.save(CasaDePazReport, m);
      if (dto.guests !== undefined) {
        // Re-create the guest list — the created User/guest_origins records
        // persist regardless of report edits, only the join rows for this
        // report are replaced.
        await manager.delete(CasaDePazReportGuest, { reportId: saved.id });
        if (dto.guests.length) {
          await this.saveGuests(
            saved.id,
            dto.casaDePazId ?? saved.casaDePazId,
            dto.guests,
            manager,
          );
        }
      }
      return saved.id;
    });

    await this.audit.record({
      formSlug: SLUG,
      submissionId: id,
      actorId: actor.id,
      action: 'update',
      diff: dto as Record<string, unknown>,
    });
    return this.findOne(savedId);
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
