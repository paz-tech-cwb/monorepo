import { DashboardLayout } from "@/app/dashboard/dashboard-layout"
import { LifeGroupsManagement } from "@/app/life-groups/life-groups-management"

export default function LifeGroupsPage() {
  return (
    <DashboardLayout>
      <LifeGroupsManagement />
    </DashboardLayout>
  )
}
