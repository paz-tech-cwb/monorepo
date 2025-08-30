"use client"

import { DashboardLayout } from "@/app/dashboard/dashboard-layout"
import { DashboardHome } from "@/app/dashboard/dashboard-home"

export default function DashboardPage() {
  // In a real app, you would check authentication here
  // For demo purposes, we'll assume the user is authenticated

  return (
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  )
}
