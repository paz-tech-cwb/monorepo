import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ScopeResolverService } from '../forms-core/services/scope-resolver.service';
import { User } from './entities/user.entity';

type LeadProgressRow = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  picture: string | null;
  created_at: Date;
  total_steps: string | null;
  completed_steps: string | null;
};

@Injectable()
export class LeadsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly scopeResolverService: ScopeResolverService,
  ) {}

  /**
   * Active 'lead' role users, ordered oldest-first, with their progress
   * against the 'become_member' journey track. Single grouped SQL query
   * (rather than N+1 calls into JourneyProgressService) since this powers a
   * list view. Results are narrowed to the acting user's scope, mirroring
   * the scoping already applied to member-facing reads elsewhere (see
   * JourneyProgressService.getForMemberScoped / ScopeResolverService).
   * Leads have no sector/life-group assignment yet, so non-admin/pastor
   * leadership roles will typically see an empty list until leads gain
   * that assignment.
   */
  async findLeads(actor: User) {
    const scope = await this.scopeResolverService.resolve(actor.id);

    const scopeConditions: string[] = [];
    const params: unknown[] = [];
    if (!scope.unrestricted) {
      if (scope.areaIds.length) {
        params.push(scope.areaIds);
        scopeConditions.push(`sector."area_id" = ANY($${params.length})`);
      }
      if (scope.sectorIds.length) {
        params.push(scope.sectorIds);
        scopeConditions.push(`u."sector_id" = ANY($${params.length})`);
      }
      if (scope.lifeGroupIds.length) {
        params.push(scope.lifeGroupIds);
        scopeConditions.push(`ulg."life_group_id" = ANY($${params.length})`);
      }

      if (scopeConditions.length === 0) return [];
    }

    const scopeWhereClause = scope.unrestricted
      ? ''
      : `AND (${scopeConditions.join(' OR ')})`;

    const rows: LeadProgressRow[] = await this.entityManager.query(
      `
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."phone_number" AS "phone",
        u."email" AS "email",
        u."picture" AS "picture",
        u."created_at" AS "created_at",
        COUNT(jts."id") AS "total_steps",
        COUNT(mjsp."id") AS "completed_steps"
      FROM "users" u
      JOIN "roles" r ON r."id" = u."role_id" AND r."slug" = 'lead'
      LEFT JOIN "sectors" sector ON sector."id" = u."sector_id"
      LEFT JOIN "user_life_groups" ulg ON ulg."user_id" = u."id"
      LEFT JOIN "journey_tracks" jt ON jt."key" = 'become_member'
      LEFT JOIN "journey_track_steps" jts
        ON jts."track_id" = jt."id" AND jts."type" != 'informational'
      LEFT JOIN "member_journey_step_progress" mjsp
        ON mjsp."step_id" = jts."id" AND mjsp."member_id" = u."id"
      WHERE u."status" = 'active'
      ${scopeWhereClause}
      GROUP BY u."id"
      ORDER BY u."created_at" ASC
    `,
      params,
    );

    const now = Date.now();

    return rows.map((row) => {
      const totalSteps = Number(row.total_steps ?? 0);
      const completedSteps = Number(row.completed_steps ?? 0);
      const progressPercentage =
        totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      const createdAt = new Date(row.created_at);
      const daysAsLead = Math.max(
        0,
        Math.floor((now - createdAt.getTime()) / (24 * 60 * 60 * 1000)),
      );

      return {
        id: row.id,
        name: row.name,
        phone: row.phone ?? null,
        email: row.email ?? null,
        picture: row.picture ?? null,
        created_at: createdAt,
        days_as_lead: daysAsLead,
        progress: {
          completed_steps: completedSteps,
          total_steps: totalSteps,
          progress_percentage: progressPercentage,
        },
      };
    });
  }
}
