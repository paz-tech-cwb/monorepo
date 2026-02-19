import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CourseTrack } from './entities/course-track.entity';

@Injectable()
export class AcademyService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private trackToResponse(track: CourseTrack) {
    return {
      id: track.id,
      title: track.title,
      description: track.description ?? null,
      sort_order: track.sortOrder,
      courses: (track.courses || []).map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description ?? null,
        thumbnail_url: c.thumbnailUrl ?? null,
      })),
    };
  }

  async getAcademy() {
    try {
      const tracks = await this.entityManager.find(CourseTrack, {
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
      return {
        tracks: tracks.map((t) => this.trackToResponse(t)),
      };
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving academy data.',
      );
    }
  }
}
