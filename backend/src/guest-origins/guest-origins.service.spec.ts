import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GuestOriginsService } from './guest-origins.service';
import { GuestOrigin } from './entities/guest-origin.entity';

function makeQueryBuilder() {
  const qb = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
  };
  return qb;
}

const mockInjectedRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
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
    const managerQb = makeQueryBuilder();
    const managerRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockReturnValue({ userId: 1, originType: 'casa_de_paz' }),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(managerQb),
    };
    managerRepo.findOne
      .mockResolvedValueOnce(null) // initial check finds nothing
      .mockResolvedValueOnce({
        id: 'go-1',
        userId: 1,
        originType: 'casa_de_paz',
      }); // read-after-insert
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
    expect(managerRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { userId: 1 },
    });
    expect(managerQb.insert).toHaveBeenCalled();
    expect(managerQb.orIgnore).toHaveBeenCalled();
    expect(managerQb.execute).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'go-1',
      userId: 1,
      originType: 'casa_de_paz',
    });
    // The write must happen entirely on the manager's connection — the
    // injected (pool) repo must never be touched for this call, otherwise
    // it would be a separate DB connection outside the open transaction.
    expect(mockInjectedRepo.findOne).not.toHaveBeenCalled();
    expect(mockInjectedRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('ensureForUser() falls back to the injected repo when no manager is passed', async () => {
    const qb = makeQueryBuilder();
    mockInjectedRepo.createQueryBuilder.mockReturnValue(qb);
    mockInjectedRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'go-2', userId: 2, originType: 'self' });

    const result = await service.ensureForUser(2, { originType: 'self' });

    expect(qb.execute).toHaveBeenCalled();
    expect(result).toEqual({ id: 'go-2', userId: 2, originType: 'self' });
  });

  it('ensureForUser() returns the existing row instead of racing a unique-violation error (non-transactional)', async () => {
    const racedRow = { id: 'go-3', userId: 3, originType: 'casa_de_paz' };
    const qb = makeQueryBuilder();
    mockInjectedRepo.createQueryBuilder.mockReturnValue(qb);
    mockInjectedRepo.findOne
      .mockResolvedValueOnce(null) // initial check-then-insert read finds nothing
      .mockResolvedValueOnce(racedRow); // re-read after orIgnore no-op

    const result = await service.ensureForUser(3, {
      originType: 'casa_de_paz',
      casaDePazId: 'cycle-1',
    });

    expect(result).toEqual(racedRow);
    expect(qb.orIgnore).toHaveBeenCalled();
    expect(mockInjectedRepo.findOne).toHaveBeenCalledTimes(2);
  });

  it('ensureForUser() with a manager preserves the pre-existing row and never overwrites it (first-origin-wins)', async () => {
    const preExisting = {
      id: 'go-4',
      userId: 4,
      originType: 'invited_by_member',
      invitedByText: 'original inviter',
    };
    const managerQb = makeQueryBuilder();
    const managerRepo = {
      findOne: jest.fn().mockResolvedValue(preExisting),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(managerQb),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(managerRepo),
    } as unknown as import('typeorm').EntityManager;

    const result = await service.ensureForUser(
      4,
      { originType: 'casa_de_paz', casaDePazId: 'cycle-2' },
      manager,
    );

    // Row already existed — ensureForUser returns it as-is without ever
    // attempting an insert/upsert, so the original origin is preserved.
    expect(result).toEqual(preExisting);
    expect(managerQb.execute).not.toHaveBeenCalled();
    expect(mockInjectedRepo.findOne).not.toHaveBeenCalled();
  });
});
