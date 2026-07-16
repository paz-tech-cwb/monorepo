# Automatic Reminders — Full-Stack Design

**Date:** 2026-06-11
**Status:** Approved
**Scope:** Backend (NestJS) · Admin UI (Next.js)

---

## 1. Goals

- The church can run **recurring automatic push notifications** without an admin manually composing each one.
- An admin/pastor configures, per reminder type, whether it is **enabled** and on what **frequency/threshold** it fires.
- Three reminder types ship in this design: **form/meeting-report reminders**, **event reminders**, **member-journey nudges**. The engine is extensible to more types without new cron wiring.
- Automatic reminders flow through the existing `NotificationDispatchService` + FCM pipeline (preferences, multi-device, stale-token cleanup) and appear in the **Histórico** list, distinguishable from manually-sent notifications and filterable.

---

## 2. Architecture — single heartbeat cron + rule evaluation

Install `@nestjs/schedule` and register `ScheduleModule.forRoot()` in `AppModule`.

A **single** `@Cron(CronExpression.EVERY_HOUR)` job (`ReminderSchedulerService.tick()`) runs hourly. Each tick:

1. Loads all `reminder_rules` where `enabled = true`.
2. For each rule, delegates to the matching **evaluator** (`ReminderEvaluator` implementation) which decides whether to fire now and, if so, resolves target users and dispatches.

Adding a new reminder type = a new evaluator class registered by `type`. No new cron registration, no `SchedulerRegistry` mutation. State lives in the DB, so restarts are safe and the tick is directly callable in tests.

---

## 3. Backend

### 3.1 Dependency + module

- Add `@nestjs/schedule`.
- `ScheduleModule.forRoot()` in `AppModule`.
- New `RemindersModule` imports the notifications, events, users, forms/meeting-report, and member-journey providers it needs.

### 3.2 `reminder_rules` table + entity

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `type` | enum `reminder_rule_type_enum` (`form_report`,`event`,`member_journey`) | unique |
| `enabled` | boolean NOT NULL DEFAULT false | |
| `config` | jsonb NOT NULL DEFAULT '{}' | shape per type (§3.3) |
| `last_run_at` | timestamp NULL | used by `form_report` idempotency |
| `created_at` / `updated_at` | timestamp | camelCase property + snake_case mapping |

Migration seeds exactly one **disabled** row per type with sensible default config. There is no create/delete — the three rows are fixed.

### 3.3 `config` shapes (validated per type by the DTO)

```jsonc
// form_report — weekly nudge to leaders with no meeting report in the current period
{ "weekday": 0, "hour": 20, "minute": 0,
  "roles": ["life_group_leader","sector_leader","area_leader"] }

// event — fires once per lead-time window before each upcoming event's start
{ "lead_times_hours": [24, 1] }

// member_journey — members stuck on a step >= threshold_days, once per member/step
{ "threshold_days": 7, "steps": ["salvation","baptism","course"] }
```

### 3.4 Evaluators

Interface:
```typescript
interface ReminderEvaluator {
  readonly type: ReminderRuleType;
  run(rule: ReminderRule, now: Date): Promise<void>;
}
```

- **`FormReportReminderEvaluator`** — only proceeds when `now` matches the rule's `weekday`/`hour` and the rule has not already run in this period (`last_run_at`). Resolves leaders in `config.roles` who have no meeting report submitted in the current period; dispatches category `meeting_reports`; sets `last_run_at = now`.
- **`EventReminderEvaluator`** — for each upcoming event, for each `lead_times_hours` entry, if `now` is within that event's lead-time window and no dispatch is logged for `(event_id, lead_time)`, dispatch category `events` to the event audience and log it.
- **`MemberJourneyReminderEvaluator`** — finds members whose current step is in `config.steps` and whose time-on-step `>= threshold_days`, with no dispatch logged for `(user_id, step)`; dispatches category `member_journey`; logs it.

All evaluators call the existing `NotificationDispatchService` and persist a `Notification` row with `origin = 'automatic'`.

### 3.5 Idempotency

- `form_report`: `reminder_rules.last_run_at` (one fire per period).
- `event` / `member_journey`: a lightweight `reminder_dispatch_log` table — `id`, `rule_type`, `dedupe_key` (e.g. `event:{id}:24h` or `journey:{user_id}:{step}`), `created_at`, with a unique index on `(rule_type, dedupe_key)`. The evaluator inserts before/around dispatch; a unique-violation means "already sent, skip".

### 3.6 `notifications.origin`

- Add enum column `origin` (`manual` | `automatic`) NOT NULL DEFAULT `manual` to `notifications` (new `notification_origin_enum`).
- Manual creates keep the default; evaluators set `automatic`.
- `findAll()` returns `origin`; accept optional `?origin=manual|automatic` query filter on the list endpoint.

### 3.7 Endpoints (admin + pastor only)

- `GET /api/reminder-rules` → all three rules.
- `PATCH /api/reminder-rules/:id` → update `enabled` and/or `config` (DTO validates `config` shape against `type`).

---

## 4. Admin UI

### 4.1 New "Automáticos" tab

Add a third `TabsTrigger`/`TabsContent` ("Automáticos") to `app/(dashboard)/notifications/notification-system.tsx`, alongside Criar / Histórico.

- New `lib/api/endpoints/reminder-rules.ts` + `lib/api/types/reminder-rules.ts`.
- New `useReminderRules` hook in `lib/hooks/` mirroring `use-notifications.ts` (fetch + patch + toast).
- Tab renders three cards:
  - **Lembretes de Formulário** — enable `Switch`; weekday select; time picker (hour/minute); roles multi-select.
  - **Lembretes de Evento** — enable `Switch`; editable list of lead times (hours).
  - **Jornada do Membro** — enable `Switch`; threshold-days number; steps multi-select.
- Each card has a Save button; optimistic success/error toast using existing patterns.

### 4.2 Histórico origin filter

Add an origin filter control (All / Manual / Automático) to the Histórico tab. Wire it to the `?origin=` query param. Show an "Automático" badge on automatic rows.

---

## 5. Data flow

```
Hourly @Cron tick (ReminderSchedulerService)
  → load enabled reminder_rules
  → per rule → matching ReminderEvaluator.run(rule, now)
      → resolve target users (+ idempotency check)
      → NotificationDispatchService → FcmService → UserDeviceTokens
      → persist Notification { origin: 'automatic' }
  → form_report: set last_run_at; event/journey: insert reminder_dispatch_log

Admin opens Notificações → Automáticos
  → GET /api/reminder-rules → render 3 cards
  → edits + Save → PATCH /api/reminder-rules/:id

Admin opens Notificações → Histórico
  → GET /api/notifications?origin=automatic → filtered list with "Automático" badge
```

---

## 6. Testing

- `ReminderSchedulerService.tick()` callable directly; unit-test each evaluator's "should fire?" logic with frozen `now`.
- Idempotency: second tick in the same window dispatches nothing (assert dispatch count + unique-violation handling).
- DTO validation: wrong `config` shape for a `type` → 400.
- Admin endpoints: role guard (admin/pastor only), patch round-trip.

---

## 7. Out of scope

- Contributions reminders (not selected).
- Creating/deleting reminder rules (fixed three rows).
- Per-rule timezone configuration (church-local server time assumed).
- Email/SMS/WhatsApp reminder channels (push only).
