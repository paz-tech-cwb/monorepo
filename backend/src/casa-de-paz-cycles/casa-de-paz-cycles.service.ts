import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CasaDePazCycle } from './entities/casa-de-paz-cycle.entity';
import { CreateCasaDePazCycleDto } from './dto/create-casa-de-paz-cycle.dto';
import { User } from '../users/entities/user.entity';

export interface CasaDePazCycleResponse {
  id: string;
  name: string;
  month: string;
  status: string;
}

// pt-BR month labels used to auto-derive a cycle name when the caller
// doesn't supply one (e.g. "Casa de Paz — Setembro 2026").
const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function monthNameFor(monthDate: string): string {
  const [year, month] = monthDate.split('-').map(Number);
  const label = MONTH_LABELS[month - 1] ?? monthDate;
  return `Casa de Paz — ${label} ${year}`;
}

@Injectable()
export class CasaDePazCyclesService {
  constructor(
    @InjectRepository(CasaDePazCycle)
    private readonly repo: Repository<CasaDePazCycle>,
  ) {}

  private toResponse(m: CasaDePazCycle): CasaDePazCycleResponse {
    return { id: m.id, name: m.name, month: m.month, status: m.status };
  }

  async list(): Promise<CasaDePazCycleResponse[]> {
    const rows = await this.repo.find({ order: { month: 'DESC' } });
    return rows.map((r) => this.toResponse(r));
  }

  async create(
    dto: CreateCasaDePazCycleDto,
    actorId: number,
  ): Promise<CasaDePazCycleResponse> {
    const monthDate = `${dto.month}-01`;
    const name = dto.name?.trim() || monthNameFor(monthDate);
    try {
      const entity = await this.repo.save(
        this.repo.create({
          month: monthDate,
          name,
          createdBy: { id: actorId } as User,
        }),
      );
      return this.toResponse(entity);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('A cycle for this month already exists');
      }
      throw error;
    }
  }

  async close(id: string): Promise<CasaDePazCycleResponse> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException();
    if (entity.status === 'closed') {
      throw new ConflictException('Cycle is already closed');
    }
    entity.status = 'closed';
    entity.closedAt = new Date();
    const saved = await this.repo.save(entity);
    return this.toResponse(saved);
  }

  // Used by callers needing a default cycle selection (e.g. future
  // onboarding/report pickers): prefers the most recently created open
  // cycle, falling back to the most recent cycle overall if none is open.
  async mostRecentOpenOrLatest(): Promise<CasaDePazCycle | null> {
    const open = await this.repo.findOne({
      where: { status: 'open' },
      order: { month: 'DESC' },
    });
    if (open) return open;
    return this.repo.findOne({ order: { month: 'DESC' } });
  }

  // Finds (or creates) the cycle for a given normalized month date
  // ("YYYY-MM-01"). Used by the historical backfill path and any other
  // internal caller that needs to resolve a report's month to a cycle.
  async resolveOrCreateForMonth(
    monthDate: string,
    actorId: number,
  ): Promise<CasaDePazCycle> {
    const existing = await this.repo.findOne({ where: { month: monthDate } });
    if (existing) return existing;
    return this.repo.save(
      this.repo.create({
        month: monthDate,
        name: monthNameFor(monthDate),
        createdBy: { id: actorId } as User,
      }),
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
