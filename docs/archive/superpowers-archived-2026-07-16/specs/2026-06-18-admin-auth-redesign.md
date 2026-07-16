# Admin Auth Redesign — Google-Only Sign-In & Audit Logging

**Date:** 2026-06-18  
**Status:** Approved  
**Scope:** Admin-UI authentication, backend role enforcement, audit logging

---

## Overview

This spec redesigns the admin authentication system to:
1. **Remove Apple sign-in from the UI** (users see Google button only; backend continues to accept Apple tokens for backward compatibility)
2. **Enforce role-based access control** at the backend (admin role required for login)
3. **Add audit logging** to track all authentication attempts for security and compliance

**Core principle:** Backend is the single source of truth for authorization. Frontend provides UX; backend enforces policy.

---

## Requirements

### Functional

1. **Google-only UI** — Admin-UI login page shows only Google sign-in button
2. **Admin gating** — Only users with `admin` role can authenticate to the admin panel; non-admins receive a 403 error
3. **Admin provisioning** — New admin users created via database seeding (manual SQL/migration, no UI)
4. **Backward compatibility** — Backend continues to accept Apple tokens (for users who signed in previously)
5. **Audit trail** — All authentication attempts (success/failure) logged with email, provider, action, reason, timestamp, IP address

### Non-Functional

- **Security:** Role checks happen at backend before tokens issued; no role-bypass possible via frontend manipulation
- **Compliance:** Complete audit log of who attempted access, when, and outcome
- **UX:** Clear error messages when non-admins attempt login
- **Performance:** Audit logging adds minimal overhead (<5ms per auth attempt)

---

## Architecture

### Backend Authorization Flow

```
POST /api/auth/social-login (Google or Apple token)
  ↓
Backend verifies token (Firebase Admin SDK for Google, JWKS for Apple)
  ↓
Lookup user by email in database
  ↓
[NEW] CHECK: Is user.role === 'admin'?
  ├─ YES → Issue JWT access + refresh tokens
  │        Log: LOGIN_SUCCESS
  │        Return: 200 + tokens
  │
  └─ NO → Throw HttpException(403, 'Admin access required')
           Log: LOGIN_FAILED_ROLE
           Return: 403 + error message
  
[NEW] Catch-all: Log all failures (invalid token, user not found, etc.)
```

### Data Model

**New Entity: `AuditLog`** (`src/auth/entities/audit-log.entity.ts`)

```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number | null;  // null if user not found

  @Column()
  email: string;

  @Column()
  provider: string;  // 'google' | 'apple'

  @Column({
    type: 'enum',
    enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED_ROLE', 'LOGIN_FAILED_AUTH'],
  })
  action: string;

  @Column({ nullable: true })
  reason: string;  // e.g., "User role is member, not admin"

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ nullable: true })
  ipAddress: string;
}
```

---

## Implementation Details

### Frontend Changes

#### File: `lib/firebase/auth.ts`

**Remove:**
- `appleProvider` constant
- `signInWithApple()` function

**Result:** File now exports only `signInWithGoogle()` and `firebaseSignOut()`.

#### File: `app/auth/login-form.tsx`

**Remove:**
- Apple button (lines 79-91)
- `handleAppleLogin` function (lines 39-48)
- `loginWithApple` call from useAuth destructure

**Update:**
- Simplify grid from 2 columns to center a single Google button
- Update description text to "Entrar com Google" (instead of "Escolha seu metodo...")

#### File: `contexts/auth-context.tsx`

**Update AuthContextValue interface:**
```typescript
interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
  // loginWithApple removed
  logout: () => Promise<void>;
  error?: string;  // [NEW] for displaying error messages
}
```

**Update onAuthStateChanged listener:**
- Catch 403 responses from socialLogin()
- Set `error` state with user-friendly message
- Example: if response status is 403, show: "Sua conta não tem acesso ao painel administrativo. Entre em contato com o suporte."

**Update AuthProvider value object:**
- Remove `loginWithApple`
- Add `error` field

#### File: `middleware.ts`

**No changes** — Middleware continues to validate cookie-based session; role check already delegated to backend.

---

### Backend Changes

#### File: `src/auth/auth.service.ts`

**Update `socialLogin()` method:**

```typescript
async socialLogin(provider: string, idToken: string) {
  let userData: { /* ... */ };
  
  if (provider === 'google') {
    userData = await this.verifyGoogleToken(idToken);
  } else if (provider === 'apple') {
    userData = await this.verifyAppleToken(idToken);
  } else {
    throw new HttpException('Unsupported provider', HttpStatus.BAD_REQUEST);
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

  // [NEW] Role-based access check
  if (!user.role || user.role.slug !== 'admin') {
    const reason = `User role is '${user.role?.slug || 'unknown'}', not 'admin'`;
    await this.auditLogger.logAuthAttempt(
      userData.email,
      provider,
      'LOGIN_FAILED_ROLE',
      reason,
      this.getIpAddress(),
    );
    throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
  }

  const tokens = await this.issueTokens(user);

  // [NEW] Log successful login
  await this.auditLogger.logAuthAttempt(
    userData.email,
    provider,
    'LOGIN_SUCCESS',
    null,
    this.getIpAddress(),
  );

  return {
    user: { /* ... */ },
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  };
}
```

**Add new method to extract IP address:**
```typescript
private getIpAddress(): string {
  // Extract from request context (injected via NestJS request)
  // Fallback to '0.0.0.0' if unavailable
}
```

#### File: `src/auth/audit.logger.ts` (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger(AuditLogger.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  async logAuthAttempt(
    email: string,
    provider: string,
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED_ROLE' | 'LOGIN_FAILED_AUTH',
    reason?: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepo.create({
        email,
        provider,
        action,
        reason,
        ipAddress,
        timestamp: new Date(),
      });
      await this.auditLogRepo.save(auditLog);
    } catch (error) {
      // Log error but don't throw — audit logging failure shouldn't break auth
      this.logger.error(`Failed to create audit log: ${error}`);
    }
  }
}
```

#### File: `src/auth/auth.module.ts`

**Update imports:**
```typescript
import { AuditLogger } from './audit.logger';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserAccount, Role, UserDeviceToken, AuditLog]),
  ],
  providers: [AuthService, JwtStrategy, AuditLogger],
  exports: [AuthService],
})
export class AuthModule {}
```

**Update AuthService constructor to inject AuditLogger:**
```typescript
constructor(
  @InjectRepository(User) private userRepo: Repository<User>,
  @InjectRepository(UserAccount) private userAccountRepo: Repository<UserAccount>,
  @InjectRepository(Role) private roleRepo: Repository<Role>,
  @InjectRepository(UserDeviceToken) private userDeviceTokenRepo: Repository<UserDeviceToken>,
  @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
  private configService: ConfigService,
  private auditLogger: AuditLogger,
) { /* ... */ }
```

#### File: `src/database/migrations/YYYYMMDD-create-audit-logs-table.ts` (NEW)

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAuditLogsTable1718700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'action',
            type: 'enum',
            enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED_ROLE', 'LOGIN_FAILED_AUTH'],
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
        ],
        indices: [
          { columnNames: ['email'] },
          { columnNames: ['timestamp'] },
          { columnNames: ['action'] },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs');
  }
}
```

#### Admin User Provisioning

**Option A: TypeORM Migration** (`src/database/migrations/YYYYMMDD-seed-admin-users.ts`)

```typescript
export class SeedAdminUsers1718700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert admin users by email
    const adminEmails = [
      'pastor@pazchurch.com.br',
      'admin@pazchurch.com.br',
    ];
    
    const adminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'admin'`
    );
    
    for (const email of adminEmails) {
      await queryRunner.query(
        `UPDATE users SET role_id = $1 WHERE email = $2`,
        [adminRole[0].id, email]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: set admin users back to member role
    const memberRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'member'`
    );
    
    const adminEmails = [
      'pastor@pazchurch.com.br',
      'admin@pazchurch.com.br',
    ];
    
    for (const email of adminEmails) {
      await queryRunner.query(
        `UPDATE users SET role_id = $1 WHERE email = $2`,
        [memberRole[0].id, email]
      );
    }
  }
}
```

**Option B: NestJS CLI Script** (for manual provisioning)

Provide a command: `npm run seed:admin -- --email user@church.com`

---

## Error Handling

### Backend Response Codes

| Status | Scenario | Response Body |
|--------|----------|----------------|
| 200 | Admin user, valid token | `{ user, access_token, refresh_token }` |
| 400 | Invalid provider | `{ message: 'Unsupported provider' }` |
| 401 | Invalid/expired token | `{ message: 'Invalid Google token' }` or `{ message: 'Invalid Apple token' }` |
| 403 | Non-admin user | `{ message: 'Admin access required' }` |
| 500 | DB/internal error | `{ message: 'Internal server error' }` |

### Frontend Error Display

Add error handling to `LoginForm`:

```typescript
const [errorMessage, setErrorMessage] = useState<string | null>(null);

const handleGoogleLogin = async () => {
  try {
    setErrorMessage(null);
    await loginWithGoogle();
  } catch (error) {
    if (error.response?.status === 403) {
      setErrorMessage(
        'Sua conta não tem acesso ao painel administrativo. Entre em contato com o suporte.'
      );
    } else if (error.response?.status === 401) {
      setErrorMessage('Autenticação falhou. Tente novamente.');
    } else {
      setErrorMessage(error.message || 'Erro ao fazer login. Tente novamente.');
    }
  }
};
```

---

## Testing

### Backend Unit Tests (`src/auth/auth.service.spec.ts`)

```typescript
describe('AuthService.socialLogin', () => {
  it('should issue tokens for admin user with Google token', async () => {
    // Arrange: mock Firebase verify, mock admin user
    // Act: call socialLogin('google', validToken)
    // Assert: returns tokens, no error thrown
  });

  it('should reject non-admin user with Google token (403)', async () => {
    // Arrange: mock Firebase verify, mock member user
    // Act: call socialLogin('google', validToken)
    // Assert: throws HttpException(403, 'Admin access required')
  });

  it('should still accept admin user with Apple token', async () => {
    // Arrange: mock Apple JWKS, mock admin user
    // Act: call socialLogin('apple', validToken)
    // Assert: returns tokens
  });

  it('should log successful auth to AuditLog', async () => {
    // Arrange: mock successful auth
    // Act: call socialLogin(...)
    // Assert: AuditLog entry created with action=LOGIN_SUCCESS
  });

  it('should log failed role check to AuditLog', async () => {
    // Arrange: mock non-admin user
    // Act: call socialLogin(...)
    // Assert: AuditLog entry created with action=LOGIN_FAILED_ROLE
  });

  it('should log invalid token to AuditLog', async () => {
    // Arrange: mock token verification failure
    // Act: call socialLogin(..., invalidToken)
    // Assert: AuditLog entry created with action=LOGIN_FAILED_AUTH
  });
});
```

### Frontend Component Tests (`app/auth/login-form.test.tsx`)

```typescript
describe('LoginForm', () => {
  it('should render Google button only (no Apple)', () => {
    render(<LoginForm />);
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
  });

  it('should show role error on 403 response', async () => {
    // Arrange: mock loginWithGoogle to throw 403
    // Act: click Google button
    // Assert: error message displays
  });

  it('should show auth error on 401 response', async () => {
    // Arrange: mock loginWithGoogle to throw 401
    // Act: click Google button
    // Assert: different error message displays
  });
});
```

---

## Rollout Plan

### Phase 1: Backend (Day 1)
- Create `AuditLog` entity and migration
- Create `AuditLogger` utility
- Update `AuthService.socialLogin()` with role check and audit logging
- Update `auth.module.ts` to inject AuditLogger
- Deploy backend

### Phase 2: Frontend (Day 2)
- Remove `signInWithApple()` from `lib/firebase/auth.ts`
- Update `login-form.tsx` to remove Apple button
- Update `auth-context.tsx` to remove `loginWithApple` and handle 403
- Deploy frontend

### Phase 3: Admin Provisioning (Day 3)
- Run migration to create `audit_logs` table
- Create second migration with admin user emails (or manual SQL)
- Verify admins can still log in with Google

### Phase 4: Verification (Day 4)
- Test: Admin user logs in with Google → succeeds
- Test: Non-admin tries to log in with Google → sees error message
- Test: Historical Apple users can still log in (backward compat check)
- Review audit logs for any unexpected attempts

---

## Success Criteria

- ✅ Apple button removed from admin-UI login page
- ✅ Only users with `admin` role can authenticate
- ✅ Non-admin users see clear error message: "Sua conta não tem acesso..."
- ✅ All authentication attempts logged in `audit_logs` table
- ✅ Admins can review audit logs for security monitoring
- ✅ Backward compatibility: Apple tokens still work in backend
- ✅ Zero downtime during deployment

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Existing admins locked out if role not set correctly | Verify admin role IDs before migration; test with staging admin user first |
| Audit logging performance impact | Use async logging that doesn't block auth response; query audit logs with indexes |
| Users confused why Apple button disappeared | Add release notes; support team prepared with explanation |
| New admins not provisioned correctly | Test provisioning script with test user; clear runbook |

---

## Future Enhancements (Out of Scope)

- Admin dashboard to view audit logs and manage admin users (currently manual)
- Email notifications for suspicious login attempts
- Two-factor authentication (2FA) for admins
- Webhook integration to sync admins from external directory (Okta, etc.)

---

## Appendix: Database Indexes

Add to migration for `audit_logs` table to speed up common queries:

```sql
CREATE INDEX idx_audit_logs_email ON audit_logs(email);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_email_timestamp ON audit_logs(email, timestamp);
```
