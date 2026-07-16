# Feature: Ministries

## Purpose

Represent ministry teams, participation, service/report workflows, and ministry-related content in admin and mobile experiences.

## Expected boundaries

- Backend owns ministry records, membership/assignment rules, and service/report persistence.
- Admin UI owns staff management and reporting workflows.
- Mobile owns member-facing ministry discovery, participation, and content viewing.

## Agent notes

- Check cascade/role visibility before exposing ministry reports.
- Keep ministry detail routes aligned with notification deep links such as `paz://ministry/{id}` when used.
- Avoid swallowing API errors silently in mobile flows; user-visible failure behavior should match existing app patterns.
