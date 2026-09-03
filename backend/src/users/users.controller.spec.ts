// backend/src/users/users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserDeviceTokensService } from './user-device-tokens.service';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';

const mockUserResponse = {
  id: 1,
  name: 'João Silva',
  email: 'joao@gmail.com',
  picture: null,
  phone: '(41) 99999-0000',
  birth_date: '1990-03-15',
  role: 'member',
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            updateProfile: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateRole: jest.fn(),
            remove: jest.fn(),
            deleteSelf: jest.fn(),
          },
        },
        {
          provide: UserDeviceTokensService,
          useValue: { register: jest.fn(), remove: jest.fn() },
        },
        {
          provide: UserNotificationPreferencesService,
          useValue: {
            getOrCreate: jest.fn(),
            update: jest.fn(),
            toResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('GET /users/me', () => {
    it('calls usersService.findOne with the authenticated user id', async () => {
      usersService.findOne.mockResolvedValue(mockUserResponse as any);
      const req = { user: { id: 1 } };

      const result = await controller.getMe(req);

      expect(usersService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('PUT /users/me', () => {
    it('calls usersService.updateProfile with user id and dto', async () => {
      const dto = { name: 'João Atualizado' };
      usersService.updateProfile.mockResolvedValue({
        ...mockUserResponse,
        name: 'João Atualizado',
      } as any);
      const req = { user: { id: 1 } };

      const result = await controller.updateMe(req, dto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(1, dto);
      expect(result.name).toBe('João Atualizado');
    });

    it('does not allow updating role or status via updateMe', async () => {
      const dto = {
        name: 'Test',
        phone: '(41) 99999-0000',
        birth_date: '1990-01-01',
      };
      usersService.updateProfile.mockResolvedValue(mockUserResponse as any);

      await controller.updateMe({ user: { id: 1 } }, dto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('DELETE /users/me', () => {
    it('calls usersService.deleteSelf with the authenticated user id', async () => {
      usersService.deleteSelf.mockResolvedValue(undefined);
      const req = { user: { id: 1 } };

      await controller.deleteMe(req);

      expect(usersService.deleteSelf).toHaveBeenCalledWith(1);
    });
  });
});
