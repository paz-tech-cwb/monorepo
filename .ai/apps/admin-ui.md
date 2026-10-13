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

## Life group tasks

- `app/(dashboard)/tarefas-life/`: template management (admin only; markdown guidance editor with Escrever/Visualizar preview, up/down reorder, delete with 409 handling).
- `components/life-group-tasks/`: panel opened from the life groups "Tarefas" action (meeting generate/re-roll/reassign/skip, per-group overrides, member eligibility and `min_present_meetings`).
- Reminder settings UI (`app/(dashboard)/notifications/reminder-settings.tsx`) has controls for the `life_group_attendance` rule ("Reuniao do Life Group": legacy copy, new meeting copy, first follow-up (hours after the meeting, default 24), interval (hours, default 24), cap (days), send tolerance (hours) and copy, sector escalation day (x24h after the meeting, default 5) and copy; old `followup_hour`/`followup_interval_days` keys are dropped on save; the card notes that the v2 behaviors depend on the server flag `LIFE_GROUP_MEETING_V2`; blank text fields are dropped so the backend defaults apply) and for the `life_group_tasks` rule; category `life_group_task` added to notification system lists.
- API: `lib/api/endpoints/life-group-tasks.ts`, hooks in `lib/hooks/use-life-group-tasks.ts`.

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
