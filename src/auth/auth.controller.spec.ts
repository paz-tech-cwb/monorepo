import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { User } from 'src/users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Record<string, jest.Mock>;

  beforeEach(async () => {
    authService = {
      socialLogin: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('socialLogin', () => {
    it('should call authService.socialLogin with correct args', async () => {
      const dto = { provider: 'google' as const, idToken: 'test-token' };
      const expected = {
        user: { id: 1, name: 'Test', email: 'test@test.com', picture: null },
        accessToken: 'at',
        refreshToken: 'rt',
      };
      authService.socialLogin.mockResolvedValue(expected);

      const result = await controller.socialLogin(dto);

      expect(authService.socialLogin).toHaveBeenCalledWith(
        'google',
        'test-token',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with the token', async () => {
      const dto = { refreshToken: 'old-refresh-token' };
      const expected = {
        user: { id: 1, name: 'Test', email: 'test@test.com', picture: null },
        accessToken: 'new-at',
        refreshToken: 'new-rt',
      };
      authService.refreshTokens.mockResolvedValue(expected);

      const result = await controller.refresh(dto);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with token and user id', async () => {
      const dto = { refreshToken: 'my-refresh-token' };
      const req = { user: { id: 5 } } as Request & { user: User };
      authService.logout.mockResolvedValue({ success: true });

      const result = await controller.logout(req, dto);

      expect(authService.logout).toHaveBeenCalledWith('my-refresh-token', 5);
      expect(result).toEqual({ success: true });
    });
  });
});
