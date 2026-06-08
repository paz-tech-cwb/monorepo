import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormCourse } from './entities/form-course.entity';
import { FormCourseLink } from './entities/form-course-link.entity';
import { CreateFormCourseDto } from './dto/create-form-course.dto';
import { UpdateFormCourseDto } from './dto/update-form-course.dto';

@Injectable()
export class FormCoursesService {
  constructor(
    @InjectRepository(FormCourse)
    private readonly courses: Repository<FormCourse>,
    @InjectRepository(FormCourseLink)
    private readonly links: Repository<FormCourseLink>,
  ) {}

  async listAll(): Promise<FormCourse[]> {
    return this.courses.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async linkExisting(formSlug: string, courseId: string): Promise<FormCourse> {
    const course = await this.courses.findOneBy({
      id: courseId,
      isActive: true,
    });
    if (!course) throw new NotFoundException();
    const existing = await this.links.findOneBy({ formSlug, courseId });
    if (!existing) {
      const max = (await this.links.maximum('displayOrder', { formSlug })) ?? 0;
      await this.links.insert({ formSlug, courseId, displayOrder: max + 1 });
    }
    return course;
  }

  async listForForm(
    formSlug: string,
  ): Promise<Array<FormCourse & { display_order: number }>> {
    const linked = await this.links.find({
      where: { formSlug },
      order: { displayOrder: 'ASC' },
    });
    if (!linked.length) return [];
    const courseIds = linked.map((l) => l.courseId);
    const courses = await this.courses.findBy(
      courseIds.map((id) => ({ id, isActive: true })),
    );
    return linked
      .map((l) => ({
        course: courses.find((c) => c.id === l.courseId),
        order: l.displayOrder,
      }))
      .filter((x) => x.course)
      .map((x) => ({ ...x.course!, display_order: x.order }));
  }

  async createAndLink(
    formSlug: string,
    dto: CreateFormCourseDto,
  ): Promise<FormCourse> {
    const course = await this.courses.save(
      this.courses.create({
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      }),
    );
    const max = (await this.links.maximum('displayOrder', { formSlug })) ?? 0;
    await this.links.insert({
      formSlug,
      courseId: course.id,
      displayOrder: dto.displayOrder ?? max + 1,
    });
    return course;
  }

  async update(id: string, dto: UpdateFormCourseDto): Promise<FormCourse> {
    const c = await this.courses.findOneBy({ id });
    if (!c) throw new NotFoundException();
    Object.assign(c, {
      name: dto.name ?? c.name,
      description: dto.description ?? c.description,
      isActive: dto.isActive ?? c.isActive,
    });
    return this.courses.save(c);
  }

  async unlink(formSlug: string, courseId: string): Promise<void> {
    await this.links.delete({ formSlug, courseId });
  }
}
