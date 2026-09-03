import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RemindersService } from './reminders.service';
import { ReminderRule } from './entities/reminder-rule.entity';

describe('RemindersService', () => {
  let service: RemindersService;
  let repo: jest.Mocked<Repository<ReminderRule>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RemindersService,
        {
          provide: getRepositoryToken(ReminderRule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn((x) => Promise.resolve(x)),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(RemindersService);
    repo = moduleRef.get(getRepositoryToken(ReminderRule));
  });

  it('findAll returns all rules', async () => {
    repo.find.mockResolvedValue([{ id: 1 } as ReminderRule]);
    await expect(service.findAll()).resolves.toHaveLength(1);
  });

  it('update throws when rule missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.update(99, { enabled: true })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update merges enabled + config', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      enabled: false,
      config: { lead_times_hours: [24] },
    } as ReminderRule);
    const result = await service.update(1, {
      enabled: true,
      config: { lead_times_hours: [12, 1] } as never,
    });
    expect(result.enabled).toBe(true);
    expect(repo.save).toHaveBeenCalled();
  });
});
