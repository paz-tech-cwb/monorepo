import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { MemberJourneyStage } from './entities/member-journey-stage.entity';
import { User } from '../users/entities/user.entity';
import { UpdateMemberStageDto } from './dto/update-member-stage.dto';

const JOURNEY_STAGES = [
  { id: 1, key: 'salvation', label: 'Salvação' },
  { id: 2, key: 'registration', label: 'Cadastro' },
  { id: 3, key: 'first_courses', label: 'Primeiros Cursos' },
  { id: 4, key: 'discovery', label: 'Evento de Descoberta' },
  { id: 5, key: 'life_group', label: 'Life Group' },
  { id: 6, key: 'discipleship', label: 'Discipulado' },
  { id: 7, key: 'water_baptism', label: 'Batismo nas Águas' },
  { id: 8, key: 'disciple_maker', label: 'Fazedor de Discípulos' },
] as const;

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

  private buildMemberJourneyResponse(user: User, stages: MemberJourneyStage[]) {
    const orderedStages = JOURNEY_STAGES.map((def) => {
      const stage = stages.find((s) => s.stageId === def.id);
      return {
        stage_id: def.id,
        stage_key: def.key,
        completed: stage?.completed ?? false,
        completed_at: stage?.completedAt ?? null,
        note: stage?.note ?? null,
      };
    });

    const completedStages = orderedStages.filter((s) => s.completed);
    const currentStageId =
      completedStages.length > 0
        ? completedStages[completedStages.length - 1].stage_id
        : 1;

    const lastUpdated = stages.reduce((latest, s) => {
      return s.updatedAt > latest ? s.updatedAt : latest;
    }, new Date(0));

    return {
      member_id: user.id,
      member_name: user.name,
      member_email: user.email,
      life_groups:
        user.lifeGroups?.map((lg) => ({ id: lg.id, name: lg.name })) ?? [],
      current_stage_id: currentStageId,
      stages: orderedStages,
      last_updated_at: lastUpdated,
    };
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
          count: found ? Number(found.count) : 0,
        };
      });
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving journey stats.',
      );
    }
  }

  async getFeed(params: {
    stage_id?: number;
    life_group?: string;
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
  }) {
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

      if (params.stage_id !== undefined) {
        qb = qb.andWhere('mjs.stage_id = :stageId', {
          stageId: params.stage_id,
        });
      }

      if (params.life_group) {
        qb = qb.andWhere(
          `EXISTS (
            SELECT 1 FROM user_life_groups ulg
            JOIN life_groups lg ON lg.id = ulg.life_group_id
            WHERE ulg.user_id = u.id AND lg.name = :lifeGroup
          )`,
          { lifeGroup: params.life_group },
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
          stage_key: row.stage_key,
          stage_label: stageDef?.label ?? row.stage_key,
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
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving the journey feed.',
      );
    }
  }
}
