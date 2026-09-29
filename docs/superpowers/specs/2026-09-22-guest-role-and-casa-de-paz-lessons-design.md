# Guest Role Rename + Origin Tracking + Casa de Paz Lesson Content

Date: 2026-09-22
Status: Approved, pending implementation plan

## Context

Two related pieces of work surfaced while fixing bugs on the Casa de Paz reporting page:

1. The system has a `lead` role (added recently for the become-member funnel) that is
   structurally exactly what the user wants to call a "guest" — a real user account, not
   yet a full member, on the `become_member` journey track. Today it has no notion of
   *where the person came from* (which Casa de Paz, invited by whom, or self-registered).
2. Casa de Paz leaders need reference material (4 weekly lessons) to guide their meetings.
   This is leadership-facing content, not guest-facing.

## Section 1 — Guest role rename + origin tracking

### Rename `lead` → `guest`

Full rename across the stack — not just a display label:

- Backend: `roles` table row (`slug`, `name`), `LeadsService` → `GuestsService` (and its
  spec), any `@Roles('lead')` usage, `role-track-map.ts` entry (`lead` → `become_member`
  becomes `guest` → `become_member`), comments in `auth.service.ts` and
  `leadership-roles.ts` referencing "lead funnel".
- Admin-ui: `/leads` route → `/guests`, `leads-management.tsx` → `guests-management.tsx`,
  `use-leads.ts` → `use-guests.ts`, `lib/api/endpoints/leads.ts` → `guests.ts`, sidebar
  label, types (`lib/api/types/leads.ts` → `guests.ts`).
- Mobile (kmp-mobile): `UserRole.lead` → `UserRole.guest` (shared `User.kt`), any
  `isLeader`/role-check helpers referencing it, UI copy.
- The `become_member` journey track, its steps, and promotion-to-member logic
  (`JourneyProgressService.syncRolePromotion`) are unchanged — only the role name changes.
- This requires a migration to update the existing `roles` row's `slug`/`name` (not a
  destructive drop/recreate — an `UPDATE`), plus a data migration note that any code
  querying `role.slug = 'lead'` must be updated in the same change.

### New: Casa de Paz entity (monthly, global cycle)

A real, persistent Casa de Paz entity is introduced — not a physical house, a **monthly
cycle for the entire church** (one global cycle at a time, not per facilitator/sector):

- Created manually in admin-ui. Uniqueness key is the **month** (e.g. "Casa de Paz —
  Setembro 2026"). Can be created ahead of when lesson content or reports exist for it —
  it's just an empty container at creation time.
- A cycle can stay open past its calendar month if closing it takes longer than expected
  ("we can end up getting next month's rows into the casa de paz (month)") — closing is a
  manual admin action, not automatic on month-end.
- Casa de Paz **reports** (the existing `casa-de-paz-reports` module — date/facilitator/
  sector/kids/conversions rows) get a required FK to this entity going forward. On the
  report submission form (admin-ui and mobile), the most recently created/open cycle is
  pre-selected by default.
- Minimal fields: a name/label (or derive one from the month), status (open/closed), plus
  whatever the implementation plan finds necessary to support the FK and the "most recent"
  default-selection behavior. Exact schema is left to the implementation plan.
- This is what "select which Casa de Paz" resolves to in origin tracking below — the
  onboarding/report guest-origin link points at this entity, not at an individual report
  row.

### Origin tracking

Add an `origin` concept to the guest record:

- `origin_type` enum: `casa_de_paz` | `invited_by_member` | `self`
- Optional linkage depending on type:
  - `casa_de_paz` → link to the specific Casa de Paz **entity** (the monthly cycle, see
    above) that produced this guest
  - `invited_by_member` → link to the inviting member's `User` id (falls back to the
    existing free-text `invited_by` string if no match)
  - `self` → no link; came on their own

This lives on the `User` (or a small side table keyed by `user_id`) — exact shape (columns
vs. separate `guest_origins` table) is left to the implementation plan, but it must support
all three origin paths below without requiring a login-time interview when the origin is
already known.

### Origin capture — three paths

1. **Casa de Paz report** (`casa-de-paz-reports` module + its admin-ui/mobile forms):
   - Remove the numeric `adults` count entirely — adult attendees are now captured
     individually via the guest list (see below), which already carries their info. This is
     a **destructive** migration (existing `adults`/`guests` count columns are dropped, not
     just hidden) — confirmed acceptable; historical per-report adult headcounts are not
     preserved, and going forward "adults reached" is derived from real guest/member
     records tied to a Casa de Paz cycle, not a manual count.
   - Keep `kids` as a plain headcount (children aren't tracked individually / don't get
     accounts).
   - Replace the numeric `guests` count with a repeatable list of guest entries:
     **name, email, birthdate (required)**, **WhatsApp (optional)**.
   - On submit, each list entry creates-or-links a `guest`-role `User`
     (match by email first, consistent with existing `usersService.lookupForForms`-style
     lookups elsewhere), with `origin_type = casa_de_paz` linked to the report's Casa de Paz
     cycle entity.
   - Keep `conversions` as-is (unaffected count).
   - This changes the report entity, DTOs, the admin-ui Casa de Paz report table/edit
     dialog/stat cards (the already-merged "Presenças" card now reflects Crianças count +
     guest-list count, dropping Adultos), and the kmp-mobile Casa de Paz report submission
     form (adults field removed, guest-list UI added). The report form also gains a Casa de
     Paz cycle selector, pre-selecting the most recently created/open cycle.

2. **Convidado form** (`form-guests` module): already creates a `User` on submit when
   email/phone is present, but currently assigns role `member`. Change that assignment to
   role `guest`, with `origin_type = invited_by_member` sourced from the existing free-text
   `invited_by` field (attempt to resolve to a real member `User`, otherwise keep as
   unlinked text on the origin record for now).

3. **Self-registration** (first mobile login — today's only path into the `lead`/`guest`
   role, in `auth.service.ts`'s social-login handler): add a one-time onboarding screen
   shown only when no origin was already set by paths 1 or 2 above (i.e. this is a brand
   new `User` created by this login flow itself, not a pre-existing guest record merged
   via email/name+birthdate match). The guest picks one of: Casa de Paz (select which one),
   invited by a member (pick the member), or came on their own. Stored as the `origin`
   record same as the other two paths.

## Section 2 — Casa de Paz lesson content feature

Static reference material for leaders running Casa de Paz meetings. No per-casa progress
tracking — one global, fixed set of content.

### Data model

Exactly 4 lessons, fixed (week 1–4, not user-creatable/deletable — only editable in place).
Each lesson has:
- `week` (1–4)
- `title`
- `summary`
- `guidelines` (Markdown)
- `questions` (ordered list of discussion-prompt strings)
- `youtube_url`

No versioning, no archiving, no per-casa or per-user completion state.

### Backend

New `casa-de-paz-lessons` module:
- `GET /casa-de-paz-lessons` — list all 4, ordered by week. Read access restricted to
  `LEADERSHIP_ROLES` (admin, pastor, area_leader, sector_leader, life_group_leader).
- `PATCH /casa-de-paz-lessons/:week` — update one lesson's fields. Write access also
  restricted to `LEADERSHIP_ROLES` (no separate content-admin role needed — this project's
  existing leadership roles are the content owners).
- Seed migration creates the 4 lesson rows with placeholder content (weeks 1–4) so the
  admin-ui/mobile always have exactly 4 to render/edit.

### Admin-ui

New "Conteúdo Casa de Paz" management screen (under the existing Formulários/Estudo area
of the sidebar — exact placement left to implementation) listing the 4 lessons, each
editable via a form: Markdown editor for `guidelines`, simple add/remove list input for
`questions`, plain text input for `youtube_url`, text inputs for `title`/`summary`.

### Mobile (kmp-mobile)

New screen listing the 4 lessons (by week), tapping into a detail view that renders the
Markdown summary/guidelines, the questions list, and the YouTube video (embedded player or
external link — implementation's choice based on existing video-handling patterns in the
app, if any). Visible only to `LEADERSHIP_ROLES` — hidden entirely for `guest` and `member`
roles.

A shortcut/entry point into this content is added on the mobile screen where a leader
writes a Casa de Paz report (i.e. wherever `can_write` is true for that form today).

## Out of scope

- Any per-guest or per-casa lesson progress tracking.
- Multiple lesson tracks/series — this is a single fixed set of 4.
- Guest-facing access to the lesson content.
- Changing the `become_member` journey track's steps or promotion logic.

## Open questions for the implementation plan

- Exact shape of the origin-tracking storage (columns on `users` vs. a small
  `guest_origins` side table) — recommend a side table to avoid churning the `users`
  table schema repeatedly as origin types evolve.
- Whether `invited_by_member` resolution (matching free-text `invited_by` to a real
  member) should attempt fuzzy name matching or require an exact/admin-assisted match —
  recommend requiring an explicit picker (admin-ui/mobile UI selects a real member) rather
  than parsing free text, to avoid mismatches.
- Exact placement of the new admin-ui content screen in the sidebar/navigation.
- Exact schema/fields for the new Casa de Paz entity beyond month-uniqueness and
  open/closed status, and exact admin-ui screen for creating/closing cycles — left to the
  implementation plan.
