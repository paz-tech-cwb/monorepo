import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { MemberJourneyStage } from './entities/member-journey-stage.entity';
import { User } from '../users/entities/user.entity';
import { UpdateMemberStageDto } from './dto/update-member-stage.dto';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { Sector } from '../sectors/entities/sector.entity';
import { Area } from '../areas/entities/area.entity';
import { Role } from '../roles/entities/role.entity';

export const JOURNEY_STAGES = [
  {
    id: 1,
    key: 'salvation',
    label: 'Culto de Celebração e Novo Nascimento',
    optional: false,
  },
  {
    id: 2,
    key: 'registration',
    label: 'Café com Pastor / Tornar-se Membro',
    optional: false,
  },
  { id: 3, key: 'first_courses', label: 'Estação DNA', optional: false },
  {
    id: 4,
    key: 'serving_ministry',
    label: 'Servir em um Ministério',
    optional: false,
  },
  { id: 5, key: 'life_group', label: 'Life Group', optional: false },
  {
    id: 6,
    key: 'new_creature_course',
    label: 'Curso Nova Criatura',
    optional: false,
  },
  {
    id: 7,
    key: 'initial_discipleship_book',
    label: 'Livro de Discipulado do Acompanhamento Inicial',
    optional: false,
  },
  { id: 8, key: 'water_baptism', label: 'Batismo nas Águas', optional: false },
  {
    id: 9,
    key: 'discipler_track',
    label: 'Trilho do Discipulador',
    optional: false,
  },
  {
    id: 10,
    key: 'life_group_leader_track',
    label: 'Trilho do Líder de Life Group',
    optional: true,
  },
] as const;

type JourneyFeedParams = {
  stage_id?: number;
  life_group_id?: number;
  ministry_id?: number;
  sector_id?: number;
  area_id?: number;
  role?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
};

@Injectable()
export class MemberJourneyService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private async ensureStagesExist(memberId: number): Promise<void> {
    for (const stage of JOURNEY_STAGES) {
      const existing = await this.entityManager.findOne(MemberJourneyStage, {
        where: { memberId, stageId: stage.id },
      });
      if (!existing) {
        const newStage = this.entityManager.create(MemberJourneyStage, {
          memberId,
          stageId: stage.id,
          stageKey: stage.key,
          completed: false,
          completedAt: null,
          note: null,
        });
        await this.entityManager.save(newStage);
      }
    }
  }

  buildMemberJourneyResponse(user: User, stages: MemberJourneyStage[]) {
    const orderedStages = JOURNEY_STAGES.map((def) => {
      const stage = stages.find((s) => s.stageId === def.id);
      return {
        stage_id: def.id,
        stage_key: def.key,
        stage_label: def.label,
        optional: def.optional,
        completed: stage?.completed ?? false,
        completed_at: stage?.completedAt ?? null,
        note: stage?.note ?? null,
      };
    });

    const requiredStages = orderedStages.filter((s) => !s.optional);
    const completedRequiredStages = requiredStages.filter((s) => s.completed);
    const completedOptionalStages = orderedStages.filter(
      (s) => s.optional && s.completed,
    );
    const completionPercentage = Math.round(
      (completedRequiredStages.length / requiredStages.length) * 100,
    );
    const nextRequiredStage = requiredStages.find((s) => !s.completed);

    const lastUpdated = stages.reduce((latest, s) => {
      return s.updatedAt > latest ? s.updatedAt : latest;
    }, new Date(0));

    return {
      member_id: user.id,
      member_name: user.name,
      member_email: user.email,
      life_groups:
        user.lifeGroups?.map((lg) => ({ id: lg.id, name: lg.name })) ?? [],
      current_stage_id:
        nextRequiredStage?.stage_id ??
        requiredStages[requiredStages.length - 1].stage_id,
      progress: {
        completion_percentage: completionPercentage,
        completed_required_steps: completedRequiredStages.length,
        total_required_steps: requiredStages.length,
        completed_optional_steps: completedOptionalStages.length,
        total_optional_steps: orderedStages.length - requiredStages.length,
        is_complete: completionPercentage === 100,
      },
      stages: orderedStages,
      last_updated_at: lastUpdated,
    };
  }

  private applyFeedFilters(
    qb: SelectQueryBuilder<MemberJourneyStage>,
    params: JourneyFeedParams,
  ) {
    if (params.stage_id !== undefined) {
      qb = qb.andWhere('mjs.stage_id = :stageId', {
        stageId: params.stage_id,
      });
    }

    if (params.life_group_id !== undefined) {
      qb = qb.andWhere(
        `EXISTS (
          SELECT 1 FROM user_life_groups ulg
          WHERE ulg.user_id = u.id AND ulg.life_group_id = :lifeGroupId
        )`,
        { lifeGroupId: params.life_group_id },
      );
    }

    if (params.ministry_id !== undefined) {
      qb = qb.andWhere(
        `EXISTS (
          SELECT 1 FROM ministry_members mm
          WHERE mm.user_id = u.id AND mm.ministry_id = :ministryId
        )`,
        { ministryId: params.ministry_id },
      );
    }

    if (params.sector_id !== undefined) {
      qb = qb.andWhere('u.sector_id = :sectorId', {
        sectorId: params.sector_id,
      });
    }

    if (params.area_id !== undefined) {
      qb = qb.andWhere(
        `EXISTS (
          SELECT 1 FROM sectors s
          WHERE s.id = u.sector_id AND s.area_id = :areaId
        )`,
        { areaId: params.area_id },
      );
    }

    if (params.role) {
      qb = qb.andWhere(
        `EXISTS (
          SELECT 1 FROM roles r
          WHERE r.id = u.role_id AND r.slug = :role
        )`,
        { role: params.role },
      );
    }

    if (params.from) {
      qb = qb.andWhere('mjs.completed_at >= :from', {
        from: new Date(params.from),
      });
    }

    if (params.to) {
      qb = qb.andWhere('mjs.completed_at <= :to', {
        to: new Date(params.to),
      });
    }

    return qb;
  }

  async getMemberJourney(userId: number) {
    const user = await this.entityManager.findOne(User, {
      where: { id: userId },
      relations: ['lifeGroups'],
    });
    if (!user) {
      throw new NotFoundException(`Member with ID ${userId} not found`);
    }

    await this.ensureStagesExist(userId);

    const stages = await this.entityManager.find(MemberJourneyStage, {
      where: { memberId: userId },
      order: { stageId: 'ASC' },
    });

    return this.buildMemberJourneyResponse(user, stages);
  }

  async getMyJourney(userId: number) {
    return this.getMemberJourney(userId);
  }

  async updateStage(userId: number, dto: UpdateMemberStageDto) {
    const user = await this.entityManager.findOne(User, {
      where: { id: userId },
      relations: ['lifeGroups'],
    });
    if (!user) {
      throw new NotFoundException(`Member with ID ${userId} not found`);
    }

    const stageDef = JOURNEY_STAGES.find((s) => s.id === dto.stage_id);
    if (!stageDef) {
      throw new BadRequestException(`Invalid stage_id: ${dto.stage_id}`);
    }

    let stage = await this.entityManager.findOne(MemberJourneyStage, {
      where: { memberId: userId, stageId: dto.stage_id },
    });

    if (!stage) {
      stage = this.entityManager.create(MemberJourneyStage, {
        memberId: userId,
        stageId: dto.stage_id,
        stageKey: stageDef.key,
      });
    }

    stage.stageKey = stageDef.key;
    stage.completed = dto.completed;
    stage.completedAt = dto.completed
      ? dto.completed_at
        ? new Date(dto.completed_at)
        : new Date()
      : null;
    stage.note = dto.note ?? stage.note ?? null;

    await this.entityManager.save(MemberJourneyStage, stage);

    // Return full member journey
    await this.ensureStagesExist(userId);
    const stages = await this.entityManager.find(MemberJourneyStage, {
      where: { memberId: userId },
      order: { stageId: 'ASC' },
    });
    return this.buildMemberJourneyResponse(user, stages);
  }

  async getStats() {
    try {
      const results = await this.entityManager
        .createQueryBuilder(MemberJourneyStage, 'mjs')
        .select('mjs.stage_id', 'stage_id')
        .addSelect('mjs.stage_key', 'stage_key')
        .addSelect('COUNT(mjs.id)::int', 'count')
        .where('mjs.completed = :completed', { completed: true })
        .groupBy('mjs.stage_id')
        .addGroupBy('mjs.stage_key')
        .getRawMany<{ stage_id: number; stage_key: string; count: number }>();

      return JOURNEY_STAGES.map((def) => {
        const found = results.find((r) => Number(r.stage_id) === def.id);
        return {
          stage_id: def.id,
          stage_key: def.key,
          stage_label: def.label,
          optional: def.optional,
          count: found ? Number(found.count) : 0,
        };
      });
    } catch {
      throw new BadRequestException(
        'An error occurred while retrieving journey stats.',
      );
    }
  }

  async getFilterOptions() {
    try {
      const completedMemberIds = this.entityManager
        .createQueryBuilder(MemberJourneyStage, 'mjs')
        .select('DISTINCT mjs.member_id')
        .where('mjs.completed = :completed', { completed: true });

      const stages = await this.entityManager
        .createQueryBuilder(MemberJourneyStage, 'mjs')
        .select('mjs.stage_id', 'id')
        .addSelect('mjs.stage_key', 'key')
        .addSelect('COUNT(mjs.id)::int', 'count')
        .where('mjs.completed = :completed', { completed: true })
        .groupBy('mjs.stage_id')
        .addGroupBy('mjs.stage_key')
        .getRawMany<{ id: number; key: string; count: number }>();

      const lifeGroups = await this.entityManager
        .createQueryBuilder(LifeGroup, 'lg')
        .innerJoin('user_life_groups', 'ulg', 'ulg.life_group_id = lg.id')
        .where(`ulg.user_id IN (${completedMemberIds.getQuery()})`)
        .setParameters(completedMemberIds.getParameters())
        .select('lg.id', 'id')
        .addSelect('lg.name', 'label')
        .addSelect('COUNT(DISTINCT ulg.user_id)::int', 'count')
        .groupBy('lg.id')
        .addGroupBy('lg.name')
        .orderBy('lg.name', 'ASC')
        .getRawMany<{ id: number; label: string; count: number }>();

      const ministries = await this.entityManager
        .createQueryBuilder(Ministry, 'm')
        .innerJoin('ministry_members', 'mm', 'mm.ministry_id = m.id')
        .where(`mm.user_id IN (${completedMemberIds.getQuery()})`)
        .setParameters(completedMemberIds.getParameters())
        .select('m.id', 'id')
        .addSelect('m.name', 'label')
        .addSelect('COUNT(DISTINCT mm.user_id)::int', 'count')
        .groupBy('m.id')
        .addGroupBy('m.name')
        .orderBy('m.name', 'ASC')
        .getRawMany<{ id: number; label: string; count: number }>();

      const sectors = await this.entityManager
        .createQueryBuilder(Sector, 's')
        .innerJoin(User, 'u', 'u.sector_id = s.id')
        .where(`u.id IN (${completedMemberIds.getQuery()})`)
        .setParameters(completedMemberIds.getParameters())
        .select('s.id', 'id')
        .addSelect('s.name', 'label')
        .addSelect('COUNT(DISTINCT u.id)::int', 'count')
        .groupBy('s.id')
        .addGroupBy('s.name')
        .orderBy('s.name', 'ASC')
        .getRawMany<{ id: number; label: string; count: number }>();

      const areas = await this.entityManager
        .createQueryBuilder(Area, 'a')
        .innerJoin(Sector, 's', 's.area_id = a.id')
        .innerJoin(User, 'u', 'u.sector_id = s.id')
        .where(`u.id IN (${completedMemberIds.getQuery()})`)
        .setParameters(completedMemberIds.getParameters())
        .select('a.id', 'id')
        .addSelect('a.name', 'label')
        .addSelect('COUNT(DISTINCT u.id)::int', 'count')
        .groupBy('a.id')
        .addGroupBy('a.name')
        .orderBy('a.name', 'ASC')
        .getRawMany<{ id: number; label: string; count: number }>();

      const roles = await this.entityManager
        .createQueryBuilder(Role, 'r')
        .innerJoin(User, 'u', 'u.role_id = r.id')
        .where(`u.id IN (${completedMemberIds.getQuery()})`)
        .setParameters(completedMemberIds.getParameters())
        .select('r.slug', 'value')
        .addSelect('r.name', 'label')
        .addSelect('COUNT(DISTINCT u.id)::int', 'count')
        .groupBy('r.slug')
        .addGroupBy('r.name')
        .orderBy('r.name', 'ASC')
        .getRawMany<{ value: string; label: string; count: number }>();

      return {
        stages: JOURNEY_STAGES.map((def) => {
          const found = stages.find((s) => Number(s.id) === def.id);
          return {
            id: def.id,
            value: String(def.id),
            label: def.label,
            count: found ? Number(found.count) : 0,
          };
        }).filter((option) => option.count > 0),
        life_groups: lifeGroups.map((option) => ({
          ...option,
          id: Number(option.id),
          value: String(option.id),
          count: Number(option.count),
        })),
        ministries: ministries.map((option) => ({
          ...option,
          id: Number(option.id),
          value: String(option.id),
          count: Number(option.count),
        })),
        sectors: sectors.map((option) => ({
          ...option,
          id: Number(option.id),
          value: String(option.id),
          count: Number(option.count),
        })),
        areas: areas.map((option) => ({
          ...option,
          id: Number(option.id),
          value: String(option.id),
          count: Number(option.count),
        })),
        roles: roles.map((option) => ({
          ...option,
          count: Number(option.count),
        })),
      };
    } catch {
      throw new BadRequestException(
        'An error occurred while retrieving journey filter options.',
      );
    }
  }

  async getFeed(params: JourneyFeedParams) {
    try {
      const page = params.page ?? 1;
      const perPage = params.per_page ?? 20;
      const skip = (page - 1) * perPage;

      let qb = this.entityManager
        .createQueryBuilder(MemberJourneyStage, 'mjs')
        .innerJoin(User, 'u', 'u.id = mjs.member_id')
        .select([
          'mjs.id AS id',
          'mjs.member_id AS member_id',
          'u.name AS member_name',
          'mjs.stage_id AS stage_id',
          'mjs.stage_key AS stage_key',
          'mjs.completed_at AS completed_at',
          'mjs.note AS note',
        ])
        .where('mjs.completed = :completed', { completed: true });

      qb = this.applyFeedFilters(qb, params);

      const total = await qb.getCount();

      const rawActivities = await qb
        .orderBy('mjs.completed_at', 'DESC')
        .skip(skip)
        .take(perPage)
        .getRawMany<{
          id: number;
          member_id: number;
          member_name: string;
          stage_id: number;
          stage_key: string;
          completed_at: Date | null;
          note: string | null;
        }>();

      const activities = rawActivities.map((row) => {
        const stageDef = JOURNEY_STAGES.find(
          (s) => s.id === Number(row.stage_id),
        );
        return {
          id: row.id,
          member_id: row.member_id,
          member_name: row.member_name,
          stage_id: Number(row.stage_id),
          stage_key: stageDef?.key ?? row.stage_key,
          stage_label: stageDef?.label ?? row.stage_key,
          optional: stageDef?.optional ?? false,
          completed_at: row.completed_at,
          note: row.note ?? null,
        };
      });

      return {
        activities,
        total,
        page,
        per_page: perPage,
      };
    } catch {
      throw new BadRequestException(
        'An error occurred while retrieving the journey feed.',
      );
    }
  }
}
