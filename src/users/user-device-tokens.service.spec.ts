import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { UserDeviceTokensService } from './user-device-tokens.service';

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

  it('remove() deletes token belonging to user', async () => {
    mockEntityManager.delete.mockResolvedValue({ affected: 1 });
    await service.remove(1, 'fcm-token-abc');
    expect(mockEntityManager.delete).toHaveBeenCalled();
  });
});
