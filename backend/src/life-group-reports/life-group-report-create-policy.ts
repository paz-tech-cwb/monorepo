import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  dateKeyOf,
  zonedParts,
} from '../life-group-attendance/meeting-day.util';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { CreateLifeGroupReportDto } from './dto/create-life-group-report.dto';

/**
 * Who may create a weekly report for which life group, and which area/sector
 * it belongs to. Used by the controller before LifeGroupReportsService.create.
 *
 * Authorization is scope-based (no @Roles on POST), so a `member`-role
 * co-leader works:
 *  - admin/pastor (unrestricted scope): any existing group;
 *  - everyone else: the actor must be the group's own leader_id/co_leader_id.
 *    Area/sector supervisors get read-only visibility through scope but may
 *    NOT create reports for groups they do not lead (a supervisor who also
 *    leads/co-leads a group can report only for that group).
 * `area_id`/`sector_id` sent by the client are never trusted: they are
 * derived from the group's sector -> area.
 */
@Injectable()
export class LifeGroupReportCreatePolicy {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async authorizeAndDerive(
    dto: CreateLifeGroupReportDto,
    scope: ResolvedScope,
    actor: { id: number },
  ): Promise<CreateLifeGroupReportDto> {
    assertDateNotInFuture(dto.date);

    const group = await this.em.findOne(LifeGroup, {
      where: { id: dto.lifeGroupId },
      relations: { leader: true, coLeader: true, sector: { area: true } },
      select: {
        id: true,
        leader: { id: true },
        coLeader: { id: true },
        sector: { id: true, area: { id: true } },
      },
    });
    if (!group) throw new NotFoundException('Life group not found.');

    const allowed =
      scope.unrestricted ||
      group.leader?.id === actor.id ||
      group.coLeader?.id === actor.id;
    if (!allowed) {
      throw new ForbiddenException(
        'You do not have access to this life group.',
      );
    }

    const sectorId = group.sector?.id;
    const areaId = group.sector?.area?.id;
    if (sectorId === undefined || areaId === undefined) {
      throw new UnprocessableEntityException(
        'This life group has no sector/area assigned; ask an administrator to set them before submitting a report.',
      );
    }
    return { ...dto, areaId, sectorId };
  }
}

// Calendar day in the church timezone (America/Sao_Paulo), the same zone
// attendance meeting dates are entered in. `date` may be a full ISO string;
// its first 10 chars are the calendar date the client meant.
export function assertDateNotInFuture(date: string, now = new Date()): void {
  const today = dateKeyOf(zonedParts(now));
  if (date.slice(0, 10) > today) {
    throw new BadRequestException('date cannot be in the future.');
  }
}
