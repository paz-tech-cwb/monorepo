import { ForbiddenException } from '@nestjs/common';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';

/**
 * Who may touch a life group's attendance/meeting records. Shared by the
 * attendance and meetings modules so the rule cannot drift.
 *
 * Scope (ScopeGuard/ScopeResolverService, derived from leader_id/co_leader_id
 * rows, so it covers area/sector supervisors and leaders of several groups)
 * is the primary path; the group's own `coLeader`/`leader` id is kept as a
 * fallback so access never depends on scope resolution alone.
 */
export function assertCanAccessLifeGroup(
  lifeGroup: Pick<LifeGroup, 'id' | 'leader' | 'coLeader'>,
  scope: ResolvedScope,
  actor: { id: number },
): void {
  if (scope.unrestricted) return;
  if (scope.lifeGroupIds.includes(lifeGroup.id)) return;
  if (lifeGroup.coLeader?.id === actor.id) return;
  if (lifeGroup.leader?.id === actor.id) return;
  throw new ForbiddenException('You do not have access to this life group.');
}

export interface LifeGroupWriteActor {
  id: number;
  isAdmin?: boolean;
  isPastor?: boolean;
}

/**
 * Who may CREATE/EDIT attendance, reports and extra meetings of a life group:
 * admin, pastor, or the group's own leader/co-leader. Scope supervisors
 * (area/sector leaders, or co-leaders of other groups) reach the group through
 * scope for READ only (decision D11). The server is the authority; mobile
 * mirrors this rule for UX only.
 */
export function canWriteLifeGroup(
  lifeGroup: Pick<LifeGroup, 'leader' | 'coLeader'>,
  actor: LifeGroupWriteActor,
): boolean {
  if (actor.isAdmin || actor.isPastor) return true;
  return (
    lifeGroup.leader?.id === actor.id || lifeGroup.coLeader?.id === actor.id
  );
}

export function assertCanWriteLifeGroup(
  lifeGroup: Pick<LifeGroup, 'leader' | 'coLeader'>,
  actor: LifeGroupWriteActor,
): void {
  if (!canWriteLifeGroup(lifeGroup, actor)) {
    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      code: 'meeting_write_forbidden',
      message:
        "Only this group's leader or co-leader (or an admin/pastor) can record attendance, reports or meetings. You have read-only access.",
    });
  }
}
