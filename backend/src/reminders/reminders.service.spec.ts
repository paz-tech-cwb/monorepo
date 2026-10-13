import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RemindersService } from './reminders.service';
import { ReminderRule } from './entities/reminder-rule.entity';

describe('RemindersService', () => {
  let service: RemindersService;
  let repo: jest.Mocked<Repository<ReminderRule>>;
  let saveMock: jest.Mock;

  beforeEach(async () => {
    saveMock = jest.fn((x: unknown) => Promise.resolve(x));
    const moduleRef = await Test.createTestingModule({
      providers: [
        RemindersService,
        {
          provide: getRepositoryToken(ReminderRule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: saveMock,
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
    expect(saveMock).toHaveBeenCalled();
  });

  it('update rejects an invalid life_group_tasks config', async () => {
    repo.findOne.mockResolvedValue({
      id: 2,
      type: 'life_group_tasks',
      enabled: true,
      config: {},
    } as ReminderRule);
    await expect(
      service.update(2, {
        config: { days_before_meeting: [], hour: 9 } as never,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('update accepts a valid life_group_tasks config', async () => {
    repo.findOne.mockResolvedValue({
      id: 2,
      type: 'life_group_tasks',
      enabled: true,
      config: {},
    } as ReminderRule);
    const result = await service.update(2, {
      config: { days_before_meeting: [3, 1], hour: 9 } as never,
    });
    expect(result.config).toEqual({ days_before_meeting: [3, 1], hour: 9 });
  });

  it('update rejects an invalid life_group_attendance followup config', async () => {
    repo.findOne.mockResolvedValue({
      id: 4,
      type: 'life_group_attendance',
      enabled: true,
      config: {},
    } as ReminderRule);
    await expect(
      service.update(4, {
        config: { hours_after_meeting_start: 2, followup_hour: 30 } as never,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('update accepts a valid life_group_attendance config with the V2 fields', async () => {
    repo.findOne.mockResolvedValue({
      id: 4,
      type: 'life_group_attendance',
      enabled: true,
      config: {},
    } as ReminderRule);
    const config = {
      hours_after_meeting_start: 2,
      followup_hour: 9,
      followup_interval_days: 1,
      followup_max_days: 5,
      escalation_after_days: 5,
    };
    const result = await service.update(4, { config: config as never });
    expect(result.config).toEqual(config);
  });
});
