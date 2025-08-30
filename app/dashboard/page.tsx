import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardHome } from "@/components/dashboard-home"

export default function DashboardPage() {
  // In a real app, you would check authentication here
  // For demo purposes, we'll assume the user is authenticated

  return (
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  )
}
