"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { LifeGroup } from "@/lib/api/types"
import { LifeGroupTaskMeetingTab } from "./life-group-task-meeting-tab"
import { LifeGroupTaskOverridesTab } from "./life-group-task-overrides-tab"
import { LifeGroupTaskMembersTab } from "./life-group-task-members-tab"

/**
 * "Tarefas" panel for a single life group, rendered inside a dialog on the
 * life groups page. Three tabs: this meeting's assignments, per-template
 * overrides, and member eligibility + group settings.
 */
export function LifeGroupTasksPanel({ lifeGroup }: { lifeGroup: LifeGroup }) {
  return (
    <Tabs defaultValue="meeting" className="w-full">
      <TabsList>
        <TabsTrigger value="meeting">Encontro</TabsTrigger>
        <TabsTrigger value="templates">Tarefas do grupo</TabsTrigger>
        <TabsTrigger value="members">Membros</TabsTrigger>
      </TabsList>
      <TabsContent value="meeting" className="pt-4">
        <LifeGroupTaskMeetingTab lifeGroup={lifeGroup} />
      </TabsContent>
      <TabsContent value="templates" className="pt-4">
        <LifeGroupTaskOverridesTab lifeGroupId={lifeGroup.id} />
      </TabsContent>
      <TabsContent value="members" className="pt-4">
        <LifeGroupTaskMembersTab lifeGroupId={lifeGroup.id} />
      </TabsContent>
    </Tabs>
  )
}
