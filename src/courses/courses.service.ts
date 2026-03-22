import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(course: Course) {
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      creator: course.creator,
      creator_id: course.creatorId ?? null,
      estimated_hours: course.estimatedHours,
      category: course.category,
      url: course.url ?? null,
      image_url: course.imageUrl ?? null,
      thumbnail_url: course.thumbnailUrl ?? null,
      status: course.status,
      created_at: course.createdAt,
      updated_at: course.updatedAt,
    };
  }

  async create(dto: CreateCourseDto) {
    try {
      const course = this.entityManager.create(Course, {
        title: dto.title,
        description: dto.description,
        creator: dto.creator,
        creatorId: dto.creator_id ?? null,
        estimatedHours: dto.estimated_hours,
        category: dto.category,
        url: dto.url ?? null,
        imageUrl: dto.image_url ?? null,
        thumbnailUrl: dto.thumbnail_url ?? null,
        status: dto.status ?? 'draft',
      });
      const saved = await this.entityManager.save(course);
      return this.toResponse(saved);
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while creating the course.',
      );
    }
  }

  async findAll() {
    try {
      const courses = await this.entityManager.find(Course, {
        order: { createdAt: 'DESC' },
      });
      return courses.map((c) => this.toResponse(c));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving courses.',
      );
    }
  }

  async findOne(id: string) {
    const course = await this.entityManager.findOne(Course, { where: { id } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return this.toResponse(course);
  }

  async findOneEntity(id: string): Promise<Course> {
    const course = await this.entityManager.findOne(Course, { where: { id } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    try {
      const course = await this.findOneEntity(id);

      if (dto.title !== undefined) course.title = dto.title;
      if (dto.description !== undefined) course.description = dto.description;
      if (dto.creator !== undefined) course.creator = dto.creator;
      if (dto.creator_id !== undefined) course.creatorId = dto.creator_id;
      if (dto.estimated_hours !== undefined)
        course.estimatedHours = dto.estimated_hours;
      if (dto.category !== undefined) course.category = dto.category;
      if (dto.url !== undefined) course.url = dto.url;
      if (dto.image_url !== undefined) course.imageUrl = dto.image_url;
      if (dto.thumbnail_url !== undefined)
        course.thumbnailUrl = dto.thumbnail_url;
      if (dto.status !== undefined) course.status = dto.status;

      const saved = await this.entityManager.save(Course, course);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the course.',
      );
    }
  }

  async remove(id: string): Promise<void> {
    const course = await this.findOneEntity(id);
    await this.entityManager.remove(Course, course);
  }
}
