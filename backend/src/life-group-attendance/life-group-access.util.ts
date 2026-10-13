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
