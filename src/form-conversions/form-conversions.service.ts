import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormConversion } from './entities/form-conversion.entity';
import { User } from '../users/entities/user.entity';
import { CreateFormConversionDto } from './dto/create-form-conversion.dto';
import { UpdateFormConversionDto } from './dto/update-form-conversion.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'form-conversions';

@Injectable()
export class FormConversionsService {
  constructor(
    @InjectRepository(FormConversion) private readonly repo: Repository<FormConversion>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(dto: CreateFormConversionDto, actorId: number): Promise<FormConversion> {
    const entity = await this.repo.save(
      this.repo.create({
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        decisionType: dto.decisionType,
        howMetChurch: dto.howMetChurch,
        howMetChurchOther: dto.howMetChurchOther ?? null,
        gender: dto.gender,
        birthDate: dto.birthDate,
        civilState: dto.civilState,
        cep: dto.cep ?? null,
        street: dto.street ?? null,
        addressNumber: dto.addressNumber ?? null,
        complement: dto.complement ?? null,
        neighborhood: dto.neighborhood ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        address: dto.address,
        attendanceCount: dto.attendanceCount,
        lifeGroupStatus: dto.lifeGroupStatus,
        lifeGroupLeaderOrName: dto.lifeGroupLeaderOrName ?? null,
        invitedBy: dto.invitedBy ?? null,
        notes: dto.notes ?? null,
        submittedBy: { id: actorId } as User,
      }),
    );
    await this.audit.record({ formSlug: SLUG, submissionId: entity.id, actorId, action: 'create' });
    return entity;
  }

  async list(scope: ResolvedScope): Promise<FormConversion[]> {
    const qb = this.repo.createQueryBuilder('f').where('f.deleted_at IS NULL');
    if (!scope.unrestricted && scope.lifeGroupIds.length > 0) {
      qb.andWhere('f.life_group_id = ANY(:lgs)', { lgs: scope.lifeGroupIds });
    } else if (!scope.unrestricted) {
      qb.andWhere('1=0');
    }
    return qb.orderBy('f.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<FormConversion> {
    const m = await this.repo.findOne({ where: { id }, relations: ['submittedBy'] });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(id: string, dto: UpdateFormConversionDto, actor: { id: number; roleSlug: string }): Promise<FormConversion> {
    const m = await this.findOne(id);
    this.policy.assertCanEdit(actor, { submittedById: m.submittedBy.id, createdAt: m.createdAt, deletedAt: m.deletedAt });
    Object.assign(m, dto);
    const saved = await this.repo.save(m);
    await this.audit.record({ formSlug: SLUG, submissionId: id, actorId: actor.id, action: 'update', diff: dto as Record<string, unknown> });
    return saved;
  }

  async softDelete(id: string, actor: { id: number; roleSlug: string }): Promise<void> {
    this.policy.assertCanDelete(actor);
    await this.repo.softDelete(id);
    await this.audit.record({ formSlug: SLUG, submissionId: id, actorId: actor.id, action: 'delete' });
  }

  async auditLog(id: string) {
    return this.audit.listForSubmission(SLUG, id);
  }
}
