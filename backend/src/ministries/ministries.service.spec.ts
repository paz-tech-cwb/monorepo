import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { MinistriesService } from './ministries.service';
import { Ministry } from './entities/ministry.entity';
import { MinistryTeam } from './entities/ministry-team.entity';

describe('MinistriesService', () => {
  let service: MinistriesService;
  let ministryRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    ministryRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
    };
    const teamRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
      find: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinistriesService,
        { provide: getRepositoryToken(Ministry), useValue: ministryRepo },
        { provide: getRepositoryToken(MinistryTeam), useValue: teamRepo },
      ],
    }).compile();
    service = module.get(MinistriesService);
  });

  it('rejects adding a direct member to a teams-mode ministry', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      membershipMode: 'teams',
      members: [],
    });
    await expect(service.addMinistryMember(1, 5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('adds a direct member to a direct-mode ministry', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      membershipMode: 'direct',
      members: [],
    });
    await service.addMinistryMember(1, 5);
    expect(ministryRepo.save).toHaveBeenCalled();
  });

  it('sets both leader and co_leader on create', async () => {
    ministryRepo.save.mockImplementation((x) => ({ ...x, id: 1 }));
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 2, name: 'Leader' },
      coLeader: { id: 3, name: 'Co Leader' },
      members: [],
      teams: [],
    });
    const result: any = await service.createMinistry({
      name: 'Louvor',
      leaderId: 2,
      coLeaderId: 3,
    } as any);
    expect(result.leader).toEqual({ id: 2, name: 'Leader' });
    expect(result.coLeader).toEqual({ id: 3, name: 'Co Leader' });
  });

  it('persists the dto and returns the relation-loaded entity', async () => {
    ministryRepo.save.mockImplementation((x) => ({ ...x, id: 42 }));
    const findMinistrySpy = jest
      .spyOn(service, 'findMinistry')
      .mockResolvedValue({ id: 42 } as any);

    const result = await service.createMinistry({
      name: 'Louvor',
      leaderId: 2,
    } as any);

    expect(ministryRepo.save).toHaveBeenCalled();
    expect(findMinistrySpy).toHaveBeenCalledWith(42);
    expect(result).toEqual({ id: 42 });
  });

  it('defaults membershipMode to teams when omitted', async () => {
    ministryRepo.save.mockImplementation((x) => ({ ...x, id: 1 }));
    jest.spyOn(service, 'findMinistry').mockResolvedValue({ id: 1 } as any);

    await service.createMinistry({
      name: 'Louvor',
      leaderId: 2,
    } as any);

    expect(ministryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ membershipMode: 'teams' }),
    );
  });
});
