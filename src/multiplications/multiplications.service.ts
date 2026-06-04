import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Multiplication } from './entities/multiplication.entity';
import { User } from '../users/entities/user.entity';
import { CreateMultiplicationDto } from './dto/create-multiplication.dto';
import { UpdateMultiplicationDto } from './dto/update-multiplication.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'multiplications';

@Injectable()
export class MultiplicationsService {
  constructor(
    @InjectRepository(Multiplication)
    private readonly repo: Repository<Multiplication>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(
    dto: CreateMultiplicationDto,
    actorId: number,
  ): Promise<Multiplication> {
    const entity = await this.repo.save(
      this.repo.create({
        date: dto.date,
        sourceLifeGroupId: dto.sourceLifeGroupId,
        areaId: dto.areaId,
        sectorId: dto.sectorId,
        completedLeadershipTrack: dto.completedLeadershipTrack,
        legallyMarried: dto.legallyMarried,
        faithfulTither: dto.faithfulTither,
        evangelizingAndConsolidating: dto.evangelizingAndConsolidating,
        goodTestimony: dto.goodTestimony,
        singleLivingInPurity: dto.singleLivingInPurity ?? null,
        newLifeGroupId: dto.newLifeGroupId ?? null,
        newLifeGroupName: dto.newLifeGroupName,
        newLeaderId: dto.newLeaderId,
        hostId: dto.hostId,
        address: dto.address,
        leaderPhone: dto.leaderPhone,
        meetingDayTime: new Date(dto.meetingDayTime),
        membersToMove: dto.membersToMove,
        newMembers: dto.newMembers,
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

  async list(scope: ResolvedScope): Promise<Multiplication[]> {
    const qb = this.repo.createQueryBuilder('f').where('f.deleted_at IS NULL');
    if (!scope.unrestricted) {
      qb.andWhere('1=0');
    }
    return qb.orderBy('f.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Multiplication> {
    const m = await this.repo.findOne({
      where: { id },
      relations: ['submittedBy'],
    });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(
    id: string,
    dto: UpdateMultiplicationDto,
    actor: { id: number; roleSlug: string },
  ): Promise<Multiplication> {
    const m = await this.findOne(id);
    this.policy.assertCanEdit(actor, {
      submittedById: m.submittedBy.id,
      createdAt: m.createdAt,
      deletedAt: m.deletedAt,
    });
    if (dto.meetingDayTime !== undefined) {
      Object.assign(m, {
        ...dto,
        meetingDayTime: new Date(dto.meetingDayTime),
      });
    } else {
      Object.assign(m, dto);
    }
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
