import type { Member } from "./members"

/**
 * LifeGroup is a computed/derived type — there is no dedicated /life-groups API
 * endpoint. Groups are aggregated from the `life_group` string field on Member
 * records. Modifying group membership means PATCHing the member's `life_group`
 * field via PUT /members/:id.
 */
export interface LifeGroup {
  name: string
  member_count: number
  members: Member[]
}
