import { DashboardLayout } from "@/app/dashboard/dashboard-layout"
import { CoursesManagement } from "@/app/courses/courses-management"

export default function CoursesPage() {
  return (
    <DashboardLayout>
      <CoursesManagement />
    </DashboardLayout>
  )
}
