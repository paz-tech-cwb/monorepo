import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { Notification } from './entities/notification.entity';

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
    await expect(service.create(dto, 1)).rejects.toThrow(
      UnprocessableEntityException,
    );
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

  it('findOne() throws NotFoundException when not found', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('remove() throws ConflictException when status is sent', async () => {
    mockEntityManager.findOne.mockResolvedValue({ id: 1, status: 'sent' });
    await expect(service.remove(1)).rejects.toThrow(ConflictException);
  });

  it('remove() throws NotFoundException when notification not found', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);
    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });

  it('findAll passes origin filter to the where clause', async () => {
    const findSpy = jest
      .spyOn(mockEntityManager, 'find')
      .mockResolvedValue([] as never);
    await service.findAll('automatic');
    expect(findSpy).toHaveBeenCalledWith(
      Notification,
      expect.objectContaining({ where: { origin: 'automatic' } }),
    );
  });

  it('getReach() returns zero counts for empty segment', async () => {
    const mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockEntityManager.createQueryBuilder.mockReturnValue(mockQb);

    const result = await service.getReach(
      { type: 'all' },
      ['push', 'email'],
      'announcements',
    );
    expect(result.total).toBe(0);
    expect(result.by_channel.push).toBe(0);
    expect(result.by_channel.email).toBe(0);
  });
});
