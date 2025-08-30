import { DashboardLayout } from "@/app/dashboard/dashboard-layout"
import { ChurchDataManagement } from "@/app/church-data/church-data-management"

export default function ChurchDataPage() {
  return (
    <DashboardLayout>
      <ChurchDataManagement />
    </DashboardLayout>
  )
}
