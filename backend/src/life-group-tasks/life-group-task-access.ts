import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';

export interface TaskActor {
  id: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Same rule as LifeGroupAttendanceService.assertCanAccess: scope covers the
 * group, or the actor is the group's own leader/co-leader (a co-leader has no
 * dedicated role slug, so scope alone is not enough).
 */
export function assertCanAccessLifeGroup(
  lifeGroup: LifeGroup,
  scope: ResolvedScope,
  actor: TaskActor,
): void {
  if (scope.unrestricted) return;
  if (scope.lifeGroupIds.includes(lifeGroup.id)) return;
  if (lifeGroup.coLeader?.id === actor.id) return;
  if (lifeGroup.leader?.id === actor.id) return;
  throw new ForbiddenException('You do not have access to this life group.');
}

export async function findLifeGroupOrThrow(
  em: EntityManager,
  lifeGroupId: number,
): Promise<LifeGroup> {
  const lifeGroup = await em.findOne(LifeGroup, {
    where: { id: lifeGroupId },
    relations: ['leader', 'coLeader', 'users'],
  });
  if (!lifeGroup) {
    throw new NotFoundException(`Life group with ID ${lifeGroupId} not found`);
  }
  return lifeGroup;
}

/** Validates a plain `YYYY-MM-DD` calendar date (future dates are allowed). */
export function assertValidDateString(value: string, field = 'date'): void {
  if (!DATE_RE.test(value)) {
    throw new BadRequestException(`${field} must be in YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`${field} is not a valid calendar date.`);
  }
}
