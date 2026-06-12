import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormGuest } from './entities/form-guest.entity';
import { User } from '../users/entities/user.entity';
import { CreateFormGuestDto } from './dto/create-form-guest.dto';
import { UpdateFormGuestDto } from './dto/update-form-guest.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'form-guests';

@Injectable()
export class FormGuestsService {
  constructor(
    @InjectRepository(FormGuest) private readonly repo: Repository<FormGuest>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(dto: CreateFormGuestDto, actorId: number): Promise<FormGuest> {
    const entity = await this.repo.save(
      this.repo.create({
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        invitedBy: dto.invitedBy ?? null,
        howMetChurch: dto.howMetChurch ?? null,
        filledBy: dto.filledBy ?? null,
        notes: dto.notes ?? null,
        viaCasaDePaz: dto.viaCasaDePaz ?? false,
        areaId: dto.areaId ?? null,
        sectorId: dto.sectorId ?? null,
        lifeGroupId: dto.lifeGroupId ?? null,
        submittedBy: { id: actorId } as User,
      }),
    );
    await this.audit.record({
      formSlug: SLUG,
      submissionId: entity.id,
      actorId,
      action: 'create',
    });
    return entity;
  }

  async list(scope: ResolvedScope): Promise<FormGuest[]> {
    const qb = this.repo.createQueryBuilder('f').where('f.deleted_at IS NULL');
    if (!scope.unrestricted && scope.lifeGroupIds.length > 0) {
      qb.andWhere('f.life_group_id = ANY(:lgs)', { lgs: scope.lifeGroupIds });
    } else if (!scope.unrestricted) {
      qb.andWhere('1=0');
    }
    return qb.orderBy('f.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<FormGuest> {
    const m = await this.repo.findOne({
      where: { id },
      relations: ['submittedBy'],
    });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(
    id: string,
    dto: UpdateFormGuestDto,
    actor: { id: number; roleSlug: string },
  ): Promise<FormGuest> {
    const m = await this.findOne(id);
    this.policy.assertCanEdit(actor, {
      submittedById: m.submittedBy.id,
      createdAt: m.createdAt,
      deletedAt: m.deletedAt,
    });
    Object.assign(m, dto);
    const saved = await this.repo.save(m);
    await this.audit.record({
      formSlug: SLUG,
      submissionId: id,
      actorId: actor.id,
      action: 'update',
      diff: dto as Record<string, unknown>,
    });
    return saved;
  }

  async softDelete(
    id: string,
    actor: { id: number; roleSlug: string },
  ): Promise<void> {
    this.policy.assertCanDelete(actor);
    await this.repo.softDelete(id);
    await this.audit.record({
      formSlug: SLUG,
      submissionId: id,
      actorId: actor.id,
      action: 'delete',
    });
  }

  async auditLog(id: string) {
    return this.audit.listForSubmission(SLUG, id);
  }
}
