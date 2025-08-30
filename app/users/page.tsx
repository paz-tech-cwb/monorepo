import { DashboardLayout } from "@/app/dashboard/dashboard-layout"
import { UsersManagement } from "@/app/users/users-management"

export default function UsersPage() {
  return (
    <DashboardLayout>
      <UsersManagement />
    </DashboardLayout>
  )
}
