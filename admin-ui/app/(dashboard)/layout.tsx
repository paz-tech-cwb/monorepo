"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { SidebarContent } from "@/components/sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar - persists across navigation */}
      <div className="hidden w-64 shrink-0 lg:block">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <h1 className="text-lg font-semibold">Painel Admin</h1>
          </header>
          <main className="min-w-0 flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
        <SheetContent side="left" className="w-64 max-w-[calc(100vw-2rem)] p-0 [&_[data-slot=sheet-close]]:right-3 [&_[data-slot=sheet-close]]:top-4">
          <SidebarContent className="[&_[data-sidebar-header]]:pr-12" />
        </SheetContent>
      </Sheet>
    </div>
  )
}
