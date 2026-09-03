import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MinistryAccessService } from './ministry-access.service';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';

describe('MinistryAccessService', () => {
  let service: MinistryAccessService;
  let ministryRepo: { findOne: jest.Mock };
  let teamRepo: { find: jest.Mock };

  beforeEach(async () => {
    ministryRepo = { findOne: jest.fn() };
    teamRepo = { find: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MinistryAccessService,
        { provide: getRepositoryToken(Ministry), useValue: ministryRepo },
        { provide: getRepositoryToken(MinistryTeam), useValue: teamRepo },
      ],
    }).compile();

    service = module.get(MinistryAccessService);
  });

  it('returns isLeader=true when user is the ministry leader', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 10 },
      coLeader: null,
      members: [],
    });
    teamRepo.find.mockResolvedValue([]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: true, isMember: false });
  });

  it('returns isLeader=true when user is a team co-leader', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 999 },
      coLeader: null,
      members: [],
    });
    teamRepo.find.mockResolvedValue([
      { id: 5, leader: { id: 999 }, coLeader: { id: 10 }, members: [] },
    ]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: true, isMember: false });
  });

  it('returns isMember=true when user is a plain ministry member', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 999 },
      coLeader: null,
      members: [{ id: 10 }],
    });
    teamRepo.find.mockResolvedValue([]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: false, isMember: true });
  });

  it('returns isMember=true when user is a plain team member', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 999 },
      coLeader: null,
      members: [],
    });
    teamRepo.find.mockResolvedValue([
      { id: 5, leader: { id: 999 }, coLeader: null, members: [{ id: 10 }] },
    ]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: false, isMember: true });
  });

  it('returns both false for an unrelated user', async () => {
    ministryRepo.findOne.mockResolvedValue({
      id: 1,
      leader: { id: 999 },
      coLeader: null,
      members: [],
    });
    teamRepo.find.mockResolvedValue([]);

    const result = await service.resolve(10, 'atmosfera');

    expect(result).toEqual({ isLeader: false, isMember: false });
  });

  it('returns both false when the ministry slug does not exist', async () => {
    ministryRepo.findOne.mockResolvedValue(null);
    teamRepo.find.mockResolvedValue([]);

    const result = await service.resolve(10, 'unknown-slug');

    expect(result).toEqual({ isLeader: false, isMember: false });
  });
});
