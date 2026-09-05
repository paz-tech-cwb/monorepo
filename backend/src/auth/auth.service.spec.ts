import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
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
const sectorLeaderRole: Partial<Role> = { id: 4, slug: 'sector_leader' };

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

const mockSectorLeaderUser: Partial<User> = {
  id: 3,
  name: 'Sector Leader User',
  email: 'sectorleader@example.com',
  picture: null,
  role: sectorLeaderRole as Role,
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
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
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
        {
          provide: getRepositoryToken(UserDeviceToken),
          useValue: userDeviceTokenRepo,
        },
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

    it('should allow a sector_leader (non-admin leadership role) to log in', async () => {
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'google-uid',
        name: 'Sector Leader User',
        email: 'sectorleader@example.com',
        photo: null,
      });

      userRepo.findOne.mockResolvedValue(mockSectorLeaderUser);
      userAccountRepo.create.mockReturnValue({});
      userAccountRepo.save.mockResolvedValue({});

      const result = await service.socialLogin('google', 'valid-google-token');

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.user.email).toBe('sectorleader@example.com');
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
        message: 'Leadership access required',
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

      await expect(service.socialLogin('google', 'bad-token')).rejects.toThrow(
        UnauthorizedException,
      );

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

      userRepo.findOne.mockResolvedValue(null); // user not found by email
      roleRepo.findOne.mockResolvedValue(memberRole);
      const createdUser = { ...mockMemberUser, email: 'newuser@example.com' };
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);

      await expect(
        service.socialLogin('google', 'valid-google-token', '1990-01-01'),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });

      expect(auditLoggerMock.logAuthAttempt).toHaveBeenCalledWith(
        'newuser@example.com',
        'google',
        'LOGIN_FAILED_ROLE',
        expect.any(String),
        null,
      );
    });

    it('should require birth_date to register a brand new user', async () => {
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'google-uid',
        name: 'New User',
        email: 'newuser@example.com',
        photo: null,
      });

      userRepo.findOne.mockResolvedValue(null); // no email match

      await expect(
        service.socialLogin('google', 'valid-google-token'),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: expect.objectContaining({ error: 'BIRTH_DATE_REQUIRED' }),
      });

      expect(userRepo.create).not.toHaveBeenCalled();
    });

    it('should link an unclaimed profile (no email yet) found by name + birth date instead of creating a duplicate', async () => {
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'google-uid',
        name: '  Admin User  ',
        email: 'new-admin-email@example.com',
        photo: null,
      });

      const unclaimedUser = { ...mockAdminUser, email: null };
      const getMany = jest.fn().mockResolvedValue([unclaimedUser]);
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany,
      };
      userRepo.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      userRepo.save.mockImplementation((u) => Promise.resolve(u));
      userAccountRepo.create.mockReturnValue({});
      userAccountRepo.save.mockResolvedValue({});

      const result = await service.socialLogin(
        'google',
        'valid-google-token',
        '1990-01-01',
      );

      expect(userRepo.findOne).not.toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new-admin-email@example.com' }),
      );
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(result.user.email).toBe('new-admin-email@example.com');
    });

    it('should NOT rebind an already-claimed account via name + birth date match (account takeover prevention)', async () => {
      // name + birthDate are not secret; an attacker who knows a leader's
      // name and birthdate must not be able to hijack that leader's
      // already-claimed account by logging in with a different email.
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'attacker-google-uid',
        name: '  Admin User  ',
        email: 'attacker@example.com',
        photo: null,
      });

      const claimedUser = {
        ...mockAdminUser,
        email: 'real-admin-email@example.com',
      };
      const getMany = jest.fn().mockResolvedValue([claimedUser]);
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany,
      };
      userRepo.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      userRepo.findOne.mockResolvedValue(null); // no user with attacker's email
      roleRepo.findOne.mockResolvedValue(memberRole);
      const createdUser = { ...mockMemberUser, email: 'attacker@example.com' };
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);

      await expect(
        service.socialLogin('google', 'valid-google-token', '1990-01-01'),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });

      // The claimed admin account must never be mutated or linked.
      expect(userRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: claimedUser.id }),
      );
      // Falls through to the new-member-registration path instead.
      expect(userRepo.create).toHaveBeenCalled();
    });

    it('should skip auto-linking and fall back to email match on ambiguous name+birthDate collisions', async () => {
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'google-uid',
        name: 'Admin User',
        email: 'admin@example.com',
        photo: null,
      });

      const getMany = jest
        .fn()
        .mockResolvedValue([mockAdminUser, { ...mockAdminUser, id: 99 }]);
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany,
      };
      userRepo.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      userRepo.findOne.mockResolvedValue(mockAdminUser);
      userAccountRepo.create.mockReturnValue({});
      userAccountRepo.save.mockResolvedValue({});

      const result = await service.socialLogin(
        'google',
        'valid-google-token',
        '1990-01-01',
      );

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
      });
      expect(result.user.email).toBe('admin@example.com');
    });

    it('should not surface audit logging errors to the caller', async () => {
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'google-uid',
        name: 'Admin User',
        email: 'admin@example.com',
        photo: null,
      });

      userRepo.findOne.mockResolvedValue(mockAdminUser);
      userAccountRepo.create.mockReturnValue({});
      userAccountRepo.save.mockResolvedValue({});
      auditLoggerMock.logAuthAttempt.mockRejectedValue(new Error('DB down'));

      // Should still return tokens even if audit logging fails
      const result = await service.socialLogin('google', 'valid-google-token');
      expect(result.access_token).toBeDefined();
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException for invalid JWT', async () => {
      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token not found in DB', async () => {
      const validToken = jwt.sign({ userId: 1 }, REFRESH_SECRET, {
        algorithm: 'HS256',
      });

      userAccountRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens(validToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired DB record', async () => {
      const validToken = jwt.sign({ userId: 1 }, REFRESH_SECRET, {
        algorithm: 'HS256',
      });
      const expiredAccount = {
        refreshToken: hashToken(validToken),
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // expired
        user: mockAdminUser,
      };

      userAccountRepo.findOne.mockResolvedValue(expiredAccount);
      userAccountRepo.save.mockResolvedValue(expiredAccount);

      await expect(service.refreshTokens(validToken)).rejects.toThrow(
        'Refresh token has expired',
      );
      expect(expiredAccount.isRevoked).toBe(true);
    });

    it('should revoke old token and issue new tokens on valid refresh', async () => {
      const validToken = jwt.sign({ userId: 1 }, REFRESH_SECRET, {
        algorithm: 'HS256',
      });
      const account = {
        refreshToken: hashToken(validToken),
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        user: mockAdminUser,
      };

      userAccountRepo.findOne.mockResolvedValue(account);
      userAccountRepo.save.mockResolvedValue(account);
      userAccountRepo.create.mockReturnValue({});

      const result = await service.refreshTokens(validToken);

      expect(account.isRevoked).toBe(true);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.user.id).toBe(mockAdminUser.id);
    });

    it('should look up tokens by hash, not plaintext', async () => {
      const validToken = jwt.sign({ userId: 1 }, REFRESH_SECRET, {
        algorithm: 'HS256',
      });
      const expectedHash = hashToken(validToken);

      userAccountRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens(validToken)).rejects.toThrow();

      expect(userAccountRepo.findOne).toHaveBeenCalledWith({
        where: {
          refreshToken: expectedHash,
          isRevoked: false,
        },
        relations: ['user'],
      });
    });
  });

  describe('logout', () => {
    it('should throw UnauthorizedException when token not found', async () => {
      userAccountRepo.findOne.mockResolvedValue(null);

      await expect(service.logout('some-token', 1)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should revoke the token and return success', async () => {
      const tokenRecord = {
        refreshToken: hashToken('some-token'),
        isRevoked: false,
      };
      userAccountRepo.findOne.mockResolvedValue(tokenRecord);
      userAccountRepo.save.mockResolvedValue(tokenRecord);

      const result = await service.logout('some-token', 1);

      expect(result.success).toBe(true);
      expect(tokenRecord.isRevoked).toBe(true);
    });

    it('should look up tokens by hash with userId and isRevoked check', async () => {
      const token = 'test-refresh-token';
      const expectedHash = hashToken(token);
      userAccountRepo.findOne.mockResolvedValue(null);

      await expect(service.logout(token, 42)).rejects.toThrow();

      expect(userAccountRepo.findOne).toHaveBeenCalledWith({
        where: {
          refreshToken: expectedHash,
          user: { id: 42 },
          isRevoked: false,
        },
      });
    });
  });

  describe('onModuleInit', () => {
    it('should not throw during initialization when Firebase is already initialized', () => {
      // Simulate Firebase already initialized (admin.apps.length > 0 skips initializeApp)
      jest
        .spyOn(require('firebase-admin'), 'apps', 'get')
        .mockReturnValue([{}]);
      expect(() => service.onModuleInit()).not.toThrow();
    });
  });
});
