# Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full notification system across backend (NestJS), admin-ui (Next.js), and mobile (Flutter) supporting Push/Email/SMS/WhatsApp dispatch with audience segmentation, reach preview, and per-user channel/topic preferences.

**Architecture:** Event-driven dispatch using PostgreSQL as the queue — immediate sends fire via `setImmediate` on creation, scheduled sends use `setTimeout` registered at creation time with startup recovery for restarts. Three new DB tables: revamped `notifications`, new `user_device_tokens`, new `user_notification_preferences`.

**Tech Stack:** NestJS 11 + TypeORM + PostgreSQL 16 (backend) · Next.js 15 + TanStack Query 5 + shadcn/ui (admin-ui) · Flutter 3.7+ + GetX (mobile) · Firebase Admin SDK + Resend + Twilio + Meta Cloud API (providers)

---

## Part 1 — Database Migrations

### Task 1: Migration — Alter notifications table

**Files:**
- Create: `backend/database/migrations/1757250000020-AlterNotificationsTable.ts`

- [ ] **Step 1: Write migration file**

```typescript
// backend/database/migrations/1757250000020-AlterNotificationsTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterNotificationsTable1757250000020 implements MigrationInterface {
  name = 'AlterNotificationsTable1757250000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create category enum
    await queryRunner.query(`
      CREATE TYPE "notification_category_enum" AS ENUM (
        'events', 'announcements', 'life_group', 'academy', 'admin_alerts'
      )
    `);

    // Create status enum
    await queryRunner.query(`
      CREATE TYPE "notification_status_enum" AS ENUM (
        'pending', 'processing', 'scheduled', 'sent', 'failed'
      )
    `);

    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN "category" "notification_category_enum" NOT NULL DEFAULT 'announcements',
        ADD COLUMN "segment" jsonb NOT NULL DEFAULT '{"type":"all"}',
        ADD COLUMN "scheduled_at" timestamp NULL,
        ADD COLUMN "created_by" integer NULL
    `);

    // Rename recipients → recipients_count
    await queryRunner.query(`
      ALTER TABLE "notifications" RENAME COLUMN "recipients" TO "recipients_count"
    `);

    // Drop old target_audience column
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP COLUMN IF EXISTS "target_audience"
    `);

    // Migrate status to enum (existing rows have 'pending'/'sent'/'failed')
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ALTER COLUMN "status" TYPE "notification_status_enum"
        USING "status"::"notification_status_enum"
    `);

    // Add FK for created_by
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD CONSTRAINT "FK_notifications_created_by"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_created_by"`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" TYPE varchar(20) USING "status"::text`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "target_audience" varchar(100) NOT NULL DEFAULT 'all'`);
    await queryRunner.query(`ALTER TABLE "notifications" RENAME COLUMN "recipients_count" TO "recipients"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "created_by"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "scheduled_at"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "segment"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "category"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_category_enum"`);
  }
}
```

- [ ] **Step 2: Verify migration compiles**

```bash
cd backend && npm run build 2>&1 | grep -i error | head -20
```
Expected: no errors (or only unrelated errors from other files)

- [ ] **Step 3: Commit**

```bash
cd backend && git add database/migrations/1757250000020-AlterNotificationsTable.ts
git commit -m "feat(notifications): migration alter notifications table"
```

---

### Task 2: Migration — Create user_device_tokens table

**Files:**
- Create: `backend/database/migrations/1757250000021-CreateUserDeviceTokens.ts`

- [ ] **Step 1: Write migration file**

```typescript
// backend/database/migrations/1757250000021-CreateUserDeviceTokens.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserDeviceTokens1757250000021 implements MigrationInterface {
  name = 'CreateUserDeviceTokens1757250000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "device_platform_enum" AS ENUM ('android', 'ios')
    `);

    await queryRunner.query(`
      CREATE TABLE "user_device_tokens" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "token" varchar NOT NULL,
        "platform" "device_platform_enum" NOT NULL,
        "last_used_at" timestamp NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_device_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_user_device_tokens_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_device_tokens_user" ON "user_device_tokens" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_device_tokens_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_device_tokens"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "device_platform_enum"`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd backend && git add database/migrations/1757250000021-CreateUserDeviceTokens.ts
git commit -m "feat(notifications): migration create user_device_tokens"
```

---

### Task 3: Migration — Create user_notification_preferences table

**Files:**
- Create: `backend/database/migrations/1757250000022-CreateUserNotificationPreferences.ts`

- [ ] **Step 1: Write migration file**

```typescript
// backend/database/migrations/1757250000022-CreateUserNotificationPreferences.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserNotificationPreferences1757250000022 implements MigrationInterface {
  name = 'CreateUserNotificationPreferences1757250000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_notification_preferences" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "all_notifications_enabled" boolean NOT NULL DEFAULT true,
        "push_enabled" boolean NOT NULL DEFAULT true,
        "email_enabled" boolean NOT NULL DEFAULT true,
        "sms_enabled" boolean NOT NULL DEFAULT true,
        "whatsapp_enabled" boolean NOT NULL DEFAULT true,
        "events_enabled" boolean NOT NULL DEFAULT true,
        "announcements_enabled" boolean NOT NULL DEFAULT true,
        "life_group_enabled" boolean NOT NULL DEFAULT true,
        "academy_enabled" boolean NOT NULL DEFAULT true,
        "admin_alerts_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_notification_preferences_user" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_notification_preferences_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_notification_preferences"`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd backend && git add database/migrations/1757250000022-CreateUserNotificationPreferences.ts
git commit -m "feat(notifications): migration create user_notification_preferences"
```

---

## Part 2 — Backend Entities

### Task 4: Update Notification entity

**Files:**
- Modify: `backend/src/notifications/entities/notification.entity.ts`

- [ ] **Step 1: Rewrite the entity** (fully replaces the existing file)

```typescript
// backend/src/notifications/entities/notification.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type NotificationCategory =
  | 'events'
  | 'announcements'
  | 'life_group'
  | 'academy'
  | 'admin_alerts';

export type NotificationStatus =
  | 'pending'
  | 'processing'
  | 'scheduled'
  | 'sent'
  | 'failed';

export interface NotificationSegment {
  type: 'all' | 'filtered';
  filters?: {
    roles?: string[];
    sector_ids?: number[];
    life_group_ids?: number[];
    status?: 'active' | 'inactive';
  };
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: ['events', 'announcements', 'life_group', 'academy', 'admin_alerts'] })
  category: NotificationCategory;

  @Column({ type: 'jsonb' })
  channels: string[];

  @Column({ type: 'jsonb' })
  segment: NotificationSegment;

  @Column({ name: 'recipients_count', type: 'int', default: 0 })
  recipientsCount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'scheduled', 'sent', 'failed'],
    default: 'pending',
  })
  status: NotificationStatus;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 2: Commit**

```bash
cd backend && git add src/notifications/entities/notification.entity.ts
git commit -m "feat(notifications): update Notification entity with new fields"
```

---

### Task 5: Create UserDeviceToken entity

**Files:**
- Create: `backend/src/users/entities/user-device-token.entity.ts`

- [ ] **Step 1: Write entity**

```typescript
// backend/src/users/entities/user-device-token.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type DevicePlatform = 'android' | 'ios';

@Entity('user_device_tokens')
export class UserDeviceToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'varchar', unique: true })
  token: string;

  @Column({ type: 'enum', enum: ['android', 'ios'] })
  platform: DevicePlatform;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 2: Commit**

```bash
cd backend && git add src/users/entities/user-device-token.entity.ts
git commit -m "feat(notifications): add UserDeviceToken entity"
```

---

### Task 6: Create UserNotificationPreferences entity

**Files:**
- Create: `backend/src/users/entities/user-notification-preferences.entity.ts`

- [ ] **Step 1: Write entity**

```typescript
// backend/src/users/entities/user-notification-preferences.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_notification_preferences')
export class UserNotificationPreferences {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'all_notifications_enabled', type: 'boolean', default: true })
  allNotificationsEnabled: boolean;

  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ name: 'email_enabled', type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ name: 'sms_enabled', type: 'boolean', default: true })
  smsEnabled: boolean;

  @Column({ name: 'whatsapp_enabled', type: 'boolean', default: true })
  whatsappEnabled: boolean;

  @Column({ name: 'events_enabled', type: 'boolean', default: true })
  eventsEnabled: boolean;

  @Column({ name: 'announcements_enabled', type: 'boolean', default: true })
  announcementsEnabled: boolean;

  @Column({ name: 'life_group_enabled', type: 'boolean', default: true })
  lifeGroupEnabled: boolean;

  @Column({ name: 'academy_enabled', type: 'boolean', default: true })
  academyEnabled: boolean;

  @Column({ name: 'admin_alerts_enabled', type: 'boolean', default: true })
  adminAlertsEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 2: Commit**

```bash
cd backend && git add src/users/entities/user-notification-preferences.entity.ts
git commit -m "feat(notifications): add UserNotificationPreferences entity"
```

---

### Task 7: Register new entities in ORM config

**Files:**
- Modify: `backend/src/configs/orm.config.ts`
- Modify: `backend/src/configs/data.source.ts` (if this file exists; same pattern as orm.config.ts)

- [ ] **Step 1: Add imports and entities to orm.config.ts**

Add these imports after existing imports:
```typescript
import { UserDeviceToken } from '../users/entities/user-device-token.entity';
import { UserNotificationPreferences } from '../users/entities/user-notification-preferences.entity';
```

Add `UserDeviceToken` and `UserNotificationPreferences` to the `entities` array:
```typescript
entities: [
  // ...existing...
  UserDeviceToken,
  UserNotificationPreferences,
],
```

Also check `backend/src/configs/data.source.ts` — if it exists, make the same additions there.

- [ ] **Step 2: Verify build still compiles**

```bash
cd backend && npm run build 2>&1 | grep -E "^.*error TS" | head -20
```
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd backend && git add src/configs/orm.config.ts src/configs/data.source.ts
git commit -m "feat(notifications): register new entities in ORM config"
```

---

## Part 3 — Backend User Services

### Task 8: UserDeviceTokensService + DTOs

**Files:**
- Create: `backend/src/users/dto/register-device-token.dto.ts`
- Create: `backend/src/users/user-device-tokens.service.ts`
- Create: `backend/src/users/user-device-tokens.service.spec.ts`

- [ ] **Step 1: Write DTO**

```typescript
// backend/src/users/dto/register-device-token.dto.ts
import { IsIn, IsString, IsNotEmpty } from 'class-validator';
import { Expose } from 'class-transformer';

export class RegisterDeviceTokenDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  token: string;

  @Expose()
  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios';
}
```

- [ ] **Step 2: Write failing test**

```typescript
// backend/src/users/user-device-tokens.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { UserDeviceTokensService } from './user-device-tokens.service';

const mockEntityManager = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
};

describe('UserDeviceTokensService', () => {
  let service: UserDeviceTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDeviceTokensService,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
      ],
    }).compile();
    service = module.get<UserDeviceTokensService>(UserDeviceTokensService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register() upserts token — creates new when not found', async () => {
    const userId = 1;
    const dto = { token: 'fcm-token-abc', platform: 'android' as const };
    mockEntityManager.findOne.mockResolvedValue(null);
    mockEntityManager.create.mockReturnValue({ ...dto, user: { id: userId } });
    mockEntityManager.save.mockResolvedValue({ id: 1, ...dto });

    await service.register(userId, dto);
    expect(mockEntityManager.save).toHaveBeenCalled();
  });

  it('remove() deletes token belonging to user', async () => {
    mockEntityManager.delete.mockResolvedValue({ affected: 1 });
    await service.remove(1, 'fcm-token-abc');
    expect(mockEntityManager.delete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd backend && npx jest src/users/user-device-tokens.service.spec.ts --no-coverage 2>&1 | tail -20
```
Expected: FAIL — `UserDeviceTokensService` not found

- [ ] **Step 4: Write service**

```typescript
// backend/src/users/user-device-tokens.service.ts
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserDeviceToken } from './entities/user-device-token.entity';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

@Injectable()
export class UserDeviceTokensService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async register(userId: number, dto: RegisterDeviceTokenDto): Promise<void> {
    const existing = await this.entityManager.findOne(UserDeviceToken, {
      where: { token: dto.token },
    });
    if (existing) {
      // Token already registered — update user association if needed
      await this.entityManager.update(UserDeviceToken, existing.id, {
        user: { id: userId },
        platform: dto.platform,
      });
      return;
    }
    const record = this.entityManager.create(UserDeviceToken, {
      user: { id: userId },
      token: dto.token,
      platform: dto.platform,
    });
    await this.entityManager.save(record);
  }

  async remove(userId: number, token: string): Promise<void> {
    await this.entityManager.delete(UserDeviceToken, {
      token,
      user: { id: userId },
    });
  }

  async findAllForUser(userId: number): Promise<UserDeviceToken[]> {
    return this.entityManager.find(UserDeviceToken, {
      where: { user: { id: userId } },
    });
  }

  async removeStaleToken(token: string): Promise<void> {
    await this.entityManager.delete(UserDeviceToken, { token });
  }

  async markUsed(token: string): Promise<void> {
    await this.entityManager.update(UserDeviceToken, { token }, { lastUsedAt: new Date() });
  }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd backend && npx jest src/users/user-device-tokens.service.spec.ts --no-coverage 2>&1 | tail -10
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd backend && git add src/users/dto/register-device-token.dto.ts src/users/user-device-tokens.service.ts src/users/user-device-tokens.service.spec.ts
git commit -m "feat(notifications): add UserDeviceTokensService"
```

---

### Task 9: UserNotificationPreferencesService + DTO

**Files:**
- Create: `backend/src/users/dto/update-notification-preferences.dto.ts`
- Create: `backend/src/users/user-notification-preferences.service.ts`
- Create: `backend/src/users/user-notification-preferences.service.spec.ts`

- [ ] **Step 1: Write DTO**

```typescript
// backend/src/users/dto/update-notification-preferences.dto.ts
import { IsBoolean, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';

export class UpdateNotificationPreferencesDto {
  @Expose() @IsOptional() @IsBoolean() all_notifications_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() push_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() email_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() sms_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() whatsapp_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() events_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() announcements_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() life_group_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() academy_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() admin_alerts_enabled?: boolean;
}
```

- [ ] **Step 2: Write failing test**

```typescript
// backend/src/users/user-notification-preferences.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';

const mockEntityManager = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
};

describe('UserNotificationPreferencesService', () => {
  let service: UserNotificationPreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserNotificationPreferencesService,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
      ],
    }).compile();
    service = module.get<UserNotificationPreferencesService>(UserNotificationPreferencesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getOrCreate() returns existing preferences', async () => {
    const prefs = { id: 1, user: { id: 1 }, pushEnabled: true };
    mockEntityManager.findOne.mockResolvedValue(prefs);
    const result = await service.getOrCreate(1);
    expect(result).toBe(prefs);
    expect(mockEntityManager.save).not.toHaveBeenCalled();
  });

  it('getOrCreate() creates default prefs when none exist', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);
    mockEntityManager.create.mockReturnValue({ user: { id: 1 } });
    mockEntityManager.save.mockResolvedValue({ id: 2 });
    await service.getOrCreate(1);
    expect(mockEntityManager.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to confirm failure**

```bash
cd backend && npx jest src/users/user-notification-preferences.service.spec.ts --no-coverage 2>&1 | tail -10
```

- [ ] **Step 4: Write service**

```typescript
// backend/src/users/user-notification-preferences.service.ts
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserNotificationPreferences } from './entities/user-notification-preferences.entity';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class UserNotificationPreferencesService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getOrCreate(userId: number): Promise<UserNotificationPreferences> {
    const existing = await this.entityManager.findOne(UserNotificationPreferences, {
      where: { user: { id: userId } },
    });
    if (existing) return existing;

    const created = this.entityManager.create(UserNotificationPreferences, {
      user: { id: userId },
    });
    return this.entityManager.save(created);
  }

  async update(userId: number, dto: UpdateNotificationPreferencesDto): Promise<UserNotificationPreferences> {
    const prefs = await this.getOrCreate(userId);
    const updates: Partial<UserNotificationPreferences> = {};
    if (dto.all_notifications_enabled !== undefined) updates.allNotificationsEnabled = dto.all_notifications_enabled;
    if (dto.push_enabled !== undefined) updates.pushEnabled = dto.push_enabled;
    if (dto.email_enabled !== undefined) updates.emailEnabled = dto.email_enabled;
    if (dto.sms_enabled !== undefined) updates.smsEnabled = dto.sms_enabled;
    if (dto.whatsapp_enabled !== undefined) updates.whatsappEnabled = dto.whatsapp_enabled;
    if (dto.events_enabled !== undefined) updates.eventsEnabled = dto.events_enabled;
    if (dto.announcements_enabled !== undefined) updates.announcementsEnabled = dto.announcements_enabled;
    if (dto.life_group_enabled !== undefined) updates.lifeGroupEnabled = dto.life_group_enabled;
    if (dto.academy_enabled !== undefined) updates.academyEnabled = dto.academy_enabled;
    if (dto.admin_alerts_enabled !== undefined) updates.adminAlertsEnabled = dto.admin_alerts_enabled;
    Object.assign(prefs, updates);
    return this.entityManager.save(prefs);
  }

  toResponse(prefs: UserNotificationPreferences) {
    return {
      all_notifications_enabled: prefs.allNotificationsEnabled,
      push_enabled: prefs.pushEnabled,
      email_enabled: prefs.emailEnabled,
      sms_enabled: prefs.smsEnabled,
      whatsapp_enabled: prefs.whatsappEnabled,
      events_enabled: prefs.eventsEnabled,
      announcements_enabled: prefs.announcementsEnabled,
      life_group_enabled: prefs.lifeGroupEnabled,
      academy_enabled: prefs.academyEnabled,
      admin_alerts_enabled: prefs.adminAlertsEnabled,
    };
  }
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
cd backend && npx jest src/users/user-notification-preferences.service.spec.ts --no-coverage 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
cd backend && git add src/users/dto/update-notification-preferences.dto.ts src/users/user-notification-preferences.service.ts src/users/user-notification-preferences.service.spec.ts
git commit -m "feat(notifications): add UserNotificationPreferencesService"
```

---

## Part 4 — Backend Channel Providers

### Task 10: FcmService (Firebase Admin SDK)

**Files:**
- Create: `backend/src/notifications/providers/fcm.service.ts`

> Before implementing, add Firebase Admin SDK: `cd backend && npm install firebase-admin`

- [ ] **Step 1: Install dependency**

```bash
cd backend && npm install firebase-admin
```

- [ ] **Step 2: Write service**

```typescript
// backend/src/notifications/providers/fcm.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UserDeviceTokensService } from '../../users/user-device-tokens.service';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly deviceTokensService: UserDeviceTokensService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  /**
   * Send push notification to all FCM tokens for a given user.
   * Returns true if at least one token received the message.
   */
  async sendToUser(
    userId: number,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<boolean> {
    const tokens = await this.deviceTokensService.findAllForUser(userId);
    if (tokens.length === 0) return false;

    let anySuccess = false;
    for (const deviceToken of tokens) {
      try {
        await admin.messaging().send({
          token: deviceToken.token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data,
        });
        await this.deviceTokensService.markUsed(deviceToken.token);
        anySuccess = true;
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          this.logger.warn(`Removing stale FCM token for user ${userId}`);
          await this.deviceTokensService.removeStaleToken(deviceToken.token);
        } else {
          this.logger.error(`FCM send failed for user ${userId}: ${code}`);
        }
      }
    }
    return anySuccess;
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd backend && git add package.json package-lock.json src/notifications/providers/fcm.service.ts
git commit -m "feat(notifications): add FcmService with Firebase Admin SDK"
```

---

### Task 11: EmailService (Resend)

**Files:**
- Create: `backend/src/notifications/providers/email.service.ts`

- [ ] **Step 1: Install dependency**

```bash
cd backend && npm install resend
```

- [ ] **Step 2: Write service**

```typescript
// backend/src/notifications/providers/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendToUser(
    userEmail: string | null,
    payload: { title: string; body: string },
  ): Promise<boolean> {
    if (!userEmail) return false;
    try {
      await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@pazchurch.com.br',
        to: userEmail,
        subject: payload.title,
        text: payload.body,
      });
      return true;
    } catch (err: unknown) {
      this.logger.error(`Email send failed to ${userEmail}: ${(err as Error).message}`);
      return false;
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd backend && git add package.json package-lock.json src/notifications/providers/email.service.ts
git commit -m "feat(notifications): add EmailService with Resend"
```

---

### Task 12: SmsService (Twilio)

**Files:**
- Create: `backend/src/notifications/providers/sms.service.ts`

- [ ] **Step 1: Install dependency**

```bash
cd backend && npm install twilio
```

- [ ] **Step 2: Write service**

```typescript
// backend/src/notifications/providers/sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendToUser(
    phoneNumber: string | null,
    payload: { title: string; body: string },
  ): Promise<boolean> {
    if (!phoneNumber) return false;
    try {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
      await client.messages.create({
        body: `${payload.title}\n\n${payload.body}`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: phoneNumber,
      });
      return true;
    } catch (err: unknown) {
      this.logger.error(`SMS send failed to ${phoneNumber}: ${(err as Error).message}`);
      return false;
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd backend && git add package.json package-lock.json src/notifications/providers/sms.service.ts
git commit -m "feat(notifications): add SmsService with Twilio"
```

---

### Task 13: WhatsAppService (Meta Cloud API)

**Files:**
- Create: `backend/src/notifications/providers/whatsapp.service.ts`

- [ ] **Step 1: Write service** (uses `fetch` — built-in in Node 18+)

```typescript
// backend/src/notifications/providers/whatsapp.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  async sendToUser(
    phoneNumber: string | null,
    payload: { title: string; body: string },
  ): Promise<boolean> {
    if (!phoneNumber) return false;
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      this.logger.warn('WhatsApp env vars not configured — skipping');
      return false;
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber.replace(/\D/g, ''),
            type: 'text',
            text: { body: `*${payload.title}*\n\n${payload.body}` },
          }),
        },
      );
      return res.ok;
    } catch (err: unknown) {
      this.logger.error(`WhatsApp send failed to ${phoneNumber}: ${(err as Error).message}`);
      return false;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd backend && git add src/notifications/providers/whatsapp.service.ts
git commit -m "feat(notifications): add WhatsAppService with Meta Cloud API"
```

---

## Part 5 — Backend Dispatch Engine & Notifications Module

### Task 14: NotificationDispatchService

**Files:**
- Create: `backend/src/notifications/notification-dispatch.service.ts`

This service receives a `Notification` entity + list of resolved users, filters by each user's preferences, and fans out to providers.

- [ ] **Step 1: Write service**

```typescript
// backend/src/notifications/notification-dispatch.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Notification, NotificationCategory } from './entities/notification.entity';
import { UserNotificationPreferences } from '../users/entities/user-notification-preferences.entity';
import { User } from '../users/entities/user.entity';
import { FcmService } from './providers/fcm.service';
import { EmailService } from './providers/email.service';
import { SmsService } from './providers/sms.service';
import { WhatsAppService } from './providers/whatsapp.service';

const CATEGORY_PREF_MAP: Record<
  NotificationCategory,
  keyof UserNotificationPreferences
> = {
  events: 'eventsEnabled',
  announcements: 'announcementsEnabled',
  life_group: 'lifeGroupEnabled',
  academy: 'academyEnabled',
  admin_alerts: 'adminAlertsEnabled',
};

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly fcmService: FcmService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async dispatch(notification: Notification, users: User[]): Promise<void> {
    await this.entityManager.update(Notification, notification.id, {
      status: 'processing',
    });

    if (users.length === 0) {
      await this.entityManager.update(Notification, notification.id, {
        status: 'sent',
        recipientsCount: 0,
        sentAt: new Date(),
      });
      return;
    }

    let successCount = 0;

    for (const user of users) {
      const prefs = await this.entityManager.findOne(UserNotificationPreferences, {
        where: { user: { id: user.id } },
      });

      // If no prefs row, treat as all-enabled (default)
      if (prefs && !prefs.allNotificationsEnabled) continue;

      const categoryKey = CATEGORY_PREF_MAP[notification.category];
      if (prefs && !prefs[categoryKey]) continue;

      const activeChannels = notification.channels.filter((ch) => {
        if (!prefs) return true;
        if (ch === 'push') return prefs.pushEnabled;
        if (ch === 'email') return prefs.emailEnabled;
        if (ch === 'sms') return prefs.smsEnabled;
        if (ch === 'whatsapp') return prefs.whatsappEnabled;
        return true;
      });

      if (activeChannels.length === 0) continue;

      const results = await Promise.all(
        activeChannels.map((ch) => this.sendChannel(ch, user, notification)),
      );

      if (results.some(Boolean)) successCount++;
    }

    await this.entityManager.update(Notification, notification.id, {
      status: successCount > 0 ? 'sent' : 'failed',
      recipientsCount: successCount,
      sentAt: new Date(),
    });

    this.logger.log(
      `Notification #${notification.id} dispatched: ${successCount}/${users.length} recipients reached`,
    );
  }

  private sendChannel(
    channel: string,
    user: User,
    notification: Notification,
  ): Promise<boolean> {
    const payload = { title: notification.title, body: notification.message };
    switch (channel) {
      case 'push':
        return this.fcmService.sendToUser(user.id, payload);
      case 'email':
        return this.emailService.sendToUser(user.email, payload);
      case 'sms':
        return this.smsService.sendToUser(user.phoneNumber, payload);
      case 'whatsapp':
        return this.whatsAppService.sendToUser(user.phoneNumber, payload);
      default:
        return Promise.resolve(false);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd backend && git add src/notifications/notification-dispatch.service.ts
git commit -m "feat(notifications): add NotificationDispatchService"
```

---

### Task 15: CreateNotificationDto + NotificationsService rewrite

**Files:**
- Create: `backend/src/notifications/dto/create-notification.dto.ts`
- Modify: `backend/src/notifications/notifications.service.ts`
- Create: `backend/src/notifications/notifications.service.spec.ts`

- [ ] **Step 1: Write DTO**

```typescript
// backend/src/notifications/dto/create-notification.dto.ts
import {
  IsArray,
  IsEnum,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { NotificationCategory } from '../entities/notification.entity';

class SegmentFiltersDto {
  @IsOptional() @IsArray() roles?: string[];
  @IsOptional() @IsArray() sector_ids?: number[];
  @IsOptional() @IsArray() life_group_ids?: number[];
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}

class SegmentDto {
  @IsIn(['all', 'filtered'])
  type: 'all' | 'filtered';

  @IsOptional()
  @IsObject()
  @Type(() => SegmentFiltersDto)
  filters?: SegmentFiltersDto;
}

export class CreateNotificationDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  message: string;

  @Expose()
  @IsEnum(['events', 'announcements', 'life_group', 'academy', 'admin_alerts'])
  category: NotificationCategory;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['push', 'email', 'sms', 'whatsapp'], { each: true })
  channels: string[];

  @Expose()
  @IsObject()
  @Type(() => SegmentDto)
  segment: SegmentDto;

  @Expose()
  @IsOptional()
  @IsISO8601()
  scheduled_at?: string | null;
}
```

- [ ] **Step 2: Write failing test**

```typescript
// backend/src/notifications/notifications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { UnprocessableEntityException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';

const mockEntityManager = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};
const mockDispatchService = { dispatch: jest.fn() };

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
        { provide: NotificationDispatchService, useValue: mockDispatchService },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create() throws 422 when scheduled_at is in the past', async () => {
    const dto = {
      title: 'Test',
      message: 'Hello',
      category: 'announcements' as const,
      channels: ['push'],
      segment: { type: 'all' as const },
      scheduled_at: '2020-01-01T00:00:00Z',
    };
    await expect(service.create(dto, 1)).rejects.toThrow(UnprocessableEntityException);
  });

  it('create() saves notification with status pending for immediate send', async () => {
    const dto = {
      title: 'Test',
      message: 'Hello',
      category: 'announcements' as const,
      channels: ['push'],
      segment: { type: 'all' as const },
    };
    const saved = { id: 1, ...dto, status: 'pending', scheduledAt: null };
    mockEntityManager.create.mockReturnValue(saved);
    mockEntityManager.save.mockResolvedValue(saved);
    mockEntityManager.find.mockResolvedValue([]);

    await service.create(dto, 1);
    expect(mockEntityManager.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to confirm failure**

```bash
cd backend && npx jest src/notifications/notifications.service.spec.ts --no-coverage 2>&1 | tail -15
```

- [ ] **Step 4: Write service** (full rewrite of notifications.service.ts)

```typescript
// backend/src/notifications/notifications.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { Notification, NotificationSegment } from './entities/notification.entity';
import { NotificationDispatchService } from './notification-dispatch.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { User } from '../users/entities/user.entity';
import { UserNotificationPreferences } from '../users/entities/user-notification-preferences.entity';

@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly dispatchService: NotificationDispatchService,
  ) {}

  // ── Bootstrap: recover scheduled notifications after restart ─────────────
  async onApplicationBootstrap(): Promise<void> {
    const now = new Date();

    // Re-register future scheduled notifications (scheduled_at > now)
    const future = await this.entityManager
      .createQueryBuilder(Notification, 'n')
      .where("n.status = 'scheduled' AND n.scheduled_at > :now", { now })
      .getMany();
    for (const n of future) {
      this.scheduleTimer(n);
    }

    // Dispatch missed scheduled notifications immediately (scheduled_at <= now)
    const missed = await this.entityManager
      .createQueryBuilder(Notification, 'n')
      .where("n.status = 'scheduled' AND n.scheduled_at <= :now", { now })
      .getMany();

    for (const n of missed) {
      setImmediate(() => this.runDispatch(n));
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async create(dto: CreateNotificationDto, creatorId: number) {
    const isScheduled = !!dto.scheduled_at;

    if (isScheduled) {
      const scheduledAt = new Date(dto.scheduled_at!);
      if (scheduledAt <= new Date()) {
        throw new UnprocessableEntityException('scheduled_at must be in the future');
      }
    }

    const notification = this.entityManager.create(Notification, {
      title: dto.title,
      message: dto.message,
      category: dto.category,
      channels: dto.channels,
      segment: dto.segment,
      status: isScheduled ? 'scheduled' : 'pending',
      scheduledAt: isScheduled ? new Date(dto.scheduled_at!) : null,
      createdBy: { id: creatorId },
    });

    const saved = await this.entityManager.save(notification);

    if (isScheduled) {
      this.scheduleTimer(saved);
    } else {
      setImmediate(() => this.runDispatch(saved));
    }

    return this.toResponse(saved);
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  async findAll() {
    const notifications = await this.entityManager.find(Notification, {
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
    return notifications.map((n) => this.toResponse(n));
  }

  async findOne(id: number) {
    const n = await this.entityManager.findOne(Notification, {
      where: { id },
      relations: ['createdBy'],
    });
    if (!n) throw new NotFoundException(`Notification #${id} not found`);
    return this.toResponse(n);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async remove(id: number): Promise<void> {
    const n = await this.entityManager.findOne(Notification, { where: { id } });
    if (!n) throw new NotFoundException(`Notification #${id} not found`);
    if (!['pending', 'scheduled'].includes(n.status)) {
      throw new ConflictException('Only pending or scheduled notifications can be deleted');
    }
    await this.entityManager.remove(n);
  }

  // ── Reach preview ─────────────────────────────────────────────────────────
  async getReach(
    segment: NotificationSegment,
    channels: string[],
    category: string,
  ): Promise<{
    total: number;
    by_channel: Record<string, number>;
    excluded: Record<string, number>;
  }> {
    const users = await this.resolveSegment(segment);
    const userIds = users.map((u) => u.id);

    if (userIds.length === 0) {
      const by_channel: Record<string, number> = {};
      const excluded: Record<string, number> = {};
      for (const ch of channels) { by_channel[ch] = 0; excluded[ch] = 0; }
      return { total: 0, by_channel, excluded };
    }

    // Load preferences for all users at once
    const allPrefs = await this.entityManager.find(UserNotificationPreferences, {
      where: userIds.map((id) => ({ user: { id } })),
      relations: ['user'],
    });
    const prefsMap = new Map(allPrefs.map((p) => [p.user.id, p]));

    const CATEGORY_PREF_MAP: Record<string, string> = {
      events: 'eventsEnabled',
      announcements: 'announcementsEnabled',
      life_group: 'lifeGroupEnabled',
      academy: 'academyEnabled',
      admin_alerts: 'adminAlertsEnabled',
    };
    const categoryPrefKey = CATEGORY_PREF_MAP[category];

    const CHANNEL_PREF_MAP: Record<string, string> = {
      push: 'pushEnabled',
      email: 'emailEnabled',
      sms: 'smsEnabled',
      whatsapp: 'whatsappEnabled',
    };

    const by_channel: Record<string, number> = {};
    const excluded: Record<string, number> = {};
    for (const ch of channels) { by_channel[ch] = 0; excluded[ch] = 0; }

    let totalReached = new Set<number>();

    for (const userId of userIds) {
      const prefs = prefsMap.get(userId);
      if (prefs && !prefs.allNotificationsEnabled) continue;
      if (prefs && categoryPrefKey && !(prefs as any)[categoryPrefKey]) continue;

      for (const ch of channels) {
        const chPrefKey = CHANNEL_PREF_MAP[ch];
        if (prefs && chPrefKey && !(prefs as any)[chPrefKey]) {
          excluded[ch] = (excluded[ch] ?? 0) + 1;
        } else {
          by_channel[ch] = (by_channel[ch] ?? 0) + 1;
          totalReached.add(userId);
        }
      }
    }

    return { total: totalReached.size, by_channel, excluded };
  }

  // ── Internal helpers ──────────────────────────────────────────────────────
  private async runDispatch(notification: Notification): Promise<void> {
    const users = await this.resolveSegment(notification.segment);
    await this.dispatchService.dispatch(notification, users);
  }

  private scheduleTimer(notification: Notification): void {
    const delay = notification.scheduledAt!.getTime() - Date.now();
    setTimeout(() => this.runDispatch(notification), Math.max(delay, 0));
  }

  async resolveSegment(segment: NotificationSegment): Promise<User[]> {
    const qb: SelectQueryBuilder<User> = this.entityManager
      .createQueryBuilder(User, 'u')
      .leftJoinAndSelect('u.role', 'role')
      .leftJoinAndSelect('u.sector', 'sector')
      .leftJoinAndSelect('u.lifeGroups', 'lifeGroup');

    if (segment.type === 'filtered' && segment.filters) {
      const { roles, sector_ids, life_group_ids, status } = segment.filters;

      if (status) {
        qb.andWhere('u.status = :status', { status });
      }
      if (roles && roles.length > 0) {
        qb.andWhere('role.slug IN (:...roles)', { roles });
      }
      if (sector_ids && sector_ids.length > 0) {
        qb.andWhere('sector.id IN (:...sectorIds)', { sectorIds: sector_ids });
      }
      if (life_group_ids && life_group_ids.length > 0) {
        qb.andWhere('lifeGroup.id IN (:...lgIds)', { lgIds: life_group_ids });
      }
    }

    return qb.getMany();
  }

  toResponse(n: Notification) {
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      category: n.category,
      channels: n.channels,
      segment: n.segment,
      recipients_count: n.recipientsCount,
      status: n.status,
      scheduled_at: n.scheduledAt,
      sent_at: n.sentAt,
      created_by: n.createdBy?.id ?? null,
      created_at: n.createdAt,
    };
  }
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
cd backend && npx jest src/notifications/notifications.service.spec.ts --no-coverage 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
cd backend && git add src/notifications/dto/create-notification.dto.ts src/notifications/notifications.service.ts src/notifications/notifications.service.spec.ts
git commit -m "feat(notifications): rewrite NotificationsService with dispatch + reach"
```

---

### Task 16: Update NotificationsController

**Files:**
- Modify: `backend/src/notifications/notifications.controller.ts`

- [ ] **Step 1: Rewrite controller**

```typescript
// backend/src/notifications/notifications.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  SerializeOptions,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationSegment } from './entities/notification.entity';

class ReachDto {
  channels: string[];
  segment: NotificationSegment;
  category: string;
}

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  create(@Body() dto: CreateNotificationDto, @Request() req: { user: { id: number } }) {
    return this.notificationsService.create(dto, req.user.id);
  }

  // NOTE: 'reach' must be declared before ':id' to prevent route collision
  @Post('reach')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  getReach(@Body() dto: ReachDto) {
    return this.notificationsService.getReach(dto.segment, dto.channels, dto.category);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  findAll() {
    return this.notificationsService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd backend && git add src/notifications/notifications.controller.ts
git commit -m "feat(notifications): update NotificationsController with reach + role guards"
```

---

### Task 17: Wire NotificationsModule + update UsersModule

**Files:**
- Modify: `backend/src/notifications/notifications.module.ts`
- Modify: `backend/src/users/users.module.ts`
- Modify: `backend/src/users/users.controller.ts`

- [ ] **Step 1: Rewrite NotificationsModule**

```typescript
// backend/src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { FcmService } from './providers/fcm.service';
import { EmailService } from './providers/email.service';
import { SmsService } from './providers/sms.service';
import { WhatsAppService } from './providers/whatsapp.service';
import { UserDeviceTokensService } from '../users/user-device-tokens.service';
import { UserNotificationPreferencesService } from '../users/user-notification-preferences.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDispatchService,
    FcmService,
    EmailService,
    SmsService,
    WhatsAppService,
    UserDeviceTokensService,
    UserNotificationPreferencesService,
  ],
})
export class NotificationsModule {}
```

- [ ] **Step 2: Add new device-token + preferences endpoints to UsersController**

Add these imports to `users.controller.ts`:
```typescript
import { UserDeviceTokensService } from './user-device-tokens.service';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { Put, HttpCode } from '@nestjs/common'; // add Put if not already imported
```

Add constructor injection:
```typescript
constructor(
  private readonly usersService: UsersService,
  private readonly deviceTokensService: UserDeviceTokensService,
  private readonly preferencesService: UserNotificationPreferencesService,
) {}
```

Add new routes (append to class, before closing brace):
```typescript
// Device tokens
@Post('device-tokens')
@HttpCode(HttpStatus.NO_CONTENT)
registerDeviceToken(
  @Request() req: { user: { id: number } },
  @Body() dto: RegisterDeviceTokenDto,
) {
  return this.deviceTokensService.register(req.user.id, dto);
}

@Delete('device-tokens/:token')
@HttpCode(HttpStatus.NO_CONTENT)
removeDeviceToken(
  @Request() req: { user: { id: number } },
  @Param('token') token: string,
) {
  return this.deviceTokensService.remove(req.user.id, token);
}

// Notification preferences
@Get('me/notification-preferences')
async getNotificationPreferences(@Request() req: { user: { id: number } }) {
  const prefs = await this.preferencesService.getOrCreate(req.user.id);
  return this.preferencesService.toResponse(prefs);
}

@Put('me/notification-preferences')
async updateNotificationPreferences(
  @Request() req: { user: { id: number } },
  @Body() dto: UpdateNotificationPreferencesDto,
) {
  const prefs = await this.preferencesService.update(req.user.id, dto);
  return this.preferencesService.toResponse(prefs);
}
```

> **Note:** The `me/notification-preferences` routes must be declared BEFORE `/:id` in the file to avoid the `:id` param capturing the word "me". Check the route order.

- [ ] **Step 3: Update UsersModule to include new services**

```typescript
// backend/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserDeviceTokensService } from './user-device-tokens.service';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserDeviceTokensService, UserNotificationPreferencesService],
  exports: [UserDeviceTokensService, UserNotificationPreferencesService],
})
export class UsersModule {}
```

- [ ] **Step 4: Build to verify no compilation errors**

```bash
cd backend && npm run build 2>&1 | grep -E "error TS" | head -20
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/notifications/notifications.module.ts src/users/users.module.ts src/users/users.controller.ts
git commit -m "feat(notifications): wire NotificationsModule and add device-token/preferences endpoints to UsersController"
```

---

### Task 18: Add env var documentation

**Files:**
- Modify: `backend/.env.example` (create if it doesn't exist; do not modify `.env`)

- [ ] **Step 1: Add new env vars**

Append to `backend/.env.example` (or create it with existing vars + new ones):
```bash
# Firebase Admin SDK (for push notifications)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Resend (email)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@pazchurch.com.br

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Meta Cloud API (WhatsApp)
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
```

- [ ] **Step 2: Run all backend tests**

```bash
cd backend && npm run test 2>&1 | tail -30
```
Expected: all existing tests pass + new tests pass

- [ ] **Step 3: Commit**

```bash
cd backend && git add .env.example
git commit -m "feat(notifications): add env var documentation for notification providers"
```

---

## Part 6 — Admin-UI

### Task 19: Update notification types

**Files:**
- Modify: `admin-ui/lib/api/types/notifications.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
// admin-ui/lib/api/types/notifications.ts

export type NotificationCategory =
  | 'events'
  | 'announcements'
  | 'life_group'
  | 'academy'
  | 'admin_alerts'

export type NotificationStatus =
  | 'pending'
  | 'processing'
  | 'scheduled'
  | 'sent'
  | 'failed'

export interface NotificationSegment {
  type: 'all' | 'filtered'
  filters?: {
    roles?: string[]
    sector_ids?: number[]
    life_group_ids?: number[]
    status?: 'active' | 'inactive'
  }
}

export interface Notification {
  id: number
  title: string
  message: string
  category: NotificationCategory
  channels: string[]
  segment: NotificationSegment
  recipients_count: number
  status: NotificationStatus
  scheduled_at: string | null
  sent_at: string | null
  created_by: number | null
  created_at: string
}

export interface CreateNotificationRequest {
  title: string
  message: string
  category: NotificationCategory
  channels: string[]
  segment: NotificationSegment
  scheduled_at?: string | null
}

export interface NotificationReachRequest {
  channels: string[]
  segment: NotificationSegment
  category: NotificationCategory
}

export interface NotificationReachResponse {
  total: number
  by_channel: Record<string, number>
  excluded: Record<string, number>
}
```

Also update `admin-ui/lib/api/types/index.ts` to re-export the new types if needed (check what it currently exports for notifications and update accordingly).

- [ ] **Step 2: Commit**

```bash
cd admin-ui && git add lib/api/types/notifications.ts lib/api/types/index.ts
git commit -m "feat(notifications): update notification types"
```

---

### Task 20: Update notification API endpoints

**Files:**
- Modify: `admin-ui/lib/api/endpoints/notifications.ts`

- [ ] **Step 1: Rewrite endpoints file**

```typescript
// admin-ui/lib/api/endpoints/notifications.ts
import { api } from '../client'
import type {
  Notification,
  CreateNotificationRequest,
  NotificationReachRequest,
  NotificationReachResponse,
} from '../types'

export const notificationsApi = {
  getAll: () => api.get<Notification[]>('/notifications'),

  getById: (id: number) => api.get<Notification>(`/notifications/${id}`),

  create: (data: CreateNotificationRequest) =>
    api.post<Notification>('/notifications', data),

  getReach: (data: NotificationReachRequest) =>
    api.post<NotificationReachResponse>('/notifications/reach', data),

  delete: (id: number) => api.delete<void>(`/notifications/${id}`),
}
```

- [ ] **Step 2: Commit**

```bash
cd admin-ui && git add lib/api/endpoints/notifications.ts
git commit -m "feat(notifications): update notifications API endpoints"
```

---

### Task 21: Update notification hooks

**Files:**
- Modify: `admin-ui/lib/hooks/use-notifications.ts`

- [ ] **Step 1: Rewrite hooks file**

```typescript
// admin-ui/lib/hooks/use-notifications.ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api/endpoints/notifications'
import type {
  CreateNotificationRequest,
  NotificationReachRequest,
} from '@/lib/api/types'
import { trackEvent } from '@/lib/firebase/analytics'

const QUERY_KEY = ['notifications']

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationsApi.getAll(),
  })
}

export function useNotification(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => notificationsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateNotificationRequest) => notificationsApi.create(data),
    onSuccess: (notification) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent('notification_created', { notification_id: notification.id })
    },
  })
}

export function useNotificationReach() {
  return useMutation({
    mutationFn: (data: NotificationReachRequest) => notificationsApi.getReach(data),
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent('notification_deleted', { notification_id: id })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
cd admin-ui && git add lib/hooks/use-notifications.ts
git commit -m "feat(notifications): update notification hooks with create + reach"
```

---

### Task 22: Redesign notification-system.tsx

**Files:**
- Modify: `admin-ui/app/(dashboard)/notifications/notification-system.tsx`

This is a full rewrite of the component. The new component implements the design from the spec: category badges, channel cards, segment filter builder, reach preview sidebar, schedule toggle, history with duplicate + delete.

- [ ] **Step 1: Fetch available sectors and life-groups for the filter dropdowns**

The segment filter builder needs lists of sectors and life-groups. Check if `sectorsApi` and `lifeGroupsApi` exist in `lib/api/endpoints/`. If they exist, import and use them. If not, add simple fetch calls inline or create them first.

Run: `ls admin-ui/lib/api/endpoints/`

If `sectors.ts` or `life-groups.ts` don't exist, create minimal ones:
```typescript
// admin-ui/lib/api/endpoints/sectors.ts
import { api } from '../client'
export const sectorsApi = {
  getAll: () => api.get<{ id: number; name: string }[]>('/sectors'),
}

// admin-ui/lib/api/endpoints/life-groups.ts
import { api } from '../client'
export const lifeGroupsApi = {
  getAll: () => api.get<{ id: number; name: string }[]>('/life-groups'),
}
```

- [ ] **Step 2: Rewrite notification-system.tsx**

The component is complex — build it in this order:

**a) Define local types and constants at the top of the file:**
```typescript
const CATEGORIES = [
  { value: 'announcements', label: 'Anúncios' },
  { value: 'events', label: 'Eventos' },
  { value: 'life_group', label: 'Célula' },
  { value: 'academy', label: 'Academia' },
  { value: 'admin_alerts', label: 'Alertas Admin' },
] as const

const CHANNELS = [
  { value: 'push', label: 'Push', sub: 'Android & iOS', icon: Bell },
  { value: 'email', label: 'Email', sub: 'via Resend', icon: Mail },
  { value: 'sms', label: 'SMS', sub: 'via Twilio', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', sub: 'via Meta API', icon: MessageSquare },
] as const

const ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'life_group_leader', label: 'Líder de Célula' },
  { value: 'sector_leader', label: 'Líder de Setor' },
  { value: 'area_leader', label: 'Líder de Área' },
  { value: 'pastor', label: 'Pastor' },
  { value: 'admin', label: 'Admin' },
]
```

**b) Form state:**
```typescript
const [form, setForm] = useState<CreateNotificationRequest>({
  title: '',
  message: '',
  category: 'announcements',
  channels: ['push'],
  segment: { type: 'all' },
})
const [scheduleEnabled, setScheduleEnabled] = useState(false)
const [scheduleDate, setScheduleDate] = useState('')
const [scheduleTime, setScheduleTime] = useState('')
const [filters, setFilters] = useState<Array<{ type: string; value: string }>>([])
```

**c) Reach preview** — call `reachMutation.mutate(reachPayload)` inside a `useEffect` with a 500ms debounce whenever `form.channels`, `form.segment`, or `form.category` change.

**d) Segment building** — when `filters` changes, rebuild `form.segment`:
```typescript
useEffect(() => {
  if (filters.length === 0) {
    setForm(f => ({ ...f, segment: { type: 'all' } }))
    return
  }
  const built: NotificationSegment = { type: 'filtered', filters: {} }
  filters.forEach(filter => {
    if (filter.type === 'role') built.filters!.roles = [...(built.filters!.roles ?? []), filter.value]
    if (filter.type === 'sector') built.filters!.sector_ids = [...(built.filters!.sector_ids ?? []), +filter.value]
    if (filter.type === 'life_group') built.filters!.life_group_ids = [...(built.filters!.life_group_ids ?? []), +filter.value]
    if (filter.type === 'status') built.filters!.status = filter.value as 'active' | 'inactive'
  })
  setForm(f => ({ ...f, segment: built }))
}, [filters])
```

**e) Submit:**
```typescript
const handleSubmit = async () => {
  const payload: CreateNotificationRequest = {
    ...form,
    scheduled_at: scheduleEnabled && scheduleDate && scheduleTime
      ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      : null,
  }
  await createMutation.mutateAsync(payload)
  toast.success(scheduleEnabled ? 'Notificação agendada!' : 'Notificação enviada!')
  resetForm()
}
```

**f) Duplicate handler:**
```typescript
const handleDuplicate = (item: Notification) => {
  setForm({
    title: item.title,
    message: item.message,
    category: item.category,
    channels: item.channels,
    segment: item.segment,
  })
  setScheduleEnabled(false)
  // Switch to compose tab
  setActiveTab('compose')
}
```

**g) Layout** — two-column grid (form + sidebar) for compose tab; table for history tab. Follow the wireframe from the design mockup (channel cards 2×2, category pills, filter builder, reach box). Use shadcn/ui Card, Badge, Button, Input, Textarea, Switch, Select, Tabs.

- [ ] **Step 3: Run type check**

```bash
cd admin-ui && npm run build 2>&1 | grep -E "error" | head -20
```
Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
cd admin-ui && git add app/(dashboard)/notifications/notification-system.tsx lib/api/endpoints/ lib/api/types/notifications.ts lib/api/types/index.ts lib/hooks/use-notifications.ts
git commit -m "feat(notifications): redesign notification composer with segment builder and reach preview"
```

---

## Part 7 — Mobile (Flutter)

### Task 23: Add FCM packages to pubspec.yaml

**Files:**
- Modify: `mobile-app/pubspec.yaml`

- [ ] **Step 1: Add dependencies**

Under `dependencies:`, add:
```yaml
  firebase_messaging: ^14.0.0
  flutter_local_notifications: ^17.0.0
```

- [ ] **Step 2: Install**

```bash
cd mobile-app && flutter pub get 2>&1 | tail -10
```
Expected: resolves without conflicts

- [ ] **Step 3: Android — add google-services.json**

The `android/app/google-services.json` file must exist (Firebase project is already configured). If missing, download it from the Firebase console for project `paz-flutter-app-f9476`.

Verify:
```bash
ls mobile-app/android/app/google-services.json
```

- [ ] **Step 4: iOS — ensure notification entitlements**

In `mobile-app/ios/Runner/Info.plist`, verify or add:
```xml
<key>UIBackgroundModes</key>
<array>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

- [ ] **Step 5: Commit**

```bash
cd mobile-app && git add pubspec.yaml pubspec.lock ios/Runner/Info.plist
git commit -m "feat(notifications): add firebase_messaging and flutter_local_notifications packages"
```

---

### Task 24: Add notification API endpoints to ApiEndpoint enum

**Files:**
- Modify: `mobile-app/lib/network/api/api_endpoint.dart`

- [ ] **Step 1: Add cases**

Add to the `ApiEndpoint` enum:
```dart
deviceTokens,
notificationPreferences,
```

Add to the `path` switch:
```dart
case ApiEndpoint.deviceTokens:
  return "/users/device-tokens";
case ApiEndpoint.notificationPreferences:
  return "/users/me/notification-preferences";
```

- [ ] **Step 2: Commit**

```bash
cd mobile-app && git add lib/network/api/api_endpoint.dart
git commit -m "feat(notifications): add device-token and preferences API endpoints"
```

---

### Task 25: Create NotificationService (FCM + preferences)

**Files:**
- Create: `mobile-app/lib/services/notification/notification_service.dart`
- Create: `mobile-app/lib/services/notification/notification_preferences_model.dart`

- [ ] **Step 1: Write preferences model**

```dart
// mobile-app/lib/services/notification/notification_preferences_model.dart
class NotificationPreferences {
  final bool allNotificationsEnabled;
  final bool pushEnabled;
  final bool emailEnabled;
  final bool smsEnabled;
  final bool whatsappEnabled;
  final bool eventsEnabled;
  final bool announcementsEnabled;
  final bool lifeGroupEnabled;
  final bool academyEnabled;
  final bool adminAlertsEnabled;

  NotificationPreferences({
    this.allNotificationsEnabled = true,
    this.pushEnabled = true,
    this.emailEnabled = true,
    this.smsEnabled = true,
    this.whatsappEnabled = true,
    this.eventsEnabled = true,
    this.announcementsEnabled = true,
    this.lifeGroupEnabled = true,
    this.academyEnabled = true,
    this.adminAlertsEnabled = true,
  });

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    return NotificationPreferences(
      allNotificationsEnabled: json['all_notifications_enabled'] ?? true,
      pushEnabled: json['push_enabled'] ?? true,
      emailEnabled: json['email_enabled'] ?? true,
      smsEnabled: json['sms_enabled'] ?? true,
      whatsappEnabled: json['whatsapp_enabled'] ?? true,
      eventsEnabled: json['events_enabled'] ?? true,
      announcementsEnabled: json['announcements_enabled'] ?? true,
      lifeGroupEnabled: json['life_group_enabled'] ?? true,
      academyEnabled: json['academy_enabled'] ?? true,
      adminAlertsEnabled: json['admin_alerts_enabled'] ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'all_notifications_enabled': allNotificationsEnabled,
    'push_enabled': pushEnabled,
    'email_enabled': emailEnabled,
    'sms_enabled': smsEnabled,
    'whatsapp_enabled': whatsappEnabled,
    'events_enabled': eventsEnabled,
    'announcements_enabled': announcementsEnabled,
    'life_group_enabled': lifeGroupEnabled,
    'academy_enabled': academyEnabled,
    'admin_alerts_enabled': adminAlertsEnabled,
  };

  NotificationPreferences copyWith({
    bool? allNotificationsEnabled,
    bool? pushEnabled,
    bool? emailEnabled,
    bool? smsEnabled,
    bool? whatsappEnabled,
    bool? eventsEnabled,
    bool? announcementsEnabled,
    bool? lifeGroupEnabled,
    bool? academyEnabled,
    bool? adminAlertsEnabled,
  }) {
    return NotificationPreferences(
      allNotificationsEnabled: allNotificationsEnabled ?? this.allNotificationsEnabled,
      pushEnabled: pushEnabled ?? this.pushEnabled,
      emailEnabled: emailEnabled ?? this.emailEnabled,
      smsEnabled: smsEnabled ?? this.smsEnabled,
      whatsappEnabled: whatsappEnabled ?? this.whatsappEnabled,
      eventsEnabled: eventsEnabled ?? this.eventsEnabled,
      announcementsEnabled: announcementsEnabled ?? this.announcementsEnabled,
      lifeGroupEnabled: lifeGroupEnabled ?? this.lifeGroupEnabled,
      academyEnabled: academyEnabled ?? this.academyEnabled,
      adminAlertsEnabled: adminAlertsEnabled ?? this.adminAlertsEnabled,
    );
  }
}
```

- [ ] **Step 2: Write NotificationService**

```dart
// mobile-app/lib/services/notification/notification_service.dart
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:paz_app/helpers/storage_keys.dart';
import 'package:paz_app/network/api/api_endpoint.dart';
import 'package:paz_app/network/api/api_methods.dart';
import 'package:paz_app/network/network_service.dart';
import 'package:paz_app/services/notification/notification_preferences_model.dart';

/// Top-level background message handler — MUST be a top-level function.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Background messages are shown by FCM automatically on Android.
  // No action needed here unless custom processing is required.
}

class NotificationService extends GetxService {
  late final NetworkService _net;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final GetStorage _storage = GetStorage();

  String? _currentToken;

  @override
  void onInit() {
    super.onInit();
    _net = Get.find<NetworkService>();
  }

  Future<void> init() async {
    // Register background handler
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // Init local notifications (for foreground messages)
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    await _localNotifications.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
    );
  }

  /// Called after login — requests permission and registers token.
  Future<void> registerAfterLogin() async {
    // Request permission (iOS) — Android 13+ also requires this
    final settings = await _messaging.requestPermission();
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    final token = await _messaging.getToken();
    if (token == null) return; // Permission denied or no token

    _currentToken = token;
    _storage.write(StorageKeys.fcmToken.key, token);
    await _registerTokenWithBackend(token);

    // Listen for token refresh
    _messaging.onTokenRefresh.listen((newToken) async {
      _currentToken = newToken;
      _storage.write(StorageKeys.fcmToken.key, newToken);
      await _registerTokenWithBackend(newToken);
    });

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_showLocalNotification);

    // Handle notification tap when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageTap);
  }

  /// Called on logout — removes token from backend.
  Future<void> unregisterOnLogout() async {
    final token = _currentToken ?? _storage.read(StorageKeys.fcmToken.key);
    if (token == null) return;
    await _net.request(
      ApiEndpoint.deviceTokens,
      method: ApiMethod.delete,
      id: Uri.encodeComponent(token),
      fromJson: (_) => null,
    );
    _storage.remove(StorageKeys.fcmToken.key);
    _currentToken = null;
  }

  Future<void> _registerTokenWithBackend(String token) async {
    final platform = Platform.isAndroid ? 'android' : 'ios';
    await _net.request(
      ApiEndpoint.deviceTokens,
      method: ApiMethod.post,
      data: {'token': token, 'platform': platform},
      fromJson: (_) => null,
    );
  }

  void _showLocalNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;
    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'paz_church_notifications',
          'Paz Church',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
    );
  }

  void _handleMessageTap(RemoteMessage message) {
    // Navigate based on category in message data
    final category = message.data['category'] as String?;
    if (category == null) return;
    switch (category) {
      case 'events':
        // Get.to(() => EventsPage());
        break;
      case 'life_group':
        // Get.to(() => LifeGroupPage());
        break;
      case 'academy':
        // Get.to(() => AcademyPage());
        break;
      default:
        break;
    }
  }

  // ── Preferences ───────────────────────────────────────────────────────────

  Future<NotificationPreferences> getPreferences() async {
    final result = await _net.request<NotificationPreferences>(
      ApiEndpoint.notificationPreferences,
      method: ApiMethod.get,
      fromJson: (json) => NotificationPreferences.fromJson(json),
    );
    return result ?? NotificationPreferences();
  }

  Future<NotificationPreferences> updatePreferences(Map<String, dynamic> changes) async {
    final result = await _net.request<NotificationPreferences>(
      ApiEndpoint.notificationPreferences,
      method: ApiMethod.put,
      data: changes,
      fromJson: (json) => NotificationPreferences.fromJson(json),
    );
    return result ?? NotificationPreferences();
  }
}
```

> **Note:** `ApiMethod.delete` with an `id` param: check `NetworkService.request()` to see how it builds the URL with `id`. The `DELETE /users/device-tokens/:token` expects the token as a path segment. If `NetworkService` doesn't support this pattern directly, pass it as a query param or use a `data` body instead — check the existing API design and adapt accordingly.

- [ ] **Step 3: Add `fcmToken` to StorageKeys enum** in `mobile-app/lib/helpers/storage_keys.dart`:

```dart
fcmToken,
```

And in the extension:
```dart
case StorageKeys.fcmToken:
  return "fcm_token";
```

- [ ] **Step 4: Run flutter analyze**

```bash
cd mobile-app && flutter analyze 2>&1 | tail -20
```
Expected: no errors (warnings about unused imports are ok at this stage)

- [ ] **Step 5: Commit**

```bash
cd mobile-app && git add lib/services/notification/ lib/helpers/storage_keys.dart
git commit -m "feat(notifications): add NotificationService with FCM token registration"
```

---

### Task 26: Integrate NotificationService into auth flow

**Files:**
- Modify: `mobile-app/lib/main.dart`
- Modify: `mobile-app/lib/services/authentication/auth_service.dart`
- Modify: `mobile-app/lib/services/authentication/auth_controller.dart`

- [ ] **Step 1: Register NotificationService in main.dart**

In `registerDependencies()`, add before `RemoteConfigService`:
```dart
Get.put(NotificationService(), permanent: true);
```

Also add `init()` call:
```dart
final notificationService = Get.find<NotificationService>();
await notificationService.init();
```

Registration order matters: `NotificationService` depends on `NetworkService`, so it must come after `NetworkService`.

- [ ] **Step 2: Call registerAfterLogin() in AuthService.authenticate()**

In `auth_service.dart`, after `await _auth.login(account)`:
```dart
final notificationService = Get.find<NotificationService>();
await notificationService.registerAfterLogin();
```

- [ ] **Step 3: Call unregisterOnLogout() in AuthService.logout()**

In `auth_service.dart`, before `await _auth.logout()`:
```dart
final notificationService = Get.find<NotificationService>();
await notificationService.unregisterOnLogout();
```

- [ ] **Step 4: Run flutter analyze**

```bash
cd mobile-app && flutter analyze 2>&1 | grep "error" | head -20
```

- [ ] **Step 5: Commit**

```bash
cd mobile-app && git add lib/main.dart lib/services/authentication/auth_service.dart
git commit -m "feat(notifications): integrate FCM token registration into auth flow"
```

---

### Task 27: Notification preferences screen

**Files:**
- Create: `mobile-app/lib/features/profile/notification_preferences_controller.dart`
- Create: `mobile-app/lib/features/profile/notification_preferences_screen.dart`

- [ ] **Step 1: Write controller**

```dart
// mobile-app/lib/features/profile/notification_preferences_controller.dart
import 'package:get/get.dart';
import 'package:paz_app/services/notification/notification_preferences_model.dart';
import 'package:paz_app/services/notification/notification_service.dart';

class NotificationPreferencesController extends GetxController {
  late final NotificationService _notificationService;

  final Rx<NotificationPreferences> preferences = NotificationPreferences().obs;
  final RxBool isLoading = true.obs;

  @override
  void onInit() {
    super.onInit();
    _notificationService = Get.find<NotificationService>();
    _load();
  }

  Future<void> _load() async {
    isLoading.value = true;
    preferences.value = await _notificationService.getPreferences();
    isLoading.value = false;
  }

  Future<void> updatePreference(String key, bool value) async {
    // Optimistic update
    final previous = preferences.value;
    preferences.value = _applyChange(preferences.value, key, value);

    try {
      final updated = await _notificationService.updatePreferences({key: value});
      preferences.value = updated;
    } catch (_) {
      // Rollback on error
      preferences.value = previous;
    }
  }

  NotificationPreferences _applyChange(NotificationPreferences prefs, String key, bool value) {
    switch (key) {
      case 'all_notifications_enabled': return prefs.copyWith(allNotificationsEnabled: value);
      case 'push_enabled': return prefs.copyWith(pushEnabled: value);
      case 'email_enabled': return prefs.copyWith(emailEnabled: value);
      case 'sms_enabled': return prefs.copyWith(smsEnabled: value);
      case 'whatsapp_enabled': return prefs.copyWith(whatsappEnabled: value);
      case 'events_enabled': return prefs.copyWith(eventsEnabled: value);
      case 'announcements_enabled': return prefs.copyWith(announcementsEnabled: value);
      case 'life_group_enabled': return prefs.copyWith(lifeGroupEnabled: value);
      case 'academy_enabled': return prefs.copyWith(academyEnabled: value);
      case 'admin_alerts_enabled': return prefs.copyWith(adminAlertsEnabled: value);
      default: return prefs;
    }
  }
}
```

- [ ] **Step 2: Write screen**

```dart
// mobile-app/lib/features/profile/notification_preferences_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:paz_app/features/profile/notification_preferences_controller.dart';
import 'package:paz_app/services/notification/notification_preferences_model.dart';

class NotificationPreferencesScreen extends StatelessWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(NotificationPreferencesController());

    return Scaffold(
      appBar: AppBar(title: const Text('Notificações')),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        final prefs = controller.preferences.value;
        final allEnabled = prefs.allNotificationsEnabled;

        return ListView(
          children: [
            // Master toggle
            _buildMasterToggle(context, prefs, controller),
            const Divider(height: 1),

            // Channels section
            _buildSectionHeader(context, 'Canais'),
            _buildToggleItem(
              context,
              icon: Icons.notifications,
              title: 'Push',
              subtitle: 'Notificações no dispositivo',
              value: prefs.pushEnabled,
              enabled: allEnabled,
              onChanged: (v) => controller.updatePreference('push_enabled', v),
            ),
            _buildToggleItem(
              context,
              icon: Icons.email,
              title: 'Email',
              subtitle: 'Mensagens no seu email',
              value: prefs.emailEnabled,
              enabled: allEnabled,
              onChanged: (v) => controller.updatePreference('email_enabled', v),
            ),
            _buildToggleItem(
              context,
              icon: Icons.sms,
              title: 'SMS',
              subtitle: 'Mensagens de texto',
              value: prefs.smsEnabled,
              enabled: allEnabled,
              onChanged: (v) => controller.updatePreference('sms_enabled', v),
            ),
            _buildToggleItem(
              context,
              icon: Icons.chat,
              title: 'WhatsApp',
              subtitle: 'Mensagens via WhatsApp',
              value: prefs.whatsappEnabled,
              enabled: allEnabled,
              onChanged: (v) => controller.updatePreference('whatsapp_enabled', v),
            ),
            const Divider(height: 1),

            // Topics section
            _buildSectionHeader(context, 'Tópicos'),
            _buildToggleItem(
              context,
              icon: Icons.event,
              title: 'Eventos',
              subtitle: 'Cultos e eventos especiais',
              value: prefs.eventsEnabled,
              enabled: allEnabled,
              onChanged: (v) => controller.updatePreference('events_enabled', v),
            ),
            _buildToggleItem(
              context,
              icon: Icons.campaign,
              title: 'Avisos',
              subtitle: 'Comunicados gerais',
              value: prefs.announcementsEnabled,
              enabled: allEnabled,
              onChanged: (v) => controller.updatePreference('announcements_enabled', v),
            ),
            _buildToggleItem(
              context,
              icon: Icons.group,
              title: 'Célula',
              subtitle: 'Reuniões e atualizações',
              value: prefs.lifeGroupEnabled,
              enabled: allEnabled,
              onChanged: (v) => controller.updatePreference('life_group_enabled', v),
            ),
            _buildToggleItem(
              context,
              icon: Icons.school,
              title: 'Academia',
              subtitle: 'Cursos e lições',
              value: prefs.academyEnabled,
              enabled: allEnabled,
              onChanged: (v) => controller.updatePreference('academy_enabled', v),
            ),
            _buildToggleItem(
              context,
              icon: Icons.security,
              title: 'Alertas Admin',
              subtitle: 'Notificações de liderança',
              value: prefs.adminAlertsEnabled,
              enabled: allEnabled,
              onChanged: (v) => controller.updatePreference('admin_alerts_enabled', v),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildMasterToggle(
    BuildContext context,
    NotificationPreferences prefs,
    NotificationPreferencesController controller,
  ) {
    return Container(
      color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primary,
          child: const Icon(Icons.notifications, color: Colors.white),
        ),
        title: const Text('Todas as Notificações', style: TextStyle(fontWeight: FontWeight.w600)),
        subtitle: const Text('Desative para silenciar tudo'),
        trailing: Switch(
          value: prefs.allNotificationsEnabled,
          onChanged: (v) => controller.updatePreference('all_notifications_enabled', v),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
        ),
      ),
    );
  }

  Widget _buildToggleItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required bool enabled,
    required ValueChanged<bool> onChanged,
  }) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
        child: Icon(icon, size: 20),
      ),
      title: Text(title),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      trailing: Switch(
        value: value && enabled,
        onChanged: enabled ? onChanged : null,
      ),
    );
  }
}
```

- [ ] **Step 3: Add a link to the preferences screen from the Profile page**

Find the existing profile page at `lib/features/profile/` and add a `ListTile` that navigates to `NotificationPreferencesScreen`:
```dart
ListTile(
  leading: const Icon(Icons.notifications),
  title: const Text('Notificações'),
  trailing: const Icon(Icons.chevron_right),
  onTap: () => Get.to(() => const NotificationPreferencesScreen()),
),
```

- [ ] **Step 4: Run flutter analyze**

```bash
cd mobile-app && flutter analyze 2>&1 | grep "error" | head -20
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd mobile-app && git add lib/features/profile/notification_preferences_controller.dart lib/features/profile/notification_preferences_screen.dart
git commit -m "feat(notifications): add NotificationPreferencesScreen and controller"
```

---

## Final Verification

- [ ] **Backend integration smoke test**

```bash
cd backend && docker compose up -d && npm run start:dev
# In another terminal, run migrations:
cd backend && npm run migration:run
```
Verify server starts without errors.

- [ ] **Admin-UI smoke test**

```bash
cd admin-ui && npm run dev
```
Open http://localhost:3000/notifications and verify the redesigned composer renders without errors.

- [ ] **Mobile smoke test**

```bash
cd mobile-app && flutter analyze && flutter build apk --debug
```
Expected: builds successfully.

- [ ] **Final commit — root repo submodule pointers**

```bash
cd /Users/jonathalima/Developer/church
git add backend admin-ui mobile-app
git commit -m "chore: update submodule pointers for notification system implementation"
```
