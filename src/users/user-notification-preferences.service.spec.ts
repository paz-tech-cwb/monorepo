import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';

const mockEntityManager = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
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

  it('update() applies partial DTO fields to prefs', async () => {
    const prefs = {
      id: 1,
      allNotificationsEnabled: true,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: true,
      whatsappEnabled: true,
      eventsEnabled: true,
      announcementsEnabled: true,
      lifeGroupEnabled: true,
      academyEnabled: true,
      adminAlertsEnabled: true,
      user: { id: 1 },
    };
    mockEntityManager.findOne.mockResolvedValue(prefs);
    mockEntityManager.save.mockResolvedValue({ ...prefs, pushEnabled: false });

    await service.update(1, { push_enabled: false });
    expect(mockEntityManager.save).toHaveBeenCalledWith(
      expect.objectContaining({ pushEnabled: false }),
    );
  });

  it('update() does not overwrite unspecified fields', async () => {
    const prefs = {
      id: 1,
      allNotificationsEnabled: true,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: true,
      whatsappEnabled: true,
      eventsEnabled: true,
      announcementsEnabled: true,
      lifeGroupEnabled: true,
      academyEnabled: true,
      adminAlertsEnabled: true,
      user: { id: 1 },
    };
    mockEntityManager.findOne.mockResolvedValue(prefs);
    mockEntityManager.save.mockImplementation((p) => Promise.resolve(p));

    await service.update(1, { events_enabled: false });
    expect(mockEntityManager.save).toHaveBeenCalledWith(
      expect.objectContaining({ eventsEnabled: false, pushEnabled: true }),
    );
  });
});
