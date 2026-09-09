# Feature: Notifications

## Purpose

Send push notifications and route users to the correct screen when notifications are opened.

## Category navigation map

| Category | Expected destination | Deep link |
|---|---|---|
| `events` | Event/agenda detail | `paz://agenda/{eventId}` |
| `announcements` | Home/account announcement area | `paz://account` |
| `life_group` | Life group detail | `paz://lifegroup/{lifeGroupId}` |
| `academy` | Academy | none/current app route |
| `forms` | Formulários list | `paz://formularios` |
| `member_journey` | Minha Jornada | `paz://journey` |
| `admin_alerts` | Account/admin alert area | `paz://account` |
| `contributions` | Account/contributions area | `paz://account` |
| `life_group_attendance` | Life group attendance editor | `paz://presenca/{lifeGroupId}/{date}` |

Entity-specific notifications must include IDs in the data payload.

## Automatic reminders

| Reminder type | Category |
|---|---|
| `form_report` | `forms` |
| `event` | `events` |
| `member_journey` | `member_journey` |
| `life_group_attendance` | `life_group_attendance` |

`forms` and `life_group_attendance` are deliberately absent from `CATEGORY_PREF_MAP`
(`notification-dispatch.service.ts`), so leaders cannot opt out of them via
notification preferences — they cover core recurring job duties, not optional
updates. Recipients for `life_group_attendance` are the group's `leader_id`
and `co_leader_id` (when set); it fires once, `hours_after_meeting_start`
hours after the group's `meeting_day`/`meeting_time`, and is skipped entirely
for groups without a fixed meeting day/time ("Sem dia fixo" or no
`meeting_time`).

## Change checklist

- Backend category enum and payload producer updated.
- Admin UI category/role/channel management updated if exposed.
- Android/iOS deep-link parsing updated.
- Tests or manual test notes cover notification tap behavior.
