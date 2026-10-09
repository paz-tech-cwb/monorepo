import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CourseLesson } from './entities/course-lesson.entity';
import { CreateCourseLessonDto } from './dto/create-course-lesson.dto';
import { UpdateCourseLessonDto } from './dto/update-course-lesson.dto';
import { ReorderCourseLessonsDto } from './dto/reorder-course-lessons.dto';
import { extractYoutubeId } from './utils/youtube';

@Injectable()
export class CourseLessonsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  toResponse(lesson: CourseLesson) {
    return {
      id: lesson.id,
      course_id: lesson.courseId,
      title: lesson.title,
      description: lesson.description ?? null,
      youtube_video_id: lesson.youtubeVideoId,
      duration_seconds: lesson.durationSeconds ?? null,
      thumbnail_url: lesson.thumbnailUrl ?? null,
      sort_order: lesson.sortOrder,
      created_at: lesson.createdAt,
      updated_at: lesson.updatedAt,
    };
  }

  async findAllForCourse(courseId: string) {
    const lessons = await this.entityManager.find(CourseLesson, {
      where: { courseId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return lessons.map((l) => this.toResponse(l));
  }

  async findOneEntity(
    courseId: string,
    lessonId: string,
  ): Promise<CourseLesson> {
    const lesson = await this.entityManager.findOne(CourseLesson, {
      where: { id: lessonId, courseId },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }
    return lesson;
  }

  private defaultThumbnailUrl(youtubeVideoId: string): string {
    return `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
  }

  async create(courseId: string, dto: CreateCourseLessonDto) {
    const youtubeVideoId = extractYoutubeId(dto.youtube_video_id);
    const thumbnailUrl =
      dto.thumbnail_url || this.defaultThumbnailUrl(youtubeVideoId);
    const lesson = this.entityManager.create(CourseLesson, {
      courseId,
      title: dto.title,
      description: dto.description ?? null,
      youtubeVideoId,
      durationSeconds: dto.duration_seconds ?? null,
      thumbnailUrl,
      sortOrder: dto.sort_order ?? 0,
    });
    const saved = await this.entityManager.save(lesson);
    return this.toResponse(saved);
  }

  async update(courseId: string, lessonId: string, dto: UpdateCourseLessonDto) {
    const lesson = await this.findOneEntity(courseId, lessonId);

    const oldYoutubeVideoId = lesson.youtubeVideoId;
    const oldThumbnailUrl = lesson.thumbnailUrl;

    if (dto.title !== undefined) lesson.title = dto.title;
    if (dto.description !== undefined) lesson.description = dto.description;

    let newYoutubeVideoId = oldYoutubeVideoId;
    if (dto.youtube_video_id !== undefined) {
      newYoutubeVideoId = extractYoutubeId(dto.youtube_video_id);
      lesson.youtubeVideoId = newYoutubeVideoId;
    }
    const youtubeVideoIdChanged = newYoutubeVideoId !== oldYoutubeVideoId;

    if (dto.duration_seconds !== undefined)
      lesson.durationSeconds = dto.duration_seconds;
    if (dto.thumbnail_url !== undefined) {
      lesson.thumbnailUrl = dto.thumbnail_url || null;
    } else if (youtubeVideoIdChanged) {
      const oldThumbnailWasAutoDerived =
        oldThumbnailUrl === this.defaultThumbnailUrl(oldYoutubeVideoId);
      if (oldThumbnailWasAutoDerived) {
        lesson.thumbnailUrl = this.defaultThumbnailUrl(newYoutubeVideoId);
      }
    }
    if (dto.sort_order !== undefined) lesson.sortOrder = dto.sort_order;

    const saved = await this.entityManager.save(CourseLesson, lesson);
    return this.toResponse(saved);
  }

  async remove(courseId: string, lessonId: string): Promise<void> {
    const lesson = await this.findOneEntity(courseId, lessonId);
    await this.entityManager.remove(CourseLesson, lesson);
  }

  async reorder(courseId: string, dto: ReorderCourseLessonsDto) {
    const lessons = await this.entityManager.find(CourseLesson, {
      where: { courseId },
    });
    const lessonMap = new Map(lessons.map((l) => [l.id, l]));

    await this.entityManager.transaction(async (manager) => {
      for (const [index, lessonId] of dto.lesson_ids.entries()) {
        const lesson = lessonMap.get(lessonId);
        if (!lesson) {
          throw new NotFoundException(
            `Lesson with ID ${lessonId} not found in course ${courseId}`,
          );
        }
        lesson.sortOrder = index;
        await manager.save(CourseLesson, lesson);
      }
    });

    return this.findAllForCourse(courseId);
  }
}
