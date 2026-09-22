// Maps a user's current role slug to the journey_tracks.key that represents
// their current funnel/progression track. Roles with no entry (e.g.
// sector_leader, area_leader, pastor, admin) have no associated track.
export const ROLE_TRACK_KEY: Readonly<Record<string, string>> = {
  guest: 'become_member',
  member: 'discipler',
  discipler: 'leader',
  // life_group_leader / sector_leader / area_leader / pastor / admin → no track
};

export function trackKeyForRole(slug?: string | null): string | null {
  if (!slug) return null;
  return ROLE_TRACK_KEY[slug] ?? null;
}
