/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- untyped in-memory test double */
import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';

type Row = Record<string, any>;
type Ctor = new () => object;

/**
 * Minimal in-memory EntityManager for service specs: only the calls the
 * attendance/meetings/report-snapshot code makes. `transaction()` snapshots
 * every table and restores it when the callback throws, so rollback behavior
 * is observable. The real-database behavior (locks, unique index, FK) is
 * covered by the opt-in integration spec.
 */
export class FakeEntityManager {
  tables = new Map<Ctor, Row[]>();
  queries: Array<{ sql: string; params?: unknown[] }> = [];
  failOnSave?: (entity: Ctor, row: Row) => Error | undefined;

  rows(entity: Ctor): Row[] {
    let t = this.tables.get(entity);
    if (!t) {
      t = [];
      this.tables.set(entity, t);
    }
    return t;
  }

  seed(entity: Ctor, ...rows: Row[]) {
    this.rows(entity).push(...rows);
  }

  private matches(row: Row, where: Row = {}): boolean {
    return Object.entries(where).every(([key, expected]) => {
      if (expected && typeof expected === 'object' && 'type' in expected) {
        // FindOperator: only IsNull() is used.
        if (expected.type === 'isNull') return row[key] == null;
        throw new Error(`Unsupported operator ${String(expected.type)}`);
      }
      return row[key] === expected;
    });
  }

  private hydrate(entity: Ctor, row: Row, relations: string[] = []): Row {
    const name = entity.name;
    if (name === 'LifeGroupAttendance' && relations.includes('entries')) {
      const entries = this.rows(this.entryCtor()).filter(
        (e) => e.attendance?.id === row.id,
      );
      if (relations.includes('entries.user')) {
        for (const e of entries) {
          e.user = this.userRows().find((u) => u.id === e.userId) ?? {
            id: e.userId,
            name: `user-${e.userId}`,
          };
        }
      }
      row.entries = entries;
    }
    return row;
  }

  private entryCtor(): Ctor {
    return [...this.tables.keys()].find(
      (k) => k.name === 'LifeGroupAttendanceEntry',
    ) as Ctor;
  }

  private userRows(): Row[] {
    const ctor = [...this.tables.keys()].find((k) => k.name === 'User');
    return ctor ? this.rows(ctor) : [];
  }

  findOne = jest.fn(
    (
      entity: Ctor,
      opts: { where?: Row; relations?: string[] },
    ): Promise<Row | null> => {
      const row = this.rows(entity).find((r) => this.matches(r, opts.where));
      return Promise.resolve(
        row ? this.hydrate(entity, row, opts.relations) : null,
      );
    },
  );

  find = jest.fn(
    (
      entity: Ctor,
      opts: { where?: Row; relations?: string[]; order?: Row },
    ): Promise<Row[]> => {
      const found = this.rows(entity)
        .filter((r) => this.matches(r, opts.where))
        .sort((a, b) =>
          opts.order && 'createdAt' in opts.order
            ? +new Date(a.createdAt) - +new Date(b.createdAt)
            : 0,
        );
      return Promise.resolve(
        found.map((r) => this.hydrate(entity, r, opts.relations)),
      );
    },
  );

  create = jest.fn(
    (entity: Ctor, value: Row): Row => Object.assign(new entity(), value),
  );

  save = jest.fn((entityOrRow: Ctor | Row, maybeRow?: Row | Row[]) => {
    const entity = (maybeRow ? entityOrRow : undefined) as Ctor | undefined;
    const value = (maybeRow ?? entityOrRow) as Row | Row[];
    if (!entity) throw new Error('save(entity, row) expected');
    const list = Array.isArray(value) ? value : [value];
    for (const row of list) {
      const err = this.failOnSave?.(entity, row);
      if (err) return Promise.reject(err);
      const table = this.rows(entity);
      if (entity.name === 'LifeGroupAttendanceEntry') {
        row.id ??= randomUUID();
        row.attendance = { id: row.attendance?.id };
      } else if (
        ['LifeGroupAttendance', 'LifeGroupReport'].includes(entity.name)
      ) {
        row.id ??= randomUUID();
        row.createdAt ??= new Date(table.length + 1);
        row.updatedAt = new Date();
        row.deletedAt ??= null;
      }
      if (!table.includes(row)) table.push(row);
    }
    return Promise.resolve(Array.isArray(value) ? list : list[0]);
  });

  query = jest.fn((sql: string, params?: unknown[]) => {
    this.queries.push({ sql, params });
    if (sql.includes('is_extra = true') && sql.includes('count(*)')) {
      // Extra-meeting cap count: (group, from, to).
      const [groupId, from, to] = params as [number, string, string];
      const attendanceCtor = [...this.tables.keys()].find(
        (k) => k.name === 'LifeGroupAttendance',
      );
      const c = attendanceCtor
        ? this.rows(attendanceCtor).filter(
            (r) =>
              r.lifeGroupId === groupId &&
              r.isExtra === true &&
              r.meetingDate >= from &&
              r.meetingDate <= to,
          ).length
        : 0;
      return Promise.resolve([{ c }]);
    }
    return Promise.resolve([]);
  });

  getRepository = jest.fn();

  async transaction<T>(cb: (trx: EntityManager) => Promise<T>): Promise<T> {
    const snapshot = new Map<Ctor, Row[]>();
    for (const [k, rows] of this.tables) {
      snapshot.set(
        k,
        rows.map((r) =>
          Object.assign(Object.create(Object.getPrototypeOf(r)), r),
        ),
      );
    }
    try {
      return await cb(this as unknown as EntityManager);
    } catch (err) {
      this.tables = snapshot;
      throw err;
    }
  }
}
