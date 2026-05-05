# Formulários — Backend Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend foundation for the Formulários module: a shared `forms-core` module + 8 typed form modules + courses + onboarding email, all under `/api/forms/*`.

**Architecture:** One NestJS module per form with its own entity, DTO, service, controller. A `forms-core` module hosts the cascade `ScopeGuard`, `FormSubmissionPolicy` (24h edit window + soft delete), `FormSubmissionAuditLog`, `NotificationSender` interface, `ChurchSettingsService`. Resend SDK (already installed) for email; emails sent fire-and-forget — no queue in v1.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL 16, class-validator/class-transformer, Resend SDK, Jest.

**Spec:** `docs/formularios.md`

---

## File Structure

```
backend/src/
├── forms-core/
│   ├── forms-core.module.ts
│   ├── entities/form-submission-audit-log.entity.ts
│   ├── guards/scope.guard.ts
│   ├── decorators/form-scope.decorator.ts
│   ├── services/scope-resolver.service.ts
│   ├── services/form-submission-policy.service.ts
│   ├── services/form-submission-audit.service.ts
│   ├── services/notification-sender.ts            # interface + ResendNotificationSender impl
│   ├── services/church-settings.service.ts
│   └── tests/*.spec.ts
├── courses/
│   ├── courses.module.ts
│   ├── courses.controller.ts                      # exposes /api/forms/member-registrations/courses
│   ├── courses.service.ts
│   ├── entities/course.entity.ts
│   ├── entities/form-course-link.entity.ts
│   └── dto/{create,update}-course.dto.ts
├── forms-catalog/
│   ├── forms-catalog.module.ts
│   ├── forms-catalog.controller.ts                # GET /api/forms
│   └── forms-catalog.service.ts
├── member-registrations/                          # form 1
├── conversions/                                   # form 2
├── life-group-reports/                            # form 3
├── sector-supervisor-reports/                     # form 4
├── area-supervisor-reports/                       # form 5
├── multiplications/                               # form 6
├── service-reports/                               # form 7
└── guests/                                        # form 8

backend/database/migrations/
└── <ts>-CreateFormulariosSchema.ts                # all 11 tables in one migration
```

---

## Task 1: forms-core scaffolding — module + audit log entity

**Files:**
- Create: `src/forms-core/forms-core.module.ts`
- Create: `src/forms-core/entities/form-submission-audit-log.entity.ts`
- Create: `src/forms-core/services/form-submission-audit.service.ts`
- Test: `src/forms-core/services/form-submission-audit.service.spec.ts`

- [ ] **Step 1: Audit log entity**

```typescript
// src/forms-core/entities/form-submission-audit-log.entity.ts
import {
  Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type FormAuditAction = 'create' | 'update' | 'delete';

@Entity('form_submission_audit_log')
@Index(['formSlug', 'submissionId'])
export class FormSubmissionAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_slug', type: 'varchar', length: 64 })
  formSlug: string;

  @Column({ name: 'submission_id', type: 'varchar', length: 64 })
  submissionId: string;

  @ManyToOne(() => User, { nullable: false, eager: false })
  actor: User;

  @Column({ name: 'action', type: 'varchar', length: 16 })
  action: FormAuditAction;

  @Column({ name: 'diff', type: 'jsonb', nullable: true })
  diff: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- [ ] **Step 2: Audit service**

```typescript
// src/forms-core/services/form-submission-audit.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormSubmissionAuditLog, FormAuditAction } from '../entities/form-submission-audit-log.entity';

@Injectable()
export class FormSubmissionAuditService {
  constructor(
    @InjectRepository(FormSubmissionAuditLog)
    private readonly repo: Repository<FormSubmissionAuditLog>,
  ) {}

  async record(params: {
    formSlug: string;
    submissionId: string;
    actorId: number;
    action: FormAuditAction;
    diff?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.repo.insert({
      formSlug: params.formSlug,
      submissionId: params.submissionId,
      actor: { id: params.actorId } as any,
      action: params.action,
      diff: params.diff ?? null,
    });
  }

  async listForSubmission(formSlug: string, submissionId: string) {
    return this.repo.find({
      where: { formSlug, submissionId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
    });
  }
}
```

- [ ] **Step 3: Module**

```typescript
// src/forms-core/forms-core.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmissionAuditLog } from './entities/form-submission-audit-log.entity';
import { FormSubmissionAuditService } from './services/form-submission-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmissionAuditLog])],
  providers: [FormSubmissionAuditService],
  exports: [FormSubmissionAuditService, TypeOrmModule],
})
export class FormsCoreModule {}
```

- [ ] **Step 4: Test the audit service**

```typescript
// src/forms-core/services/form-submission-audit.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FormSubmissionAuditLog } from '../entities/form-submission-audit-log.entity';
import { FormSubmissionAuditService } from './form-submission-audit.service';

describe('FormSubmissionAuditService', () => {
  let service: FormSubmissionAuditService;
  let repo: { insert: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    repo = { insert: jest.fn().mockResolvedValue({}), find: jest.fn().mockResolvedValue([]) };
    const m = await Test.createTestingModule({
      providers: [
        FormSubmissionAuditService,
        { provide: getRepositoryToken(FormSubmissionAuditLog), useValue: repo },
      ],
    }).compile();
    service = m.get(FormSubmissionAuditService);
  });

  it('records a create with the actor and form metadata', async () => {
    await service.record({
      formSlug: 'guests', submissionId: 'abc', actorId: 7, action: 'create',
    });
    expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({
      formSlug: 'guests', submissionId: 'abc', action: 'create',
    }));
  });
});
```

Run: `npx jest src/forms-core/services/form-submission-audit.service.spec.ts` — expect PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/forms-core
git commit -m "feat(forms-core): add audit log entity and service"
```

---

## Task 2: forms-core — Cascade scope resolver + ScopeGuard

**Files:**
- Create: `src/forms-core/services/scope-resolver.service.ts`
- Create: `src/forms-core/decorators/form-scope.decorator.ts`
- Create: `src/forms-core/guards/scope.guard.ts`
- Test: `src/forms-core/services/scope-resolver.service.spec.ts`

Scope is computed from the User entity's relationships. `area_leader` → all sectors/lifes inside their area; `sector_leader` → lifes in their sector; `life_group_leader` → their single life. `admin`/`pastor` → unrestricted.

- [ ] **Step 1: Scope resolver**

```typescript
// src/forms-core/services/scope-resolver.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';

export interface ResolvedScope {
  unrestricted: boolean;
  areaIds: string[];
  sectorIds: string[];
  lifeGroupIds: string[];
}

@Injectable()
export class ScopeResolverService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(LifeGroup) private readonly lifeGroups: Repository<LifeGroup>,
  ) {}

  async resolve(userId: number): Promise<ResolvedScope> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: ['role', 'lifeGroups', 'leadingArea', 'leadingSector', 'leadingLifeGroup'],
    });
    if (!user) throw new Error(`User ${userId} not found`);

    const slug = user.role?.slug;
    if (slug === 'admin' || slug === 'pastor') {
      return { unrestricted: true, areaIds: [], sectorIds: [], lifeGroupIds: [] };
    }

    if (slug === 'area_leader' && user.leadingArea) {
      const lifes = await this.lifeGroups.find({
        where: { sector: { area: { id: user.leadingArea.id } } },
        relations: ['sector', 'sector.area'],
      });
      const sectorIds = [...new Set(lifes.map(l => l.sector.id))];
      return {
        unrestricted: false,
        areaIds: [user.leadingArea.id],
        sectorIds,
        lifeGroupIds: lifes.map(l => l.id),
      };
    }

    if (slug === 'sector_leader' && user.leadingSector) {
      const lifes = await this.lifeGroups.find({
        where: { sector: { id: user.leadingSector.id } },
      });
      return {
        unrestricted: false, areaIds: [],
        sectorIds: [user.leadingSector.id],
        lifeGroupIds: lifes.map(l => l.id),
      };
    }

    if (slug === 'life_group_leader' && user.leadingLifeGroup) {
      return {
        unrestricted: false, areaIds: [], sectorIds: [],
        lifeGroupIds: [user.leadingLifeGroup.id],
      };
    }

    return { unrestricted: false, areaIds: [], sectorIds: [], lifeGroupIds: [] };
  }
}
```

> **Note:** This assumes `User` has `leadingArea`, `leadingSector`, `leadingLifeGroup` one-to-one relations. If they don't yet exist, add them to `User` entity in this task (simple `@OneToOne` back-references). Also `LifeGroup` needs a `sector` relation. Inspect `src/users/entities/user.entity.ts` and `src/life-groups/entities/life-group.entity.ts` first; if relations are absent, add them and include in the migration in Task 3.

- [ ] **Step 2: Decorator + Guard**

```typescript
// src/forms-core/decorators/form-scope.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const FORM_SCOPE_KEY = 'form_scope';
export const FormScope = (slug: string) => SetMetadata(FORM_SCOPE_KEY, slug);
```

```typescript
// src/forms-core/guards/scope.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeResolverService } from '../services/scope-resolver.service';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolver: ScopeResolverService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    req.formScope = await this.resolver.resolve(user.id);
    return true;
  }
}
```

The guard *populates* `req.formScope` for the controller/service to use as a `WHERE` clause filter. It always returns true; per-form services apply the scope.

- [ ] **Step 3: Test scope resolution**

```typescript
// src/forms-core/services/scope-resolver.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { ScopeResolverService } from './scope-resolver.service';

describe('ScopeResolverService', () => {
  let service: ScopeResolverService;
  let userRepo: any; let lifeRepo: any;

  beforeEach(async () => {
    userRepo = { findOne: jest.fn() };
    lifeRepo = { find: jest.fn().mockResolvedValue([]) };
    const m = await Test.createTestingModule({
      providers: [
        ScopeResolverService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(LifeGroup), useValue: lifeRepo },
      ],
    }).compile();
    service = m.get(ScopeResolverService);
  });

  it('returns unrestricted for admin', async () => {
    userRepo.findOne.mockResolvedValue({ id: 1, role: { slug: 'admin' } });
    const scope = await service.resolve(1);
    expect(scope.unrestricted).toBe(true);
  });

  it('returns life-only scope for life_group_leader', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 2, role: { slug: 'life_group_leader' },
      leadingLifeGroup: { id: 'lg-1' },
    });
    const scope = await service.resolve(2);
    expect(scope).toMatchObject({ unrestricted: false, lifeGroupIds: ['lg-1'] });
  });
});
```

- [ ] **Step 4: Update forms-core.module.ts**

Add `ScopeResolverService`, `ScopeGuard` to providers; add `User`, `LifeGroup` to `TypeOrmModule.forFeature`. Export `ScopeResolverService` and `ScopeGuard`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/forms-core
git commit -m "feat(forms-core): add cascade scope resolver and guard"
```

---

## Task 3: forms-core — FormSubmissionPolicy (edit/delete rules)

**Files:**
- Create: `src/forms-core/services/form-submission-policy.service.ts`
- Test: `src/forms-core/services/form-submission-policy.service.spec.ts`

- [ ] **Step 1: Policy service**

```typescript
// src/forms-core/services/form-submission-policy.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface SubmissionLike {
  submittedById: number;
  createdAt: Date;
  deletedAt?: Date | null;
}

export interface ActorLike {
  id: number;
  roleSlug: string;
}

@Injectable()
export class FormSubmissionPolicyService {
  canEdit(actor: ActorLike, submission: SubmissionLike): boolean {
    if (submission.deletedAt) return false;
    if (actor.roleSlug === 'admin') return true;
    if (actor.id !== submission.submittedById) return false;
    return Date.now() - submission.createdAt.getTime() < TWENTY_FOUR_HOURS_MS;
  }

  canDelete(actor: ActorLike): boolean {
    return actor.roleSlug === 'admin';
  }

  assertCanEdit(actor: ActorLike, s: SubmissionLike) {
    if (!this.canEdit(actor, s)) throw new ForbiddenException('Edit not allowed');
  }

  assertCanDelete(actor: ActorLike) {
    if (!this.canDelete(actor)) throw new ForbiddenException('Delete not allowed (admin only)');
  }
}
```

- [ ] **Step 2: Tests**

```typescript
// src/forms-core/services/form-submission-policy.service.spec.ts
import { FormSubmissionPolicyService } from './form-submission-policy.service';

describe('FormSubmissionPolicyService', () => {
  const policy = new FormSubmissionPolicyService();
  const fresh = { submittedById: 1, createdAt: new Date(), deletedAt: null };
  const stale = { submittedById: 1, createdAt: new Date(Date.now() - 25 * 3600_000), deletedAt: null };

  it('admin can edit anything', () => {
    expect(policy.canEdit({ id: 99, roleSlug: 'admin' }, stale)).toBe(true);
  });
  it('owner can edit within 24h', () => {
    expect(policy.canEdit({ id: 1, roleSlug: 'member' }, fresh)).toBe(true);
  });
  it('owner cannot edit after 24h', () => {
    expect(policy.canEdit({ id: 1, roleSlug: 'member' }, stale)).toBe(false);
  });
  it('non-owner cannot edit', () => {
    expect(policy.canEdit({ id: 2, roleSlug: 'pastor' }, fresh)).toBe(false);
  });
  it('only admin can delete', () => {
    expect(policy.canDelete({ id: 1, roleSlug: 'pastor' })).toBe(false);
    expect(policy.canDelete({ id: 1, roleSlug: 'admin' })).toBe(true);
  });
});
```

- [ ] **Step 3: Add to forms-core module providers and exports**

- [ ] **Step 4: Run tests + commit**

```bash
npx jest src/forms-core/services/form-submission-policy.service.spec.ts
git add backend/src/forms-core
git commit -m "feat(forms-core): add FormSubmissionPolicy with 24h edit window"
```

---

## Task 4: forms-core — NotificationSender + ChurchSettingsService + Resend

**Files:**
- Create: `src/forms-core/services/notification-sender.ts`
- Create: `src/forms-core/services/church-settings.service.ts`
- Test: `src/forms-core/services/notification-sender.spec.ts`

> **Pre-step**: inspect existing church/igreja info module if it exists (`grep -r church-info src backend`). The spec says contact email lives in admin Configurações → Informações da Igreja. If a `church_settings` table or similar exists, reuse it. If not, create a minimal `ChurchSetting` key/value table; for v1 only `contact_email` key matters.

- [ ] **Step 1: Church settings service**

```typescript
// src/forms-core/services/church-settings.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchSetting } from '../entities/church-setting.entity';

@Injectable()
export class ChurchSettingsService {
  constructor(
    @InjectRepository(ChurchSetting)
    private readonly repo: Repository<ChurchSetting>,
  ) {}

  async getContactEmail(): Promise<string> {
    const row = await this.repo.findOne({ where: { key: 'contact_email' } });
    return row?.value || process.env.DEFAULT_FROM_EMAIL || 'contato@igrejapaz.com.br';
  }
}
```

Plus `ChurchSetting` entity:

```typescript
// src/forms-core/entities/church-setting.entity.ts
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('church_settings')
export class ChurchSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 2: NotificationSender interface + Resend impl**

```typescript
// src/forms-core/services/notification-sender.ts
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ChurchSettingsService } from './church-settings.service';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export abstract class NotificationSender {
  abstract sendEmail(payload: EmailPayload): Promise<void>;
  abstract sendWhatsApp(to: string, body: string): Promise<void>;
}

@Injectable()
export class ResendNotificationSender extends NotificationSender {
  private readonly logger = new Logger(ResendNotificationSender.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  constructor(private readonly settings: ChurchSettingsService) { super(); }

  async sendEmail({ to, subject, html }: EmailPayload): Promise<void> {
    const from = await this.settings.getContactEmail();
    try {
      await this.resend.emails.send({ from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err as Error);
      // fire-and-forget — do not throw; caller should not block on email
    }
  }

  async sendWhatsApp(_to: string, _body: string): Promise<void> {
    this.logger.warn('WhatsApp deferred to v2 — noop');
  }
}
```

- [ ] **Step 3: Test (mock Resend client)**

```typescript
// src/forms-core/services/notification-sender.spec.ts
import { Test } from '@nestjs/testing';
import { ChurchSettingsService } from './church-settings.service';
import { ResendNotificationSender } from './notification-sender';

const sendMock = jest.fn().mockResolvedValue({});
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

describe('ResendNotificationSender', () => {
  let sender: ResendNotificationSender;

  beforeEach(async () => {
    sendMock.mockClear();
    const m = await Test.createTestingModule({
      providers: [
        ResendNotificationSender,
        { provide: ChurchSettingsService, useValue: { getContactEmail: jest.fn().mockResolvedValue('contato@igrejapaz.com.br') } },
      ],
    }).compile();
    sender = m.get(ResendNotificationSender);
  });

  it('sends email using the church contact email as from', async () => {
    await sender.sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' });
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      from: 'contato@igrejapaz.com.br', to: 'a@b.com',
    }));
  });

  it('does not throw when send fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('boom'));
    await expect(sender.sendEmail({ to: 'a@b.com', subject: 's', html: 'h' })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 4: Wire into forms-core.module.ts**

Add `ChurchSetting` to `TypeOrmModule.forFeature`, register `ChurchSettingsService` and `{ provide: NotificationSender, useClass: ResendNotificationSender }`. Export both.

- [ ] **Step 5: Commit**

```bash
git add backend/src/forms-core
git commit -m "feat(forms-core): add Resend notification sender + church settings"
```

---

## Task 5: Migration — all 11 tables in one shot

**Files:**
- Create: `backend/database/migrations/<timestamp>-CreateFormulariosSchema.ts`

> **Why one migration:** Atomic rollout, single timestamp easy to reason about. Tables are co-introduced.

- [ ] **Step 1: Generate skeleton**

```bash
cd backend
npm run migration:create -- database/migrations/CreateFormulariosSchema
```

- [ ] **Step 2: Fill in `up()` — full DDL**

```typescript
public async up(qr: QueryRunner): Promise<void> {
  // 1. Audit log
  await qr.query(`
    CREATE TABLE form_submission_audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      form_slug varchar(64) NOT NULL,
      submission_id varchar(64) NOT NULL,
      "actorId" int NOT NULL REFERENCES users(id),
      action varchar(16) NOT NULL,
      diff jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_audit_form_submission ON form_submission_audit_log(form_slug, submission_id);
  `);

  // 2. Church settings (simple kv)
  await qr.query(`
    CREATE TABLE church_settings (
      key varchar(64) PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // 3. Courses + form_course_links
  await qr.query(`
    CREATE TABLE courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(120) NOT NULL,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE form_course_links (
      form_slug varchar(64) NOT NULL,
      course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      display_order int NOT NULL DEFAULT 0,
      PRIMARY KEY (form_slug, course_id)
    );
  `);

  // 4. Common form columns helper note: each form table ends with these columns
  //    submitted_by_id int NOT NULL REFERENCES users(id),
  //    area_id uuid, sector_id uuid, life_group_id uuid,
  //    created_at, updated_at, deleted_at

  // 5. member_registrations
  await qr.query(`
    CREATE TABLE member_registrations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar(180) NOT NULL,
      full_name varchar(180) NOT NULL,
      birthday date NOT NULL,
      phone varchar(32) NOT NULL,
      address text NOT NULL,
      sector_id uuid NOT NULL,
      life_group_id uuid NOT NULL,
      leader_id int NOT NULL REFERENCES users(id),
      completed_courses uuid[] NOT NULL DEFAULT '{}',
      "submittedById" int NOT NULL REFERENCES users(id),
      area_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    CREATE INDEX idx_mreg_scope ON member_registrations(area_id, sector_id, life_group_id);
  `);

  // 6. conversions
  await qr.query(`
    CREATE TABLE conversions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name varchar(180) NOT NULL,
      email varchar(180) NOT NULL,
      phone varchar(32) NOT NULL,
      decision_type varchar(20) NOT NULL,
      how_met_church varchar(40) NOT NULL,
      how_met_church_other varchar(180),
      gender varchar(2) NOT NULL,
      birth_date date NOT NULL,
      civil_state varchar(20) NOT NULL,
      address text NOT NULL,
      attendance_count varchar(40) NOT NULL,
      life_group_status varchar(40) NOT NULL,
      life_group_leader_or_name varchar(180),
      invited_by varchar(180),
      notes text,
      "submittedById" int NOT NULL REFERENCES users(id),
      area_id uuid, sector_id uuid, life_group_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    CREATE INDEX idx_conv_scope ON conversions(area_id, sector_id, life_group_id);
  `);

  // 7. life_group_reports
  await qr.query(`
    CREATE TABLE life_group_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date date NOT NULL,
      area_id uuid NOT NULL,
      sector_id uuid NOT NULL,
      life_group_id uuid NOT NULL,
      committed_members int NOT NULL,
      committed_members_present int NOT NULL,
      kids_0_to_11 int NOT NULL,
      guests int NOT NULL,
      mdas int NOT NULL,
      offering numeric(10,2) NOT NULL DEFAULT 0,
      committed_at_tadel int NOT NULL,
      committed_at_culto int NOT NULL,
      leader_attended text[] NOT NULL DEFAULT '{}',
      disciples_count int NOT NULL,
      disciples_discipled_this_week int NOT NULL,
      pastoring_activity_type varchar(40) NOT NULL,
      pastoring_activity_other varchar(180),
      pastoring_activity_objective text,
      training_activity_type varchar(40) NOT NULL,
      training_activity_other varchar(180),
      "submittedById" int NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    CREATE INDEX idx_lgr_scope ON life_group_reports(area_id, sector_id, life_group_id);
    CREATE INDEX idx_lgr_date ON life_group_reports(date);
  `);

  // 8. sector_supervisor_reports
  await qr.query(`
    CREATE TABLE sector_supervisor_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date date NOT NULL,
      sector_id uuid NOT NULL,
      area_id uuid,
      life_groups_visited uuid[] NOT NULL DEFAULT '{}',
      leaders_pastored uuid[] NOT NULL DEFAULT '{}',
      meetings_held int NOT NULL,
      trainings_conducted int NOT NULL,
      multiplication_candidates uuid[] NOT NULL DEFAULT '{}',
      notes text,
      "submittedById" int NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    CREATE INDEX idx_ssr_scope ON sector_supervisor_reports(area_id, sector_id);
  `);

  // 9. area_supervisor_reports
  await qr.query(`
    CREATE TABLE area_supervisor_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date date NOT NULL,
      area_id uuid NOT NULL,
      sectors_visited uuid[] NOT NULL DEFAULT '{}',
      sector_leaders_pastored uuid[] NOT NULL DEFAULT '{}',
      meetings_held int NOT NULL,
      trainings_conducted int NOT NULL,
      multiplications_in_progress int,
      notes text,
      "submittedById" int NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    CREATE INDEX idx_asr_scope ON area_supervisor_reports(area_id);
  `);

  // 10. multiplications
  await qr.query(`
    CREATE TABLE multiplications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date date NOT NULL,
      source_life_group_id uuid NOT NULL,
      area_id uuid NOT NULL,
      sector_id uuid NOT NULL,
      completed_leadership_track boolean NOT NULL,
      legally_married boolean NOT NULL,
      faithful_tither boolean NOT NULL,
      evangelizing_and_consolidating boolean NOT NULL,
      good_testimony boolean NOT NULL,
      single_living_in_purity boolean,
      new_life_group_id uuid,
      new_life_group_name varchar(180) NOT NULL,
      new_leader_id int NOT NULL REFERENCES users(id),
      host_id int NOT NULL REFERENCES users(id),
      address text NOT NULL,
      leader_phone varchar(32) NOT NULL,
      meeting_day_time timestamptz NOT NULL,
      members_to_move int[] NOT NULL DEFAULT '{}',
      new_members int[] NOT NULL DEFAULT '{}',
      "submittedById" int NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    CREATE INDEX idx_mult_scope ON multiplications(area_id, sector_id);
  `);

  // 11. service_reports
  await qr.query(`
    CREATE TABLE service_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date date NOT NULL,
      service_type varchar(40) NOT NULL,
      service_type_other varchar(180),
      total_attendance int NOT NULL,
      members_present int NOT NULL,
      guests_present int NOT NULL,
      kids_present int NOT NULL,
      decisions_for_christ int NOT NULL,
      reconciliations int NOT NULL,
      baptism_candidates int,
      offering numeric(10,2) NOT NULL,
      notes text,
      "submittedById" int NOT NULL REFERENCES users(id),
      area_id uuid, sector_id uuid, life_group_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    CREATE INDEX idx_sr_date ON service_reports(date);
  `);

  // 12. guests
  await qr.query(`
    CREATE TABLE guests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name varchar(180) NOT NULL,
      email varchar(180),
      phone varchar(32) NOT NULL,
      address text,
      invited_by varchar(180) NOT NULL,
      how_met_church varchar(40),
      notes text,
      "submittedById" int NOT NULL REFERENCES users(id),
      area_id uuid, sector_id uuid, life_group_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    CREATE INDEX idx_guests_scope ON guests(area_id, sector_id, life_group_id);
  `);

  // 13. Seed courses
  await qr.query(`
    INSERT INTO courses (name) VALUES
      ('Acompanhamento Inicial Nível 1'),
      ('Acompanhamento Inicial Nível 2'),
      ('Nova Criatura'),
      ('Estação DNA'),
      ('Expresso 1'),
      ('Expresso 2'),
      ('Café com Pastor'),
      ('É Batizado'),
      ('Encontro com Deus');
  `);
  await qr.query(`
    INSERT INTO form_course_links (form_slug, course_id, display_order)
    SELECT 'member-registrations', id, ROW_NUMBER() OVER (ORDER BY name)
    FROM courses;
  `);
}
```

- [ ] **Step 3: `down()` drops tables in reverse order**

```typescript
public async down(qr: QueryRunner): Promise<void> {
  for (const t of [
    'guests','service_reports','multiplications','area_supervisor_reports',
    'sector_supervisor_reports','life_group_reports','conversions','member_registrations',
    'form_course_links','courses','church_settings','form_submission_audit_log',
  ]) await qr.query(`DROP TABLE IF EXISTS ${t} CASCADE;`);
}
```

- [ ] **Step 4: Run + verify**

```bash
cd backend
npm run migration:run
psql -h localhost -U $DB_USERNAME -d $DB_NAME -c "\dt" | grep -E '(form|course|guest|conversion|multiplication|service_report)'
```

Expect 12+ tables listed.

- [ ] **Step 5: Commit**

```bash
git add backend/database/migrations
git commit -m "feat(db): add formulários schema (11 tables + seeds)"
```

---

## Task 6: Courses module (CRUD + form linking)

**Files:**
- Create: `src/courses/courses.module.ts`
- Create: `src/courses/entities/course.entity.ts`
- Create: `src/courses/entities/form-course-link.entity.ts`
- Create: `src/courses/dto/{create,update}-course.dto.ts`
- Create: `src/courses/courses.service.ts`
- Create: `src/courses/courses.controller.ts`
- Test: `src/courses/courses.service.spec.ts`

The controller routes mounted at `/api/forms/member-registrations/courses` (per spec §5).

- [ ] **Step 1: Entities**

```typescript
// src/courses/entities/course.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 120 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
```

```typescript
// src/courses/entities/form-course-link.entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('form_course_links')
export class FormCourseLink {
  @PrimaryColumn({ name: 'form_slug', type: 'varchar', length: 64 }) formSlug: string;
  @PrimaryColumn({ name: 'course_id', type: 'uuid' }) courseId: string;
  @Column({ name: 'display_order', type: 'int', default: 0 }) displayOrder: number;
}
```

- [ ] **Step 2: DTOs**

```typescript
// src/courses/dto/create-course.dto.ts
import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCourseDto {
  @Expose() @IsString() name: string;
  @Expose() @IsOptional() @IsString() description?: string;
  @Expose({ name: 'is_active' }) @IsOptional() @IsBoolean() isActive?: boolean;
  @Expose({ name: 'display_order' }) @IsOptional() displayOrder?: number;
}
```

```typescript
// src/courses/dto/update-course.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
```

- [ ] **Step 3: Service**

```typescript
// src/courses/courses.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { FormCourseLink } from './entities/form-course-link.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(FormCourseLink) private readonly links: Repository<FormCourseLink>,
  ) {}

  async listForForm(formSlug: string): Promise<(Course & { display_order: number })[]> {
    const linked = await this.links.find({ where: { formSlug }, order: { displayOrder: 'ASC' } });
    if (!linked.length) return [];
    const ids = linked.map(l => l.courseId);
    const courses = await this.courses.find({ where: ids.map(id => ({ id, isActive: true })) });
    return linked
      .map(l => ({ course: courses.find(c => c.id === l.courseId), order: l.displayOrder }))
      .filter(x => x.course)
      .map(x => ({ ...x.course!, display_order: x.order }));
  }

  async createAndLink(formSlug: string, dto: CreateCourseDto): Promise<Course> {
    const course = await this.courses.save(this.courses.create({
      name: dto.name, description: dto.description ?? null, isActive: dto.isActive ?? true,
    }));
    const max = await this.links.maximum('displayOrder', { formSlug }) ?? 0;
    await this.links.insert({ formSlug, courseId: course.id, displayOrder: dto.displayOrder ?? max + 1 });
    return course;
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    const c = await this.courses.findOneBy({ id });
    if (!c) throw new NotFoundException();
    Object.assign(c, dto);
    return this.courses.save(c);
  }

  async unlink(formSlug: string, courseId: string): Promise<void> {
    await this.links.delete({ formSlug, courseId });
  }
}
```

- [ ] **Step 4: Controller**

```typescript
// src/courses/courses.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('forms/member-registrations/courses')
  list() { return this.courses.listForForm('member-registrations'); }

  @Post('forms/member-registrations/courses')
  @UseGuards(RolesGuard) @Roles('admin')
  create(@Body() dto: CreateCourseDto) {
    return this.courses.createAndLink('member-registrations', dto);
  }

  @Patch('courses/:id')
  @UseGuards(RolesGuard) @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(id, dto);
  }

  @Delete('forms/member-registrations/courses/:id')
  @UseGuards(RolesGuard) @Roles('admin')
  unlink(@Param('id') id: string) {
    return this.courses.unlink('member-registrations', id);
  }
}
```

- [ ] **Step 5: Module + register in AppModule**

```typescript
// src/courses/courses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { FormCourseLink } from './entities/form-course-link.entity';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, FormCourseLink])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
```

Add `CoursesModule` to `imports` of `src/app.module.ts`.

- [ ] **Step 6: Service test**

```typescript
// src/courses/courses.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { FormCourseLink } from './entities/form-course-link.entity';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let coursesRepo: any; let linksRepo: any;

  beforeEach(async () => {
    coursesRepo = { save: jest.fn(), create: jest.fn(x => x), find: jest.fn(), findOneBy: jest.fn() };
    linksRepo = { find: jest.fn().mockResolvedValue([]), insert: jest.fn(), delete: jest.fn(), maximum: jest.fn().mockResolvedValue(0) };
    const m = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: getRepositoryToken(Course), useValue: coursesRepo },
        { provide: getRepositoryToken(FormCourseLink), useValue: linksRepo },
      ],
    }).compile();
    service = m.get(CoursesService);
  });

  it('createAndLink saves a course and links it to the form', async () => {
    coursesRepo.save.mockResolvedValue({ id: 'c1', name: 'Nova Criatura' });
    await service.createAndLink('member-registrations', { name: 'Nova Criatura' } as any);
    expect(linksRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      formSlug: 'member-registrations', courseId: 'c1',
    }));
  });
});
```

- [ ] **Step 7: Run tests + commit**

```bash
npx jest src/courses
git add backend/src/courses backend/src/app.module.ts
git commit -m "feat(courses): CRUD and form linking endpoints"
```

---

## Task 7: Forms catalog endpoint (`GET /api/forms`)

**Files:**
- Create: `src/forms-catalog/forms-catalog.module.ts`
- Create: `src/forms-catalog/forms-catalog.service.ts`
- Create: `src/forms-catalog/forms-catalog.controller.ts`
- Test: `src/forms-catalog/forms-catalog.service.spec.ts`

Returns the 8 forms with permissions resolved per role for the current user. Drives both admin hub and mobile list.

- [ ] **Step 1: Static catalog definition**

```typescript
// src/forms-catalog/forms-catalog.service.ts
import { Injectable } from '@nestjs/common';

export interface FormCatalogEntry {
  slug: string;
  name: string;
  description: string;
  can_write: boolean;
  can_read: boolean;
}

const FORM_DEFINITIONS = [
  { slug: 'member-registrations', name: 'Cadastro do Membro', description: 'Registrar um novo membro',
    write: ['admin','pastor','area_leader','sector_leader','life_group_leader'],
    read:  ['admin','pastor','area_leader','sector_leader','life_group_leader'] },
  { slug: 'conversions', name: 'Conversão e Reconciliação', description: 'Decisão por Cristo',
    write: ['admin','pastor','area_leader','sector_leader','life_group_leader'],
    read:  ['admin','pastor','area_leader','sector_leader','life_group_leader'] },
  { slug: 'life-group-reports', name: 'Relatório de Life Group', description: 'Relatório semanal do LG',
    write: ['admin','pastor','area_leader','sector_leader','life_group_leader'],
    read:  ['admin','pastor','area_leader','sector_leader','life_group_leader'] },
  { slug: 'sector-supervisor-reports', name: 'Atividades Supervisor de Setor', description: 'Relatório semanal do setor',
    write: ['admin','pastor','sector_leader'],
    read:  ['admin','pastor','area_leader','sector_leader'] },
  { slug: 'area-supervisor-reports', name: 'Atividades Supervisor de Área', description: 'Relatório semanal da área',
    write: ['admin','pastor','area_leader'],
    read:  ['admin','pastor','area_leader'] },
  { slug: 'multiplications', name: 'Multiplicação', description: 'Multiplicar um life group',
    write: ['admin','pastor','area_leader'],
    read:  ['admin','pastor','area_leader'] },
  { slug: 'service-reports', name: 'Relatório do Culto', description: 'Relatório do culto/oração',
    write: ['admin','pastor','area_leader','sector_leader','life_group_leader'],
    read:  ['admin','pastor','area_leader','sector_leader','life_group_leader'] },
  { slug: 'guests', name: 'Convidado', description: 'Registrar um convidado',
    write: ['admin','pastor','area_leader','sector_leader','life_group_leader'],
    read:  ['admin','pastor','area_leader','sector_leader','life_group_leader'] },
];

@Injectable()
export class FormsCatalogService {
  listForRole(roleSlug: string): FormCatalogEntry[] {
    return FORM_DEFINITIONS.map(f => ({
      slug: f.slug, name: f.name, description: f.description,
      can_write: f.write.includes(roleSlug),
      can_read: f.read.includes(roleSlug),
    })).filter(f => f.can_read || f.can_write);
  }
}
```

- [ ] **Step 2: Controller**

```typescript
// src/forms-catalog/forms-catalog.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FormsCatalogService } from './forms-catalog.service';

@UseGuards(AuthGuard('jwt'))
@Controller('forms')
export class FormsCatalogController {
  constructor(private readonly catalog: FormsCatalogService) {}

  @Get()
  list(@Req() req: any) {
    const roleSlug = req.user?.role?.slug ?? 'member';
    return this.catalog.listForRole(roleSlug);
  }
}
```

> **Note:** the JWT strategy currently puts `{ userId, email }` on `req.user`. You may need to extend it to include `role.slug` (load from DB in `validate()`) or fetch role in the controller. Check `src/auth/jwt.strategy.ts` and adjust here.

- [ ] **Step 3: Module + register in AppModule**

- [ ] **Step 4: Test**

```typescript
import { FormsCatalogService } from './forms-catalog.service';
describe('FormsCatalogService', () => {
  const s = new FormsCatalogService();
  it('admin sees all 8 forms with read+write', () => {
    const r = s.listForRole('admin');
    expect(r).toHaveLength(8);
    expect(r.every(f => f.can_read && f.can_write)).toBe(true);
  });
  it('member sees nothing (filtered out)', () => {
    expect(s.listForRole('member')).toHaveLength(0);
  });
  it('life_group_leader sees 6 forms', () => {
    expect(s.listForRole('life_group_leader')).toHaveLength(6);
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/forms-catalog backend/src/app.module.ts
git commit -m "feat(forms-catalog): add GET /api/forms with role-resolved permissions"
```

---

## Task 8: Form 1 — Cadastro do Membro (template form, full TDD)

This is the most involved form: side effects (pending user, onboarding email, member path). All subsequent forms follow this same pattern (entity + DTO + service + controller + tests + AppModule registration).

**Files:**
- Create: `src/member-registrations/member-registrations.module.ts`
- Create: `src/member-registrations/entities/member-registration.entity.ts`
- Create: `src/member-registrations/dto/create-member-registration.dto.ts`
- Create: `src/member-registrations/dto/update-member-registration.dto.ts`
- Create: `src/member-registrations/member-registrations.service.ts`
- Create: `src/member-registrations/member-registrations.controller.ts`
- Create: `src/member-registrations/services/onboarding.service.ts`
- Test: `src/member-registrations/member-registrations.service.spec.ts`
- Test: `src/member-registrations/services/onboarding.service.spec.ts`

- [ ] **Step 1: Entity**

```typescript
// src/member-registrations/entities/member-registration.entity.ts
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('member_registrations')
export class MemberRegistration {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 180 }) email: string;
  @Column({ name: 'full_name', type: 'varchar', length: 180 }) fullName: string;
  @Column({ type: 'date' }) birthday: string;
  @Column({ type: 'varchar', length: 32 }) phone: string;
  @Column({ type: 'text' }) address: string;
  @Column({ name: 'sector_id', type: 'uuid' }) sectorId: string;
  @Column({ name: 'life_group_id', type: 'uuid' }) lifeGroupId: string;
  @Column({ name: 'leader_id', type: 'int' }) leaderId: number;
  @Column({ name: 'completed_courses', type: 'uuid', array: true, default: () => "'{}'" })
  completedCourses: string[];
  @Column({ name: 'area_id', type: 'uuid', nullable: true }) areaId: string | null;

  @ManyToOne(() => User, { nullable: false }) submittedBy: User;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
```

- [ ] **Step 2: DTO**

```typescript
// src/member-registrations/dto/create-member-registration.dto.ts
import { Expose } from 'class-transformer';
import { ArrayUnique, IsArray, IsDateString, IsEmail, IsInt, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateMemberRegistrationDto {
  @Expose() @IsEmail() email: string;
  @Expose({ name: 'full_name' }) @IsString() @Length(2, 180) fullName: string;
  @Expose() @IsDateString() birthday: string;
  @Expose() @IsString() @Matches(/^\+?[0-9]{8,15}$/) phone: string;
  @Expose() @IsString() address: string;
  @Expose({ name: 'sector_id' }) @IsUUID() sectorId: string;
  @Expose({ name: 'life_group_id' }) @IsUUID() lifeGroupId: string;
  @Expose({ name: 'leader_id' }) @IsInt() leaderId: number;
  @Expose({ name: 'completed_courses' }) @IsOptional() @IsArray() @ArrayUnique() @IsUUID('all', { each: true })
  completedCourses?: string[];
}
```

```typescript
// src/member-registrations/dto/update-member-registration.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateMemberRegistrationDto } from './create-member-registration.dto';
export class UpdateMemberRegistrationDto extends PartialType(CreateMemberRegistrationDto) {}
```

- [ ] **Step 3: OnboardingService (side-effect)**

```typescript
// src/member-registrations/services/onboarding.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationSender } from '../../forms-core/services/notification-sender';
import { MemberRegistration } from '../entities/member-registration.entity';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationSender,
  ) {}

  async onSubmit(reg: MemberRegistration): Promise<void> {
    let user = await this.users.findOne({ where: { email: reg.email } });
    if (!user) {
      user = this.users.create({
        email: reg.email, name: reg.fullName, phoneNumber: reg.phone,
        status: 'pending_first_login' as any,
      });
    } else {
      user.name = reg.fullName; user.phoneNumber = reg.phone;
    }
    await this.users.save(user);
    void this.notifications.sendEmail({
      to: reg.email,
      subject: 'Bem-vindo à Igreja Paz Curitiba',
      html: this.buildEmail(reg.fullName),
    });
  }

  private buildEmail(name: string): string {
    return `
      <h1>Olá, ${name}!</h1>
      <p>Seu cadastro foi recebido. Baixe o app Paz Curitiba:</p>
      <ul>
        <li><a href="https://apps.apple.com/app/paz-curitiba">App Store</a></li>
        <li><a href="https://play.google.com/store/apps/details?id=br.com.igrejapaz">Google Play</a></li>
      </ul>
    `;
  }
}
```

- [ ] **Step 4: Service**

```typescript
// src/member-registrations/member-registrations.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { MemberRegistration } from './entities/member-registration.entity';
import { CreateMemberRegistrationDto } from './dto/create-member-registration.dto';
import { UpdateMemberRegistrationDto } from './dto/update-member-registration.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { OnboardingService } from './services/onboarding.service';

const SLUG = 'member-registrations';

@Injectable()
export class MemberRegistrationsService {
  constructor(
    @InjectRepository(MemberRegistration) private readonly repo: Repository<MemberRegistration>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
    private readonly onboarding: OnboardingService,
  ) {}

  async create(dto: CreateMemberRegistrationDto, actorId: number): Promise<MemberRegistration> {
    const reg = await this.repo.save(this.repo.create({
      ...dto,
      submittedBy: { id: actorId } as any,
    }));
    await this.audit.record({ formSlug: SLUG, submissionId: reg.id, actorId, action: 'create' });
    await this.onboarding.onSubmit(reg);
    return reg;
  }

  async list(scope: ResolvedScope) {
    const qb = this.repo.createQueryBuilder('m').where('m.deleted_at IS NULL');
    if (!scope.unrestricted) {
      qb.andWhere('(m.submittedById = :uid OR m.life_group_id = ANY(:lgs))',
        { uid: -1, lgs: scope.lifeGroupIds.length ? scope.lifeGroupIds : ['00000000-0000-0000-0000-000000000000'] });
    }
    return qb.orderBy('m.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<MemberRegistration> {
    const m = await this.repo.findOne({ where: { id }, relations: ['submittedBy'] });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(id: string, dto: UpdateMemberRegistrationDto, actor: { id: number; roleSlug: string }) {
    const m = await this.findOne(id);
    this.policy.assertCanEdit(actor, { submittedById: m.submittedBy.id, createdAt: m.createdAt, deletedAt: m.deletedAt });
    Object.assign(m, dto);
    const saved = await this.repo.save(m);
    await this.audit.record({ formSlug: SLUG, submissionId: id, actorId: actor.id, action: 'update', diff: dto as any });
    return saved;
  }

  async softDelete(id: string, actor: { id: number; roleSlug: string }) {
    this.policy.assertCanDelete(actor);
    await this.repo.softDelete(id);
    await this.audit.record({ formSlug: SLUG, submissionId: id, actorId: actor.id, action: 'delete' });
  }
}
```

- [ ] **Step 5: Controller**

```typescript
// src/member-registrations/member-registrations.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberRegistrationsService } from './member-registrations.service';
import { CreateMemberRegistrationDto } from './dto/create-member-registration.dto';
import { UpdateMemberRegistrationDto } from './dto/update-member-registration.dto';

@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('forms/member-registrations')
export class MemberRegistrationsController {
  constructor(private readonly svc: MemberRegistrationsService) {}

  @Get() list(@Req() req: any) { return this.svc.list(req.formScope); }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin','pastor','area_leader','sector_leader','life_group_leader')
  create(@Body() dto: CreateMemberRegistrationDto, @Req() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemberRegistrationDto, @Req() req: any) {
    return this.svc.update(id, dto, { id: req.user.id, roleSlug: req.user.role?.slug ?? 'member' });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.softDelete(id, { id: req.user.id, roleSlug: req.user.role?.slug ?? 'member' });
  }
}
```

- [ ] **Step 6: Module + register**

```typescript
// src/member-registrations/member-registrations.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberRegistration } from './entities/member-registration.entity';
import { MemberRegistrationsService } from './member-registrations.service';
import { MemberRegistrationsController } from './member-registrations.controller';
import { OnboardingService } from './services/onboarding.service';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MemberRegistration, User]), FormsCoreModule],
  controllers: [MemberRegistrationsController],
  providers: [MemberRegistrationsService, OnboardingService],
})
export class MemberRegistrationsModule {}
```

Add to `AppModule.imports`.

- [ ] **Step 7: Tests**

```typescript
// src/member-registrations/services/onboarding.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationSender } from '../../forms-core/services/notification-sender';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let users: any; let notifications: any;

  beforeEach(async () => {
    users = { findOne: jest.fn(), create: jest.fn(x => x), save: jest.fn(x => x) };
    notifications = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const m = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: NotificationSender, useValue: notifications },
      ],
    }).compile();
    service = m.get(OnboardingService);
  });

  it('creates user with pending_first_login when none exists', async () => {
    users.findOne.mockResolvedValue(null);
    await service.onSubmit({ email: 'x@y', fullName: 'X Y', phone: '+5511' } as any);
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'x@y', status: 'pending_first_login',
    }));
  });

  it('updates existing user instead of creating duplicate', async () => {
    users.findOne.mockResolvedValue({ id: 5, email: 'x@y' });
    await service.onSubmit({ email: 'x@y', fullName: 'New Name', phone: '+5511' } as any);
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ id: 5, name: 'New Name' }));
  });

  it('sends onboarding email after persisting', async () => {
    users.findOne.mockResolvedValue(null);
    await service.onSubmit({ email: 'x@y', fullName: 'X Y', phone: '+5511' } as any);
    expect(notifications.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'x@y' }));
  });
});
```

- [ ] **Step 8: Run tests + smoke (curl)**

```bash
cd backend
npx jest src/member-registrations
npm run start:dev &
# in another shell, after auth token obtained:
curl -X POST http://localhost:3001/api/forms/member-registrations \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","full_name":"Ana","birthday":"1990-01-01","phone":"+5511999999999","address":"R X","sector_id":"<uuid>","life_group_id":"<uuid>","leader_id":1}'
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/member-registrations backend/src/app.module.ts
git commit -m "feat(forms): add Cadastro do Membro form (POST/GET/PATCH/DELETE) with onboarding email"
```

---

## Task 9: Form 2 — Conversões

**Files:** mirror Task 8 under `src/conversions/`. Side-effect: `ConversionMatchService` matches/creates user and updates member path (Trilho).

- [ ] **Step 1: Entity** (fields per spec §3.2)

```typescript
// src/conversions/entities/conversion.entity.ts
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('conversions')
export class Conversion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'full_name' }) fullName: string;
  @Column() email: string;
  @Column() phone: string;
  @Column({ name: 'decision_type' }) decisionType: 'first_time' | 'reconciliation';
  @Column({ name: 'how_met_church' }) howMetChurch: string;
  @Column({ name: 'how_met_church_other', nullable: true }) howMetChurchOther: string | null;
  @Column() gender: 'm' | 'f';
  @Column({ name: 'birth_date', type: 'date' }) birthDate: string;
  @Column({ name: 'civil_state' }) civilState: string;
  @Column({ type: 'text' }) address: string;
  @Column({ name: 'attendance_count' }) attendanceCount: string;
  @Column({ name: 'life_group_status' }) lifeGroupStatus: string;
  @Column({ name: 'life_group_leader_or_name', nullable: true }) lifeGroupLeaderOrName: string | null;
  @Column({ name: 'invited_by', nullable: true }) invitedBy: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ name: 'area_id', type: 'uuid', nullable: true }) areaId: string | null;
  @Column({ name: 'sector_id', type: 'uuid', nullable: true }) sectorId: string | null;
  @Column({ name: 'life_group_id', type: 'uuid', nullable: true }) lifeGroupId: string | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
```

- [ ] **Step 2: DTO** (validate `how_met_church_other` required if `how_met_church === 'outro'`; `life_group_leader_or_name` required if `life_group_status === 'sim'`).

```typescript
// src/conversions/dto/create-conversion.dto.ts
import { Expose } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateConversionDto {
  @Expose({ name: 'full_name' }) @IsString() fullName: string;
  @Expose() @IsEmail() email: string;
  @Expose() @IsString() phone: string;
  @Expose({ name: 'decision_type' }) @IsIn(['first_time','reconciliation']) decisionType: string;
  @Expose({ name: 'how_met_church' }) @IsIn(['convite_amigo','convite_parente','redes_sociais','passou_em_frente','outro']) howMetChurch: string;
  @Expose({ name: 'how_met_church_other' })
  @ValidateIf(o => o.howMetChurch === 'outro') @IsString() howMetChurchOther?: string;
  @Expose() @IsIn(['m','f']) gender: string;
  @Expose({ name: 'birth_date' }) @IsDateString() birthDate: string;
  @Expose({ name: 'civil_state' }) @IsIn(['solteiro','casado','divorciado','viuvo']) civilState: string;
  @Expose() @IsString() address: string;
  @Expose({ name: 'attendance_count' }) @IsIn(['primeira_vez','segunda_vez','terceira_vez','mais_de_um_mes']) attendanceCount: string;
  @Expose({ name: 'life_group_status' }) @IsIn(['sim','nao','ja_foi_convidado']) lifeGroupStatus: string;
  @Expose({ name: 'life_group_leader_or_name' })
  @ValidateIf(o => o.lifeGroupStatus === 'sim') @IsString() lifeGroupLeaderOrName?: string;
  @Expose({ name: 'invited_by' }) @IsOptional() @IsString() invitedBy?: string;
  @Expose() @IsOptional() @IsString() notes?: string;
}
```

- [ ] **Step 3: ConversionMatchService** (side-effect; match user by email/phone, create if missing)

```typescript
// src/conversions/services/conversion-match.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversion } from '../entities/conversion.entity';

@Injectable()
export class ConversionMatchService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async onSubmit(c: Conversion): Promise<User> {
    let user = await this.users.findOne({ where: [{ email: c.email }, { phoneNumber: c.phone }] });
    if (!user) {
      user = this.users.create({
        email: c.email, name: c.fullName, phoneNumber: c.phone,
        status: 'pending_first_login' as any,
      });
      await this.users.save(user);
    }
    // TODO: MemberPathService.advance(user, c.decisionType)
    return user;
  }
}
```

> **Note:** `MemberPathService` lives behind a `// TODO:` until the `member_path` table exists. For v1 of this plan, leave it as a `Logger.log` so the email + user creation work end-to-end without blocking; a follow-up plan will wire member_path.

- [ ] **Step 4: Service / Controller / Module / Tests** — mirror Task 8. Controller mounted at `/api/forms/conversions`. Roles: same as member-registrations write list.

- [ ] **Step 5: Commit**

```bash
git add backend/src/conversions backend/src/app.module.ts
git commit -m "feat(forms): add Conversões form with user-match side effect"
```

---

## Task 10: Form 3 — Relatório de Life Group

Mirror Task 8/9 under `src/life-group-reports/`. No external side-effects beyond audit log. Auto-fill `area_id`, `sector_id`, `life_group_id` from leader profile (use `req.user.leadingLifeGroup` etc.).

- [ ] **Step 1: Entity** with all fields from spec §3.3 (decimal offering, text[] leader_attended, conditional `pastoring_activity_other`).

> Important: `pastoring_activity_objective` should sanitize commas (the spec says "NÃO USE VÍRGULA"). Strip them in the service: `dto.pastoring_activity_objective?.replace(/,/g, '')`.

- [ ] **Step 2: DTO** with `@IsIn` for enums, `@ValidateIf` for conditional fields, `@IsArray` + `@IsIn(..., { each: true })` for `leader_attended`.

- [ ] **Step 3: Service auto-fills scope from leader**

```typescript
async create(dto: CreateLifeGroupReportDto, actor: User) {
  if (!actor.leadingLifeGroup) throw new ForbiddenException('Leader has no life group attached');
  const reg = await this.repo.save(this.repo.create({
    ...dto,
    pastoringActivityObjective: dto.pastoringActivityObjective?.replace(/,/g, ''),
    areaId: actor.leadingLifeGroup.sector.area.id,
    sectorId: actor.leadingLifeGroup.sector.id,
    lifeGroupId: actor.leadingLifeGroup.id,
    submittedBy: { id: actor.id } as any,
  }));
  /* audit */
  return reg;
}
```

- [ ] **Step 4: List query applies cascade scope**

```typescript
list(scope: ResolvedScope) {
  const qb = this.repo.createQueryBuilder('r').where('r.deleted_at IS NULL');
  if (!scope.unrestricted) {
    qb.andWhere('r.life_group_id = ANY(:lgs)', {
      lgs: scope.lifeGroupIds.length ? scope.lifeGroupIds : ['<empty-uuid>'],
    });
  }
  return qb.orderBy('r.date','DESC').getMany();
}
```

- [ ] **Step 5: Tests + commit**

```bash
git commit -m "feat(forms): add Relatório de Life Group with leader-scoped auto-fill"
```

---

## Task 11: Form 4 — Atividades Supervisor de Setor

Same scaffold under `src/sector-supervisor-reports/`. Roles per spec §3.4:
- write: `sector_leader`, `admin`, `pastor`
- read: + `area_leader` (cascade — sectors inside their area)

Service auto-fills `sector_id` from `actor.leadingSector`. List query: if `area_leader`, filter by sectors in their area; if `sector_leader`, only their submissions.

```bash
git commit -m "feat(forms): add Atividades Supervisor de Setor"
```

---

## Task 12: Form 5 — Atividades Supervisor de Área

`src/area-supervisor-reports/`. Roles: `area_leader` writes + reads own; `admin`/`pastor` read all. Service auto-fills `area_id` from `actor.leadingArea`.

```bash
git commit -m "feat(forms): add Atividades Supervisor de Área"
```

---

## Task 13: Form 6 — Multiplicação (transactional side-effect)

**Files:**
- Create: `src/multiplications/multiplications.module.ts` + entity + DTO + controller (standard)
- Create: `src/multiplications/services/multiplication.service.ts` (transactional)
- Test: `src/multiplications/services/multiplication.service.spec.ts`

- [ ] **Step 1: Entity + DTO** per spec §3.6 (booleans, datetime `meeting_day_time`, conditional `single_living_in_purity`).

- [ ] **Step 2: Transactional service**

```typescript
// src/multiplications/services/multiplication.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { Multiplication } from '../entities/multiplication.entity';
import { CreateMultiplicationDto } from '../dto/create-multiplication.dto';

@Injectable()
export class MultiplicationService {
  constructor(private readonly ds: DataSource) {}

  async createWithSideEffects(dto: CreateMultiplicationDto, actorId: number): Promise<Multiplication> {
    return this.ds.transaction(async (trx) => {
      const sourceLife = await trx.findOneOrFail(LifeGroup, { where: { id: dto.sourceLifeGroupId }, relations: ['sector'] });

      const newLeaderRole = await trx.findOneOrFail(Role, { where: { slug: 'life_group_leader' } });

      const newLife = await trx.save(LifeGroup, trx.create(LifeGroup, {
        name: dto.newLifeGroupName,
        sector: sourceLife.sector,
        leader: { id: dto.newLeaderId } as any,
        host: { id: dto.hostId } as any,
        address: dto.address,
        meetingDayTime: new Date(dto.meetingDayTime),
        leaderPhone: dto.leaderPhone,
      }));

      await trx.update(User, dto.newLeaderId, { role: newLeaderRole });

      // Move members from source life to new life
      if (dto.membersToMove?.length) {
        await trx.query(`
          DELETE FROM user_life_groups
          WHERE "lifeGroupId" = $1 AND "userId" = ANY($2);
        `, [sourceLife.id, dto.membersToMove]);
        await trx.query(`
          INSERT INTO user_life_groups ("lifeGroupId", "userId")
          SELECT $1, UNNEST($2::int[]);
        `, [newLife.id, dto.membersToMove]);
      }

      if (dto.newMembers?.length) {
        await trx.query(`
          INSERT INTO user_life_groups ("lifeGroupId", "userId")
          SELECT $1, UNNEST($2::int[])
          ON CONFLICT DO NOTHING;
        `, [newLife.id, dto.newMembers]);
      }

      const mult = await trx.save(Multiplication, trx.create(Multiplication, {
        ...dto,
        meetingDayTime: new Date(dto.meetingDayTime),
        newLifeGroupId: newLife.id,
        areaId: sourceLife.sector.area?.id ?? null,
        sectorId: sourceLife.sector.id,
        submittedBy: { id: actorId } as any,
      }));
      return mult;
    });
  }
}
```

> **Verify** `user_life_groups` join table column names (`"lifeGroupId"`, `"userId"`) by inspecting the existing `LifeGroup`/`User` entities. If different, adjust the raw SQL.

- [ ] **Step 3: Service test (uses sqlite in-memory or mocked DataSource — prefer integration test against test Postgres if available)**

```typescript
it('creates new life group, moves members, updates leader role — all in one transaction', async () => {
  // Integration test: bootstrap test DB, seed source life with 3 members,
  // call service, assert new life exists with members moved and leader role updated.
});
```

If no integration test infrastructure exists, write a unit test that asserts `ds.transaction` is called once and within it the right repository methods are invoked.

- [ ] **Step 4: Controller** at `/api/forms/multiplications`. Roles: write `admin`, `pastor`, `area_leader`; read same set (area_leader own only).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(forms): add Multiplicação form with transactional life-group creation"
```

---

## Task 14: Form 7 — Relatório do Culto

`src/service-reports/`. Standard scaffold. All leader roles can write + read own. `service_type_other` required if `service_type === 'outro'`.

```bash
git commit -m "feat(forms): add Relatório do Culto"
```

---

## Task 15: Form 8 — Convidado

`src/guests/`. Standard scaffold. After save, log the inviter's leader for follow-up (v1: just write a `Logger.log`; full notification in Phase 4 of spec).

Roles: leaders write + see own; admin/pastor see all.

```bash
git commit -m "feat(forms): add Convidado form"
```

---

## Task 16: Wire scope into existing JWT validate

**Files:**
- Modify: `src/auth/jwt.strategy.ts`

The catalog endpoint and ScopeGuard need `req.user.role.slug`. Update the JWT `validate()` to load the user with role:

- [ ] **Step 1: Inspect current strategy**

```bash
cat backend/src/auth/jwt.strategy.ts
```

- [ ] **Step 2: Modify `validate()` to return user with role**

```typescript
async validate(payload: { userId: number; email: string }) {
  const user = await this.usersService.findOneWithRole(payload.userId);
  if (!user) throw new UnauthorizedException();
  return user; // attached to req.user
}
```

If `findOneWithRole` doesn't exist, add it to `UsersService` (`this.repo.findOne({ where: { id }, relations: ['role','leadingArea','leadingSector','leadingLifeGroup'] })`).

- [ ] **Step 3: Test the auth flow still works**

```bash
npx jest src/auth
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(auth): include role and leadership relations on req.user"
```

---

## Task 17: End-to-end smoke test against running backend

- [ ] **Step 1: Start DB + backend**

```bash
cd backend && docker compose up -d && npm run start:dev
```

- [ ] **Step 2: Use Postman or curl to exercise each endpoint**

```bash
# Login (existing flow) → get TOKEN
# Then for each form slug:
curl http://localhost:3001/api/forms -H "Authorization: Bearer $TOKEN"
curl http://localhost:3001/api/forms/guests -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3001/api/forms/guests \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"full_name":"Teste","phone":"+5511999999999","invited_by":"Ana"}'
```

- [ ] **Step 3: Verify audit rows are written**

```bash
psql -c "SELECT form_slug, action, created_at FROM form_submission_audit_log ORDER BY created_at DESC LIMIT 10;"
```

- [ ] **Step 4: Add postman collection update**

```bash
cd ../postman-files
# Add new requests to the existing collection, commit + push
```

- [ ] **Step 5: Final commit**

```bash
cd ../backend
git commit --allow-empty -m "chore(forms): backend Plan 1 complete"
```

---

## Out of scope for this plan
- Admin UI work (Plan 2)
- Mobile app work (Plan 3)
- Member Path (Trilho) updates — leave `// TODO` markers in OnboardingService and ConversionMatchService; pick up in a follow-up plan
- WhatsApp implementation (v2)
- BullMQ queue (emails are synchronous fire-and-forget)
