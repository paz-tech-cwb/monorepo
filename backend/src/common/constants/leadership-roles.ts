// Roles allowed to log into admin-ui and manage admin-ui-only resources.
// 'member' (and any other role) is not permitted. 'guest' and 'discipler' are
// deliberately excluded too — they are funnel statuses with member-equivalent
// app permissions, not leadership roles, and must not gate admin-ui login or
// leadership-scoped controllers.
export const LEADERSHIP_ROLES = [
  'admin',
  'pastor',
  'area_leader',
  'sector_leader',
  'life_group_leader',
] as const;
