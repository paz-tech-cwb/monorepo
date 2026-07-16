# Project Context

## Product

Paz Church Curitiba is a digital platform for church operations and member engagement. It combines:

- a staff/admin web dashboard;
- a backend REST API;
- a member-facing mobile app;
- API documentation/testing collections.

## Primary users

- **Admins and pastors:** manage people, forms, notifications, ministries, life groups, configuration, and reporting.
- **Area and sector leaders:** operate within their leadership cascade.
- **Life group leaders:** manage or report on their own group context.
- **Members:** use the mobile app for account, journey, forms, notifications, ministries, academy, and life group experiences.

## Repository model

This root repository is a git-submodule monorepo. Each app folder is an independent repository.

| Path | Purpose |
|---|---|
| `backend/` | NestJS REST API and database access |
| `admin-ui/` | Next.js admin dashboard |
| `mobile-app/` | Legacy/current Flutter mobile app where present |
| `kmp-mobile/` | Kotlin Multiplatform mobile app workstream |
| `postman-files/` | API collections and environments |

## Canonical language

- Internal docs may be in English.
- User-facing church labels are usually PT-BR.
- Preserve existing product terms such as Life Group, Jornada, Formulários, Ministérios, and Academia.

## Glossary

| Term | Meaning |
|---|---|
| Life Group | Small group/community unit in the church |
| Area | Highest leadership grouping over sectors |
| Sector | Grouping over life groups |
| Member Journey | Ordered discipleship progression tracked per member |
| Forms | Role-aware operational reports/submissions |
| Cascade scope | Data visibility based on leadership hierarchy |

## Documentation source of truth

- `.ai/` is the agent-facing architecture source.
- `README.md` is the human onboarding source.
- Submodule docs are source of truth for app-specific implementation details.
- Historical plans are archived and should not override current `.ai/` docs.
