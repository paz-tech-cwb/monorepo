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

## Change checklist

- Add/update backend DTOs, permissions, migrations, and tests.
- Update admin list/detail/reporting flows.
- Update mobile form list/detail/submission flows.
- Update Postman collections when API endpoints change.
