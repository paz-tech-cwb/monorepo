# Feature: Mobile App

## Purpose

Member-facing mobile experience for account, journey, forms, notifications, ministries, academy, and life group flows.

## Current mobile workstream

- `kmp-mobile/`: Kotlin Multiplatform mobile app workstream.

## Design system summary

KMP mobile design tokens historically include:

- Primary blue `#043A6F`.
- Secondary blue `#6784AE`.
- Light/dark surface/background palettes.
- Reusable components such as PazButton, PazCard, PazTopBar, PazBottomNavBar, PazMenuRow, PazAvatar, PazTextField, and PazEmptyState.

Keep platform implementations visually aligned unless intentionally redesigning.

## Navigation integrations

- Notification deep links must map to mobile routes.
- Form notifications route to Formulários.
- Member journey reminders route to Minha Jornada.
- Entity-specific routes require IDs in notification payloads.
- Life group tasks: `paz://tarefa/{assignmentId}` opens the task guide
  (Android route `life_group_task/{assignmentId}`; iOS `.lifeGroupTaskGuide`).

## Life group tasks (Android + iOS)

- Task guide screen: name, group, meeting date, description, markdown guidance, destructive "Não posso" (confirmation; "Tarefa devolvida" state).
- "Minhas tarefas" card on life group detail (assigned tasks of that group; hidden when empty). No home card.
- Leader/co-leader-only "Elegibilidade para tarefas" screen (route `life_group_task_members/{lifeGroupId}`): min-presence stepper, per-member eligibility, note, template exclusions, "Voltar ao automático".
- Shared KMP: `LifeGroupTaskRepository` (Ktor, Koin; iOS via `IosAppContainer.lifeGroupTaskRepository`).
- Markdown rendering is hand-rolled on both platforms (links limited to http/https). Copy is inline pt-BR.

## Agent notes

- Read kmp-mobile's local files before proposing mobile changes.
- Keep auth refresh behavior consistent with backend contract.
