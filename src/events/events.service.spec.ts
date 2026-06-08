import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';

const mockEventsRepository = {
  delete: jest.fn(),
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: mockEventsRepository },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('remove() deletes the event by id', async () => {
    mockEventsRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.remove(12)).resolves.toBeUndefined();

    expect(mockEventsRepository.delete).toHaveBeenCalledWith(12);
  });

  it('remove() throws NotFoundException when the event does not exist', async () => {
    mockEventsRepository.delete.mockResolvedValue({ affected: 0 });

    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });
});
