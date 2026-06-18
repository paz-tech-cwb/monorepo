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
