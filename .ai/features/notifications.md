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

Entity-specific notifications must include IDs in the data payload.

## Automatic reminders

| Reminder type | Category |
|---|---|
| `form_report` | `forms` |
| `event` | `events` |
| `member_journey` | `member_journey` |

## Change checklist

- Backend category enum and payload producer updated.
- Admin UI category/role/channel management updated if exposed.
- Android/iOS deep-link parsing updated.
- Tests or manual test notes cover notification tap behavior.
