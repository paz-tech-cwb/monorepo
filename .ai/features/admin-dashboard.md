# Feature: Admin Dashboard

## Purpose

The staff-facing web dashboard for operating the church platform.

## Responsibilities

- Authenticate staff/admin users.
- Present role-appropriate navigation and data.
- Manage people, members, users, life groups, forms, notifications, ministries, and configuration.
- Consume backend API contracts directly.

## API expectations

- API base URL comes from environment configuration.
- Backend JSON is `snake_case` on the wire.
- Do not silently convert the entire API contract to camelCase without an architecture decision.

## UI expectations

- Preserve existing design system/component conventions in admin-ui.
- Avoid hardcoding domain enums when the backend can provide them.
- When hardcoded options remain, document them in `feature-map.md` as WIP.
