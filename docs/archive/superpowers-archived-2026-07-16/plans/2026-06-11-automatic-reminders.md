# Automatic Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable, recurring automatic push-notification system (form-report reminders, event reminders, member-journey nudges) driven by a single hourly cron, plus an admin "Automáticos" tab to enable/configure each reminder and an origin filter in the history.

**Architecture:** One `@Cron(EVERY_HOUR)` job loads enabled `reminder_rules` rows and delegates each to a type-specific `ReminderEvaluator` that resolves target users and dispatches through the existing `NotificationDispatchService`/FCM pipeline. Reminders persist `Notification` rows tagged `origin = 'automatic'`. Idempotency uses `reminder_rules.last_run_at` (form reports) and a `reminder_dispatch_log` unique key (events / journey).

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL 16, `@nestjs/schedule`, Jest (backend) · Next.js 15, React 19, TanStack Query, shadcn/ui (admin-ui).

**Spec:** `docs/superpowers/specs/2026-06-11-automatic-reminders-design.md`

> All backend commands run from `backend/`. All admin commands run from `admin-ui/`. Backend JSON is snake_case on the wire; entity properties are camelCase with `@Column({ name: 'snake_case' })`.

---

## Backend

### Task 1: Install `@nestjs/schedule` and register `ScheduleModule`

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Install the dependency**

Run: `cd backend && npm install @nestjs/schedule`
Expected: `@nestjs/schedule` added to `package.json` dependencies.

- [ ] **Step 2: Register `ScheduleModule.forRoot()` in AppModule**

In `backend/src/app.module.ts`, add the import and include it in the `imports` array (place it alongside the other top-level module imports):

```typescript
import { ScheduleModule } from '@nestjs/schedule';
```

```typescript
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ...existing imports unchanged
  ],
})
```

- [ ] **Step 3: Verify the app still boots / compiles**

Run: `cd backend && npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/app.module.ts
git commit -m "chore(backend): add @nestjs/schedule and register ScheduleModule"
```

---

### Task 2: Add `origin` column to notifications

**Files:**
- Create: `backend/database/migrations/1780900000001-AddOriginToNotifications.ts`
- Modify: `backend/src/notifications/entities/notification.entity.ts`
- Modify: `backend/src/notifications/notifications.service.ts`
- Modify: `backend/src/notifications/notifications.controller.ts`
- Test: `backend/src/notifications/notifications.service.spec.ts`

- [ ] **Step 1: Write the migration**

Create `backend/database/migrations/1780900000001-AddOriginToNotifications.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginToNotifications1780900000001
  implements MigrationInterface
{
  name = 'AddOriginToNotifications1780900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "notification_origin_enum" AS ENUM ('manual', 'automatic')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "origin" "notification_origin_enum" NOT NULL DEFAULT 'manual'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "origin"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_origin_enum"`);
  }
}
```

- [ ] **Step 2: Add the column + type to the entity**

In `backend/src/notifications/entities/notification.entity.ts`, after the `NotificationStatus` type add:

```typescript
export type NotificationOrigin = 'manual' | 'automatic';
```

And inside the `Notification` class, after the `status` column block add:

```typescript
  @Column({
    type: 'enum',
    enum: ['manual', 'automatic'],
    enumName: 'notification_origin_enum',
    default: 'manual',
  })
  origin: NotificationOrigin;
```

- [ ] **Step 3: Expose `origin` in the response and add an origin filter to `findAll`**

In `backend/src/notifications/notifications.service.ts`:

Change the `findAll` signature and query:

```typescript
  async findAll(origin?: 'manual' | 'automatic') {
    const notifications = await this.entityManager.find(Notification, {
      relations: ['createdBy'],
      where: origin ? { origin } : {},
      order: { createdAt: 'DESC' },
    });
    return notifications.map((n) => this.toResponse(n));
  }
```

In `toResponse`, add `origin` to the returned object (after `status`):

```typescript
      origin: n.origin,
```

- [ ] **Step 4: Pass the query param through the controller**

In `backend/src/notifications/notifications.controller.ts`, update `findAll`:

```typescript
import { Query } from '@nestjs/common';
```

```typescript
  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor', 'area_leader', 'sector_leader')
  findAll(@Query('origin') origin?: 'manual' | 'automatic') {
    return this.notificationsService.findAll(origin);
  }
```

- [ ] **Step 5: Write a failing test for the origin filter**

In `backend/src/notifications/notifications.service.spec.ts`, add a test that mocks `entityManager.find` and asserts the `where` clause. Match the existing mocking style in that file; if `entityManager` is mocked, assert:

```typescript
  it('findAll passes origin filter to the where clause', async () => {
    const findSpy = jest
      .spyOn(entityManager, 'find')
      .mockResolvedValue([] as never);
    await service.findAll('automatic');
    expect(findSpy).toHaveBeenCalledWith(
      Notification,
      expect.objectContaining({ where: { origin: 'automatic' } }),
    );
  });
```

(If the spec instantiates `entityManager` differently, adapt the spy target to the same mock used by other tests in the file.)

- [ ] **Step 6: Run the test**

Run: `cd backend && npx jest src/notifications/notifications.service.spec.ts -t "origin filter"`
Expected: PASS (implementation from steps 3–4 already satisfies it).

- [ ] **Step 7: Commit**

```bash
git add backend/database/migrations/1780900000001-AddOriginToNotifications.ts backend/src/notifications/entities/notification.entity.ts backend/src/notifications/notifications.service.ts backend/src/notifications/notifications.controller.ts backend/src/notifications/notifications.service.spec.ts
git commit -m "feat(backend): tag notifications with manual/automatic origin + filter"
```

---

### Task 3: Export `NotificationDispatchService` for reuse

**Files:**
- Modify: `backend/src/notifications/notifications.module.ts`

- [ ] **Step 1: Add the export**

In `backend/src/notifications/notifications.module.ts`, add an `exports` array so other modules can inject the dispatcher:

```typescript
@Module({
  imports: [UsersModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDispatchService,
    FcmService,
    EmailService,
    SmsService,
    WhatsAppService,
  ],
  exports: [NotificationDispatchService],
})
export class NotificationsModule {}
```

- [ ] **Step 2: Verify build**

Run: `cd backend && npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add backend/src/notifications/notifications.module.ts
git commit -m "chore(backend): export NotificationDispatchService"
```

---

### Task 4: `ReminderRule` entity + types + migration

**Files:**
- Create: `backend/src/reminders/types/reminder-config.ts`
- Create: `backend/src/reminders/entities/reminder-rule.entity.ts`
- Create: `backend/database/migrations/1780900000002-CreateReminderRules.ts`
- Modify: `backend/src/configs/orm.config.ts`

- [ ] **Step 1: Create the config + type definitions**

Create `backend/src/reminders/types/reminder-config.ts`:

```typescript
export type ReminderRuleType = 'form_report' | 'event' | 'member_journey';

export interface FormReportReminderConfig {
  weekday: number; // 0 = Sunday … 6 = Saturday
  hour: number; // 0–23
  minute: number; // 0–59
  roles: string[]; // role slugs
}

export interface EventReminderConfig {
  lead_times_hours: number[]; // e.g. [24, 1]
}

export interface MemberJourneyReminderConfig {
  threshold_days: number;
  steps: string[]; // stage_key values
}

export type ReminderConfig =
  | FormReportReminderConfig
  | EventReminderConfig
  | MemberJourneyReminderConfig;

export const DEFAULT_CONFIGS: Record<ReminderRuleType, ReminderConfig> = {
  form_report: {
    weekday: 0,
    hour: 20,
    minute: 0,
    roles: ['life_group_leader', 'sector_leader', 'area_leader'],
  },
  event: { lead_times_hours: [24, 1] },
  member_journey: { threshold_days: 7, steps: [] },
};
```

- [ ] **Step 2: Create the entity**

Create `backend/src/reminders/entities/reminder-rule.entity.ts`:

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReminderConfig, ReminderRuleType } from '../types/reminder-config';

@Entity('reminder_rules')
export class ReminderRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['form_report', 'event', 'member_journey'],
    enumName: 'reminder_rule_type_enum',
    unique: true,
  })
  type: ReminderRuleType;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  config: ReminderConfig;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 3: Create the migration (creates table + seeds 3 disabled rows)**

Create `backend/database/migrations/1780900000002-CreateReminderRules.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReminderRules1780900000002 implements MigrationInterface {
  name = 'CreateReminderRules1780900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "reminder_rule_type_enum" AS ENUM ('form_report', 'event', 'member_journey')`,
    );
    await queryRunner.query(`
      CREATE TABLE "reminder_rules" (
        "id" SERIAL PRIMARY KEY,
        "type" "reminder_rule_type_enum" NOT NULL UNIQUE,
        "enabled" boolean NOT NULL DEFAULT false,
        "config" jsonb NOT NULL DEFAULT '{}',
        "last_run_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "reminder_rules" ("type", "enabled", "config") VALUES
        ('form_report', false, '{"weekday":0,"hour":20,"minute":0,"roles":["life_group_leader","sector_leader","area_leader"]}'),
        ('event', false, '{"lead_times_hours":[24,1]}'),
        ('member_journey', false, '{"threshold_days":7,"steps":[]}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reminder_rules"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reminder_rule_type_enum"`);
  }
}
```

- [ ] **Step 4: Register the entity in orm config**

In `backend/src/configs/orm.config.ts`, add the import near the other entity imports:

```typescript
import { ReminderRule } from '../reminders/entities/reminder-rule.entity';
```

And add `ReminderRule` to the `entities: [ ... ]` array.

- [ ] **Step 5: Verify build**

Run: `cd backend && npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add backend/src/reminders backend/database/migrations/1780900000002-CreateReminderRules.ts backend/src/configs/orm.config.ts
git commit -m "feat(backend): add reminder_rules entity, types, and migration"
```

---

### Task 5: `reminder_dispatch_log` entity + migration

**Files:**
- Create: `backend/src/reminders/entities/reminder-dispatch-log.entity.ts`
- Create: `backend/database/migrations/1780900000003-CreateReminderDispatchLog.ts`
- Modify: `backend/src/configs/orm.config.ts`

- [ ] **Step 1: Create the entity**

Create `backend/src/reminders/entities/reminder-dispatch-log.entity.ts`:

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReminderRuleType } from '../types/reminder-config';

@Entity('reminder_dispatch_log')
@Index(['ruleType', 'dedupeKey'], { unique: true })
export class ReminderDispatchLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rule_type', type: 'varchar', length: 32 })
  ruleType: ReminderRuleType;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 255 })
  dedupeKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- [ ] **Step 2: Create the migration**

Create `backend/database/migrations/1780900000003-CreateReminderDispatchLog.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReminderDispatchLog1780900000003
  implements MigrationInterface
{
  name = 'CreateReminderDispatchLog1780900000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reminder_dispatch_log" (
        "id" SERIAL PRIMARY KEY,
        "rule_type" varchar(32) NOT NULL,
        "dedupe_key" varchar(255) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_reminder_dispatch_dedupe" ON "reminder_dispatch_log" ("rule_type", "dedupe_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_reminder_dispatch_dedupe"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "reminder_dispatch_log"`);
  }
}
```

- [ ] **Step 3: Register the entity in orm config**

In `backend/src/configs/orm.config.ts` add:

```typescript
import { ReminderDispatchLog } from '../reminders/entities/reminder-dispatch-log.entity';
```

Add `ReminderDispatchLog` to the `entities` array.

- [ ] **Step 4: Verify build**

Run: `cd backend && npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add backend/src/reminders/entities/reminder-dispatch-log.entity.ts backend/database/migrations/1780900000003-CreateReminderDispatchLog.ts backend/src/configs/orm.config.ts
git commit -m "feat(backend): add reminder_dispatch_log for idempotency"
```

---

### Task 6: Update DTO + `RemindersService` (CRUD over rules)

**Files:**
- Create: `backend/src/reminders/dto/update-reminder-rule.dto.ts`
- Create: `backend/src/reminders/reminders.service.ts`
- Test: `backend/src/reminders/reminders.service.spec.ts`

- [ ] **Step 1: Create the update DTO**

Create `backend/src/reminders/dto/update-reminder-rule.dto.ts`:

```typescript
import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { ReminderConfig } from '../types/reminder-config';

export class UpdateReminderRuleDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: ReminderConfig;
}
```

- [ ] **Step 2: Write the failing test**

Create `backend/src/reminders/reminders.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RemindersService } from './reminders.service';
import { ReminderRule } from './entities/reminder-rule.entity';

describe('RemindersService', () => {
  let service: RemindersService;
  let repo: jest.Mocked<Repository<ReminderRule>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RemindersService,
        {
          provide: getRepositoryToken(ReminderRule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn((x) => Promise.resolve(x)),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(RemindersService);
    repo = moduleRef.get(getRepositoryToken(ReminderRule));
  });

  it('findAll returns all rules', async () => {
    repo.find.mockResolvedValue([{ id: 1 } as ReminderRule]);
    await expect(service.findAll()).resolves.toHaveLength(1);
  });

  it('update throws when rule missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.update(99, { enabled: true })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update merges enabled + config', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      enabled: false,
      config: { lead_times_hours: [24] },
    } as ReminderRule);
    const result = await service.update(1, {
      enabled: true,
      config: { lead_times_hours: [12, 1] } as never,
    });
    expect(result.enabled).toBe(true);
    expect(repo.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test (expect fail — service missing)**

Run: `cd backend && npx jest src/reminders/reminders.service.spec.ts`
Expected: FAIL ("Cannot find module './reminders.service'").

- [ ] **Step 4: Implement the service**

Create `backend/src/reminders/reminders.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderRule } from './entities/reminder-rule.entity';
import { UpdateReminderRuleDto } from './dto/update-reminder-rule.dto';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(ReminderRule)
    private readonly repo: Repository<ReminderRule>,
  ) {}

  findAll(): Promise<ReminderRule[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async update(
    id: number,
    dto: UpdateReminderRuleDto,
  ): Promise<ReminderRule> {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Reminder rule #${id} not found`);
    if (dto.enabled !== undefined) rule.enabled = dto.enabled;
    if (dto.config !== undefined) rule.config = dto.config;
    return this.repo.save(rule);
  }
}
```

- [ ] **Step 5: Run the test (expect pass)**

Run: `cd backend && npx jest src/reminders/reminders.service.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/reminders/dto/update-reminder-rule.dto.ts backend/src/reminders/reminders.service.ts backend/src/reminders/reminders.service.spec.ts
git commit -m "feat(backend): RemindersService CRUD over reminder rules"
```

---

### Task 7: Evaluator interface + `FormReportReminderEvaluator`

**Files:**
- Create: `backend/src/reminders/evaluators/reminder-evaluator.interface.ts`
- Create: `backend/src/reminders/evaluators/form-report-reminder.evaluator.ts`
- Test: `backend/src/reminders/evaluators/form-report-reminder.evaluator.spec.ts`

- [ ] **Step 1: Create the evaluator interface**

Create `backend/src/reminders/evaluators/reminder-evaluator.interface.ts`:

```typescript
import { ReminderRule } from '../entities/reminder-rule.entity';
import { ReminderRuleType } from '../types/reminder-config';

export interface ReminderEvaluator {
  readonly type: ReminderRuleType;
  /** Decide whether to fire for `now` and, if so, resolve targets + dispatch. */
  run(rule: ReminderRule, now: Date): Promise<void>;
}

export const REMINDER_EVALUATORS = Symbol('REMINDER_EVALUATORS');
```

- [ ] **Step 2: Write the failing test**

Create `backend/src/reminders/evaluators/form-report-reminder.evaluator.spec.ts`:

```typescript
import { FormReportReminderEvaluator } from './form-report-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';

describe('FormReportReminderEvaluator', () => {
  const makeRule = (overrides: Partial<ReminderRule> = {}): ReminderRule =>
    ({
      id: 1,
      type: 'form_report',
      enabled: true,
      config: { weekday: 0, hour: 20, minute: 0, roles: ['life_group_leader'] },
      lastRunAt: null,
      ...overrides,
    }) as ReminderRule;

  const entityManager = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((_e, v) => v),
    save: jest.fn((x) => Promise.resolve({ id: 10, ...x })),
    update: jest.fn(),
  } as never;
  const dispatch = { dispatch: jest.fn() } as never;

  it('does not fire when current weekday/hour does not match config', async () => {
    const evaluator = new FormReportReminderEvaluator(entityManager, dispatch);
    // Monday 10:00 — config wants Sunday 20:00
    const now = new Date('2026-06-08T10:00:00');
    await evaluator.run(makeRule(), now);
    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });

  it('does not fire twice in the same period (lastRunAt this period)', async () => {
    const evaluator = new FormReportReminderEvaluator(entityManager, dispatch);
    const now = new Date('2026-06-07T20:30:00'); // Sunday 20:xx
    const rule = makeRule({ lastRunAt: new Date('2026-06-07T20:05:00') });
    await evaluator.run(rule, now);
    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test (expect fail)**

Run: `cd backend && npx jest src/reminders/evaluators/form-report-reminder.evaluator.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement the evaluator**

Create `backend/src/reminders/evaluators/form-report-reminder.evaluator.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import {
  FormReportReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import { Notification } from '../../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { User } from '../../users/entities/user.entity';
import { MeetingReport } from '../../meeting-reports/entities/meeting-report.entity';

@Injectable()
export class FormReportReminderEvaluator implements ReminderEvaluator {
  readonly type: ReminderRuleType = 'form_report';

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = rule.config as FormReportReminderConfig;
    if (now.getDay() !== cfg.weekday || now.getHours() !== cfg.hour) return;

    // start of the current period = beginning of today (the configured weekday)
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    if (rule.lastRunAt && rule.lastRunAt >= periodStart) return;

    // leaders in the configured roles
    const leaders = await this.em
      .createQueryBuilder(User, 'u')
      .leftJoinAndSelect('u.role', 'role')
      .where('role.slug IN (:...roles)', { roles: cfg.roles })
      .getMany();
    if (leaders.length === 0) {
      await this.em.update(ReminderRule, rule.id, { lastRunAt: now });
      return;
    }

    // leaders who already submitted a report this period
    const reported = await this.em
      .createQueryBuilder(MeetingReport, 'm')
      .select('m.leader', 'leaderId')
      .where('m.created_at >= :start', { start: periodStart })
      .getRawMany<{ leaderId: number }>();
    const reportedIds = new Set(reported.map((r) => Number(r.leaderId)));

    const targets = leaders.filter((l) => !reportedIds.has(l.id));
    if (targets.length > 0) {
      const notification = await this.em.save(
        this.em.create(Notification, {
          title: 'Lembrete: relatório de reunião pendente',
          message:
            'Você ainda não enviou o relatório da reunião desta semana. Toque para enviar.',
          category: 'meeting_reports',
          channels: ['push'],
          segment: { type: 'filtered', filters: { roles: cfg.roles } },
          status: 'pending',
          origin: 'automatic',
        }),
      );
      await this.dispatch.dispatch(notification, targets);
    }

    await this.em.update(ReminderRule, rule.id, { lastRunAt: now });
  }
}
```

- [ ] **Step 5: Run the test (expect pass)**

Run: `cd backend && npx jest src/reminders/evaluators/form-report-reminder.evaluator.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/reminders/evaluators/reminder-evaluator.interface.ts backend/src/reminders/evaluators/form-report-reminder.evaluator.ts backend/src/reminders/evaluators/form-report-reminder.evaluator.spec.ts
git commit -m "feat(backend): form-report reminder evaluator"
```

---

### Task 8: `EventReminderEvaluator`

**Files:**
- Create: `backend/src/reminders/evaluators/event-reminder.evaluator.ts`
- Test: `backend/src/reminders/evaluators/event-reminder.evaluator.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/reminders/evaluators/event-reminder.evaluator.spec.ts`:

```typescript
import { EventReminderEvaluator } from './event-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';

describe('EventReminderEvaluator', () => {
  const rule = {
    id: 2,
    type: 'event',
    enabled: true,
    config: { lead_times_hours: [24] },
  } as ReminderRule;

  it('fires for an event whose start is within the 24h lead window', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const eventStart = new Date('2026-06-11T20:30:00'); // ~24h ahead
    const em = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 5, title: 'Culto', initialDate: eventStart }]) // events
          .mockResolvedValue([{ id: 1 }]), // users
      }),
      insert: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_e, v) => v),
      save: jest.fn((x) => Promise.resolve({ id: 30, ...x })),
    } as never;
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new EventReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);
    expect((dispatch as any).dispatch).toHaveBeenCalledTimes(1);
  });

  it('skips when dedupe insert raises a unique violation', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const eventStart = new Date('2026-06-11T20:30:00');
    const em = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 5, title: 'Culto', initialDate: eventStart }]),
      }),
      insert: jest.fn().mockRejectedValue({ code: '23505' }),
      create: jest.fn((_e, v) => v),
      save: jest.fn(),
    } as never;
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new EventReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);
    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test (expect fail)**

Run: `cd backend && npx jest src/reminders/evaluators/event-reminder.evaluator.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the evaluator**

Create `backend/src/reminders/evaluators/event-reminder.evaluator.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import {
  EventReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import { Notification } from '../../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../users/entities/user.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';

const ONE_HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class EventReminderEvaluator implements ReminderEvaluator {
  readonly type: ReminderRuleType = 'event';

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = rule.config as EventReminderConfig;
    const maxLead = Math.max(...cfg.lead_times_hours, 0);

    const upcoming = await this.em
      .createQueryBuilder(Event, 'e')
      .where('e.initial_date > :now', { now })
      .andWhere('e.initial_date <= :horizon', {
        horizon: new Date(now.getTime() + (maxLead + 1) * ONE_HOUR_MS),
      })
      .getMany();

    for (const event of upcoming) {
      for (const lead of cfg.lead_times_hours) {
        const windowStart = new Date(
          event.initialDate.getTime() - lead * ONE_HOUR_MS,
        );
        const inWindow =
          now >= windowStart &&
          now < new Date(windowStart.getTime() + ONE_HOUR_MS);
        if (!inWindow) continue;

        const dedupeKey = `event:${event.id}:${lead}h`;
        try {
          await this.em.insert(ReminderDispatchLog, {
            ruleType: 'event',
            dedupeKey,
          });
        } catch (err: unknown) {
          if ((err as { code?: string }).code === '23505') continue; // already sent
          throw err;
        }

        const users = await this.em
          .createQueryBuilder(User, 'u')
          .getMany();
        const notification = await this.em.save(
          this.em.create(Notification, {
            title: `Lembrete: ${event.title}`,
            message: `O evento "${event.title}" começa em breve.`,
            category: 'events',
            channels: ['push'],
            segment: { type: 'all' },
            status: 'pending',
            origin: 'automatic',
          }),
        );
        await this.dispatch.dispatch(notification, users);
      }
    }
  }
}
```

- [ ] **Step 4: Run the test (expect pass)**

Run: `cd backend && npx jest src/reminders/evaluators/event-reminder.evaluator.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/reminders/evaluators/event-reminder.evaluator.ts backend/src/reminders/evaluators/event-reminder.evaluator.spec.ts
git commit -m "feat(backend): event reminder evaluator with lead-time windows"
```

---

### Task 9: `MemberJourneyReminderEvaluator`

**Files:**
- Create: `backend/src/reminders/evaluators/member-journey-reminder.evaluator.ts`
- Test: `backend/src/reminders/evaluators/member-journey-reminder.evaluator.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/reminders/evaluators/member-journey-reminder.evaluator.spec.ts`:

```typescript
import { MemberJourneyReminderEvaluator } from './member-journey-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';

describe('MemberJourneyReminderEvaluator', () => {
  const rule = {
    id: 3,
    type: 'member_journey',
    enabled: true,
    config: { threshold_days: 7, steps: ['baptism'] },
  } as ReminderRule;

  it('dispatches once per stuck member and logs dedupe', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const em = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { memberId: 7, stageKey: 'baptism', member: { id: 7 } },
        ]),
      }),
      insert: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue({ id: 7 }),
      create: jest.fn((_e, v) => v),
      save: jest.fn((x) => Promise.resolve({ id: 40, ...x })),
    } as never;
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new MemberJourneyReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);
    expect((dispatch as any).dispatch).toHaveBeenCalledTimes(1);
    expect((em as any).insert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test (expect fail)**

Run: `cd backend && npx jest src/reminders/evaluators/member-journey-reminder.evaluator.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the evaluator**

Create `backend/src/reminders/evaluators/member-journey-reminder.evaluator.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import {
  MemberJourneyReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import { Notification } from '../../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { MemberJourneyStage } from '../../member-journey/entities/member-journey-stage.entity';
import { User } from '../../users/entities/user.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MemberJourneyReminderEvaluator implements ReminderEvaluator {
  readonly type: ReminderRuleType = 'member_journey';

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = rule.config as MemberJourneyReminderConfig;
    if (!cfg.steps || cfg.steps.length === 0) return;

    const cutoff = new Date(now.getTime() - cfg.threshold_days * ONE_DAY_MS);

    const stuck = await this.em
      .createQueryBuilder(MemberJourneyStage, 's')
      .leftJoinAndSelect('s.member', 'member')
      .where('s.stage_key IN (:...steps)', { steps: cfg.steps })
      .andWhere('s.completed = false')
      .andWhere('s.updated_at <= :cutoff', { cutoff })
      .getMany();

    for (const stage of stuck) {
      const dedupeKey = `journey:${stage.memberId}:${stage.stageKey}`;
      try {
        await this.em.insert(ReminderDispatchLog, {
          ruleType: 'member_journey',
          dedupeKey,
        });
      } catch (err: unknown) {
        if ((err as { code?: string }).code === '23505') continue;
        throw err;
      }

      const user = await this.em.findOne(User, {
        where: { id: stage.memberId },
      });
      if (!user) continue;

      const notification = await this.em.save(
        this.em.create(Notification, {
          title: 'Continue sua jornada',
          message: 'Há um próximo passo esperando por você na sua jornada.',
          category: 'member_journey',
          channels: ['push'],
          segment: { type: 'filtered', filters: {} },
          status: 'pending',
          origin: 'automatic',
        }),
      );
      await this.dispatch.dispatch(notification, [user]);
    }
  }
}
```

- [ ] **Step 4: Run the test (expect pass)**

Run: `cd backend && npx jest src/reminders/evaluators/member-journey-reminder.evaluator.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/reminders/evaluators/member-journey-reminder.evaluator.ts backend/src/reminders/evaluators/member-journey-reminder.evaluator.spec.ts
git commit -m "feat(backend): member-journey reminder evaluator"
```

---

### Task 10: `ReminderSchedulerService` (the hourly tick)

**Files:**
- Create: `backend/src/reminders/reminder-scheduler.service.ts`
- Test: `backend/src/reminders/reminder-scheduler.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/reminders/reminder-scheduler.service.spec.ts`:

```typescript
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderRule } from './entities/reminder-rule.entity';

describe('ReminderSchedulerService', () => {
  it('routes each enabled rule to the matching evaluator', async () => {
    const rules: ReminderRule[] = [
      { id: 1, type: 'event', enabled: true } as ReminderRule,
      { id: 2, type: 'form_report', enabled: true } as ReminderRule,
    ];
    const remindersService = { findEnabled: jest.fn().mockResolvedValue(rules) } as never;
    const eventEval = { type: 'event', run: jest.fn() };
    const formEval = { type: 'form_report', run: jest.fn() };

    const scheduler = new ReminderSchedulerService(remindersService, [
      eventEval as never,
      formEval as never,
    ]);
    await scheduler.tick();

    expect(eventEval.run).toHaveBeenCalledTimes(1);
    expect(formEval.run).toHaveBeenCalledTimes(1);
  });

  it('isolates evaluator failures (one throwing does not block others)', async () => {
    const rules: ReminderRule[] = [
      { id: 1, type: 'event', enabled: true } as ReminderRule,
      { id: 2, type: 'form_report', enabled: true } as ReminderRule,
    ];
    const remindersService = { findEnabled: jest.fn().mockResolvedValue(rules) } as never;
    const eventEval = { type: 'event', run: jest.fn().mockRejectedValue(new Error('boom')) };
    const formEval = { type: 'form_report', run: jest.fn() };

    const scheduler = new ReminderSchedulerService(remindersService, [
      eventEval as never,
      formEval as never,
    ]);
    await scheduler.tick();
    expect(formEval.run).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Add `findEnabled` to RemindersService**

In `backend/src/reminders/reminders.service.ts`, add:

```typescript
  findEnabled(): Promise<ReminderRule[]> {
    return this.repo.find({ where: { enabled: true }, order: { id: 'ASC' } });
  }
```

- [ ] **Step 3: Run the test (expect fail)**

Run: `cd backend && npx jest src/reminders/reminder-scheduler.service.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement the scheduler**

Create `backend/src/reminders/reminder-scheduler.service.ts`:

```typescript
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import {
  REMINDER_EVALUATORS,
  ReminderEvaluator,
} from './evaluators/reminder-evaluator.interface';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly remindersService: RemindersService,
    @Inject(REMINDER_EVALUATORS)
    private readonly evaluators: ReminderEvaluator[],
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick(now: Date = new Date()): Promise<void> {
    const rules = await this.remindersService.findEnabled();
    for (const rule of rules) {
      const evaluator = this.evaluators.find((e) => e.type === rule.type);
      if (!evaluator) continue;
      try {
        await evaluator.run(rule, now);
      } catch (err) {
        this.logger.error(
          `Reminder evaluator '${rule.type}' failed`,
          err as Error,
        );
      }
    }
  }
}
```

- [ ] **Step 5: Run the test (expect pass)**

Run: `cd backend && npx jest src/reminders/reminder-scheduler.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/reminders/reminder-scheduler.service.ts backend/src/reminders/reminder-scheduler.service.spec.ts backend/src/reminders/reminders.service.ts
git commit -m "feat(backend): hourly reminder scheduler with evaluator routing"
```

---

### Task 11: Controller + `RemindersModule` wiring

**Files:**
- Create: `backend/src/reminders/reminders.controller.ts`
- Create: `backend/src/reminders/reminders.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create the controller**

Create `backend/src/reminders/reminders.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RemindersService } from './reminders.service';
import { UpdateReminderRuleDto } from './dto/update-reminder-rule.dto';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@Controller('reminder-rules')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  findAll() {
    return this.remindersService.findAll();
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  update(@Param('id') id: string, @Body() dto: UpdateReminderRuleDto) {
    return this.remindersService.update(+id, dto);
  }
}
```

- [ ] **Step 2: Create the module**

Create `backend/src/reminders/reminders.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReminderRule } from './entities/reminder-rule.entity';
import { ReminderDispatchLog } from './entities/reminder-dispatch-log.entity';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { REMINDER_EVALUATORS } from './evaluators/reminder-evaluator.interface';
import { FormReportReminderEvaluator } from './evaluators/form-report-reminder.evaluator';
import { EventReminderEvaluator } from './evaluators/event-reminder.evaluator';
import { MemberJourneyReminderEvaluator } from './evaluators/member-journey-reminder.evaluator';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReminderRule, ReminderDispatchLog]),
    NotificationsModule,
  ],
  controllers: [RemindersController],
  providers: [
    RemindersService,
    ReminderSchedulerService,
    FormReportReminderEvaluator,
    EventReminderEvaluator,
    MemberJourneyReminderEvaluator,
    {
      provide: REMINDER_EVALUATORS,
      useFactory: (
        form: FormReportReminderEvaluator,
        event: EventReminderEvaluator,
        journey: MemberJourneyReminderEvaluator,
      ) => [form, event, journey],
      inject: [
        FormReportReminderEvaluator,
        EventReminderEvaluator,
        MemberJourneyReminderEvaluator,
      ],
    },
  ],
})
export class RemindersModule {}
```

- [ ] **Step 3: Register `RemindersModule` in AppModule**

In `backend/src/app.module.ts` add `import { RemindersModule } from './reminders/reminders.module';` and add `RemindersModule` to the `imports` array.

- [ ] **Step 4: Verify the whole backend builds and tests pass**

Run: `cd backend && npm run build && npx jest src/reminders src/notifications`
Expected: build succeeds; all reminders + notifications tests pass.

- [ ] **Step 5: Run migrations against local DB (optional sanity check)**

Run: `cd backend && npm run migration:run`
Expected: the three new migrations apply cleanly (requires `docker compose up -d`).

- [ ] **Step 6: Commit**

```bash
git add backend/src/reminders/reminders.controller.ts backend/src/reminders/reminders.module.ts backend/src/app.module.ts
git commit -m "feat(backend): wire RemindersModule (controller + scheduler + evaluators)"
```

---

## Admin UI

### Task 12: Reminder-rules API types, endpoint, and hook

**Files:**
- Create: `admin-ui/lib/api/types/reminder-rules.ts`
- Modify: `admin-ui/lib/api/types/index.ts`
- Create: `admin-ui/lib/api/endpoints/reminder-rules.ts`
- Create: `admin-ui/lib/hooks/use-reminder-rules.ts`
- Modify: `admin-ui/lib/api/types/notifications.ts`

- [ ] **Step 1: Add the `origin` field to the Notification type**

In `admin-ui/lib/api/types/notifications.ts`, add to the `Notification` interface (after `status`):

```typescript
  origin: 'manual' | 'automatic'
```

- [ ] **Step 2: Create the reminder-rules types**

Create `admin-ui/lib/api/types/reminder-rules.ts`:

```typescript
// admin-ui/lib/api/types/reminder-rules.ts

export type ReminderRuleType = 'form_report' | 'event' | 'member_journey'

export interface FormReportReminderConfig {
  weekday: number
  hour: number
  minute: number
  roles: string[]
}

export interface EventReminderConfig {
  lead_times_hours: number[]
}

export interface MemberJourneyReminderConfig {
  threshold_days: number
  steps: string[]
}

export type ReminderConfig =
  | FormReportReminderConfig
  | EventReminderConfig
  | MemberJourneyReminderConfig

export interface ReminderRule {
  id: number
  type: ReminderRuleType
  enabled: boolean
  config: ReminderConfig
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface UpdateReminderRuleRequest {
  enabled?: boolean
  config?: ReminderConfig
}
```

- [ ] **Step 3: Re-export from the barrel**

In `admin-ui/lib/api/types/index.ts`, add:

```typescript
export * from './reminder-rules'
```

- [ ] **Step 4: Create the endpoint wrapper**

Create `admin-ui/lib/api/endpoints/reminder-rules.ts`:

```typescript
// admin-ui/lib/api/endpoints/reminder-rules.ts
import { api } from '../client'
import type { ReminderRule, UpdateReminderRuleRequest } from '../types'

export const reminderRulesApi = {
  getAll: () => api.get<ReminderRule[]>('/reminder-rules'),

  update: (id: number, data: UpdateReminderRuleRequest) =>
    api.patch<ReminderRule>(`/reminder-rules/${id}`, data),
}
```

- [ ] **Step 5: Create the hook**

Create `admin-ui/lib/hooks/use-reminder-rules.ts`:

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reminderRulesApi } from '@/lib/api/endpoints/reminder-rules'
import type { UpdateReminderRuleRequest } from '@/lib/api/types'
import { trackEvent } from '@/lib/firebase/analytics'

const QUERY_KEY = ['reminder-rules']

export function useReminderRules() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => reminderRulesApi.getAll(),
  })
}

export function useUpdateReminderRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateReminderRuleRequest }) =>
      reminderRulesApi.update(id, data),
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent('reminder_rule_updated', { reminder_type: rule.type })
    },
    onError: () => {
      console.error('Failed to update reminder rule')
    },
  })
}
```

- [ ] **Step 6: Type-check / lint**

Run: `cd admin-ui && npm run lint`
Expected: no errors in the new files.

- [ ] **Step 7: Commit**

```bash
git add admin-ui/lib/api/types/reminder-rules.ts admin-ui/lib/api/types/index.ts admin-ui/lib/api/types/notifications.ts admin-ui/lib/api/endpoints/reminder-rules.ts admin-ui/lib/hooks/use-reminder-rules.ts
git commit -m "feat(admin): reminder-rules api types, endpoint, and hook"
```

---

### Task 13: "Automáticos" tab in the notifications page

**Files:**
- Create: `admin-ui/app/(dashboard)/notifications/reminder-settings.tsx`
- Modify: `admin-ui/app/(dashboard)/notifications/notification-system.tsx`

- [ ] **Step 1: Create the reminder-settings component**

Create `admin-ui/app/(dashboard)/notifications/reminder-settings.tsx`. This renders one card per rule with type-specific controls. Save merges changes via `useUpdateReminderRule`.

```tsx
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReminderRules, useUpdateReminderRule } from '@/lib/hooks/use-reminder-rules'
import type {
  ReminderRule,
  FormReportReminderConfig,
  EventReminderConfig,
  MemberJourneyReminderConfig,
} from '@/lib/api/types'

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

const RULE_TITLES: Record<ReminderRule['type'], string> = {
  form_report: 'Lembretes de Formulário',
  event: 'Lembretes de Evento',
  member_journey: 'Jornada do Membro',
}

export function ReminderSettings() {
  const { data: rules = [], isLoading } = useReminderRules()
  if (isLoading) return <p className="text-center text-muted-foreground">Carregando...</p>
  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <ReminderCard key={rule.id} rule={rule} />
      ))}
    </div>
  )
}

function ReminderCard({ rule }: { rule: ReminderRule }) {
  const update = useUpdateReminderRule()
  const [enabled, setEnabled] = useState(rule.enabled)
  const [config, setConfig] = useState(rule.config)

  useEffect(() => {
    setEnabled(rule.enabled)
    setConfig(rule.config)
  }, [rule])

  const onSave = () => {
    update.mutate(
      { id: rule.id, data: { enabled, config } },
      {
        onSuccess: () => toast.success('Lembrete atualizado'),
        onError: () => toast.error('Falha ao atualizar lembrete'),
      },
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{RULE_TITLES[rule.type]}</CardTitle>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </CardHeader>
      <CardContent className="space-y-4">
        {rule.type === 'form_report' && (
          <FormReportControls
            config={config as FormReportReminderConfig}
            onChange={setConfig}
            disabled={!enabled}
          />
        )}
        {rule.type === 'event' && (
          <EventControls
            config={config as EventReminderConfig}
            onChange={setConfig}
            disabled={!enabled}
          />
        )}
        {rule.type === 'member_journey' && (
          <MemberJourneyControls
            config={config as MemberJourneyReminderConfig}
            onChange={setConfig}
            disabled={!enabled}
          />
        )}
        <Button onClick={onSave} disabled={update.isPending}>
          Salvar
        </Button>
      </CardContent>
    </Card>
  )
}

function FormReportControls({
  config,
  onChange,
  disabled,
}: {
  config: FormReportReminderConfig
  onChange: (c: FormReportReminderConfig) => void
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Dia da semana</Label>
        <Select
          value={String(config.weekday)}
          onValueChange={(v) => onChange({ ...config, weekday: Number(v) })}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {WEEKDAYS.map((d) => (
              <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Hora (0–23)</Label>
        <Input
          type="number"
          min={0}
          max={23}
          value={config.hour}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, hour: Number(e.target.value) })}
        />
      </div>
    </div>
  )
}

function EventControls({
  config,
  onChange,
  disabled,
}: {
  config: EventReminderConfig
  onChange: (c: EventReminderConfig) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>Antecedências (horas, separadas por vírgula)</Label>
      <Input
        value={config.lead_times_hours.join(', ')}
        disabled={disabled}
        onChange={(e) =>
          onChange({
            ...config,
            lead_times_hours: e.target.value
              .split(',')
              .map((s) => Number(s.trim()))
              .filter((n) => !Number.isNaN(n) && n > 0),
          })
        }
      />
    </div>
  )
}

function MemberJourneyControls({
  config,
  onChange,
  disabled,
}: {
  config: MemberJourneyReminderConfig
  onChange: (c: MemberJourneyReminderConfig) => void
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Dias parado</Label>
        <Input
          type="number"
          min={1}
          value={config.threshold_days}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, threshold_days: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label>Etapas (chaves, separadas por vírgula)</Label>
        <Input
          value={config.steps.join(', ')}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...config,
              steps: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the tab to notification-system.tsx**

In `admin-ui/app/(dashboard)/notifications/notification-system.tsx`:

Add the import near the other imports:

```typescript
import { ReminderSettings } from './reminder-settings'
```

Widen the tab union (line 110):

```typescript
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'automatic'>('compose')
```

Update the `Tabs` `onValueChange` cast (line 325):

```tsx
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'compose' | 'history' | 'automatic')}>
```

Add the trigger inside `TabsList` (after the history trigger, line 328):

```tsx
          <TabsTrigger value="automatic">Automáticos</TabsTrigger>
```

Add the tab content right before the closing `</Tabs>` (line 695):

```tsx
        {/* AUTOMATIC TAB */}
        <TabsContent value="automatic">
          <ReminderSettings />
        </TabsContent>
```

- [ ] **Step 3: Run dev build to verify it renders**

Run: `cd admin-ui && npm run lint && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add admin-ui/app/(dashboard)/notifications/reminder-settings.tsx "admin-ui/app/(dashboard)/notifications/notification-system.tsx"
git commit -m "feat(admin): Automáticos tab to configure reminder rules"
```

---

### Task 14: Origin filter + badge in the Histórico tab

**Files:**
- Modify: `admin-ui/lib/api/endpoints/notifications.ts`
- Modify: `admin-ui/lib/hooks/use-notifications.ts`
- Modify: `admin-ui/app/(dashboard)/notifications/notification-system.tsx`

- [ ] **Step 1: Accept an origin filter in the endpoint**

In `admin-ui/lib/api/endpoints/notifications.ts`, change `getAll`:

```typescript
  getAll: (origin?: 'manual' | 'automatic') =>
    api.get<Notification[]>(
      origin ? `/notifications?origin=${origin}` : '/notifications',
    ),
```

- [ ] **Step 2: Thread the filter through the hook**

In `admin-ui/lib/hooks/use-notifications.ts`, change `useNotifications`:

```typescript
export function useNotifications(origin?: 'manual' | 'automatic') {
  return useQuery({
    queryKey: [...QUERY_KEY, origin ?? 'all'],
    queryFn: () => notificationsApi.getAll(origin),
  })
}
```

- [ ] **Step 3: Add origin state + filter control + badge in the page**

In `admin-ui/app/(dashboard)/notifications/notification-system.tsx`:

Add state near the other `useState` calls (after line 120):

```typescript
  const [historyOrigin, setHistoryOrigin] = useState<'all' | 'manual' | 'automatic'>('all')
```

Change the `useNotifications()` call (line 123) to pass the filter:

```typescript
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications(
    historyOrigin === 'all' ? undefined : historyOrigin,
  )
```

Inside the history `TabsContent` (just after `<CardContent className="pt-6">`, line 635), add a filter selector:

```tsx
              <div className="mb-4 w-48">
                <Select
                  value={historyOrigin}
                  onValueChange={(v) => setHistoryOrigin(v as 'all' | 'manual' | 'automatic')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="manual">Manuais</SelectItem>
                    <SelectItem value="automatic">Automáticas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
```

Add an "Automático" badge next to the category badge (after line 650, inside the title row):

```tsx
                            {n.origin === 'automatic' && (
                              <Badge variant="secondary">Automático</Badge>
                            )}
```

- [ ] **Step 4: Verify build**

Run: `cd admin-ui && npm run lint && npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add admin-ui/lib/api/endpoints/notifications.ts admin-ui/lib/hooks/use-notifications.ts "admin-ui/app/(dashboard)/notifications/notification-system.tsx"
git commit -m "feat(admin): filter history by manual/automatic origin"
```

---

## Final verification

- [ ] **Backend:** `cd backend && npm run build && npm run test`
- [ ] **Admin:** `cd admin-ui && npm run lint && npm run build`
- [ ] **Manual smoke (optional):** run `docker compose up -d`, `npm run migration:run`, `npm run start:dev`; enable the `event` rule via `PATCH /api/reminder-rules/:id`, create an event ~24h out, and confirm the scheduler tick (call `tick()` or wait for the hour) produces an `origin=automatic` notification visible in the Histórico → Automáticas filter.
