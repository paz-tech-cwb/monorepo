import { Test } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { FormsCatalogService } from './forms-catalog.service';
import { MinistryAccessService } from '../ministry-access/ministry-access.service';

describe('FormsCatalogService', () => {
  let service: FormsCatalogService;
  let ministryAccess: { resolve: jest.Mock };
  let leadsGroup: boolean;
  const lgQb = {
    where: jest.fn().mockReturnThis(),
    getExists: jest.fn(),
  };
  const em = { createQueryBuilder: jest.fn().mockReturnValue(lgQb) };

  beforeEach(async () => {
    ministryAccess = { resolve: jest.fn() };
    leadsGroup = false;
    em.createQueryBuilder.mockClear();
    lgQb.getExists.mockImplementation(() => Promise.resolve(leadsGroup));
    const module = await Test.createTestingModule({
      providers: [
        FormsCatalogService,
        { provide: MinistryAccessService, useValue: ministryAccess },
        { provide: getEntityManagerToken(), useValue: em },
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

  it('gives a life_group_leader write access to casa-de-paz-reports', async () => {
    ministryAccess.resolve.mockResolvedValue({
      isLeader: false,
      isMember: false,
    });

    const result = await service.listForRole({
      id: 20,
      roleSlug: 'life_group_leader',
    });

    const casaDePazReports = result.find(
      (f) => f.slug === 'casa-de-paz-reports',
    );
    expect(casaDePazReports).toMatchObject({
      can_read: true,
      can_write: true,
    });
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

  describe('life-group-reports visibility', () => {
    const find = (r: Array<{ slug: string }>) =>
      r.find((f) => f.slug === 'life-group-reports');

    it('shows it to a member-role actor who leads or co-leads a life group', async () => {
      ministryAccess.resolve.mockResolvedValue({
        isLeader: false,
        isMember: false,
      });
      leadsGroup = true;

      const result = await service.listForRole({ id: 30, roleSlug: 'member' });

      expect(find(result)).toMatchObject({ can_read: true, can_write: true });
      expect(lgQb.where).toHaveBeenCalledWith(
        'lg.leader_id = :actorId OR lg.co_leader_id = :actorId',
        { actorId: 30 },
      );
    });

    it('hides it from a plain member who leads nothing', async () => {
      ministryAccess.resolve.mockResolvedValue({
        isLeader: false,
        isMember: false,
      });

      const result = await service.listForRole({ id: 31, roleSlug: 'member' });

      expect(find(result)).toBeUndefined();
    });

    it('keeps it for life_group_leader / area / sector leaders without querying groups', async () => {
      ministryAccess.resolve.mockResolvedValue({
        isLeader: false,
        isMember: false,
      });
      for (const roleSlug of [
        'life_group_leader',
        'area_leader',
        'sector_leader',
        'admin',
        'pastor',
      ]) {
        const result = await service.listForRole({ id: 32, roleSlug });
        expect(find(result)).toMatchObject({ can_read: true, can_write: true });
      }
      expect(em.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('does not widen other role-gated forms for a member-role leader', async () => {
      ministryAccess.resolve.mockResolvedValue({
        isLeader: false,
        isMember: false,
      });
      leadsGroup = true;

      const result = await service.listForRole({ id: 33, roleSlug: 'member' });
      const slugs = result.map((f) => f.slug);

      expect(slugs).toContain('life-group-reports');
      expect(slugs).toContain('form-guests'); // already write for member
      expect(slugs).not.toContain('member-registrations');
      expect(slugs).not.toContain('multiplications');
    });
  });
});
