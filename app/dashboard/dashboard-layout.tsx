"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Home,
  Users,
  UserCheck,
  Bell,
  Calendar,
  Building2,
  CalendarDays,
  Users2,
  BookOpen,
  Route,
  Menu,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

const sidebarItems = [
  { name: "Início", href: "/dashboard", icon: Home },
  { name: "Usuários", href: "/users", icon: Users },
  { name: "Membros", href: "/members", icon: UserCheck },
  { name: "Enviar notificação", href: "/notifications", icon: Bell },
  { name: "Gerenciar eventos", href: "/events", icon: Calendar },
  { name: "Dados da igreja", href: "/church-data", icon: Building2 },
  { name: "Gerenciar calendário", href: "/calendar", icon: CalendarDays },
  { name: "Life groups", href: "/life-groups", icon: Users2 },
  { name: "Cursos", href: "/courses", icon: BookOpen },
  { name: "Trilhos de cursos", href: "/course-tracks", icon: Route },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const [currentPath, setCurrentPath] = useState("/dashboard")

  const handleNavigation = (href: string) => {
    setCurrentPath(href)
    // In a real app, you would use Next.js router here
    console.log(`Navigating to: ${href}`)
    router.push(href)
  }

  const handleLogout = () => {
    // In a real app, you would handle logout logic here
    window.location.href = "/"
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <h2 className="text-lg font-semibold text-sidebar-foreground">Painel Admin</h2>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.href
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden w-64 lg:block">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <h1 className="text-lg font-semibold">Painel Admin</h1>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
        </div>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </div>
  )
}
