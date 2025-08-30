import { DashboardLayout } from "@/app/dashboard/dashboard-layout"
import { MembersManagement } from "@/app/members/members-management"

export default function MembersPage() {
  return (
    <DashboardLayout>
      <MembersManagement />
    </DashboardLayout>
  )
}
