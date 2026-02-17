"use client"

import { useMemo } from "react"
import { useMembers } from "./use-members"
import type { LifeGroup } from "@/lib/api/types/life-groups"

/**
 * Derives life groups from the members list.
 *
 * There is no /life-groups API endpoint — groups are aggregated from the
 * `life_group` string field on each Member. This hook re-uses the cached
 * members query (no extra network request) and builds the group list via
 * useMemo so it only recomputes when the members data changes.
 */
export function useLifeGroups() {
  const membersQuery = useMembers()

  const lifeGroups = useMemo<LifeGroup[]>(() => {
    const members = membersQuery.data ?? []

    const groupMap = new Map<string, LifeGroup>()

    for (const member of members) {
      if (!member.life_group) continue

      const existing = groupMap.get(member.life_group)
      if (existing) {
        existing.members.push(member)
        existing.member_count += 1
      } else {
        groupMap.set(member.life_group, {
          name: member.life_group,
          member_count: 1,
          members: [member],
        })
      }
    }

    return Array.from(groupMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    )
  }, [membersQuery.data])

  return {
    ...membersQuery,
    data: lifeGroups,
    /** Raw members list — useful for the "assign member to group" UI */
    allMembers: membersQuery.data ?? [],
  }
}
