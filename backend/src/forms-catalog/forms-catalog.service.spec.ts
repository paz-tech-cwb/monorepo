import { Test } from '@nestjs/testing';
import { FormsCatalogService } from './forms-catalog.service';
import { MinistryAccessService } from '../ministry-access/ministry-access.service';

describe('FormsCatalogService', () => {
  let service: FormsCatalogService;
  let ministryAccess: { resolve: jest.Mock };

  beforeEach(async () => {
    ministryAccess = { resolve: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        FormsCatalogService,
        { provide: MinistryAccessService, useValue: ministryAccess },
      ],
    }).compile();
    service = module.get(FormsCatalogService);
  });

  it('gives admin full access to service-reports without querying ministry tables', async () => {
    const result = await service.listForRole({ id: 1, roleSlug: 'admin' });

    const serviceReports = result.find((f) => f.slug === 'service-reports');
    expect(serviceReports).toMatchObject({ can_read: true, can_write: true });
    expect(ministryAccess.resolve).not.toHaveBeenCalled();
  });

  it('gives a ministry leader (global role member) read+write on service-reports', async () => {
    ministryAccess.resolve.mockResolvedValue({
      isLeader: true,
      isMember: false,
    });

    const result = await service.listForRole({ id: 10, roleSlug: 'member' });

    const serviceReports = result.find((f) => f.slug === 'service-reports');
    expect(serviceReports).toMatchObject({ can_read: true, can_write: true });
    expect(ministryAccess.resolve).toHaveBeenCalledWith(10, 'atmosfera');
  });

  it('gives a plain ministry member (global role member) write-only on service-reports', async () => {
    ministryAccess.resolve.mockResolvedValue({
      isLeader: false,
      isMember: true,
    });

    const result = await service.listForRole({ id: 11, roleSlug: 'member' });

    const serviceReports = result.find((f) => f.slug === 'service-reports');
    expect(serviceReports).toMatchObject({ can_read: false, can_write: true });
  });

  it('excludes service-reports for an unrelated member', async () => {
    ministryAccess.resolve.mockResolvedValue({
      isLeader: false,
      isMember: false,
    });

    const result = await service.listForRole({ id: 12, roleSlug: 'member' });

    expect(result.find((f) => f.slug === 'service-reports')).toBeUndefined();
  });

  it('leaves non-ministry-linked forms on static role arrays', async () => {
    const result = await service.listForRole({ id: 1, roleSlug: 'admin' });

    const memberRegistrations = result.find(
      (f) => f.slug === 'member-registrations',
    );
    expect(memberRegistrations).toMatchObject({
      can_read: true,
      can_write: true,
    });
    expect(ministryAccess.resolve).not.toHaveBeenCalled();
  });
});
