import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { FormGuest } from './entities/form-guest.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateFormGuestDto } from './dto/create-form-guest.dto';
import { UpdateFormGuestDto } from './dto/update-form-guest.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { UsersService } from '../users/users.service';

const SLUG = 'form-guests';

@Injectable()
export class FormGuestsService {
  constructor(
    @InjectRepository(FormGuest) private readonly repo: Repository<FormGuest>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly usersService: UsersService,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(dto: CreateFormGuestDto, actorId: number): Promise<FormGuest> {
    const entity = await this.repo.save(
      this.repo.create({
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        date: dto.date ?? null,
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

    // Link or create a User record for the guest
    let createdUserId: number | null = null;
    if (dto.email || dto.phone) {
      const existing = await this.usersService.lookupForForms({
        email: dto.email,
        phone: dto.phone,
      });
      if (existing) {
        createdUserId = existing.id;
      } else if (dto.fullName && (dto.email || dto.phone)) {
        const memberRole = await this.em.findOne(Role, {
          where: { slug: 'member' },
        });
        const newUser = this.em.create(User, {
          name: dto.fullName,
          email: dto.email ?? null,
          phoneNumber: dto.phone ?? null,
          role: memberRole ?? undefined,
          status: 'active',
        });
        const saved = await this.em.save(User, newUser);
        createdUserId = saved.id;
      }
      if (createdUserId) {
        await this.em.update(FormGuest, entity.id, { createdUserId });
        entity.createdUserId = createdUserId;
      }
    }

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
