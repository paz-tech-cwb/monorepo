"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Home,
  Users,
  UserCheck,
  Bell,
  Building2,
  CalendarDays,
  Users2,
  BookOpen,
  Route,
  Menu,
  LogOut,
  Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"

const sidebarSections = [
  {
    title: "Principal",
    items: [
      { name: "Inicio", href: "/dashboard", icon: Home },
      { name: "Usuarios", href: "/users", icon: Users },
      { name: "Membros", href: "/members", icon: UserCheck },
      { name: "Life groups", href: "/life-groups", icon: Users2 },
    ],
  },
  {
    title: "Comunicacao",
    items: [
      { name: "Notificacoes", href: "/notifications", icon: Bell },
      { name: "Avisos", href: "/announcements", icon: Megaphone },
    ],
  },
  {
    title: "Eventos",
    items: [
      { name: "Calendario", href: "/events", icon: CalendarDays },
    ],
  },
  {
    title: "Estudo",
    items: [
      { name: "Trilhos", href: "/course-tracks", icon: Route },
      { name: "Cursos", href: "/courses", icon: BookOpen }
    ],
  },
  {
    title: "Configuracoes",
    items: [
      { name: "Dados da igreja", href: "/church-data", icon: Building2 },
    ],
  },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useAuth()

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <h2 className="text-lg font-semibold text-sidebar-foreground">Painel Admin</h2>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-6 px-2">
          {sidebarSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-primary/60 hover:text-white/100",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-primary/80 hover:text-white/80"
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
