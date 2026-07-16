# Atmosfera Teams + Service Report Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the Atmosfera ministry structure (ministry → teams → leaders with new roles), replace the generic service-reports form with the ATM-specific Relatório do Culto, add admin management pages for atmosphere teams, and surface the new form in KMP mobile.

**Architecture:** Two new DB tables (`atmosphere_ministries`, `atmosphere_teams`) + two new role seeds (`atmosphere_ministry_leader`, `atmosphere_team_leader`). The existing `service_reports` table is dropped and recreated with the ATM schema. Admin UI gets a new `/atmosfera` management section. KMP mobile gets the new form fields.

**Tech Stack:** NestJS 11 / TypeORM / PostgreSQL 16 · Next.js 15 / React Hook Form + Zod / shadcn-ui · Kotlin Multiplatform + Kotlinx Serialization · Swift / SwiftUI

---

## File Map

### Backend
| File | Change |
|------|--------|
| `database/migrations/1780900000007-AtmosferaAndServiceReportRedesign.ts` | Drop + recreate `service_reports`; create `atmosphere_ministries`, `atmosphere_teams`; seed new roles |
| `src/atmosphere/entities/atmosphere-ministry.entity.ts` | New entity |
| `src/atmosphere/entities/atmosphere-team.entity.ts` | New entity |
| `src/atmosphere/dto/create-atmosphere-ministry.dto.ts` | New DTO |
| `src/atmosphere/dto/update-atmosphere-ministry.dto.ts` | New DTO |
| `src/atmosphere/dto/create-atmosphere-team.dto.ts` | New DTO |
| `src/atmosphere/dto/update-atmosphere-team.dto.ts` | New DTO |
| `src/atmosphere/atmosphere.service.ts` | CRUD for ministries + teams |
| `src/atmosphere/atmosphere.controller.ts` | REST endpoints |
| `src/atmosphere/atmosphere.module.ts` | Module |
| `src/service-reports/entities/service-report.entity.ts` | Replace all columns with ATM schema |
| `src/service-reports/dto/create-service-report.dto.ts` | Replace all fields |
| `src/service-reports/dto/update-service-report.dto.ts` | Replace |
| `src/service-reports/service-reports.service.ts` | Update `create()` to map new fields |
| `src/configs/orm.config.ts` | Register `AtmosphereMinistry`, `AtmosphereTeam` |
| `src/app.module.ts` | Import `AtmosphereModule` |

### Admin UI
| File | Change |
|------|--------|
| `app/(dashboard)/atmosfera/page.tsx` | New page (server component) |
| `app/(dashboard)/atmosfera/atmosfera-management.tsx` | New client component: ministry + teams CRUD |
| `app/(dashboard)/formularios/service-reports/new/service-reports-form.tsx` | Replace all fields with ATM schema |
| `lib/api/types/atmosphere.ts` | New types: `AtmosphereMinistry`, `AtmosphereTeam` |
| `lib/api/endpoints/atmosphere.ts` | New API wrappers |
| `lib/hooks/use-atmosphere.ts` | TanStack Query hooks |
| `components/sidebar.tsx` | Add "Atmosfera" entry |

### KMP Mobile
| File | Change |
|------|--------|
| `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt` | Replace `ServiceReportForm` fields |
| `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt` | Replace `service_report` field defs |

### Additional Backend (Form Schema Updates)
| File | Change |
|------|--------|
| `database/migrations/1780900000008-AtmosphereMemberRosters.ts` | M2M join tables for ministry/team members |
| `src/atmosphere/entities/atmosphere-ministry.entity.ts` | Add `members` M2M |
| `src/atmosphere/entities/atmosphere-team.entity.ts` | Add `members` M2M |
| `src/atmosphere/atmosphere.service.ts` | Add add/remove member methods |
| `src/atmosphere/atmosphere.controller.ts` | Add member endpoints |
| `database/migrations/1780900000009-UpdateFormGuestsSchema.ts` | Remove email, optional phone, free-text how_met_church, add filled_by |
| `src/form-guests/entities/form-guest.entity.ts` | Update columns |
| `src/form-guests/dto/create-form-guest.dto.ts` | Update fields |
| `database/migrations/1780900000010-UpdateMemberRegistrations.ts` | Remove email/leader_id, add discipulador_name |
| `database/migrations/1780900000011-UpdateConversions.ts` | Replace email/birth_date/address with age, split address, new fields |
| `database/migrations/1780900000012-UpdateLifeGroupReports.ts` | Add new required fields; activity types → text[] |
| `database/migrations/1780900000013-ReplaceSupervisorReports.ts` | Replace old fields with life_groups_count/supervised/observations |
| `database/migrations/1780900000014-UpdateMultiplications.ts` | Free-text area/sector, optional legally_married, new/old LG sections |

### Additional Admin UI (Ministry Roster)
| File | Change |
|------|--------|
| `lib/api/types/atmosphere.ts` | Add `members` arrays to types |
| `lib/api/endpoints/atmosphere.ts` | Add add/remove member API calls |
| `lib/hooks/use-atmosphere.ts` | Add add/remove member mutations |
| `app/(dashboard)/atmosfera/atmosfera-management.tsx` | Add Pessoas tab with roster + user search |
| `ios/PazChurch/Features/Formularios/FormDetailView.swift` | Replace `.serviceReport` field defs + submission |

---

## Task 1: Backend — Migration

**Files:**
- Create: `backend/database/migrations/1780900000007-AtmosferaAndServiceReportRedesign.ts`

- [ ] **Step 1: Create the migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AtmosferaAndServiceReportRedesign1780900000007
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Atmosphere ministries
    await queryRunner.query(`
      CREATE TABLE "atmosphere_ministries" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(180) NOT NULL,
        "leader_id" int,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Atmosphere teams
    await queryRunner.query(`
      CREATE TABLE "atmosphere_teams" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(180) NOT NULL,
        "ministry_id" int NOT NULL REFERENCES "atmosphere_ministries"("id") ON DELETE CASCADE,
        "leader_id" int,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Seed new roles
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "slug") VALUES
        ('Líder do Ministério Atmosfera', 'atmosphere_ministry_leader'),
        ('Líder de Equipe Atmosfera', 'atmosphere_team_leader')
      ON CONFLICT ("slug") DO NOTHING
    `);

    // Drop old service_reports and recreate with ATM schema
    await queryRunner.query(`DROP TABLE IF EXISTS "service_reports" CASCADE`);
    await queryRunner.query(`
      CREATE TABLE "service_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        "date" date NOT NULL,
        "report_type" varchar(30) NOT NULL,
        "period" varchar(20) NOT NULL,
        "atmosphere_team_id" int REFERENCES "atmosphere_teams"("id") ON DELETE SET NULL,
        "atmosphere_team_other" varchar(180),
        "atmosphere_responsible" varchar(180) NOT NULL,
        "tadel_adults" int NOT NULL DEFAULT 0,
        "tadel_kids" int NOT NULL DEFAULT 0,
        "vehicles_cars" int NOT NULL DEFAULT 0,
        "vehicles_motos" int NOT NULL DEFAULT 0,
        "vehicles_bikes" int NOT NULL DEFAULT 0,
        "vehicles_others" varchar(255),
        "volunteers_atmosfera" int NOT NULL DEFAULT 0,
        "volunteers_louvor" int NOT NULL DEFAULT 0,
        "volunteers_midia" int NOT NULL DEFAULT 0,
        "volunteers_danca" int NOT NULL DEFAULT 0,
        "notes" text,
        "submitted_by_id" int NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "service_reports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "atmosphere_teams" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "atmosphere_ministries" CASCADE`);
    await queryRunner.query(`DELETE FROM "roles" WHERE slug IN ('atmosphere_ministry_leader','atmosphere_team_leader')`);
  }
}
```

- [ ] **Step 2: Run the migration**

```bash
cd backend
npm run migration:run
```

Expected: all 5 queries succeed with no errors.

- [ ] **Step 3: Commit**

```bash
cd backend
git add database/migrations/1780900000007-AtmosferaAndServiceReportRedesign.ts
git commit -m "feat: atmosphere tables + roles + service_report ATM schema migration"
```

---

## Task 2: Backend — Atmosphere entities + DTOs

**Files:**
- Create: `backend/src/atmosphere/entities/atmosphere-ministry.entity.ts`
- Create: `backend/src/atmosphere/entities/atmosphere-team.entity.ts`
- Create: `backend/src/atmosphere/dto/create-atmosphere-ministry.dto.ts`
- Create: `backend/src/atmosphere/dto/update-atmosphere-ministry.dto.ts`
- Create: `backend/src/atmosphere/dto/create-atmosphere-team.dto.ts`
- Create: `backend/src/atmosphere/dto/update-atmosphere-team.dto.ts`

- [ ] **Step 1: Create AtmosphereMinistry entity**

```typescript
// src/atmosphere/entities/atmosphere-ministry.entity.ts
import {
  Column, CreateDateColumn, Entity, ManyToOne,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AtmosphereTeam } from './atmosphere-team.entity';

@Entity('atmosphere_ministries')
export class AtmosphereMinistry {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 180 }) name: string;
  @ManyToOne(() => User, { nullable: true }) leader: User | null;
  @OneToMany(() => AtmosphereTeam, (t) => t.ministry) teams: AtmosphereTeam[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
```

- [ ] **Step 2: Create AtmosphereTeam entity**

```typescript
// src/atmosphere/entities/atmosphere-team.entity.ts
import {
  Column, CreateDateColumn, Entity, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AtmosphereMinistry } from './atmosphere-ministry.entity';

@Entity('atmosphere_teams')
export class AtmosphereTeam {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 180 }) name: string;
  @ManyToOne(() => AtmosphereMinistry, (m) => m.teams, { nullable: false })
  ministry: AtmosphereMinistry;
  @Column({ name: 'ministry_id' }) ministryId: number;
  @ManyToOne(() => User, { nullable: true }) leader: User | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
```

- [ ] **Step 3: Create ministry DTOs**

```typescript
// src/atmosphere/dto/create-atmosphere-ministry.dto.ts
import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAtmosphereMinistryDto {
  @Expose() @IsString() name: string;
  @Expose({ name: 'leader_id' }) @IsOptional() @IsInt() leaderId?: number;
}
```

```typescript
// src/atmosphere/dto/update-atmosphere-ministry.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAtmosphereMinistryDto } from './create-atmosphere-ministry.dto';
export class UpdateAtmosphereMinistryDto extends PartialType(CreateAtmosphereMinistryDto) {}
```

- [ ] **Step 4: Create team DTOs**

```typescript
// src/atmosphere/dto/create-atmosphere-team.dto.ts
import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAtmosphereTeamDto {
  @Expose() @IsString() name: string;
  @Expose({ name: 'ministry_id' }) @IsInt() ministryId: number;
  @Expose({ name: 'leader_id' }) @IsOptional() @IsInt() leaderId?: number;
}
```

```typescript
// src/atmosphere/dto/update-atmosphere-team.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAtmosphereTeamDto } from './create-atmosphere-team.dto';
export class UpdateAtmosphereTeamDto extends PartialType(CreateAtmosphereTeamDto) {}
```

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/atmosphere/
git commit -m "feat: AtmosphereMinistry + AtmosphereTeam entities and DTOs"
```

---

## Task 3: Backend — Atmosphere service + controller + module

**Files:**
- Create: `backend/src/atmosphere/atmosphere.service.ts`
- Create: `backend/src/atmosphere/atmosphere.controller.ts`
- Create: `backend/src/atmosphere/atmosphere.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/configs/orm.config.ts`

- [ ] **Step 1: Create service**

```typescript
// src/atmosphere/atmosphere.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AtmosphereMinistry } from './entities/atmosphere-ministry.entity';
import { AtmosphereTeam } from './entities/atmosphere-team.entity';
import { CreateAtmosphereMinistryDto } from './dto/create-atmosphere-ministry.dto';
import { UpdateAtmosphereMinistryDto } from './dto/update-atmosphere-ministry.dto';
import { CreateAtmosphereTeamDto } from './dto/create-atmosphere-team.dto';
import { UpdateAtmosphereTeamDto } from './dto/update-atmosphere-team.dto';

@Injectable()
export class AtmosphereService {
  constructor(
    @InjectRepository(AtmosphereMinistry) private readonly ministryRepo: Repository<AtmosphereMinistry>,
    @InjectRepository(AtmosphereTeam) private readonly teamRepo: Repository<AtmosphereTeam>,
  ) {}

  findAllMinistries() {
    return this.ministryRepo.find({ relations: ['leader', 'teams', 'teams.leader'], order: { name: 'ASC' } });
  }

  async createMinistry(dto: CreateAtmosphereMinistryDto) {
    return this.ministryRepo.save(this.ministryRepo.create({
      name: dto.name,
      leader: dto.leaderId ? { id: dto.leaderId } as any : null,
    }));
  }

  async updateMinistry(id: number, dto: UpdateAtmosphereMinistryDto) {
    const m = await this.ministryRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException();
    if (dto.name !== undefined) m.name = dto.name;
    if (dto.leaderId !== undefined) m.leader = dto.leaderId ? { id: dto.leaderId } as any : null;
    return this.ministryRepo.save(m);
  }

  async deleteMinistry(id: number) {
    await this.ministryRepo.delete(id);
  }

  findAllTeams(ministryId?: number) {
    const where = ministryId ? { ministryId } : {};
    return this.teamRepo.find({ where, relations: ['leader', 'ministry'], order: { name: 'ASC' } });
  }

  async createTeam(dto: CreateAtmosphereTeamDto) {
    return this.teamRepo.save(this.teamRepo.create({
      name: dto.name,
      ministry: { id: dto.ministryId } as any,
      ministryId: dto.ministryId,
      leader: dto.leaderId ? { id: dto.leaderId } as any : null,
    }));
  }

  async updateTeam(id: number, dto: UpdateAtmosphereTeamDto) {
    const t = await this.teamRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException();
    if (dto.name !== undefined) t.name = dto.name;
    if (dto.ministryId !== undefined) t.ministryId = dto.ministryId;
    if (dto.leaderId !== undefined) t.leader = dto.leaderId ? { id: dto.leaderId } as any : null;
    return this.teamRepo.save(t);
  }

  async deleteTeam(id: number) {
    await this.teamRepo.delete(id);
  }
}
```

- [ ] **Step 2: Create controller**

```typescript
// src/atmosphere/atmosphere.controller.ts
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AtmosphereService } from './atmosphere.service';
import { CreateAtmosphereMinistryDto } from './dto/create-atmosphere-ministry.dto';
import { UpdateAtmosphereMinistryDto } from './dto/update-atmosphere-ministry.dto';
import { CreateAtmosphereTeamDto } from './dto/create-atmosphere-team.dto';
import { UpdateAtmosphereTeamDto } from './dto/update-atmosphere-team.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('atmosphere')
export class AtmosphereController {
  constructor(private readonly svc: AtmosphereService) {}

  @Get('ministries') findAllMinistries() { return this.svc.findAllMinistries(); }
  @Post('ministries') createMinistry(@Body() dto: CreateAtmosphereMinistryDto) { return this.svc.createMinistry(dto); }
  @Put('ministries/:id') updateMinistry(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAtmosphereMinistryDto) { return this.svc.updateMinistry(id, dto); }
  @Delete('ministries/:id') @HttpCode(HttpStatus.NO_CONTENT) deleteMinistry(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteMinistry(id); }

  @Get('teams') findAllTeams(@Query('ministry_id', new ParseIntPipe({ optional: true })) ministryId?: number) { return this.svc.findAllTeams(ministryId); }
  @Post('teams') createTeam(@Body() dto: CreateAtmosphereTeamDto) { return this.svc.createTeam(dto); }
  @Put('teams/:id') updateTeam(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAtmosphereTeamDto) { return this.svc.updateTeam(id, dto); }
  @Delete('teams/:id') @HttpCode(HttpStatus.NO_CONTENT) deleteTeam(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteTeam(id); }
}
```

- [ ] **Step 3: Create module**

```typescript
// src/atmosphere/atmosphere.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AtmosphereMinistry } from './entities/atmosphere-ministry.entity';
import { AtmosphereTeam } from './entities/atmosphere-team.entity';
import { AtmosphereService } from './atmosphere.service';
import { AtmosphereController } from './atmosphere.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AtmosphereMinistry, AtmosphereTeam])],
  controllers: [AtmosphereController],
  providers: [AtmosphereService],
  exports: [AtmosphereService],
})
export class AtmosphereModule {}
```

- [ ] **Step 4: Register entities in orm.config.ts**

Add these two imports at the top (after existing imports):
```typescript
import { AtmosphereMinistry } from '../atmosphere/entities/atmosphere-ministry.entity';
import { AtmosphereTeam } from '../atmosphere/entities/atmosphere-team.entity';
```

Add to the `entities` array (after `FormGuest`):
```typescript
AtmosphereMinistry,
AtmosphereTeam,
```

- [ ] **Step 5: Import module in app.module.ts**

Add import:
```typescript
import { AtmosphereModule } from './atmosphere/atmosphere.module';
```

Add `AtmosphereModule` to the `imports` array (after `FormGuestsModule`).

- [ ] **Step 6: Verify the backend builds**

```bash
cd backend
npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
cd backend
git add src/atmosphere/ src/configs/orm.config.ts src/app.module.ts
git commit -m "feat: atmosphere module — ministries and teams CRUD"
```

---

## Task 4: Backend — Update ServiceReport entity + DTO

**Files:**
- Modify: `backend/src/service-reports/entities/service-report.entity.ts`
- Modify: `backend/src/service-reports/dto/create-service-report.dto.ts`
- Modify: `backend/src/service-reports/dto/update-service-report.dto.ts`
- Modify: `backend/src/service-reports/service-reports.service.ts`

- [ ] **Step 1: Replace entity**

```typescript
// src/service-reports/entities/service-report.entity.ts
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('service_reports')
export class ServiceReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ name: 'report_type', type: 'varchar', length: 30 }) reportType: string;
  @Column({ type: 'varchar', length: 20 }) period: string;
  @Column({ name: 'atmosphere_team_id', type: 'int', nullable: true }) atmosphereTeamId: number | null;
  @Column({ name: 'atmosphere_team_other', type: 'varchar', length: 180, nullable: true }) atmosphereTeamOther: string | null;
  @Column({ name: 'atmosphere_responsible', type: 'varchar', length: 180 }) atmosphereResponsible: string;
  @Column({ name: 'tadel_adults', type: 'int', default: 0 }) tadelAdults: number;
  @Column({ name: 'tadel_kids', type: 'int', default: 0 }) tadelKids: number;
  @Column({ name: 'vehicles_cars', type: 'int', default: 0 }) vehiclesCars: number;
  @Column({ name: 'vehicles_motos', type: 'int', default: 0 }) vehiclesMotos: number;
  @Column({ name: 'vehicles_bikes', type: 'int', default: 0 }) vehiclesBikes: number;
  @Column({ name: 'vehicles_others', type: 'varchar', length: 255, nullable: true }) vehiclesOthers: string | null;
  @Column({ name: 'volunteers_atmosfera', type: 'int', default: 0 }) volunteersAtmosfera: number;
  @Column({ name: 'volunteers_louvor', type: 'int', default: 0 }) volunteersLouvor: number;
  @Column({ name: 'volunteers_midia', type: 'int', default: 0 }) volunteersMiddia: number;
  @Column({ name: 'volunteers_danca', type: 'int', default: 0 }) volunteersDanca: number;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
```

- [ ] **Step 2: Replace create DTO**

```typescript
// src/service-reports/dto/create-service-report.dto.ts
import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceReportDto {
  @Expose() @IsString() date: string;
  @Expose({ name: 'report_type' }) @IsString() reportType: string;
  @Expose() @IsString() period: string;
  @Expose({ name: 'atmosphere_team_id' }) @IsOptional() @IsInt() atmosphereTeamId?: number;
  @Expose({ name: 'atmosphere_team_other' }) @IsOptional() @IsString() atmosphereTeamOther?: string;
  @Expose({ name: 'atmosphere_responsible' }) @IsString() atmosphereResponsible: string;
  @Expose({ name: 'tadel_adults' }) @IsInt() @Min(0) tadelAdults: number;
  @Expose({ name: 'tadel_kids' }) @IsOptional() @IsInt() @Min(0) tadelKids?: number;
  @Expose({ name: 'vehicles_cars' }) @IsInt() @Min(0) vehiclesCars: number;
  @Expose({ name: 'vehicles_motos' }) @IsOptional() @IsInt() @Min(0) vehiclesMotos?: number;
  @Expose({ name: 'vehicles_bikes' }) @IsOptional() @IsInt() @Min(0) vehiclesBikes?: number;
  @Expose({ name: 'vehicles_others' }) @IsOptional() @IsString() vehiclesOthers?: string;
  @Expose({ name: 'volunteers_atmosfera' }) @IsOptional() @IsInt() @Min(0) volunteersAtmosfera?: number;
  @Expose({ name: 'volunteers_louvor' }) @IsOptional() @IsInt() @Min(0) volunteersLouvor?: number;
  @Expose({ name: 'volunteers_midia' }) @IsOptional() @IsInt() @Min(0) volunteersMiddia?: number;
  @Expose({ name: 'volunteers_danca' }) @IsOptional() @IsInt() @Min(0) volunteersDanca?: number;
  @Expose() @IsOptional() @IsString() notes?: string;
}
```

- [ ] **Step 3: Replace update DTO**

```typescript
// src/service-reports/dto/update-service-report.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceReportDto } from './create-service-report.dto';
export class UpdateServiceReportDto extends PartialType(CreateServiceReportDto) {}
```

- [ ] **Step 4: Update service create() method**

In `service-reports.service.ts`, replace the `this.repo.create({...})` call inside `create()` with:

```typescript
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
})
```

- [ ] **Step 5: Build and verify**

```bash
cd backend
npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/service-reports/
git commit -m "feat: replace ServiceReport schema with ATM Relatório do Culto fields"
```

---

## Task 5: Admin UI — Types, endpoints, hooks for Atmosphere

**Files:**
- Create: `admin-ui/lib/api/types/atmosphere.ts`
- Create: `admin-ui/lib/api/endpoints/atmosphere.ts`
- Create: `admin-ui/lib/hooks/use-atmosphere.ts`

- [ ] **Step 1: Create types**

```typescript
// lib/api/types/atmosphere.ts
export interface AtmosphereTeam {
  id: number
  name: string
  ministry_id: number
  leader: { id: number; name: string } | null
  created_at: string
  updated_at: string
}

export interface AtmosphereMinistry {
  id: number
  name: string
  leader: { id: number; name: string } | null
  teams: AtmosphereTeam[]
  created_at: string
  updated_at: string
}

export interface CreateAtmosphereMinistryRequest {
  name: string
  leader_id?: number
}

export interface CreateAtmosphereTeamRequest {
  name: string
  ministry_id: number
  leader_id?: number
}
```

Add to `lib/api/types/index.ts`:
```typescript
export * from './atmosphere'
```

- [ ] **Step 2: Create endpoints**

```typescript
// lib/api/endpoints/atmosphere.ts
import { api } from "@/lib/api/client"
import type {
  AtmosphereMinistry, AtmosphereTeam,
  CreateAtmosphereMinistryRequest, CreateAtmosphereTeamRequest,
} from "@/lib/api/types"

export const atmosphereApi = {
  getMinistries: () => api.get<AtmosphereMinistry[]>("/atmosphere/ministries"),
  createMinistry: (data: CreateAtmosphereMinistryRequest) =>
    api.post<AtmosphereMinistry>("/atmosphere/ministries", data),
  updateMinistry: (id: number, data: Partial<CreateAtmosphereMinistryRequest>) =>
    api.put<AtmosphereMinistry>(`/atmosphere/ministries/${id}`, data),
  deleteMinistry: (id: number) => api.delete(`/atmosphere/ministries/${id}`),

  getTeams: (ministry_id?: number) =>
    api.get<AtmosphereTeam[]>("/atmosphere/teams", ministry_id ? { params: { ministry_id } } : undefined),
  createTeam: (data: CreateAtmosphereTeamRequest) =>
    api.post<AtmosphereTeam>("/atmosphere/teams", data),
  updateTeam: (id: number, data: Partial<CreateAtmosphereTeamRequest>) =>
    api.put<AtmosphereTeam>(`/atmosphere/teams/${id}`, data),
  deleteTeam: (id: number) => api.delete(`/atmosphere/teams/${id}`),
}
```

- [ ] **Step 3: Create hooks**

```typescript
// lib/hooks/use-atmosphere.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { atmosphereApi } from "@/lib/api/endpoints/atmosphere"
import type { CreateAtmosphereMinistryRequest, CreateAtmosphereTeamRequest } from "@/lib/api/types"

export function useAtmosphereMinistries() {
  return useQuery({ queryKey: ["atmosphere-ministries"], queryFn: () => atmosphereApi.getMinistries() })
}

export function useAtmosphereTeams(ministryId?: number) {
  return useQuery({
    queryKey: ["atmosphere-teams", ministryId],
    queryFn: () => atmosphereApi.getTeams(ministryId),
  })
}

export function useCreateAtmosphereMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAtmosphereMinistryRequest) => atmosphereApi.createMinistry(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useUpdateAtmosphereMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateAtmosphereMinistryRequest>) =>
      atmosphereApi.updateMinistry(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useDeleteAtmosphereMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => atmosphereApi.deleteMinistry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useCreateAtmosphereTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAtmosphereTeamRequest) => atmosphereApi.createTeam(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}

export function useUpdateAtmosphereTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateAtmosphereTeamRequest>) =>
      atmosphereApi.updateTeam(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}

export function useDeleteAtmosphereTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => atmosphereApi.deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}
```

- [ ] **Step 4: Lint check**

```bash
cd admin-ui
npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd admin-ui
git add lib/api/types/atmosphere.ts lib/api/types/index.ts lib/api/endpoints/atmosphere.ts lib/hooks/use-atmosphere.ts
git commit -m "feat: atmosphere API types, endpoints, and hooks"
```

---

## Task 6: Admin UI — Atmosfera management page

**Files:**
- Create: `admin-ui/app/(dashboard)/atmosfera/page.tsx`
- Create: `admin-ui/app/(dashboard)/atmosfera/atmosfera-management.tsx`
- Modify: `admin-ui/components/sidebar.tsx`

- [ ] **Step 1: Create server page**

```typescript
// app/(dashboard)/atmosfera/page.tsx
import { AtmosferaManagement } from "./atmosfera-management"
export default function AtmosferaPage() {
  return <AtmosferaManagement />
}
```

- [ ] **Step 2: Create the management component**

```tsx
// app/(dashboard)/atmosfera/atmosfera-management.tsx
"use client"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import {
  useAtmosphereMinistries,
  useCreateAtmosphereMinistry, useUpdateAtmosphereMinistry, useDeleteAtmosphereMinistry,
  useCreateAtmosphereTeam, useUpdateAtmosphereTeam, useDeleteAtmosphereTeam,
} from "@/lib/hooks/use-atmosphere"
import type { AtmosphereMinistry, AtmosphereTeam } from "@/lib/api/types"

export function AtmosferaManagement() {
  const { data: ministries = [], isLoading } = useAtmosphereMinistries()
  const createMinistry = useCreateAtmosphereMinistry()
  const updateMinistry = useUpdateAtmosphereMinistry()
  const deleteMinistry = useDeleteAtmosphereMinistry()
  const createTeam = useCreateAtmosphereTeam()
  const updateTeam = useUpdateAtmosphereTeam()
  const deleteTeam = useDeleteAtmosphereTeam()

  const [ministryDialog, setMinistryDialog] = useState<"add" | AtmosphereMinistry | null>(null)
  const [teamDialog, setTeamDialog] = useState<"add" | AtmosphereTeam | null>(null)
  const [teamMinistryId, setTeamMinistryId] = useState<number | null>(null)
  const [deletingMinistryId, setDeletingMinistryId] = useState<number | null>(null)
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null)
  const [expandedMinistries, setExpandedMinistries] = useState<Set<number>>(new Set())
  const [ministryForm, setMinistryForm] = useState({ name: "" })
  const [teamForm, setTeamForm] = useState({ name: "" })

  const toggleExpand = (id: number) => {
    setExpandedMinistries((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSaveMinistry = async () => {
    if (!ministryForm.name.trim()) return toast.error("Nome é obrigatório")
    if (ministryDialog === "add") {
      await createMinistry.mutateAsync({ name: ministryForm.name })
      toast.success("Ministério criado")
    } else if (ministryDialog) {
      await updateMinistry.mutateAsync({ id: (ministryDialog as AtmosphereMinistry).id, name: ministryForm.name })
      toast.success("Ministério atualizado")
    }
    setMinistryDialog(null)
    setMinistryForm({ name: "" })
  }

  const handleSaveTeam = async () => {
    if (!teamForm.name.trim()) return toast.error("Nome é obrigatório")
    if (teamDialog === "add" && teamMinistryId) {
      await createTeam.mutateAsync({ name: teamForm.name, ministry_id: teamMinistryId })
      toast.success("Equipe criada")
    } else if (teamDialog && teamDialog !== "add") {
      await updateTeam.mutateAsync({ id: (teamDialog as AtmosphereTeam).id, name: teamForm.name })
      toast.success("Equipe atualizada")
    }
    setTeamDialog(null)
    setTeamForm({ name: "" })
  }

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Atmosfera</h1>
          <p className="text-muted-foreground">Ministérios e equipes de atmosfera</p>
        </div>
        <Dialog open={ministryDialog === "add"} onOpenChange={(o) => { setMinistryDialog(o ? "add" : null); setMinistryForm({ name: "" }) }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Ministério</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Ministério</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={ministryForm.name} onChange={(e) => setMinistryForm({ name: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={handleSaveMinistry} disabled={createMinistry.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {ministries.map((ministry) => (
        <Card key={ministry.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-2 font-semibold text-left" onClick={() => toggleExpand(ministry.id)}>
                {expandedMinistries.has(ministry.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {ministry.name}
              </button>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setTeamMinistryId(ministry.id); setTeamDialog("add"); setTeamForm({ name: "" }) }}>
                  <Plus className="w-3 h-3 mr-1" />Equipe
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => { setMinistryDialog(ministry); setMinistryForm({ name: ministry.name }) }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMinistryId(ministry.id)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          {expandedMinistries.has(ministry.id) && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Líder</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ministry.teams ?? []).map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>{team.name}</TableCell>
                      <TableCell>{team.leader?.name ?? "—"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => { setTeamDialog(team); setTeamForm({ name: team.name }) }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingTeamId(team.id)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(ministry.teams ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma equipe</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Edit ministry dialog */}
      <Dialog open={ministryDialog !== null && ministryDialog !== "add"} onOpenChange={(o) => { if (!o) setMinistryDialog(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Ministério</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={ministryForm.name} onChange={(e) => setMinistryForm({ name: e.target.value })} />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveMinistry} disabled={updateMinistry.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/edit team dialog */}
      <Dialog open={teamDialog !== null} onOpenChange={(o) => { if (!o) setTeamDialog(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{teamDialog === "add" ? "Nova Equipe" : "Editar Equipe"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={teamForm.name} onChange={(e) => setTeamForm({ name: e.target.value })} />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTeam} disabled={createTeam.isPending || updateTeam.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deletingMinistryId !== null}
        onConfirm={async () => { await deleteMinistry.mutateAsync(deletingMinistryId!); setDeletingMinistryId(null); toast.success("Ministério excluído") }}
        onCancel={() => setDeletingMinistryId(null)}
        description="Isso também excluirá todas as equipes deste ministério."
      />
      <ConfirmDeleteDialog
        open={deletingTeamId !== null}
        onConfirm={async () => { await deleteTeam.mutateAsync(deletingTeamId!); setDeletingTeamId(null); toast.success("Equipe excluída") }}
        onCancel={() => setDeletingTeamId(null)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Add "Atmosfera" to sidebar**

Open `components/sidebar.tsx`. Find the navigation items array (look for entries like `{ href: "/areas", label: "Áreas" }` or similar). Add:

```typescript
{ href: "/atmosfera", label: "Atmosfera", icon: Waves }
```

Import `Waves` from `lucide-react` at the top of the file if not already imported.

- [ ] **Step 4: Lint check**

```bash
cd admin-ui
npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd admin-ui
git add app/\(dashboard\)/atmosfera/ components/sidebar.tsx
git commit -m "feat: atmosfera management page — ministries and teams CRUD"
```

---

## Task 7: Admin UI — Replace service-reports form

**Files:**
- Modify: `admin-ui/app/(dashboard)/formularios/service-reports/new/service-reports-form.tsx`

- [ ] **Step 1: Replace the entire form file**

```tsx
"use client"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCreateFormSubmission } from "@/lib/hooks/use-form-submissions"
import { useAtmosphereTeams } from "@/lib/hooks/use-atmosphere"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  date: z.string().min(1, "Obrigatório"),
  report_type: z.enum(["tadel", "culto_celebracao", "evento"]),
  period: z.enum(["manha", "tarde_noite"]),
  atmosphere_team_id: z.number().int().positive().optional().nullable(),
  atmosphere_team_other: z.string().optional(),
  atmosphere_responsible: z.string().min(1, "Obrigatório"),
  tadel_adults: z.coerce.number().int().min(0),
  tadel_kids: z.coerce.number().int().min(0).optional(),
  vehicles_cars: z.coerce.number().int().min(0),
  vehicles_motos: z.coerce.number().int().min(0).optional(),
  vehicles_bikes: z.coerce.number().int().min(0).optional(),
  vehicles_others: z.string().optional(),
  volunteers_atmosfera: z.coerce.number().int().min(0).optional(),
  volunteers_louvor: z.coerce.number().int().min(0).optional(),
  volunteers_midia: z.coerce.number().int().min(0).optional(),
  volunteers_danca: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ServiceReportsForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const create = useCreateFormSubmission<unknown, FormValues>("service-reports")
  const { data: teams = [] } = useAtmosphereTeams()
  const router = useRouter()

  const selectedTeamId = watch("atmosphere_team_id")

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync(data)
        toast.success("Relatório enviado")
        router.push("/formularios/service-reports")
      })}
      className="space-y-6"
    >
      {/* Identificação */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Identificação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Data *</Label>
            <Controller control={control} name="date" render={({ field }) => <DateInput value={field.value} onChange={field.onChange} />} />
            {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
          </div>
          <div>
            <Label>Tipo de relatório *</Label>
            <Controller control={control} name="report_type" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="mt-2 space-y-1">
                <div className="flex items-center gap-2"><RadioGroupItem value="tadel" id="rt-tadel" /><Label htmlFor="rt-tadel">Tadel</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="culto_celebracao" id="rt-culto" /><Label htmlFor="rt-culto">Culto de celebração</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="evento" id="rt-evento" /><Label htmlFor="rt-evento">Evento</Label></div>
              </RadioGroup>
            )} />
          </div>
          <div>
            <Label>Período *</Label>
            <Controller control={control} name="period" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="mt-2 space-y-1">
                <div className="flex items-center gap-2"><RadioGroupItem value="manha" id="p-manha" /><Label htmlFor="p-manha">Manhã</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="tarde_noite" id="p-tarde" /><Label htmlFor="p-tarde">Tarde/Noite</Label></div>
              </RadioGroup>
            )} />
          </div>
          <div>
            <Label>Equipe Atmosfera *</Label>
            <Controller control={control} name="atmosphere_team_id" render={({ field }) => (
              <Select
                value={field.value?.toString() ?? ""}
                onValueChange={(v) => { if (v === "other") { setValue("atmosphere_team_id", null) } else { setValue("atmosphere_team_id", parseInt(v)); setValue("atmosphere_team_other", "") } }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          {selectedTeamId === null && (
            <div>
              <Label>Outra equipe</Label>
              <Input {...register("atmosphere_team_other")} />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>Responsável pela equipe no dia *</Label>
            <Input {...register("atmosphere_responsible")} />
            {errors.atmosphere_responsible && <p className="text-sm text-destructive mt-1">{errors.atmosphere_responsible.message}</p>}
          </div>
        </div>
      </div>

      {/* Pessoas Tadel */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contabilização de pessoas Tadel</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Adultos *</Label><Input {...register("tadel_adults")} type="number" min={0} /></div>
          <div><Label>Crianças</Label><Input {...register("tadel_kids")} type="number" min={0} defaultValue={0} /></div>
        </div>
      </div>

      {/* Veículos */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contabilização de veículos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Carros *</Label><Input {...register("vehicles_cars")} type="number" min={0} /></div>
          <div><Label>Motos</Label><Input {...register("vehicles_motos")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Bicicletas</Label><Input {...register("vehicles_bikes")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Outros</Label><Input {...register("vehicles_others")} placeholder="Ex: Ônibus - 2" /></div>
        </div>
      </div>

      {/* Voluntários */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contabilização de voluntários</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Atmosfera</Label><Input {...register("volunteers_atmosfera")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Louvor</Label><Input {...register("volunteers_louvor")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Mídia</Label><Input {...register("volunteers_midia")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Dança</Label><Input {...register("volunteers_danca")} type="number" min={0} defaultValue={0} /></div>
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações gerais</h3>
        <div>
          <Label>Observação</Label>
          <Textarea {...register("notes")} placeholder="Ocorrências durante o serviço, materiais faltando, danos..." />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>Salvar</Button>
    </form>
  )
}
```

- [ ] **Step 2: Lint check**

```bash
cd admin-ui
npm run lint 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
cd admin-ui
git add app/\(dashboard\)/formularios/service-reports/new/service-reports-form.tsx
git commit -m "feat: replace service-reports form with ATM Relatório do Culto fields"
```

---

## Task 8: KMP Mobile — Update shared ServiceReportForm model

**Files:**
- Modify: `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt`

- [ ] **Step 1: Replace ServiceReportForm data class**

Find the existing `ServiceReportForm` (or `ServiceReport` — check with `grep -n "ServiceReport\|service_report" Form.kt`) and replace it:

```kotlin
@Serializable
data class ServiceReportForm(
    val date: String,
    @SerialName("report_type") val reportType: String,
    val period: String,
    @SerialName("atmosphere_team_id") val atmosphereTeamId: Int? = null,
    @SerialName("atmosphere_team_other") val atmosphereTeamOther: String? = null,
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
)
```

- [ ] **Step 2: Verify shared compiles**

```bash
cd kmp-mobile
./gradlew :shared:compileKotlinIosArm64 --quiet 2>&1 | tail -5
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
cd kmp-mobile
git add shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt
git commit -m "feat: update ServiceReportForm to ATM schema"
```

---

## Task 9: KMP Android — Update service report form fields

**Files:**
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModel.kt`

- [ ] **Step 1: Replace service_report field defs in UiState**

Find `FormType.service_report ->` block and replace its field list:

```kotlin
FormType.service_report ->
    listOf(
        FormFieldDef("date", "Data", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("report_type", "Tipo de relatório", "Tadel / Culto / Evento", required = true),
        FormFieldDef("period", "Período", "Manhã / Tarde-Noite", required = true),
        FormFieldDef("atmosphere_team_id", "Equipe Atmosfera", "", fieldType = FormFieldType.INTEGER),
        FormFieldDef("atmosphere_responsible", "Responsável no dia", "", required = true),
        FormFieldDef("tadel_adults", "Adultos (Tadel)", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("tadel_kids", "Crianças (Tadel)", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("vehicles_cars", "Carros", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("vehicles_motos", "Motos", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("vehicles_bikes", "Bicicletas", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("vehicles_others", "Outros veículos", "Ex: Ônibus - 2"),
        FormFieldDef("volunteers_atmosfera", "Voluntários Atmosfera", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("volunteers_louvor", "Voluntários Louvor", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("volunteers_midia", "Voluntários Mídia", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("volunteers_danca", "Voluntários Dança", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("notes", "Observação", "", fieldType = FormFieldType.MULTILINE),
    )
```

- [ ] **Step 2: Update submission mapping in ViewModel**

Find the `FormType.service_report` submission block in `FormDetailViewModel.kt` and update to map all new fields:

```kotlin
FormType.service_report -> {
    val f = fields
    formsRepository.submitServiceReport(ServiceReportForm(
        date = f["date"] ?: "",
        reportType = f["report_type"] ?: "",
        period = f["period"] ?: "",
        atmosphereTeamId = f["atmosphere_team_id"]?.toIntOrNull(),
        atmosphereResponsible = f["atmosphere_responsible"] ?: "",
        tadelAdults = f["tadel_adults"]?.toIntOrNull() ?: 0,
        tadelKids = f["tadel_kids"]?.toIntOrNull() ?: 0,
        vehiclesCars = f["vehicles_cars"]?.toIntOrNull() ?: 0,
        vehiclesMotos = f["vehicles_motos"]?.toIntOrNull() ?: 0,
        vehiclesBikes = f["vehicles_bikes"]?.toIntOrNull() ?: 0,
        vehiclesOthers = f["vehicles_others"],
        volunteersAtmosfera = f["volunteers_atmosfera"]?.toIntOrNull() ?: 0,
        volunteersLouvor = f["volunteers_louvor"]?.toIntOrNull() ?: 0,
        volunteersMiddia = f["volunteers_midia"]?.toIntOrNull() ?: 0,
        volunteersDanca = f["volunteers_danca"]?.toIntOrNull() ?: 0,
        notes = f["notes"],
    ))
}
```

- [ ] **Step 3: Build Android**

```bash
cd kmp-mobile
./gradlew :android:assembleDebug --quiet 2>&1 | tail -5
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**

```bash
cd kmp-mobile
git add android/src/main/kotlin/br/church/paz/android/ui/features/formularios/
git commit -m "feat: update Android service report form fields to ATM schema"
```

---

## Task 10: KMP iOS — Update service report form

**Files:**
- Modify: `kmp-mobile/ios/PazChurch/Features/Formularios/FormDetailView.swift`

- [ ] **Step 1: Replace `.serviceReport` field defs**

Find `case .serviceReport:` array and replace:

```swift
case .serviceReport:
    [
        FormFieldDef("date", "Data", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
        FormFieldDef("report_type", "Tipo de relatório", placeholder: "tadel / culto_celebracao / evento", required: true),
        FormFieldDef("period", "Período", placeholder: "manha / tarde_noite", required: true),
        FormFieldDef("atmosphere_team_id", "Equipe Atmosfera (ID)", placeholder: ""),
        FormFieldDef("atmosphere_responsible", "Responsável no dia", placeholder: "", required: true),
        FormFieldDef("tadel_adults", "Adultos (Tadel)", placeholder: "0", required: true, fieldType: .integer),
        FormFieldDef("tadel_kids", "Crianças (Tadel)", placeholder: "0", fieldType: .integer),
        FormFieldDef("vehicles_cars", "Carros", placeholder: "0", required: true, fieldType: .integer),
        FormFieldDef("vehicles_motos", "Motos", placeholder: "0", fieldType: .integer),
        FormFieldDef("vehicles_bikes", "Bicicletas", placeholder: "0", fieldType: .integer),
        FormFieldDef("vehicles_others", "Outros veículos", placeholder: "Ex: Ônibus - 2"),
        FormFieldDef("volunteers_atmosfera", "Voluntários Atmosfera", placeholder: "0", fieldType: .integer),
        FormFieldDef("volunteers_louvor", "Voluntários Louvor", placeholder: "0", fieldType: .integer),
        FormFieldDef("volunteers_midia", "Voluntários Mídia", placeholder: "0", fieldType: .integer),
        FormFieldDef("volunteers_danca", "Voluntários Dança", placeholder: "0", fieldType: .integer),
        FormFieldDef("notes", "Observação", placeholder: "Ocorrências, materiais...", fieldType: .multiline),
    ]
```

- [ ] **Step 2: Update `.serviceReport` submission block**

Find `case .serviceReport:` submission and replace:

```swift
case .serviceReport:
    _ = try await formsRepository.submitServiceReport(form: ServiceReportForm(
        date: req("date"),
        reportType: req("report_type"),
        period: req("period"),
        atmosphereTeamId: fields["atmosphere_team_id"].flatMap { Int($0) },
        atmosphereResponsible: req("atmosphere_responsible"),
        tadelAdults: Int(fields["tadel_adults"] ?? "0") ?? 0,
        tadelKids: Int(fields["tadel_kids"] ?? "0") ?? 0,
        vehiclesCars: Int(fields["vehicles_cars"] ?? "0") ?? 0,
        vehiclesMotos: Int(fields["vehicles_motos"] ?? "0") ?? 0,
        vehiclesBikes: Int(fields["vehicles_bikes"] ?? "0") ?? 0,
        vehiclesOthers: fields["vehicles_others"],
        volunteersAtmosfera: Int(fields["volunteers_atmosfera"] ?? "0") ?? 0,
        volunteersLouvor: Int(fields["volunteers_louvor"] ?? "0") ?? 0,
        volunteersMiddia: Int(fields["volunteers_midia"] ?? "0") ?? 0,
        volunteersDanca: Int(fields["volunteers_danca"] ?? "0") ?? 0,
        notes: fields["notes"]
    ))
```

- [ ] **Step 3: Build iOS**

```bash
cd kmp-mobile
./gradlew assembleSharedXCFramework --quiet 2>&1 | tail -5
xcodebuild -workspace ios/PazChurch.xcworkspace -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | grep -E "error:|BUILD"
```

Expected: BUILD SUCCEEDED

- [ ] **Step 4: Commit**

```bash
cd kmp-mobile
git add ios/PazChurch/Features/Formularios/FormDetailView.swift
git commit -m "feat: update iOS service report form to ATM schema"
```

---

## Task 11: Root repo — update submodule pointers

- [ ] **Step 1: Update root repo**

```bash
cd /Users/jonathalima/Developer/church
git add backend kmp-mobile admin-ui
git commit -m "chore: update submodule pointers — atmosfera teams + ATM service report"
```

---

## Task 12: Backend — Ministry members (roster)

Adds a join table so users can be assigned to an `atmosphere_ministry` or `atmosphere_team` as a member (not just as the single "leader" FK). This powers the admin "people" roster view.

**Files:**
- Create: `backend/database/migrations/1780900000008-AtmosphereMemberRosters.ts`
- Create: `backend/src/atmosphere/entities/atmosphere-ministry-member.entity.ts`
- Create: `backend/src/atmosphere/entities/atmosphere-team-member.entity.ts`
- Modify: `backend/src/atmosphere/entities/atmosphere-ministry.entity.ts` — add `members` relation
- Modify: `backend/src/atmosphere/entities/atmosphere-team.entity.ts` — add `members` relation
- Modify: `backend/src/atmosphere/dto/create-atmosphere-ministry.dto.ts` — add `member_ids`
- Modify: `backend/src/atmosphere/dto/create-atmosphere-team.dto.ts` — add `member_ids`
- Modify: `backend/src/atmosphere/atmosphere.service.ts` — sync members on create/update
- Modify: `backend/src/atmosphere/atmosphere.controller.ts` — add member add/remove endpoints
- Modify: `backend/src/configs/orm.config.ts` — register two new entities

- [ ] **Step 1: Create migration**

```typescript
// database/migrations/1780900000008-AtmosphereMemberRosters.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AtmosphereMemberRosters1780900000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "atmosphere_ministry_members" (
        "ministry_id" int NOT NULL REFERENCES "atmosphere_ministries"("id") ON DELETE CASCADE,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        PRIMARY KEY ("ministry_id", "user_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "atmosphere_team_members" (
        "team_id" int NOT NULL REFERENCES "atmosphere_teams"("id") ON DELETE CASCADE,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        PRIMARY KEY ("team_id", "user_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "atmosphere_team_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "atmosphere_ministry_members"`);
  }
}
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npm run migration:run
```

Expected: 2 CREATE TABLE statements succeed.

- [ ] **Step 3: Add `members` M2M relation to ministry entity**

In `src/atmosphere/entities/atmosphere-ministry.entity.ts`, add after `teams`:

```typescript
import { JoinTable, ManyToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@ManyToMany(() => User)
@JoinTable({
  name: 'atmosphere_ministry_members',
  joinColumn: { name: 'ministry_id' },
  inverseJoinColumn: { name: 'user_id' },
})
members: User[];
```

- [ ] **Step 4: Add `members` M2M relation to team entity**

In `src/atmosphere/entities/atmosphere-team.entity.ts`, add after `leader`:

```typescript
import { JoinTable, ManyToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@ManyToMany(() => User)
@JoinTable({
  name: 'atmosphere_team_members',
  joinColumn: { name: 'team_id' },
  inverseJoinColumn: { name: 'user_id' },
})
members: User[];
```

- [ ] **Step 5: Add member management endpoints to controller**

In `src/atmosphere/atmosphere.controller.ts`, add four new endpoints:

```typescript
@Post('ministries/:id/members/:userId')
addMinistryMember(
  @Param('id', ParseIntPipe) id: number,
  @Param('userId', ParseIntPipe) userId: number,
) { return this.svc.addMinistryMember(id, userId); }

@Delete('ministries/:id/members/:userId')
@HttpCode(HttpStatus.NO_CONTENT)
removeMinistryMember(
  @Param('id', ParseIntPipe) id: number,
  @Param('userId', ParseIntPipe) userId: number,
) { return this.svc.removeMinistryMember(id, userId); }

@Post('teams/:id/members/:userId')
addTeamMember(
  @Param('id', ParseIntPipe) id: number,
  @Param('userId', ParseIntPipe) userId: number,
) { return this.svc.addTeamMember(id, userId); }

@Delete('teams/:id/members/:userId')
@HttpCode(HttpStatus.NO_CONTENT)
removeTeamMember(
  @Param('id', ParseIntPipe) id: number,
  @Param('userId', ParseIntPipe) userId: number,
) { return this.svc.removeTeamMember(id, userId); }
```

- [ ] **Step 6: Add member management methods to service**

In `src/atmosphere/atmosphere.service.ts`, add:

```typescript
async addMinistryMember(ministryId: number, userId: number) {
  const m = await this.ministryRepo.findOne({ where: { id: ministryId }, relations: ['members'] });
  if (!m) throw new NotFoundException();
  const alreadyMember = m.members.some((u) => u.id === userId);
  if (!alreadyMember) {
    m.members = [...m.members, { id: userId } as any];
    await this.ministryRepo.save(m);
  }
  return this.ministryRepo.findOne({ where: { id: ministryId }, relations: ['leader', 'members', 'teams', 'teams.leader'] });
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
  const alreadyMember = t.members.some((u) => u.id === userId);
  if (!alreadyMember) {
    t.members = [...t.members, { id: userId } as any];
    await this.teamRepo.save(t);
  }
  return this.teamRepo.findOne({ where: { id: teamId }, relations: ['leader', 'members', 'ministry'] });
}

async removeTeamMember(teamId: number, userId: number) {
  const t = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['members'] });
  if (!t) throw new NotFoundException();
  t.members = t.members.filter((u) => u.id !== userId);
  await this.teamRepo.save(t);
}
```

Also update `findAllMinistries()` to include members:

```typescript
findAllMinistries() {
  return this.ministryRepo.find({
    relations: ['leader', 'members', 'teams', 'teams.leader', 'teams.members'],
    order: { name: 'ASC' },
  });
}
```

- [ ] **Step 7: Register new entities in orm.config.ts**

> These are join-table entities managed by the M2M decorators — TypeORM will handle them automatically via the `@JoinTable` annotation. No separate entity files needed; skip this step.

- [ ] **Step 8: Build and verify**

```bash
cd backend
npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
cd backend
git add database/migrations/1780900000008-AtmosphereMemberRosters.ts src/atmosphere/
git commit -m "feat: atmosphere ministry/team member roster — add/remove endpoints"
```

---

## Task 13: Admin UI — Ministry members roster UI

Extend the Atmosfera management page to show and manage the people roster for each ministry and each team.

**Files:**
- Modify: `admin-ui/lib/api/types/atmosphere.ts` — add `members` arrays
- Modify: `admin-ui/lib/hooks/use-atmosphere.ts` — add add/remove member mutations
- Modify: `admin-ui/app/(dashboard)/atmosfera/atmosfera-management.tsx` — roster UI

- [ ] **Step 1: Update types**

In `lib/api/types/atmosphere.ts`, add `members` to both interfaces:

```typescript
export interface AtmosphereMember {
  id: number
  name: string
  role?: string
}

export interface AtmosphereTeam {
  id: number
  name: string
  ministry_id: number
  leader: { id: number; name: string } | null
  members: AtmosphereMember[]
  created_at: string
  updated_at: string
}

export interface AtmosphereMinistry {
  id: number
  name: string
  leader: { id: number; name: string } | null
  members: AtmosphereMember[]
  teams: AtmosphereTeam[]
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Add member endpoints**

In `lib/api/endpoints/atmosphere.ts`, add:

```typescript
addMinistryMember: (ministryId: number, userId: number) =>
  api.post(`/atmosphere/ministries/${ministryId}/members/${userId}`, {}),
removeMinistryMember: (ministryId: number, userId: number) =>
  api.delete(`/atmosphere/ministries/${ministryId}/members/${userId}`),
addTeamMember: (teamId: number, userId: number) =>
  api.post(`/atmosphere/teams/${teamId}/members/${userId}`, {}),
removeTeamMember: (teamId: number, userId: number) =>
  api.delete(`/atmosphere/teams/${teamId}/members/${userId}`),
```

- [ ] **Step 3: Add member hooks**

In `lib/hooks/use-atmosphere.ts`, add:

```typescript
export function useAddMinistryMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ministryId, userId }: { ministryId: number; userId: number }) =>
      atmosphereApi.addMinistryMember(ministryId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useRemoveMinistryMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ministryId, userId }: { ministryId: number; userId: number }) =>
      atmosphereApi.removeMinistryMember(ministryId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useAddTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      atmosphereApi.addTeamMember(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}

export function useRemoveTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      atmosphereApi.removeTeamMember(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}
```

- [ ] **Step 4: Add a "Pessoas" tab to the management page**

In `app/(dashboard)/atmosfera/atmosfera-management.tsx`, add a tab switcher at the top of each expanded ministry card — **Equipes** and **Pessoas**. The Pessoas tab shows:

- Ministry-level members list with "Remover" per row
- A user search input (using the existing `useUsers()` hook) that adds a member via `useAddMinistryMember`

Add the following imports:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUsers } from "@/lib/hooks/use-users"
import { useAddMinistryMember, useRemoveMinistryMember } from "@/lib/hooks/use-atmosphere"
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
```

Replace the `expandedMinistries.has(ministry.id) && (` block content with a tabbed version:

```tsx
{expandedMinistries.has(ministry.id) && (
  <CardContent>
    <Tabs defaultValue="equipes">
      <TabsList className="mb-4">
        <TabsTrigger value="equipes">Equipes</TabsTrigger>
        <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
      </TabsList>

      <TabsContent value="equipes">
        {/* existing teams Table goes here unchanged */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipe</TableHead>
              <TableHead>Líder</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(ministry.teams ?? []).map((team) => (
              <TableRow key={team.id}>
                <TableCell>{team.name}</TableCell>
                <TableCell>{team.leader?.name ?? "—"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => { setTeamDialog(team); setTeamForm({ name: team.name }) }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeletingTeamId(team.id)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(ministry.teams ?? []).length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma equipe</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="pessoas">
        <MinistryPeopleTab ministry={ministry} />
      </TabsContent>
    </Tabs>
  </CardContent>
)}
```

Add the `MinistryPeopleTab` sub-component inside the same file (below the main component):

```tsx
function MinistryPeopleTab({ ministry }: { ministry: AtmosphereMinistry }) {
  const { data: allUsers = [] } = useUsers()
  const addMember = useAddMinistryMember()
  const removeMember = useRemoveMinistryMember()
  const [search, setSearch] = useState("")

  const memberIds = new Set(ministry.members?.map((m) => m.id) ?? [])
  const candidates = allUsers.filter(
    (u) => !memberIds.has(u.id) && u.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(ministry.members ?? []).map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.name}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeMember.mutate({ ministryId: ministry.id, userId: m.id })}
                >
                  Remover
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(ministry.members ?? []).length === 0 && (
            <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum membro</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <div>
        <Label className="text-sm mb-1 block">Adicionar pessoa</Label>
        <Command className="border rounded-md">
          <CommandInput placeholder="Buscar por nome..." value={search} onValueChange={setSearch} />
          <CommandList className="max-h-40">
            {candidates.slice(0, 10).map((u) => (
              <CommandItem
                key={u.id}
                onSelect={() => {
                  addMember.mutate({ ministryId: ministry.id, userId: u.id })
                  setSearch("")
                }}
              >
                {u.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Lint check**

```bash
cd admin-ui
npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd admin-ui
git add app/\(dashboard\)/atmosfera/ lib/api/types/atmosphere.ts lib/api/endpoints/atmosphere.ts lib/hooks/use-atmosphere.ts
git commit -m "feat: atmosphere people roster — add/remove members from ministry and teams"
```

---

## Task 14: Backend — Update FormGuest entity/DTO (remaining 3.8 changes)

> `via_casa_de_paz` is handled in the separate `2026-06-12-guest-form-casa-de-paz.md` plan. This task covers the remaining 3.8 changes: remove `email`, make `phone` optional, change `how_met_church` to free text (increase length), add `filled_by`.

**Files:**
- Modify: `backend/src/form-guests/entities/form-guest.entity.ts`
- Modify: `backend/src/form-guests/dto/create-form-guest.dto.ts`
- Create: `backend/database/migrations/1780900000009-UpdateFormGuestsSchema.ts`

- [ ] **Step 1: Create migration**

```typescript
// database/migrations/1780900000009-UpdateFormGuestsSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateFormGuestsSchema1780900000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "form_guests" ALTER COLUMN "phone" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "form_guests" ALTER COLUMN "how_met_church" TYPE text`);
    await queryRunner.query(`ALTER TABLE "form_guests" ADD COLUMN IF NOT EXISTS "filled_by" varchar(180)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "form_guests" ADD COLUMN "email" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "form_guests" ALTER COLUMN "phone" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "form_guests" ALTER COLUMN "how_met_church" TYPE varchar(40)`);
    await queryRunner.query(`ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "filled_by"`);
  }
}
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npm run migration:run
```

- [ ] **Step 3: Update entity**

Replace the entity columns with:

```typescript
@Column({ name: 'full_name', type: 'varchar', length: 180 }) fullName: string;
@Column({ type: 'varchar', length: 32, nullable: true }) phone: string | null;
@Column({ type: 'text', nullable: true }) address: string | null;
@Column({ name: 'invited_by', type: 'varchar', length: 180, nullable: true }) invitedBy: string | null;
@Column({ name: 'how_met_church', type: 'text', nullable: true }) howMetChurch: string | null;
@Column({ name: 'filled_by', type: 'varchar', length: 180, nullable: true }) filledBy: string | null;
@Column({ type: 'text', nullable: true }) notes: string | null;
@Column({ name: 'via_casa_de_paz', type: 'boolean', default: false }) viaCasaDePaz: boolean;
```

- [ ] **Step 4: Update DTO**

Replace `create-form-guest.dto.ts` content:

```typescript
import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateFormGuestDto {
  @Expose({ name: 'full_name' }) @IsString() fullName: string;
  @Expose() @IsOptional() @IsString() phone?: string;
  @Expose() @IsOptional() @IsString() address?: string;
  @Expose({ name: 'invited_by' }) @IsOptional() @IsString() invitedBy?: string;
  @Expose({ name: 'how_met_church' }) @IsOptional() @IsString() howMetChurch?: string;
  @Expose({ name: 'filled_by' }) @IsOptional() @IsString() filledBy?: string;
  @Expose() @IsOptional() @IsString() notes?: string;
  @Expose({ name: 'via_casa_de_paz' }) @IsOptional() @IsBoolean() viaCasaDePaz?: boolean;
  @Expose({ name: 'area_id' }) @IsOptional() areaId?: number;
  @Expose({ name: 'sector_id' }) @IsOptional() sectorId?: number;
  @Expose({ name: 'life_group_id' }) @IsOptional() lifeGroupId?: number;
}
```

- [ ] **Step 5: Build and verify**

```bash
cd backend
npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd backend
git add database/migrations/1780900000009-UpdateFormGuestsSchema.ts src/form-guests/
git commit -m "feat: update FormGuest — remove email, optional phone, free-text how_met_church, add filled_by"
```

---

## Task 15: Backend — Update Cadastro do Membro (3.1)

Changes: remove `email`, rename `leader_id` → `discipulador_name` (free text string).

**Files:**
- Create: `backend/database/migrations/1780900000010-UpdateMemberRegistrations.ts`
- Modify: `backend/src/member-registrations/entities/member-registration.entity.ts`
- Modify: `backend/src/member-registrations/dto/create-member-registration.dto.ts`

- [ ] **Step 1: Discover actual entity/module path**

```bash
grep -rn "discipulador\|leader_id\|MemberRegistration\|member_registration" backend/src --include="*.ts" -l
```

Use the returned path for the entity and DTO files in the steps below.

- [ ] **Step 2: Create migration**

```typescript
// database/migrations/1780900000010-UpdateMemberRegistrations.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMemberRegistrations1780900000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "member_registrations" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "member_registrations" DROP COLUMN IF EXISTS "leader_id"`);
    await queryRunner.query(`ALTER TABLE "member_registrations" ADD COLUMN IF NOT EXISTS "discipulador_name" varchar(180)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "member_registrations" ADD COLUMN "email" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "member_registrations" ADD COLUMN "leader_id" int`);
    await queryRunner.query(`ALTER TABLE "member_registrations" DROP COLUMN IF EXISTS "discipulador_name"`);
  }
}
```

- [ ] **Step 3: Run migration**

```bash
cd backend
npm run migration:run
```

- [ ] **Step 4: Update entity**

Remove the `email` and `leaderId`/`leader` columns/relations. Add:

```typescript
@Column({ name: 'discipulador_name', type: 'varchar', length: 180, nullable: true })
discipuladorName: string | null;
```

- [ ] **Step 5: Update DTO**

Remove `email` and `leaderId` fields. Add:

```typescript
@Expose({ name: 'discipulador_name' }) @IsOptional() @IsString() discipuladorName?: string;
```

- [ ] **Step 6: Build and verify**

```bash
cd backend
npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd backend
git add database/migrations/1780900000010-UpdateMemberRegistrations.ts
git commit -m "feat: member registration — remove email/leader_id, add discipulador_name"
```

---

## Task 16: Backend — Update Conversão e Reconciliação (3.2)

The Conversão form fields changed significantly. Old fields (email, birth_date, address as single string) must be replaced with the new schema from section 3.2 of formularios.md.

**Files:**
- Create: `backend/database/migrations/1780900000011-UpdateConversions.ts`
- Modify: conversions entity + DTO (find path with `grep -rn "ConversionForm\|conversions" backend/src --include="*.ts" -l`)

- [ ] **Step 1: Discover actual file paths**

```bash
grep -rn "conversion\|Conversion" backend/src --include="*.entity.ts" -l
```

- [ ] **Step 2: Create migration**

```typescript
// database/migrations/1780900000011-UpdateConversions.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateConversions1780900000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove old fields that no longer exist
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "birth_date"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "address"`);
    // Add new fields
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "age" int`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "street" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "neighborhood" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "city" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "culto_attendance" varchar(30)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "life_group_status" varchar(30)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "life_group_leader_name" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "how_met_church_other" varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN "email" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN "birth_date" date`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN "address" text`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "age"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "street"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "neighborhood"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "city"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "culto_attendance"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "life_group_status"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "life_group_leader_name"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "how_met_church_other"`);
  }
}
```

- [ ] **Step 3: Run migration**

```bash
cd backend
npm run migration:run
```

- [ ] **Step 4: Update entity**

Remove `email`, `birthDate`, `address`. Add:

```typescript
@Column({ type: 'int', nullable: true }) age: number | null;
@Column({ type: 'varchar', length: 255, nullable: true }) street: string | null;
@Column({ type: 'varchar', length: 180, nullable: true }) neighborhood: string | null;
@Column({ type: 'varchar', length: 180, nullable: true }) city: string | null;
@Column({ name: 'culto_attendance', type: 'varchar', length: 30, nullable: true }) cultoAttendance: string | null;
@Column({ name: 'life_group_status', type: 'varchar', length: 30, nullable: true }) lifeGroupStatus: string | null;
@Column({ name: 'life_group_leader_name', type: 'varchar', length: 180, nullable: true }) lifeGroupLeaderName: string | null;
@Column({ name: 'how_met_church_other', type: 'varchar', length: 255, nullable: true }) howMetChurchOther: string | null;
```

- [ ] **Step 5: Update DTO**

Remove `email`, `birthDate`, `address`. Add:

```typescript
@Expose() @IsOptional() @IsInt() @Min(0) age?: number;
@Expose() @IsOptional() @IsString() street?: string;
@Expose() @IsOptional() @IsString() neighborhood?: string;
@Expose() @IsOptional() @IsString() city?: string;
@Expose({ name: 'culto_attendance' }) @IsOptional() @IsString() cultoAttendance?: string;
@Expose({ name: 'life_group_status' }) @IsOptional() @IsString() lifeGroupStatus?: string;
@Expose({ name: 'life_group_leader_name' }) @IsOptional() @IsString() lifeGroupLeaderName?: string;
@Expose({ name: 'how_met_church_other' }) @IsOptional() @IsString() howMetChurchOther?: string;
```

- [ ] **Step 6: Build and verify**

```bash
cd backend
npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd backend
git add database/migrations/1780900000011-UpdateConversions.ts
git commit -m "feat: conversions form — replace email/birth_date/address with age, split address, culto_attendance, life_group fields"
```

---

## Task 17: Backend — Update Life Group Reports (3.3)

New required fields added; `pastoring_activity_type` and `training_activity_type` are now `string[]` (stored as `text[]` in Postgres); `pastoring_activity_objective` removed.

**Files:**
- Create: `backend/database/migrations/1780900000012-UpdateLifeGroupReports.ts`
- Modify: life-group-reports entity + DTO

- [ ] **Step 1: Discover file paths**

```bash
grep -rn "LifeGroupReport\|life_group_report\|meeting_report" backend/src --include="*.entity.ts" -l
```

- [ ] **Step 2: Create migration**

```typescript
// database/migrations/1780900000012-UpdateLifeGroupReports.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLifeGroupReports1780900000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const t = '"life_group_reports"'; // adjust table name if different
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "pastoring_activity_objective"`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "kids_0_to_11" int NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "guests" int NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "mdas" int NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "committed_at_tadel" int NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "committed_at_culto" int NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "leader_attended" text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "disciples_count" int NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "disciples_discipled_this_week" int NOT NULL DEFAULT 0`);
    // Change type to text[] if currently varchar/text
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN "pastoring_activity_type" TYPE text[] USING ARRAY["pastoring_activity_type"]::text[]`);
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN "training_activity_type" TYPE text[] USING ARRAY["training_activity_type"]::text[]`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = '"life_group_reports"';
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "kids_0_to_11"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "guests"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "mdas"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "committed_at_tadel"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "committed_at_culto"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "leader_attended"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "disciples_count"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "disciples_discipled_this_week"`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN "pastoring_activity_objective" text`);
  }
}
```

> **Note:** Before running, verify the actual table name with `\dt` in psql or check the entity decorator.

- [ ] **Step 3: Run migration**

```bash
cd backend
npm run migration:run
```

- [ ] **Step 4: Update entity**

Remove `pastoringActivityObjective`. Change `pastoringActivityType` and `trainingActivityType` columns to `text[]`:

```typescript
@Column({ name: 'pastoring_activity_type', type: 'text', array: true, default: [] })
pastoringActivityType: string[];

@Column({ name: 'training_activity_type', type: 'text', array: true, default: [] })
trainingActivityType: string[];
```

Add new columns:

```typescript
@Column({ name: 'kids_0_to_11', type: 'int', default: 0 }) kids0To11: number;
@Column({ type: 'int', default: 0 }) guests: number;
@Column({ type: 'int', default: 0 }) mdas: number;
@Column({ name: 'committed_at_tadel', type: 'int', default: 0 }) committedAtTadel: number;
@Column({ name: 'committed_at_culto', type: 'int', default: 0 }) committedAtCulto: number;
@Column({ name: 'leader_attended', type: 'text', array: true, default: [] }) leaderAttended: string[];
@Column({ name: 'disciples_count', type: 'int', default: 0 }) disciplesCount: number;
@Column({ name: 'disciples_discipled_this_week', type: 'int', default: 0 }) disciplesDiscipledThisWeek: number;
```

- [ ] **Step 5: Update DTO**

Remove `pastoringActivityObjective`. Update activity type fields to arrays:

```typescript
@Expose({ name: 'pastoring_activity_type' }) @IsArray() @IsString({ each: true }) pastoringActivityType: string[];
@Expose({ name: 'training_activity_type' }) @IsArray() @IsString({ each: true }) trainingActivityType: string[];
```

Add new fields:

```typescript
@Expose({ name: 'kids_0_to_11' }) @IsInt() @Min(0) kids0To11: number;
@Expose() @IsInt() @Min(0) guests: number;
@Expose() @IsInt() @Min(0) mdas: number;
@Expose({ name: 'committed_at_tadel' }) @IsInt() @Min(0) committedAtTadel: number;
@Expose({ name: 'committed_at_culto' }) @IsInt() @Min(0) committedAtCulto: number;
@Expose({ name: 'leader_attended' }) @IsArray() @IsString({ each: true }) leaderAttended: string[];
@Expose({ name: 'disciples_count' }) @IsInt() @Min(0) disciplesCount: number;
@Expose({ name: 'disciples_discipled_this_week' }) @IsInt() @Min(0) disciplesDiscipledThisWeek: number;
```

Add `IsArray` and `Min` to the `class-validator` import.

- [ ] **Step 6: Build and verify**

```bash
cd backend
npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd backend
git add database/migrations/1780900000012-UpdateLifeGroupReports.ts
git commit -m "feat: life group reports — add new required fields, activity types as string arrays"
```

---

## Task 18: Backend — Replace Supervisor de Setor + Área reports (3.4 + 3.5)

Both supervisor report forms were completely replaced. Old fields (meetings_held, trainings_conducted, etc.) are gone; new fields are `life_groups_count`, `life_groups_supervised`, `life_group_observations` (text[]).

**Files:**
- Create: `backend/database/migrations/1780900000013-ReplaceSupervisorReports.ts`
- Modify: sector-supervisor-reports entity + DTO
- Modify: area-supervisor-reports entity + DTO

- [ ] **Step 1: Discover file paths**

```bash
grep -rn "SectorSupervisor\|sector_supervisor\|AreaSupervisor\|area_supervisor" backend/src --include="*.entity.ts" -l
```

- [ ] **Step 2: Create migration**

```typescript
// database/migrations/1780900000013-ReplaceSupervisorReports.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceSupervisorReports1780900000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const t of ['"sector_supervisor_reports"', '"area_supervisor_reports"']) {
      // Drop old fields (adjust names to match actual table if different)
      for (const col of ['meetings_held', 'trainings_conducted', 'pastoral_visits', 'notes_old']) {
        await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "${col}"`).catch(() => {});
      }
      // Add new fields
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "life_groups_count" int NOT NULL DEFAULT 0`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "life_groups_supervised" int NOT NULL DEFAULT 0`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "life_group_observations" text[] NOT NULL DEFAULT '{}'`);
    }
    // Sector-only field
    await queryRunner.query(`ALTER TABLE "sector_supervisor_reports" ADD COLUMN IF NOT EXISTS "sector_multiplication_date" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const t of ['"sector_supervisor_reports"', '"area_supervisor_reports"']) {
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "life_groups_count"`);
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "life_groups_supervised"`);
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "life_group_observations"`);
    }
    await queryRunner.query(`ALTER TABLE "sector_supervisor_reports" DROP COLUMN IF EXISTS "sector_multiplication_date"`);
  }
}
```

> **Important:** The `DROP COLUMN` list in `up()` must match the actual old column names. Run `\d sector_supervisor_reports` in psql first to verify, then adjust the list accordingly.

- [ ] **Step 3: Run migration**

```bash
cd backend
npm run migration:run
```

- [ ] **Step 4: Update sector supervisor entity**

Remove old columns, add:

```typescript
@Column({ name: 'sector_multiplication_date', type: 'date', nullable: true }) sectorMultiplicationDate: string | null;
@Column({ name: 'life_groups_count', type: 'int', default: 0 }) lifeGroupsCount: number;
@Column({ name: 'life_groups_supervised', type: 'int', default: 0 }) lifeGroupsSupervised: number;
@Column({ name: 'life_group_observations', type: 'text', array: true, default: [] }) lifeGroupObservations: string[];
```

- [ ] **Step 5: Update area supervisor entity**

Remove old columns, add (same as sector minus `sectorMultiplicationDate`):

```typescript
@Column({ name: 'life_groups_count', type: 'int', default: 0 }) lifeGroupsCount: number;
@Column({ name: 'life_groups_supervised', type: 'int', default: 0 }) lifeGroupsSupervised: number;
@Column({ name: 'life_group_observations', type: 'text', array: true, default: [] }) lifeGroupObservations: string[];
```

- [ ] **Step 6: Update both DTOs**

Sector DTO:

```typescript
@Expose({ name: 'sector_multiplication_date' }) @IsOptional() @IsString() sectorMultiplicationDate?: string;
@Expose({ name: 'life_groups_count' }) @IsInt() @Min(0) lifeGroupsCount: number;
@Expose({ name: 'life_groups_supervised' }) @IsInt() @Min(0) lifeGroupsSupervised: number;
@Expose({ name: 'life_group_observations' }) @IsOptional() @IsArray() @IsString({ each: true }) lifeGroupObservations?: string[];
```

Area DTO (same minus `sectorMultiplicationDate`):

```typescript
@Expose({ name: 'life_groups_count' }) @IsInt() @Min(0) lifeGroupsCount: number;
@Expose({ name: 'life_groups_supervised' }) @IsInt() @Min(0) lifeGroupsSupervised: number;
@Expose({ name: 'life_group_observations' }) @IsOptional() @IsArray() @IsString({ each: true }) lifeGroupObservations?: string[];
```

- [ ] **Step 7: Build and verify**

```bash
cd backend
npm run build 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
cd backend
git add database/migrations/1780900000013-ReplaceSupervisorReports.ts
git commit -m "feat: supervisor reports — replace old fields with life_groups_count/supervised/observations"
```

---

## Task 19: Backend — Update Multiplicação form (3.6)

Changes: `area` and `sector` are now free text (drop FK columns); `legally_married` becomes optional; new/old LG sections added.

**Files:**
- Create: `backend/database/migrations/1780900000014-UpdateMultiplications.ts`
- Modify: multiplications entity + DTO

- [ ] **Step 1: Discover file paths**

```bash
grep -rn "Multiplication\|multiplication" backend/src --include="*.entity.ts" -l
```

- [ ] **Step 2: Create migration**

```typescript
// database/migrations/1780900000014-UpdateMultiplications.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMultiplications1780900000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const t = '"multiplications"';
    // Replace area_id/sector_id FKs with free text
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "area_id"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "sector_id"`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "area" varchar(255)`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "sector" varchar(255)`);
    // Make legally_married nullable
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN "legally_married" DROP NOT NULL`);
    // New LG fields
    for (const prefix of ['new_lg', 'old_lg']) {
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_name" varchar(255)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_leader" varchar(180)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_host" varchar(180)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_address" text`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_leader_phone" varchar(32)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_meeting_day_time" varchar(100)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_members" text[] DEFAULT '{}'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = '"multiplications"';
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "area"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "sector"`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN "area_id" int`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN "sector_id" int`);
    for (const prefix of ['new_lg', 'old_lg']) {
      for (const col of ['name', 'leader', 'host', 'address', 'leader_phone', 'meeting_day_time', 'members']) {
        await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "${prefix}_${col}"`);
      }
    }
  }
}
```

- [ ] **Step 3: Run migration**

```bash
cd backend
npm run migration:run
```

- [ ] **Step 4: Update entity**

Remove `areaId`/`sectorId` FK columns. Add:

```typescript
@Column({ type: 'varchar', length: 255, nullable: true }) area: string | null;
@Column({ type: 'varchar', length: 255, nullable: true }) sector: string | null;
@Column({ name: 'legally_married', type: 'varchar', length: 30, nullable: true }) legallyMarried: string | null;

// New LG fields
@Column({ name: 'new_lg_name', type: 'varchar', length: 255, nullable: true }) newLgName: string | null;
@Column({ name: 'new_lg_leader', type: 'varchar', length: 180, nullable: true }) newLgLeader: string | null;
@Column({ name: 'new_lg_host', type: 'varchar', length: 180, nullable: true }) newLgHost: string | null;
@Column({ name: 'new_lg_address', type: 'text', nullable: true }) newLgAddress: string | null;
@Column({ name: 'new_lg_leader_phone', type: 'varchar', length: 32, nullable: true }) newLgLeaderPhone: string | null;
@Column({ name: 'new_lg_meeting_day_time', type: 'varchar', length: 100, nullable: true }) newLgMeetingDayTime: string | null;
@Column({ name: 'new_lg_members', type: 'text', array: true, default: [] }) newLgMembers: string[];

@Column({ name: 'old_lg_name', type: 'varchar', length: 255, nullable: true }) oldLgName: string | null;
@Column({ name: 'old_lg_leader', type: 'varchar', length: 180, nullable: true }) oldLgLeader: string | null;
@Column({ name: 'old_lg_host', type: 'varchar', length: 180, nullable: true }) oldLgHost: string | null;
@Column({ name: 'old_lg_address', type: 'text', nullable: true }) oldLgAddress: string | null;
@Column({ name: 'old_lg_leader_phone', type: 'varchar', length: 32, nullable: true }) oldLgLeaderPhone: string | null;
@Column({ name: 'old_lg_meeting_day_time', type: 'varchar', length: 100, nullable: true }) oldLgMeetingDayTime: string | null;
@Column({ name: 'old_lg_members', type: 'text', array: true, default: [] }) oldLgMembers: string[];
```

- [ ] **Step 5: Update DTO**

Remove area/sector FK fields. Add all new fields following the same `@Expose({ name: 'snake_case' })` pattern as the entity above.

- [ ] **Step 6: Build and verify**

```bash
cd backend
npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd backend
git add database/migrations/1780900000014-UpdateMultiplications.ts
git commit -m "feat: multiplication form — free text area/sector, optional legally_married, new/old LG section fields"
```

---

## Task 20: Root repo — final submodule pointer update

- [ ] **Step 1: Update root repo after all backend form tasks**

```bash
cd /Users/jonathalima/Developer/church
git add backend admin-ui kmp-mobile
git commit -m "chore: update submodule pointers — form schema updates (guests, member-reg, conversions, LG reports, supervisor reports, multiplications)"
```
