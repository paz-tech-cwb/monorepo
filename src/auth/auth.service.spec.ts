import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpException, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { User } from 'src/users/entities/user.entity';
import { UserAccount } from 'src/users/entities/account.entity';

const ACCESS_SECRET = 'test-access-secret-at-least-32-chars!!';
const REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars!!';
const GOOGLE_CLIENT_ID = 'test-google-client-id';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const mockUser: Partial<User> = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  picture: 'https://example.com/photo.jpg',
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Record<string, jest.Mock>;
  let userAccountRepo: Record<string, jest.Mock>;

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

    const configServiceMock = {
      getOrThrow: jest.fn((key: string) => {
        const map: Record<string, string> = {
          ACCESS_TOKEN_SECRET: ACCESS_SECRET,
          REFRESH_TOKEN_SECRET: REFRESH_SECRET,
          GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
          FIREBASE_PROJECT_ID: 'test-firebase-project',
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
        { provide: ConfigService, useValue: configServiceMock },
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

    it('should create a new user if not found and return tokens for google provider', async () => {
      const googlePayload = {
        sub: 'google-id-123',
        name: 'Google User',
        email: 'google@example.com',
        picture: 'https://google.com/photo.jpg',
      };

      // Mock the private verifyGoogleToken method
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: googlePayload.sub,
        name: googlePayload.name,
        email: googlePayload.email,
        photo: googlePayload.picture,
      });

      userRepo.findOne.mockResolvedValue(null);
      const createdUser = { id: 2, ...googlePayload };
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);

      userAccountRepo.create.mockReturnValue({});
      userAccountRepo.save.mockResolvedValue({});

      const result = await service.socialLogin('google', 'fake-google-token');

      expect(result.user.email).toBe(googlePayload.email);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(userRepo.create).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should return tokens for existing user without creating', async () => {
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue({
        username: 'sub-123',
        name: mockUser.name,
        email: mockUser.email,
        photo: mockUser.picture,
      });

      userRepo.findOne.mockResolvedValue(mockUser);
      userAccountRepo.create.mockReturnValue({});
      userAccountRepo.save.mockResolvedValue({});

      const result = await service.socialLogin('google', 'fake-google-token');

      expect(result.user.id).toBe(mockUser.id);
      expect(userRepo.create).not.toHaveBeenCalled();
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
        user: mockUser,
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
        user: mockUser,
      };

      userAccountRepo.findOne.mockResolvedValue(account);
      userAccountRepo.save.mockResolvedValue(account);
      userAccountRepo.create.mockReturnValue({});

      const result = await service.refreshTokens(validToken);

      expect(account.isRevoked).toBe(true);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
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
    it('should not throw during initialization', () => {
      expect(() => service.onModuleInit()).not.toThrow();
    });
  });
});
