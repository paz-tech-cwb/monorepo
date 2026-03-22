import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';

const mockEntityManager = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
};

describe('UserNotificationPreferencesService', () => {
  let service: UserNotificationPreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserNotificationPreferencesService,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
      ],
    }).compile();
    service = module.get<UserNotificationPreferencesService>(UserNotificationPreferencesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getOrCreate() returns existing preferences', async () => {
    const prefs = { id: 1, user: { id: 1 }, pushEnabled: true };
    mockEntityManager.findOne.mockResolvedValue(prefs);
    const result = await service.getOrCreate(1);
    expect(result).toBe(prefs);
    expect(mockEntityManager.save).not.toHaveBeenCalled();
  });

  it('getOrCreate() creates default prefs when none exist', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);
    mockEntityManager.create.mockReturnValue({ user: { id: 1 } });
    mockEntityManager.save.mockResolvedValue({ id: 2 });
    await service.getOrCreate(1);
    expect(mockEntityManager.save).toHaveBeenCalled();
  });
});
