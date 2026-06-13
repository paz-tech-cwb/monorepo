# Ministry Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the `atmosphere` module into a first-class **Ministry** feature (teams-or-direct-people, husband/wife leader pairs) across backend, admin-ui, and mobile.

**Architecture:** Rename `atmosphere_*` tables/module to `ministries`, add `description` + `co_leader_id` + `membership_mode`, add `co_leader_id` to teams and life-groups. Admin-ui gets a reusable `<LeaderPairPicker>` and a redesigned ministry create/edit/view UX. Mobile enriches its read-only ministry view with the leader pair. Leaders are two independently-selected Users; the co-leader is always optional.

**Tech Stack:** NestJS 11 + TypeORM + PostgreSQL 16 (backend), Next.js 15 + React 19 + React Query (admin-ui), Kotlin Multiplatform + Compose (mobile).

**Spec:** `docs/superpowers/specs/2026-06-13-ministry-feature-design.md`

**Conventions reminder:**
- Each submodule is its own git repo — commit *inside* the submodule, then record the pointer in the root repo.
- Backend ↔ admin-ui wire format is always `snake_case`.
- Run from `backend/`: `npm run build` (also compiles migrations), `npm run lint`, `npm run test`, `npm run migration:run`.
- Migrations live in `backend/database/migrations/` and run from compiled `dist/database/migrations/*.js`. Use a timestamp prefix greater than the latest (`1780900000014`).

---

## Phase 1 — Backend: ministries module

> Independently shippable: after this phase the API serves `/api/ministries/*` with dual leaders, description, and membership mode.

### Task 1.1: Rename entities to ministry naming + add new columns

**Files:**
- Rename: `src/atmosphere/entities/atmosphere-ministry.entity.ts` → `src/ministries/entities/ministry.entity.ts`
- Rename: `src/atmosphere/entities/atmosphere-team.entity.ts` → `src/ministries/entities/ministry-team.entity.ts`

- [ ] **Step 1: Create `src/ministries/entities/ministry.entity.ts`**

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Expose, Type } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { MinistryTeam } from './ministry-team.entity';

export type MembershipMode = 'teams' | 'direct';

@Entity('ministries')
export class Ministry {
  @Expose() @PrimaryGeneratedColumn() id: number;
  @Expose() @Column({ type: 'varchar', length: 180 }) name: string;
  @Expose() @Column({ type: 'text', nullable: true }) description: string | null;
  @Expose() @Column({ name: 'membership_mode', type: 'varchar', length: 16, default: 'teams' })
  membershipMode: MembershipMode;
  @Expose() @Type(() => User)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'leader_id' })
  leader: User | null;
  @Expose() @Type(() => User)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'co_leader_id' })
  coLeader: User | null;
  @Expose() @Type(() => MinistryTeam)
  @OneToMany(() => MinistryTeam, (t) => t.ministry) teams: MinistryTeam[];
  @Expose() @Type(() => User)
  @ManyToMany(() => User)
  @JoinTable({
    name: 'ministry_members',
    joinColumn: { name: 'ministry_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  members: User[];
  @Expose() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @Expose() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
```

- [ ] **Step 2: Create `src/ministries/entities/ministry-team.entity.ts`**

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne,
  PrimaryGeneratedColumn, RelationId, UpdateDateColumn,
} from 'typeorm';
import { Expose, Type } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { Ministry } from './ministry.entity';

@Entity('ministry_teams')
export class MinistryTeam {
  @Expose() @PrimaryGeneratedColumn() id: number;
  @Expose() @Column({ type: 'varchar', length: 180 }) name: string;
  @Expose() @Type(() => Ministry)
  @ManyToOne(() => Ministry, (m) => m.teams, { nullable: false })
  @JoinColumn({ name: 'ministry_id' })
  ministry: Ministry;
  @Expose() @RelationId((t: MinistryTeam) => t.ministry) ministryId: number;
  @Expose() @Type(() => User)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'leader_id' })
  leader: User | null;
  @Expose() @Type(() => User)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'co_leader_id' })
  coLeader: User | null;
  @Expose() @Type(() => User)
  @ManyToMany(() => User)
  @JoinTable({
    name: 'ministry_team_members',
    joinColumn: { name: 'team_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  members: User[];
  @Expose() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @Expose() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
```

- [ ] **Step 3: Delete the old entity files**

```bash
git rm src/atmosphere/entities/atmosphere-ministry.entity.ts src/atmosphere/entities/atmosphere-team.entity.ts
```

### Task 1.2: Rename DTOs + add new fields

**Files:**
- Create: `src/ministries/dto/create-ministry.dto.ts`, `update-ministry.dto.ts`, `create-ministry-team.dto.ts`, `update-ministry-team.dto.ts`
- Delete: `src/atmosphere/dto/*.ts`

- [ ] **Step 1: Create `src/ministries/dto/create-ministry.dto.ts`**

```typescript
import { Expose } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import type { MembershipMode } from '../entities/ministry.entity';

export class CreateMinistryDto {
  @Expose() @IsString() name: string;
  @Expose() @IsOptional() @IsString() description?: string;
  @Expose({ name: 'membership_mode' }) @IsOptional() @IsIn(['teams', 'direct'])
  membershipMode?: MembershipMode;
  @Expose({ name: 'leader_id' }) @IsOptional() @IsInt() leaderId?: number;
  @Expose({ name: 'co_leader_id' }) @IsOptional() @IsInt() coLeaderId?: number;
}
```

- [ ] **Step 2: Create `src/ministries/dto/update-ministry.dto.ts`**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateMinistryDto } from './create-ministry.dto';
export class UpdateMinistryDto extends PartialType(CreateMinistryDto) {}
```

- [ ] **Step 3: Create `src/ministries/dto/create-ministry-team.dto.ts`**

```typescript
import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMinistryTeamDto {
  @Expose() @IsString() name: string;
  @Expose({ name: 'ministry_id' }) @IsInt() ministryId: number;
  @Expose({ name: 'leader_id' }) @IsOptional() @IsInt() leaderId?: number;
  @Expose({ name: 'co_leader_id' }) @IsOptional() @IsInt() coLeaderId?: number;
}
```

- [ ] **Step 4: Create `src/ministries/dto/update-ministry-team.dto.ts`**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateMinistryTeamDto } from './create-ministry-team.dto';
export class UpdateMinistryTeamDto extends PartialType(CreateMinistryTeamDto) {}
```

- [ ] **Step 5: Delete old DTOs**

```bash
git rm -r src/atmosphere/dto
```

### Task 1.3: Service with leader pair + either/or validation

**Files:**
- Create: `src/ministries/ministries.service.ts`
- Test: `src/ministries/ministries.service.spec.ts`
- Delete: `src/atmosphere/atmosphere.service.ts`

- [ ] **Step 1: Write the failing test `src/ministries/ministries.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { MinistriesService } from './ministries.service';
import { Ministry } from './entities/ministry.entity';
import { MinistryTeam } from './entities/ministry-team.entity';

describe('MinistriesService', () => {
  let service: MinistriesService;
  let ministryRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    ministryRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((x) => x) };
    const teamRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((x) => x), find: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinistriesService,
        { provide: getRepositoryToken(Ministry), useValue: ministryRepo },
        { provide: getRepositoryToken(MinistryTeam), useValue: teamRepo },
      ],
    }).compile();
    service = module.get(MinistriesService);
  });

  it('rejects adding a direct member to a teams-mode ministry', async () => {
    ministryRepo.findOne.mockResolvedValue({ id: 1, membershipMode: 'teams', members: [] });
    await expect(service.addMinistryMember(1, 5)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds a direct member to a direct-mode ministry', async () => {
    ministryRepo.findOne.mockResolvedValue({ id: 1, membershipMode: 'direct', members: [] });
    await service.addMinistryMember(1, 5);
    expect(ministryRepo.save).toHaveBeenCalled();
  });

  it('sets both leader and co_leader on create', async () => {
    ministryRepo.save.mockImplementation((x) => x);
    const result: any = await service.createMinistry({ name: 'Louvor', leaderId: 2, coLeaderId: 3 } as any);
    expect(result.leader).toEqual({ id: 2 });
    expect(result.coLeader).toEqual({ id: 3 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/ministries/ministries.service.spec.ts`
Expected: FAIL — cannot find module `./ministries.service`.

- [ ] **Step 3: Create `src/ministries/ministries.service.ts`**

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from './entities/ministry.entity';
import { MinistryTeam } from './entities/ministry-team.entity';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';
import { CreateMinistryTeamDto } from './dto/create-ministry-team.dto';
import { UpdateMinistryTeamDto } from './dto/update-ministry-team.dto';

const MINISTRY_RELATIONS = [
  'leader', 'coLeader', 'members',
  'teams', 'teams.leader', 'teams.coLeader', 'teams.members',
];

@Injectable()
export class MinistriesService {
  constructor(
    @InjectRepository(Ministry) private readonly ministryRepo: Repository<Ministry>,
    @InjectRepository(MinistryTeam) private readonly teamRepo: Repository<MinistryTeam>,
  ) {}

  private ref(id?: number) {
    return id ? ({ id } as any) : null;
  }

  findAllMinistries() {
    return this.ministryRepo.find({ relations: MINISTRY_RELATIONS, order: { name: 'ASC' } });
  }

  findMinistry(id: number) {
    return this.ministryRepo.findOne({ where: { id }, relations: MINISTRY_RELATIONS });
  }

  async createMinistry(dto: CreateMinistryDto) {
    return this.ministryRepo.save(this.ministryRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      membershipMode: dto.membershipMode ?? 'teams',
      leader: this.ref(dto.leaderId),
      coLeader: this.ref(dto.coLeaderId),
    }));
  }

  async updateMinistry(id: number, dto: UpdateMinistryDto) {
    const m = await this.ministryRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException();
    if (dto.name !== undefined) m.name = dto.name;
    if (dto.description !== undefined) m.description = dto.description ?? null;
    if (dto.membershipMode !== undefined) m.membershipMode = dto.membershipMode;
    if (dto.leaderId !== undefined) m.leader = this.ref(dto.leaderId);
    if (dto.coLeaderId !== undefined) m.coLeader = this.ref(dto.coLeaderId);
    return this.ministryRepo.save(m);
  }

  async deleteMinistry(id: number) {
    await this.ministryRepo.delete(id);
  }

  findAllTeams(ministryId?: number) {
    const where = ministryId ? { ministryId } : {};
    return this.teamRepo.find({
      where, relations: ['leader', 'coLeader', 'members', 'ministry'], order: { name: 'ASC' },
    });
  }

  async createTeam(dto: CreateMinistryTeamDto) {
    const ministry = await this.ministryRepo.findOne({ where: { id: dto.ministryId } });
    if (!ministry) throw new NotFoundException('Ministry not found');
    if (ministry.membershipMode !== 'teams') {
      throw new BadRequestException('Ministry is in direct-members mode; teams are not allowed');
    }
    return this.teamRepo.save(this.teamRepo.create({
      name: dto.name,
      ministry: this.ref(dto.ministryId),
      ministryId: dto.ministryId,
      leader: this.ref(dto.leaderId),
      coLeader: this.ref(dto.coLeaderId),
    }));
  }

  async updateTeam(id: number, dto: UpdateMinistryTeamDto) {
    const t = await this.teamRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException();
    if (dto.name !== undefined) t.name = dto.name;
    if (dto.ministryId !== undefined) t.ministryId = dto.ministryId;
    if (dto.leaderId !== undefined) t.leader = this.ref(dto.leaderId);
    if (dto.coLeaderId !== undefined) t.coLeader = this.ref(dto.coLeaderId);
    return this.teamRepo.save(t);
  }

  async deleteTeam(id: number) {
    await this.teamRepo.delete(id);
  }

  async addMinistryMember(ministryId: number, userId: number) {
    const m = await this.ministryRepo.findOne({ where: { id: ministryId }, relations: ['members'] });
    if (!m) throw new NotFoundException();
    if (m.membershipMode !== 'direct') {
      throw new BadRequestException('Ministry is in teams mode; add members to a team instead');
    }
    if (!m.members.some((u) => u.id === userId)) {
      m.members = [...m.members, this.ref(userId)];
      await this.ministryRepo.save(m);
    }
    return this.findMinistry(ministryId);
  }

  async removeMinistryMember(ministryId: number, userId: number) {
    const m = await this.ministryRepo.findOne({ where: { id: ministryId }, relations: ['members'] });
    if (!m) throw new NotFoundException();
    m.members = m.members.filter((u) => u.id !== userId);
    await this.ministryRepo.save(m);
  }

  async addTeamMember(teamId: number, userId: number) {
    const t = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['members'] });
    if (!t) throw new NotFoundException();
    if (!t.members.some((u) => u.id === userId)) {
      t.members = [...t.members, this.ref(userId)];
      await this.teamRepo.save(t);
    }
    return this.teamRepo.findOne({
      where: { id: teamId }, relations: ['leader', 'coLeader', 'members', 'ministry'],
    });
  }

  async removeTeamMember(teamId: number, userId: number) {
    const t = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['members'] });
    if (!t) throw new NotFoundException();
    t.members = t.members.filter((u) => u.id !== userId);
    await this.teamRepo.save(t);
  }
}
```

- [ ] **Step 4: Delete old service**

```bash
git rm src/atmosphere/atmosphere.service.ts
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/ministries/ministries.service.spec.ts`
Expected: PASS (3 passing).

- [ ] **Step 6: Commit**

```bash
git add src/ministries && git commit -m "feat(ministries): service with leader pairs and either/or membership"
```

### Task 1.4: Controller + module rename (route `/api/ministries`)

**Files:**
- Create: `src/ministries/ministries.controller.ts`, `src/ministries/ministries.module.ts`
- Delete: `src/atmosphere/atmosphere.controller.ts`, `src/atmosphere/atmosphere.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create `src/ministries/ministries.controller.ts`**

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MinistriesService } from './ministries.service';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';
import { CreateMinistryTeamDto } from './dto/create-ministry-team.dto';
import { UpdateMinistryTeamDto } from './dto/update-ministry-team.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('ministries')
export class MinistriesController {
  constructor(private readonly svc: MinistriesService) {}

  @Get() findAllMinistries() { return this.svc.findAllMinistries(); }
  @Get(':id') findMinistry(@Param('id', ParseIntPipe) id: number) { return this.svc.findMinistry(id); }
  @Post() createMinistry(@Body() dto: CreateMinistryDto) { return this.svc.createMinistry(dto); }
  @Put(':id') updateMinistry(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMinistryDto) { return this.svc.updateMinistry(id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) deleteMinistry(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteMinistry(id); }

  @Get('teams/all') findAllTeams(@Query('ministry_id', new ParseIntPipe({ optional: true })) ministryId?: number) { return this.svc.findAllTeams(ministryId); }
  @Post('teams') createTeam(@Body() dto: CreateMinistryTeamDto) { return this.svc.createTeam(dto); }
  @Put('teams/:id') updateTeam(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMinistryTeamDto) { return this.svc.updateTeam(id, dto); }
  @Delete('teams/:id') @HttpCode(HttpStatus.NO_CONTENT) deleteTeam(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteTeam(id); }

  @Post(':id/members/:userId')
  addMinistryMember(@Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number) { return this.svc.addMinistryMember(id, userId); }
  @Delete(':id/members/:userId') @HttpCode(HttpStatus.NO_CONTENT)
  removeMinistryMember(@Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number) { return this.svc.removeMinistryMember(id, userId); }

  @Post('teams/:id/members/:userId')
  addTeamMember(@Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number) { return this.svc.addTeamMember(id, userId); }
  @Delete('teams/:id/members/:userId') @HttpCode(HttpStatus.NO_CONTENT)
  removeTeamMember(@Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number) { return this.svc.removeTeamMember(id, userId); }
}
```

> Note the route shift vs atmosphere: ministries are now at `/api/ministries` (was `/api/atmosphere/ministries`), and the team list moved to `/api/ministries/teams/all` to avoid colliding with `/api/ministries/:id`. Keep this in mind for Task 2.1 (admin endpoints) and Task 5.1 (Postman).

- [ ] **Step 2: Create `src/ministries/ministries.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ministry } from './entities/ministry.entity';
import { MinistryTeam } from './entities/ministry-team.entity';
import { MinistriesService } from './ministries.service';
import { MinistriesController } from './ministries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ministry, MinistryTeam])],
  controllers: [MinistriesController],
  providers: [MinistriesService],
  exports: [MinistriesService],
})
export class MinistriesModule {}
```

- [ ] **Step 3: Swap the module registration in `src/app.module.ts`**

Replace the `AtmosphereModule` import line and its entry in the `imports` array with:

```typescript
import { MinistriesModule } from './ministries/ministries.module';
```

and `MinistriesModule` in the `imports: [...]` array. Then delete the old module/controller:

```bash
git rm src/atmosphere/atmosphere.controller.ts src/atmosphere/atmosphere.module.ts
```

- [ ] **Step 4: Verify the `atmosphere` folder is empty and remove it**

Run: `cd backend && find src/atmosphere -type f`
Expected: no output. Then `rmdir src/atmosphere` if it remains.

- [ ] **Step 5: Build + lint**

Run: `cd backend && npm run build && npm run lint`
Expected: build succeeds, no lint errors, no remaining references to `Atmosphere`.

- [ ] **Step 6: Verify no stale references**

Run: `cd backend && grep -rn "atmosphere\|Atmosphere" src` (case-insensitive: add `-i`)
Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(ministries): rename atmosphere module to ministries, route /api/ministries"
```

### Task 1.5: Migration — rename tables, add columns, life_groups co_leader

**Files:**
- Create: `database/migrations/1780900000015-RenameAtmosphereToMinistries.ts`
- Modify: `src/life-groups/entities/life-group.entity.ts`

- [ ] **Step 1: Add `coLeader` to `src/life-groups/entities/life-group.entity.ts`**

Add the import-friendly relation directly after the existing `leader` relation:

```typescript
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'co_leader_id' })
  coLeader: User | null;
```

Add `JoinColumn` to the existing import from `typeorm` (the import currently lists `Column, CreateDateColumn, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn` — add `JoinColumn`).

- [ ] **Step 2: Create the migration `database/migrations/1780900000015-RenameAtmosphereToMinistries.ts`**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAtmosphereToMinistries1780900000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = queryRunner.query.bind(queryRunner);
    // Rename tables (IF EXISTS guards keep this idempotent across environments)
    await q(`ALTER TABLE IF EXISTS "atmosphere_ministries" RENAME TO "ministries"`);
    await q(`ALTER TABLE IF EXISTS "atmosphere_teams" RENAME TO "ministry_teams"`);
    await q(`ALTER TABLE IF EXISTS "atmosphere_ministry_members" RENAME TO "ministry_members"`);
    await q(`ALTER TABLE IF EXISTS "atmosphere_team_members" RENAME TO "ministry_team_members"`);
    // New columns on ministries
    await q(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "description" text`);
    await q(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "co_leader_id" int`);
    await q(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "membership_mode" varchar(16) NOT NULL DEFAULT 'teams'`);
    await q(`ALTER TABLE "ministries" ADD CONSTRAINT "fk_ministries_co_leader" FOREIGN KEY ("co_leader_id") REFERENCES "users"("id") ON DELETE SET NULL`);
    // New column on ministry_teams
    await q(`ALTER TABLE "ministry_teams" ADD COLUMN IF NOT EXISTS "co_leader_id" int`);
    await q(`ALTER TABLE "ministry_teams" ADD CONSTRAINT "fk_ministry_teams_co_leader" FOREIGN KEY ("co_leader_id") REFERENCES "users"("id") ON DELETE SET NULL`);
    // New column on life_groups
    await q(`ALTER TABLE "life_groups" ADD COLUMN IF NOT EXISTS "co_leader_id" int`);
    await q(`ALTER TABLE "life_groups" ADD CONSTRAINT "fk_life_groups_co_leader" FOREIGN KEY ("co_leader_id") REFERENCES "users"("id") ON DELETE SET NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = queryRunner.query.bind(queryRunner);
    await q(`ALTER TABLE "life_groups" DROP CONSTRAINT IF EXISTS "fk_life_groups_co_leader"`);
    await q(`ALTER TABLE "life_groups" DROP COLUMN IF EXISTS "co_leader_id"`);
    await q(`ALTER TABLE "ministry_teams" DROP CONSTRAINT IF EXISTS "fk_ministry_teams_co_leader"`);
    await q(`ALTER TABLE "ministry_teams" DROP COLUMN IF EXISTS "co_leader_id"`);
    await q(`ALTER TABLE "ministries" DROP CONSTRAINT IF EXISTS "fk_ministries_co_leader"`);
    await q(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "membership_mode"`);
    await q(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "co_leader_id"`);
    await q(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "description"`);
    await q(`ALTER TABLE IF EXISTS "ministry_team_members" RENAME TO "atmosphere_team_members"`);
    await q(`ALTER TABLE IF EXISTS "ministry_members" RENAME TO "atmosphere_ministry_members"`);
    await q(`ALTER TABLE IF EXISTS "ministry_teams" RENAME TO "atmosphere_teams"`);
    await q(`ALTER TABLE IF EXISTS "ministries" RENAME TO "atmosphere_ministries"`);
  }
}
```

- [ ] **Step 3: Build then run the migration against local Postgres**

Run: `cd backend && docker compose up -d && npm run build && npm run migration:run`
Expected: migration `RenameAtmosphereToMinistries1780900000015` runs without error.

- [ ] **Step 4: Verify schema**

Run: `cd backend && docker compose exec -T <postgres-service> psql -U "$DB_USERNAME" -d "$DB_NAME" -c "\d ministries"` (substitute the compose service name; fall back to `psql` directly if needed).
Expected: `ministries` table exists with `description`, `co_leader_id`, `membership_mode` columns.

- [ ] **Step 5: Commit (backend submodule)**

```bash
git add database/migrations/1780900000015-RenameAtmosphereToMinistries.ts src/life-groups/entities/life-group.entity.ts
git commit -m "feat(ministries): migration renaming atmosphere tables + co_leader columns"
git push
```

- [ ] **Step 6: Record submodule pointer in root repo**

```bash
cd .. && git add backend && git commit -m "chore: update backend submodule — ministries module" && cd backend
```

---

## Phase 2 — Admin-UI: ministries management

> Independently shippable after Phase 1 is deployed. Run from `admin-ui/`: `npm run lint`, `npm run build`, `npm run dev`.

### Task 2.1: Rename API types + endpoints to ministries

**Files:**
- Create: `lib/api/types/ministries.ts`
- Delete: `lib/api/types/atmosphere.ts`
- Modify: `lib/api/types/index.ts:2`
- Create: `lib/api/endpoints/ministries.ts`
- Delete: `lib/api/endpoints/atmosphere.ts`

- [ ] **Step 1: Create `lib/api/types/ministries.ts`**

```typescript
export type MembershipMode = "teams" | "direct"

export interface MinistryMember {
  id: number
  name: string
  role?: string
}

export interface LeaderRef {
  id: number
  name: string
}

export interface MinistryTeam {
  id: number
  name: string
  ministry_id: number
  leader: LeaderRef | null
  co_leader: LeaderRef | null
  members: MinistryMember[]
  created_at: string
  updated_at: string
}

export interface Ministry {
  id: number
  name: string
  description: string | null
  membership_mode: MembershipMode
  leader: LeaderRef | null
  co_leader: LeaderRef | null
  members: MinistryMember[]
  teams: MinistryTeam[]
  created_at: string
  updated_at: string
}

export interface CreateMinistryRequest {
  name: string
  description?: string
  membership_mode?: MembershipMode
  leader_id?: number
  co_leader_id?: number
}

export interface CreateMinistryTeamRequest {
  name: string
  ministry_id: number
  leader_id?: number
  co_leader_id?: number
}
```

- [ ] **Step 2: Update `lib/api/types/index.ts`** — replace the line `export * from "./atmosphere"` with `export * from "./ministries"`, then `git rm lib/api/types/atmosphere.ts`.

- [ ] **Step 3: Create `lib/api/endpoints/ministries.ts`**

```typescript
import { api } from "@/lib/api/client"
import type {
  Ministry, MinistryTeam,
  CreateMinistryRequest, CreateMinistryTeamRequest,
} from "@/lib/api/types"

export const ministriesApi = {
  getMinistries: () => api.get<Ministry[]>("/ministries"),
  getMinistry: (id: number) => api.get<Ministry>(`/ministries/${id}`),
  createMinistry: (data: CreateMinistryRequest) => api.post<Ministry>("/ministries", data),
  updateMinistry: (id: number, data: Partial<CreateMinistryRequest>) =>
    api.put<Ministry>(`/ministries/${id}`, data),
  deleteMinistry: (id: number) => api.delete<void>(`/ministries/${id}`),

  getTeams: (ministryId?: number) =>
    ministryId
      ? api.get<MinistryTeam[]>(`/ministries/teams/all?ministry_id=${ministryId}`)
      : api.get<MinistryTeam[]>("/ministries/teams/all"),
  createTeam: (data: CreateMinistryTeamRequest) =>
    api.post<MinistryTeam>("/ministries/teams", data),
  updateTeam: (id: number, data: Partial<CreateMinistryTeamRequest>) =>
    api.put<MinistryTeam>(`/ministries/teams/${id}`, data),
  deleteTeam: (id: number) => api.delete<void>(`/ministries/teams/${id}`),

  addMinistryMember: (ministryId: number, userId: number) =>
    api.post<Ministry>(`/ministries/${ministryId}/members/${userId}`, {}),
  removeMinistryMember: (ministryId: number, userId: number) =>
    api.delete<void>(`/ministries/${ministryId}/members/${userId}`),
  addTeamMember: (teamId: number, userId: number) =>
    api.post<MinistryTeam>(`/ministries/teams/${teamId}/members/${userId}`, {}),
  removeTeamMember: (teamId: number, userId: number) =>
    api.delete<void>(`/ministries/teams/${teamId}/members/${userId}`),
}
```

- [ ] **Step 4: Delete old endpoints** — `git rm lib/api/endpoints/atmosphere.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/api && git commit -m "feat(ministries): rename atmosphere api types and endpoints"
```

### Task 2.2: Rename hooks to use-ministries

**Files:**
- Create: `lib/hooks/use-ministries.ts`
- Delete: `lib/hooks/use-atmosphere.ts`

- [ ] **Step 1: Create `lib/hooks/use-ministries.ts`** — copy the structure of the old `use-atmosphere.ts`, renaming every symbol (`useAtmosphereMinistries` → `useMinistries`, `useAtmosphereTeams` → `useMinistryTeams`, `useCreateAtmosphereMinistry` → `useCreateMinistry`, etc.), swapping `atmosphereApi` → `ministriesApi`, and query keys `"atmosphere-ministries"` → `"ministries"`, `"atmosphere-teams"` → `"ministry-teams"`. Add a detail hook:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ministriesApi } from "@/lib/api/endpoints/ministries"
import type { CreateMinistryRequest, CreateMinistryTeamRequest } from "@/lib/api/types"

export function useMinistries() {
  return useQuery({ queryKey: ["ministries"], queryFn: () => ministriesApi.getMinistries() })
}

export function useMinistry(id: number) {
  return useQuery({ queryKey: ["ministries", id], queryFn: () => ministriesApi.getMinistry(id), enabled: !!id })
}

export function useMinistryTeams(ministryId?: number) {
  return useQuery({
    queryKey: ["ministry-teams", ministryId],
    queryFn: () => ministriesApi.getTeams(ministryId),
  })
}

export function useCreateMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMinistryRequest) => ministriesApi.createMinistry(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useUpdateMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateMinistryRequest>) =>
      ministriesApi.updateMinistry(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useDeleteMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ministriesApi.deleteMinistry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useCreateMinistryTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMinistryTeamRequest) => ministriesApi.createTeam(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useUpdateMinistryTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateMinistryTeamRequest>) =>
      ministriesApi.updateTeam(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useDeleteMinistryTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ministriesApi.deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useAddMinistryMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ministryId, userId }: { ministryId: number; userId: number }) =>
      ministriesApi.addMinistryMember(ministryId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useRemoveMinistryMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ministryId, userId }: { ministryId: number; userId: number }) =>
      ministriesApi.removeMinistryMember(ministryId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useAddMinistryTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      ministriesApi.addTeamMember(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useRemoveMinistryTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      ministriesApi.removeTeamMember(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}
```

- [ ] **Step 2: Delete old hooks** — `git rm lib/hooks/use-atmosphere.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/hooks && git commit -m "feat(ministries): rename use-atmosphere hook to use-ministries"
```

### Task 2.3: Reusable `<LeaderPairPicker>` component

**Files:**
- Create: `components/ministries/leader-pair-picker.tsx`

- [ ] **Step 1: Create `components/ministries/leader-pair-picker.tsx`**

```tsx
"use client"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface UserOption { id: number; name: string }

interface LeaderPairPickerProps {
  users: UserOption[]
  leaderId: number | null
  coLeaderId: number | null
  onLeaderChange: (id: number | null) => void
  onCoLeaderChange: (id: number | null) => void
  leaderLabel?: string
  coLeaderLabel?: string
}

const NONE = "none"

export function LeaderPairPicker({
  users, leaderId, coLeaderId, onLeaderChange, onCoLeaderChange,
  leaderLabel = "Líder", coLeaderLabel = "Co-líder (cônjuge)",
}: LeaderPairPickerProps) {
  const toVal = (id: number | null) => (id == null ? NONE : String(id))
  const parse = (v: string) => (v === NONE ? null : Number(v))
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label>{leaderLabel}</Label>
        <Select value={toVal(leaderId)} onValueChange={(v) => onLeaderChange(parse(v))}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)} disabled={u.id === coLeaderId}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>{coLeaderLabel}</Label>
        <Select value={toVal(coLeaderId)} onValueChange={(v) => onCoLeaderChange(parse(v))}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)} disabled={u.id === leaderId}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Lint + commit**

Run: `cd admin-ui && npm run lint`
Expected: no errors.

```bash
git add components/ministries/leader-pair-picker.tsx
git commit -m "feat(ministries): reusable LeaderPairPicker component"
```

### Task 2.4: Rewire ministerios management UI (dual leaders, mode toggle, view)

**Files:**
- Modify: `app/(dashboard)/ministerios/ministerios-management.tsx` (full rewrite of imports + form state)

- [ ] **Step 1: Update imports + hooks** — replace the `use-atmosphere` import block and types with the new ministries hooks and types, and import the picker:

```tsx
import {
  useMinistries, useCreateMinistry, useUpdateMinistry, useDeleteMinistry,
  useCreateMinistryTeam, useUpdateMinistryTeam, useDeleteMinistryTeam,
  useAddMinistryMember, useRemoveMinistryMember,
  useAddMinistryTeamMember, useRemoveMinistryTeamMember,
} from "@/lib/hooks/use-ministries"
import type { Ministry, MinistryTeam, MembershipMode } from "@/lib/api/types"
import { LeaderPairPicker } from "@/components/ministries/leader-pair-picker"
```

Update the destructured hook calls at the top of `MisteriosManagement` to the renamed hooks (`useMinistries()`, `useCreateMinistry()`, …).

- [ ] **Step 2: Extend the ministry form state** to carry the new fields:

```tsx
const [ministryForm, setMinistryForm] = useState<{
  name: string
  description: string
  membership_mode: MembershipMode
  leader_id: number | null
  co_leader_id: number | null
}>({ name: "", description: "", membership_mode: "teams", leader_id: null, co_leader_id: null })

const [teamForm, setTeamForm] = useState<{
  name: string; leader_id: number | null; co_leader_id: number | null
}>({ name: "", leader_id: null, co_leader_id: null })
```

- [ ] **Step 3: In the ministry create/edit dialog body**, add the description field, the `<LeaderPairPicker>`, and a membership-mode toggle. Insert after the existing name `<Input>`:

```tsx
<div className="space-y-1">
  <Label>Descrição</Label>
  <Input
    value={ministryForm.description}
    onChange={(e) => setMinistryForm((f) => ({ ...f, description: e.target.value }))}
    placeholder="O que é este ministério"
  />
</div>

<LeaderPairPicker
  users={allUsers}
  leaderId={ministryForm.leader_id}
  coLeaderId={ministryForm.co_leader_id}
  onLeaderChange={(id) => setMinistryForm((f) => ({ ...f, leader_id: id }))}
  onCoLeaderChange={(id) => setMinistryForm((f) => ({ ...f, co_leader_id: id }))}
/>

<div className="space-y-1">
  <Label>Organização</Label>
  <Select
    value={ministryForm.membership_mode}
    onValueChange={(v) => setMinistryForm((f) => ({ ...f, membership_mode: v as MembershipMode }))}
  >
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="teams">Equipes</SelectItem>
      <SelectItem value="direct">Pessoas diretamente</SelectItem>
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 4: Pass the new fields into the create/update mutation payloads.** Where the ministry is saved, send `description`, `membership_mode`, `leader_id`, `co_leader_id` (omit nulls is fine — backend treats absent as unchanged, explicit `null` as cleared). When editing, prefill `ministryForm` from the selected ministry including `co_leader?.id ?? null` and `membership_mode`.

- [ ] **Step 5: Gate team vs direct-member UI by `membership_mode`.** In the expanded ministry row: when `ministry.membership_mode === "teams"` show the existing team list + "Add team" (each team rendering its own `<LeaderPairPicker>` in its dialog and members); when `=== "direct"` show a direct member list with add/remove using `useAddMinistryMember`/`useRemoveMinistryMember`. Use the existing `Command`/`useUsers` member-search pattern already in the file for both.

- [ ] **Step 6: Show the leader pair in the table/view.** In the ministry list row and detail, render leaders as: `{ministry.leader?.name ?? "—"}{ministry.co_leader ? ` & ${ministry.co_leader.name}` : ""}`. Do the same for each team.

- [ ] **Step 7: Confirm on mode switch with existing data.** When editing a ministry whose `membership_mode` changes and it already has `teams.length > 0` (teams→direct) or `members.length > 0` (direct→teams), show the existing `ConfirmDeleteDialog` pattern warning that the current members/teams will no longer be shown before saving.

- [ ] **Step 8: Verify build + manual smoke**

Run: `cd admin-ui && npm run lint && npm run build`
Expected: compiles with no type errors (all `Atmosphere*` symbols gone).

Run `npm run dev`, open `/ministerios`: create a ministry with two leaders + description, toggle modes, add a team with its own leader pair, add people. Confirm everything renders.

- [ ] **Step 9: Verify no stale references**

Run: `cd admin-ui && grep -rn -i "atmosphere" app components lib`
Expected: no matches.

- [ ] **Step 10: Commit + record pointer**

```bash
cd admin-ui && git add -A && git commit -m "feat(ministries): dual leaders, membership mode, description in management UI" && git push
cd .. && git add admin-ui && git commit -m "chore: update admin-ui submodule — ministries management"
```

---

## Phase 3 — Life-groups co-leader adoption

> Backend column already added in Task 1.5. This phase exposes it through the life-groups API + admin UI using the same `<LeaderPairPicker>`.

### Task 3.1: Backend — life-groups co_leader in DTO/service

**Files:**
- Modify: `src/life-groups/dto/*.ts` (create/update DTO), `src/life-groups/life-groups.service.ts`, life-groups controller serialization

- [ ] **Step 1: Add `co_leader_id` to the life-group create DTO** (mirror the existing `leader_id` field):

```typescript
  @Expose({ name: 'co_leader_id' }) @IsOptional() @IsInt() coLeaderId?: number;
```

- [ ] **Step 2: In `life-groups.service.ts`**, wherever `leader` is set from `leaderId`, set `coLeader` from `coLeaderId` the same way (`coLeaderId ? { id: coLeaderId } : null`), and add `'coLeader'` to the `relations` arrays used by the find/findOne calls.

- [ ] **Step 3: Build + lint**

Run: `cd backend && npm run build && npm run lint`
Expected: success.

- [ ] **Step 4: Commit + pointer**

```bash
cd backend && git add -A && git commit -m "feat(life-groups): expose co_leader" && git push
cd .. && git add backend && git commit -m "chore: update backend submodule — life-groups co_leader"
```

### Task 3.2: Admin-UI — life-groups co-leader picker

**Files:**
- Modify: life-groups types (`lib/api/types/*life-group*`), the life-groups form component, life-groups endpoints if payload typed

- [ ] **Step 1: Add `co_leader` to the LifeGroup type and `co_leader_id` to the create/update request type**, mirroring `leader`/`leader_id`.

- [ ] **Step 2: Replace the single leader select in the life-group form with `<LeaderPairPicker>`**, wiring `leader_id`/`co_leader_id` into the form state and submit payload, and prefilling `co_leader?.id ?? null` on edit.

- [ ] **Step 3: Render the pair** wherever the life-group leader is displayed: `{lg.leader?.name ?? "—"}{lg.co_leader ? ` & ${lg.co_leader.name}` : ""}`.

- [ ] **Step 4: Lint + build + smoke**

Run: `cd admin-ui && npm run lint && npm run build`
Expected: success. Manually create/edit a life group with two leaders.

- [ ] **Step 5: Commit + pointer**

```bash
cd admin-ui && git add -A && git commit -m "feat(life-groups): co-leader via LeaderPairPicker" && git push
cd .. && git add admin-ui && git commit -m "chore: update admin-ui submodule — life-groups co-leader"
```

---

## Phase 4 — Mobile (member-facing ministry view)

> Read-only enrichment. The mobile `Ministry` model comes from the church-data endpoint, decoupled from the admin CRUD. Add the leader pair to the model + detail screen. Run from `kmp-mobile/`.

### Task 4.1: Extend shared `Ministry` model

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Church.kt`

- [ ] **Step 1: Add leader fields to the `Ministry` data class** (keep them nullable for backward compatibility with the current church payload):

```kotlin
@Serializable
data class Ministry(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val leader: String? = null,
    @SerialName("co_leader") val coLeader: String? = null,
)
```

- [ ] **Step 2: Build shared module**

Run: `cd kmp-mobile && ./gradlew :shared:assembleSharedXCFramework` (or `:shared:build`)
Expected: compiles.

### Task 4.2: Show the leader pair in `MinistryDetailScreen`

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/ministries/MinistryDetailScreen.kt`

- [ ] **Step 1: Render the leader pair** below the description, using design-system tokens only (`PazColors.*`, no hardcoded hex), e.g. a row showing `ministry.leader` and, when `ministry.coLeader != null`, `"${leader} & ${coLeader}"`. Follow the existing screen's text-style + spacing conventions.

- [ ] **Step 2: Build + lint**

Run: `cd kmp-mobile && ./gradlew :android:assembleDebug ktlintCheck`
Expected: success.

- [ ] **Step 3: Commit + pointer**

```bash
cd kmp-mobile && git add -A && git commit -m "feat(ministries): show leader pair on ministry detail" && git push
cd .. && git add kmp-mobile && git commit -m "chore: update kmp-mobile submodule — ministry leader pair"
```

> If/when the backend church-data endpoint is extended to populate `leader`/`co_leader` for ministries, no further mobile change is needed. Wiring that source is out of scope for this plan (tracked separately).

---

## Phase 5 — Postman collection

**Files:**
- Modify: the atmosphere requests in `postman-files/` collection

- [ ] **Step 1: Rename the atmosphere folder/requests to "Ministries"** and update URLs: `/api/atmosphere/ministries` → `/api/ministries`, `/api/atmosphere/teams` → `/api/ministries/teams/all` (GET) and `/api/ministries/teams` (POST/PUT/DELETE), member routes `/api/ministries/:id/members/:userId` and `/api/ministries/teams/:id/members/:userId`.

- [ ] **Step 2: Update the create/update ministry request bodies** to include `description`, `membership_mode`, `leader_id`, `co_leader_id`; team bodies to include `co_leader_id`.

- [ ] **Step 3: Commit + pointer**

```bash
cd postman-files && git add -A && git commit -m "docs: rename atmosphere collection to ministries" && git push
cd .. && git add postman-files && git commit -m "chore: update postman-files submodule — ministries"
```

---

## Final verification

- [ ] Backend: `cd backend && npm run build && npm run lint && npm run test && grep -rn -i atmosphere src` (no matches).
- [ ] Admin-UI: `cd admin-ui && npm run lint && npm run build && grep -rn -i atmosphere app components lib` (no matches).
- [ ] End-to-end smoke: create a teams-mode ministry with two leaders + teams + people; create a direct-mode ministry with people; create a life group with two leaders; open the ministry detail on mobile and confirm the leader pair renders.
- [ ] Confirm `down()` migration reverts cleanly: `npm run migration:revert` then `npm run migration:run` again.
