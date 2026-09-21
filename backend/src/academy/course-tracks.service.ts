import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { CourseTrack } from './entities/course-track.entity';
import { CourseTrackCourse } from './entities/course-track-course.entity';
import { Course } from '../courses/entities/course.entity';
import { CreateCourseTrackDto } from './dto/create-course-track.dto';
import { UpdateCourseTrackDto } from './dto/update-course-track.dto';
import { SetTrackCoursesDto } from './dto/set-track-courses.dto';
import { JOURNEY_STAGES } from '../member-journey/member-journey.service';

@Injectable()
export class CourseTracksService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private assertValidJourneyStageId(
    journeyStageId: number | null | undefined,
  ): void {
    if (journeyStageId === null || journeyStageId === undefined) return;
    const isValid = JOURNEY_STAGES.some((s) => s.id === journeyStageId);
    if (!isValid) {
      throw new BadRequestException(
        `Invalid journey_stage_id: ${journeyStageId}`,
      );
    }
  }

  async toResponse(track: CourseTrack) {
    const memberships = await this.entityManager.find(CourseTrackCourse, {
      where: { trackId: track.id },
      order: { sortOrder: 'ASC' },
    });

    return {
      id: track.id,
      title: track.title,
      description: track.description ?? null,
      sort_order: track.sortOrder,
      journey_stage_id: track.journeyStageId ?? null,
      courses: memberships.map((m) => ({
        id: m.course.id,
        title: m.course.title,
        description: m.course.description ?? null,
        thumbnail_url: m.course.thumbnailUrl ?? null,
        url: m.course.url ?? null,
        sort_order: m.sortOrder,
      })),
    };
  }

  async findAll() {
    const tracks = await this.entityManager.find(CourseTrack, {
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return Promise.all(tracks.map((t) => this.toResponse(t)));
  }

  async findOneEntity(id: number): Promise<CourseTrack> {
    const track = await this.entityManager.findOne(CourseTrack, {
      where: { id },
    });
    if (!track) {
      throw new NotFoundException(`Course track with ID ${id} not found`);
    }
    return track;
  }

  async create(dto: CreateCourseTrackDto) {
    this.assertValidJourneyStageId(dto.journey_stage_id);
    const track = this.entityManager.create(CourseTrack, {
      title: dto.title,
      description: dto.description ?? null,
      sortOrder: dto.sort_order ?? 0,
      journeyStageId: dto.journey_stage_id ?? null,
    });
    const saved = await this.entityManager.save(track);
    return this.toResponse(saved);
  }

  async update(id: number, dto: UpdateCourseTrackDto) {
    const track = await this.findOneEntity(id);

    if (dto.title !== undefined) track.title = dto.title;
    if (dto.description !== undefined) track.description = dto.description;
    if (dto.sort_order !== undefined) track.sortOrder = dto.sort_order;
    if (dto.journey_stage_id !== undefined) {
      this.assertValidJourneyStageId(dto.journey_stage_id);
      track.journeyStageId = dto.journey_stage_id;
    }

    const saved = await this.entityManager.save(CourseTrack, track);
    return this.toResponse(saved);
  }

  async remove(id: number): Promise<void> {
    const track = await this.findOneEntity(id);
    await this.entityManager.remove(CourseTrack, track);
  }

  async setCourses(id: number, dto: SetTrackCoursesDto) {
    const track = await this.findOneEntity(id);

    const courses = await this.entityManager.find(Course, {
      where: { id: In(dto.course_ids) },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    for (const courseId of dto.course_ids) {
      if (!courseMap.has(courseId)) {
        throw new NotFoundException(`Course with ID ${courseId} not found`);
      }
    }

    await this.entityManager.transaction(async (manager) => {
      await manager.delete(CourseTrackCourse, { trackId: id });

      const memberships = dto.course_ids.map((courseId, index) =>
        manager.create(CourseTrackCourse, {
          trackId: id,
          courseId,
          sortOrder: index,
        }),
      );
      if (memberships.length > 0) {
        await manager.save(CourseTrackCourse, memberships);
      }
    });

    return this.toResponse(track);
  }
}
