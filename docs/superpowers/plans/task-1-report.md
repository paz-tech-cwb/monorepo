# Task 1 Report: AuditLog Entity + Migration

## Status: DONE

## Commit Hash
`2f71b4f` — feat(auth): add AuditLog entity and migration for audit_logs table

## Summary
Successfully implemented the AuditLog entity and PostgreSQL migration for the audit_logs table. All files created and configuration updated as specified. TypeScript build passes without errors.

## What Was Done

### 1. Created AuditLog Entity
- **File:** `backend/src/auth/entities/audit-log.entity.ts`
- Entity defines the audit logging schema with fields:
  - `id`: Primary key (SERIAL)
  - `userId`: Nullable user ID foreign key reference
  - `email`: Login email (255 chars)
  - `provider`: OAuth provider (50 chars)
  - `action`: Enum of 'LOGIN_SUCCESS', 'LOGIN_FAILED_ROLE', 'LOGIN_FAILED_AUTH'
  - `reason`: Optional failure reason (text)
  - `timestamp`: Auto-populated current timestamp
  - `ipAddress`: Optional IP address (45 chars for IPv6)
- Exported `AuditAction` type for use in services

### 2. Created Migration File
- **File:** `backend/database/migrations/1750200000000-CreateAuditLogsTable.ts`
- Creates `audit_logs_action_enum` PostgreSQL ENUM type
- Creates `audit_logs` table with proper column definitions and constraints
- Adds four indexes for performance:
  - `IDX_audit_logs_email` — for login lookups by email
  - `IDX_audit_logs_timestamp` — for time-range queries
  - `IDX_audit_logs_action` — for action filtering
  - `IDX_audit_logs_email_timestamp` — for composite queries (email + time)
- Includes down() for rollback

### 3. Registered Entity in ORM Config
- **File:** `backend/src/configs/orm.config.ts`
- Added import: `import { AuditLog } from '../auth/entities/audit-log.entity';`
- Added `AuditLog` to entities array

### 4. Registered Entity in DataSource
- **File:** `backend/src/configs/data.source.ts`
- Added import: `import { AuditLog } from '../auth/entities/audit-log.entity';`
- Added `AuditLog` to entities array in AppDataSource

## Verification
- TypeScript build passes: `npm run build` executed with no errors
- Entity follows camelCase property naming with snake_case database column names per project conventions
- All four files committed in single commit with message matching specification

## Notes for Task 2 & 3
- `AuditLog` entity ready for `AuditLogger` service injection (Task 2)
- `AuditAction` type exported for use in `auth.service.ts` (Task 3)
- Migration can be run with `npm run migration:run` when ready (not executed per requirements)

---

# Task — Mobile Forms Guest Bug Fixes

## Status: DONE

## Commit
`efe077b` — fix(guests): stale createdUserId return, date entity type, expose names

## Fixes Applied

### Fix 1 — Stale `createdUserId` in create() return value
- **File:** `backend/src/form-guests/form-guests.service.ts`
- After `em.update(FormGuest, entity.id, { createdUserId })`, added `entity.createdUserId = createdUserId` so the returned entity is accurate without a DB re-fetch.

### Fix 2 — Wrong entity type for `date` column
- **File:** `backend/src/form-guests/entities/form-guest.entity.ts`
- Changed `date: Date | null` → `date: string | null` to match what TypeORM returns for PostgreSQL `date` columns.
- **Cascading fix in service:** Changed `date: dto.date ? new Date(dto.date) : null` → `date: dto.date ?? null` to keep the string value intact.

### Fix 3 — User can be created without password (verification)
- **File:** `backend/src/users/entities/user.entity.ts`
- The `User` entity has no `password` or `passwordHash` column — it uses OAuth-only auth via `UserAccount`. The `em.create(User, {...})` call in the guest service is safe as-is. No fix required.

### Fix 4 — `@Expose({ name: ... })` consistency
- **File:** `backend/src/form-guests/dto/create-form-guest.dto.ts`
- Changed `@Expose() email` → `@Expose({ name: 'email' })` and `@Expose() date` → `@Expose({ name: 'date' })`.

## Build Result
`npm run build` — zero TypeScript errors.
