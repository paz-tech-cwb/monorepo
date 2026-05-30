import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberRegistration } from './entities/member-registration.entity';
import { User } from '../users/entities/user.entity';
import { CreateMemberRegistrationDto } from './dto/create-member-registration.dto';
import { UpdateMemberRegistrationDto } from './dto/update-member-registration.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { OnboardingService } from './services/onboarding.service';

const SLUG = 'member-registrations';

function composeAddress(dto: CreateMemberRegistrationDto): string | null {
  const line1 = [dto.street, dto.addressNumber].filter(Boolean).join(', ');
  const line2 = [dto.complement, dto.neighborhood].filter(Boolean).join(' - ');
  const city = [dto.city, dto.state].filter(Boolean).join('/');
  const cep = dto.cep ? `CEP ${dto.cep}` : '';
  return [line1, line2, city, cep].filter(Boolean).join(', ') || null;
}

@Injectable()
export class MemberRegistrationsService {
  constructor(
    @InjectRepository(MemberRegistration) private readonly repo: Repository<MemberRegistration>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
    private readonly onboarding: OnboardingService,
  ) {}

  async create(dto: CreateMemberRegistrationDto, actorId: number): Promise<MemberRegistration> {
    const reg = await this.repo.save(
      this.repo.create({
        email: dto.email,
        fullName: dto.fullName,
        birthDate: dto.birthDate,
        phone: dto.phone,
        gender: dto.gender,
        civilState: dto.civilState,
        sectorId: dto.sectorId,
        lifeGroupId: dto.lifeGroupId ?? null,
        leaderId: dto.leaderId ?? null,
        completedCourses: dto.completedCourses ?? [],
        cep: dto.cep ?? null,
        street: dto.street ?? null,
        addressNumber: dto.addressNumber ?? null,
        complement: dto.complement ?? null,
        neighborhood: dto.neighborhood ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        address: dto.address?.trim() || composeAddress(dto),
        submittedBy: { id: actorId } as User,
      }),
    );
    await this.audit.record({ formSlug: SLUG, submissionId: reg.id, actorId, action: 'create' });
    void this.onboarding.onSubmit(reg);
    return reg;
  }

  async list(scope: ResolvedScope): Promise<MemberRegistration[]> {
    const qb = this.repo.createQueryBuilder('m').where('m.deleted_at IS NULL');
    if (!scope.unrestricted && scope.lifeGroupIds.length > 0) {
      qb.andWhere('m.life_group_id = ANY(:lgs)', { lgs: scope.lifeGroupIds });
    } else if (!scope.unrestricted) {
      qb.andWhere('1=0');
    }
    return qb.orderBy('m.created_at', 'DESC').getMany();
  }

  async findOne(id: string, scope?: ResolvedScope): Promise<MemberRegistration> {
    const m = await this.repo.findOne({ where: { id }, relations: ['submittedBy'] });
    if (!m) throw new NotFoundException();
    if (scope && !scope.unrestricted && m.lifeGroupId !== null && !scope.lifeGroupIds.includes(m.lifeGroupId)) {
      throw new ForbiddenException();
    }
    return m;
  }

  async auditLog(id: string, scope: ResolvedScope) {
    await this.findOne(id, scope);
    return this.audit.listForSubmission(SLUG, id);
  }

  async update(
    id: string,
    dto: UpdateMemberRegistrationDto,
    actor: { id: number; roleSlug: string },
    scope: ResolvedScope,
  ): Promise<MemberRegistration> {
    const m = await this.findOne(id, scope);
    this.policy.assertCanEdit(actor, { submittedById: m.submittedBy.id, createdAt: m.createdAt, deletedAt: m.deletedAt });
    Object.assign(m, dto);
    const saved = await this.repo.save(m);
    await this.audit.record({ formSlug: SLUG, submissionId: id, actorId: actor.id, action: 'update', diff: dto as Record<string, unknown> });
    return saved;
  }

  async softDelete(id: string, actor: { id: number; roleSlug: string }, scope: ResolvedScope): Promise<void> {
    await this.findOne(id, scope);
    this.policy.assertCanDelete(actor);
    await this.repo.softDelete(id);
    await this.audit.record({ formSlug: SLUG, submissionId: id, actorId: actor.id, action: 'delete' });
  }
}
