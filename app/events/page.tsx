import { DashboardLayout } from "@/app/dashboard/dashboard-layout"
import { EventsManagement } from "@/app/events/events-management"

export default function EventsPage() {
  return (
    <DashboardLayout>
      <EventsManagement />
    </DashboardLayout>
  )
}
