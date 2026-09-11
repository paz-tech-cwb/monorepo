// Roles allowed to log into admin-ui and manage admin-ui-only resources.
// 'member' (and any other role) is not permitted.
export const LEADERSHIP_ROLES = [
  'admin',
  'pastor',
  'area_leader',
  'sector_leader',
  'life_group_leader',
] as const;
