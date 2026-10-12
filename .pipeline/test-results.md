# Test results

Toolchain: Node v22.23.3 (scratchpad), Temurin JDK 17.0.20.1 + Gradle wrapper (offline, scratchpad caches).

| Check | Result |
|---|---|
| `npx jest src/life-groups src/forms-core/services/scope src/life-group-analytics` | PASS, 51 tests |
| Full `npx jest` | 6 failed suites / 70 passed (518 tests passed, 5 failed): exactly the baseline six (auth.controller, notification-sender, home.controller, onboarding.service, reach.dto, user-device-tokens); no new failures |
| `npm run build` (nest build) | PASS |
| `npx tsc --noEmit` | 5 errors before and after (pre-existing in course-progress / journey-progress specs); none from this change |
| scoped `eslint` (6 changed backend files) | clean |
| `prettier --check` (same files) | clean |
| `./gradlew --offline :shared:iosSimulatorArm64Test` (kmp-mobile) | BUILD SUCCESSFUL; `LifeGroupRelationshipTest` 2 tests, 0 failures |

New unit tests: scope resolver (12: admin/pastor unchanged, multi-group, multi-sector, multi-area leader+co-leader, union/dedupe, leader row without leader slug, slug without row, plain member), life-groups service (findMine query shape, supervisor via sector leader/co-leader/area leader/area co-leader, precedence, plain member no widening, response keys, findOne supervisor roster), analytics mixed-scope members universe.

## Real SQL (throwaway Postgres)
`embedded-postgres@17.5.0-beta.15` installed with `--ignore-scripts` into a NEW scratchpad dir, loopback port 54874, throwaway user/pw (not project secrets); full migration chain run with the repo's TypeORM CLI; env vars set only for that process. Seeded 3 areas, 6 sectors, 9 groups, 8 users and ran the REAL `LifeGroupsService.findMine`/`findOne`/`findSupervisedGroupIds` and `ScopeResolverService.resolve` via the compiled dist:
- area leader (area A1): supervisor of both groups in its sector, `leader` of a group elsewhere, `member` of a group it is only rostered in (member_count correct, no join multiplication), scope `{areaIds:[A1], sectorIds:[S1], lifeGroupIds:[g1,g2,g8]}`.
- area co-leader (`member` slug), sector leader, sector co-leader (`member` slug): supervisor groups only; scope from rows regardless of slug.
- leader of two sectors: both sectors' groups; plain member: none, empty scope; rostered-only user: `member` for its groups, empty scope.
- `findOne` roster: `[]` visible for supervisor, `null` for a plain member.
All as expected. Server stopped. The data dir under the scratchpad (`pg-sup`) could not be deleted by this agent (rm denied by the permission system); it contains only throwaway data and is outside the repo.

## Not run
- Android/Compose and iOS app builds (only the shared module native tests); no Swift changes were made.
- Real HTTP end-to-end / mobile manual check.
