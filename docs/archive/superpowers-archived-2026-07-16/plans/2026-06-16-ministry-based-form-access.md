# Ministry-Based Form Access (Atmosfera / service-reports) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Atmosfera ministry/team members (global role `member`) submit `service-reports`, let ministry/team leaders view the submissions list, while admin/pastor keep unconditional full access — across backend, admin-ui (no code change, verify only), and KMP (Android + iOS).

**Architecture:** New backend `ministry-access` module resolves `{isLeader, isMember}` for a `(userId, ministrySlug)` pair from the `Ministry`/`MinistryTeam` entities. A `MinistryFormGuard` + `@MinistryForm(slug)` decorator attach `req.ministryAccess`, bypassing to full access for admin/pastor. `forms-catalog.service.ts` becomes async and computes `can_read`/`can_write` for ministry-linked forms via this service instead of static role arrays. `service-reports` controller/service drop the broken life-group-scoped `list()` for a ministry-wide `listAll()`. KMP adds a new read-only submissions-list screen on Android and iOS, both calling one new `:shared` repository method.

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL (backend); Next.js 15 (admin-ui, unchanged); Kotlin Multiplatform + Jetpack Compose + SwiftUI (kmp-mobile).

---

## Backend

### Task 1: `MinistryAccessService`

**Files:**
- Create: `backend/src/ministry-access/ministry-access.module.ts`
- Create: `backend/src/ministry-access/ministry-access.service.ts`
- Test: `backend/src/ministry-access/ministry-access.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/ministry-access/ministry-access.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MinistryAccessService } from './ministry-access.service';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';

describe('MinistryAccessService', () => {
  let service: MinistryAccessService;
  let ministryRepo: { findOne: jest.Mock };
  let teamRepo: { find: jest.Mock };

  beforeEach(async () => {
    ministryRepo = { findOne: jest.fn() };
    teamRepo = { find: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MinistryAccessService,
        { provide: getRepositoryToken(Ministry), useValue: ministryRepo },
        { provide: getRepositoryToken(MinistryTeam), useValue: teamRepo },
      ],
    }).compile();

    service = module.get(MinistryAccessService);
  });

  it('returns isLeader=true when user is the ministry leader', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 10 },
      coLeader: null,
      members: [],
    });
    teamRepo.find.mockResolvedValue([]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: true, isMember: false });
  });

  it('returns isLeader=true when user is a team co-leader', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 999 },
      coLeader: null,
      members: [],
    });
    teamRepo.find.mockResolvedValue([
      { id: 5, leader: { id: 999 }, coLeader: { id: 10 }, members: [] },
    ]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: true, isMember: false });
  });

  it('returns isMember=true when user is a plain ministry member', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 999 },
      coLeader: null,
      members: [{ id: 10 }],
    });
    teamRepo.find.mockResolvedValue([]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: false, isMember: true });
  });

  it('returns isMember=true when user is a plain team member', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 999 },
      coLeader: null,
      members: [],
    });
    teamRepo.find.mockResolvedValue([
      { id: 5, leader: { id: 999 }, coLeader: null, members: [{ id: 10 }] },
    ]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: false, isMember: true });
  });

  it('returns both false for an unrelated user', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 999 },
      coLeader: null,
      members: [],
    });
    teamRepo.find.mockResolvedValue([]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: false, isMember: false });
  });

  it('returns both false when the ministry slug does not exist', async () => {
    ministryRepo.findOne.mockResolvedValue(null);
    teamRepo.find.mockResolvedValue([]);

    const result = await service.resolve(10, 'unknown-slug');

    expect(result).toEqual({ isLeader: false, isMember: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/ministry-access/ministry-access.service.spec.ts`
Expected: FAIL — `Cannot find module './ministry-access.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/ministry-access/ministry-access.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';

export interface MinistryAccessResult {
  isLeader: boolean;
  isMember: boolean;
}

@Injectable()
export class MinistryAccessService {
  constructor(
    @InjectRepository(Ministry)
    private readonly ministryRepo: Repository<Ministry>,
    @InjectRepository(MinistryTeam)
    private readonly teamRepo: Repository<MinistryTeam>,
  ) {}

  async resolve(
    userId: number,
    ministrySlug: string,
  ): Promise<MinistryAccessResult> {
    const ministry = await this.ministryRepo.findOne({
      where: { slug: ministrySlug },
      relations: ['leader', 'coLeader', 'members'],
    });
    if (!ministry) {
      return { isLeader: false, isMember: false };
    }

    const teams = await this.teamRepo.find({
      where: { ministry: { id: ministry.id } },
      relations: ['leader', 'coLeader', 'members'],
    });

    const isLeader =
      ministry.leader?.id === userId ||
      ministry.coLeader?.id === userId ||
      teams.some((t) => t.leader?.id === userId || t.coLeader?.id === userId);

    const isMember =
      ministry.members.some((m) => m.id === userId) ||
      teams.some((t) => t.members.some((m) => m.id === userId));

    return { isLeader, isMember };
  }
}
```

```typescript
// backend/src/ministry-access/ministry-access.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';
import { MinistryAccessService } from './ministry-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ministry, MinistryTeam])],
  providers: [MinistryAccessService],
  exports: [MinistryAccessService],
})
export class MinistryAccessModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/ministry-access/ministry-access.service.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/ministry-access
git commit -m "feat: add MinistryAccessService for ministry-based form access"
```

---

### Task 2: Form→ministry map, `@MinistryForm` decorator, `MinistryFormGuard`

**Files:**
- Create: `backend/src/ministry-access/ministry-linked-forms.ts`
- Create: `backend/src/ministry-access/ministry-form.decorator.ts`
- Create: `backend/src/ministry-access/ministry-form.guard.ts`
- Test: `backend/src/ministry-access/ministry-form.guard.spec.ts`
- Modify: `backend/src/ministry-access/ministry-access.module.ts` (export guard)

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/ministry-access/ministry-form.guard.spec.ts
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MinistryFormGuard } from './ministry-form.guard';
import { MinistryAccessService } from './ministry-access.service';
import { MINISTRY_FORM_KEY } from './ministry-form.decorator';

function makeContext(user: any) {
  const req: any = { user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('MinistryFormGuard', () => {
  let guard: MinistryFormGuard;
  let reflector: Reflector;
  let access: { resolve: jest.Mock };

  beforeEach(() => {
    reflector = new Reflector();
    access = { resolve: jest.fn() };
    guard = new MinistryFormGuard(reflector, access as unknown as MinistryAccessService);
  });

  it('bypasses to full access for admin without querying ministry tables', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('atmosfera');
    const ctx = makeContext({ id: 1, role: { slug: 'admin' } });

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect((ctx.switchToHttp().getRequest() as any).ministryAccess).toEqual({
      isLeader: true,
      isMember: true,
    });
    expect(access.resolve).not.toHaveBeenCalled();
  });

  it('bypasses to full access for pastor', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('atmosfera');
    const ctx = makeContext({ id: 1, role: { slug: 'pastor' } });

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect((ctx.switchToHttp().getRequest() as any).ministryAccess).toEqual({
      isLeader: true,
      isMember: true,
    });
  });

  it('delegates to MinistryAccessService for non-admin/pastor roles', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('atmosfera');
    access.resolve.mockResolvedValue({ isLeader: false, isMember: true });
    const ctx = makeContext({ id: 10, role: { slug: 'member' } });

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect(access.resolve).toHaveBeenCalledWith(10, 'atmosfera');
    expect((ctx.switchToHttp().getRequest() as any).ministryAccess).toEqual({
      isLeader: false,
      isMember: true,
    });
  });

  it('allows the request through with no ministry slug metadata (no-op)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({ id: 10, role: { slug: 'member' } });

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect(access.resolve).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/ministry-access/ministry-form.guard.spec.ts`
Expected: FAIL — `Cannot find module './ministry-form.guard'`

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/ministry-access/ministry-linked-forms.ts
export const MINISTRY_LINKED_FORMS: Record<string, string> = {
  'service-reports': 'atmosfera',
};
```

```typescript
// backend/src/ministry-access/ministry-form.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const MINISTRY_FORM_KEY = 'ministryFormSlug';
export const MinistryForm = (ministrySlug: string) =>
  SetMetadata(MINISTRY_FORM_KEY, ministrySlug);
```

```typescript
// backend/src/ministry-access/ministry-form.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MinistryAccessService } from './ministry-access.service';
import { MINISTRY_FORM_KEY } from './ministry-form.decorator';

@Injectable()
export class MinistryFormGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: MinistryAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ministrySlug = this.reflector.getAllAndOverride<string | undefined>(
      MINISTRY_FORM_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!ministrySlug) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const roleSlug = request.user?.role?.slug;

    if (roleSlug === 'admin' || roleSlug === 'pastor') {
      request.ministryAccess = { isLeader: true, isMember: true };
      return true;
    }

    request.ministryAccess = await this.access.resolve(
      request.user.id,
      ministrySlug,
    );
    return true;
  }
}
```

```typescript
// backend/src/ministry-access/ministry-access.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';
import { MinistryAccessService } from './ministry-access.service';
import { MinistryFormGuard } from './ministry-form.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Ministry, MinistryTeam])],
  providers: [MinistryAccessService, MinistryFormGuard],
  exports: [MinistryAccessService, MinistryFormGuard],
})
export class MinistryAccessModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/ministry-access/ministry-form.guard.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/ministry-access
git commit -m "feat: add MinistryFormGuard, @MinistryForm decorator, and form->ministry map"
```

---

### Task 3: `forms-catalog.service.ts` — async signature + ministry-aware flags

**Files:**
- Modify: `backend/src/forms-catalog/forms-catalog.service.ts`
- Modify: `backend/src/forms-catalog/forms-catalog.controller.ts`
- Modify: `backend/src/forms-catalog/forms-catalog.module.ts`
- Test: `backend/src/forms-catalog/forms-catalog.service.spec.ts` (create if absent — check first; none exists today)

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/forms-catalog/forms-catalog.service.spec.ts
import { Test } from '@nestjs/testing';
import { FormsCatalogService } from './forms-catalog.service';
import { MinistryAccessService } from '../ministry-access/ministry-access.service';

describe('FormsCatalogService', () => {
  let service: FormsCatalogService;
  let ministryAccess: { resolve: jest.Mock };

  beforeEach(async () => {
    ministryAccess = { resolve: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        FormsCatalogService,
        { provide: MinistryAccessService, useValue: ministryAccess },
      ],
    }).compile();
    service = module.get(FormsCatalogService);
  });

  it('gives admin full access to service-reports without querying ministry tables', async () => {
    const result = await service.listForRole({ id: 1, roleSlug: 'admin' });

    const serviceReports = result.find((f) => f.slug === 'service-reports');
    expect(serviceReports).toMatchObject({ can_read: true, can_write: true });
    expect(ministryAccess.resolve).not.toHaveBeenCalled();
  });

  it('gives a ministry leader (global role member) read+write on service-reports', async () => {
    ministryAccess.resolve.mockResolvedValue({ isLeader: true, isMember: false });

    const result = await service.listForRole({ id: 10, roleSlug: 'member' });

    const serviceReports = result.find((f) => f.slug === 'service-reports');
    expect(serviceReports).toMatchObject({ can_read: true, can_write: true });
    expect(ministryAccess.resolve).toHaveBeenCalledWith(10, 'atmosfera');
  });

  it('gives a plain ministry member (global role member) write-only on service-reports', async () => {
    ministryAccess.resolve.mockResolvedValue({ isLeader: false, isMember: true });

    const result = await service.listForRole({ id: 11, roleSlug: 'member' });

    const serviceReports = result.find((f) => f.slug === 'service-reports');
    expect(serviceReports).toMatchObject({ can_read: false, can_write: true });
  });

  it('excludes service-reports for an unrelated member', async () => {
    ministryAccess.resolve.mockResolvedValue({ isLeader: false, isMember: false });

    const result = await service.listForRole({ id: 12, roleSlug: 'member' });

    expect(result.find((f) => f.slug === 'service-reports')).toBeUndefined();
  });

  it('leaves non-ministry-linked forms on static role arrays', async () => {
    const result = await service.listForRole({ id: 1, roleSlug: 'admin' });

    const memberRegistrations = result.find((f) => f.slug === 'member-registrations');
    expect(memberRegistrations).toMatchObject({ can_read: true, can_write: true });
    expect(ministryAccess.resolve).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/forms-catalog/forms-catalog.service.spec.ts`
Expected: FAIL — `service.listForRole` called with an object but current signature takes a string, and the result for service-reports won't match ministry-aware expectations.

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/forms-catalog/forms-catalog.service.ts
import { Injectable } from '@nestjs/common';
import { MinistryAccessService } from '../ministry-access/ministry-access.service';
import { MINISTRY_LINKED_FORMS } from '../ministry-access/ministry-linked-forms';

export interface FormCatalogEntry {
  slug: string;
  name: string;
  description: string;
  can_write: boolean;
  can_read: boolean;
}

const FORM_DEFINITIONS = [
  {
    slug: 'member-registrations',
    name: 'Cadastro do Membro',
    description: 'Registrar um novo membro',
    write: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
    read: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
  },
  {
    slug: 'form-conversions',
    name: 'Conversão e Reconciliação',
    description: 'Decisão por Cristo',
    write: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
    read: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
  },
  {
    slug: 'life-group-reports',
    name: 'Relatório de Life Group',
    description: 'Relatório semanal do LG',
    write: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
    read: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
  },
  {
    slug: 'sector-supervisor-reports',
    name: 'Atividades Supervisor de Setor',
    description: 'Relatório semanal do setor',
    write: ['admin', 'pastor', 'sector_leader'],
    read: ['admin', 'pastor', 'area_leader', 'sector_leader'],
  },
  {
    slug: 'area-supervisor-reports',
    name: 'Atividades Supervisor de Área',
    description: 'Relatório semanal da área',
    write: ['admin', 'pastor', 'area_leader'],
    read: ['admin', 'pastor', 'area_leader'],
  },
  {
    slug: 'multiplications',
    name: 'Multiplicação',
    description: 'Multiplicar um life group',
    write: ['admin', 'pastor', 'area_leader'],
    read: ['admin', 'pastor', 'area_leader'],
  },
  {
    slug: 'service-reports',
    name: 'Relatório do Culto',
    description: 'Relatório do culto/oração',
    write: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
    read: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
  },
  {
    slug: 'form-guests',
    name: 'Convidado',
    description: 'Registrar um convidado',
    write: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
    read: ['admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader'],
  },
];

@Injectable()
export class FormsCatalogService {
  constructor(private readonly ministryAccess: MinistryAccessService) {}

  async listForRole(actor: {
    id: number;
    roleSlug: string;
  }): Promise<FormCatalogEntry[]> {
    const entries = await Promise.all(
      FORM_DEFINITIONS.map(async (f) => {
        const ministrySlug = MINISTRY_LINKED_FORMS[f.slug];
        let canWrite: boolean;
        let canRead: boolean;

        if (ministrySlug) {
          const isAdminOrPastor =
            actor.roleSlug === 'admin' || actor.roleSlug === 'pastor';
          const { isLeader, isMember } = isAdminOrPastor
            ? { isLeader: true, isMember: true }
            : await this.ministryAccess.resolve(actor.id, ministrySlug);
          canWrite = isAdminOrPastor || isMember || isLeader;
          canRead = isAdminOrPastor || isLeader;
        } else {
          canWrite = f.write.includes(actor.roleSlug);
          canRead = f.read.includes(actor.roleSlug);
        }

        return {
          slug: f.slug,
          name: f.name,
          description: f.description,
          can_write: canWrite,
          can_read: canRead,
        };
      }),
    );

    return entries.filter((f) => f.can_read || f.can_write);
  }
}
```

```typescript
// backend/src/forms-catalog/forms-catalog.controller.ts
import {
  Controller,
  Get,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FormsCatalogService } from './forms-catalog.service';

interface RequestWithUser {
  user?: { id: number; role?: { slug?: string } };
}

@UseGuards(AuthGuard('jwt'))
@Controller('forms')
export class FormsCatalogController {
  constructor(private readonly catalog: FormsCatalogService) {}

  @Get()
  @SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
  list(@Req() req: RequestWithUser) {
    const id = req.user?.id ?? 0;
    const roleSlug = req.user?.role?.slug ?? 'member';
    return this.catalog.listForRole({ id, roleSlug });
  }
}
```

```typescript
// backend/src/forms-catalog/forms-catalog.module.ts
import { Module } from '@nestjs/common';
import { FormsCatalogService } from './forms-catalog.service';
import { FormsCatalogController } from './forms-catalog.controller';
import { MinistryAccessModule } from '../ministry-access/ministry-access.module';

@Module({
  imports: [MinistryAccessModule],
  controllers: [FormsCatalogController],
  providers: [FormsCatalogService],
  exports: [FormsCatalogService],
})
export class FormsCatalogModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/forms-catalog/forms-catalog.service.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/forms-catalog
git commit -m "feat: compute service-reports catalog flags from ministry membership"
```

---

### Task 4: `service-reports.service.ts` — `listAll()` replaces life-group-scoped `list()`

**Files:**
- Modify: `backend/src/service-reports/service-reports.service.ts`
- Test: `backend/src/service-reports/service-reports.service.spec.ts` (create if absent — check first)

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/service-reports/service-reports.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceReportsService } from './service-reports.service';
import { ServiceReport } from './entities/service-report.entity';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

describe('ServiceReportsService.listAll', () => {
  let service: ServiceReportsService;
  let qb: {
    where: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };
  let repo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    qb = {
      where: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]),
    };
    repo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const module = await Test.createTestingModule({
      providers: [
        ServiceReportsService,
        { provide: getRepositoryToken(ServiceReport), useValue: repo },
        { provide: FormSubmissionPolicyService, useValue: {} },
        { provide: FormSubmissionAuditService, useValue: {} },
      ],
    }).compile();

    service = module.get(ServiceReportsService);
  });

  it('returns all non-deleted reports ordered by created_at DESC with joins, no scope filtering', async () => {
    const result = await service.listAll();

    expect(repo.createQueryBuilder).toHaveBeenCalledWith('f');
    expect(qb.where).toHaveBeenCalledWith('f.deleted_at IS NULL');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('f.submittedBy', 'submittedBy');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('f.atmosphereTeam', 'atmosphereTeam');
    expect(qb.orderBy).toHaveBeenCalledWith('f.created_at', 'DESC');
    expect(result).toEqual([{ id: 'r1' }, { id: 'r2' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/service-reports/service-reports.service.spec.ts`
Expected: FAIL — `service.listAll is not a function`

- [ ] **Step 3: Write the implementation**

Replace the existing `list(scope: ResolvedScope)` method and drop the now-unused `ResolvedScope` import:

```typescript
// backend/src/service-reports/service-reports.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceReport } from './entities/service-report.entity';
import { User } from '../users/entities/user.entity';
import { CreateServiceReportDto } from './dto/create-service-report.dto';
import { UpdateServiceReportDto } from './dto/update-service-report.dto';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const SLUG = 'service-reports';

@Injectable()
export class ServiceReportsService {
  constructor(
    @InjectRepository(ServiceReport)
    private readonly repo: Repository<ServiceReport>,
    private readonly policy: FormSubmissionPolicyService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  async create(
    dto: CreateServiceReportDto,
    actorId: number,
  ): Promise<ServiceReport> {
    const entity = await this.repo.save(
      this.repo.create({
        date: dto.date,
        reportType: dto.reportType,
        period: dto.period,
        atmosphereTeamId: dto.atmosphereTeamId ?? null,
        atmosphereTeamOther: dto.atmosphereTeamOther ?? null,
        atmosphereResponsible: dto.atmosphereResponsible,
        tadelAdults: dto.tadelAdults,
        tadelKids: dto.tadelKids ?? 0,
        vehiclesCars: dto.vehiclesCars,
        vehiclesMotos: dto.vehiclesMotos ?? 0,
        vehiclesBikes: dto.vehiclesBikes ?? 0,
        vehiclesOthers: dto.vehiclesOthers ?? null,
        volunteersAtmosfera: dto.volunteersAtmosfera ?? 0,
        volunteersLouvor: dto.volunteersLouvor ?? 0,
        volunteersMiddia: dto.volunteersMiddia ?? 0,
        volunteersDanca: dto.volunteersDanca ?? 0,
        notes: dto.notes ?? null,
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

  async listAll(): Promise<ServiceReport[]> {
    return this.repo
      .createQueryBuilder('f')
      .where('f.deleted_at IS NULL')
      .leftJoinAndSelect('f.submittedBy', 'submittedBy')
      .leftJoinAndSelect('f.atmosphereTeam', 'atmosphereTeam')
      .orderBy('f.created_at', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<ServiceReport> {
    const m = await this.repo.findOne({
      where: { id },
      relations: ['submittedBy', 'atmosphereTeam'],
    });
    if (!m) throw new NotFoundException();
    return m;
  }

  async update(
    id: string,
    dto: UpdateServiceReportDto,
    actor: { id: number; roleSlug: string },
  ): Promise<ServiceReport> {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/service-reports/service-reports.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/service-reports/service-reports.service.ts src/service-reports/service-reports.service.spec.ts
git commit -m "fix: replace broken life-group-scoped list() with ministry-wide listAll()"
```

---

### Task 5: `service-reports.controller.ts` — ministry guard wiring + module update

**Files:**
- Modify: `backend/src/service-reports/service-reports.controller.ts`
- Modify: `backend/src/service-reports/service-reports.module.ts`
- Test: `backend/src/service-reports/service-reports.controller.spec.ts` (create if absent — check first)

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/service-reports/service-reports.controller.spec.ts
import { ForbiddenException } from '@nestjs/common';
import { ServiceReportsController } from './service-reports.controller';
import { ServiceReportsService } from './service-reports.service';

function makeReq(ministryAccess: { isLeader: boolean; isMember: boolean }, userId = 10) {
  return { user: { id: userId, role: { slug: 'member' } }, ministryAccess } as any;
}

describe('ServiceReportsController', () => {
  let controller: ServiceReportsController;
  let svc: {
    create: jest.Mock;
    listAll: jest.Mock;
    findOne: jest.Mock;
    auditLog: jest.Mock;
  };

  beforeEach(() => {
    svc = {
      create: jest.fn().mockResolvedValue({ id: 'r1' }),
      listAll: jest.fn().mockResolvedValue([{ id: 'r1' }]),
      findOne: jest.fn().mockResolvedValue({ id: 'r1' }),
      auditLog: jest.fn().mockResolvedValue([]),
    };
    controller = new ServiceReportsController(svc as unknown as ServiceReportsService);
  });

  it('create() succeeds for a plain ministry member (isMember only)', async () => {
    const req = makeReq({ isLeader: false, isMember: true });

    await expect(controller.create({} as any, req)).resolves.toEqual({ id: 'r1' });
    expect(svc.create).toHaveBeenCalledWith({}, 10);
  });

  it('create() throws Forbidden for a user with neither isLeader nor isMember', async () => {
    const req = makeReq({ isLeader: false, isMember: false });

    await expect(controller.create({} as any, req)).rejects.toThrow(ForbiddenException);
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('list() returns listAll() for a leader', async () => {
    const req = makeReq({ isLeader: true, isMember: false });

    const result = await controller.list(req);

    expect(result).toEqual([{ id: 'r1' }]);
    expect(svc.listAll).toHaveBeenCalled();
  });

  it('list() throws Forbidden for a member-only (non-leader) user', async () => {
    const req = makeReq({ isLeader: false, isMember: true });

    await expect(controller.list(req)).rejects.toThrow(ForbiddenException);
    expect(svc.listAll).not.toHaveBeenCalled();
  });

  it('findOne() throws Forbidden for a non-leader', async () => {
    const req = makeReq({ isLeader: false, isMember: true });

    await expect(controller.findOne('r1', req)).rejects.toThrow(ForbiddenException);
  });

  it('findOne() succeeds for a leader', async () => {
    const req = makeReq({ isLeader: true, isMember: false });

    await expect(controller.findOne('r1', req)).resolves.toEqual({ id: 'r1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/service-reports/service-reports.controller.spec.ts`
Expected: FAIL — `controller.list`/`findOne` don't read `req.ministryAccess` yet, no Forbidden thrown.

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/service-reports/service-reports.controller.ts
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MinistryForm } from '../ministry-access/ministry-form.decorator';
import { MinistryFormGuard } from '../ministry-access/ministry-form.guard';
import { ServiceReportsService } from './service-reports.service';
import { CreateServiceReportDto } from './dto/create-service-report.dto';
import { UpdateServiceReportDto } from './dto/update-service-report.dto';

@UseGuards(AuthGuard('jwt'), MinistryFormGuard)
@MinistryForm('atmosfera')
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@Controller('forms/service-reports')
export class ServiceReportsController {
  constructor(private readonly svc: ServiceReportsService) {}

  @Get()
  list(@Req() req: any) {
    if (!req.ministryAccess.isLeader) {
      throw new ForbiddenException();
    }
    return this.svc.listAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    if (!req.ministryAccess.isLeader) {
      throw new ForbiddenException();
    }
    return this.svc.findOne(id);
  }

  @Get(':id/audit')
  audit(@Param('id') id: string, @Req() req: any) {
    if (!req.ministryAccess.isLeader) {
      throw new ForbiddenException();
    }
    return this.svc.auditLog(id);
  }

  @Post()
  create(@Body() dto: CreateServiceReportDto, @Req() req: any) {
    if (!req.ministryAccess.isMember && !req.ministryAccess.isLeader) {
      throw new ForbiddenException();
    }
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceReportDto,
    @Req() req: any,
  ) {
    return this.svc.update(id, dto, {
      id: req.user.id,
      roleSlug: req.user.role?.slug ?? 'member',
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.softDelete(id, {
      id: req.user.id,
      roleSlug: req.user.role?.slug ?? 'member',
    });
  }
}
```

```typescript
// backend/src/service-reports/service-reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceReport } from './entities/service-report.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { MinistryAccessModule } from '../ministry-access/ministry-access.module';
import { ServiceReportsService } from './service-reports.service';
import { ServiceReportsController } from './service-reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceReport]),
    FormsCoreModule,
    MinistryAccessModule,
  ],
  controllers: [ServiceReportsController],
  providers: [ServiceReportsService],
})
export class ServiceReportsModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/service-reports/service-reports.controller.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Run the full backend suite to confirm nothing else broke**

Run: `cd backend && npm run test`
Expected: all suites PASS. If `forms-catalog.controller.spec.ts` or any test calling `listForRole('admin')` (string) exists, update it to pass `{ id, roleSlug }`.

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/service-reports
git commit -m "feat: gate service-reports controller routes on ministry leader/member access"
```

---

### Task 6: Wire `MinistryAccessModule` into `AppModule`

**Files:**
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Check current imports**

Run: `grep -n "ServiceReportsModule\|FormsCatalogModule\|MinistriesModule" backend/src/app.module.ts`

- [ ] **Step 2: Add the import**

Add `MinistryAccessModule` to the `imports` array in `app.module.ts`, alongside the existing `ServiceReportsModule`/`FormsCatalogModule`/`MinistriesModule` entries (it's already pulled in transitively by both, but add it explicitly for clarity since nothing else needs to change — `forwardRef` is not needed since there's no circular dependency).

```typescript
import { MinistryAccessModule } from './ministry-access/ministry-access.module';
// ... in @Module({ imports: [...] })
MinistryAccessModule,
```

- [ ] **Step 3: Build to verify no DI errors**

Run: `cd backend && npm run build`
Expected: build succeeds, no "Nest can't resolve dependencies" errors.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/app.module.ts
git commit -m "chore: register MinistryAccessModule in AppModule"
```

---

## Admin-ui

### Task 7: Manual verification (no code change)

**Files:** none — `admin-ui/src/.../formularios-hub.tsx` and `[slug]/form-list-view.tsx` already branch on `can_read`/`can_write`.

- [ ] **Step 1: Start backend + admin-ui locally**

```bash
cd backend && docker compose up -d && npm run start:dev
```
```bash
cd admin-ui && npm run dev
```

- [ ] **Step 2: Seed/confirm test accounts**

You need two accounts against the local DB:
- A user with global role `member` who is a plain member of the `atmosfera` ministry or one of its teams.
- A user with global role `member` who is `leader` or `coLeader` of the `atmosfera` ministry or one of its teams.

(Use the existing admin-ui ministries management screens to set `leader_id`/`co_leader_id`/`ministry_members` rows, or insert directly via `psql` if faster.)

- [ ] **Step 3: Log in as the plain member**

Navigate to Formulários hub → confirm "Relatório do Culto" card shows only "Novo registro" (write), no submissions table.

- [ ] **Step 4: Log in as the leader**

Navigate to Formulários hub → confirm "Relatório do Culto" shows the submissions table (read) listing all service reports.

- [ ] **Step 5: Log in as admin/pastor**

Confirm full read+write access, unconditionally, regardless of ministry membership.

No commit — this task is verification only.

---

## KMP (Android + iOS)

### Task 8: `:shared` — `ServiceReportSubmission` model + `getServiceReportSubmissions()`

**Files:**
- Modify: `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt`
- Modify: `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/FormsRepository.kt`
- Modify: `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/FormsRepositoryImpl.kt`
- Test: find the existing `FormsRepositoryImpl` test (if any — check `kmp-mobile/shared/src/commonTest/`) and extend; otherwise add one.

- [ ] **Step 1: Find existing repository test conventions**

Run: `find kmp-mobile/shared/src/commonTest -iname "*FormsRepository*"`

If a test file exists, follow its mocking pattern (likely a fake Ktor `HttpClient` via `MockEngine`). If none exists, skip writing a repository test and instead cover the new method at the ViewModel test level in Task 9 — repository methods here are thin Ktor wrappers mirroring `submitServiceReport`'s existing untested pattern.

- [ ] **Step 2: Add the model**

```kotlin
// kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt
// (append below ServiceReportForm)

@Serializable
data class ServiceReportSubmission(
    val id: String,
    val date: String,
    @SerialName("report_type") val reportType: String,
    val period: String,
    @SerialName("atmosphere_team_id") val atmosphereTeamId: Int? = null,
    @SerialName("atmosphere_responsible") val atmosphereResponsible: String,
    @SerialName("tadel_adults") val tadelAdults: Int = 0,
    @SerialName("tadel_kids") val tadelKids: Int = 0,
    @SerialName("vehicles_cars") val vehiclesCars: Int = 0,
    @SerialName("vehicles_motos") val vehiclesMotos: Int = 0,
    @SerialName("vehicles_bikes") val vehiclesBikes: Int = 0,
    @SerialName("vehicles_others") val vehiclesOthers: String? = null,
    @SerialName("volunteers_atmosfera") val volunteersAtmosfera: Int = 0,
    @SerialName("volunteers_louvor") val volunteersLouvor: Int = 0,
    @SerialName("volunteers_midia") val volunteersMiddia: Int = 0,
    @SerialName("volunteers_danca") val volunteersDanca: Int = 0,
    val notes: String? = null,
    @SerialName("submitted_by") val submittedBy: User? = null,
    @SerialName("created_at") val createdAt: String,
)
```

- [ ] **Step 3: Add to the repository interface**

```kotlin
// kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/FormsRepository.kt
// add alongside the other suspend fun declarations:
@Throws(Exception::class)
suspend fun getServiceReportSubmissions(): List<ServiceReportSubmission>
```

(Add the `ServiceReportSubmission` import at the top of the file.)

- [ ] **Step 4: Implement in `FormsRepositoryImpl`**

```kotlin
// kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/FormsRepositoryImpl.kt
// add alongside getCatalog():
@Throws(Exception::class)
override suspend fun getServiceReportSubmissions(): List<ServiceReportSubmission> =
    client.get("api/forms/service-reports").body()
```

(Add the `ServiceReportSubmission` import.)

- [ ] **Step 5: Build `:shared` to verify compilation**

Run: `cd kmp-mobile && ./gradlew :shared:compileKotlinMetadata`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
cd kmp-mobile
git add shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt \
        shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/FormsRepository.kt \
        shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/FormsRepositoryImpl.kt
git commit -m "feat: add ServiceReportSubmission model and getServiceReportSubmissions() to FormsRepository"
```

---

### Task 9: Android — `FormSubmissionsListScreen` + ViewModel

**Files:**
- Create: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormSubmissionsListUiState.kt`
- Create: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormSubmissionsListViewModel.kt`
- Create: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormSubmissionsListScreen.kt`
- Test: `kmp-mobile/android/src/test/kotlin/br/church/paz/android/ui/features/formularios/FormSubmissionsListViewModelTest.kt`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/navigation/Screen.kt`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/navigation/PazNavGraph.kt`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormulariosScreen.kt`

- [ ] **Step 1: Write the failing ViewModel test**

```kotlin
// kmp-mobile/android/src/test/kotlin/br/church/paz/android/ui/features/formularios/FormSubmissionsListViewModelTest.kt
package br.church.paz.android.ui.features.formularios

import app.cash.turbine.test
import br.church.paz.android.MainDispatcherRule
import br.church.paz.shared.domain.model.ServiceReportSubmission
import br.church.paz.shared.domain.repository.FormsRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class FormSubmissionsListViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val formsRepository = mockk<FormsRepository>()

    private fun fakeSubmission(id: String) =
        ServiceReportSubmission(
            id = id,
            date = "2026-06-14",
            reportType = "culto_celebracao",
            period = "manha",
            atmosphereResponsible = "Maria",
            createdAt = "2026-06-14T10:00:00Z",
        )

    @Test
    fun `starts in loading state then transitions to data on success`() =
        runTest {
            coEvery { formsRepository.getServiceReportSubmissions() } returns listOf(fakeSubmission("1"))

            val viewModel = FormSubmissionsListViewModel(formsRepository)

            assertEquals(emptyList<ServiceReportSubmission>(), viewModel.uiState.value.submissions)
            // allow the coroutine launched in init to complete
            assertTrue(viewModel.uiState.value.isLoading || viewModel.uiState.value.submissions.size == 1)
        }

    @Test
    fun `loads submissions successfully into data state`() =
        runTest {
            coEvery { formsRepository.getServiceReportSubmissions() } returns
                listOf(fakeSubmission("1"), fakeSubmission("2"))

            val viewModel = FormSubmissionsListViewModel(formsRepository)

            assertEquals(2, viewModel.uiState.value.submissions.size)
            assertEquals(false, viewModel.uiState.value.isLoading)
            assertNull(viewModel.uiState.value.error)
        }

    @Test
    fun `empty result sets submissions to empty list without error`() =
        runTest {
            coEvery { formsRepository.getServiceReportSubmissions() } returns emptyList()

            val viewModel = FormSubmissionsListViewModel(formsRepository)

            assertTrue(viewModel.uiState.value.submissions.isEmpty())
            assertNull(viewModel.uiState.value.error)
        }

    @Test
    fun `repository failure sets error and stops loading`() =
        runTest {
            coEvery { formsRepository.getServiceReportSubmissions() } throws RuntimeException("network down")

            val viewModel = FormSubmissionsListViewModel(formsRepository)

            assertEquals(false, viewModel.uiState.value.isLoading)
            assertEquals("network down", viewModel.uiState.value.error)
        }

    @Test
    fun `tapping a row emits NavigateToDetail effect`() =
        runTest {
            coEvery { formsRepository.getServiceReportSubmissions() } returns listOf(fakeSubmission("1"))
            val viewModel = FormSubmissionsListViewModel(formsRepository)

            viewModel.effect.test {
                viewModel.onRowTap("1")
                assertEquals(FormSubmissionsListEffect.NavigateToDetail("1"), awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }
}
```

(If `MainDispatcherRule` lives at a different package, mirror the import used in `LoginViewModelTest.kt`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd kmp-mobile && ./gradlew :android:testDebugUnitTest --tests "*FormSubmissionsListViewModelTest*"`
Expected: FAIL — `FormSubmissionsListViewModel`/`FormSubmissionsListEffect`/`FormSubmissionsListUiState` don't exist.

- [ ] **Step 3: Write `FormSubmissionsListUiState.kt`**

```kotlin
package br.church.paz.android.ui.features.formularios

import br.church.paz.shared.domain.model.ServiceReportSubmission

data class FormSubmissionsListUiState(
    val submissions: List<ServiceReportSubmission> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class FormSubmissionsListEffect {
    data class NavigateToDetail(
        val submissionId: String,
    ) : FormSubmissionsListEffect()

    data object NavigateBack : FormSubmissionsListEffect()
}
```

- [ ] **Step 4: Write `FormSubmissionsListViewModel.kt`**

```kotlin
package br.church.paz.android.ui.features.formularios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.FormsRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class FormSubmissionsListViewModel(
    private val formsRepository: FormsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(FormSubmissionsListUiState())
    val uiState: StateFlow<FormSubmissionsListUiState> = _uiState.asStateFlow()

    private val _effect = Channel<FormSubmissionsListEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            runCatching { formsRepository.getServiceReportSubmissions() }
                .onSuccess { submissions ->
                    _uiState.update { it.copy(submissions = submissions, isLoading = false) }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar registros")
                    }
                }
        }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        load()
    }

    fun onRowTap(submissionId: String) {
        viewModelScope.launch { _effect.send(FormSubmissionsListEffect.NavigateToDetail(submissionId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(FormSubmissionsListEffect.NavigateBack) }
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd kmp-mobile && ./gradlew :android:testDebugUnitTest --tests "*FormSubmissionsListViewModelTest*"`
Expected: PASS (5 tests)

- [ ] **Step 6: Add the route**

```kotlin
// kmp-mobile/android/src/main/kotlin/br/church/paz/android/navigation/Screen.kt
// add below FormDetail:
data object FormSubmissionsList : Screen("form_submissions_list")

data object FormSubmissionDetail : Screen("form_submission_detail/{submissionId}") {
    fun createRoute(submissionId: String) = "form_submission_detail/$submissionId"
}
```

- [ ] **Step 7: Write `FormSubmissionsListScreen.kt`** (list UI + a simple key/value detail screen in the same file, scoped to service-reports only per spec)

```kotlin
package br.church.paz.android.ui.features.formularios

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.ServiceReportSubmission
import org.koin.androidx.compose.koinViewModel

@Composable
fun FormSubmissionsListScreen(
    navController: NavController,
    viewModel: FormSubmissionsListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is FormSubmissionsListEffect.NavigateToDetail ->
                    navController.navigate(Screen.FormSubmissionDetail.createRoute(effect.submissionId))
                FormSubmissionsListEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Column(Modifier.fillMaxSize().padding(PazSpacing.Lg)) {
        when {
            uiState.isLoading -> repeat(3) { PazSkeleton(height = 72.dp.let { it }) }
            uiState.error != null ->
                Column {
                    Text(uiState.error!!, style = MaterialTheme.typography.bodySmall)
                    PazButton(text = "Tentar Novamente", onClick = viewModel::onRetry)
                }
            uiState.submissions.isEmpty() ->
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text("Nenhum registro encontrado", style = MaterialTheme.typography.titleMedium)
                }
            else ->
                LazyColumn(
                    contentPadding = PaddingValues(vertical = PazSpacing.Sm),
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
                ) {
                    items(uiState.submissions) { submission ->
                        SubmissionRow(submission = submission, onClick = { viewModel.onRowTap(submission.id) })
                    }
                }
        }
    }
}

@Composable
private fun SubmissionRow(
    submission: ServiceReportSubmission,
    onClick: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
    ) {
        Text("${submission.date} · ${submission.period}", style = MaterialTheme.typography.titleSmall)
        Text(submission.atmosphereResponsible, style = MaterialTheme.typography.bodySmall)
        Text(
            "Adultos: ${submission.tadelAdults} · Crianças: ${submission.tadelKids}",
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@Composable
fun FormSubmissionDetailScreen(
    navController: NavController,
    submissionId: String,
    viewModel: FormSubmissionsListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val submission = uiState.submissions.find { it.id == submissionId }

    Column(Modifier.fillMaxSize().padding(PazSpacing.Lg)) {
        if (submission == null) {
            Text("Registro não encontrado", style = MaterialTheme.typography.bodyMedium)
        } else {
            val rows =
                listOf(
                    "Data" to submission.date,
                    "Tipo" to submission.reportType,
                    "Período" to submission.period,
                    "Responsável" to submission.atmosphereResponsible,
                    "Adultos (Tadel)" to submission.tadelAdults.toString(),
                    "Crianças (Tadel)" to submission.tadelKids.toString(),
                    "Carros" to submission.vehiclesCars.toString(),
                    "Motos" to submission.vehiclesMotos.toString(),
                    "Bicicletas" to submission.vehiclesBikes.toString(),
                    "Voluntários Atmosfera" to submission.volunteersAtmosfera.toString(),
                    "Voluntários Louvor" to submission.volunteersLouvor.toString(),
                    "Voluntários Mídia" to submission.volunteersMiddia.toString(),
                    "Voluntários Dança" to submission.volunteersDanca.toString(),
                    "Observações" to (submission.notes ?: "-"),
                )
            LazyColumn(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                items(rows) { (label, value) ->
                    Column {
                        Text(label, style = MaterialTheme.typography.labelSmall)
                        Text(value, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 8: Wire navigation in `PazNavGraph.kt`**

```kotlin
// add imports
import br.church.paz.android.ui.features.formularios.FormSubmissionDetailScreen
import br.church.paz.android.ui.features.formularios.FormSubmissionsListScreen

// add inside NavHost, alongside the existing FormDetail composable:
composable(Screen.FormSubmissionsList.route) {
    FormSubmissionsListScreen(navController = navController)
}
composable(
    route = Screen.FormSubmissionDetail.route,
    arguments = listOf(androidx.navigation.navArgument("submissionId") { type = androidx.navigation.NavType.StringType }),
) { backStackEntry ->
    val submissionId = backStackEntry.arguments?.getString("submissionId") ?: return@composable
    FormSubmissionDetailScreen(navController = navController, submissionId = submissionId)
}
```

- [ ] **Step 9: Register the ViewModel in Koin**

```kotlin
// kmp-mobile/android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt
// add import
import br.church.paz.android.ui.features.formularios.FormSubmissionsListViewModel
// add inside module { ... }, alongside FormulariosViewModel:
viewModel { FormSubmissionsListViewModel(get()) }
```

- [ ] **Step 10: Split card-tap navigation in `FormulariosScreen.kt`**

Replace the single `NavigateToForm` effect handling with a branch on `canRead`/`canWrite`. In `FormulariosViewModel.kt`, change `onFormTap`:

```kotlin
// FormulariosViewModel.kt — replace onFormTap
fun onFormTap(formId: String) {
    viewModelScope.launch {
        val form = _uiState.value.forms.find { it.id == formId }
        val effect =
            if (form?.canRead == true) {
                FormulariosEffect.NavigateToSubmissionsList
            } else {
                FormulariosEffect.NavigateToForm(formId)
            }
        _effect.send(effect)
    }
}
```

```kotlin
// FormulariosUiState.kt — extend the effect sealed class
sealed class FormulariosEffect {
    data class NavigateToForm(
        val formId: String,
    ) : FormulariosEffect()

    data object NavigateToSubmissionsList : FormulariosEffect()

    data object NavigateBack : FormulariosEffect()
}
```

```kotlin
// FormulariosScreen.kt — extend the LaunchedEffect handler
LaunchedEffect(Unit) {
    viewModel.effect.collect { effect ->
        when (effect) {
            is FormulariosEffect.NavigateToForm ->
                navController.navigate(Screen.FormDetail.createRoute(effect.formId))
            FormulariosEffect.NavigateToSubmissionsList ->
                navController.navigate(Screen.FormSubmissionsList.route)
            FormulariosEffect.NavigateBack -> navController.popBackStack()
        }
    }
}
```

Note: this routes any `canRead` form to the generic submissions list screen, but per spec scope that screen only renders correctly for `service-reports` today — acceptable since `service-reports` is currently the only ministry-linked (and thus only `canRead`-for-a-`member`) form; other roles reaching forms with `can_read=true` today (e.g. `area_leader` on `area-supervisor-reports`) already have no list screen in KMP and are out of scope per the spec.

- [ ] **Step 11: Build + run Android tests**

Run: `cd kmp-mobile && ./gradlew :android:testDebugUnitTest`
Expected: BUILD SUCCESSFUL, all tests pass.

- [ ] **Step 12: Commit**

```bash
cd kmp-mobile
git add android/src/main/kotlin/br/church/paz/android/ui/features/formularios \
        android/src/test/kotlin/br/church/paz/android/ui/features/formularios \
        android/src/main/kotlin/br/church/paz/android/navigation \
        android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt
git commit -m "feat(android): add FormSubmissionsListScreen for ministry-linked forms"
```

---

### Task 10: iOS — `FormSubmissionsListView` + read-only detail

**Files:**
- Create: `kmp-mobile/ios/PazChurch/Features/Formularios/FormSubmissionsListView.swift`
- Modify: `kmp-mobile/ios/PazChurch/Features/Formularios/FormulariosView.swift`

- [ ] **Step 1: Write `FormSubmissionsListView.swift`**

```swift
import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class FormSubmissionsListViewModel {
    var submissions: [ServiceReportSubmission] = []
    var isLoading = true
    var error: String?

    private let formsRepository: FormsRepository

    init(formsRepository: FormsRepository) {
        self.formsRepository = formsRepository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            submissions = try await (formsRepository.getServiceReportSubmissions() as? [ServiceReportSubmission]) ?? []
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct FormSubmissionsListView: View {
    @State private var viewModel: FormSubmissionsListViewModel

    init(formsRepository: FormsRepository) {
        _viewModel = State(initialValue: FormSubmissionsListViewModel(formsRepository: formsRepository))
    }

    var body: some View {
        screenContent
            .background(PazColors.background)
            .navigationTitle("Relatório do Culto")
            .navigationBarTitleDisplayMode(.large)
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(error)
        } else if viewModel.submissions.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var contentState: some View {
        ScrollView {
            VStack(spacing: 10) {
                Spacer().frame(height: 8)
                ForEach(viewModel.submissions, id: \.id) { submission in
                    NavigationLink(destination: FormSubmissionDetailView(submission: submission)) {
                        SubmissionRow(submission: submission)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                }
                Spacer().frame(height: 32)
            }
            .padding(.top, 8)
        }
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhum registro encontrado").font(PazTypography.titleMedium)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(20)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Spacer()
            Text(message).font(PazTypography.bodySmall)
            Button("Tentar Novamente") { Task { await viewModel.load() } }
            Spacer()
        }
        .padding(20)
    }

    private var loadingState: some View {
        VStack(spacing: 12) {
            Spacer().frame(height: 16)
            ForEach(0..<3, id: \.self) { _ in SkeletonView().frame(height: 72).padding(.horizontal, 20) }
            Spacer()
        }
    }
}

private struct SubmissionRow: View {
    let submission: ServiceReportSubmission

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(submission.date) · \(submission.period)").font(PazTypography.titleSmall)
            Text(submission.atmosphereResponsible).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
            Text("Adultos: \(submission.tadelAdults) · Crianças: \(submission.tadelKids)")
                .font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct FormSubmissionDetailView: View {
    let submission: ServiceReportSubmission

    private var rows: [(String, String)] {
        [
            ("Data", submission.date),
            ("Tipo", submission.reportType),
            ("Período", submission.period),
            ("Responsável", submission.atmosphereResponsible),
            ("Adultos (Tadel)", "\(submission.tadelAdults)"),
            ("Crianças (Tadel)", "\(submission.tadelKids)"),
            ("Carros", "\(submission.vehiclesCars)"),
            ("Motos", "\(submission.vehiclesMotos)"),
            ("Bicicletas", "\(submission.vehiclesBikes)"),
            ("Voluntários Atmosfera", "\(submission.volunteersAtmosfera)"),
            ("Voluntários Louvor", "\(submission.volunteersLouvor)"),
            ("Voluntários Mídia", "\(submission.volunteersMiddia)"),
            ("Voluntários Dança", "\(submission.volunteersDanca)"),
            ("Observações", submission.notes ?? "-"),
        ]
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.md) {
                Spacer().frame(height: PazSpacing.sm)
                ForEach(rows, id: \.0) { label, value in
                    InfoRowView(icon: "doc.text", label: label, value: value)
                }
                Spacer().frame(height: PazSpacing.lg)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazColors.background)
        .navigationTitle("Detalhe do Registro")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct InfoRowView: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(PazColors.primary)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(label).font(PazTypography.labelSmall).foregroundColor(.gray)
                Text(value).font(PazTypography.bodySmall)
            }
            Spacer()
        }
        .padding(PazSpacing.md)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

(Mirrors the `InfoRowView` pattern from `MinistryDetailView.swift`.)

- [ ] **Step 2: Branch navigation in `FormulariosView.swift`**

```swift
// FormulariosView.swift — replace the NavigationLink destination in contentState
ForEach(viewModel.forms, id: \.id) { form in
    NavigationLink(destination: destinationView(for: form)) {
        FormCard(form: form)
    }
    .buttonStyle(.plain)
    .padding(.horizontal, 20)
}
```

```swift
// add a private helper on FormulariosView
@ViewBuilder
private func destinationView(for form: FormCatalogItem) -> some View {
    if form.canRead {
        FormSubmissionsListView(formsRepository: IosAppContainer.shared.formsRepository)
    } else {
        FormDetailView(form: form)
    }
}
```

- [ ] **Step 3: Build the iOS app to confirm compilation**

Run: `cd kmp-mobile && ./gradlew :shared:assembleSharedXCFramework && cd ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build`
Expected: BUILD SUCCEEDED. (`assembleSharedXCFramework` is the convention task name per project memory — confirm via `./gradlew :shared:tasks --all | grep -i xcframework` if it errors.)

- [ ] **Step 4: Format**

Run: `cd kmp-mobile/ios && swiftformat . && swiftlint --fix`

- [ ] **Step 5: Commit**

```bash
cd kmp-mobile
git add ios/PazChurch/Features/Formularios
git commit -m "feat(ios): add FormSubmissionsListView for ministry-linked forms"
```

---

### Task 11: `FormDetailViewModel` test — confirm ministry-member-only submission succeeds

**Files:**
- Create: `kmp-mobile/android/src/test/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModelTest.kt`

- [ ] **Step 1: Write the test**

```kotlin
package br.church.paz.android.ui.features.formularios

import br.church.paz.android.MainDispatcherRule
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.FormsRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class FormDetailViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val formsRepository = mockk<FormsRepository>()
    private val authRepository = mockk<AuthRepository>()

    @Test
    fun `member-only ministry member (global role member, canRead false) can submit service-reports`() =
        runTest {
            val catalog =
                listOf(
                    FormCatalogItem(
                        id = "service-reports",
                        title = "Relatório do Culto",
                        description = null,
                        canWrite = true,
                        canRead = false,
                    ),
                )
            coEvery { formsRepository.getCatalog() } returns catalog
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", role = "member")
            coEvery { formsRepository.submitServiceReport(any()) } returns Unit

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)

            viewModel.onFieldChanged("date", "14/06/2026")
            viewModel.onFieldChanged("report_type", "culto_celebracao")
            viewModel.onFieldChanged("period", "manha")
            viewModel.onFieldChanged("atmosphere_responsible", "Maria")
            viewModel.onFieldChanged("tadel_adults", "10")
            viewModel.onFieldChanged("vehicles_cars", "2")
            viewModel.onSubmit()

            coVerify { formsRepository.submitServiceReport(any<ServiceReportForm>()) }
            assertNull(viewModel.uiState.value.error)
        }
}
```

(Adjust the `User` constructor args to whatever fields the actual `User` model in `:shared` requires — check `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/User.kt` before finalizing this step; the field defs for `service-reports` required fields must match `FormDetailView.swift`'s `fieldDefs` list shown above: `date`, `report_type`, `period`, `tadel_adults`, `vehicles_cars` are `required: true`.)

- [ ] **Step 2: Run test to verify it fails first if `FormDetailViewModelTest.kt` didn't exist**

Run: `cd kmp-mobile && ./gradlew :android:testDebugUnitTest --tests "*FormDetailViewModelTest*"`
Expected: FAIL only if the `User`/`FormCatalogItem` constructor args above don't match the real model — fix arg names against the actual file, not by changing production code.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd kmp-mobile && ./gradlew :android:testDebugUnitTest --tests "*FormDetailViewModelTest*"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd kmp-mobile
git add android/src/test/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModelTest.kt
git commit -m "test: confirm ministry-member-only user can submit service-reports"
```

---

## Final Verification

### Task 12: Full-stack smoke test

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && npm run test`
Expected: all PASS.

- [ ] **Step 2: Run all KMP tests**

Run: `cd kmp-mobile && ./gradlew allTests`
Expected: all PASS.

- [ ] **Step 3: Lint everything touched**

```bash
cd backend && npm run lint
cd kmp-mobile && ./gradlew ktlintFormat
cd kmp-mobile/ios && swiftformat . && swiftlint
```

- [ ] **Step 4: Manual end-to-end check per the Admin-ui section (Task 7)**, plus Android/iOS:
  - Run the Android app, log in as the plain Atmosfera member → tap "Relatório do Culto" → goes straight to the add form (no list).
  - Log in as the Atmosfera leader → tap the card → see the submissions list → tap a row → see read-only detail.
  - Repeat both on iOS simulator.

- [ ] **Step 5: Commit any final fixups, then update root submodule pointers**

```bash
cd /Users/jonathalima/Developer/church
git add backend kmp-mobile
git commit -m "chore: update backend + kmp-mobile submodules — ministry-based service-reports access"
```
