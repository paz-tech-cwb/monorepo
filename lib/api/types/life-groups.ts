import type { AdminUser } from "./users"

/**
 * LifeGroup is a computed/derived type — there is no dedicated /life-groups API
 * endpoint. Groups are aggregated from the `life_group` string field on User
 * records. Modifying group membership means PATCHing the user's `life_group`
 * field via PUT /users/:id.
 */
export interface LifeGroup {
  name: string
  member_count: number
  members: AdminUser[]
}
