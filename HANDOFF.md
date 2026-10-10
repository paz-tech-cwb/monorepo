# Handoff — feature/permissions-journey-locale-filial

PR: https://github.com/paz-tech-cwb/monorepo/pull/89 (→ develop, not merged)

Written as a machine-reset safety checkpoint — everything described below is
already pushed to `origin`. Delete this file once the branch is fully done and
merged.

## Done (committed + pushed)

1. **Mobile permissions** — guest + member no longer see Formulários/
   Ministérios/Relatórios on Account; member/discipler get a direct
   "Convidado" shortcut instead of Formulários. Backend: granted member/
   discipler write access to `form-guests`, then closed the scope-escalation
   gap this opened (client-supplied area/sector/life_group IDs are now
   validated against the actor's resolved scope via `ScopeResolverService`).
2. **Jornada do Membro gamification** — animated per-step progress fill,
   level-up celebration overlay on 100% completion, explanatory framing +
   eligibility text surfaced. Both platforms, `:shared` snapshot-diff use case
   (no retroactive celebrations on first load).
3. **Onboarding video bugs** (iOS) — audio session fixed (ignores silent
   switch), native AVKit controls/tap-overlay removed (new `PlayerLayerView`),
   true fullscreen (no transparent status bar), small-device layout overflow
   fixed, new `PazGlassField` component replacing design-system-violating
   plain text fields.
4. **Academy YouTube in-app playback** — root-caused and fixed an iOS
   `WKWebView` origin mismatch (`loadHTMLString` → `loadFileURL`) that was
   causing spurious IFrame API errors; added error-code-aware retry vs.
   external-open fallback (both platforms); hardened questionnaire state
   against backgrounding/process death.
5. **Academy restructure** — removed "Trilhos de Cursos" (course-tracks)
   entirely per explicit product decision; Academy is now a flat Course list
   across backend, `:shared`, Android, iOS, and admin-ui. DB tables
   (`course_tracks`, `course_track_courses`) deliberately NOT dropped —
   unreferenced by live code, left for a future cleanup migration.
6. **Filial (multi-church) support**:
   - Backend: evolved the singleton `Church` entity into a real multi-row
     table (`slug`, `isActive`); new `user_churches` many-to-many join table
     (a user can belong to multiple churches, one marked primary); staged
     migrations (`1795900000003/4/5`) add nullable → backfill → NOT NULL +
     composite unique `(church_id, month)` on `casa_de_paz_cycles` (was a
     dangerous global unique on `month` alone); `areas`/`events`/
     `announcements`/`casa_de_paz_cycles` are now church-scoped; JWT + `/me`
     carry `church_id`.
   - admin-ui: "Filiais" selector (admin-only) + CRUD on the Church Data page,
     new `church-context.tsx`.
   - Mobile: filial name displayed on Account screen (display-only, no
     switcher — backend already scopes by the JWT's primary church).
7. **Debug tooling** — fixed Android Chucker not capturing response bodies
   (`alwaysReadResponseBody(true)`).
8. **iOS Pulse (debug network inspector)** — root cause was the soft-deprecated
   `URLSessionProxyDelegate.enableAutomaticRegistration` not reliably wrapping
   Ktor's Darwin-engine-owned session/delegate. Switched to
   `NetworkLogger.enableProxy` (`PulseProxy` SPM product), which swizzles
   `URLSessionTask` directly — now captures request/response bodies
   regardless of how the session was constructed.
9. **Profile image not refreshing after upload** — NOT a stale-cache-URL bug
   (uploads are already UUID-named, unique per save). Real cause: `PUT
   /users/me`'s updated `User` response was discarded on both platforms, so
   the session cache (`UserStore`, only ever written at login) kept serving
   the login-time snapshot with the old picture URL forever. Fixed via a new
   `AuthRepository.updateCachedUser`, called after a successful profile
   update on both platforms.

## Still missing / in progress

1. **Brazilian locale formatting sweep** — not started, and explicitly
   deferred by the user to continue on another machine. Deliberately
   scheduled last since it touches files every other workstream also
   modified (OnboardingView.swift, MemberJourneyView/Screen, Account
   screens, church-data-management.tsx, Academy/courses admin pages).
   Silver's original plan (see PR #89 discussion / conversation history)
   found: admin-ui has ~17 native `<input type="date"/"time">` elements with
   browser-locale formatting that can't be forced via attributes (needs
   migration to the existing `date-picker-input.tsx`/`date-time-picker.tsx`
   components with `locale: ptBR`), several `date-fns format()` calls missing
   `{ locale: ptBR }`, a couple of un-locale'd `toLocaleString()`/
   `toLocaleString("default", ...)` calls, and no currency formatter exists
   anywhere in the app (zero call sites found — open question whether this is
   actually needed yet). Mobile (Android + iOS) is mostly already pt-BR
   correct; a handful of iOS `DateFormatter`s are missing explicit
   `locale`/`calendar` (safe on a pt-BR/Gregorian device today, but fragile).
2. **Follow-up noted, not a blocker**: admin-ui's areas/events/announcements/
   casa-de-paz-cycles management pages don't yet filter their list views by
   the selected filial (the selector + context exist, but most list/query
   hooks aren't wired to it yet).

## Branch/repo safety status (as of this checkpoint)

- All `.worktrees/*` and the external `coolify-vps-migration` worktree were
  checked — **all clean**, no uncommitted changes anywhere.
- Every local branch that had commits not present on any remote ref was
  pushed to `origin` under its own name as a backup (no PRs opened for these,
  just pushed for safety): `autopilot/trello-7-...`, `autopilot/trello-8-...`,
  `chore/bump-admin-ui-backend-develop`, `docs/ai-project-context`,
  `feat/org-chart`, `feat/org-chart-canvas`, `fix/admin-ui-sheet-mobile`,
  `fix/backend-address-migration-startup`, `fix/ci-issues`,
  `fix/ios-keyboard-visual-viewport`, `piloto`, `pr-5`.
- `/Users/jonathalima/Developer/church/.worktrees/org-chart` is a harmless
  orphaned checkout (broken worktree admin link, `git worktree list` doesn't
  even see it) — its real branches (`feat/org-chart`, `feat/org-chart-canvas`)
  are already pushed above, so this folder holds nothing unique. Safe to
  delete manually if desired, not done here since it wasn't asked for.

## To resume on another machine

```bash
git clone https://github.com/paz-tech-cwb/monorepo.git church
cd church
git checkout feature/permissions-journey-locale-filial
```
Then pick up the Brazilian locale formatting sweep (item 1 above) — that's
the only remaining work. Everything else in this PR is done.
