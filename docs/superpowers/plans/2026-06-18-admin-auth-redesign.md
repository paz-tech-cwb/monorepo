# Admin Auth Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce admin-only access to the admin panel, remove Apple sign-in from the UI, and log all authentication attempts to an `audit_logs` table.

**Architecture:** Backend adds a role check in `socialLogin()` (throws 403 for non-admins) and calls an `AuditLogger` service before and after the check. Frontend removes Apple auth entirely and surfaces 403 errors with a Portuguese user-friendly message.

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL 16, Next.js 15 (App Router), React 19, Firebase Auth, shadcn/ui

## Global Constraints

- Backend TypeScript entity properties: always `camelCase` with `@Column({ name: 'snake_case' })` on the decorator
- Migrations live in `backend/database/migrations/` and use raw SQL via `queryRunner.query()`
- Admin-UI API types: `snake_case` keys that mirror the wire format exactly — no transform layer
- All backend error messages use `HttpException` with explicit `HttpStatus` constants
- Audit logging must never throw — catch and log, but never surface to callers
- Apple token verification stays in the backend (backward compat); only the UI button is removed

---

## File Map

**Backend — create:**
- `backend/src/auth/entities/audit-log.entity.ts` — TypeORM entity for `audit_logs`
- `backend/src/auth/audit.logger.ts` — Injectable service that writes `AuditLog` rows
- `backend/database/migrations/1750200000000-CreateAuditLogsTable.ts` — DB migration

**Backend — modify:**
- `backend/src/auth/auth.module.ts` — add `AuditLog` to `TypeOrmModule.forFeature`, add `AuditLogger` to `providers`
- `backend/src/auth/auth.service.ts` — inject `AuditLogger`, add role check + audit calls in `socialLogin()`
- `backend/src/auth/auth.service.spec.ts` — add tests for role check and audit logging
- `backend/src/configs/orm.config.ts` — register `AuditLog` entity
- `backend/src/configs/data.source.ts` — register `AuditLog` entity

**Admin-UI — modify:**
- `admin-ui/lib/firebase/auth.ts` — remove `appleProvider` + `signInWithApple()`
- `admin-ui/contexts/auth-context.tsx` — remove `loginWithApple`, update `AuthContextValue` interface
- `admin-ui/app/auth/login-form.tsx` — remove Apple button, center Google button, update error handling

---

## Task 1: AuditLog Entity + Migration

**Files:**
- Create: `backend/src/auth/entities/audit-log.entity.ts`
- Create: `backend/database/migrations/1750200000000-CreateAuditLogsTable.ts`

**Interfaces:**
- Produces: `AuditLog` entity class (used by Task 2 and Task 3)

- [ ] **Step 1: Create the AuditLog entity**

Create `backend/src/auth/entities/audit-log.entity.ts`:

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED_ROLE'
  | 'LOGIN_FAILED_AUTH';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @Column({ name: 'email', length: 255 })
  email: string;

  @Column({ name: 'provider', length: 50 })
  provider: string;

  @Column({
    name: 'action',
    type: 'enum',
    enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED_ROLE', 'LOGIN_FAILED_AUTH'],
  })
  action: AuditAction;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @Column({
    name: 'timestamp',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp: Date;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string | null;
}
```

- [ ] **Step 2: Create the migration**

Create `backend/database/migrations/1750200000000-CreateAuditLogsTable.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1750200000000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1750200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "audit_logs_action_enum" AS ENUM (
        'LOGIN_SUCCESS',
        'LOGIN_FAILED_ROLE',
        'LOGIN_FAILED_AUTH'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL NOT NULL,
        "user_id" integer,
        "email" character varying(255) NOT NULL,
        "provider" character varying(50) NOT NULL,
        "action" "audit_logs_action_enum" NOT NULL,
        "reason" text,
        "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ip_address" character varying(45),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_email" ON "audit_logs" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_email_timestamp" ON "audit_logs" ("email", "timestamp")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_email_timestamp"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_timestamp"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_email"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "audit_logs_action_enum"`);
  }
}
```

- [ ] **Step 3: Register AuditLog in orm.config.ts**

Open `backend/src/configs/orm.config.ts`. Add to the `entities` array (after the existing imports, add):

```typescript
import { AuditLog } from '../auth/entities/audit-log.entity';
```

Then add `AuditLog` to the `entities` array in the config object.

- [ ] **Step 4: Register AuditLog in data.source.ts**

Open `backend/src/configs/data.source.ts`. Add:

```typescript
import { AuditLog } from '../auth/entities/audit-log.entity';
```

Then add `AuditLog` to the `entities` array in `AppDataSource`.

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/auth/entities/audit-log.entity.ts database/migrations/1750200000000-CreateAuditLogsTable.ts src/configs/orm.config.ts src/configs/data.source.ts
git commit -m "feat(auth): add AuditLog entity and migration for audit_logs table"
```

---

## Task 2: AuditLogger Service + Module Wiring

**Files:**
- Create: `backend/src/auth/audit.logger.ts`
- Modify: `backend/src/auth/auth.module.ts`

**Interfaces:**
- Consumes: `AuditLog` entity from Task 1
- Produces: `AuditLogger` class with `logAuthAttempt(email, provider, action, reason?, ipAddress?)` method

- [ ] **Step 1: Create AuditLogger**

Create `backend/src/auth/audit.logger.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger(AuditLogger.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async logAuthAttempt(
    email: string,
    provider: string,
    action: AuditAction,
    reason?: string | null,
    ipAddress?: string | null,
  ): Promise<void> {
    try {
      const entry = this.auditLogRepo.create({
        email,
        provider,
        action,
        reason: reason ?? null,
        ipAddress: ipAddress ?? null,
        timestamp: new Date(),
      });
      await this.auditLogRepo.save(entry);
    } catch (error) {
      this.logger.error(
        `Failed to write audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
```

- [ ] **Step 2: Update auth.module.ts**

Replace the contents of `backend/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserAccount } from 'src/users/entities/account.entity';
import { Role } from 'src/roles/entities/role.entity';
import { UserDeviceToken } from 'src/users/entities/user-device-token.entity';
import { AuditLog } from './entities/audit-log.entity';
import { JwtStrategy } from './jwt.strategy';
import { AuditLogger } from './audit.logger';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, UserAccount, Role, UserDeviceToken, AuditLog]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuditLogger],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 3: Verify the module compiles**

```bash
cd backend
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/auth/audit.logger.ts src/auth/auth.module.ts
git commit -m "feat(auth): add AuditLogger service and wire into AuthModule"
```

---

## Task 3: Role Check + Audit Logging in AuthService

**Files:**
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `AuditLogger.logAuthAttempt()` from Task 2, `AuditLog` from Task 1
- Produces: `socialLogin()` throws `HttpException(403)` for non-admin users; writes audit rows for all outcomes

- [ ] **Step 1: Add failing tests for role check and audit logging**

Open `backend/src/auth/auth.service.spec.ts`. The existing `beforeEach` sets up `userRepo`, `userAccountRepo`, and `configServiceMock`. Add `roleRepo` and `auditLogRepo` mocks, add `AuditLogger` mock, and register them in the module. Then add the new test cases.

Replace the full content of `backend/src/auth/auth.service.spec.ts` with:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { User } from 'src/users/entities/user.entity';
import { UserAccount } from 'src/users/entities/account.entity';
import { Role } from 'src/roles/entities/role.entity';
import { UserDeviceToken } from 'src/users/entities/user-device-token.entity';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogger } from './audit.logger';

const ACCESS_SECRET = 'test-access-secret-at-least-32-chars!!';
const REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars!!';
const GOOGLE_CLIENT_ID = 'test-google-client-id';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const adminRole: Partial<Role> = { id: 1, slug: 'admin' };
const memberRole: Partial<Role> = { id: 6, slug: 'member' };

const mockAdminUser: Partial<User> = {
  id: 1,
  name: 'Admin User',
  email: 'admin@example.com',
  picture: null,
  role: adminRole as Role,
};

const mockMemberUser: Partial<User> = {
  id: 2,
  name: 'Member User',
  email: 'member@example.com',
  picture: null,
  role: memberRole as Role,
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Record<string, jest.Mock>;
  let userAccountRepo: Record<string, jest.Mock>;
  let roleRepo: Record<string, jest.Mock>;
  let userDeviceTokenRepo: Record<string, jest.Mock>;
  let auditLogRepo: Record<string, jest.Mock>;
  let auditLoggerMock: { logAuthAttempt: jest.Mock };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    userAccountRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    roleRepo = {
      findOne: jest.fn(),
    };

    userDeviceTokenRepo = {
      delete: jest.fn(),
    };

    auditLogRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    auditLoggerMock = {
      logAuthAttempt: jest.fn().mockResolvedValue(undefined),
    };

    const configServiceMock = {
      getOrThrow: jest.fn((key: string) => {
        const map: Record<string, string> = {
          ACCESS_TOKEN_SECRET: ACCESS_SECRET,
          REFRESH_TOKEN_SECRET: REFRESH_SECRET,
          GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
        };
        if (!map[key]) throw new Error(`Missing config key: ${key}`);
        return map[key];
      }),
      get: jest.fn((key: string, defaultValue: string) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserAccount), useValue: userAccountRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(UserDeviceToken), useValue: userDeviceTokenRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepo },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: AuditLogger, useValue: auditLoggerMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('socialLogin', () => {
    it('should throw HttpException for unsupported provider', async () => {
      await expect(
        service.socialLogin('facebook', 'some-token'),
      ).rejects.toThrow(HttpException);
      await expect(
        service.socialLogin('facebook', 'some-token'),
      ).rejects.toThrow('Unsupported provider');
    });

    it('should issue tokens for admin user with Google token', async () => {
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'google-uid',
        name: 'Admin User',
        email: 'admin@example.com',
        photo: null,
      });

      userRepo.findOne.mockResolvedValue(mockAdminUser);
      userAccountRepo.create.mockReturnValue({});
      userAccountRepo.save.mockResolvedValue({});

      const result = await service.socialLogin('google', 'valid-google-token');

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.user.email).toBe('admin@example.com');
      expect(auditLoggerMock.logAuthAttempt).toHaveBeenCalledWith(
        'admin@example.com',
        'google',
        'LOGIN_SUCCESS',
        null,
        null,
      );
    });

    it('should reject non-admin user with Google token (403)', async () => {
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'google-uid',
        name: 'Member User',
        email: 'member@example.com',
        photo: null,
      });

      userRepo.findOne.mockResolvedValue(mockMemberUser);

      await expect(
        service.socialLogin('google', 'valid-google-token'),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        message: 'Admin access required',
      });

      expect(auditLoggerMock.logAuthAttempt).toHaveBeenCalledWith(
        'member@example.com',
        'google',
        'LOGIN_FAILED_ROLE',
        expect.stringContaining('member'),
        null,
      );
    });

    it('should still accept admin user with Apple token', async () => {
      jest.spyOn(service as any, 'verifyAppleToken').mockResolvedValue({
        username: 'apple-uid',
        name: 'Admin User',
        email: 'admin@example.com',
        photo: null,
      });

      userRepo.findOne.mockResolvedValue(mockAdminUser);
      userAccountRepo.create.mockReturnValue({});
      userAccountRepo.save.mockResolvedValue({});

      const result = await service.socialLogin('apple', 'valid-apple-token');

      expect(result.access_token).toBeDefined();
      expect(auditLoggerMock.logAuthAttempt).toHaveBeenCalledWith(
        'admin@example.com',
        'apple',
        'LOGIN_SUCCESS',
        null,
        null,
      );
    });

    it('should log LOGIN_FAILED_AUTH when token verification fails', async () => {
      jest
        .spyOn(service as any, 'verifyGoogleToken')
        .mockRejectedValue(new UnauthorizedException('Invalid Google token'));

      await expect(
        service.socialLogin('google', 'bad-token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditLoggerMock.logAuthAttempt).toHaveBeenCalledWith(
        'unknown',
        'google',
        'LOGIN_FAILED_AUTH',
        'Invalid Google token',
        null,
      );
    });

    it('should create new user with member role and then reject (403) when not admin', async () => {
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'google-uid',
        name: 'New User',
        email: 'newuser@example.com',
        photo: null,
      });

      userRepo.findOne.mockResolvedValue(null); // user not found
      roleRepo.findOne.mockResolvedValue(memberRole);
      const createdUser = { ...mockMemberUser, email: 'newuser@example.com' };
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);

      await expect(
        service.socialLogin('google', 'valid-google-token'),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });

      expect(auditLoggerMock.logAuthAttempt).toHaveBeenCalledWith(
        'newuser@example.com',
        'google',
        'LOGIN_FAILED_ROLE',
        expect.any(String),
        null,
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
npx jest src/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: Tests fail because `AuthService` doesn't yet inject `AuditLogger` or perform role checks.

- [ ] **Step 3: Update AuthService — inject AuditLogger and add role check**

Replace `backend/src/auth/auth.service.ts` with:

```typescript
import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';
import { JwksClient } from 'jwks-rsa';
import { UserAccount } from 'src/users/entities/account.entity';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { UserDeviceToken } from 'src/users/entities/user-device-token.entity';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogger } from './audit.logger';
import { Repository } from 'typeorm';

const ACCESS_TOKEN_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '90d';
const JWT_ALGORITHM: jwt.Algorithm = 'HS256';

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  private googleOAuth2Client: OAuth2Client;
  private appleJwksClient: JwksClient;

  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private googleClientId: string;
  private googleAudiences: string[];
  private appleBundleId: string;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserAccount)
    private userAccountRepo: Repository<UserAccount>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(UserDeviceToken)
    private userDeviceTokenRepo: Repository<UserDeviceToken>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    private configService: ConfigService,
    private auditLogger: AuditLogger,
  ) {
    this.accessTokenSecret = this.configService.getOrThrow<string>(
      'ACCESS_TOKEN_SECRET',
    );
    this.refreshTokenSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_SECRET',
    );
    this.googleClientId =
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.googleAudiences = [this.googleClientId];
    const androidClientId = this.configService.get<string>(
      'GOOGLE_ANDROID_CLIENT_ID',
    );
    const iosClientId = this.configService.get<string>('GOOGLE_IOS_CLIENT_ID');
    if (androidClientId) this.googleAudiences.push(androidClientId);
    if (iosClientId) this.googleAudiences.push(iosClientId);
    this.appleBundleId = this.configService.get<string>('APPLE_BUNDLE_ID', '');

    this.googleOAuth2Client = new OAuth2Client(this.googleClientId);
    this.appleJwksClient = new JwksClient({
      jwksUri: APPLE_JWKS_URI,
      cache: true,
      cacheMaxAge: 86400000,
    });
  }

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

    if (this.accessTokenSecret.length < 32) {
      this.logger.warn(
        'ACCESS_TOKEN_SECRET is shorter than 32 characters. Use a stronger secret in production.',
      );
    }
    if (this.refreshTokenSecret.length < 32) {
      this.logger.warn(
        'REFRESH_TOKEN_SECRET is shorter than 32 characters. Use a stronger secret in production.',
      );
    }
  }

  async socialLogin(provider: string, idToken: string) {
    let userData: {
      username: string;
      name: string;
      email: string;
      photo: string | null;
    };

    // Verify token — log auth failure if verification throws
    try {
      if (provider === 'google') {
        userData = await this.verifyGoogleToken(idToken);
      } else if (provider === 'apple') {
        userData = await this.verifyAppleToken(idToken);
      } else {
        throw new HttpException('Unsupported provider', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.BAD_REQUEST
      ) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Token verification failed';
      await this.auditLogger.logAuthAttempt(
        'unknown',
        provider,
        'LOGIN_FAILED_AUTH',
        message,
        null,
      );
      throw error;
    }

    userData.email = userData.email.toLowerCase();

    let user = await this.userRepo.findOne({
      where: { email: userData.email },
    });

    if (!user) {
      const memberRole = await this.roleRepo.findOne({
        where: { slug: 'member' },
      });
      if (!memberRole) {
        throw new HttpException(
          'Member role not found in database',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      user = this.userRepo.create({
        name: userData.name,
        email: userData.email,
        picture: userData.photo ?? undefined,
        role: memberRole,
      });
      await this.userRepo.save(user);
    }

    // Role-based access check — admin only
    if (!user.role || user.role.slug !== 'admin') {
      const reason = `User role is '${user.role?.slug ?? 'unknown'}', not 'admin'`;
      await this.auditLogger.logAuthAttempt(
        userData.email,
        provider,
        'LOGIN_FAILED_ROLE',
        reason,
        null,
      );
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    const tokens = await this.issueTokens(user);

    await this.auditLogger.logAuthAttempt(
      userData.email,
      provider,
      'LOGIN_SUCCESS',
      null,
      null,
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role?.slug ?? null,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(user: User) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      this.accessTokenSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN, algorithm: JWT_ALGORITHM },
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      this.refreshTokenSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN, algorithm: JWT_ALGORITHM },
    );

    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const hashedToken = this.hashToken(refreshToken);

    const account = this.userAccountRepo.create({
      refreshToken: hashedToken,
      user,
      expiresAt,
    });
    await this.userAccountRepo.save(account);

    return { accessToken, refreshToken };
  }

  async refreshTokens(oldRefreshToken: string) {
    try {
      jwt.verify(oldRefreshToken, this.refreshTokenSecret, {
        algorithms: [JWT_ALGORITHM],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const hashedToken = this.hashToken(oldRefreshToken);
    const account = await this.userAccountRepo.findOne({
      where: {
        refreshToken: hashedToken,
        isRevoked: false,
      },
      relations: ['user'],
    });

    if (!account || !account.user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (account.expiresAt && account.expiresAt < new Date()) {
      account.isRevoked = true;
      await this.userAccountRepo.save(account);
      throw new UnauthorizedException('Refresh token has expired');
    }

    account.isRevoked = true;
    await this.userAccountRepo.save(account);

    const user = account.user;
    const tokens = await this.issueTokens(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role?.slug ?? null,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string, userId: number, fcmToken?: string) {
    const hashedToken = this.hashToken(refreshToken);
    const tokenRecord = await this.userAccountRepo.findOne({
      where: {
        refreshToken: hashedToken,
        user: { id: userId },
        isRevoked: false,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Token not found or already revoked');
    }

    if (fcmToken) {
      await this.userDeviceTokenRepo.delete({
        token: fcmToken,
        user: { id: userId },
      });
    }

    tokenRecord.isRevoked = true;
    await this.userAccountRepo.save(tokenRecord);

    return { success: true };
  }

  private async verifyGoogleToken(idToken: string) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);

      if (!decoded.email) {
        throw new Error('Missing email in Firebase token payload');
      }

      return {
        username: decoded.uid,
        name:
          decoded.name || this.getUsernameFromEmail(decoded.email) || 'User',
        email: decoded.email,
        photo: decoded.picture || null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Google token verification failed: ${message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async verifyAppleToken(idToken: string): Promise<{
    username: string;
    name: string;
    email: string;
    photo: string | null;
  }> {
    try {
      const decodedHeader = jwt.decode(idToken, { complete: true });
      if (!decodedHeader || !decodedHeader.header?.kid) {
        throw new Error('Unable to decode Apple token header');
      }

      const signingKey = await this.appleJwksClient.getSigningKey(
        decodedHeader.header.kid,
      );
      const publicKey = signingKey.getPublicKey();

      const verifyOptions: jwt.VerifyOptions = {
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
      };

      if (this.appleBundleId) {
        verifyOptions.audience = this.appleBundleId;
      }

      const payload = jwt.verify(
        idToken,
        publicKey,
        verifyOptions,
      ) as jwt.JwtPayload & {
        email?: string;
        name?: string;
      };

      if (!payload.email) {
        throw new Error('Missing email in Apple token payload');
      }

      return {
        username: payload.sub || '',
        name:
          payload.name || this.getUsernameFromEmail(payload.email) || 'Membro',
        email: payload.email,
        photo: null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Apple token verification failed: ${message}`);
      throw new UnauthorizedException('Invalid Apple token');
    }
  }

  private getUsernameFromEmail(
    email: string | null | undefined,
  ): string | null {
    if (!email) return null;
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return null;
    return email.substring(0, atIndex);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
npx jest src/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/auth/auth.service.ts src/auth/auth.service.spec.ts
git commit -m "feat(auth): enforce admin-only access and add audit logging in socialLogin"
```

---

## Task 4: Remove Apple Sign-In from Admin-UI

**Files:**
- Modify: `admin-ui/lib/firebase/auth.ts`
- Modify: `admin-ui/contexts/auth-context.tsx`

**Interfaces:**
- Produces: `AuthContextValue` without `loginWithApple`; `auth-context.tsx` exports `loginWithGoogle` and `logout` only

- [ ] **Step 1: Remove Apple from firebase/auth.ts**

Replace `admin-ui/lib/firebase/auth.ts` with:

```typescript
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth"
import { getFirebaseAuth } from "./config"

const googleProvider = new GoogleAuthProvider()
googleProvider.addScope("email")
googleProvider.addScope("profile")

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth()
  return signInWithPopup(auth, googleProvider)
}

export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth()
  return signOut(auth)
}

export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (!user) {
    return null
  }
  return user.getIdToken()
}
```

- [ ] **Step 2: Update auth-context.tsx — remove loginWithApple**

Replace `admin-ui/contexts/auth-context.tsx` with:

```typescript
"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/config"
import {
  signInWithGoogle,
  firebaseSignOut,
} from "@/lib/firebase/auth"
import { authApi } from "@/lib/api/endpoints/auth"
import {
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  setSessionCookie,
} from "@/lib/api/client"
import { trackLogin, trackLogout } from "@/lib/firebase/analytics"
import type { User } from "@/lib/api/types"

// ---------------------------------------------------------------------------
// Persisted user cache -- avoids flash of login page on page refresh
// ---------------------------------------------------------------------------

const USER_STORAGE_KEY = "auth_user"

function persistUser(user: User | null) {
  if (typeof window === "undefined") return
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_STORAGE_KEY)
  }
}

function restoreUser(): User | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null
  firebaseUser: FirebaseUser | null
  isLoading: boolean
  isAuthenticated: boolean
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loginInProgressRef = useRef(false)

  const backendAuthPromiseRef = useRef<Promise<void> | null>(null)
  const resolveBackendAuthRef = useRef<(() => void) | null>(null)
  const rejectBackendAuthRef = useRef<((err: Error) => void) | null>(null)

  // ---------------------------------------------------------------------------
  // On mount: restore tokens into memory
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const storedAccess = getAccessToken()
    const storedRefresh = getRefreshToken()
    const cachedUser = restoreUser()

    if (storedAccess) {
      setAccessToken(storedAccess)
    }
    if (storedRefresh) {
      setRefreshToken(storedRefresh)
    }
    if (storedAccess) {
      setSessionCookie()
    }
    if (cachedUser) {
      setUser(cachedUser)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Firebase auth listener
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)

      if (!fbUser) {
        setUser(null)
        persistUser(null)
        clearTokens()
        setIsLoading(false)
        return
      }

      const hasTokens = !!getAccessToken() && !!getRefreshToken()
      const cachedUser = restoreUser()

      if (hasTokens && cachedUser && !loginInProgressRef.current) {
        setUser(cachedUser)
        setIsLoading(false)
        return
      }

      try {
        const idToken = await fbUser.getIdToken()
        const provider =
          fbUser.providerData[0]?.providerId === "apple.com"
            ? "apple"
            : "google"
        const response = await authApi.socialLogin({
          id_token: idToken,
          provider,
        })

        setUser(response.user)
        persistUser(response.user)
        setAccessToken(response.access_token)
        setRefreshToken(response.refresh_token)
        setSessionCookie()

        resolveBackendAuthRef.current?.()
      } catch (error) {
        console.error("Failed to authenticate with backend:", error)
        setUser(null)
        persistUser(null)
        clearTokens()

        rejectBackendAuthRef.current?.(
          error instanceof Error
            ? error
            : new Error("Backend authentication failed")
        )
      } finally {
        loginInProgressRef.current = false
        backendAuthPromiseRef.current = null
        resolveBackendAuthRef.current = null
        rejectBackendAuthRef.current = null
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // ---------------------------------------------------------------------------
  // Helper: creates a promise that resolves when the backend auth finishes
  // ---------------------------------------------------------------------------
  const startLoginFlow = useCallback(() => {
    loginInProgressRef.current = true
    backendAuthPromiseRef.current = new Promise<void>((resolve, reject) => {
      resolveBackendAuthRef.current = resolve
      rejectBackendAuthRef.current = reject
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Login helper
  // ---------------------------------------------------------------------------
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true)
    startLoginFlow()
    try {
      await signInWithGoogle()
      await trackLogin("google")
      await backendAuthPromiseRef.current
    } catch (error) {
      loginInProgressRef.current = false
      backendAuthPromiseRef.current = null
      resolveBackendAuthRef.current = null
      rejectBackendAuthRef.current = null
      setIsLoading(false)
      throw error
    }
  }, [startLoginFlow])

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error("Backend logout failed:", error)
    }

    await firebaseSignOut()
    setUser(null)
    persistUser(null)
    clearTokens()
    await trackLogout()
  }, [])

  const value: AuthContextValue = {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    loginWithGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd admin-ui
npm run build 2>&1 | grep -E "Type error|error TS" | head -20
```

Expected: No TypeScript errors related to `loginWithApple`.

- [ ] **Step 4: Commit**

```bash
cd admin-ui
git add lib/firebase/auth.ts contexts/auth-context.tsx
git commit -m "feat(auth): remove Apple sign-in from firebase auth and auth context"
```

---

## Task 5: Update LoginForm — Remove Apple Button + Error Handling

**Files:**
- Modify: `admin-ui/app/auth/login-form.tsx`

**Interfaces:**
- Consumes: `loginWithGoogle` from `AuthContextValue` (Task 4); no `loginWithApple`

- [ ] **Step 1: Update login-form.tsx**

Replace `admin-ui/app/auth/login-form.tsx` with:

```typescript
"use client"

import type React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chrome, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGoogle, isLoading, isAuthenticated } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const redirectTo = searchParams.get("redirect") || "/dashboard"

  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, redirectTo, router])

  if (isAuthenticated) return null

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      await loginWithGoogle()
      router.push(redirectTo)
    } catch (err: unknown) {
      console.error("Google login error:", err)
      const status =
        err instanceof Error && "status" in err
          ? (err as { status?: number }).status
          : (err as { response?: { status?: number } })?.response?.status

      if (status === 403) {
        setError(
          "Sua conta não tem acesso ao painel administrativo. Entre em contato com o suporte."
        )
      } else if (status === 401) {
        setError("Autenticação falhou. Tente novamente.")
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao fazer login. Tente novamente."
        )
      }
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Entrar</CardTitle>
        <CardDescription className="text-center">
          Entrar com Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Chrome className="mr-2 h-4 w-4" />
          )}
          Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Use sua conta Google para acessar o painel administrativo.
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Check for any other references to loginWithApple**

```bash
cd admin-ui
grep -r "loginWithApple\|signInWithApple\|appleProvider\|handleAppleLogin" --include="*.ts" --include="*.tsx" .
```

Expected: No matches. If any found, remove them.

- [ ] **Step 3: Run lint**

```bash
cd admin-ui
npm run lint 2>&1 | grep -E "error|Error" | head -20
```

Expected: No lint errors.

- [ ] **Step 4: Commit**

```bash
cd admin-ui
git add app/auth/login-form.tsx
git commit -m "feat(auth): remove Apple button from login form, add role-error messages"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|---|---|
| Google-only UI | Tasks 4 & 5 — Apple removed from firebase/auth.ts, auth-context, login-form |
| Admin gating (403 for non-admins) | Task 3 — role check in `socialLogin()` |
| Admin provisioning via DB seeding | Not automated — spec says "manual SQL/migration"; documented in rollout plan |
| Backward compat — Apple tokens backend | Tasks 3 keeps `verifyAppleToken` and the `apple` branch in `socialLogin()` |
| Audit trail — all attempts logged | Task 3 — LOGIN_SUCCESS, LOGIN_FAILED_ROLE, LOGIN_FAILED_AUTH |
| AuditLog entity with correct fields | Task 1 |
| Migration with indexes | Task 1 |
| AuditLogger never throws | Task 2 — `catch` swallows errors |
| Clear 403 error message in UI | Task 5 — Portuguese error string |
| Frontend 401 handling | Task 5 |

**Gaps found:** Admin provisioning migration is out of scope per spec ("manual SQL"). No task needed.

**Type consistency check:**
- `AuditAction` type defined in `audit-log.entity.ts` (Task 1) and imported in `audit.logger.ts` (Task 2) and `auth.service.ts` (Task 3) — consistent.
- `logAuthAttempt(email, provider, action, reason?, ipAddress?)` — signature consistent across Task 2 definition and Task 3 call sites.
- `loginWithApple` removed from `AuthContextValue` in Task 4 and from `login-form.tsx` in Task 5 — consistent.
