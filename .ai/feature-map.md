# Feature Map

| Feature | Doc | Primary apps | Status |
|---|---|---|---|
| Authentication | `features/auth.md` | backend, admin-ui, mobile | Core architecture defined |
| People & membership | `features/people-and-membership.md` | backend, admin-ui, mobile | Active domain |
| Member journey | `features/people-and-membership.md` | backend, admin-ui, mobile | Active domain |
| Life groups | `features/life-groups.md` | backend, admin-ui, mobile | Active domain |
| Forms | `features/forms.md` | backend, admin-ui, mobile | Designed/active |
| Notifications | `features/notifications.md` | backend, admin-ui, mobile | Active domain |
| Ministries | `features/ministries.md` | backend, admin-ui, mobile | Active domain |
| Admin dashboard | `features/admin-dashboard.md` | admin-ui, backend | Active domain |
| Mobile app | `features/mobile-app.md` | mobile-app, kmp-mobile, backend | Active/migration-aware |
| Deployment | `features/deployment.md` | root, backend, admin-ui | Active domain |

## Known WIP / hardcoded areas

- Admin notification channels, roles, and categories should come from API/config instead of hardcoded arrays.
- Admin member journey stage messages are client-side constants and should eventually come from API/config.
- Admin conversion form dropdown options are hardcoded; leader field should become API-backed.
- Admin role pickers in users/members are hardcoded.
- Admin life group meeting days are hardcoded.
- Mobile academy course detail has a stub course tap flow.
- Mobile ministries playlist error handling has historically been incomplete.

When implementing any of these, update the matching feature doc and tests.
