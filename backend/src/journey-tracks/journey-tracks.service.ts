import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { JourneyTrack } from './entities/journey-track.entity';
import { JourneyTrackStep } from './entities/journey-track-step.entity';
import { CreateJourneyTrackDto } from './dto/create-journey-track.dto';
import { UpdateJourneyTrackDto } from './dto/update-journey-track.dto';
import { CreateJourneyTrackStepDto } from './dto/create-journey-track-step.dto';
import { UpdateJourneyTrackStepDto } from './dto/update-journey-track-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Injectable()
export class JourneyTracksService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  // course_completion steps must always carry a course_id, and steps of any
  // other type must never carry one — reject rather than silently null it so
  // admin-ui gets clear feedback on a malformed payload.
  private assertTypeCourseIdConsistency(
    type: string,
    courseId: string | null | undefined,
  ): void {
    if (type === 'course_completion' && !courseId) {
      throw new BadRequestException(
        'course_id is required when type is "course_completion".',
      );
    }
    if (type !== 'course_completion' && courseId) {
      throw new BadRequestException(
        `course_id must not be set when type is "${type}".`,
      );
    }
  }

  private stepToResponse(step: JourneyTrackStep) {
    return {
      id: step.id,
      track_id: step.trackId,
      key: step.key,
      sort_order: step.sortOrder,
      type: step.type,
      title: step.title,
      description: step.description ?? null,
      course_id: step.courseId ?? null,
      external_url: step.externalUrl ?? null,
    };
  }

  private async trackToResponse(track: JourneyTrack) {
    const steps = await this.entityManager.find(JourneyTrackStep, {
      where: { trackId: track.id },
      order: { sortOrder: 'ASC' },
    });
    return {
      id: track.id,
      key: track.key,
      title: track.title,
      description: track.description ?? null,
      eligibility_text: track.eligibilityText ?? null,
      sort_order: track.sortOrder,
      is_active: track.isActive,
      steps: steps.map((s) => this.stepToResponse(s)),
    };
  }

  async findAllForAdmin() {
    const tracks = await this.entityManager.find(JourneyTrack, {
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return Promise.all(tracks.map((t) => this.trackToResponse(t)));
  }

  async findTrackEntity(id: number): Promise<JourneyTrack> {
    const track = await this.entityManager.findOne(JourneyTrack, {
      where: { id },
    });
    if (!track) {
      throw new NotFoundException(`Journey track with ID ${id} not found`);
    }
    return track;
  }

  async findStepEntity(
    trackId: number,
    stepId: number,
  ): Promise<JourneyTrackStep> {
    const step = await this.entityManager.findOne(JourneyTrackStep, {
      where: { id: stepId, trackId },
    });
    if (!step) {
      throw new NotFoundException(
        `Journey track step with ID ${stepId} not found for track ${trackId}`,
      );
    }
    return step;
  }

  async createTrack(dto: CreateJourneyTrackDto) {
    const track = this.entityManager.create(JourneyTrack, {
      key: dto.key,
      title: dto.title,
      description: dto.description ?? null,
      eligibilityText: dto.eligibility_text ?? null,
      sortOrder: dto.sort_order ?? 0,
      isActive: dto.is_active ?? true,
    });
    const saved = await this.entityManager.save(track);
    return this.trackToResponse(saved);
  }

  async updateTrack(id: number, dto: UpdateJourneyTrackDto) {
    const track = await this.findTrackEntity(id);

    if (dto.title !== undefined) track.title = dto.title;
    if (dto.description !== undefined) track.description = dto.description;
    if (dto.eligibility_text !== undefined) {
      track.eligibilityText = dto.eligibility_text;
    }
    if (dto.sort_order !== undefined) track.sortOrder = dto.sort_order;
    if (dto.is_active !== undefined) track.isActive = dto.is_active;

    const saved = await this.entityManager.save(JourneyTrack, track);
    return this.trackToResponse(saved);
  }

  async removeTrack(id: number): Promise<void> {
    const track = await this.findTrackEntity(id);
    await this.entityManager.remove(JourneyTrack, track);
  }

  async createStep(trackId: number, dto: CreateJourneyTrackStepDto) {
    await this.findTrackEntity(trackId);
    this.assertTypeCourseIdConsistency(dto.type, dto.course_id);

    const step = this.entityManager.create(JourneyTrackStep, {
      trackId,
      key: dto.key ?? null,
      sortOrder: dto.sort_order ?? 0,
      type: dto.type,
      title: dto.title,
      description: dto.description ?? null,
      courseId:
        dto.type === 'course_completion' ? (dto.course_id ?? null) : null,
      externalUrl: dto.external_url ?? null,
    });
    const saved = await this.entityManager.save(step);
    return this.stepToResponse(saved);
  }

  async updateStep(
    trackId: number,
    stepId: number,
    dto: UpdateJourneyTrackStepDto,
  ) {
    const step = await this.findStepEntity(trackId, stepId);

    const nextType = dto.type ?? step.type;
    const nextCourseId =
      dto.course_id !== undefined ? dto.course_id : step.courseId;
    this.assertTypeCourseIdConsistency(nextType, nextCourseId);

    if (dto.key !== undefined) step.key = dto.key;
    if (dto.sort_order !== undefined) step.sortOrder = dto.sort_order;
    if (dto.type !== undefined) step.type = dto.type;
    if (dto.title !== undefined) step.title = dto.title;
    if (dto.description !== undefined) step.description = dto.description;
    if (dto.external_url !== undefined) step.externalUrl = dto.external_url;
    step.courseId =
      nextType === 'course_completion' ? (nextCourseId ?? null) : null;

    const saved = await this.entityManager.save(JourneyTrackStep, step);
    return this.stepToResponse(saved);
  }

  async removeStep(trackId: number, stepId: number): Promise<void> {
    const step = await this.findStepEntity(trackId, stepId);
    await this.entityManager.remove(JourneyTrackStep, step);
  }

  async reorderSteps(trackId: number, dto: ReorderStepsDto) {
    await this.findTrackEntity(trackId);

    const steps = await this.entityManager.find(JourneyTrackStep, {
      where: { id: In(dto.step_ids), trackId },
    });
    if (steps.length !== dto.step_ids.length) {
      throw new BadRequestException(
        'One or more step_ids do not belong to this track.',
      );
    }

    const stepById = new Map(steps.map((s) => [s.id, s]));
    await this.entityManager.transaction(async (manager) => {
      for (const [index, stepId] of dto.step_ids.entries()) {
        const step = stepById.get(stepId);
        if (!step) continue;
        step.sortOrder = index;
        await manager.save(JourneyTrackStep, step);
      }
    });

    return this.trackToResponse(await this.findTrackEntity(trackId));
  }
}
