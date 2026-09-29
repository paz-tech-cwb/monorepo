import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CasaDePazLesson } from './entities/casa-de-paz-lesson.entity';
import { UpdateCasaDePazLessonDto } from './dto/update-casa-de-paz-lesson.dto';

export interface CasaDePazLessonResponse {
  week: number;
  title: string;
  summary: string;
  guidelines: string;
  questions: string[];
  youtube_url: string | null;
}

@Injectable()
export class CasaDePazLessonsService {
  constructor(
    @InjectRepository(CasaDePazLesson)
    private readonly repo: Repository<CasaDePazLesson>,
  ) {}

  private toResponse(m: CasaDePazLesson): CasaDePazLessonResponse {
    return {
      week: m.week,
      title: m.title,
      summary: m.summary,
      guidelines: m.guidelines,
      questions: m.questions,
      youtube_url: m.youtubeUrl,
    };
  }

  async list(): Promise<CasaDePazLessonResponse[]> {
    const rows = await this.repo.find({ order: { week: 'ASC' } });
    return rows.map((r) => this.toResponse(r));
  }

  async update(
    week: number,
    dto: UpdateCasaDePazLessonDto,
  ): Promise<CasaDePazLessonResponse> {
    const entity = await this.repo.findOne({ where: { week } });
    if (!entity) throw new NotFoundException();

    if (dto.title !== undefined) entity.title = dto.title;
    if (dto.summary !== undefined) entity.summary = dto.summary;
    if (dto.guidelines !== undefined) entity.guidelines = dto.guidelines;
    if (dto.questions !== undefined) entity.questions = dto.questions;
    if (dto.youtube_url !== undefined) entity.youtubeUrl = dto.youtube_url;

    const saved = await this.repo.save(entity);
    return this.toResponse(saved);
  }
}
