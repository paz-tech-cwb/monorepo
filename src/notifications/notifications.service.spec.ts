import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { UnprocessableEntityException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
};

const mockEntityManager = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};
const mockDispatchService = { dispatch: jest.fn() };

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
        { provide: NotificationDispatchService, useValue: mockDispatchService },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create() throws 422 when scheduled_at is in the past', async () => {
    const dto = {
      title: 'Test',
      message: 'Hello',
      category: 'announcements' as const,
      channels: ['push'],
      segment: { type: 'all' as const },
      scheduled_at: '2020-01-01T00:00:00Z',
    };
    await expect(service.create(dto, 1)).rejects.toThrow(UnprocessableEntityException);
  });

  it('create() saves notification with status pending for immediate send', async () => {
    const dto = {
      title: 'Test',
      message: 'Hello',
      category: 'announcements' as const,
      channels: ['push'],
      segment: { type: 'all' as const },
    };
    const saved = { id: 1, ...dto, status: 'pending', scheduledAt: null };
    mockEntityManager.create.mockReturnValue(saved);
    mockEntityManager.save.mockResolvedValue(saved);
    mockEntityManager.find.mockResolvedValue([]);

    await service.create(dto, 1);
    expect(mockEntityManager.save).toHaveBeenCalled();
  });
});
