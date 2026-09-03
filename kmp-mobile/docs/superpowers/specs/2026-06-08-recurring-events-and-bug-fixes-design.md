# Design: Recurring Events Expansion + Bug Fixes

**Date:** 2026-06-08  
**Scope:** KMP mobile (iOS + Android) + NestJS backend

---

## 1. Problem Summary

### Bug Fixes
Four bugs are present across iOS and Android (bugs 1–3 are in shared KMP code; bug 4 is iOS-only):

| # | Screen | Symptom | Root Cause |
|---|--------|---------|------------|
| 1 | Edit Profile | "Illegal input: Fields [id, name, email] are required" | `UserRepositoryImpl` uses `client.patch()` but backend endpoint is `@Put('me')` |
| 2 | Ministries & Life Groups | "Erro ao carregar dados" | `getAllLifeGroups()` calls `api/life-groups/my-groups` (404); should call `api/life-groups` |
| 3 | Minha Jornada | Blank screen after load | KMP `MemberJourney` model expects `steps` but backend returns `stages` with different field names |
| 4 | Agenda (iOS only) | Title jumps down when navigating back from event detail | `AgendaDetailView` uses `.navigationBarHidden(true)` causing large-title re-animation on pop |

### Feature: Recurring Events
Events with `recurrence_type` (WEEKLY, MONTHLY, YEARLY, DAILY) currently appear as a single row with a recurrence badge. Users cannot see future occurrences. The requirement is to show each future occurrence as its own row in the paginated list, with infinite scroll, starting from today. There is no end date for recurrences.

---

## 2. Recurring Events — Architecture

### Approach: Backend-side expansion

The backend `GET /api/events?page=X&limit=Y` will generate a flat, time-ordered stream of occurrences before applying pagination. The mobile pagination logic is unchanged.

**Why backend:** Client-side expansion breaks pagination math (one recurring event can fill a whole page). Backend expansion keeps a clean contract — the API always returns a flat sorted list.

### Backend: `EventsService.findPaginated`

1. Load all events from DB where `initial_date >= today OR recurrence_type IS NOT NULL`
2. For each event:
   - **One-time** (`recurrence_type = null`): include if `initial_date >= today`
   - **Recurring**: generate occurrences starting from `max(initial_date, today)` up to a **2-year lookahead** from the current request date. Each occurrence is a virtual object with the same fields as the base event but a computed `initial_date`.
3. Merge all occurrences into one flat array, sort by `initial_date ASC`
4. Apply `skip = (page - 1) * limit` and `take = limit`
5. Return using the existing `toResponse()` shape — no API contract change

**Occurrence generation logic per `recurrence_type`:**
- `DAILY`: +1 day per step
- `WEEKLY`: +7 days per step
- `MONTHLY`: +1 month per step (same day of month)
- `YEARLY`: +1 year per step

The 2-year window is evaluated at request time. If page N falls entirely beyond the 2-year window, return an empty array (signals `hasReachedEnd` on mobile).

### Mobile: No changes to pagination

`AgendaListViewModel` (iOS) and Android equivalent already implement correct infinite scroll — they request the next page when the last event appears. Since the backend now returns flat sorted occurrences, mobile consumes it identically.

**UI change:** Remove the recurrence label badge ("Semanal", "Mensal", etc.) from `AgendaEventRow` and Android equivalent. Each occurrence already shows its own date; the badge is redundant and misleading when every row is an individual instance.

---

## 3. Bug Fix Designs

### Bug 1 — Edit Profile HTTP method
**File:** `shared/src/commonMain/kotlin/.../data/repository/UserRepositoryImpl.kt`  
**Change:** `client.patch("api/users/me")` → `client.put("api/users/me")`

### Bug 2 — Life Groups wrong endpoint
**File:** `shared/src/commonMain/kotlin/.../data/repository/ChurchRepositoryImpl.kt`  
**Change:** `getAllLifeGroups()` — `"api/life-groups/my-groups"` → `"api/life-groups"`

**Note on Ministries tab:** The backend `GET /api/church` response does not include a `ministries` field. The Ministries tab will show empty until a dedicated backend endpoint is added. This is out of scope for this plan; the Life Groups fix alone resolves the error state.

### Bug 3 — Member Journey model mismatch
**Backend response shape:**
```json
{
  "member_id": 1,
  "member_name": "...",
  "stages": [
    { "stage_id": 1, "stage_key": "salvation", "completed": false, "completed_at": null, "note": null }
  ]
}
```

**KMP fix:** Update `MemberJourney` and `JourneyStep` to match actual response. Map `stage_key` to a display title using a local lookup (mirrors `JOURNEY_STAGES` from backend):

| stage_key | Title (PT) |
|-----------|-----------|
| salvation | Salvação |
| registration | Cadastro |
| first_courses | Primeiros Cursos |
| discovery | Evento de Descoberta |
| life_group | Life Group |
| discipleship | Discipulado |
| water_baptism | Batismo nas Águas |
| disciple_maker | Fazedor de Discípulos |

`JourneyStepStatus` is derived from `completed: Boolean` → `completed = true` → `.completed`, otherwise `.pending`. (`in_progress` is not returned by the backend and can be removed from the enum or kept as unused.)

Also add an **empty/error state** to `MemberJourneyView` (iOS) and Android equivalent so a blank screen never appears.

### Bug 4 — iOS Agenda nav bar title glitch
**File:** `ios/PazChurch/Features/Agenda/AgendaDetailView.swift`  
**Change:** Replace `.navigationBarHidden(true)` with `.toolbar(.hidden, for: .navigationBar)` (iOS 16+ API, which is within the iOS 19.4 deployment target).

---

## 4. Out of Scope

- Past occurrences (by product decision — show only today and future)
- Ministries tab backend endpoint (separate feature)
- Recurrence end date support (no end date by design for now)
- RSVP / "Confirmar presença" button (already a no-op placeholder, untouched)
