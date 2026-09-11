import type { AdminRole } from "@/lib/api/types/auth"
import type { UserRole } from "@/lib/api/types/users"

/**
 * Roles that always have life-group study publish access on the backend
 * (`LifeGroupStudiesController`). Individually-granted users (tracked via
 * `GET/POST/DELETE /life-group-studies/publishers`, admin-only endpoints)
 * cannot be resolved client-side for a non-admin session — there is no
 * "am I a publisher" endpoint. The UI optimistically shows the create
 * action to any non-`member` session and relies on the backend's 403
 * response as the source of truth for individually-granted users.
 */
const FIXED_PUBLISHER_ROLES: ReadonlyArray<AdminRole> = [
  "admin",
  "pastor",
  "area_leader",
  "sector_leader",
  "life_group_leader",
]

export function isFixedRolePublisher(role: UserRole | AdminRole | null | undefined): boolean {
  if (!role) return false
  return (FIXED_PUBLISHER_ROLES as ReadonlyArray<string>).includes(role)
}

/**
 * Optimistic client-side check for whether to show publish-capable UI
 * (create/edit actions, row actions). There is no backend endpoint that
 * exposes "can I publish" for the current session, and individually-granted
 * publishers (via the `publicadores` screen) are, by construction, plain
 * `member` users — so a `role !== "member"` check would make the grant
 * feature unreachable for the exact users it's meant to unlock.
 *
 * Rather than build a client-side permission oracle that doesn't exist
 * server-side, we show the publish UI to any authenticated (non-null role)
 * user and rely entirely on the backend's existing 403 enforcement (see the
 * graceful error handling in the management screens) to reject unauthorized
 * attempts. A future backend `can_publish` flag/endpoint would let this be
 * tightened without over-engineering a guess here.
 */
export function canSeePublishUi(role: UserRole | AdminRole | null | undefined): boolean {
  return !!role
}
