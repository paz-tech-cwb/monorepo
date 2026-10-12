# Review: fix/pilot-readiness (vs origin/develop)

Reviewer: Malcolm. Source read-only. Android not compiled (no SDK); Kotlin reviewed by hand.

Checks run:
- jest (life-group-studies, tasks evaluator, notifications): 79 tests pass. One suite, `reach.dto.spec.ts` (untouched), fails to start with `Reflect.getMetadata is not a function`; not caused by this diff.
- prettier --check on the touched backend dirs and the migration: clean.
- eslint: 3 errors, all prettier formatting in untouched `email.service.ts` / `sms.service.ts`. None in changed files.
- Migration safety: `migrationsTransactionMode: 'each'` in all three data-source configs, so the enum-in-own-migration rule holds. Timestamp 1795900000005 is the highest. `ADD VALUE IF NOT EXISTS` is idempotent. Enum name matches the entity (`notification_category_enum`).

## Blockers
None.

## Major

- [M1] Security / privacy (latent audience leak): `life-group-studies.service.ts:~247` (`notifyAudience`). When `resolveNotificationRecipients` returns `[]` (for example a single-user church, or only the publisher is in the roster), the notification is saved with `segment.filters = { user_ids: [] }`. `NotificationsService.resolveSegment` (`notifications.service.ts:~280-300`) treats an empty `user_ids` as "no match filter" and applies `1=1`, which selects EVERY user. Today `dispatch` is called with the explicit empty list, so nothing is sent. Any later `runDispatch` or re-dispatch of this stored row would push to the whole user base. Fix: return early when `recipients.length === 0` and do not persist the notification. Optionally make `resolveSegment` return `[]` when `user_ids` is present but empty. `life-group-task-notifications.service.ts:71` has the same pattern; check it.

- [M2] Reliability: `life-group-studies.service.ts` `create` awaits `notifyAudience`, which awaits `dispatch` to the whole church. The audience grew from leadership only to every rostered member, leader and co-leader. FCM sends are per user, so the create request latency now scales with church size. The existing comment already says a slow or failed request prompts client retries and duplicate studies, and this raises that risk. Fix: do not block the response on the dispatch, e.g. `void this.notifyAudience(...).catch(log)` after the commit, or hand it to the existing notification queue or timer path. Keep the try/catch logging.

## Minor

- [m1] Android, `PazNavGraph.kt:~68-70`: `paz://account` maps to route `"account"`, which is registered only in the nested tab NavHost (`AppShell.kt:65`), not in the root NavHost. `rootNavController.navigate("account")` throws IllegalArgumentException. The new `runCatching` swallows it, so the tap does nothing, silently. The old code would have crashed. Fix: for `account`, navigate to `Screen.Shell` and select the tab, or add a root `composable(Screen.Account.route)`. At minimum, log the failure instead of swallowing it.

- [m2] Android deep-link input validation, `PushNotificationHelper.kt` (`singleIdRoute`, `presenca`, `tarefa`): ids only check blank and `/`. MainActivity is `exported=true`, so any app can send an explicit Intent with a `deep_link` extra. It is limited to the allowlisted route prefixes, but the id is interpolated raw into a route string and later into API paths. `?`, `#`, `%`, spaces and a `presenca` date containing extra segments (`limit=2` lets `a/b/c` through) are not rejected. Server-side auth still applies, so the impact is low. Fix: require ids to match `^[A-Za-z0-9_-]+$` and the date to match `^\d{4}-\d{2}-\d{2}$`, and add tests. Do the same in iOS `parsedRoute(fromDeepLink:)`, which interpolates the raw suffix.

- [m3] Android `singleTop` only reuses MainActivity when it is the TOP of the task. If another activity of this app is on top (the Chucker debug activity is folded into the same task), a tray tap creates a second MainActivity instance. The new instance runs `onCreate` with `savedInstanceState == null` and handles the link correctly, but the user ends up with a stacked duplicate. `FLAG_ACTIVITY_CLEAR_TOP` in `PazFirebaseMessagingService.showNotification` mitigates this for the foreground path. Release builds are unaffected. Consider `singleTask` only if duplicates show up in QA.

- [m4] Android: `consumeDeepLinkRoute` hardcodes the literal `"deepLink"`, which duplicates the private `KEY_DEEP_LINK_CAMEL` in `PushNotificationHelper`. Expose it or move the removal into the helper. The `savedInstanceState == null` guard is redundant, because the extras are already stripped, but it is harmless.

- [m5] Android: an unconsumed pending route held in a plain Activity field is lost if the Activity is recreated (rotation) between `onCreate` and Splash finishing. The intent extra was already stripped, so that tap is dropped. Low probability. A fix would be `rememberSaveable` or a ViewModel, or removing the extra only after consumption.

- [m6] iOS `MainTabView.swift:~43` / `AccountView.swift:~78`: both views use `onChange(initial: true)` on the same `pendingDeepLink`. For account-stack destinations (`formularios`, `journey`, `formDetail`, `ministry`, `lifegroup`, `study`), MainTabView does not consume (`consume: false`), switches to tab 2, and AccountView then consumes. This is correct only if AccountView's body appears AFTER MainTabView's initial handler. If SwiftUI instantiates the Account tab content eagerly and its `onAppear` runs first, AccountView consumes the link, MainTabView then sees `deepLinkDestination == nil`, and the tab never switches. I believe TabView builds tab content lazily, but this is device-verify only. Recommended cheap hardening: have MainTabView set `selectedTab = 2` for these destinations before the guard, or have it own the consume. Cover the cold-start check in the QA checklist (`.pipeline/push-qa-checklist.md`).

- [m7] iOS: `AppDelegate` uses `MainActor.assumeIsolated` in `didFinishLaunching`. This is fine on the main thread, and UIKit guarantees that. Confirm `PazChurchApp`'s `pushService` is `PushNotificationService.shared`, so the delegate installed early is the same instance observed by the views. `requestPermissionAndRegister` re-installing the delegate is idempotent. Firebase swizzling does not override `UNUserNotificationCenter.delegate` when it is set in `didFinishLaunching`.

- [m8] Study audience: `resolveNotificationRecipients` has no status filter (inactive users) and runs three unbounded queries. The `rosterUsers` query returns duplicates for multi-group users, deduped by the Map, which is fine. The inactive-user point depends on whether `dispatch` skips inactive users; I did not see that check in `notification-dispatch.service.ts`. Consider `u.status = 'active'` if applicable.

- [m9] Tests: no automated coverage for `MainActivity.onNewIntent` / the `PazNavGraph` pending-route effect (Android) or the iOS `onChange(initial:)` flows. Cover them with the manual QA checklist.

## Verified OK (analysis, no finding)

- Study authorization: `@Roles` removal does NOT let any authenticated user create, update or delete. The class-level `AuthGuard('jwt')` still applies. `service.create` calls `canPublish` first and throws Forbidden otherwise (`life-group-studies.service.ts:~45`). `update` and `remove` call `assertCanModify`: admin always allowed; otherwise `publishedById === user.id` AND `canPublish(user)`. A revoked grant therefore stops editing. `canPublish` is leadership slug, or leader/co-leader of any group (TypeORM OR-where), or a grant row. There are no unguarded mutation paths; the publisher grant endpoints keep `@Roles('admin')`. `req.user.role` is eagerly loaded (`jwt.strategy.ts:29`), so the slug check works. The only behavior change is that `member`-role leaders or grant-holders are now allowed, which is the intent.
- Study read audience is consistent: `canView = canPublish || roster member`, matching the notification audience (church-wide). No per-group leak.
- The publisher is excluded from recipients, and the notification is created only in `create`; `update` never re-notifies.
- Push payload contract: the dispatch spec pins the data keys to exactly `deep_link` and `channel_id`. Android and iOS now read `deep_link`, with `deepLink` as a tolerated alias.
- Tasks D-1 generate-if-no-rows (`life-group-tasks.evaluator.ts`): no double push with d-3. If d-3 created rows, the count is non-zero, so the evaluator takes the reminder path. A manual generate that happened first also leaves rows, and `generateForMeeting` is idempotent. `notifyAssignee` claims `notified_at IS NULL`, so a race with a manual generate cannot double-send. The per-offset claim key `d{offset}` is distinct from the d-3 key. The claim is released when generation is skipped or all sends fail. Rows that exist, even declined or already reminded, are never regenerated, so leader rerolls are respected. Caveat: if a leader can hard-delete assignment rows, the next D-1 tick would regenerate them (I found no delete path in the assignments service; confirm).
- Android compile review (by eye): imports in `MainActivity` (`Intent`, `mutableStateOf`, `getValue`/`setValue`) and `PazNavGraph` (`LaunchedEffect`, `currentBackStackEntryAsState`) are complete, and the removed ones are no longer used. `const val EXTRA_DEEP_LINK = PushNotificationHelper.KEY_DEEP_LINK` is a valid const-to-const reference. The `LaunchedEffect` body is non-suspending, so navigate plus consume cannot be half-run. It fires when `currentRoute` leaves Splash/null, and `popUpTo(Splash){inclusive}` makes Shell the base, so back from the target returns to Shell. A second tap while a detail screen is open stacks on top, with `launchSingleTop` de-duping the same route. No double navigation: `onDeepLinkConsumed` clears state synchronously. Launcher intents with no extras in `onNewIntent` return a null route and are a no-op. The manifest declares no VIEW/deep-link or OAuth-redirect intent-filters for MainActivity, so `singleTop` does not affect other flows.
- Migration, Membros icons: fine (`Icons.Outlined.People` is in material-icons-extended, which the file already uses for neighbours; `person.2` is a valid SF Symbol).
- Docs and `.pipeline` markdown files were skimmed, not line-reviewed.

## Strengths
- Pure, JVM-testable `routeFromExtras` / `singleIdRoute` (`PushNotificationHelper.kt`) with solid unit tests, and the crash-on-unmatched-route hazard was explicitly handled.
- Single source of truth for iOS parsing (`DeepLinkDestination.parsedRoute`) replacing a duplicate switch.
- Early notification-center delegate install (`AppDelegate.swift`) correctly addresses the cold-start lost-tap problem.
- Migration follows the repo's enum-in-own-migration convention with a clear comment.
- Good backend spec additions (payload-key contract, recipient union and dedupe, late-setup tasks).

## Verdict: REQUEST CHANGES (minor)
No blockers. SHIP after M1 (one-line guard) and M2 (non-blocking dispatch), or with M2 explicitly accepted for the pilot. The remaining items are minors; m1 and m6 deserve a device check in QA.
