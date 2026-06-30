import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';

function makeEvent(overrides: Partial<Event> = {}): Event {
  const e = new Event();
  e.id = 1;
  e.title = 'Test Event';
  e.initialDate = new Date('2026-01-10T10:00:00Z');
  e.finalDate = null;
  e.description = null;
  e.recurrenceType = null;
  e.imageUrl = null;
  e.createdAt = new Date();
  e.updatedAt = new Date();
  return Object.assign(e, overrides);
}

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('remove() deletes event by id', async () => {
    mockRepo.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove(12)).resolves.toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith(12);
  });

  it('remove() throws NotFoundException for missing event', async () => {
    mockRepo.delete.mockResolvedValue({ affected: 0 });
    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });

  describe('findPaginated', () => {
    it('excludes one-time past events', async () => {
      const past = makeEvent({ initialDate: new Date('2020-01-01T00:00:00Z') });
      mockRepo.find.mockResolvedValue([past]);
      const result = await service.findPaginated(1, 10);
      expect(result).toHaveLength(0);
    });

    it('includes one-time future events', async () => {
      const future = makeEvent({
        initialDate: new Date('2099-12-31T10:00:00Z'),
      });
      mockRepo.find.mockResolvedValue([future]);
      const result = await service.findPaginated(1, 10);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Event');
    });

    it('expands a WEEKLY event starting in the past into future occurrences', async () => {
      const base = new Date();
      base.setDate(base.getDate() - 21);
      const weekly = makeEvent({ initialDate: base, recurrenceType: 'WEEKLY' });
      mockRepo.find.mockResolvedValue([weekly]);
      const result = await service.findPaginated(1, 5);
      expect(result.length).toBeGreaterThan(0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result.forEach((r) => {
        expect(new Date(r.initial_date).getTime()).toBeGreaterThanOrEqual(
          today.getTime(),
        );
      });
    });

    it('expands a MONTHLY event and returns sorted occurrences', async () => {
      const base = new Date();
      base.setMonth(base.getMonth() - 1);
      const monthly = makeEvent({
        id: 1,
        initialDate: base,
        recurrenceType: 'MONTHLY',
      });
      mockRepo.find.mockResolvedValue([monthly]);
      const result = await service.findPaginated(1, 5);
      expect(result.length).toBeGreaterThan(0);
      for (let i = 1; i < result.length; i++) {
        expect(
          new Date(result[i].initial_date).getTime(),
        ).toBeGreaterThanOrEqual(
          new Date(result[i - 1].initial_date).getTime(),
        );
      }
    });

    it('applies pagination correctly', async () => {
      const base = new Date();
      const weekly = makeEvent({ initialDate: base, recurrenceType: 'WEEKLY' });
      mockRepo.find.mockResolvedValue([weekly]);
      const page1 = await service.findPaginated(1, 3);
      const page2 = await service.findPaginated(2, 3);
      expect(page1).toHaveLength(3);
      expect(page2.length).toBeGreaterThan(0);
      const page1Dates = page1.map((e) => String(e.initial_date));
      const page2Dates = page2.map((e) => String(e.initial_date));
      page2Dates.forEach((d) => expect(page1Dates).not.toContain(d));
    });

    it('stops generating occurrences beyond 2-year lookahead', async () => {
      const base = new Date();
      const daily = makeEvent({ initialDate: base, recurrenceType: 'DAILY' });
      mockRepo.find.mockResolvedValue([daily]);
      const result = await service.findPaginated(1, 10000);
      expect(result.length).toBeLessThanOrEqual(731);
    });
  });
});
