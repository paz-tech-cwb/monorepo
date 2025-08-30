import { DashboardLayout } from "@/app/dashboard/dashboard-layout"
import { CourseTracksManagement } from "@/app/course-tracks/course-tracks-management"

export default function CourseTracksPage() {
  return (
    <DashboardLayout>
      <CourseTracksManagement />
    </DashboardLayout>
  )
}
