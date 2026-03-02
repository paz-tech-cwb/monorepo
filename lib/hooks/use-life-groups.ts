"use client"

import { useMemo } from "react"
import { useUsers } from "./use-users"
import type { LifeGroup } from "@/lib/api/types/life-groups"

/**
 * Derives life groups from the users list.
 *
 * There is no /life-groups API endpoint — groups are aggregated from the
 * `life_group` string field on each User. This hook re-uses the cached
 * users query (no extra network request) and builds the group list via
 * useMemo so it only recomputes when the users data changes.
 */
export function useLifeGroups() {
  const usersQuery = useUsers()

  const lifeGroups = useMemo<LifeGroup[]>(() => {
    const users = usersQuery.data ?? []

    const groupMap = new Map<string, LifeGroup>()

    for (const user of users) {
      // @ts-expect-error // TODO: rewrite in Task 7 — life_group replaced by life_groups[]
      if (!user.life_group) continue

      // @ts-expect-error // TODO: rewrite in Task 7 — life_group replaced by life_groups[]
      const existing = groupMap.get(user.life_group)
      if (existing) {
        existing.members.push(user)
        existing.member_count += 1
      } else {
        // @ts-expect-error // TODO: rewrite in Task 7 — life_group replaced by life_groups[]
        groupMap.set(user.life_group, {
          // @ts-expect-error // TODO: rewrite in Task 7 — life_group replaced by life_groups[]
          name: user.life_group,
          member_count: 1,
          members: [user],
        })
      }
    }

    return Array.from(groupMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    )
  }, [usersQuery.data])

  return {
    ...usersQuery,
    data: lifeGroups,
    /** Raw users list — useful for the "assign user to group" UI */
    allMembers: usersQuery.data ?? [],
  }
}
