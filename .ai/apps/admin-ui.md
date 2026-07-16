# App: Admin UI

## Stack

Next.js 15, React 19, TypeScript, shadcn/ui-style component patterns.

## Responsibilities

- Staff/admin dashboard workflows.
- Role-aware navigation and screens.
- Direct consumption of backend API contracts.

## Contract notes

- Backend JSON is `snake_case`.
- Preserve existing API type conventions unless intentionally changing the contract.
- Environment variable for API base URL should point at backend `/api`.

## Agent entry points

Before editing admin-ui, inspect:

- route/page component for the workflow;
- local API client/types;
- shared dashboard/layout/navigation components;
- existing lint/build patterns.

## Validation

```bash
cd admin-ui
npm run lint
npm run build
```
