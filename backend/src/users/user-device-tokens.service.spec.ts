import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { UserDeviceTokensService } from './user-device-tokens.service';
import { UserDeviceToken } from './entities/user-device-token.entity';

const mockEntityManager = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
};

describe('UserDeviceTokensService', () => {
  let service: UserDeviceTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDeviceTokensService,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
      ],
    }).compile();
    service = module.get<UserDeviceTokensService>(UserDeviceTokensService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register() upserts token — creates new when not found', async () => {
    const userId = 1;
    const dto = { token: 'fcm-token-abc', platform: 'android' as const };
    mockEntityManager.findOne.mockResolvedValue(null);
    mockEntityManager.create.mockReturnValue({ ...dto, user: { id: userId } });
    mockEntityManager.save.mockResolvedValue({ id: 1, ...dto });

    await service.register(userId, dto);
    expect(mockEntityManager.save).toHaveBeenCalled();
  });

  it('register() upserts token — updates when token already exists', async () => {
    const existing = {
      id: 5,
      token: 'fcm-token-abc',
      platform: 'ios',
      user: { id: 2 },
    };
    mockEntityManager.findOne.mockResolvedValue(existing);
    mockEntityManager.save.mockResolvedValue({
      ...existing,
      platform: 'android',
    });

    await service.register(1, { token: 'fcm-token-abc', platform: 'android' });
    expect(mockEntityManager.save).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'android' }),
    );
    expect(mockEntityManager.update).not.toHaveBeenCalled();
  });

  it('remove() deletes token belonging to user', async () => {
    mockEntityManager.delete.mockResolvedValue({ affected: 1 });
    await service.remove(1, 'fcm-token-abc');
    expect(mockEntityManager.delete).toHaveBeenCalledWith(UserDeviceToken, {
      token: 'fcm-token-abc',
      user: { id: 1 },
    });
  });
});
