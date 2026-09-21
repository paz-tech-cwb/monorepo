import * as fs from 'fs';
import * as path from 'path';
import { ROLE_TRACK_KEY } from './role-track-map';

/**
 * This test derives the real seeded `journey_tracks.promotes_to_role` values
 * directly from the migration source files (not from hand-mocked test
 * fixtures), then walks ROLE_TRACK_KEY against them end-to-end. This is the
 * class of test that would have caught the original bug: ROLE_TRACK_KEY
 * pointed 'member' and 'discipler' at the wrong track keys, silently
 * breaking 2 of the 3 promotion chains even though every individual unit
 * test (which mocked its own promotesToRole value) still passed.
 */

const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');

function readMigration(fileNameSubstring: string): string {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  const match = files.find((f) => f.includes(fileNameSubstring));
  if (!match) {
    throw new Error(
      `Could not find a migration file containing '${fileNameSubstring}' in ${MIGRATIONS_DIR}`,
    );
  }
  return fs.readFileSync(path.join(MIGRATIONS_DIR, match), 'utf8');
}

/**
 * Extracts every `UPDATE "journey_tracks" SET "promotes_to_role" = '<role>'
 * WHERE "key" = '<key>'` assignment from AddJourneyTrackPromotesToRole, plus
 * the `promotes_to_role` seeded directly on the INSERT in
 * SeedBecomeMemberTrack. Together these are the real, complete
 * track-key -> promotes_to_role wiring shipped in this branch's migrations.
 */
function extractSeededPromotesToRole(): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  const promotesToRoleMigration = readMigration(
    'AddJourneyTrackPromotesToRole',
  );
  const updateRegex =
    /UPDATE "journey_tracks" SET "promotes_to_role" = '([^']+)' WHERE "key" = '([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = updateRegex.exec(promotesToRoleMigration)) !== null) {
    const [, promotesToRole, key] = match;
    result[key] = promotesToRole;
  }

  const becomeMemberMigration = readMigration('SeedBecomeMemberTrack');
  const insertRegex =
    /VALUES \('([^']+)', '[^']*', NULL, -1, true, '([^']+)'\)/;
  const insertMatch = insertRegex.exec(becomeMemberMigration);
  if (insertMatch) {
    const [, key, promotesToRole] = insertMatch;
    result[key] = promotesToRole;
  }

  // Tracks seeded by SeedJourneyTracks (baptism, member, discipler, leader)
  // have no promotes_to_role at INSERT time — only the later migration
  // above adds non-NULL values for specific keys. Any key not already set
  // here (e.g. 'baptism', 'member') is seeded NULL.
  const seedJourneyTracksMigration = readMigration('SeedJourneyTracks');
  const trackKeyRegex = /key: '([a-z_]+)',\n\s+title:/g;
  while ((match = trackKeyRegex.exec(seedJourneyTracksMigration)) !== null) {
    const [, key] = match;
    if (!(key in result)) result[key] = null;
  }

  return result;
}

describe('role-track-map wiring vs. real seeded promotes_to_role', () => {
  const seededPromotesToRole = extractSeededPromotesToRole();

  it('sanity check: parsed at least the 3 promotion-bearing tracks from the real migrations', () => {
    expect(seededPromotesToRole.become_member).toBe('member');
    expect(seededPromotesToRole.discipler).toBe('discipler');
    expect(seededPromotesToRole.leader).toBe('life_group_leader');
  });

  it('the "member" track key (Trajetória do Membro) has no promotion wired to it (NULL)', () => {
    expect(seededPromotesToRole.member).toBeNull();
  });

  it.each([
    ['lead', 'become_member', 'member'],
    ['member', 'discipler', 'discipler'],
    ['discipler', 'leader', 'life_group_leader'],
  ])(
    'role %s -> track %s -> promotes to %s is reachable end-to-end',
    (roleSlug, expectedTrackKey, expectedPromotedRole) => {
      const trackKey = ROLE_TRACK_KEY[roleSlug];
      expect(trackKey).toBe(expectedTrackKey);

      const promotesToRole = seededPromotesToRole[trackKey];
      expect(promotesToRole).toBe(expectedPromotedRole);
    },
  );

  it('no role in ROLE_TRACK_KEY points at a track key with a NULL promotes_to_role (an unreachable/no-op promotion)', () => {
    for (const [roleSlug, trackKey] of Object.entries(ROLE_TRACK_KEY)) {
      expect(seededPromotesToRole[trackKey]).not.toBeNull();
      // Fails loudly (rather than silently skipping) if a future track key
      // referenced by ROLE_TRACK_KEY isn't present in the seed migrations at all.
      expect(trackKey in seededPromotesToRole).toBe(true);
      void roleSlug;
    }
  });
});
