# Feature: Forms

## Purpose

Operational church forms for reports, member registration, ministry/service workflows, and leadership submissions across backend, admin-ui, and mobile.

## Architecture decisions

- Prefer one typed table per bounded form instead of a broad JSONB schema.
- Prefer one NestJS module per form plus shared forms-core behavior.
- Form changes ship as code and migrations; no general schema versioning machinery unless explicitly introduced.
- Submitter edit window is limited; admins may edit according to permission rules.
- Soft delete and audit logging are preferred for integrity.

## Visibility

- `admin` and `pastor`: all submissions.
- Other leaders: own submissions plus cascade-scoped submissions.
- Members: own applicable forms/submissions.

## Client behavior

- Mobile: forms are accessed from Conta → Formulários.
- Admin: forms are visible according to role, with broader reporting/configuration access for admins/pastors.

## Integrations

- Form report reminders use notification category `forms` and should navigate to Formulários.
- Course-linked configuration for Cadastro do Membro belongs with the form workflow unless intentionally redesigned.

## Casa de Paz analytics/reports

- Admin-ui exposes Casa de Paz submissions both via the generic Formulários list (`/formularios/casa-de-paz-reports`, read-only — no create form there) and via the dedicated `/relatorios` Casa de Paz analytics dashboard.
- Growth comparison is against the single most recent calendar month (by report date) that has any Casa de Paz report rows — not a fixed equal-length prior window. If there's no prior month with data, `comparison` is `null` and growth values are `null` (no badge shown).
- Trend charts only plot months that actually have report rows; there is no zero-filling across the full requested date range, since data can be sparse and span multiple years (month labels include a 2-digit year, e.g. "mai/25", to stay unambiguous).
- "Horário" (meeting time) is not surfaced in any Casa de Paz report UI (admin analytics table/charts/edit dialog, admin generic form list/detail, or mobile submission editors) — the field still exists on the backend entity/DTO/DB column and is intentionally left alone; this is a UI-only removal.

## Change checklist

- Add/update backend DTOs, permissions, migrations, and tests.
- Update admin list/detail/reporting flows.
- Update mobile form list/detail/submission flows.
- Update Postman collections when API endpoints change.
