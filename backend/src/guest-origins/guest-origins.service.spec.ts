import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GuestOriginsService } from './guest-origins.service';
import { GuestOrigin } from './entities/guest-origin.entity';

const mockInjectedRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('GuestOriginsService', () => {
  let service: GuestOriginsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestOriginsService,
        {
          provide: getRepositoryToken(GuestOrigin),
          useValue: mockInjectedRepo,
        },
      ],
    }).compile();
    service = module.get<GuestOriginsService>(GuestOriginsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('ensureForUser() uses the transactional manager repo when provided, not the injected one', async () => {
    const managerRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockReturnValue({ userId: 1, originType: 'casa_de_paz' }),
      save: jest.fn().mockResolvedValue({
        id: 'go-1',
        userId: 1,
        originType: 'casa_de_paz',
      }),
    };
    const getRepository = jest.fn().mockReturnValue(managerRepo);
    const manager = {
      getRepository,
    } as unknown as import('typeorm').EntityManager;

    const result = await service.ensureForUser(
      1,
      { originType: 'casa_de_paz', casaDePazId: 'cycle-1' },
      manager,
    );

    expect(getRepository).toHaveBeenCalledWith(GuestOrigin);
    expect(managerRepo.findOne).toHaveBeenCalledWith({ where: { userId: 1 } });
    expect(managerRepo.save).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'go-1',
      userId: 1,
      originType: 'casa_de_paz',
    });
    // The write must happen entirely on the manager's connection — the
    // injected (pool) repo must never be touched for this call, otherwise
    // it would be a separate DB connection outside the open transaction.
    expect(mockInjectedRepo.findOne).not.toHaveBeenCalled();
    expect(mockInjectedRepo.save).not.toHaveBeenCalled();
  });

  it('ensureForUser() falls back to the injected repo when no manager is passed', async () => {
    mockInjectedRepo.findOne.mockResolvedValue(null);
    mockInjectedRepo.create.mockReturnValue({ userId: 2, originType: 'self' });
    mockInjectedRepo.save.mockResolvedValue({
      id: 'go-2',
      userId: 2,
      originType: 'self',
    });

    const result = await service.ensureForUser(2, { originType: 'self' });

    expect(mockInjectedRepo.save).toHaveBeenCalled();
    expect(result).toEqual({ id: 'go-2', userId: 2, originType: 'self' });
  });

  it('ensureForUser() returns the existing row instead of throwing on a unique-violation race', async () => {
    const racedRow = { id: 'go-3', userId: 3, originType: 'casa_de_paz' };
    mockInjectedRepo.findOne
      .mockResolvedValueOnce(null) // initial check-then-insert read finds nothing
      .mockResolvedValueOnce(racedRow); // re-read after the race loses
    mockInjectedRepo.create.mockReturnValue({
      userId: 3,
      originType: 'casa_de_paz',
    });
    const uniqueViolation = { code: '23505' };
    mockInjectedRepo.save.mockRejectedValue(uniqueViolation);

    const result = await service.ensureForUser(3, {
      originType: 'casa_de_paz',
      casaDePazId: 'cycle-1',
    });

    expect(result).toEqual(racedRow);
    expect(mockInjectedRepo.findOne).toHaveBeenCalledTimes(2);
  });
});
