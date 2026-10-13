/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- supertest bodies and raw query rows are untyped */
import {
  ClassSerializerInterceptor,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import ormConfig from '../configs/orm.config';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../common/constants/global-validation-pipe-options';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { User } from '../users/entities/user.entity';
import { LifeGroupAnalyticsModule } from './life-group-analytics.module';

/**
 * OPT-IN integration spec against a REAL PostgreSQL that already has every
 * migration applied. Skipped unless ANALYTICS_PG_PORT is set:
 *
 *   ANALYTICS_PG_HOST=127.0.0.1 ANALYTICS_PG_PORT=5432 ANALYTICS_PG_USER=... \
 *   ANALYTICS_PG_PASSWORD=... ANALYTICS_PG_DB=... npx jest life-group-analytics.integration
 *
 * Seeds its own fixtures (ids 9301+) next to whatever else is in the DB and
 * removes them afterwards. Use a throwaway database.
 *
 * Fixture: group 9301 'Centro' (4 members, 2 kids), group 9302 'Norte' (2
 * members, 5 kids), 3 users with NO group, a sector supervisor of both groups,
 * a leader of 9301 (role member) and an unrelated outsider.
 */
const enabled = !!process.env.ANALYTICS_PG_PORT;
const maybe = enabled ? describe : describe.skip;

const YEAR = 2025;

maybe('life-group-analytics (real PostgreSQL)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const as = (userId: number) => ({ 'x-test-user': String(userId) });
  const http = () => request(app.getHttpServer());
  const num = async (sql: string) =>
    Number((await ds.query(sql))[0].c as string);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...ormConfig,
          host: process.env.ANALYTICS_PG_HOST ?? '127.0.0.1',
          port: Number(process.env.ANALYTICS_PG_PORT),
          username: process.env.ANALYTICS_PG_USER,
          password: process.env.ANALYTICS_PG_PASSWORD,
          database: process.env.ANALYTICS_PG_DB,
          synchronize: false,
          migrationsRun: false,
          logging: false,
        } as never),
        FormsCoreModule,
        LifeGroupAnalyticsModule,
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: async (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<{
            headers: Record<string, string>;
            user?: unknown;
          }>();
          req.user = await ds.getRepository(User).findOne({
            where: { id: Number(req.headers['x-test-user']) },
            relations: ['role'],
          });
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector), {
        strategy: 'excludeAll',
        excludeExtraneousValues: true,
      }),
    );
    await app.init();
    ds = app.get(DataSource);

    await ds.query(`
      INSERT INTO users (id, name, role_id) VALUES
       (9301,'Leader Centro',6),(9302,'Ana',6),(9303,'Bruno',6),(9304,'Carla',6),
       (9305,'Davi',6),(9306,'Eva',6),
       (9307,'NoGroup1',6),(9308,'NoGroup2',6),(9309,'NoGroup3',6),
       (9310,'Sector sup',4),(9311,'Admin',1),(9312,'Outsider',6),(9313,'Leader Norte',6)
      ON CONFLICT DO NOTHING;
      INSERT INTO areas (id,name,church_id,leader_id) VALUES (9301,'A1',1,NULL) ON CONFLICT DO NOTHING;
      INSERT INTO sectors (id,name,area_id,leader_id) VALUES (9301,'Setor Um',9301,9310) ON CONFLICT DO NOTHING;
      INSERT INTO life_groups (id,name,leader_id,co_leader_id,"sectorId",meeting_day,kids_count) VALUES
       (9301,'Centro',9301,NULL,9301,'Quarta-feira',2),
       (9302,'Norte',9313,NULL,9301,'Quarta-feira',5)
      ON CONFLICT DO NOTHING;
      -- Members: 9301 leads group 9301 and is also on its roster; the sector
      -- users below sit in the supervisor's sector.
      INSERT INTO user_life_groups (user_id,life_group_id) VALUES
       (9301,9301),(9302,9301),(9303,9301),(9304,9301),(9305,9302),(9306,9302)
      ON CONFLICT DO NOTHING;
      INSERT INTO life_group_attendance (life_group_id, meeting_date, present_count, members_count, is_extra, recorded_by) VALUES
       (9301,'${YEAR}-03-05',3,4,false,9301),
       (9301,'${YEAR}-03-12',4,4,false,9301),
       (9301,'${YEAR}-03-19',2,4,true,9301),
       (9302,'${YEAR}-03-05',2,2,false,9301),
       (9302,'${YEAR}-04-02',1,2,false,9301)
      ON CONFLICT DO NOTHING;
    `);
  });

  afterAll(async () => {
    await ds.query(`
      DELETE FROM life_group_attendance WHERE life_group_id IN (9301,9302);
      DELETE FROM user_life_groups WHERE life_group_id IN (9301,9302);
      DELETE FROM life_groups WHERE id IN (9301,9302);
      DELETE FROM sectors WHERE id = 9301;
      DELETE FROM areas WHERE id = 9301;
      DELETE FROM users WHERE id BETWEEN 9301 AND 9313;
    `);
    await app.close();
  });

  describe('overview', () => {
    it('unscoped admin: unchanged whole-table figures (members in groups AND without group)', async () => {
      const totalUsers = await num('SELECT count(*)::int AS c FROM users');
      const inGroups = await num(
        'SELECT count(DISTINCT user_id)::int AS c FROM user_life_groups',
      );
      const res = await http()
        .get('/life-group-analytics/overview')
        .set(as(9311))
        .expect(200);
      expect(res.body.life_group_id).toBeNull();
      expect(res.body.members_total).toBe(totalUsers);
      expect(res.body.members_in_group).toBe(inGroups);
      // Fixture alone guarantees at least 3 users outside any group.
      expect(
        res.body.members_total - res.body.members_in_group,
      ).toBeGreaterThanOrEqual(3);
      const ids = res.body.life_groups.map((g: { id: number }) => g.id);
      expect(ids).toEqual(expect.arrayContaining([9301, 9302]));
    });

    it('admin scoped to group 9301: EVERY figure restricted to that group', async () => {
      const res = await http()
        .get('/life-group-analytics/overview')
        .query({ life_group_id: '9301' })
        .set(as(9311))
        .expect(200);
      expect(res.body).toEqual({
        life_group_id: 9301,
        total_kids: 2,
        avg_members_per_group: 4,
        groups_by_sector: [{ label: 'Setor Um', count: 1 }],
        members_in_group: 4,
        members_total: 4,
        life_groups: [{ id: 9301, name: 'Centro' }],
      });
    });

    it('admin scoped to group 9302', async () => {
      const res = await http()
        .get('/life-group-analytics/overview')
        .query({ life_group_id: '9302' })
        .set(as(9311))
        .expect(200);
      expect(res.body).toMatchObject({
        life_group_id: 9302,
        total_kids: 5,
        members_in_group: 2,
        members_total: 2,
      });
    });

    it('leader (role member) of 9301 gets the scoped figures and 403 for the other group', async () => {
      const ok = await http()
        .get('/life-group-analytics/overview')
        .query({ life_group_id: '9301' })
        .set(as(9301))
        .expect(200);
      expect(ok.body.members_total).toBe(4);
      expect(ok.body.members_in_group).toBe(4);
      const denied = await http()
        .get('/life-group-analytics/overview')
        .query({ life_group_id: '9302' })
        .set(as(9301))
        .expect(403);
      expect(denied.body.code).toBe('life_group_access_forbidden');
    });

    it('sector supervisor scoped to a group in the sector: only that group (no sector-wide union)', async () => {
      const res = await http()
        .get('/life-group-analytics/overview')
        .query({ life_group_id: '9302' })
        .set(as(9310))
        .expect(200);
      expect(res.body.members_total).toBe(2);
      expect(res.body.life_groups).toEqual([{ id: 9302, name: 'Norte' }]);
    });

    it('outsider: 403; unknown group for admin: 404 group_not_found; bad id: 400', async () => {
      await http()
        .get('/life-group-analytics/overview')
        .query({ life_group_id: '9301' })
        .set(as(9312))
        .expect(403);
      const nf = await http()
        .get('/life-group-analytics/overview')
        .query({ life_group_id: '999999' })
        .set(as(9311))
        .expect(404);
      expect(nf.body.code).toBe('group_not_found');
      await http()
        .get('/life-group-analytics/overview')
        .query({ life_group_id: 'abc' })
        .set(as(9311))
        .expect(400);
    });
  });

  describe('attendance and distribution scoped to the same group', () => {
    it('monthly buckets count only the group (March: 3 meetings of 9301, 1 extra)', async () => {
      const res = await http()
        .get('/life-group-analytics/attendance')
        .query({ year: String(YEAR), life_group_id: '9301' })
        .set(as(9311))
        .expect(200);
      const march = res.body.rows.find(
        (r: { period: string }) => r.period === `${YEAR}-03`,
      );
      expect(march).toMatchObject({
        meetings_count: 3,
        extra_meetings_count: 1,
        present_count: 9,
        members_count: 12,
      });
      const april = res.body.rows.find(
        (r: { period: string }) => r.period === `${YEAR}-04`,
      );
      expect(april.meetings_count).toBe(0);
    });

    it('per-meeting rows count only the group (2025-03-05 is 3/4, not 5/6)', async () => {
      const res = await http()
        .get('/life-group-analytics/attendance')
        .query({
          year: String(YEAR),
          month: '3',
          granularity: 'meeting',
          life_group_id: '9301',
        })
        .set(as(9311))
        .expect(200);
      const first = res.body.rows.find(
        (r: { period: string }) => r.period === `${YEAR}-03-05`,
      );
      expect(first).toMatchObject({ present_count: 3, members_count: 4 });
    });

    it('unscoped attendance still sums both groups (unchanged)', async () => {
      const res = await http()
        .get('/life-group-analytics/attendance')
        .query({ year: String(YEAR), month: '3', granularity: 'meeting' })
        .set(as(9311))
        .expect(200);
      const first = res.body.rows.find(
        (r: { period: string }) => r.period === `${YEAR}-03-05`,
      );
      expect(first).toMatchObject({ present_count: 5, members_count: 6 });
    });

    it('distribution scoped to one group counts one group', async () => {
      const res = await http()
        .get('/life-group-analytics/distribution')
        .query({ life_group_id: '9301' })
        .set(as(9311))
        .expect(200);
      expect(res.body.by_day).toEqual([{ label: 'Quarta-feira', count: 1 }]);
    });
  });
});
