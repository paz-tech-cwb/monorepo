import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { MemberJourneyStage } from './entities/member-journey-stage.entity';
import { Member } from '../members/entities/member.entity';
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

  private buildMemberJourneyResponse(
    member: Member,
    stages: MemberJourneyStage[],
  ) {
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
      member_id: member.id,
      member_name: member.name,
      member_email: member.email,
      life_group: member.lifeGroup ?? null,
      current_stage_id: currentStageId,
      stages: orderedStages,
      last_updated_at: lastUpdated,
    };
  }

  async getMemberJourney(memberId: number) {
    const member = await this.entityManager.findOne(Member, {
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    await this.ensureStagesExist(memberId);

    const stages = await this.entityManager.find(MemberJourneyStage, {
      where: { memberId },
      order: { stageId: 'ASC' },
    });

    return this.buildMemberJourneyResponse(member, stages);
  }

  async updateStage(memberId: number, dto: UpdateMemberStageDto) {
    const member = await this.entityManager.findOne(Member, {
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    const stageDef = JOURNEY_STAGES.find((s) => s.id === dto.stage_id);
    if (!stageDef) {
      throw new BadRequestException(`Invalid stage_id: ${dto.stage_id}`);
    }

    let stage = await this.entityManager.findOne(MemberJourneyStage, {
      where: { memberId, stageId: dto.stage_id },
    });

    if (!stage) {
      stage = this.entityManager.create(MemberJourneyStage, {
        memberId,
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
    await this.ensureStagesExist(memberId);
    const stages = await this.entityManager.find(MemberJourneyStage, {
      where: { memberId },
      order: { stageId: 'ASC' },
    });
    return this.buildMemberJourneyResponse(member, stages);
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
        .innerJoin(Member, 'member', 'member.id = mjs.member_id')
        .select([
          'mjs.id AS id',
          'mjs.member_id AS member_id',
          'member.name AS member_name',
          'member.life_group AS life_group',
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
        qb = qb.andWhere('member.life_group = :lifeGroup', {
          lifeGroup: params.life_group,
        });
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
          life_group: string | null;
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
          life_group: row.life_group ?? null,
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
